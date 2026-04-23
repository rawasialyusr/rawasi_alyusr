"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { fetchAllSupabaseData, formatCurrency, formatDate } from '@/lib/helpers'; 
// 🚀 استدعاء الألرت العالمي من المكان اللي حفظته فيه (عدل المسار لو مختلف)
import { useToast } from '@/lib/toast-context'; 

export function useLaborLogsLogic() {
    const [logs, setLogs] = useState<any[]>([]);
    const [partners, setPartners] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // 🌟 سحب دالة الألرت من المزود العالمي (بدون أي State محلية)
    const { showToast } = useToast();

    const [searchTerm, setSearchTerm] = useState(''); 
    const [filterStatus, setFilterStatus] = useState('الكل');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [stats, setStats] = useState({ sum: 0, attendance: 0, count: 0 });

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const DEBIT_ACCOUNT_ID = '70d181ba-6385-4c1e-b0fc-d5b1f800dd2c'; 
    const CREDIT_ACCOUNT_ID = '39f878cd-dc58-4a2a-a199-50f6fca983d4'; 

    const defaultLog = { 
        work_date: new Date().toISOString().split('T')[0], 
        sub_contractor: '', worker_name: '', site_ref: '', work_item: '', 
        tareeha: '', productivity: '', completion_percentage: '', 
        daily_wage: '', attendance_value: '1', notes: '',
        credit_account_id: CREDIT_ACCOUNT_ID, credit_account_name: 'رواتب وأجور مستحقة'
    };
    
    const [currentLog, setCurrentLog] = useState<any>(defaultLog);

    // ==========================================
    // 🤖 المحرك الذكي: حساب نسبة الإنجاز تلقائياً
    // ==========================================
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

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const { data: statsData } = await supabase.rpc('get_labor_stats');
            if (statsData) setStats({ sum: statsData[0].total_wage_sum || 0, attendance: statsData[0].total_attendance_sum || 0, count: statsData[0].total_records_count || 0 });

            const { data: pData, error: pError } = await supabase.from('partners').select('id, name, partner_type');
            if (pError) console.error("Partners Fetch Error:", pError);
            if (pData) setPartners(pData);

            const allLogs = await fetchAllSupabaseData(supabase, 'labor_daily_logs');
            if (allLogs) {
                const sortedLogs = allLogs.sort((a: any, b: any) => new Date(b.work_date).getTime() - new Date(a.work_date).getTime());
                setLogs(sortedLogs);
            }
        } catch (error) { 
            console.error("Fetch Error:", error); 
        } finally { 
            setIsLoading(false); 
        }
    };

    useEffect(() => { fetchAllData(); }, []);

    const workersList = useMemo(() => partners.filter(p => p.partner_type === 'عامل يومية' || p.partner_type === 'موظف'), [partners]);
    const sitesList = useMemo(() => partners.filter(p => p.partner_type === 'جهة داخلية' || p.partner_type === 'عميل' || p.partner_type === 'مقاول'), [partners]);

    const allFiltered = useMemo(() => {
        return logs.filter(log => {
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

    const totalPages = Math.ceil(allFiltered.length / rowsPerPage);

    // ==========================================
    // 🛠️ العمليات الأساسية (إضافة / تعديل / حذف)
    // ==========================================
    const handleSaveLog = async () => {
        if (!currentLog.worker_name) {
            showToast('يجب إدخال اسم العامل!', 'error');
            return;
        }

        setIsSaving(true);
        const payload = {
            work_date: currentLog.work_date, 
            sub_contractor: currentLog.sub_contractor || null,
            worker_name: currentLog.worker_name, 
            site_ref: currentLog.site_ref || null,
            work_item: currentLog.work_item || null, 
            tareeha: currentLog.tareeha || null, 
            productivity: currentLog.productivity || null, 
            completion_percentage: currentLog.completion_percentage ? Number(currentLog.completion_percentage) : null, 
            daily_wage: currentLog.daily_wage ? Number(currentLog.daily_wage) : 0,
            attendance_value: currentLog.attendance_value ? Number(currentLog.attendance_value) : 1, 
            notes: currentLog.notes || null,
            credit_account_id: currentLog.credit_account_id || CREDIT_ACCOUNT_ID
        };

        try {
            if (editingId) {
                const { error } = await supabase.from('labor_daily_logs').update(payload).eq('id', editingId);
                if (error) throw error;
                showToast('تم التعديل بنجاح ✨', 'success');
            } else {
                const { error } = await supabase.from('labor_daily_logs').insert([payload]);
                if (error) throw error;
                showToast('تم الحفظ بنجاح 🚀', 'success');
            }
            
            await fetchAllData();
            setIsAddModalOpen(false);
            setEditingId(null);
            setCurrentLog(defaultLog);
        } catch (error: any) {
            showToast(`فشل الحفظ: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (log: any) => {
        setEditingId(log.id);
        setCurrentLog({ ...log });
        setIsAddModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('تأكيد الحذف؟')) return;
        const { error } = await supabase.from('labor_daily_logs').delete().eq('id', id);
        if (error) {
            showToast(`خطأ في الحذف: ${error.message}`, 'error');
        } else {
            showToast('تم الحذف بنجاح 🗑️', 'success');
            fetchAllData();
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`هل أنت متأكد من حذف ${selectedIds.length} سجل نهائياً؟`)) return;

        const { error } = await supabase.from('labor_daily_logs').delete().in('id', selectedIds);
        if (error) {
            showToast(`خطأ في الحذف الجماعي: ${error.message}`, 'error');
        } else {
            showToast('تم الحذف الجماعي بنجاح 🗑️', 'success');
            setSelectedIds([]);
            fetchAllData();
        }
    };

    // ==========================================
    // 🏦 العمليات المحاسبية (ترحيل / تعليق)
    // ==========================================
    const handlePostSingle = async (id: string) => {
        const log = logs.find(l => l.id === id);
        if (!log) return;

        try {
            // 🛡️ حماية ضد التكرار: التأكد إن القيد مش موجود أصلاً
            const { data: existingJournal } = await supabase
                .from('journal_headers')
                .select('id')
                .eq('reference_id', id)
                .maybeSingle();

            if (existingJournal) {
                await supabase.from('labor_daily_logs').update({ is_posted: true }).eq('id', id);
                showToast('تم ترحيل هذه اليومية مسبقاً، تم تصحيح الحالة ✅', 'info');
                fetchAllData();
                return;
            }

            // الترحيل الفعلي
            const amountToPost = parseFloat(log.daily_wage || 0) * parseFloat(log.attendance_value || 1);

            const { data: headerData, error: headerError } = await supabase
                .from('journal_headers')
                .insert([{
                    entry_date: log.work_date,
                    description: `إثبات يومية عمالة: ${log.worker_name} - موقع: ${log.site_ref || 'غير محدد'}`,
                    status: 'posted',
                    reference_id: log.id 
                }])
                .select('id')
                .single();

            if (headerError) {
                showToast(`خطأ في إنشاء رأس القيد: ${headerError.message}`, 'error');
                return;
            }

            const journalLines = [
                {
                    header_id: headerData.id,
                    account_id: DEBIT_ACCOUNT_ID, 
                    debit: amountToPost,
                    credit: 0,
                    notes: `يومية: ${log.worker_name}`
                },
                {
                    header_id: headerData.id,
                    account_id: log.credit_account_id || CREDIT_ACCOUNT_ID, 
                    debit: 0,
                    credit: amountToPost,
                    notes: `يومية: ${log.worker_name}`
                }
            ];

            const { error: linesError } = await supabase.from('journal_lines').insert(journalLines);

            if (linesError) {
                await supabase.from('journal_headers').delete().eq('id', headerData.id);
                showToast(`خطأ في إنشاء تفاصيل القيد: ${linesError.message}`, 'error');
                return;
            }

            const { error: updateError } = await supabase.from('labor_daily_logs').update({ is_posted: true }).eq('id', id);
            if (updateError) throw updateError;

            showToast('تم الترحيل المحاسبي بنجاح ✅', 'success');
            fetchAllData();
        } catch (error: any) {
            showToast(`خطأ غير متوقع: ${error.message}`, 'error');
        }
    };

    const handlePostSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`ترحيل ${selectedIds.length} يومية وإنشاء قيود لها؟`)) return;

        for (const id of selectedIds) {
            await handlePostSingle(id); 
        }
        setSelectedIds([]);
    };

    const handleSuspendSingle = async (id: string) => {
        try {
            const { error: delError } = await supabase.from('journal_headers').delete().eq('reference_id', id);
            if (delError) throw delError;

            const { error: updateError } = await supabase.from('labor_daily_logs').update({ is_posted: false }).eq('id', id);
            if (updateError) throw updateError;

            showToast('تم تعليق الترحيل وإلغاء القيد المحاسبي ⏸️', 'warning');
            fetchAllData();
        } catch (error: any) {
            showToast(`فشل التعليق: ${error.message}`, 'error');
        }
    };

    const handleSuspendSelected = async () => {
        if (selectedIds.length === 0) return;
        for (const id of selectedIds) {
            await handleSuspendSingle(id);
        }
        setSelectedIds([]);
    };

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(allFiltered);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "LaborLogs");
        XLSX.writeFile(wb, "يوميات_العمالة.xlsx");
        showToast('تم تصدير الإكسل 📊', 'success');
    };

    const getAttendanceStyle = (status: string) => {
        if (!status) return { bg: '#f1f5f9', color: '#64748b' };
        if (status.includes('1') || status.includes('حاضر')) return { bg: '#dcfce7', color: '#166534' };
        if (status.includes('0') || status.includes('غائب')) return { bg: '#ffe4e6', color: '#be123c' };
        return { bg: '#fef3c7', color: '#b45309' }; 
    };

    const toggleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? allFiltered.map(r => r.id) : []);
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    // 💡 لاحظ هنا: شيلنا الـ toast من הـ return لأن الواجهة مش هترسمه محلياً خلاص
    return {
        isLoading, 
        searchTerm, setSearchTerm, filterStatus, setFilterStatus, dateFrom, setDateFrom,
        filteredLogs: paginatedLogs, stats, totalResults: allFiltered.length,
        selectedIds, setSelectedIds, currentPage, setCurrentPage, rowsPerPage, setRowsPerPage, totalPages, 
        isAddModalOpen, setIsAddModalOpen, currentLog, setCurrentLog, isSaving, editingId, setEditingId, defaultLog,
        workersList, sitesList,
        handleSaveLog, handleEdit, handleDelete, handleDeleteSelected, 
        handlePostSingle, handlePostSelected, handleSuspendSingle, handleSuspendSelected, exportToExcel,
        getAttendanceStyle, toggleSelectAll, toggleSelect, formatCurrency, formatDate, refreshData: fetchAllData
    };
}