"use client";
import { useState, useMemo, useEffect } from 'react'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { fetchAllSupabaseData, formatCurrency, formatDate } from '@/lib/helpers'; 
import { useToast } from '@/lib/toast-context'; 
import { resolvePartnerId } from '@/lib/accounting';

export function useLaborLogsLogic() {
    const queryClient = useQueryClient(); 
    const { showToast } = useToast();

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
        tareeha: '', productivity: '', completion_percentage: '', 
        daily_wage: '', attendance_value: '1', notes: '',
        worker_partner_id: '', project_id: '',
        credit_account_id: CREDIT_ACCOUNT_ID, credit_account_name: 'رواتب وأجور مستحقة'
    };
    
    const [currentLog, setCurrentLog] = useState<any>(defaultLog);

    const { data: logs = [], isLoading: isLogsLoading } = useQuery({
        queryKey: ['labor_logs'],
        queryFn: () => fetchAllSupabaseData(supabase, 'labor_daily_logs')
    });

    const { data: partners = [], isLoading: isPartnersLoading } = useQuery({
        queryKey: ['partners'],
        queryFn: () => fetchAllSupabaseData(supabase, 'partners')
    });

    const { data: statsData = [], isLoading: isStatsLoading } = useQuery({
        queryKey: ['labor_stats'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_labor_stats');
            if (error) console.error(error);
            return data || [];
        }
    });

    const stats = useMemo(() => {
        if (statsData && statsData.length > 0) {
            return { sum: statsData[0].total_wage_sum || 0, attendance: statsData[0].total_attendance_sum || 0, count: statsData[0].total_records_count || 0 };
        }
        return { sum: 0, attendance: 0, count: 0 };
    }, [statsData]);

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

    const saveMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (editingId) {
                const { error } = await supabase.from('labor_daily_logs').update(payload).eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('labor_daily_logs').insert([payload]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            showToast('تم الحفظ بنجاح 🚀', 'success');
            queryClient.invalidateQueries({ queryKey: ['labor_logs'] });
            queryClient.invalidateQueries({ queryKey: ['labor_stats'] });
            setIsAddModalOpen(false);
            setEditingId(null);
            setCurrentLog(defaultLog);
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
            tareeha: currentLog.tareeha || null, 
            productivity: currentLog.productivity || null, 
            completion_percentage: currentLog.completion_percentage ? Number(currentLog.completion_percentage) : null, 
            daily_wage: Number(currentLog.daily_wage) || 0,
            attendance_value: Number(currentLog.attendance_value) || 1, 
            notes: currentLog.notes || null,
            worker_partner_id: currentLog.worker_partner_id || null,
            project_id: currentLog.project_id || null,
            credit_account_id: CREDIT_ACCOUNT_ID 
        };
        saveMutation.mutate(payload);
    };

    const deleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase.from('labor_daily_logs').delete().in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            showToast('تم الحذف بنجاح 🗑️', 'success');
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['labor_logs'] });
            queryClient.invalidateQueries({ queryKey: ['labor_stats'] });
        },
        onError: (err: any) => showToast(`خطأ في الحذف: ${err.message}`, 'error')
    });

    const postMutation = useMutation({
        mutationFn: async (idsToPost: string[]) => {
            const toPost = logs.filter((l: any) => idsToPost.includes(l.id) && !l.is_posted);
            if (toPost.length === 0) throw new Error('NO_UNPOSTED_RECORDS');

            // 💎 منع الـ Timeout والتكرار عن طريق Chunking بـ 10 سجلات في المرة
            const CHUNK_SIZE = 10;
            for (let i = 0; i < toPost.length; i += CHUNK_SIZE) {
                const chunk = toPost.slice(i, i + CHUNK_SIZE);
                for (const log of chunk) {
                    
                    // 🟢 التعديل المطلوب: الاعتماد على قيمة اليومية مباشرة دون ضربها في قيمة الحضور
                    const baseAmount = parseFloat(log.daily_wage || 0);

                    // تخطي القيد إذا كان المبلغ صفر لتجنب قيود صفرية في الميزانية
                    if (baseAmount <= 0) continue; 

                    let safePartnerId = log.worker_partner_id;
                    if (!safePartnerId && log.worker_name) {
                        const matchedWorker = partners.find((p:any) => p.name === log.worker_name);
                        if (matchedWorker) {
                            safePartnerId = matchedWorker.id;
                            await supabase.from('labor_daily_logs').update({ worker_partner_id: safePartnerId }).eq('id', log.id);
                        }
                    }

                    const safeProjectId = log.project_id || null;

                    // 💎 خط الدفاع الأول: التأكد التام من عدم وجود القيد لمنع التكرار نهائياً
                    const { data: checkExisting } = await supabase.from('journal_headers').select('id').eq('reference_id', String(log.id)).maybeSingle();
                    if (checkExisting) {
                        await supabase.from('labor_daily_logs').update({ is_posted: true }).eq('id', log.id);
                        continue; 
                    }

                    const { data: headerData, error: headerError } = await supabase
                        .from('journal_headers')
                        .insert([{
                            entry_date: log.work_date,
                            description: `إثبات استحقاق يومية: ${log.worker_name} - موقع: ${log.site_ref || 'غير محدد'}`,
                            status: 'posted',
                            reference_id: String(log.id) 
                        }])
                        .select('id').single();

                    if (headerError) throw headerError;

                    const journalLines: any[] = [
                        {
                            header_id: headerData.id,
                            account_id: DEBIT_ACCOUNT_ID, 
                            debit: baseAmount,
                            credit: 0,
                            partner_id: null, 
                            project_id: safeProjectId,
                            notes: `مصروف يومية: ${log.worker_name} (حضور: ${log.attendance_value})`
                        },
                        {
                            header_id: headerData.id,
                            account_id: CREDIT_ACCOUNT_ID, 
                            debit: 0,
                            credit: baseAmount,
                            partner_id: safePartnerId, 
                            project_id: safeProjectId,
                            notes: `استحقاق يومية: ${log.worker_name}`
                        }
                    ];

                    const { error: linesError } = await supabase.from('journal_lines').insert(journalLines);
                    if (linesError) {
                        await supabase.from('journal_headers').delete().eq('id', headerData.id); 
                        throw linesError;
                    }
                    // تحديث الحالة فوراً لكل قيد ينجح
                    await supabase.from('labor_daily_logs').update({ is_posted: true }).eq('id', log.id);
                }
            }
        },
        onSuccess: () => {
            showToast('تم الترحيل وسماع كشف الحساب بنجاح ✅', 'success');
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['labor_logs'] });
        },
        onError: (err: any) => {
            if (err.message !== 'NO_UNPOSTED_RECORDS') showToast(`فشل الترحيل: ${err.message}`, 'error');
        }
    });

    // 💎 المسح المتسلسل الذكي (Deep Cascade Unposting - V11 Diamond Edition)
    const unpostMutation = useMutation({
        mutationFn: async (idsToSuspend: string[]) => {
            const stringIds = idsToSuspend.map(id => String(id));
            
            // 🛡️ تقسيم العمليات (Chunking) لحماية الرابط من الانهيار وتجنب خطأ 400
            const CHUNK_SIZE = 50; 
            for (let i = 0; i < stringIds.length; i += CHUNK_SIZE) {
                const chunk = stringIds.slice(i, i + CHUNK_SIZE);
                
                // 1️⃣ سحب رؤوس القيود المرتبطة باليوميات المختارة
                const { data: headers, error: headersErr } = await supabase
                    .from('journal_headers')
                    .select('id, reference_id, entry_date, description')
                    .in('reference_id', chunk);

                if (headersErr) throw new Error("فشل في الوصول للقيود المحاسبية المرتبطة.");

                if (headers && headers.length > 0) {
                    const headerIds = headers.map(h => h.id);
                    
                    // 2️⃣ تنفيذ الباب الثاني: مسح سطور القيود أولاً (النزاهة المالية)
                    const { error: linesDelErr } = await supabase
                        .from('journal_lines')
                        .delete()
                        .in('header_id', headerIds);
                    if (linesDelErr) throw new Error("فشل في تطهير سطور الأستاذ المساعد.");

                    // 3️⃣ مسح رؤوس القيود
                    const { error: headersDelErr } = await supabase
                        .from('journal_headers')
                        .delete()
                        .in('id', headerIds);
                    if (headersDelErr) throw new Error("فشل في مسح رؤوس القيود المحاسبية.");
                }

                // 4️⃣ تحديث حالة اليومية إلى "معلق" (is_posted = false) لفتحها للتعديل مجدداً
                const { error: updateErr } = await supabase
                    .from('labor_daily_logs')
                    .update({ is_posted: false })
                    .in('id', chunk);
                
                if (updateErr) throw new Error("تم مسح القيود ولكن فشل تحديث حالة السجل الأصلي.");
            }
        },
        onSuccess: () => {
            showToast('تم إلغاء الترحيل وتطهير الحسابات بنجاح ⏸️', 'warning');
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['labor_logs'] });
            queryClient.invalidateQueries({ queryKey: ['labor_stats'] }); // تحديث الإحصائيات فوراً
        },
        onError: (err: any) => showToast(`عذراً: ${err.message}`, 'error')
    });

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

    const toggleSelectAll = (checked: boolean) => setSelectedIds(checked ? allFiltered.map((r:any) => r.id) : []);
    const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    return {
        isLoading: isLogsLoading || isPartnersLoading || isStatsLoading, 
        searchTerm, setSearchTerm, filterStatus, setFilterStatus, dateFrom, setDateFrom, dateTo, setDateTo,
        filteredLogs: paginatedLogs, stats, totalResults: allFiltered.length,
        selectedIds, setSelectedIds, currentPage, setCurrentPage, rowsPerPage, setRowsPerPage, totalPages, 
        isAddModalOpen, setIsAddModalOpen, currentLog, setCurrentLog, defaultLog,
        isSaving: saveMutation.isPending, 
        isPosting: postMutation.isPending, // 💎 حالة الترحيل لإغلاق الزر في الواجهة
        isSuspending: unpostMutation.isPending, // 💎 حالة التعليق لإغلاق الزر
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