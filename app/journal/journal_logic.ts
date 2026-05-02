"use client";
import { useState, useMemo, useCallback, useDeferredValue } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';

/**
 * العقل المدبر لدفتر اليومية الشامل - رواسي V11
 * مطابق للباب الأول (تجريد المخرجات) والباب العاشر (لا وجود لحلقات تكرارية في الواجهة)
 */
export function useJournalLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // 1. إدارة الحالة (State Management)
    const [globalSearch, setGlobalSearch] = useState('');
    const deferredSearch = useDeferredValue(globalSearch); // منع اختناق الـ DOM أثناء البحث السريع
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterAccountId, setFilterAccountId] = useState<string | null>(null);
    const [filterPartnerId, setFilterPartnerId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState('الكل'); 
    const [fetchLimit, setFetchLimit] = useState<number>(100); // حماية الذاكرة من البيانات الضخمة
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // 📥 2. محرك جلب البيانات (React Query - Offline First)
    const { data: journalMaster = [], isLoading, isError } = useQuery({
        queryKey: ['journal_master_view', dateFrom, dateTo, filterAccountId, filterPartnerId, fetchLimit], 
        queryFn: async () => {
            let query = supabase
                .from('journal_master_view') 
                .select('*')
                .order('entry_date', { ascending: false })
                .order('line_created_at', { ascending: false })
                .limit(fetchLimit); // السحب الذكي المحدود
            
            if (dateFrom) query = query.gte('entry_date', dateFrom);
            if (dateTo) query = query.lte('entry_date', dateTo);
            if (filterAccountId) query = query.eq('account_id', filterAccountId);
            if (filterPartnerId) query = query.eq('partner_id', filterPartnerId);

            const { data, error } = await query;
            if (error) throw new Error(error.message);
            return data || [];
        },
        staleTime: 60 * 1000 
    });

    // 🔍 3. التصفية المتقدمة (Logic Filtering - حصراً داخل useMemo)
    const displayedLines = useMemo(() => {
        if (!journalMaster || journalMaster.length === 0) return [];
        let result = journalMaster;

        if (filterStatus !== 'الكل') {
            const targetStatus = filterStatus === 'مرحل' ? 'posted' : 'draft';
            result = result.filter(r => r.header_status === targetStatus);
        }

        if (deferredSearch) {
            const lower = deferredSearch.toLowerCase();
            result = result.filter(r => 
                (r.line_notes && String(r.line_notes).toLowerCase().includes(lower)) ||
                (r.header_description && String(r.header_description).toLowerCase().includes(lower)) ||
                (r.reference_id && String(r.reference_id).toLowerCase().includes(lower)) ||
                (r.account_name && String(r.account_name).toLowerCase().includes(lower)) ||
                (r.partner_name && String(r.partner_name).toLowerCase().includes(lower)) ||
                (r.project_name && String(r.project_name).toLowerCase().includes(lower))
            );
        }
        return result;
    }, [journalMaster, deferredSearch, filterStatus]);

    // 🧮 4. محرك الحسابات المالية (مدرع ضد الـ NaN والنصوص)
    const totals = useMemo(() => {
        let totalDebit = 0;
        let totalCredit = 0;
        
        displayedLines.forEach(line => {
            const safeDebit = parseFloat(String(line.debit || 0).replace(/,/g, ''));
            const safeCredit = parseFloat(String(line.credit || 0).replace(/,/g, ''));
            
            totalDebit += isNaN(safeDebit) ? 0 : safeDebit;
            totalCredit += isNaN(safeCredit) ? 0 : safeCredit;
        });
        
        return { 
            totalDebit, 
            totalCredit, 
            balance: totalDebit - totalCredit, 
            count: displayedLines.length 
        };
    }, [displayedLines]);

    // 🚀 5. محرك الحذف المجمع (Bulk Delete - متوافق مع الباب العاشر)
    // يُمنع استخدام Loops، يتم تنفيذ العملية بـ Query واحد فقط للسرعة الفائقة
    const deleteHeadersMutation = useMutation({
        mutationFn: async () => {
            const selectedLines = journalMaster.filter(l => selectedIds.includes(String(l.line_id)));
            // استخراج رؤوس القيود الفريدة (Unique Header IDs)
            const headerIds = [...new Set(selectedLines.map(l => l.header_id))];

            if (headerIds.length === 0) throw new Error('لم يتم تحديد أي قيود صالحة.');

            // ⚡ طلبة واحدة (Single Bulk Request) تمسح كل القيود المحددة في جزء من الثانية
            const { error } = await supabase.from('journal_headers').delete().in('id', headerIds);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            showToast('تم حذف القيود وارتباطاتها بنجاح 🗑️', 'success');
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['journal_master_view'] });
        },
        onError: (err: any) => showToast(`فشل الحذف: ${err.message}`, 'error')
    });

    const handleDeleteHeaders = useCallback(() => {
        if (confirm('تنبيه: سيتم حذف القيود المحددة بالكامل (مدين ودائن). هل أنت متأكد؟')) {
            deleteHeadersMutation.mutate();
        }
    }, [deleteHeadersMutation]);

    // 💎 6. تجريد المخرجات (Pure Return - الباب الأول)
    return {
        data: displayedLines,
        isLoading,
        isError,
        totals,
        state: {
            globalSearch,
            dateFrom,
            dateTo,
            filterAccountId,
            filterPartnerId,
            filterStatus,
            fetchLimit,
            selectedIds
        },
        actions: {
            setGlobalSearch,
            setDateFrom,
            setDateTo,
            setFilterAccountId,
            setFilterPartnerId,
            setFilterStatus,
            setFetchLimit,
            setSelectedIds,
            handleDeleteHeaders
        }
    };
}