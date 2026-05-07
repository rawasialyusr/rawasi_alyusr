"use client";
import { useState, useMemo, useDeferredValue } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';

export function useViolationsLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // 🎯 دالة سحرية مساعدة لتحديث الكاش لحظياً (Optimistic UI)
    const updateRowsInCache = (targetIds: any[], updatedFields: any) => {
        queryClient.setQueryData(['violations'], (oldData: any[]) => {
            if (!oldData) return [];
            const stringIds = targetIds.map(String);
            return oldData.map(row => 
                stringIds.includes(String(row.id)) ? { ...row, ...updatedFields } : row 
            );
        });
    };

    const [globalSearch, setGlobalSearch] = useState('');
    const deferredSearch = useDeferredValue(globalSearch); 
    const [filterStatus, setFilterStatus] = useState('الكل');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<any>(null);

    // 📥 1. جلب المخالفات
    const { data: violations = [], isLoading: isFetching } = useQuery({
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
            const lower = deferredSearch.toLowerCase().trim();
            result = result.filter(v => 
                (v.emp_name?.toLowerCase().includes(lower)) ||
                (v.partner?.name?.toLowerCase().includes(lower)) ||
                (v.reason?.toLowerCase().includes(lower))
            );
        }
        const sum = result.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        return { displayedViolations: result, totalSum: sum, totalCount: result.length };
    }, [violations, deferredSearch, filterStatus]);

    // 🚀 3. الترحيل المركزي للباك إند
    const postMutation = useMutation({
        mutationFn: async (idsToPost: string[]) => {
            if (!idsToPost || idsToPost.length === 0) throw new Error('لا يوجد سجلات للترحيل');
            
            // 1. أخذ نسخة من الداتا لتأمين التراجع
            const previousData = queryClient.getQueryData(['violations']);
            
            // 2. التحديث اللحظي للواجهة 🚀
            updateRowsInCache(idsToPost, { is_posted: true });

            // 3. نداء الباك إند
            const { error } = await supabase.rpc('post_violations_bulk', { p_ids: idsToPost });
            if (error) {
                queryClient.setQueryData(['violations'], previousData); // التراجع عند الخطأ
                throw error;
            }
        },
        onSuccess: () => {
            showToast('تم الترحيل المحاسبي بنجاح ✅', 'success');
            setSelectedIds([]);
        },
        onError: (err: any) => showToast(`فشل الترحيل: ${err.message}`, 'error')
    });

    // ⏪ 4. فك الترحيل المركزي للباك إند
    const unpostMutation = useMutation({
        mutationFn: async (idsToSuspend: string[]) => {
            if (!idsToSuspend || idsToSuspend.length === 0) throw new Error('لا يوجد سجلات للتعليق');
            
            const previousData = queryClient.getQueryData(['violations']);
            updateRowsInCache(idsToSuspend, { is_posted: false });

            const { error } = await supabase.rpc('unpost_violations_bulk', { record_ids: idsToSuspend });
            if (error) {
                queryClient.setQueryData(['violations'], previousData); 
                throw error;
            }
        },
        onSuccess: () => {
            showToast('تم فك الترحيل وتطهير الحسابات ⏸️', 'warning');
            setSelectedIds([]);
        },
        onError: (err: any) => showToast(`عذراً: ${err.message}`, 'error')
    });

    // 🗑️ الحذف المتسلسل الآمن عبر الباك إند
    const deleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const previousData = queryClient.getQueryData(['violations']);
            const stringDeletedIds = ids.map(String);
            
            // مسح من الشاشة فوراً
            queryClient.setQueryData(['violations'], (oldData: any[]) => {
                if (!oldData) return [];
                return oldData.filter(log => !stringDeletedIds.includes(String(log.id)));
            });

            // مسح من الداتا بيز (ومسح قيود الجورنال المرتبطة)
            const { error } = await supabase.rpc('delete_violations_bulk', { p_ids: ids });
            if (error) {
                queryClient.setQueryData(['violations'], previousData);
                throw error;
            }
            return ids; 
        },
        onSuccess: () => {
            showToast('تم الحذف بنجاح 🗑️', 'success');
            setSelectedIds([]);
        },
        onError: (err: any) => showToast(`خطأ في الحذف: ${err.message}`, 'error')
    });

    // 📝 عمليات الحفظ
    const saveMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { partner, project, ...cleanPayload } = payload;
            if (!cleanPayload.id) cleanPayload.is_posted = false;

            if (cleanPayload.id) {
                const { error } = await supabase.from('violations').update(cleanPayload).eq('id', cleanPayload.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('violations').insert([cleanPayload]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            showToast('تم الحفظ بنجاح 📝', 'success');
            setIsEditModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['violations'] });
        },
        onError: (err: any) => showToast(`خطأ في الحفظ: ${err.message}`, 'error')
    });

    const isTotalLoading = isFetching || saveMutation.isPending || postMutation.isPending || unpostMutation.isPending || deleteMutation.isPending;

    return {
        data: displayedViolations,
        isLoading: isTotalLoading,
        totals: { totalSum, totalCount },
        actions: {
            setGlobalSearch,
            setFilterStatus,
            setSelectedIds,
            handleEdit: (record: any = null) => {
                if (record) setEditingRecord(record);
                else setEditingRecord({ date: new Date().toISOString().split('T')[0], emp_name: '', amount: 0, is_posted: false });
                setIsEditModalOpen(true);
            },
            handleSave: () => saveMutation.mutate(editingRecord),
            
            // 🚀 تمرير الـ selectedIds للدوال المركزية
            handlePost: () => postMutation.mutate(selectedIds),
            handleUnpost: () => unpostMutation.mutate(selectedIds),
            handleDelete: async () => {
                if (confirm('تأكيد الحذف النهائي للسجلات المحددة؟')) {
                    deleteMutation.mutate(selectedIds);
                }
            },
            
            handleEmployeeSelect: (v: any) => setEditingRecord({ ...editingRecord, emp_name: v?.name || v, partner_id: v?.id || null, profession: v?.partner_type || '' })
        },
        state: { selectedIds, filterStatus, isEditModalOpen, editingRecord, setIsEditModalOpen, setEditingRecord }
    };
}