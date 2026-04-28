"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // 🚀 محرك العمليات
import { useToast } from '@/lib/toast-context'; // 🚀 التنبيهات السيادية

export function useProjectsLogic() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]); 
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [projectDetails, setProjectDetails] = useState<any>({
    stages: [], boq: [], expenses: [], invoices: [], inspections: [], laborStats: null
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); 

  // 🚀 فلاتر السايد بار
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [filterClient, setFilterClient] = useState('الكل');
  const [filterStage, setFilterStage] = useState('الكل'); // 🆕 فلتر المرحلة الحالية
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // 🆕 استخراج المراحل المتاحة ديناميكياً لملء قائمة الفلتر
  const availableStages = useMemo(() => {
      const stages = projects.map(p => p.current_stage).filter(Boolean);
      return Array.from(new Set(stages));
  }, [projects]);

  // =========================================================================
  // 🚀 حالات ودوال إدارة المقايسة (WBS)
  // =========================================================================
  const [isBoqModalOpen, setIsBoqModalOpen] = useState(false);
  const [currentBoqRecord, setCurrentBoqRecord] = useState<any>({
      item_type: 'رئيسي', contract_quantity: 1, unit_contract_price: 0, 
      estimated_labor_cost: 0, estimated_operational_cost: 0
  });

  const saveBoqMutation = useMutation({
      mutationFn: async (record: any) => {
          const payload = {
              project_id: selectedProject.id,
              parent_id: record.item_type === 'فرعي' ? record.parent_id : null,
              item_type: record.item_type,
              work_item: record.work_item,
              unit: record.unit || 'مقطوعية',
              contract_quantity: Number(record.contract_quantity) || 0,
              unit_contract_price: Number(record.unit_contract_price) || 0,
              estimated_labor_cost: Number(record.estimated_labor_cost) || 0,
              estimated_operational_cost: Number(record.estimated_operational_cost) || 0
          };

          if (record.id) {
              const { error } = await supabase.from('boq_budget').update(payload).eq('id', record.id);
              if (error) throw error;
          } else {
              const { error } = await supabase.from('boq_budget').insert([payload]);
              if (error) throw error;
          }
      },
      onSuccess: () => {
          setIsBoqModalOpen(false);
          if (selectedProject) loadProjectDetails(selectedProject); // تحديث الداتا محلياً
          showToast("تم حفظ البند في المقايسة بنجاح ✅", "success");
      },
      onError: (err: any) => {
          showToast(`خطأ في حفظ البند: ${err.message}`, "error");
      }
  });

  // 🔍 دالة الفحص العميق لقاعدة البيانات (Diagnostic Tool)
  const runDiagnostics = async () => {
    if (!selectedProject) {
      alert("يرجى اختيار مشروع أولاً من القائمة الجانبية لتشغيل الفحص عليه.");
      return;
    }
    console.log(`🚀 بدء فحص قاعدة البيانات للمشروع: ${selectedProject.Property}`);
    try {
      console.log("⏳ جاري فحص المقايسات...");
      const boqTest = await supabase.from('boq_budget').select('*').eq('project_id', selectedProject.id);
      if (boqTest.error) console.error("❌ إيرور في boq_budget:", boqTest.error.message);
      else console.log(`✅ المقايسات: تم سحب (${boqTest.data?.length}) سجل بنجاح.`, boqTest.data);

      console.log("⏳ جاري فحص المصروفات...");
      const expTest = await supabase.from('expenses').select('*, payee_id').eq('project_id', selectedProject.id);
      if (expTest.error) console.error("❌ إيرور في expenses:", expTest.error.message);
      else console.log(`✅ المصروفات: تم سحب (${expTest.data?.length}) سجل بنجاح.`, expTest.data);

      console.log("⏳ جاري فحص العمالة...");
      const laborTest = await supabase.from('labor_daily_logs').select('*, worker_partner_id').eq('project_id', selectedProject.id);
      if (laborTest.error) console.error("❌ إيرور في labor_daily_logs:", laborTest.error.message);
      else console.log(`✅ العمالة: تم سحب (${laborTest.data?.length}) سجل بنجاح.`, laborTest.data);

      console.log("⏳ جاري فحص المستخلصات...");
      const invTest = await supabase.from('invoices').select('*, creditor_account_id, debtor_account_id').eq('project_id', selectedProject.id);
      if (invTest.error) console.error("❌ إيرور في invoices:", invTest.error.message);
      else console.log(`✅ المستخلصات: تم سحب (${invTest.data?.length}) سجل بنجاح.`, invTest.data);

      console.log("=========================================");
      alert("تم الفحص! راجع الـ Console (F12) لمعرفة التفاصيل.");
    } catch (err) {
      console.error("حدث خطأ غير متوقع أثناء الفحص:", err);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    const { data: projData } = await supabase
      .from('projects')
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

  // 🚀 الفلترة الذكية (شملت المرحلة والحالة)
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = (p.Property || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.project_code || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === 'الكل' || p.status === filterStatus;
      const matchClient = filterClient === 'الكل' || p.client_id === filterClient;
      const matchStage = filterStage === 'الكل' || p.current_stage === filterStage;
      const matchDate = (!dateFrom || p.start_date >= dateFrom) && (!dateTo || p.start_date <= dateTo);
      return matchSearch && matchStatus && matchClient && matchStage && matchDate;
    });
  }, [projects, searchQuery, filterStatus, filterClient, filterStage, dateFrom, dateTo]);

  const loadProjectDetails = async (project: any) => {
    setSelectedProject(project);
    setIsDetailsLoading(true);

    try {
      const [stagesRes, boqRes, expRes, laborRes, invRes] = await Promise.all([
        supabase.from('project_stages').select('*').eq('project_id', project.id),
        supabase.from('boq_budget').select('*').eq('project_id', project.id).order('created_at', { ascending: true }), 
        supabase.from('expenses').select('*, payee:partners!payee_id(name)').eq('project_id', project.id), 
        supabase.from('labor_daily_logs').select('*, worker:partners!worker_partner_id(name)').eq('project_id', project.id),
        supabase.from('invoices').select('*, creditor:accounts!creditor_account_id(name), debtor:accounts!debtor_account_id(name)').eq('project_id', project.id) 
      ]);

      const boqData = boqRes.data || [];

      // 🚀 السحر المعماري: سحب الفاتورة وتوزيعها على مقايسة العمارة (Proration)
      const processedInvoices = (invRes.data || []).map((inv: any) => {
          const matchingBoqItem = boqData.find(b => b.work_item === inv.description);
          
          let allocatedAmount = Number(inv.net_amount || inv.amount || 0);
          let notes = '';

          if (matchingBoqItem && inv.global_quantity && matchingBoqItem.contract_quantity) {
              const buildingRatio = matchingBoqItem.contract_quantity / inv.global_quantity;
              allocatedAmount = allocatedAmount * buildingRatio;
              notes = `مسحوب (${(buildingRatio * 100).toFixed(1)}%) من الفاتورة المجمعة بناءً على كمية المقايسة (${matchingBoqItem.contract_quantity} ${matchingBoqItem.unit})`;
          }

          return { ...inv, allocatedAmount, allocationNotes: notes };
      });

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
        boq: boqData,
        expenses: expRes.data || [], 
        invoices: processedInvoices,
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

  // 🚀 التعديل الماسي: الحل الجذري لمشكلة عدم تحديث الكارت من الخارج (Functional State Update)
  const updateProjectStatus = async (newStatus: string) => {
    if (!selectedProject) return;
    
    const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', selectedProject.id);
    
    if (!error) {
      // 1. تحديث المشروع المفتوح في الغرفة حالياً
      setSelectedProject({ ...selectedProject, status: newStatus });
      
      // 2. تحديث الكارت اللي بره في مصفوفة المشاريع باستخدام أحدث حالة للمصفوفة (prevProjects)
      setProjects(prevProjects => 
        prevProjects.map(p => 
          p.id === selectedProject.id ? { ...p, status: newStatus } : p
        )
      );

      showToast("تم تحديث حالة المشروع بنجاح ✅", "success");
    } else {
      showToast("خطأ في تحديث الحالة: " + error.message, "error");
    }
  };

  const resetFilters = () => {
    setSearchQuery(''); setFilterStatus('الكل'); setFilterClient('الكل'); setFilterStage('الكل'); setDateFrom(''); setDateTo('');
  };

  const kpis = useMemo(() => {
    if (!selectedProject) return null;
    const totalContract = Number(selectedProject.contract_value) || 0;
    const totalEstimatedBudget = Number(selectedProject.estimated_budget) || 0;
    
    const expensesCost = projectDetails.expenses.reduce((sum: number, exp: any) => sum + Number(exp.total_price || 0), 0);
    const laborCost = projectDetails.laborStats?.totalLaborCost || 0;
    const actualCost = expensesCost + laborCost;

    const totalRevenue = projectDetails.invoices
      .filter((i:any) => i.status === 'مُعتمد')
      .reduce((sum: number, i:any) => sum + (i.allocatedAmount || 0), 0);
      
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

  const boqAnalysis = useMemo(() => {
    return projectDetails.boq.map((item: any) => {
      const actualSpentOnItem = projectDetails.expenses
        .filter((e: any) => e.work_item === item.work_item)
        .reduce((sum: number, e: any) => sum + Number(e.total_price || 0), 0);

      const estimatedCost = Number(item.estimated_labor_cost || 0) + Number(item.estimated_operational_cost || 0);
      const variance = estimatedCost - actualSpentOnItem;
      
      return {
        ...item,
        actualSpent: actualSpentOnItem,
        variance: variance,
        health: variance >= 0 ? 'safe' : 'over'
      };
    });
  }, [projectDetails]);

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
    projects: filteredProjects, 
    clients, 
    selectedProject, 
    setSelectedProject, 
    projectDetails, 
    kpis, 
    boqAnalysis, 
    monthlyAnalysis,
    isLoading, 
    isDetailsLoading, 
    loadProjectDetails, 
    activeTab, 
    setActiveTab,
    isFilterOpen, 
    setIsFilterOpen, 
    searchQuery, 
    setSearchQuery, 
    filterStatus, 
    setFilterStatus, 
    filterClient, 
    setFilterClient, 
    filterStage, 
    setFilterStage, 
    availableStages,
    dateFrom, 
    setDateFrom, 
    dateTo, 
    setDateTo, 
    runDiagnostics, 
    resetFilters, 
    updateRecommendations, 
    updateProjectStatus,

    isBoqModalOpen, 
    setIsBoqModalOpen,
    currentBoqRecord, 
    setCurrentBoqRecord,
    handleSaveBoq: (data: any) => saveBoqMutation.mutate(data)
  };
}