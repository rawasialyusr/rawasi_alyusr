"use client";
import { useState, useMemo, useCallback, useDeferredValue } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';
import { resolvePartnerId } from '@/lib/accounting';

export function useViolationsLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const [globalSearch, setGlobalSearch] = useState('');
    const deferredSearch = useDeferredValue(globalSearch); 
    const [filterStatus, setFilterStatus] = useState('الكل');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<any>(null);

    // 📥 1. جلب المخالفات
    const { data: violations = [], isLoading } = useQuery({
        queryKey: ['violations'], 
        queryFn: async () => {
            const { data, error } = await supabase
                .from('violations') 
                .select(`
                    *,
                    partner:partners!partner_id(partner_type, name),
                    project:projects!project_id(Property)
                `)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    // 🔍 2. التصفية والحسابات
    const { displayedViolations, totalSum, totalCount } = useMemo(() => {
        let result = violations;
        if (filterStatus !== 'الكل') {
            result = result.filter(v => v.is_posted === (filterStatus === 'مرحل'));
        }
        if (deferredSearch) {
            const lower = deferredSearch.toLowerCase();
            result = result.filter(v => 
                (v.emp_name?.toLowerCase().includes(lower)) ||
                (v.partner?.name?.toLowerCase().includes(lower)) ||
                (v.reason?.toLowerCase().includes(lower))
            );
        }
        const sum = result.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        return { displayedViolations: result, totalSum: sum, totalCount: result.length };
    }, [violations, deferredSearch, filterStatus]);

    // 🚀 3. محرك الترحيل المحاسبي الذكي (البحث بالكود المحاسبي)
    const postMutation = useMutation({
        mutationFn: async () => {
            // جلب الـ UUID الخاص بالحسابات المطلوبة باستخدام الكود المحاسبي
            const { data: accounts, error: accError } = await supabase
                .from('accounts')
                .select('id, code')
                .in('code', ['216', '46']);

            if (accError || !accounts || accounts.length < 2) {
                throw new Error('لم يتم العثور على الحسابات #216 أو #46 في شجرة الحسابات. تأكد من وجود الأكواد.');
            }

            const DEBIT_ACC = accounts.find(a => a.code === '216')?.id;
            const CREDIT_ACC = accounts.find(a => a.code === '46')?.id;

            const toPost = violations.filter(v => selectedIds.includes(String(v.id)) && !v.is_posted);

            for (const v of toPost) {
                // درع حماية التكرار[cite: 8]
                const { data: existing } = await supabase.from('journal_headers').select('id').eq('reference_id', String(v.id)).maybeSingle();
                if (existing) continue;

                // إنشاء القيد
                const { data: header, error: hError } = await supabase.from('journal_headers').insert([{
                    entry_date: v.date,
                    description: `قيد غرامة: ${v.emp_name} - ${v.reason}`,
                    reference_id: String(v.id), 
                    status: 'posted'
                }]).select('id').single();

                if (hError) throw hError;

                // توجيه الذمم[cite: 8]
                const lines = [
                    { 
                        header_id: header.id, 
                        account_id: DEBIT_ACC, 
                        partner_id: resolvePartnerId(DEBIT_ACC, v.partner_id),
                        debit: v.amount, credit: 0, notes: v.reason 
                    },
                    { 
                        header_id: header.id, 
                        account_id: CREDIT_ACC, 
                        partner_id: resolvePartnerId(CREDIT_ACC, null), 
                        debit: 0, credit: v.amount, notes: v.reason 
                    }
                ];

                await supabase.from('journal_lines').insert(lines);
                await supabase.from('violations').update({ is_posted: true }).eq('id', v.id);
            }
        },
        onSuccess: () => {
            showToast('تم الترحيل المحاسبي بنجاح ✅', 'success');
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['violations'] });
        },
        onError: (err: any) => showToast(err.message, 'error')
    });

    // ⏪ 4. فك الترحيل
    const unpostMutation = useMutation({
        mutationFn: async () => {
            const toUnpost = violations.filter(v => selectedIds.includes(String(v.id)) && v.is_posted);
            for (const v of toUnpost) {
                await supabase.from('journal_headers').delete().eq('reference_id', String(v.id));
                await supabase.from('violations').update({ is_posted: false }).eq('id', v.id);
            }
        },
        onSuccess: () => {
            showToast('تم فك الترحيل بنجاح ⏪', 'success');
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['violations'] });
        }
    });

    // CRUD
    const saveMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { partner, project, ...cleanPayload } = payload;
            if (cleanPayload.id) {
                await supabase.from('violations').update(cleanPayload).eq('id', cleanPayload.id);
            } else {
                await supabase.from('violations').insert([cleanPayload]);
            }
        },
        onSuccess: () => {
            showToast('تم الحفظ بنجاح 📝', 'success');
            setIsEditModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['violations'] });
        }
    });

    return {
        data: displayedViolations,
        isLoading,
        totals: { totalSum, totalCount },
        actions: {
            setGlobalSearch,
            setFilterStatus,
            setSelectedIds,
            handleEdit: (record: any = null) => {
                if (record) setEditingRecord(record);
                else setEditingRecord({ date: new Date().toISOString().split('T')[0], emp_name: '', amount: 0 });
                setIsEditModalOpen(true);
            },
            handleSave: () => saveMutation.mutate(editingRecord),
            handlePost: () => postMutation.mutate(),
            handleUnpost: () => unpostMutation.mutate(),
            handleDelete: async () => {
                if (confirm('حذف؟')) {
                    await supabase.from('violations').delete().in('id', selectedIds);
                    queryClient.invalidateQueries({ queryKey: ['violations'] });
                    setSelectedIds([]);
                }
            },
            handleEmployeeSelect: (v: any) => setEditingRecord({ ...editingRecord, emp_name: v?.name || v, partner_id: v?.id || null, profession: v?.partner_type || '' })
        },
        state: { selectedIds, filterStatus, isEditModalOpen, editingRecord, setIsEditModalOpen, setEditingRecord }
    };
}