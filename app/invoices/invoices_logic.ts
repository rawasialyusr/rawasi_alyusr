"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useRouter } from 'next/navigation'; // لاستخدامه في زر التسديد
import { useToast } from '@/lib/toast-context'; // 🚀 استدعاء الهوك المركزي

export function useInvoicesLogic() {
    const router = useRouter();
    const { showToast } = useToast(); // 🚀 تفعيل نظام الإشعارات
    
    const [invoices, setInvoices] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]); 
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // 🔐 State الصلاحيات الخاصة بالأدمن
    const [permissions, setPermissions] = useState<any>({ isAdmin: false });
    
    const [globalSearch, setGlobalSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<any>({ lines: [] });

    // 💰 حالات مودال سند القبض (السداد)
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<any>(null);

    // 🚀 جلب صلاحيات المستخدم الحالي
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
    

    const fetchFullData = useCallback(async () => {
        setIsLoading(true);
        const { data: inv, error: invError } = await supabase
            .from('invoices')
            .select('*, partners(*)')
            .order('date', { ascending: false });

        const { data: proj } = await supabase.from('projects').select('*');
        
        setInvoices(inv || []);
        setProjects(proj || []);
        setIsLoading(false);
    }, []);

    useEffect(() => { fetchFullData(); }, [fetchFullData]);

    // 🔍 فلترة البيانات + إضافة منطق "حالة السداد" و "المبالغ المتبقية"
    const allFiltered = useMemo(() => {
        return invoices.filter(inv => {
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
        }).map(inv => {
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
        posted: allFiltered.filter(i => i.status === 'مُعتمد').length,
        pending: allFiltered.filter(i => i.status !== 'مُعتمد').length
    }), [allFiltered]);

    // =========================================================================
    // 💰 [تعديل] دالة فتح مودال السداد - تجميع الأسماء قبل الفتح
    // =========================================================================
    const handleOpenPaymentModal = async (inv: any) => {
        const balance = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
        
        // 🚀 سحب كائنات المشاريع كاملة من مصفوفة الـ IDs
        const selectedProjects = projects.filter(p => inv.project_ids?.includes(p.id));
        
        // 🚀 سحب اسم البارتنر
        const pName = inv.client_name || inv.partners?.name || '';

        setSelectedInvoiceForPay({
            id: undefined, 
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            partner_id: inv.partner_id,
            partner_name: pName, // للعرض في المودال
            selected_projects: selectedProjects, // للعرض كبادجات
            project_ids: inv.project_ids || [], 
            amount: balance > 0 ? balance : 0,
            payment_method: 'تحويل بنكي'
        });
        
        setIsReceiptModalOpen(true);
    };

    // 💰 وظيفة التسديد السريع القديمة
    const handlePayInvoice = (inv: any) => {
        const balance = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
        if (balance <= 0) {
            showToast("هذه الفاتورة مسددة بالكامل ✅", "info"); // 🚀 تعديل لـ Toast
            return;
        }
        const params = new URLSearchParams({
            invoice_id: inv.id,
            amount: balance.toString(),
            client_name: inv.client_name || '',
            ref: inv.invoice_number || ''
        });
        router.push(`/ReceiptVouchers?${params.toString()}`);
    };

    const handleAddNew = () => { 
        setCurrentRecord({ lines: [], date: new Date().toISOString(), project_ids: [], selected_projects: [] }); 
        setIsEditModalOpen(true); 
    };

    // =========================================================================
    // 📝 [تعديل] دالة التعديل - تجميع الأسماء قبل الفتح
    // =========================================================================
    const handleEdit = (inv: any) => {
        // 🚀 سحب كائنات المشاريع كاملة للعرض في مودال الفاتورة
        const mappedProjects = projects.filter(p => inv.project_ids?.includes(p.id));
        
        setCurrentRecord({
            ...inv,
            client_name: inv.client_name || inv.partners?.name || '',
            selected_projects: mappedProjects
        });
        setIsEditModalOpen(true);
    };

    const handleToggleStamp = async (id: string, currentStatus: boolean) => {
        if (!permissions.isAdmin) {
            showToast("🚫 عذراً، هذه الصلاحية مخصصة للمدير العام فقط!", "error"); // 🚀 تعديل لـ Toast
            return;
        }
        setIsLoading(true);
        try {
            const { error } = await supabase.from('invoices').update({ is_stamped: !currentStatus }).eq('id', id);
            if (error) throw error;
            fetchFullData(); 
            showToast("تم تحديث حالة الختم بنجاح ✨", "success"); // 🚀 إضافة إشعار نجاح
        } catch (error) {
            showToast("حدث خطأ أثناء محاولة ختم الفاتورة! ❌", "error"); // 🚀 تعديل لـ Toast
        } finally {
            setIsLoading(false);
        }
    };

    const handlePostSelected = async () => {
        if (!selectedIds.length) return;
        setIsLoading(true);
        try {
            const toPost = invoices.filter(inv => selectedIds.includes(inv.id) && inv.status !== 'مُعتمد');
            if (toPost.length === 0) { 
                showToast("الفواتير المختارة مُرحلة بالفعل! ⚠️", "warning"); // 🚀 تعديل لـ Toast
                return; 
            }

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
                            header_id: headerId,
                            account_id: accId,
                            partner_id: inv.partner_id,
                            project_id: (inv.project_ids && inv.project_ids[0]) || null,
                            item_name: inv.description || label,
                            quantity: Number(inv.quantity) || 1, 
                            unit_price: Number(inv.unit_price) || 0,
                            debit: debit, credit: credit,
                            notes: `${label}: ${inv.invoice_number}`
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
            fetchFullData();
            setSelectedIds([]);
            showToast(`✅ تم ترحيل ${toPost.length} فاتورة بنجاح!`, "success"); // 🚀 تعديل لـ Toast
        } catch (error: any) {
            showToast("حدث خطأ أثناء الترحيل! ❌", "error"); // 🚀 تعديل لـ Toast
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnpostSelected = async () => {
        if(!selectedIds.length) return;
        setIsLoading(true);
        try {
            const { data: headers } = await supabase.from('journal_headers').select('id').in('reference_id', selectedIds);
            if (headers && headers.length > 0) {
                const headerIds = headers.map(h => h.id);
                await supabase.from('journal_lines').delete().in('header_id', headerIds);
                await supabase.from('journal_headers').delete().in('id', headerIds);
            }
            await supabase.from('invoices').update({ status: 'معلق' }).in('id', selectedIds);
            fetchFullData();
            setSelectedIds([]);
            showToast("تم تعليق الفواتير بنجاح 🔴", "success"); // 🚀 إضافة إشعار نجاح
        } catch (error: any) {
            console.error(error.message);
            showToast("حدث خطأ أثناء التراجع عن الترحيل! ❌", "error"); // 🚀 تعديل لـ Toast
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSelected = async () => {
        if(!selectedIds.length || !confirm("هل أنت متأكد من الحذف النهائي؟")) return;
        setIsLoading(true);
        try {
            const { data: headers } = await supabase.from('journal_headers').select('id').in('reference_id', selectedIds);
            if (headers && headers.length > 0) {
                const headerIds = headers.map(h => h.id);
                await supabase.from('journal_lines').delete().in('header_id', headerIds);
                await supabase.from('journal_headers').delete().in('id', headerIds);
            }
            await supabase.from('invoices').delete().in('id', selectedIds);
            fetchFullData();
            setSelectedIds([]);
            showToast("تم الحذف النهائي بنجاح 🗑️", "success"); // 🚀 إضافة إشعار نجاح
        } catch (error) {
            showToast("حدث خطأ أثناء الحذف! ❌", "error"); // 🚀 تعديل لـ Toast
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (record: any) => {
        setIsSaving(true);
        try {
            const cleanId = (id: any) => (id && typeof id === 'string' && id.trim() !== '') ? id : null;
            const invoiceHeader = {
                invoice_number: record.invoice_number,
                date: record.date,
                partner_id: cleanId(record.partner_id),
                client_name: record.client_name,
                project_ids: record.project_ids || null,
                boq_id: cleanId(record.boq_id),
                description: record.description,
                quantity: Number(record.quantity) || 0,
                unit: record.unit || 'عدد',
                unit_price: Number(record.unit_price) || 0,
                line_total: Number(record.line_total) || 0,
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
                skip_zatca: record.skip_zatca || false
            };

            let savedInvoiceId = record.id;
            if (record.id) {
                const { error: headErr } = await supabase.from('invoices').update(invoiceHeader).eq('id', record.id);
                if (headErr) throw headErr;
            } else {
                const { data: newHead, error: headErr } = await supabase.from('invoices').insert([invoiceHeader]).select('id').single();
                if (headErr) throw headErr;
                savedInvoiceId = newHead.id;
            }

            const linesToSave = record.lines || record.items || [];
            if (savedInvoiceId && linesToSave.length > 0) {
                if (record.id) await supabase.from('invoice_lines').delete().eq('invoice_id', savedInvoiceId);
                const preparedLines = linesToSave.map((line: any) => ({
                    invoice_id: savedInvoiceId,
                    item_id: cleanId(line.item_id),
                    description: line.description || '',
                    unit: line.unit || 'عدد',
                    quantity: Number(line.quantity) || 0,
                    unit_price: Number(line.unit_price) || 0,
                    total_price: Number(line.total_price) || (Number(line.quantity) * Number(line.unit_price)) || 0
                }));
                const { error: linesErr } = await supabase.from('invoice_lines').insert(preparedLines);
                if (linesErr) throw linesErr;
            }

            setIsEditModalOpen(false);
            fetchFullData(); 
            showToast("تم حفظ بيانات الفاتورة بنجاح 💾", "success"); // 🚀 إضافة إشعار نجاح
        } catch (error: any) {
            showToast("حدث خطأ أثناء الحفظ! ❌", "error"); // 🚀 تعديل لـ Toast
        } finally {
            setIsSaving(false);
        }
    };

    return {
        invoices: paginatedInvoices,
        allFiltered,
        projects,
        isLoading,
        isSaving,
        permissions,
        handleToggleStamp,
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
        handleAddNew, handleEdit, handleSave,
        handlePostSelected, handleUnpostSelected, handleDeleteSelected
    };
}