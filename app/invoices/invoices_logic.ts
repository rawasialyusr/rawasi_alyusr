"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useRouter } from 'next/navigation'; 
import { useToast } from '@/lib/toast-context'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 
import { resolvePartnerId } from '@/lib/accounting'; // 💎 الباب الثامن: استدعاء التوجيه الذكي للذمم

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

    // 🛡️ 1. جلب الصلاحيات
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

    // 🧠 2. جلب الفواتير عبر React Query
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
    // ⚙️ المعالجة والحسابات (Logic Filtering) 
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
        
        let pIds: string[] = [];
        if (Array.isArray(inv.project_ids)) {
            pIds = inv.project_ids.map((id: any) => String(id));
        } else if (typeof inv.project_ids === 'string') {
            pIds = inv.project_ids.replace(/[{}[\]"']/g, '').split(',').map((id: string) => id.trim());
        }
        
        const selectedProjects = projects.filter((p: any) => pIds.includes(String(p.id)));
        const pName = inv.client_name || inv.partners?.name || '';

        setSelectedInvoiceForPay({
            id: undefined, invoice_id: inv.id, invoice_number: inv.invoice_number,
            partner_id: inv.partner_id, partner_name: pName,
            selected_projects: selectedProjects, project_ids: pIds, 
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
        let pIds: string[] = [];
        if (Array.isArray(inv.project_ids)) {
            pIds = inv.project_ids.map((id: any) => String(id));
        } else if (typeof inv.project_ids === 'string') {
            pIds = inv.project_ids.replace(/[{}[\]"']/g, '').split(',').map((id: string) => id.trim());
        }

        const mappedProjects = projects.filter((p: any) => pIds.includes(String(p.id)));
        
        setCurrentRecord({ ...inv, client_name: inv.client_name || inv.partners?.name || '', selected_projects: mappedProjects, project_ids: pIds });
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
                invoice_number: record.invoice_number, 
                date: record.date, 
                partner_id: cleanId(record.partner_id),
                client_name: record.client_name, 
                project_ids: record.project_ids || null, 
                description: record.description, 
                materials_discount: Number(record.materials_discount) || 0, 
                taxable_amount: Number(record.taxable_amount) || 0,
                tax_amount: Number(record.tax_amount) || 0, 
                guarantee_percent: Number(record.guarantee_percent) || 0,
                guarantee_amount: Number(record.guarantee_amount) || 0, 
                total_amount: Number(record.total_amount) || 0,
                debit_account_id: cleanId(record.debit_account_id), 
                credit_account_id: cleanId(record.credit_account_id),
                materials_acc_id: cleanId(record.materials_acc_id), 
                guarantee_acc_id: cleanId(record.guarantee_acc_id),
                tax_acc_id: cleanId(record.tax_acc_id), 
                status: record.status || 'معلق', 
                due_in_days: Number(record.due_in_days) || 0,
                due_date: record.due_date, 
                paid_amount: Number(record.paid_amount) || 0, 
                skip_zatca: record.skip_zatca || false,
                lines_data: record.lines || record.items || [] 
            };

            if (record.id) {
                const { error: headErr } = await supabase.from('invoices').update(invoiceHeader).eq('id', record.id);
                if (headErr) throw headErr;
            } else {
                const { error: headErr } = await supabase.from('invoices').insert([invoiceHeader]);
                if (headErr) throw headErr;
            }
        },
        onSuccess: () => {
            setIsEditModalOpen(false);
            showToast("تم حفظ الفاتورة بنجاح 💾", "success");
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        },
        onError: (err: any) => {
            showToast(`حدث خطأ أثناء الحفظ! ❌ ${err.message}`, "error");
        }
    });

    // 2. الترحيل الماسي 💎 (Sub-ledger Accounting + Smart Routing)
    const postMutation = useMutation({
        mutationFn: async () => {
            if (!selectedIds.length) return 0;
            const toPost = invoices.filter((inv: any) => selectedIds.includes(inv.id) && inv.status !== 'مُعتمد');
            if (toPost.length === 0) throw new Error('ALREADY_POSTED');

            const cleanId = (id: any) => (id && typeof id === 'string' && id.trim() !== '') ? id : null;

            for (const inv of toPost) {
                const invDate = inv.date || new Date().toISOString().split('T')[0];
                const safePartnerId = cleanId(inv.partner_id);
                const mainProjectId = (inv.project_ids && inv.project_ids.length > 0) ? inv.project_ids[0] : null;

                const { data: header, error: headerErr } = await supabase
                    .from('journal_headers')
                    .insert({ entry_date: invDate, description: `فاتورة #${inv.invoice_number} | ${inv.client_name}`, status: 'posted', reference_id: inv.id })
                    .select('id').single();

                if (headerErr) throw headerErr;
                const headerId = header.id;
                
                const journalLines: any[] = [];

                // 💎 تم تطبيق التوجيه الذكي resolvePartnerId على جميع أطراف القيود
                // 1️⃣ إجمالي قيمة الأعمال (العميل مدين، إيراد الشركة دائن)
                if (Number(inv.taxable_amount) > 0) {
                    journalLines.push(
                        { header_id: headerId, account_id: inv.debit_account_id, debit: Number(inv.taxable_amount), credit: 0, partner_id: resolvePartnerId(inv.debit_account_id, safePartnerId), project_id: mainProjectId, notes: `قيمة أعمال منجزة - فاتورة ${inv.invoice_number}` },
                        { header_id: headerId, account_id: inv.credit_account_id, debit: 0, credit: Number(inv.taxable_amount), partner_id: resolvePartnerId(inv.credit_account_id, safePartnerId), project_id: mainProjectId, notes: `إيراد أعمال - فاتورة ${inv.invoice_number}` }
                    );
                }

                // 2️⃣ خصم الخامات (العميل دائن، حساب الخامات مدين)
                if (Number(inv.materials_discount) > 0) {
                    journalLines.push(
                        { header_id: headerId, account_id: inv.debit_account_id, debit: 0, credit: Number(inv.materials_discount), partner_id: resolvePartnerId(inv.debit_account_id, safePartnerId), project_id: mainProjectId, notes: `استقطاع خامات موردة - فاتورة ${inv.invoice_number}` },
                        { header_id: headerId, account_id: inv.materials_acc_id, debit: Number(inv.materials_discount), credit: 0, partner_id: resolvePartnerId(inv.materials_acc_id, safePartnerId), project_id: mainProjectId, notes: `تسوية خامات - فاتورة ${inv.invoice_number}` }
                    );
                }

                // 3️⃣ ضريبة القيمة المضافة (العميل مدين، حساب مصلحة الزكاة دائن)
                if (!inv.skip_zatca && Number(inv.tax_amount) > 0) {
                    journalLines.push(
                        { header_id: headerId, account_id: inv.debit_account_id, debit: Number(inv.tax_amount), credit: 0, partner_id: resolvePartnerId(inv.debit_account_id, safePartnerId), project_id: mainProjectId, notes: `ضريبة قيمة مضافة 15% - فاتورة ${inv.invoice_number}` },
                        { header_id: headerId, account_id: inv.tax_acc_id, debit: 0, credit: Number(inv.tax_amount), partner_id: resolvePartnerId(inv.tax_acc_id, safePartnerId), project_id: mainProjectId, notes: `مخرجات ضريبة - فاتورة ${inv.invoice_number}` }
                    );
                }

                // 4️⃣ ضمان الأعمال (العميل دائن، حساب التأمينات المحتجزة مدين)
                if (Number(inv.guarantee_amount) > 0) {
                    journalLines.push(
                        { header_id: headerId, account_id: inv.debit_account_id, debit: 0, credit: Number(inv.guarantee_amount), partner_id: resolvePartnerId(inv.debit_account_id, safePartnerId), project_id: mainProjectId, notes: `استقطاع ضمان أعمال (${inv.guarantee_percent || 0}%) - فاتورة ${inv.invoice_number}` },
                        { header_id: headerId, account_id: inv.guarantee_acc_id, debit: Number(inv.guarantee_amount), credit: 0, partner_id: resolvePartnerId(inv.guarantee_acc_id, safePartnerId), project_id: mainProjectId, notes: `تأمينات محتجزة - فاتورة ${inv.invoice_number}` }
                    );
                }

                // 🛡️ التوازن المحاسبي
                const totalDebits = journalLines.reduce((sum, l) => sum + l.debit, 0);
                const totalCredits = journalLines.reduce((sum, l) => sum + l.credit, 0);
                if (Math.abs(totalDebits - totalCredits) > 0.01) {
                    await supabase.from('journal_headers').delete().eq('id', headerId);
                    throw new Error(`القيد غير متزن للفاتورة ${inv.invoice_number} - المبالغ غير صحيحة.`);
                }

                const { error: jErr } = await supabase.from('journal_lines').insert(journalLines);
                if (jErr) {
                    await supabase.from('journal_headers').delete().eq('id', headerId);
                    throw jErr;
                }
            }
            await supabase.from('invoices').update({ status: 'مُعتمد' }).in('id', selectedIds);
            return toPost.length;
        },
        onError: (err: any) => {
            if (err.message === 'ALREADY_POSTED') showToast("الفواتير المختارة مُرحلة بالفعل! ⚠️", "warning");
            else showToast(`حدث خطأ أثناء الترحيل: ${err.message}`, "error");
        },
        onSuccess: (count) => {
            if (count > 0) {
                setSelectedIds([]);
                showToast(`✅ تم الترحيل وإنشاء القيود لـ ${count} فاتورة!`, "success");
                queryClient.invalidateQueries({ queryKey: ['invoices'] });
            }
        }
    });

    // 3. المسح المتسلسل (Deep Cascade Unposting)
    const unpostMutation = useMutation({
        mutationFn: async () => {
            if (!selectedIds.length) return;
            const { data: invoiceHeaders } = await supabase.from('journal_headers').select('id').in('reference_id', selectedIds);
            if (invoiceHeaders?.length) {
                const headerIds = invoiceHeaders.map(h => h.id);
                await supabase.from('journal_lines').delete().in('header_id', headerIds);
                await supabase.from('journal_headers').delete().in('id', headerIds);
            }
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
            await supabase.from('invoices').update({ status: 'معلق', paid_amount: 0 }).in('id', selectedIds);
        },
        onError: () => showToast("حدث خطأ أثناء التراجع عن الترحيل! ❌", "error"),
        onSuccess: () => {
            setSelectedIds([]);
            showToast("تم إلغاء الترحيل بنجاح 🔴", "success");
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }
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
        onError: () => showToast("حدث خطأ أثناء الحذف! ❌", "error"),
        onSuccess: () => {
            setSelectedIds([]);
            showToast("تم الحذف النهائي بنجاح 🗑️", "success");
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }
    });

    // 5. حالة الختم (Toggle Stamp)
    const toggleStampMutation = useMutation({
        mutationFn: async ({ id, currentStatus }: { id: string, currentStatus: boolean }) => {
            const { error } = await supabase.from('invoices').update({ is_stamped: !currentStatus }).eq('id', id);
            if (error) throw error;
        },
        onError: () => showToast("حدث خطأ أثناء محاولة ختم الفاتورة! ❌", "error"),
        onSuccess: () => {
            showToast("تم تحديث حالة الختم بنجاح ✨", "success");
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }
    });

    // 6. السداد الفوري
    const payMutation = useMutation({
        mutationFn: async (receiptData: any) => {
            const autoNumber = `RV-${Date.now()}`;
            const cleanId = (id: any) => (id && typeof id === 'string' && id.trim() !== '') ? id : null;
            const finalAmount = Number(receiptData.amount || 0);
            if (finalAmount <= 0) throw new Error("AMOUNT_ZERO");

            const dataToSave = {
                receipt_number: receiptData.receipt_number || autoNumber,
                date: receiptData.date || new Date().toISOString().split('T')[0],
                amount: finalAmount,
                payment_method: receiptData.payment_method || 'نقدي (كاش)',
                notes: receiptData.notes || `سداد دفعة من فاتورة #${receiptData.invoice_number}`,
                partner_id: cleanId(receiptData.partner_id),
                invoice_id: cleanId(receiptData.invoice_id),
                safe_bank_acc_id: cleanId(receiptData.safe_bank_acc_id),
                partner_acc_id: cleanId(receiptData.partner_acc_id),
                project_ids: receiptData.project_ids && receiptData.project_ids.length > 0 ? receiptData.project_ids : null,
                status: 'مسودة'
            };

            const { error: receiptErr } = await supabase.from('receipt_vouchers').insert([dataToSave]);
            if (receiptErr) throw receiptErr;

            if (dataToSave.invoice_id) {
                const { data: invData } = await supabase.from('invoices').select('paid_amount').eq('id', dataToSave.invoice_id).single();
                const newPaid = Number(invData?.paid_amount || 0) + finalAmount;
                await supabase.from('invoices').update({ paid_amount: newPaid }).eq('id', dataToSave.invoice_id);
            }
        },
        onError: (err: any) => {
            if (err.message === "AMOUNT_ZERO") showToast("المبلغ المُسدد يجب أن يكون أكبر من صفر ⚠️", "warning");
            else showToast("حدث خطأ أثناء إصدار سند السداد! ❌", "error");
        },
        onSuccess: () => {
            setIsReceiptModalOpen(false);
            setSelectedInvoiceForPay(null);
            showToast("تم السداد وتحديث الفاتورة بنجاح ✅", "success");
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }
    });

    const isSaving = saveMutation.isPending || postMutation.isPending || unpostMutation.isPending || deleteMutation.isPending || toggleStampMutation.isPending || payMutation.isPending;
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
        isReceiptModalOpen, setIsReceiptModalOpen,
        selectedInvoiceForPay, setSelectedInvoiceForPay, 
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
        },
        handleSavePayment: (record: any) => payMutation.mutate(record), 
    };
}