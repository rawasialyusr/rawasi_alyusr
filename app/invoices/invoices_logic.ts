"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useRouter } from 'next/navigation'; 
import { useToast } from '@/lib/toast-context'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // 🚀 محرك الأوفلاين والكاش السيادي

export function useInvoicesLogic() {
    const router = useRouter();
    const { showToast } = useToast(); 
    const queryClient = useQueryClient();
    
    const [permissions, setPermissions] = useState<any>({ isAdmin: false });
    
    const [globalSearch, setGlobalSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<any>({ lines: [] });

    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<any>(null);

    // 🛡️ 1. جلب الصلاحيات (يُفضل إبقاؤها كـ useEffect لارتباطها المباشر بجلسة المستخدم)
    useEffect(() => {
        const fetchAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, permissions, is_admin')
                    .eq('id', session.user.id)
                    .single();
                
                const userRole = String(profile?.role || '').toLowerCase();
                setPermissions({ 
                    isAdmin: userRole === 'admin' || profile?.is_admin === true, 
                    ...profile?.permissions 
                });
            }
        };
        fetchAuth();
    }, []);

    // 🧠 2. جلب الفواتير عبر React Query (تفعيل الأوفلاين والكاش)
    const { data: invoices = [], isLoading: isInvLoading } = useQuery({
        queryKey: ['invoices'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('invoices')
                .select('*, partners(*)')
                .order('date', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    // 🧠 3. جلب المشاريع عبر React Query
    const { data: projects = [], isLoading: isProjLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const { data, error } = await supabase.from('projects').select('*');
            if (error) throw error;
            return data || [];
        }
    });

    // =========================================================================
    // ⚙️ المعالجة والحسابات (Logic Filtering) - محمية بـ useMemo
    // =========================================================================
    const allFiltered = useMemo(() => {
        return invoices.filter((inv: any) => {
            const searchLower = globalSearch.toLowerCase();
            const matchesSearch = 
                inv.invoice_number?.toLowerCase().includes(searchLower) || 
                inv.client_name?.toLowerCase().includes(searchLower);
            
            let matchesDate = true;
            const invDate = inv.date ? new Date(inv.date) : null;
            if (invDate) {
                if (dateFrom) matchesDate = matchesDate && invDate >= new Date(dateFrom);
                if (dateTo) matchesDate = matchesDate && invDate <= new Date(dateTo);
            }
            return matchesSearch && matchesDate;
        }).map((inv: any) => {
            const total = Number(inv.total_amount || 0);
            const paid = Number(inv.paid_amount || 0);
            const balance = total - paid;
            
            let paymentStatus = 'unpaid'; 
            if (paid >= total && total > 0) paymentStatus = 'paid'; 
            else if (paid > 0) paymentStatus = 'partial'; 

            return {
                ...inv,
                remaining_amount: balance,
                payment_display_status: paymentStatus
            };
        });
    }, [invoices, globalSearch, dateFrom, dateTo]);

    const paginatedInvoices = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return allFiltered.slice(start, start + rowsPerPage);
    }, [allFiltered, currentPage, rowsPerPage]);

    const kpis = useMemo(() => ({
        total: allFiltered.length,
        posted: allFiltered.filter((i: any) => i.status === 'مُعتمد').length,
        pending: allFiltered.filter((i: any) => i.status !== 'مُعتمد').length
    }), [allFiltered]);

    // =========================================================================
    // 🎬 عمليات الواجهة (UI Actions)
    // =========================================================================
    const handleOpenPaymentModal = async (inv: any) => {
        const balance = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
        const selectedProjects = projects.filter((p: any) => inv.project_ids?.includes(p.id));
        const pName = inv.client_name || inv.partners?.name || '';

        setSelectedInvoiceForPay({
            id: undefined, invoice_id: inv.id, invoice_number: inv.invoice_number,
            partner_id: inv.partner_id, partner_name: pName,
            selected_projects: selectedProjects, project_ids: inv.project_ids || [], 
            amount: balance > 0 ? balance : 0, payment_method: 'تحويل بنكي'
        });
        setIsReceiptModalOpen(true);
    };

    const handlePayInvoice = (inv: any) => {
        const balance = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
        if (balance <= 0) {
            showToast("هذه الفاتورة مسددة بالكامل ✅", "info"); 
            return;
        }
        const params = new URLSearchParams({
            invoice_id: inv.id, amount: balance.toString(), client_name: inv.client_name || '', ref: inv.invoice_number || ''
        });
        router.push(`/ReceiptVouchers?${params.toString()}`);
    };

    const handleAddNew = () => { 
        setCurrentRecord({ lines: [], date: new Date().toISOString(), project_ids: [], selected_projects: [] }); 
        setIsEditModalOpen(true); 
    };

    const handleEdit = (inv: any) => {
        const mappedProjects = projects.filter((p: any) => inv.project_ids?.includes(p.id));
        setCurrentRecord({ ...inv, client_name: inv.client_name || inv.partners?.name || '', selected_projects: mappedProjects });
        setIsEditModalOpen(true);
    };

    // =========================================================================
    // 🚀 طابور العمليات (Mutations & Optimistic Updates)
    // =========================================================================

    // 1. حفظ الفاتورة (Save)
    const saveMutation = useMutation({
        mutationFn: async (record: any) => {
            const cleanId = (id: any) => (id && typeof id === 'string' && id.trim() !== '') ? id : null;
            const invoiceHeader = {
                invoice_number: record.invoice_number, date: record.date, partner_id: cleanId(record.partner_id),
                client_name: record.client_name, project_ids: record.project_ids || null, boq_id: cleanId(record.boq_id),
                description: record.description, quantity: Number(record.quantity) || 0, unit: record.unit || 'عدد',
                unit_price: Number(record.unit_price) || 0, line_total: Number(record.line_total) || 0,
                materials_discount: Number(record.materials_discount) || 0, taxable_amount: Number(record.taxable_amount) || 0,
                tax_amount: Number(record.tax_amount) || 0, guarantee_percent: Number(record.guarantee_percent) || 0,
                guarantee_amount: Number(record.guarantee_amount) || 0, total_amount: Number(record.total_amount) || 0,
                debit_account_id: cleanId(record.debit_account_id), credit_account_id: cleanId(record.credit_account_id),
                materials_acc_id: cleanId(record.materials_acc_id), guarantee_acc_id: cleanId(record.guarantee_acc_id),
                tax_acc_id: cleanId(record.tax_acc_id), status: record.status || 'معلق', due_in_days: Number(record.due_in_days) || 0,
                due_date: record.due_date, paid_amount: Number(record.paid_amount) || 0, skip_zatca: record.skip_zatca || false
            };

            let savedInvoiceId = record.id;
            let finalHeader = { ...invoiceHeader, id: savedInvoiceId };

            if (record.id) {
                const { error: headErr } = await supabase.from('invoices').update(invoiceHeader).eq('id', record.id);
                if (headErr) throw headErr;
            } else {
                const { data: newHead, error: headErr } = await supabase.from('invoices').insert([invoiceHeader]).select('id').single();
                if (headErr) throw headErr;
                savedInvoiceId = newHead.id;
                finalHeader.id = savedInvoiceId;
            }

            const linesToSave = record.lines || record.items || [];
            if (savedInvoiceId && linesToSave.length > 0) {
                if (record.id) await supabase.from('invoice_lines').delete().eq('invoice_id', savedInvoiceId);
                const preparedLines = linesToSave.map((line: any) => ({
                    invoice_id: savedInvoiceId, item_id: cleanId(line.item_id), description: line.description || '',
                    unit: line.unit || 'عدد', quantity: Number(line.quantity) || 0, unit_price: Number(line.unit_price) || 0,
                    total_price: Number(line.total_price) || (Number(line.quantity) * Number(line.unit_price)) || 0
                }));
                const { error: linesErr } = await supabase.from('invoice_lines').insert(preparedLines);
                if (linesErr) throw linesErr;
            }
            return finalHeader;
        },
        onMutate: async (record) => {
            await queryClient.cancelQueries({ queryKey: ['invoices'] });
            const previous = queryClient.getQueryData(['invoices']);
            queryClient.setQueryData(['invoices'], (old: any[] = []) => {
                if (record.id) {
                    return old.map(inv => inv.id === record.id ? { ...inv, ...record } : inv);
                } else {
                    return [{ ...record, id: `temp-${Date.now()}`, status: 'معلق', partners: { name: record.client_name } }, ...old];
                }
            });
            setIsEditModalOpen(false);
            showToast("تم الحفظ محلياً.. سيتم المزامنة ⏳", "info");
            return { previous };
        },
        onError: (err, vars, context) => {
            queryClient.setQueryData(['invoices'], context?.previous);
            setIsEditModalOpen(true);
            showToast("حدث خطأ أثناء الحفظ! ❌", "error");
        },
        onSuccess: () => showToast("تم مزامنة الفاتورة بنجاح 💾", "success"),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['invoices'] })
    });

    // 2. الترحيل (Post)
    const postMutation = useMutation({
        mutationFn: async () => {
            if (!selectedIds.length) return 0;
            const toPost = invoices.filter((inv: any) => selectedIds.includes(inv.id) && inv.status !== 'مُعتمد');
            if (toPost.length === 0) throw new Error('ALREADY_POSTED');

            for (const inv of toPost) {
                const invDate = inv.date || new Date().toISOString().split('T')[0];
                const { data: newHeader, error: headerErr } = await supabase
                    .from('journal_headers')
                    .insert({ entry_date: invDate, description: `فاتورة #${inv.invoice_number} | ${inv.client_name}`, status: 'posted', reference_id: inv.id })
                    .select('id').single();

                if (headerErr) throw headerErr;
                const headerId = newHeader.id;
                const linesToInsert: any[] = [];

                const addJLine = (accId: string, debit: number, credit: number, label: string) => {
                    if (accId && (debit > 0 || credit > 0)) {
                        linesToInsert.push({
                            header_id: headerId, account_id: accId, partner_id: inv.partner_id,
                            project_id: (inv.project_ids && inv.project_ids[0]) || null, item_name: inv.description || label,
                            quantity: Number(inv.quantity) || 1, unit_price: Number(inv.unit_price) || 0,
                            debit: debit, credit: credit, notes: `${label}: ${inv.invoice_number}`
                        });
                    }
                };

                addJLine(inv.credit_account_id, 0, Number(inv.line_total), "إيراد مبيعات");
                if (!inv.skip_zatca && Number(inv.tax_amount) > 0) addJLine(inv.tax_acc_id, 0, Number(inv.tax_amount), "ضريبة قيمة مضافة");
                addJLine(inv.debit_account_id, Number(inv.total_amount), 0, "مستحق على العميل");
                if (Number(inv.materials_discount) > 0) addJLine(inv.materials_acc_id, Number(inv.materials_discount), 0, "خصم خامات");
                if (Number(inv.guarantee_amount) > 0) addJLine(inv.guarantee_acc_id, Number(inv.guarantee_amount), 0, "محتجز ضمان أعمال");

                const { error: jErr } = await supabase.from('journal_lines').insert(linesToInsert);
                if (jErr) throw jErr;
            }
            await supabase.from('invoices').update({ status: 'مُعتمد' }).in('id', selectedIds);
            return toPost.length;
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['invoices'] });
            const previous = queryClient.getQueryData(['invoices']);
            queryClient.setQueryData(['invoices'], (old: any[]) => 
                old?.map(inv => selectedIds.includes(inv.id) ? { ...inv, status: 'مُعتمد' } : inv)
            );
            return { previous };
        },
        onError: (err, vars, context) => {
            queryClient.setQueryData(['invoices'], context?.previous);
            if (err.message === 'ALREADY_POSTED') showToast("الفواتير المختارة مُرحلة بالفعل! ⚠️", "warning");
            else showToast("حدث خطأ أثناء الترحيل! ❌", "error");
        },
        onSuccess: (count) => {
            if (count > 0) {
                setSelectedIds([]);
                showToast(`✅ تم ترحيل ${count} فاتورة بنجاح!`, "success");
            }
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['invoices'] })
    });

    // 3. المسح المتسلسل (Deep Cascade Unposting) 🛡️
    const unpostMutation = useMutation({
        mutationFn: async () => {
            if (!selectedIds.length) return;
            // أ. مسح قيود الفاتورة الأصلية
            const { data: invoiceHeaders } = await supabase.from('journal_headers').select('id').in('reference_id', selectedIds);
            if (invoiceHeaders?.length) {
                const headerIds = invoiceHeaders.map(h => h.id);
                await supabase.from('journal_lines').delete().in('header_id', headerIds);
                await supabase.from('journal_headers').delete().in('id', headerIds);
            }
            // ب. مسح السندات وقيودها
            const { data: receipts } = await supabase.from('receipt_vouchers').select('id').in('invoice_id', selectedIds);
            if (receipts?.length) {
                const receiptIds = receipts.map(r => r.id);
                const { data: receiptHeaders } = await supabase.from('journal_headers').select('id').in('reference_id', receiptIds);
                if (receiptHeaders?.length) {
                    const rHeaderIds = receiptHeaders.map(h => h.id);
                    await supabase.from('journal_lines').delete().in('header_id', rHeaderIds);
                    await supabase.from('journal_headers').delete().in('id', rHeaderIds);
                }
                await supabase.from('receipt_vouchers').delete().in('id', receiptIds);
            }
            // ج. تصفير العدادات
            await supabase.from('invoices').update({ status: 'معلق', paid_amount: 0 }).in('id', selectedIds);
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['invoices'] });
            const previous = queryClient.getQueryData(['invoices']);
            queryClient.setQueryData(['invoices'], (old: any[]) => 
                old?.map(inv => selectedIds.includes(inv.id) ? { ...inv, status: 'معلق', paid_amount: 0 } : inv)
            );
            return { previous };
        },
        onError: (err, vars, context) => {
            queryClient.setQueryData(['invoices'], context?.previous);
            showToast("حدث خطأ أثناء التراجع عن الترحيل! ❌", "error");
        },
        onSuccess: () => {
            setSelectedIds([]);
            showToast("تم إلغاء الترحيل والسدادات المرتبطة بنجاح 🔴", "success");
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['invoices'] })
    });

    // 4. الحذف (Delete)
    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!selectedIds.length) return;
            const { data: headers } = await supabase.from('journal_headers').select('id').in('reference_id', selectedIds);
            if (headers?.length) {
                const headerIds = headers.map(h => h.id);
                await supabase.from('journal_lines').delete().in('header_id', headerIds);
                await supabase.from('journal_headers').delete().in('id', headerIds);
            }
            await supabase.from('invoices').delete().in('id', selectedIds);
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['invoices'] });
            const previous = queryClient.getQueryData(['invoices']);
            queryClient.setQueryData(['invoices'], (old: any[]) => old?.filter(inv => !selectedIds.includes(inv.id)));
            return { previous };
        },
        onError: (err, vars, context) => {
            queryClient.setQueryData(['invoices'], context?.previous);
            showToast("حدث خطأ أثناء الحذف! ❌", "error");
        },
        onSuccess: () => {
            setSelectedIds([]);
            showToast("تم الحذف النهائي بنجاح 🗑️", "success");
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['invoices'] })
    });

    // 5. حالة الختم (Toggle Stamp)
    const toggleStampMutation = useMutation({
        mutationFn: async ({ id, currentStatus }: { id: string, currentStatus: boolean }) => {
            const { error } = await supabase.from('invoices').update({ is_stamped: !currentStatus }).eq('id', id);
            if (error) throw error;
        },
        onMutate: async ({ id, currentStatus }) => {
            await queryClient.cancelQueries({ queryKey: ['invoices'] });
            const previous = queryClient.getQueryData(['invoices']);
            queryClient.setQueryData(['invoices'], (old: any[]) => 
                old?.map(inv => inv.id === id ? { ...inv, is_stamped: !currentStatus } : inv)
            );
            return { previous };
        },
        onError: (err, vars, context) => {
            queryClient.setQueryData(['invoices'], context?.previous);
            showToast("حدث خطأ أثناء محاولة ختم الفاتورة! ❌", "error");
        },
        onSuccess: () => showToast("تم تحديث حالة الختم بنجاح ✨", "success"),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['invoices'] })
    });

    // =========================================================================
    // 🔗 تجميع الحالات والتصدير
    // =========================================================================
    const isSaving = saveMutation.isPending || postMutation.isPending || unpostMutation.isPending || deleteMutation.isPending || toggleStampMutation.isPending;
    const isLoading = isInvLoading || isProjLoading || isSaving;

    return {
        invoices: paginatedInvoices,
        allFiltered,
        projects,
        isLoading,
        isSaving,
        permissions,
        handleToggleStamp: (id: string, currentStatus: boolean) => {
            if (!permissions.isAdmin) return showToast("🚫 عذراً، هذه الصلاحية مخصصة للمدير العام فقط!", "error");
            toggleStampMutation.mutate({ id, currentStatus });
        },
        handlePayInvoice,
        isReceiptModalOpen, 
        setIsReceiptModalOpen,
        selectedInvoiceForPay, 
        setSelectedInvoiceForPay, 
        handleOpenPaymentModal,
        globalSearch, setGlobalSearch,
        dateFrom, setDateFrom,
        dateTo, setDateTo,
        selectedIds, setSelectedIds,
        currentPage, setCurrentPage,
        rowsPerPage, setRowsPerPage,
        kpis,
        isEditModalOpen, setIsEditModalOpen,
        currentRecord, setCurrentRecord,
        handleAddNew, handleEdit, 
        handleSave: (record: any) => saveMutation.mutate(record),
        handlePostSelected: () => postMutation.mutate(), 
        handleUnpostSelected: () => unpostMutation.mutate(), 
        handleDeleteSelected: () => {
            if (!selectedIds.length || !confirm("هل أنت متأكد من الحذف النهائي؟")) return;
            deleteMutation.mutate();
        }
    };
}