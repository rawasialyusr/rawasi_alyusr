"use client";
import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useToast } from '@/lib/toast-context'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 

export function useJobOrdersLogic() {
    const { showToast } = useToast(); 
    const queryClient = useQueryClient();
    
    // ================= State Management =================
    const [globalSearch, setGlobalSearch] = useState('');
    const deferredSearch = useDeferredValue(globalSearch); 
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<any>({});
    
    // 🚀 حالات المودال الجديد (دفتر الأستاذ التحليلي)
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [ledgerRecord, setLedgerRecord] = useState<any>(null);

    // ================= Fetching Data (React Query) =================
    
    // 1. جلب البيانات الأساسية 
    const { data: baseJobOrders = [], isLoading: isJoLoading } = useQuery({
        queryKey: ['job_orders'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('job_orders')
                // 🚀 الحل السحري هنا: توجيه الـ Supabase صراحة لاسم القيد عشان نتخطى مشكلة الكاش والتضارب
                .select('*, projects:project_id(project_name), partners!job_orders_contractor_id_fkey(name), boq_budget:boq_budget_id(work_item, budget_code, Property)')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error("Error fetching job orders:", error);
                throw error;
            }
            return data || [];
        }
    });

    // 2. جلب الأداء المالي
    const { data: joPerformance = [], isLoading: isPerfLoading } = useQuery({
        queryKey: ['job_order_performance'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('job_order_performance')
                .select('*');
            
            if (error) {
                console.error("Error fetching performance:", error);
                throw error;
            }
            return data || [];
        }
    });

    const { data: projects = [], isLoading: isProjLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const { data, error } = await supabase.from('projects').select('id, project_name');
            if (error) throw error;
            return data || [];
        }
    });

    // ================= Data Merging & Filtering =================
    
    const mergedJobOrders = useMemo(() => {
        if (!baseJobOrders.length) return [];
        return baseJobOrders.map(jo => {
            const perf = joPerformance.find((p: any) => p.job_order_id === jo.id) || {};
            return { ...jo, ...perf }; 
        });
    }, [baseJobOrders, joPerformance]);

    const allFiltered = useMemo(() => {
        if (!mergedJobOrders) return [];
        return mergedJobOrders.filter((jo: any) => {
            const searchLower = String(deferredSearch || '').toLowerCase();
            
            const orderNum = String(jo.order_number || '').toLowerCase();
            const projName = String(jo.projects?.project_name || '').toLowerCase();
            const partnerName = String(jo.partners?.name || '').toLowerCase();
            const propName = String(jo.boq_budget?.Property || '').toLowerCase();
            const combName = String(jo.job_order_name || '').toLowerCase();

            const matchesSearch = 
                orderNum.includes(searchLower) || 
                projName.includes(searchLower) ||
                partnerName.includes(searchLower) ||
                propName.includes(searchLower) ||
                combName.includes(searchLower);
            
            let matchesDate = true;
            const joDate = jo.start_date || jo.created_at ? new Date(jo.start_date || jo.created_at) : null;
            if (joDate) {
                if (dateFrom) matchesDate = matchesDate && joDate >= new Date(dateFrom);
                if (dateTo) matchesDate = matchesDate && joDate <= new Date(dateTo);
            }
            return matchesSearch && matchesDate;
        });
    }, [mergedJobOrders, deferredSearch, dateFrom, dateTo]);

    const paginatedJobOrders = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return allFiltered.slice(start, start + rowsPerPage);
    }, [allFiltered, currentPage, rowsPerPage]);

    const kpis = useMemo(() => ({
        total: allFiltered.length,
        completed: allFiltered.filter((i: any) => i.status === 'مكتمل').length,
        running: allFiltered.filter((i: any) => i.status === 'جاري التنفيذ').length,
        suspended: allFiltered.filter((i: any) => i.status === 'موقوف').length
    }), [allFiltered]);

    // ================= Handlers =================
    const handleAddNew = () => { 
        setCurrentRecord({ 
            executor_type: 'تنفيذ ذاتي',
            status: 'مسودة', 
            start_date: new Date().toISOString().split('T')[0] 
        }); 
        setIsEditModalOpen(true); 
    };

    const handleEdit = (jo: any) => {
        setCurrentRecord({ ...jo, client_name: jo.partners?.name || '' });
        setIsEditModalOpen(true);
    };

    // ================= Mutations =================
    const saveMutation = useMutation({
        mutationFn: async (record: any) => {
            const qty = Number(record.assigned_qty) || 0;
            const price = Number(record.unit_price) || 0;

            if (qty <= 0) throw new Error("عفواً، الكمية المسندة يجب أن تكون أكبر من صفر ⚠️");
            if (price < 0) throw new Error("عفواً، سعر الوحدة لا يمكن أن يكون قيمة سالبة ⚠️");
            if (record.executor_type === 'مقاول باطن' && !record.contractor_id) {
                throw new Error("عفواً، يجب اختيار اسم مقاول الباطن لإتمام الأمر ⚠️");
            }

            const cleanId = (id: any) => (id && typeof id === 'string' && id.trim() !== '') ? id : null;
            const uniqueOrderNumber = record.order_number || `JO-${Math.floor(Date.now() / 1000)}`;

            const payload = {
                order_number: uniqueOrderNumber,
                project_id: cleanId(record.project_id),
                boq_budget_id: cleanId(record.boq_budget_id),
                executor_type: record.executor_type || 'تنفيذ ذاتي',
                contractor_id: record.executor_type === 'مقاول باطن' ? cleanId(record.contractor_id) : null,
                assigned_qty: qty,
                unit_price: price,
                status: record.status || 'مسودة',
                start_date: record.start_date || new Date().toISOString().split('T')[0],
                end_date: record.end_date || null,
                notes: record.notes
            };

            if (record.id) {
                const { error } = await supabase.from('job_orders').update(payload).eq('id', record.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('job_orders').insert([payload]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            setIsEditModalOpen(false);
            showToast("تم حفظ أمر التشغيل بنجاح 💾", "success");
            queryClient.invalidateQueries({ queryKey: ['job_orders'] });
            queryClient.invalidateQueries({ queryKey: ['job_order_performance'] });
        },
        onError: (err: any) => showToast(`${err.message}`, "error")
    });

    const changeStatusMutation = useMutation({
        mutationFn: async (newStatus: string) => {
            if (!selectedIds.length) return;
            const { error } = await supabase.from('job_orders').update({ status: newStatus }).in('id', selectedIds);
            if (error) throw error;
        },
        onSuccess: (_, newStatus) => {
            showToast(`تم تغيير الحالة إلى ${newStatus} بنجاح ✅`, "success");
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['job_orders'] });
        },
        onError: (err: any) => showToast(`خطأ في تحديث الحالة: ${err.message}`, "error")
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!selectedIds.length) return;
            const { error } = await supabase.from('job_orders').delete().in('id', selectedIds);
            if (error) throw error;
        },
        onSuccess: () => {
            showToast("تم حذف أوامر التشغيل المحددة نهائياً 🗑️", "success");
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['job_orders'] });
        },
        onError: (err: any) => showToast(`خطأ في الحذف: ${err.message}`, "error")
    });

    const isSaving = saveMutation.isPending || changeStatusMutation.isPending || deleteMutation.isPending;
    const isLoading = isJoLoading || isProjLoading || isPerfLoading || isSaving;

    return {
        jobOrders: paginatedJobOrders,
        allFiltered,
        projects,
        isLoading,
        isSaving,
        globalSearch, setGlobalSearch: (v: string) => { setGlobalSearch(v); setCurrentPage(1); },
        dateFrom, setDateFrom: (v: string) => { setDateFrom(v); setCurrentPage(1); },
        dateTo, setDateTo: (v: string) => { setDateTo(v); setCurrentPage(1); },
        selectedIds, setSelectedIds,
        currentPage, setCurrentPage,
        rowsPerPage, setRowsPerPage: (v: number) => { setRowsPerPage(v); setCurrentPage(1); },
        kpis,
        isEditModalOpen, setIsEditModalOpen,
        currentRecord, setCurrentRecord,
        isLedgerOpen, setIsLedgerOpen,
        ledgerRecord, setLedgerRecord,
        handleAddNew, handleEdit, 
        handleSave: (record: any) => saveMutation.mutate(record),
        handleCompleteSelected: () => changeStatusMutation.mutate('مكتمل'), 
        handleSuspendSelected: () => changeStatusMutation.mutate('موقوف'), 
        handleDeleteSelected: () => {
            if (!selectedIds.length || !confirm("هل أنت متأكد من الحذف النهائي لأوامر التشغيل المحددة؟")) return;
            deleteMutation.mutate();
        }
    };
}