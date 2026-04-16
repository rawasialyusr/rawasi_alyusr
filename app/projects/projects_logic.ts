"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export function useProjectsLogic() {
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]); 
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [projectDetails, setProjectDetails] = useState<any>({
    stages: [], boq: [], expenses: [], invoices: [], inspections: [], laborStats: null
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); 

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [filterClient, setFilterClient] = useState('الكل');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // 🔍 دالة الفحص العميق لقاعدة البيانات (Diagnostic Tool) - محدثة للتحقق من الربط بـ IDs
  const runDiagnostics = async () => {
    if (!selectedProject) {
      alert("يرجى اختيار مشروع أولاً من القائمة الجانبية لتشغيل الفحص عليه.");
      return;
    }

    console.log("=========================================");
    console.log(`🚀 بدء فحص قاعدة البيانات للمشروع: ${selectedProject.Property}`);
    console.log(`🔑 ID المشروع: ${selectedProject.id}`);
    console.log("=========================================");

    try {
      // 1. فحص المقايسات
      console.log("⏳ جاري فحص المقايسات...");
      const boqTest = await supabase.from('boq_budget').select('*').eq('project_id', selectedProject.id);
      if (boqTest.error) console.error("❌ إيرور في boq_budget:", boqTest.error.message);
      else console.log(`✅ المقايسات: تم سحب (${boqTest.data?.length}) سجل بنجاح.`, boqTest.data);

      // 2. فحص المصروفات 
      console.log("⏳ جاري فحص المصروفات (مربوطة بـ project_id)...");
      const expTest = await supabase.from('expenses').select('*, payee_id').eq('project_id', selectedProject.id);
      if (expTest.error) console.error("❌ إيرور في expenses:", expTest.error.message);
      else console.log(`✅ المصروفات: تم سحب (${expTest.data?.length}) سجل بنجاح.`, expTest.data);

      // 3. فحص العمالة 
      console.log("⏳ جاري فحص العمالة (مربوطة بـ project_id و worker_partner_id)...");
      const laborTest = await supabase.from('labor_daily_logs').select('*, worker_partner_id').eq('project_id', selectedProject.id);
      if (laborTest.error) console.error("❌ إيرور في labor_daily_logs:", laborTest.error.message);
      else console.log(`✅ العمالة: تم سحب (${laborTest.data?.length}) سجل بنجاح.`, laborTest.data);

      // 4. فحص المستخلصات 
      console.log("⏳ جاري فحص المستخلصات (مربوطة بـ project_id و accounts)...");
      const invTest = await supabase.from('invoices').select('*, creditor_account_id, debtor_account_id').eq('project_id', selectedProject.id);
      if (invTest.error) console.error("❌ إيرور في invoices:", invTest.error.message);
      else console.log(`✅ المستخلصات: تم سحب (${invTest.data?.length}) سجل بنجاح.`, invTest.data);

      console.log("=========================================");
      console.log("🎉 اكتمل الفحص! راجع النتائج أعلاه.");
      alert("تم الفحص! راجع الـ Console (F12) لمعرفة التفاصيل.");

    } catch (err) {
      console.error("حدث خطأ غير متوقع أثناء الفحص:", err);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    const { data: projData } = await supabase
      .from('projects')
      // ربط الـ client_id بجدول الشركاء لجلب الاسم
      .select(`*, client:partners!client_id(name)`)
      .order('created_at', { ascending: false });
    if (projData) setProjects(projData);

    const { data: clientData } = await supabase
      .from('partners')
      .select('id, name')
      .eq('partner_type', 'عميل');
    if (clientData) setClients(clientData);

    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = (p.Property || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.project_code || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === 'الكل' || p.status === filterStatus;
      const matchClient = filterClient === 'الكل' || p.client_id === filterClient;
      const matchDate = (!dateFrom || p.start_date >= dateFrom) && (!dateTo || p.start_date <= dateTo);
      return matchSearch && matchStatus && matchClient && matchDate;
    });
  }, [projects, searchQuery, filterStatus, filterClient, dateFrom, dateTo]);

  const loadProjectDetails = async (project: any) => {
    setSelectedProject(project);
    setIsDetailsLoading(true);

    try {
      // سحب البيانات واستخدام الجداول المربوطة بالـ IDs لجلب الأسماء
      const [stagesRes, boqRes, expRes, laborRes, invRes] = await Promise.all([
        supabase.from('project_stages').select('*').eq('project_id', project.id),
        supabase.from('boq_budget').select('*').eq('project_id', project.id), 
        // ربط المصروفات بالمورد عن طريق payee_id
        supabase.from('expenses').select('*, payee:partners!payee_id(name)').eq('project_id', project.id), 
        // ربط العمالة بالعامل عن طريق worker_partner_id
        supabase.from('labor_daily_logs').select('*, worker:partners!worker_partner_id(name)').eq('project_id', project.id),
        // ربط المستخلصات بالحسابات عن طريق IDs الحسابات
        supabase.from('invoices').select('*, creditor:accounts!creditor_account_id(name), debtor:accounts!debtor_account_id(name)').eq('project_id', project.id) 
      ]);

      const laborLogs = laborRes.data || [];
      const todayStr = new Date().toISOString().split('T')[0];
      
      const laborStats = {
        todayWorkers: laborLogs.filter(l => l.work_date === todayStr).reduce((sum, l) => sum + Number(l.attendance_value || 0), 0),
        totalWorkersToDate: laborLogs.reduce((sum, l) => sum + Number(l.attendance_value || 0), 0),
        todayCost: laborLogs.filter(l => l.work_date === todayStr).reduce((sum, l) => sum + (Number(l.daily_wage || 0) * Number(l.attendance_value || 0)), 0),
        totalLaborCost: laborLogs.reduce((sum, l) => sum + (Number(l.daily_wage || 0) * Number(l.attendance_value || 0)), 0),
        activeTasks: Array.from(new Set(laborLogs.filter(l => l.work_item).map(l => l.work_item)))
      };

      const mockInspections = [
        { id: 1, element: 'صب قواعد العقار', date: '2024-03-10', engineer: 'م. أحمد', status: 'مُعتمد ✅', photo: 'https://images.unsplash.com/photo-1541888081033-66f91f3a53c1?w=200&h=150&fit=crop' },
        { id: 2, element: 'استلام نجارة السقف', date: '2024-03-15', engineer: 'م. محمود', status: 'مرفوض ❌', photo: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200&h=150&fit=crop' }
      ];

      setProjectDetails({
        stages: stagesRes.data || [],
        boq: boqRes.data || [],
        expenses: expRes.data || [], 
        invoices: invRes.data || [], 
        laborStats: laborStats,
        inspections: mockInspections 
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const updateRecommendations = async (newText: string) => {
    if (!selectedProject) return;
    const { error } = await supabase.from('projects').update({ notes: newText }).eq('id', selectedProject.id);
    if (!error) {
      setSelectedProject({ ...selectedProject, notes: newText });
    }
  };

  // دالة تحديث حالة المشروع
  const updateProjectStatus = async (newStatus: string) => {
    if (!selectedProject) return;
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', selectedProject.id);
    
    if (!error) {
      setSelectedProject({ ...selectedProject, status: newStatus });
      setProjects(projects.map(p => p.id === selectedProject.id ? { ...p, status: newStatus } : p));
    } else {
      alert("خطأ في تحديث الحالة: " + error.message);
    }
  };

  const resetFilters = () => {
    setSearchQuery(''); setFilterStatus('الكل'); setFilterClient('الكل'); setDateFrom(''); setDateTo('');
  };

  // 📊 المؤشرات الذكية والتحليلات المالية
  const kpis = useMemo(() => {
    if (!selectedProject) return null;
    const totalContract = Number(selectedProject.contract_value) || 0;
    const totalEstimatedBudget = Number(selectedProject.estimated_budget) || 0;
    
    const expensesCost = projectDetails.expenses.reduce((sum: number, exp: any) => sum + Number(exp.total_price || 0), 0);
    const laborCost = projectDetails.laborStats?.totalLaborCost || 0;
    const actualCost = expensesCost + laborCost;

    const totalRevenue = projectDetails.invoices
      .filter((i:any) => i.status === 'مُعتمد')
      .reduce((sum: number, i:any) => sum + Number(i.net_amount || i.amount || 0), 0);
      
    const financialProgress = totalContract > 0 ? ((totalRevenue / totalContract) * 100) : 0;
    
    const budgetRatio = totalEstimatedBudget > 0 ? (actualCost / totalEstimatedBudget) : 0;
    let budgetHealth = 'green';
    if (budgetRatio > 1.1) budgetHealth = 'red';
    else if (budgetRatio > 0.9) budgetHealth = 'yellow';

    let timeProgress = 0;
    let timeStatus = 'منتظم 🟢';
    if (selectedProject.start_date && selectedProject.end_date) {
      const start = new Date(selectedProject.start_date).getTime();
      const end = new Date(selectedProject.end_date).getTime();
      const now = new Date().getTime();
      if (now > end) { timeProgress = 100; timeStatus = 'متأخر جداً 🔴'; }
      else if (now < start) { timeProgress = 0; timeStatus = 'لم يبدأ بعد ⚪'; }
      else { 
        timeProgress = ((now - start) / (end - start)) * 100; 
        if (timeProgress > financialProgress + 15) timeStatus = 'تأخر زمني 🟠';
      }
    }

    const requiredCashflow = totalEstimatedBudget - actualCost;

    // 🆕 إضافة ميزة تنبيهات المخاطر (Risk Alerts)
    const alerts = [];
    if (budgetHealth === 'red') alerts.push("🚨 تجاوز الميزانية المعتمدة");
    if (timeStatus.includes('تأخر')) alerts.push("⚠️ تأخر في الجدول الزمني");
    if (totalRevenue < actualCost) alerts.push("💸 التدفق النقدي بالسالب (المصروفات أكبر من التحصيل)");

    return { 
      totalContract, totalEstimatedBudget, actualCost, totalRevenue, 
      financialProgress: financialProgress.toFixed(1), 
      budgetRatio: (budgetRatio * 100).toFixed(1),
      budgetHealth, timeProgress: timeProgress.toFixed(1), timeStatus, requiredCashflow,
      alerts
    };
  }, [selectedProject, projectDetails]);

  // تحليل ربحية بنود المقايسة
  const boqAnalysis = useMemo(() => {
    return projectDetails.boq.map((item: any) => {
      const actualSpentOnItem = projectDetails.expenses
        .filter((e: any) => e.work_item === item.work_item)
        .reduce((sum: number, e: any) => sum + Number(e.total_price || 0), 0);

      const estimatedCost = Number(item.estimated_labor_cost || 0);
      const variance = estimatedCost - actualSpentOnItem;
      
      return {
        ...item,
        actualSpent: actualSpentOnItem,
        variance: variance,
        health: variance >= 0 ? 'safe' : 'over'
      };
    });
  }, [projectDetails]);

  // 🆕 ميزة: تحليل التدفق النقدي الشهري (Monthly Cashflow Analysis)
  const monthlyAnalysis = useMemo(() => {
    if (!projectDetails.expenses.length && !projectDetails.invoices.length) return [];
    
    const monthlyData: Record<string, { exp: number, rev: number }> = {};

    projectDetails.expenses.forEach((e: any) => {
      const month = e.exp_date?.substring(0, 7) || 'غير محدد';
      if (!monthlyData[month]) monthlyData[month] = { exp: 0, rev: 0 };
      monthlyData[month].exp += Number(e.total_price || 0);
    });

    projectDetails.invoices.forEach((i: any) => {
      const month = i.date?.substring(0, 7) || 'غير محدد';
      if (!monthlyData[month]) monthlyData[month] = { exp: 0, rev: 0 };
      monthlyData[month].rev += Number(i.net_amount || i.amount || 0);
    });

    return Object.entries(monthlyData).sort().map(([month, vals]) => ({
      month,
      ...vals,
      balance: vals.rev - vals.exp
    }));
  }, [projectDetails]);

  return {
    projects: filteredProjects, clients, selectedProject, projectDetails, kpis, boqAnalysis, monthlyAnalysis,
    isLoading, isDetailsLoading, loadProjectDetails, activeTab, setActiveTab,
    isFilterOpen, setIsFilterOpen, searchQuery, setSearchQuery, 
    filterStatus, setFilterStatus, filterClient, setFilterClient, 
    dateFrom, setDateFrom, dateTo, setDateTo, runDiagnostics, resetFilters, 
    updateRecommendations, updateProjectStatus
  };
}