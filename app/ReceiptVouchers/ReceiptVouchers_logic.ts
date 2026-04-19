"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase'; 

export function useReceiptVouchersLogic() {
    // 1. حالات البيانات الأساسية
    const [allData, setAllData] = useState<any[]>([]); // البيانات الخام من الداتابيز
    const [isLoading, setIsLoading] = useState(true);
    const [globalSearch, setGlobalSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<any>({});
    
    // حالة لتتبع الصف النشط بالكيبورد
    const [focusedIndex, setFocusedIndex] = useState(-1);

    // =========================================================================
    // 🔐 2. نظام الصلاحيات
    // =========================================================================
    const [permissions, setPermissions] = useState({
        canAdd: true,
        canEdit: true,
        canDelete: true,
        canPost: true,    
        canUnpost: true   
    });

    const canUserEdit = (record: any) => {
        if (!record || record.status === 'مُعتمد') return false; 
        return permissions.canEdit;
    };

    // =========================================================================
    // 📥 3. جلب البيانات
    // =========================================================================
    const fetchFullData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: rec, error } = await supabase
                .from('receipt_vouchers')
                .select(`*, partners(name), invoices(invoice_number)`)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const { data: allProjects } = await supabase.from('projects').select('id, "Property"');

            const enrichedRec = rec?.map(voucher => ({
                ...voucher,
                project_names: voucher.project_ids && allProjects
                    ? allProjects.filter(p => voucher.project_ids.includes(p.id)).map(p => p.Property).join(' ، ')
                    : '---'
            }));

            setAllData(enrichedRec || []);
        } catch (error: any) {
            console.error("❌ Supabase Error:", error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchFullData(); }, [fetchFullData]);

    // =========================================================================
    // 🔍 4. البحث والفلترة
    // =========================================================================
    const allFiltered = useMemo(() => {
        return allData.filter(rec => {
            const searchStr = globalSearch.toLowerCase();
            return (
                rec.receipt_number?.toLowerCase().includes(searchStr) || 
                rec.partners?.name?.toLowerCase().includes(searchStr) ||
                rec.project_names?.toLowerCase().includes(searchStr) ||
                rec.notes?.toLowerCase().includes(searchStr)
            );
        });
    }, [allData, globalSearch]);

    // =========================================================================
    // 📄 5. التقسيم لصفحات
    // =========================================================================
    const receipts = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return allFiltered.slice(start, start + rowsPerPage);
    }, [allFiltered, currentPage, rowsPerPage]);

    // =========================================================================
    // 📊 6. المؤشرات (KPIs) - 🚀 (تم إصلاح مشكلة التكرار في الحسابات هنا)
    // =========================================================================
    const kpis = useMemo(() => {
        // التأكد من عدم تكرار السندات في الحسبة (باستخدام Map لفلترة الـ IDs المتكررة)
        const uniqueReceipts = Array.from(new Map(allFiltered.map(item => [item.id, item])).values());
        
        return {
            total: uniqueReceipts.length,
            posted: uniqueReceipts.filter(i => i.status === 'مُعتمد').length,
            pending: uniqueReceipts.filter(i => i.status !== 'مُعتمد').length, // تشمل المسودة والمسترجع
            totalAmount: uniqueReceipts.reduce((sum, r) => sum + Number(r.amount || 0), 0)
        };
    }, [allFiltered]);

    // =========================================================================
    // ⌨️ 7. لوجيك التحكم بالكيبورد للجدول
    // =========================================================================
    const handleTableKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (isEditModalOpen) return; 

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIndex(prev => (prev < receipts.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
                break;
            case ' ': 
                e.preventDefault();
                if (focusedIndex !== -1) {
                    const id = receipts[focusedIndex].id;
                    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                }
                break;
            case 'Enter': 
                e.preventDefault();
                if (focusedIndex !== -1) {
                    const record = receipts[focusedIndex];
                    if (canUserEdit(record)) handleEdit(record);
                }
                break;
        }
    }, [receipts, focusedIndex, isEditModalOpen, canUserEdit]); // تم إضافة canUserEdit لتجنب تحذيرات eslint

    // =========================================================================
    // 🚀 8. الترحيل المالي (Post)
    // =========================================================================
    const handlePostSelected = async () => {
        if (!selectedIds.length || !permissions.canPost) return;
        setIsLoading(true);
        try {
            const toPost = allData.filter(rec => selectedIds.includes(rec.id) && rec.status !== 'مُعتمد');
            
            for (const rec of toPost) {
                const unifiedNotes = `سند قبض #${rec.receipt_number} | ${rec.partners?.name || ''}`;
                
                const { data: header, error: hErr } = await supabase.from('journal_headers').insert({
                    entry_date: rec.date,
                    description: unifiedNotes,
                    status: 'posted',
                    reference_id: rec.id 
                }).select('id').single();
                if (hErr) throw hErr;

                const mainProjectId = rec.project_ids?.[0] || null;

                const lines = [
                    { header_id: header.id, account_id: rec.safe_bank_acc_id, debit: Number(rec.amount), credit: 0, partner_id: rec.partner_id, project_id: mainProjectId, notes: unifiedNotes },
                    { header_id: header.id, account_id: rec.partner_acc_id, debit: 0, credit: Number(rec.amount), partner_id: rec.partner_id, project_id: mainProjectId, notes: unifiedNotes }
                ];
                await supabase.from('journal_lines').insert(lines);

                if (rec.invoice_id) {
                    const { data: inv } = await supabase.from('invoices').select('paid_amount').eq('id', rec.invoice_id).single();
                    await supabase.from('invoices').update({ paid_amount: (inv?.paid_amount || 0) + Number(rec.amount) }).eq('id', rec.invoice_id);
                }
            }

            await supabase.from('receipt_vouchers').update({ status: 'مُعتمد' }).in('id', selectedIds);
            alert("✅ تم الترحيل بنجاح");
            fetchFullData();
            setSelectedIds([]);
        } catch (error: any) {
            alert("خطأ أثناء الترحيل: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // =========================================================================
    // 🔙 9. فك الترحيل (Unpost)
    // =========================================================================
    const handleUnpostSelected = async () => {
        if (!selectedIds.length || !permissions.canUnpost) return;
        setIsLoading(true);
        try {
            await supabase.from('journal_headers').delete().in('reference_id', selectedIds);
            
            const toUnpost = allData.filter(r => selectedIds.includes(r.id) && r.invoice_id && r.status === 'مُعتمد');
            for (const rec of toUnpost) {
                const { data: inv } = await supabase.from('invoices').select('paid_amount').eq('id', rec.invoice_id).single();
                await supabase.from('invoices').update({ paid_amount: Math.max(0, (inv?.paid_amount || 0) - Number(rec.amount)) }).eq('id', rec.invoice_id);
            }

            await supabase.from('receipt_vouchers').update({ status: 'مسودة' }).in('id', selectedIds);
            alert("✅ تم فك الترحيل بنجاح");
            fetchFullData();
            setSelectedIds([]);
        } finally {
            setIsLoading(false);
        }
    };

    // =========================================================================
    // 🔙 10. إرجاع السداد (Refund) - 🚀 (العملية الجديدة)
    // =========================================================================
    const handleRefundSelected = async () => {
        if (!selectedIds.length) return;
        if (!confirm("⚠️ هل أنت متأكد من إرجاع السداد؟ سيتم حذف القيود المالية وإعادة مديونية الفواتير كأنها لم تُدفع.")) return;

        setIsLoading(true);
        try {
            // نجلب فقط السندات التي تم ترحيلها (مُعتمدة)
            const toRefund = allData.filter(r => selectedIds.includes(r.id) && r.status === 'مُعتمد');

            for (const rec of toRefund) {
                // 1. حذف القيود المحاسبية المرتبطة بالسند
                await supabase.from('journal_headers').delete().eq('reference_id', rec.id);

                // 2. عكس أثر السداد في الفاتورة (خصم المبلغ المدفوع منها لترجع مديونية)
                if (rec.invoice_id) {
                    const { data: inv } = await supabase.from('invoices').select('paid_amount').eq('id', rec.invoice_id).single();
                    if (inv) {
                        const newAmount = Math.max(0, Number(inv.paid_amount || 0) - Number(rec.amount));
                        await supabase.from('invoices').update({ paid_amount: newAmount }).eq('id', rec.invoice_id);
                    }
                }
            }

            // 3. تحديث حالة السند ليصبح "مسترجع"
            await supabase.from('receipt_vouchers').update({ status: 'مسترجع' }).in('id', selectedIds);

            alert("✅ تم إرجاع السداد بنجاح");
            fetchFullData();
            setSelectedIds([]);
        } catch (err: any) {
            alert("خطأ أثناء إرجاع السداد: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // =========================================================================
    // 📝 11. الإضافة، التعديل، والحذف
    // =========================================================================
    const handleAddNew = () => {
        if (!permissions.canAdd) return alert("ليست لديك صلاحية الإضافة");
        setCurrentRecord({ date: new Date().toISOString().split('T')[0], payment_method: 'نقدي (كاش)', status: 'مسودة', project_ids: [], selected_projects: [] });
        setIsEditModalOpen(true);
    };

    const handleEdit = (rec: any) => {
        if (!canUserEdit(rec)) return alert("لا يمكن تعديل سند مُعتمد أو لا تملك الصلاحية");
        setCurrentRecord(rec);
        setIsEditModalOpen(true);
    };

    const handleDeleteSelected = async () => {
        if (!confirm("حذف السندات؟") || !permissions.canDelete) return;
        
        const postedExists = allData.some(r => selectedIds.includes(r.id) && r.status === 'مُعتمد');
        if (postedExists) return alert("لا يمكن حذف سندات مُرحلة، قم بفك الترحيل أولاً");

        await supabase.from('receipt_vouchers').delete().in('id', selectedIds);
        fetchFullData();
        setSelectedIds([]);
    };

    return {
        receipts, allFiltered, isLoading, globalSearch, setGlobalSearch,
        selectedIds, setSelectedIds, currentPage, setCurrentPage,
        rowsPerPage, setRowsPerPage, kpis, isEditModalOpen, setIsEditModalOpen,
        currentRecord, setCurrentRecord, handleAddNew, handleEdit, 
        handlePostSelected, handleUnpostSelected, handleRefundSelected, handleDeleteSelected, // 👈 تم إضافة Refund هنا
        focusedIndex, setFocusedIndex, handleTableKeyDown,
        permissions, setPermissions, canUserEdit, fetchFullData 
    };
}