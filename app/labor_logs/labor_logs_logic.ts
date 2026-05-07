"use client";
import { useState, useMemo, useEffect } from 'react'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { fetchAllSupabaseData, formatCurrency, formatDate } from '@/lib/helpers'; 
import { useToast } from '@/lib/toast-context'; 

export function useLaborLogsLogic() {
    const queryClient = useQueryClient(); 
    const { showToast } = useToast();

    // 🎯 دالة سحرية مساعدة: لتحديث سطر في الكاش بدقة شديدة بدون مسح باقي البيانات
    const updateRowsInCache = (targetIds: any[], updatedFields: any) => {
        queryClient.setQueryData(['labor_logs'], (oldData: any[]) => {
            if (!oldData) return [];
            const stringIds = targetIds.map(String);
            return oldData.map(row => 
                stringIds.includes(String(row.id)) 
                    ? { ...row, ...updatedFields } 
                    : row 
            );
        });
    };

    // 💎 الحسابات الثابتة حسب الميثاق
    const DEBIT_ACCOUNT_ID = '70d181ba-6385-4c1e-b0fc-d5b1f800dd2c'; 
    const CREDIT_ACCOUNT_ID = '39f878cd-dc58-4a2a-a199-50f6fca983d4'; 

    const [searchTerm, setSearchTerm] = useState(''); 
    const [filterStatus, setFilterStatus] = useState('الكل');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const defaultLog = { 
        work_date: new Date().toISOString().split('T')[0], 
        sub_contractor: '', worker_name: '', site_ref: '', work_item: '', 
        unit: '', skill_level: '', production_desc: '', 
        tareeha: '', productivity: '', completion_percentage: '', 
        daily_wage: '', attendance_value: '1', notes: '',
        worker_partner_id: '', project_id: '',
        credit_account_id: CREDIT_ACCOUNT_ID, credit_account_name: 'رواتب وأجور مستحقة'
    };
    
    const [currentLog, setCurrentLog] = useState<any>(defaultLog);

    // 🚀 سحب البيانات مرة واحدة مع حفظها في الكاش لمدة 5 دقائق
    const { data: logs = [], isLoading: isLogsLoading } = useQuery({
        queryKey: ['labor_logs'],
        queryFn: () => fetchAllSupabaseData(supabase, 'labor_daily_logs'),
        staleTime: 1000 * 60 * 5, 
    });

    const { data: partners = [], isLoading: isPartnersLoading } = useQuery({
        queryKey: ['partners'],
        queryFn: () => fetchAllSupabaseData(supabase, 'partners'),
        staleTime: 1000 * 60 * 60, 
    });

    const stats = useMemo(() => {
        if (!logs || logs.length === 0) return { sum: 0, attendance: 0, count: 0 };
        const sum = logs.reduce((acc: number, row: any) => acc + Number(row.daily_wage || 0), 0);
        const attendance = logs.reduce((acc: number, row: any) => acc + Number(row.attendance_value || 0), 0);
        return { sum, attendance, count: logs.length };
    }, [logs]);

    const workersList = useMemo(() => partners.filter((p: any) => p.partner_type === 'عامل يومية' || p.partner_type === 'موظف'), [partners]);
    const sitesList = useMemo(() => partners.filter((p: any) => p.partner_type === 'جهة داخلية' || p.partner_type === 'عميل' || p.partner_type === 'مقاول'), [partners]);

    useEffect(() => {
        if (!currentLog) return;
        const t = parseFloat(currentLog.tareeha);
        const p = parseFloat(currentLog.productivity);
        if (!isNaN(t) && t > 0 && !isNaN(p)) {
            const percentage = Math.round((p / t) * 100).toString(); 
            if (currentLog.completion_percentage !== percentage) {
                setCurrentLog((prev: any) => ({ ...prev, completion_percentage: percentage }));
            }
        } else if ((!currentLog.productivity || !currentLog.tareeha) && currentLog.completion_percentage !== '') {
            setCurrentLog((prev: any) => ({ ...prev, completion_percentage: '' }));
        }
    }, [currentLog?.tareeha, currentLog?.productivity]);

    const allFiltered = useMemo(() => {
        if (!logs) return [];
        const uniqueLogsMap = new Map();
        logs.forEach((item: any) => {
            if (item && item.id) uniqueLogsMap.set(item.id, item);
        });
        const uniqueLogs = Array.from(uniqueLogsMap.values());

        const sortedLogs = [...uniqueLogs].sort((a: any, b: any) => new Date(b.work_date).getTime() - new Date(a.work_date).getTime());
        return sortedLogs.filter((log: any) => {
            const search = searchTerm.toLowerCase();
            const matchesGlobal = (log.worker_name || '').toLowerCase().includes(search) || (log.site_ref || '').toLowerCase().includes(search) || (log.work_item || '').toLowerCase().includes(search);
            const matchesStatus = filterStatus === 'الكل' || (filterStatus === 'مرحل' && log.is_posted) || (filterStatus === 'معلق' && !log.is_posted);
            
            const logDate = new Date(log.work_date);
            const matchesFrom = dateFrom ? logDate >= new Date(dateFrom) : true;
            const matchesTo = dateTo ? logDate <= new Date(dateTo) : true;

            return matchesGlobal && matchesStatus && matchesFrom && matchesTo;
        });
    }, [logs, searchTerm, filterStatus, dateFrom, dateTo]);

    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return allFiltered.slice(start, start + rowsPerPage);
    }, [allFiltered, currentPage, rowsPerPage]);

    const totalPages = Math.ceil(allFiltered.length / rowsPerPage) || 1;

    // 💾 التحديث الذكي: إرجاع السطر المعدل فقط وإضافته للكاش (بدون ريفرش)
    const saveMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (editingId) {
                const { data, error } = await supabase.from('labor_daily_logs').update(payload).eq('id', editingId).select().single();
                if (error) throw error;
                return { type: 'update', data };
            } else {
                const { data, error } = await supabase.from('labor_daily_logs').insert([payload]).select().single();
                if (error) throw error;
                return { type: 'insert', data };
            }
        },
        onSuccess: (res) => {
            showToast('تم الحفظ بنجاح 🚀', 'success');
            setIsAddModalOpen(false);
            setEditingId(null);
            setCurrentLog(defaultLog);
            
            // 🚀 التحديث اللحظي للكاش (سطر واحد فقط)
            if (res && res.data) {
                queryClient.setQueryData(['labor_logs'], (oldData: any[]) => {
                    if (!oldData) return [res.data];
                    if (res.type === 'update') {
                        return oldData.map(log => String(log.id) === String(res.data.id) ? { ...log, ...res.data } : log);
                    } else {
                        return [res.data, ...oldData];
                    }
                });
            }
        },
        onError: (err: any) => showToast(`فشل الحفظ: ${err.message}`, 'error')
    });

    const handleSaveLog = () => {
        if (!currentLog.worker_name) return showToast('يجب إدخال اسم العامل!', 'error');
        
        const payload = {
            work_date: currentLog.work_date, 
            sub_contractor: currentLog.sub_contractor || null,
            worker_name: currentLog.worker_name, 
            site_ref: currentLog.site_ref || null,
            work_item: currentLog.work_item || null, 
            unit: currentLog.unit || null,                                   
            skill_level: currentLog.skill_level || null,                     
            production_desc: currentLog.production_desc || null,             
            tareeha: currentLog.tareeha || null, 
            productivity: currentLog.productivity || null, 
            completion_percentage: currentLog.completion_percentage ? Number(currentLog.completion_percentage) : null, 
            daily_wage: Number(currentLog.daily_wage) || 0,
            attendance_value: Number(currentLog.attendance_value) || 1, 
            notes: currentLog.notes || null,
            worker_partner_id: currentLog.worker_partner_id || null,
            project_id: currentLog.project_id || null,
            credit_account_id: CREDIT_ACCOUNT_ID,
            debit_account_id: DEBIT_ACCOUNT_ID
        };
        saveMutation.mutate(payload);
    };

    // 🗑️ الحذف اللحظي (إزالة السطر من الكاش فوراً)
    const deleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase.from('labor_daily_logs').delete().in('id', ids);
            if (error) throw error;
            return ids; // تمرير الـ IDs لدالة onSuccess
        },
        onSuccess: (deletedIds) => {
            showToast('تم الحذف بنجاح 🗑️', 'success');
            setSelectedIds([]);
            
            // 🚀 مسح السطور من الكاش بدون ريفرش
            const stringDeletedIds = deletedIds.map(String);
            queryClient.setQueryData(['labor_logs'], (oldData: any[]) => {
                if (!oldData) return [];
                return oldData.filter(log => !stringDeletedIds.includes(String(log.id)));
            });
        },
        onError: (err: any) => showToast(`خطأ في الحذف: ${err.message}`, 'error')
    });

    // 🚀 الترحيل الذكي والسريع
    const postMutation = useMutation({
        mutationFn: async (idsToPost: string[]) => {
            if (!idsToPost || idsToPost.length === 0) throw new Error('لا يوجد سجلات للترحيل');

            // 1. التحديث اللحظي للواجهة 
            updateRowsInCache(idsToPost, { is_posted: true });

            // 2. إرسال أمر الترحيل للداتا بيز
            const { error } = await supabase.rpc('post_labor_logs_bulk', { p_ids: idsToPost });
            if (error) throw error;
        },
        onSuccess: () => {
            showToast('تم الترحيل وسماع كشف الحساب بنجاح ✅', 'success');
            setSelectedIds([]);
            // 🛑 ألغينا الـ invalidateQueries عشان الشاشة ماترمش وتعتمد على الكاش اللحظي
        },
        onError: (err: any) => {
            showToast(`فشل الترحيل: ${err.message}`, 'error');
            queryClient.invalidateQueries({ queryKey: ['labor_logs'] }); // ريفرش فقط في حالة الخطأ لاسترجاع الحالة الأصلية
        }
    });

    // ⏸️ فك الترحيل الذكي والسريع
    const unpostMutation = useMutation({
        mutationFn: async (idsToSuspend: string[]) => {
            if (!idsToSuspend || idsToSuspend.length === 0) throw new Error('لا يوجد سجلات للتعليق');

            // 1. التحديث اللحظي للواجهة
            updateRowsInCache(idsToSuspend, { is_posted: false });

            // 2. إرسال أمر فك الترحيل للداتا بيز
            const { error } = await supabase.rpc('unpost_labor_logs_bulk', { record_ids: idsToSuspend });
            if (error) throw error;
        },
        onSuccess: () => {
            showToast('تم إلغاء الترحيل وتطهير الحسابات بنجاح ⏸️', 'warning');
            setSelectedIds([]);
            // 🛑 ألغينا الـ invalidateQueries هنا كمان
        },
        onError: (err: any) => {
            showToast(`عذراً: ${err.message}`, 'error');
            queryClient.invalidateQueries({ queryKey: ['labor_logs'] });
        }
    });

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(allFiltered.map(log => ({
            'التاريخ': log.work_date,
            'اسم العامل': log.worker_name,
            'الموقع': log.site_ref || '-',
            'البند': log.work_item || '-',
            'الوحدة': log.unit || '-',
            'مستوى المهارة': log.skill_level || '-',
            'الطريحة': log.tareeha || '-',
            'الإنتاجية': log.productivity || '-',
            'الإنجاز': log.completion_percentage ? `${log.completion_percentage}%` : '-',
            'اليومية': log.daily_wage,
            'الاستحقاق الفعلي': Number(log.daily_wage || 0) * Number(log.attendance_value || 1),
            'الحضور': log.attendance_value === 1 ? 'يوم كامل' : log.attendance_value === 0.5 ? 'نصف يوم' : 'غياب',
            'المقاول': log.sub_contractor || '-',
            'ملاحظات': log.notes || '-',
            'الحالة': log.is_posted ? 'مرحل' : 'معلق'
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "يوميات_العمالة");
        XLSX.writeFile(wb, "يوميات_العمالة.xlsx");
        showToast('تم تصدير الإكسل 📊', 'success');
    };

    const getAttendanceStyle = (status: string) => {
        if (!status) return { bg: '#f1f5f9', color: '#64748b' };
        if (status.includes('1') || status.includes('حاضر')) return { bg: '#dcfce7', color: '#166534' };
        if (status.includes('0') || status.includes('غائب')) return { bg: '#ffe4e6', color: '#be123c' };
        return { bg: '#fef3c7', color: '#b45309' }; 
    };

    const toggleSelectAll = (checked: boolean) => setSelectedIds(checked ? allFiltered.map((r:any) => r.id) : []);
    const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    return {
        isLoading: isLogsLoading || isPartnersLoading, 
        searchTerm, setSearchTerm, filterStatus, setFilterStatus, dateFrom, setDateFrom, dateTo, setDateTo,
        filteredLogs: paginatedLogs, stats, totalResults: allFiltered.length,
        selectedIds, setSelectedIds, currentPage, setCurrentPage, rowsPerPage, setRowsPerPage, totalPages, 
        isAddModalOpen, setIsAddModalOpen, currentLog, setCurrentLog, defaultLog,
        isSaving: saveMutation.isPending, 
        isPosting: postMutation.isPending, 
        isSuspending: unpostMutation.isPending, 
        editingId, setEditingId,
        workersList, sitesList,
        handleSaveLog, 
        handleEdit: (log: any) => { setEditingId(log.id); setCurrentLog({ ...log }); setIsAddModalOpen(true); }, 
        handleDelete: (id: string) => { if (confirm('تأكيد الحذف؟')) deleteMutation.mutate([id]); }, 
        handleDeleteSelected: () => { if (confirm(`حذف ${selectedIds.length} سجل نهائياً؟`)) deleteMutation.mutate(selectedIds); }, 
        handlePostSingle: (id: string) => postMutation.mutate([id]), 
        handlePostSelected: () => postMutation.mutate(selectedIds), 
        handleSuspendSingle: (id: string) => unpostMutation.mutate([id]), 
        handleSuspendSelected: () => unpostMutation.mutate(selectedIds), 
        exportToExcel, getAttendanceStyle, toggleSelectAll, toggleSelect, formatCurrency, formatDate
    };
}