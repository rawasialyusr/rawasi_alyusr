"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { useToast } from '@/lib/toast-context';

export function useAdvancedAuditLogic() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('all');

    // 🚀 جلب كل الأخطاء من الـ View الشامل بطلب واحد سريع جداً
    const { data: errors = [], isLoading, refetch } = useQuery({
        queryKey: ['advanced_audit_errors'],
        queryFn: async () => {
            const { data, error } = await supabase.from('vw_advanced_audit').select('*');
            if (error) throw error;
            return data || [];
        }
    });

    // 🛡️ دالة الحذف (فردي)
    const deleteErrorMutation = useMutation({
        mutationFn: async ({ error_id, table_name }: { error_id: string, table_name: string }) => {
            const { error } = await supabase.from(table_name).delete().eq('id', error_id);
            if (error) throw error;
        },
        onSuccess: () => {
            showToast("تم تطهير السجل الفاسد بنجاح 🧹", "success");
            queryClient.invalidateQueries({ queryKey: ['advanced_audit_errors'] });
            setSelectedIds([]);
        }
    });

    // 🛡️ دالة الحذف الجماعي (تطهير شامل)
    const bulkDeleteMutation = useMutation({
        mutationFn: async () => {
            const itemsToDelete = errors.filter(e => selectedIds.includes(e.error_id));
            
            // فصلهم حسب الجدول عشان نمسح كل مجموعة مرة واحدة
            const headers = itemsToDelete.filter(e => e.table_name === 'journal_headers').map(e => e.error_id);
            const lines = itemsToDelete.filter(e => e.table_name === 'journal_lines').map(e => e.error_id);

            if (lines.length > 0) await supabase.from('journal_lines').delete().in('id', lines);
            if (headers.length > 0) await supabase.from('journal_headers').delete().in('id', headers);
        },
        onSuccess: () => {
            showToast(`تم مسح ${selectedIds.length} خطأ بنجاح 🗑️`, "success");
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['advanced_audit_errors'] });
        }
    });

    // ⚖️ محرك الموازنة الآلية
    const autoBalanceMutation = useMutation({
        mutationFn: async ({ header_id, diff_amount }: { header_id: string, diff_amount: number }) => {
            const isDebitMissing = diff_amount < 0; 
            const fixLine = {
                header_id: header_id,
                account_id: '23623b40-72f8-460b-92f6-984457003a34', // حساب التسويات الافتراضي
                description: 'تسوية آلية - رادار التدقيق المتقدم',
                debit: isDebitMissing ? Math.abs(diff_amount) : 0,
                credit: isDebitMissing ? 0 : Math.abs(diff_amount),
            };

            const { error } = await supabase.from('journal_lines').insert([fixLine]);
            if (error) throw error;
        },
        onSuccess: () => {
            showToast("تم موازنة القيد وإصلاح الخلل ⚖️", "success");
            queryClient.invalidateQueries({ queryKey: ['advanced_audit_errors'] });
        }
    });

    // 📊 تصدير إكسيل
    const exportToExcel = () => {
        if (errors.length === 0) return showToast("لا يوجد أخطاء للتصدير", 'info');
        const ws = XLSX.utils.json_to_sheet(errors.map(e => ({
            'نوع الخطأ': e.error_type,
            'التاريخ': e.error_date,
            'التفاصيل': e.details,
            'معرف السجل': e.error_id
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Audit_Report");
        XLSX.writeFile(wb, `Audit_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // 🔍 فلترة البيانات
    const filteredErrors = useMemo(() => {
        let result = errors;
        if (activeTab !== 'all') {
            result = result.filter(e => e.error_type.includes(activeTab));
        }
        if (searchQuery) {
            result = result.filter(e => e.details?.includes(searchQuery) || e.error_type?.includes(searchQuery));
        }
        return result;
    }, [errors, activeTab, searchQuery]);

    const stats = useMemo(() => ({
        total: errors.length,
        unbalanced: errors.filter(e => e.error_type.includes('غير متزن')).length,
        ghosts: errors.filter(e => e.error_type.includes('شبح')).length,
        orphans: errors.filter(e => e.error_type.includes('يتيم')).length,
        brokenRef: errors.filter(e => e.error_type.includes('مفقود')).length,
    }), [errors]);

    const toggleSelection = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const selectAll = () => setSelectedIds(selectedIds.length === filteredErrors.length ? [] : filteredErrors.map(e => e.error_id));

    return {
        isLoading, errors: filteredErrors, stats,
        searchQuery, setSearchQuery, activeTab, setActiveTab,
        selectedIds, toggleSelection, selectAll,
        deleteError: (id: string, table: string) => deleteErrorMutation.mutate({ error_id: id, table_name: table }),
        isDeleting: deleteErrorMutation.isPending,
        bulkDelete: () => bulkDeleteMutation.mutate(),
        isBulkDeleting: bulkDeleteMutation.isPending,
        autoBalance: (id: string, diff: number) => autoBalanceMutation.mutate({ header_id: id, diff_amount: diff }),
        exportToExcel, refetch
    };
}