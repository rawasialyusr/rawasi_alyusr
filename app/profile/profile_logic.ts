"use client";
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

export function useProfileLogic() {
    const queryClient = useQueryClient();

    // 🎛️ 1. حالات الواجهة والفلاتر (UI States & Filters)
    const [activeTab, setActiveTab] = useState('tasks');
    const [searchFilters, setSearchFilters] = useState({
        term: '',
        site: 'all',
        category: 'all',
        startDate: '', 
        endDate: ''    
    });

    // 🧠 2. المحرك الأساسي: جلب البيانات الذكي (React Query)
    const { data, isLoading } = useQuery({
        queryKey: ['employeeProfileData'],
        queryFn: async () => {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) throw new Error('غير مسجل الدخول');

            // جلب البروفايل
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

            // جلب المهام والإشعارات والطلبات بالتوازي (Performance Boost)
            const [tasksRes, notesRes, requestsRes] = await Promise.all([
                supabase.from('user_tasks').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
                supabase.from('notifications').select('*').eq('user_id', session.user.id).eq('is_read', false).order('created_at', { ascending: false }),
                supabase.from('user_requests').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })
            ]);

            let partnerData = null;
            let advData = [], dedData = [], logsData = [], payrollData = null;

            // جلب البيانات المالية لو الموظف مربوط بمقاول/شريك
            if (profile?.partner_id) {
                const { data: partner } = await supabase.from('partners').select('*').eq('id', profile.partner_id).single();
                partnerData = partner;

                const [advRes, dedRes, payrollRes, logsRes] = await Promise.all([
                    supabase.from('emp_adv').select('*').eq('partner_id', profile.partner_id).eq('is_deleted', false).order('created_at', { ascending: false }),
                    supabase.from('emp_ded').select('*').eq('partner_id', profile.partner_id).eq('is_deleted', false).order('created_at', { ascending: false }),
                    supabase.from('payroll_slips').select('net_salary').eq('emp_id', profile.partner_id).order('created_at', { ascending: false }).limit(1),
                    supabase.from('labor_daily_logs').select('*').eq('worker_name', partner.name).order('work_date', { ascending: false })
                ]);
                
                advData = advRes.data || [];
                dedData = dedRes.data || [];
                logsData = logsRes.data || [];
                payrollData = payrollRes.data?.[0] || null;
            }

            return {
                profile,
                partnerData,
                tasks: tasksRes.data || [],
                notifications: notesRes.data || [],
                userRequests: requestsRes.data || [],
                recentAdvances: advData,
                recentDeductions: dedData,
                recentLogs: logsData,
                netSalaryThisMonth: payrollData?.net_salary || 0
            };
        }
    });

    // 🛡️ تفريغ البيانات من الكاش بأمان (Bulletproof Fallbacks)
    const userProfile = data?.profile || null;
    const partnerData = data?.partnerData || null;
    const tasks = data?.tasks || [];
    const notifications = data?.notifications || [];
    const userRequests = data?.userRequests || [];
    const recentLogs = data?.recentLogs || [];
    const recentAdvances = data?.recentAdvances || [];
    const recentDeductions = data?.recentDeductions || [];

    // 💰 حساب الإجماليات المالية
    const financials = useMemo(() => ({
        totalAdvances: recentAdvances.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
        totalDeductions: recentDeductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
        netSalaryThisMonth: data?.netSalaryThisMonth || 0
    }), [recentAdvances, recentDeductions, data?.netSalaryThisMonth]);

    // 📅 3. لوجيك الفلترة المتقدمة (تعمل على الـ Cache بسرعة البرق)
    const filteredData = useMemo(() => {
        const start = searchFilters.startDate ? new Date(searchFilters.startDate) : null;
        const end = searchFilters.endDate ? new Date(searchFilters.endDate) : null;

        const checkDate = (dateStr: string) => {
            if (!dateStr) return true;
            const d = new Date(dateStr);
            if (start && d < start) return false;
            if (end && d > end) return false;
            return true;
        };

        const logs = recentLogs.filter(log => 
            checkDate(log.work_date || log.Date) &&
            (searchFilters.site === 'all' || (log.site_ref || log.Site) === searchFilters.site) &&
            (log.site_ref || log.Site || log.work_item || '').toLowerCase().includes(searchFilters.term.toLowerCase())
        );

        const advances = recentAdvances.filter(a => checkDate(a.date || a.created_at));
        const deductions = recentDeductions.filter(d => checkDate(d.date || d.created_at));

        return { logs, advances, deductions };
    }, [recentLogs, recentAdvances, recentDeductions, searchFilters]);

    // 📈 4. حسابات الـ KPIs (خلاصة الفترة المحددة)
    const rangeKPIs = useMemo(() => {
        const totalWages = filteredData.logs.reduce((sum, l) => sum + (Number(l.daily_wage || l.D_W) || 0), 0);
        const totalDeds = filteredData.deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
        const totalAdvs = filteredData.advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
        const workDays = filteredData.logs.filter(l => l.attendance_value === '1' || l.Att === '1').length;

        return {
            workDays,
            totalWages,
            totalDeductions: totalDeds + totalAdvs,
            netBalance: totalWages - (totalDeds + totalAdvs)
        };
    }, [filteredData]);

    const monthlyKPIs = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const thisMonthLogs = recentLogs.filter(log => (log.work_date || log.Date) >= startOfMonth);
        const daysWorked = thisMonthLogs.filter(l => l.attendance_value === '1' || l.Att === '1').length;
        const totalProduction = thisMonthLogs.reduce((sum, l) => sum + (Number(l.daily_production || l.Prod) || 0), 0);
        const totalEarnings = thisMonthLogs.reduce((sum, l) => sum + (Number(l.daily_wage || l.D_W) || 0), 0);
        const attendanceRate = Math.min(100, (daysWorked / 26) * 100).toFixed(0);
        return { daysWorked, attendanceRate, totalProduction, totalEarnings, monthName: now.toLocaleString('ar-EG', { month: 'long' }) };
    }, [recentLogs]);

    const taskGroups = useMemo(() => {
        return {
            completed: tasks.filter(t => t.status === 'completed'),
            pending: tasks.filter(t => t.status !== 'completed')
        };
    }, [tasks]);

    // 📡 5. الاشتراك اللحظي (Supabase Realtime)
    useEffect(() => {
        if (!userProfile?.id) return;
        const channel = supabase.channel('profile-realtime-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_tasks', filter: `user_id=eq.${userProfile.id}` }, () => {
                // تحديث المهام صامتاً إذا قامت الإدارة بتعديلها
                queryClient.invalidateQueries({ queryKey: ['employeeProfileData'] });
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userProfile.id}` }, () => {
                toast.success('لديك إشعار جديد 🔔');
                queryClient.invalidateQueries({ queryKey: ['employeeProfileData'] });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [queryClient, userProfile?.id]);

    // 🚀 6. عمليات الإرسال الذكية (Mutations) مع التنبيهات
    const invalidateAndRefresh = () => queryClient.invalidateQueries({ queryKey: ['employeeProfileData'] });

    const requestMutation = useMutation({
        mutationFn: async (reqData: any) => {
            const { error } = await supabase.from('user_requests').insert({ user_id: userProfile?.id, ...reqData });
            if (error) throw error;
        },
        onSuccess: () => { toast.success('تم رفع الطلب للإدارة بنجاح 🚀'); invalidateAndRefresh(); },
        onError: () => toast.error('حدث خطأ أثناء رفع الطلب ❌')
    });

    const taskMutation = useMutation({
        mutationFn: async ({ taskId, status, note }: any) => {
            const { error } = await supabase.from('user_tasks').update({ status, completion_note: note || null, updated_at: new Date() }).eq('id', taskId);
            if (error) throw error;
        },
        onSuccess: (_, variables) => { 
            if (variables.status === 'completed') toast.success('تم إنجاز المهمة، عاش يا بطل! ✅');
            else toast.success('تم إرسال تقرير عدم الإنجاز ⚠️');
            invalidateAndRefresh(); 
        },
        onError: () => toast.error('لم نتمكن من تحديث حالة المهمة ❌')
    });

    const profileMutation = useMutation({
        mutationFn: async (data: any) => {
            const { error } = await supabase.from('profiles').update(data).eq('id', userProfile?.id);
            if (error) throw error;
        },
        onSuccess: () => { toast.success('تم حفظ بيانات البروفايل 💾'); invalidateAndRefresh(); },
        onError: () => toast.error('حدث خطأ أثناء الحفظ ❌')
    });

    const notificationMutation = useMutation({
        mutationFn: async () => await supabase.from('notifications').update({ is_read: true }).eq('user_id', userProfile?.id),
        onSuccess: invalidateAndRefresh
    });

    // 🔄 تصدير الدوال المتوافقة مع واجهة المستخدم (بدون كسر الكود القديم)
    const createRequest = async (data: any) => requestMutation.mutateAsync(data);
    const submitTaskUpdate = async (taskId: string, status: string, note?: string) => taskMutation.mutateAsync({ taskId, status, note });
    const updateProfileInfo = async (data: any) => profileMutation.mutateAsync(data);
    const markAllNotificationsAsRead = async () => notificationMutation.mutateAsync();
    const refreshProfile = () => { toast.success('تم تحديث البيانات 🔄'); invalidateAndRefresh(); };

    // دالة الرفع الوحيدة مع Toast مخصص للتحميل
    const uploadAvatar = async (file: File) => {
        if (!userProfile?.id) return;
        const toastId = toast.loading('جاري رفع الصورة... ⏳');
        try {
            const fileName = `${userProfile.id}-${Date.now()}`;
            const { error } = await supabase.storage.from('avatars').upload(fileName, file);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            await profileMutation.mutateAsync({ avatar_url: publicUrl });
            toast.success('تم تحديث الصورة الشخصية 📸', { id: toastId });
        } catch (error) { 
            toast.error('فشل في رفع الصورة ❌', { id: toastId }); 
            console.error(error); 
        } 
    };

    // حالة التحميل أثناء الحفظ لتغيير شكل الأزرار
    const isSaving = requestMutation.isPending || taskMutation.isPending || profileMutation.isPending || notificationMutation.isPending;

    // 📦 إرجاع كل البيانات كما كانت تماماً لضمان عدم تلف صفحة UI
    return {
        isLoading, isSaving, userProfile, partnerData, financials,
        recentLogs, recentAdvances, recentDeductions, filteredLogs: filteredData.logs,
        tasks, notifications, activeTab, searchFilters,
        filteredData, rangeKPIs, taskGroups, monthlyKPIs, userRequests,
        setSearchFilters, setActiveTab, refreshProfile,
        updateProfileInfo, uploadAvatar, markAllNotificationsAsRead,
        submitTaskUpdate, createRequest
    };
}