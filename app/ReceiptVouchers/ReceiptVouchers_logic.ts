"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';

export function useReceiptVouchersLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // 1. حالات البيانات الأساسية (UI State)
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
    const [permissions] = useState({
        canAdd: true, canEdit: true, canDelete: true, canPost: true, canUnpost: true   
    });

    const canUserEdit = (record: any) => {
        if (!record || record.status === 'مُعتمد') return false; 
        return permissions.canEdit;
    };

    // =========================================================================
    // 📥 3. جلب البيانات (React Query 💎)
    // =========================================================================
    const { data: allData = [], isLoading } = useQuery({
        queryKey: ['receipt_vouchers'],
        queryFn: async () => {
            const { data: rec, error } = await supabase
                .from('receipt_vouchers')
                .select(`*, partners(name), invoices(invoice_number)`)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const { data: allProjects } = await supabase.from('projects').select('id, "Property"');

            return rec?.map(voucher => ({
                ...voucher,
                project_names: voucher.project_ids && allProjects
                    ? allProjects.filter(p => voucher.project_ids.includes(p.id)).map(p => p.Property).join(' ، ')
                    : '---'
            })) || [];
        }
    });

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
    // 📊 6. المؤشرات (KPIs)
    // =========================================================================
    const kpis = useMemo(() => {
        const uniqueReceipts = Array.from(new Map(allFiltered.map(item => [item.id, item])).values());
        
        return {
            total: uniqueReceipts.length,
            posted: uniqueReceipts.filter(i => i.status === 'مُعتمد').length,
            pending: uniqueReceipts.filter(i => i.status !== 'مُعتمد').length,
            totalAmount: uniqueReceipts.reduce((sum, r) => sum + Number(r.amount || 0), 0)
        };
    }, [allFiltered]);

    // =========================================================================
    // 🚀 7. طابور العمليات (Mutations 💎)
    // =========================================================================

    // أ. حفظ السند (بدون حقول الخصم لتوافق الـ Schema)
    const saveMutation = useMutation({
        mutationFn: async (record: any) => {
            const cleanId = (id: any) => (id && typeof id === 'string' && id.trim() !== '') ? id : null;
            const voucherData = {
                receipt_number: record.receipt_number || `RV-${Date.now()}`, 
                date: record.date,
                payment_method: record.payment_method,
                amount: Number(record.amount || 0),
                invoice_id: cleanId(record.invoice_id),
                partner_id: cleanId(record.partner_id),
                project_ids: record.project_ids || [],
                safe_bank_acc_id: cleanId(record.safe_bank_acc_id),
                partner_acc_id: cleanId(record.partner_acc_id),
                notes: record.notes || '',
                status: record.status || 'مسودة'
                // ❌ تم إزالة الخصم لتجنب الإيرور
            };

            if (record.id) {
                const { error } = await supabase.from('receipt_vouchers').update(voucherData).eq('id', record.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('receipt_vouchers').insert([voucherData]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            setIsEditModalOpen(false);
            showToast("تم حفظ السند بنجاح 💾", "success");
            queryClient.invalidateQueries({ queryKey: ['receipt_vouchers'] });
        },
        onError: (err: any) => showToast(`خطأ أثناء الحفظ: ${err.message}`, "error")
    });

    // ب. الترحيل المالي
    const postMutation = useMutation({
        mutationFn: async () => {
            const toPost = allData.filter(rec => selectedIds.includes(rec.id) && rec.status !== 'مُعتمد');
            if (toPost.length === 0) throw new Error("لا توجد سندات صالحة للترحيل");

            for (const rec of toPost) {
                const unifiedNotes = rec.notes || `سند قبض #${rec.receipt_number} | ${rec.partners?.name || ''}`;
                
                const { data: header, error: hErr } = await supabase.from('journal_headers').insert({
                    entry_date: rec.date, description: unifiedNotes, status: 'posted', reference_id: rec.id 
                }).select('id').single();
                if (hErr) throw hErr;

                const mainProjectId = rec.project_ids?.[0] || null;
                const paidAmount = Number(rec.amount || 0);

                const lines = [
                    { header_id: header.id, account_id: rec.safe_bank_acc_id, debit: paidAmount, credit: 0, partner_id: rec.partner_id, project_id: mainProjectId, notes: unifiedNotes },
                    { header_id: header.id, account_id: rec.partner_acc_id, debit: 0, credit: paidAmount, partner_id: rec.partner_id, project_id: mainProjectId, notes: unifiedNotes }
                ];

                await supabase.from('journal_lines').insert(lines);

                if (rec.invoice_id) {
                    const { data: inv } = await supabase.from('invoices').select('paid_amount').eq('id', rec.invoice_id).single();
                    await supabase.from('invoices').update({ paid_amount: (inv?.paid_amount || 0) + paidAmount }).eq('id', rec.invoice_id);
                }
            }
            await supabase.from('receipt_vouchers').update({ status: 'مُعتمد' }).in('id', selectedIds);
        },
        onSuccess: () => {
            setSelectedIds([]);
            showToast("تم ترحيل السندات بنجاح ✅", "success");
            queryClient.invalidateQueries({ queryKey: ['receipt_vouchers'] });
        },
        onError: (err: any) => showToast(`خطأ أثناء الترحيل: ${err.message}`, "error")
    });

    // ج. فك الترحيل والإرجاع
    const unpostMutation = useMutation({
        mutationFn: async () => {
            await supabase.from('journal_headers').delete().in('reference_id', selectedIds);
            const toUnpost = allData.filter(r => selectedIds.includes(r.id) && r.invoice_id && r.status === 'مُعتمد');
            for (const rec of toUnpost) {
                const totalReversed = Number(rec.amount || 0);
                const { data: inv } = await supabase.from('invoices').select('paid_amount').eq('id', rec.invoice_id).single();
                await supabase.from('invoices').update({ paid_amount: Math.max(0, (inv?.paid_amount || 0) - totalReversed) }).eq('id', rec.invoice_id);
            }
            await supabase.from('receipt_vouchers').update({ status: 'مسودة' }).in('id', selectedIds);
        },
        onSuccess: () => {
            setSelectedIds([]);
            showToast("تم فك الترحيل بنجاح 🔴", "success");
            queryClient.invalidateQueries({ queryKey: ['receipt_vouchers'] });
        }
    });

    // د. الحذف
    const deleteMutation = useMutation({
        mutationFn: async () => {
            const postedExists = allData.some(r => selectedIds.includes(r.id) && r.status === 'مُعتمد');
            if (postedExists) throw new Error("لا يمكن حذف سندات مُرحلة، قم بفك الترحيل أولاً");
            await supabase.from('receipt_vouchers').delete().in('id', selectedIds);
        },
        onSuccess: () => {
            setSelectedIds([]);
            showToast("تم الحذف بنجاح 🗑️", "success");
            queryClient.invalidateQueries({ queryKey: ['receipt_vouchers'] });
        },
        onError: (err: any) => showToast(err.message, "error")
    });

    // =========================================================================
    // ⌨️ 8. لوجيك التحكم بالكيبورد للجدول
    // =========================================================================
    const handleTableKeyDown = (e: React.KeyboardEvent) => {
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
                    if (canUserEdit(record)) {
                        setCurrentRecord(record);
                        setIsEditModalOpen(true);
                    } else {
                        showToast("لا يمكن تعديل سند مُعتمد", "warning");
                    }
                }
                break;
        }
    };

    return {
        receipts, allFiltered, isLoading, globalSearch, setGlobalSearch,
        selectedIds, setSelectedIds, currentPage, setCurrentPage,
        rowsPerPage, setRowsPerPage, kpis, isEditModalOpen, setIsEditModalOpen,
        currentRecord, setCurrentRecord, 
        
        handleAddNew: () => { 
            if (!permissions.canAdd) return showToast("ليست لديك صلاحية الإضافة", "error");
            setCurrentRecord({ date: new Date().toISOString().split('T')[0], payment_method: 'نقدي (كاش)', status: 'مسودة', project_ids: [], selected_projects: [] }); 
            setIsEditModalOpen(true); 
        }, 
        handleEdit: (rec: any) => { 
            if (canUserEdit(rec)) { setCurrentRecord(rec); setIsEditModalOpen(true); }
            else showToast("لا يمكن تعديل سند مُعتمد", "warning");
        }, 
        
        handleSave: (record: any) => saveMutation.mutate(record), 
        handlePostSelected: () => { if(permissions.canPost) postMutation.mutate(); }, 
        handleUnpostSelected: () => { if(permissions.canUnpost) unpostMutation.mutate(); }, 
        handleRefundSelected: () => { if(confirm("هل أنت متأكد من إرجاع السداد؟")) unpostMutation.mutate(); }, 
        handleDeleteSelected: () => { if(confirm("تأكيد الحذف؟") && permissions.canDelete) deleteMutation.mutate(); }, 
        
        focusedIndex, setFocusedIndex, handleTableKeyDown,
        permissions, canUserEdit
    };
}