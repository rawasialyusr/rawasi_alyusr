"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { fetchAllSupabaseData } from '@/lib/helpers'; // 👈 استيراد دالة كسر حاجز الـ 1000 صف

export function useLaborLogsLogic() {
    const [logs, setLogs] = useState<any[]>([]);
    const [partners, setPartners] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // حالات البحث والفلترة
    const [searchTerm, setSearchTerm] = useState(''); 
    const [filterStatus, setFilterStatus] = useState('الكل');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // حالات التحديد والصفحات
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [stats, setStats] = useState({ sum: 0, attendance: 0, count: 0 });

    // حالات النافذة المنبثقة (المودال)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const defaultLog = { work_date: new Date().toISOString().split('T')[0], sub_contractor: '', worker_name: '', site_ref: '', work_item: '', daily_wage: '', attendance_value: '1', notes: '' };
    const [currentLog, setCurrentLog] = useState<any>(defaultLog);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            // جلب الإحصائيات
            const { data: statsData } = await supabase.rpc('get_labor_stats');
            if (statsData) setStats({ sum: statsData[0].total_wage_sum || 0, attendance: statsData[0].total_attendance_sum || 0, count: statsData[0].total_records_count || 0 });

            // جلب الشركاء
            const { data: pData } = await supabase.from('partners').select('id, name, type');
            if (pData) setPartners(pData);

            // 🚀 التحديث هنا: استخدام الهيلبر لجلب كل الصفوف (10,000 أو أكثر)
            const allLogs = await fetchAllSupabaseData(supabase, 'labor_daily_logs');
            
            if (allLogs) {
                // ترتيب البيانات تنازلياً حسب التاريخ عشان أحدث يومية تظهر فوق
                const sortedLogs = allLogs.sort((a: any, b: any) => 
                    new Date(b.work_date).getTime() - new Date(a.work_date).getTime()
                );
                setLogs(sortedLogs);
            }

        } catch (error) { 
            console.error("Error fetching all logs:", error); 
        } finally { 
            setIsLoading(false); 
        }
    };

    useEffect(() => { fetchAllData(); }, []);

    // القوائم المربوطة
    const workersList = useMemo(() => partners.filter(p => p.type === 'عامل يومية' || p.type === 'موظف'), [partners]);
    const sitesList = useMemo(() => partners.filter(p => p.type === 'جهة داخلية' || p.type === 'عميل' || p.type === 'مقاول'), [partners]);

    // محرك الفلترة الذكي
    const allFiltered = useMemo(() => {
        return logs.filter(log => {
            const search = searchTerm.toLowerCase();
            const matchesGlobal = (log.worker_name || '').toLowerCase().includes(search) || (log.site_ref || '').toLowerCase().includes(search) || (log.work_item || '').toLowerCase().includes(search);
            const matchesStatus = filterStatus === 'الكل' || (filterStatus === 'مرحل' && log.is_posted) || (filterStatus === 'معلق' && !log.is_posted);
            return matchesGlobal && matchesStatus;
        });
    }, [logs, searchTerm, filterStatus]);

    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return allFiltered.slice(start, start + rowsPerPage);
    }, [allFiltered, currentPage, rowsPerPage]);

    const totalPages = Math.ceil(allFiltered.length / rowsPerPage);

    // العمليات (CRUD)
    const handleSaveLog = async () => {
        setIsSaving(true);
        const payload = {
            work_date: currentLog.work_date, sub_contractor: currentLog.sub_contractor,
            worker_name: currentLog.worker_name, site_ref: currentLog.site_ref,
            work_item: currentLog.work_item, daily_wage: currentLog.daily_wage,
            attendance_value: currentLog.attendance_value, notes: currentLog.notes
        };

        if (editingId) {
            await supabase.from('labor_daily_logs').update(payload).eq('id', editingId);
        } else {
            await supabase.from('labor_daily_logs').insert([payload]);
        }
        
        await fetchAllData();
        setIsAddModalOpen(false);
        setEditingId(null);
        setCurrentLog(defaultLog);
        setIsSaving(false);
    };

    const handleEdit = (log: any) => {
        setEditingId(log.id);
        setCurrentLog({ ...log });
        setIsAddModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('تأكيد الحذف؟')) return;
        await supabase.from('labor_daily_logs').delete().eq('id', id);
        fetchAllData();
    };

    const handlePostSingle = async (id: string) => {
        await supabase.from('labor_daily_logs').update({ is_posted: true }).eq('id', id);
        fetchAllData();
    };

    const handlePostSelected = async () => {
        await supabase.from('labor_daily_logs').update({ is_posted: true }).in('id', selectedIds);
        setSelectedIds([]);
        fetchAllData();
    };

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(allFiltered);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "LaborLogs");
        XLSX.writeFile(wb, "يوميات_العمالة.xlsx");
    };

    return {
        isLoading, searchTerm, setSearchTerm, filterStatus, setFilterStatus,
        filteredLogs: paginatedLogs, stats, selectedIds, setSelectedIds,
        currentPage, setCurrentPage, rowsPerPage, setRowsPerPage, totalPages, totalResults: allFiltered.length,
        isAddModalOpen, setIsAddModalOpen, currentLog, setCurrentLog, isSaving, handleSaveLog,
        handleEdit, handleDelete, handlePostSingle, handlePostSelected, exportToExcel, editingId, setEditingId, defaultLog,
        workersList, sitesList
    };
}