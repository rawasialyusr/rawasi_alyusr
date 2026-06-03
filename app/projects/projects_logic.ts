"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query'; 
import { useToast } from '@/lib/toast-context'; 

// دالة تطهير النصوص لضمان تطابق البحث في المصروفات
const normalizeArabic = (str: string) => {
  if (!str) return '';
  return str.trim().toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ');
};

export function useProjectsLogic() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]); 
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  
  // 🚀 تم إضافة ledger هنا بدون حذف الباقي
  const [projectDetails, setProjectDetails] = useState<any>({
    stages: [], boq: [], expenses: [], ledger: [], invoices: [], inspections: [], laborStats: null, materials: [], contractorAssignments: []
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); 

  // 🚀 فلاتر السايد بار
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [filterClient, setFilterClient] = useState('الكل');
  const [filterStage, setFilterStage] = useState('الكل'); 
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const availableStages = useMemo(() => {
      const stages = projects.map(p => p.current_stage).filter(Boolean);
      return Array.from(new Set(stages));
  }, [projects]);

  // =========================================================================
  // 🚀 1. إدارة إضافة وتعديل وحذف مشروع (Project CRUD)
  // =========================================================================
  const defaultProjectRecord = {
      project_code: '', Property: '', unit_type: '', unit_area: '', client_id: '', contract_value: '', 
      estimated_budget: '', down_payment: '', start_date: '', end_date: '', 
      location_address: '', project_manager: '', 
      engineer_in_charge: '', engineer_phone: '', 
      status: 'قيد الدراسة', current_stage: 'تجهيز الموقع', notes: ''
  };
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [currentProjectRecord, setCurrentProjectRecord] = useState<any>(defaultProjectRecord);

  const saveProjectMutation = useMutation({
      mutationFn: async (payload: any) => {
          if (payload.id) {
              const { error } = await supabase.from('projects').update(payload).eq('id', payload.id);
              if (error) throw error;
              return payload; 
          } else {
              const { error } = await supabase.from('projects').insert([payload]);
              if (error) throw error;
              return null;
          }
      },
      onSuccess: (updatedPayload) => {
          showToast("تم الحفظ بنجاح 🚀", "success");
          setIsAddProjectModalOpen(false);
          setCurrentProjectRecord(defaultProjectRecord);
          fetchData(); 
          
          if (updatedPayload && selectedProject?.id === updatedPayload.id) {
              setSelectedProject({ ...selectedProject, ...updatedPayload });
          }
      },
      onError: (err: any) => showToast(`خطأ في الحفظ: ${err.message}`, "error")
  });

  const deleteProjectMutation = useMutation({
      mutationFn: async (id: string) => {
          const { error } = await supabase.from('projects').delete().eq('id', id);
          if (error) throw error;
      },
      onSuccess: () => {
          showToast("تم حذف المشروع نهائياً 🗑️", "success");
          setSelectedProject(null); 
          fetchData(); 
      },
      onError: (err: any) => showToast(`خطأ في الحذف: ${err.message}`, "error")
  });

  const handleSaveProject = () => {
      if (!currentProjectRecord.Property) return showToast("اسم العقار/المشروع مطلوب!", "error");
      
      const payload: any = {
          project_code: currentProjectRecord.project_code || null,
          Property: currentProjectRecord.Property,
          unit_type: currentProjectRecord.unit_type || null,
          unit_area: Number(currentProjectRecord.unit_area) || 0,
          client_id: currentProjectRecord.client_id || null, 
          contract_value: Number(currentProjectRecord.contract_value) || 0,
          estimated_budget: Number(currentProjectRecord.estimated_budget) || 0,
          down_payment: Number(currentProjectRecord.down_payment) || 0,
          start_date: currentProjectRecord.start_date || null, 
          end_date: currentProjectRecord.end_date || null,
          location_address: currentProjectRecord.location_address || null,
          project_manager: currentProjectRecord.project_manager || null,
          engineer_in_charge: currentProjectRecord.engineer_in_charge || null, 
          engineer_phone: currentProjectRecord.engineer_phone || null,        
          status: currentProjectRecord.status || 'قيد الدراسة',
          current_stage: currentProjectRecord.current_stage || 'تجهيز الموقع',
          notes: currentProjectRecord.notes || null
      };

      if (currentProjectRecord.id) {
          payload.id = currentProjectRecord.id;
      }

      saveProjectMutation.mutate(payload);
  };

  // =========================================================================
  // 🚀 2. حالات ودوال إدارة المقايسة (WBS)
  // =========================================================================
  const [isBoqModalOpen, setIsBoqModalOpen] = useState(false);
  const [currentBoqRecord, setCurrentBoqRecord] = useState<any>({
      item_type: 'رئيسي', contract_quantity: 1, unit_contract_price: 0, 
      estimated_labor_cost: 0, estimated_material_cost: 0, estimated_expenses_cost: 0,
      start_date: '', end_date: '' 
  });

  const saveBoqMutation = useMutation({
      mutationFn: async (record: any) => {
          if (!record.work_item) throw new Error("يرجى إدخال اسم البند أو المرحلة أولاً!");

          // 🚀 تم تنظيف الـ Payload من حقول التشغيل واستبدالها بالخامات
          const payload = {
              project_id: selectedProject.id,
              parent_id: record.item_type === 'فرعي' ? record.parent_id : null,
              item_type: record.item_type || 'رئيسي',
              work_item: record.work_item,
              unit: record.unit || 'مقطوعية',
              contract_quantity: Number(record.contract_quantity) || 0,
              unit_contract_price: Number(record.unit_contract_price) || 0,
              estimated_labor_cost: Number(record.estimated_labor_cost) || 0,
              estimated_material_cost: Number(record.estimated_material_cost) || 0,
              boq_item_id: record.boq_item_id || null, 
              estimated_expenses_cost: Number(record.estimated_expenses_cost) || 0, 
              main_category: record.main_category || null, 
              sub_category: record.sub_category || null,
              start_date: record.start_date || null, 
              end_date: record.end_date || null
          };

          if (record.id) {
              const { error } = await supabase.from('boq_budget').update(payload).eq('id', record.id);
              if (error) throw new Error(error.message);
          } else {
              const { error } = await supabase.from('boq_budget').insert([payload]);
              if (error) throw new Error(error.message);
          }
      },
      onSuccess: () => {
          setIsBoqModalOpen(false);
          if (selectedProject) loadProjectDetails(selectedProject);
          showToast("تم حفظ البند في المقايسة بنجاح ✅", "success");
      },
      onError: (err: any) => {
          console.error("BOQ Save Error:", err);
          showToast(`خطأ في الحفظ: ${err.message}`, "error");
      }
  });

  const deleteBoqMutation = useMutation({
      mutationFn: async (id: string) => {
          const { error } = await supabase.from('boq_budget').delete().eq('id', id);
          if (error) throw new Error(error.message);
      },
      onSuccess: () => {
          showToast("تم حذف البند من المقايسة بنجاح 🗑️", "success");
          if (selectedProject) loadProjectDetails(selectedProject); 
      },
      onError: (err: any) => showToast(`خطأ في الحذف: ${err.message}`, "error")
  });

  const importFromLibrary = async (libraryItem: any) => {
      if (!selectedProject) return;
      setIsDetailsLoading(true);

      try {
          let parentId = null;
          const existingPhase = projectDetails.boq.find(
              (b: any) => b.item_type === 'رئيسي' && b.work_item === libraryItem.main_category
          );

          if (existingPhase) {
              parentId = existingPhase.id;
          } else {
              const { data: newPhase, error: phaseErr } = await supabase
                  .from('boq_budget')
                  .insert([{
                      project_id: selectedProject.id,
                      item_type: 'رئيسي',
                      work_item: libraryItem.main_category || 'مرحلة عامة',
                      main_category: libraryItem.main_category || 'مرحلة عامة',
                      sub_category: 'عام',
                      start_date: null, 
                      end_date: null 
                  }])
                  .select()
                  .single();

              if (phaseErr) throw phaseErr;
              parentId = newPhase.id;
          }

          const { error: itemErr } = await supabase
              .from('boq_budget')
              .insert([{
                  project_id: selectedProject.id,
                  parent_id: parentId, 
                  item_type: 'فرعي',
                  boq_item_id: libraryItem.id,
                  work_item: libraryItem.item_name,
                  unit: libraryItem.unit_of_measure || 'مقطوعية',
                  contract_quantity: 0, 
                  unit_contract_price: Number(libraryItem.default_unit_price) || 0,
                  estimated_labor_cost: Number(libraryItem.default_labor_price) || 0,
                  // 🚀 تم توجيه تكلفة الخامات التقديرية إلى مسارها الصحيح بدلاً من التشغيل
                  estimated_material_cost: Number(libraryItem.default_material_price) || 0,
                  estimated_expenses_cost: 0,
                  main_category: libraryItem.main_category || 'بند عام',
                  sub_category: libraryItem.sub_category || 'بند عام',
                  start_date: null, 
                  end_date: null 
              }]);

          if (itemErr) throw itemErr;

          showToast(`تم سحب [${libraryItem.item_name}] وتسكينه بنجاح! 🎯`, "success");
          loadProjectDetails(selectedProject); 

      } catch (err: any) {
          showToast(`فشل السحب التلقائي: ${err.message}`, "error");
      } finally {
          setIsDetailsLoading(false);
      }
  };

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
      const expTest = await supabase.from('expenses').select('*').eq('project_id', selectedProject.id);
      if (expTest.error) console.error("❌ إيرور في expenses:", expTest.error.message);
      else console.log(`✅ المصروفات: تم سحب (${expTest.data?.length}) سجل بنجاح.`, expTest.data);

      console.log("⏳ جاري فحص العمالة...");
      const laborTest = await supabase.from('labor_daily_logs').select('*').eq('project_id', selectedProject.id);
      if (laborTest.error) console.error("❌ إيرور في labor_daily_logs:", laborTest.error.message);
      else console.log(`✅ العمالة: تم سحب (${laborTest.data?.length}) سجل بنجاح.`, laborTest.data);

      console.log("⏳ جاري فحص المستخلصات...");
      const invTest = await supabase.from('invoices').select('*').contains('project_ids', [selectedProject.id]);
      if (invTest.error) console.error("❌ إيرور في invoices:", invTest.error.message);
      else console.log(`✅ المستخلصات: تم سحب (${invTest.data?.length}) سجل بنجاح.`, invTest.data);

      console.log("=========================================");
      alert("تم الفحص! راجع الـ Console (F12) لمعرفة التفاصيل.");
    } catch (err) {
      console.error("حدث خطأ غير متوقع أثناء الفحص:", err);
    }
  };

  // =========================================================================
  // 🚀 3. سحب البيانات المتكاملة للمشاريع وربطها بالـ Dashboard
  // =========================================================================
  const fetchData = async () => {
    setIsLoading(true);
    
    const { data: projData } = await supabase
      .from('projects')
      .select(`*, client:partners!client_id(name)`)
      .order('created_at', { ascending: false });
    
    const { data: dashboardData } = await supabase.rpc('get_project_dashboard');

    if (projData) {
      const enrichedProjects = projData.map(p => {
         const dStats = (dashboardData || []).find((d: any) => d.project_id === p.id) || {};
         return { ...p, ...dStats };
      });
      setProjects(enrichedProjects);
    }

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
                          (p.project_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.unit_type || '').toLowerCase().includes(searchQuery.toLowerCase());
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
      const stagesRes = await supabase.from('project_stages').select('*').eq('project_id', project.id);

      const { data: fullDetails, error } = await supabase.rpc('get_project_full_details', { p_project_id: project.id });
      if (error) throw error;

      // 🚀 إضافة سحب كشف الحساب الموحد من الفيو الجديد (بدون حذف أي شيء)
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('vw_project_comprehensive_ledger')
        .select('*')
        .eq('project_id', project.id)
        .order('التاريخ', { ascending: false });
      if (ledgerError) console.error("Ledger fetch error:", ledgerError);

      const boqData = fullDetails.boq || [];
      const expensesData = fullDetails.expenses || [];
      const materialsData = fullDetails.materials || [];
      const invoicesData = fullDetails.invoices || [];
      const subClaimsData = fullDetails.sub_claims || [];
      const contractorAssignmentsData = fullDetails.contractor_assignments || [];

      const processedInvoices = invoicesData.map((inv: any) => ({
          ...inv,
          display_number: inv.invoice_number,
          display_type: 'مستخلص عام / توريد',
          final_amount: Number(inv.total_amount || inv.taxable_amount || inv.amount || 0)
      }));

      const processedSubClaims = subClaimsData.map((clm: any) => ({
          ...clm,
          display_number: clm.claim_number,
          display_type: `مستخلص مقاول باطن`,
          description: `أعمال مقاولة باطن - ${clm.contractor?.name || 'مقاول باطن'}`,
          final_amount: Number(clm.net_amount || clm.total_amount || 0),
          allocatedAmount: Number(clm.net_amount || clm.total_amount || 0) 
      }));

      const laborLogs = expensesData.filter((e: any) => e.row_type === 'labor_direct' || e.row_type === 'labor_allocated');
      const todayStr = new Date().toISOString().split('T')[0];
      
      const laborStats = {
        todayWorkers: laborLogs.filter((l: any) => l.display_date === todayStr && l.row_type === 'labor_direct').length,
        totalWorkersToDate: laborLogs.filter((l: any) => l.row_type === 'labor_direct').length,
        todayCost: laborLogs.filter((l: any) => l.display_date === todayStr).reduce((sum: number, l: any) => sum + Number(l.amount || 0), 0),
        totalLaborCost: laborLogs.reduce((sum: number, l: any) => sum + Number(l.amount || 0), 0),
      };

      setProjectDetails({
        stages: stagesRes.data || [],
        boq: boqData,
        expenses: expensesData, 
        ledger: ledgerData || [], // 👈 تخزين كشف الحساب الجديد في الـ State
        materials: materialsData,
        invoices: [...processedInvoices, ...processedSubClaims], 
        laborStats: laborStats,
        contractorAssignments: contractorAssignmentsData, 
        inspections: [] 
      });

    } catch (err: any) {
      console.error("❌ خطأ سحب التفاصيل عبر الـ RPC:", err.message);
      showToast(`حدث خطأ أثناء تحميل تفاصيل المشروع: ${err.message}`, "error");
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

  const updateProjectStatus = async (newStatus: string) => {
    if (!selectedProject) return;
    
    const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', selectedProject.id);
    
    if (!error) {
      setSelectedProject({ ...selectedProject, status: newStatus });
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

  // =========================================================================
  // 🚀 4. مؤشرات الـ KPIs (محدثة لتقرأ التكاليف الحقيقية بالملّي)
  // =========================================================================
  const kpis = useMemo(() => {
    if (!selectedProject) return null;
    const totalContract = Number(selectedProject.contract_value) || 0;
    const totalEstimatedBudget = Number(selectedProject.estimated_budget) || 0;
    
    // 🚀 حساب التكلفة الفعلية الدقيقة من واقع الـ BOQ (مواد + عمالة + مصروفات مباشرة)
    let totalActualLabor = 0;
    let totalActualMaterial = 0;
    let totalDirectExpenses = 0;

    // بنفلتر البنود الفرعية بس عشان مجمعش الرئيسي مع الفرعي وأعمل تكرار
    const leafItems = projectDetails.boq.filter((b: any) => !projectDetails.boq.some((child: any) => child.parent_id === b.id));
    
    leafItems.forEach((item: any) => {
      totalActualLabor += Number(item.actual_labor_cost || 0);
      totalActualMaterial += Number(item.actual_material_cost || 0);
      
      const target = normalizeArabic(item.work_item);
      const directExp = projectDetails.expenses
        .filter((e: any) => e.row_type === 'direct' && (normalizeArabic(e.boq_work_item) === target || normalizeArabic(e.description).includes(target) || e.boq_id === item.id))
        .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
      totalDirectExpenses += directExp;
    });

    // 🚀 سحب المصروفات المحملة (Overhead) من أول سطر في المقايسة
    const totalAllocatedOverhead = projectDetails.boq.length > 0 ? Number(projectDetails.boq[0].actual_expenses_cost || 0) : 0;
    
    // 🎯 التكلفة الفعلية الشاملة للمشروع
    const actualCost = totalActualLabor + totalActualMaterial + totalDirectExpenses + totalAllocatedOverhead;

    const totalRevenue = projectDetails.invoices
      .reduce((sum: number, i:any) => sum + (i.allocatedAmount || i.final_amount || 0), 0);
      
    const financialProgress = totalContract > 0 ? ((totalRevenue / totalContract) * 100) : 0;
    const physicalProgress = Number(selectedProject.overall_completion_percentage || 0);
    
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
        if (timeProgress > physicalProgress + 15) timeStatus = 'تأخر زمني 🟠';
      }
    }

    const requiredCashflow = totalEstimatedBudget - actualCost;
    const alerts = [];
    if (budgetHealth === 'red') alerts.push("🚨 تجاوز الميزانية المعتمدة");
    if (timeStatus.includes('تأخر')) alerts.push("⚠️ تأخر في الجدول الزمني مقارنة بنسبة الإنجاز");
    if (totalRevenue < actualCost) alerts.push("💸 التدفق النقدي بالسالب (التكاليف الفعلية أكبر من المحصل)");

    return { 
      totalContract, totalEstimatedBudget, actualCost, totalRevenue, 
      financialProgress: financialProgress.toFixed(1), 
      physicalProgress: physicalProgress.toFixed(1), 
      budgetRatio: (budgetRatio * 100).toFixed(1),
      budgetHealth, timeProgress: timeProgress.toFixed(1), timeStatus, requiredCashflow,
      alerts
    };
  }, [selectedProject, projectDetails]);

  // =========================================================================
  // 🚀 5. تحديث المقارنات الإنشائية (boqAnalysis) لتقرأ من التريجرات المباشرة
  // =========================================================================
  const boqAnalysis = useMemo(() => {
    return projectDetails.boq.map((item: any) => {
      const target = normalizeArabic(item.work_item);
      
      const directExp = projectDetails.expenses
        .filter((e: any) => e.row_type === 'direct' && (normalizeArabic(e.boq_work_item) === target || normalizeArabic(e.description).includes(target) || e.boq_id === item.id))
        .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

      // 🎯 إجمالي التكلفة المباشرة للبند فقط (لعدم تشويه الميزانية بالتكاليف الإدارية المحملة)
      const actualSpentOnItem = Number(item.actual_material_cost || 0) + Number(item.actual_labor_cost || 0) + directExp;

      // 🚀 تم تبديل التشغيل بالخامات في المعادلة التقديرية
      const estimatedCost = Number(item.estimated_labor_cost || 0) + Number(item.estimated_material_cost || 0) + Number(item.estimated_expenses_cost || 0);
      const variance = estimatedCost - actualSpentOnItem;
      
      return {
        ...item,
        actualSpent: actualSpentOnItem,
        variance: variance,
        health: variance >= 0 ? 'safe' : 'over'
      };
    });
  }, [projectDetails]);

  // 🚀 6. تحديث التحليل الشهري
  const monthlyAnalysis = useMemo(() => {
    if (!projectDetails.expenses.length && !projectDetails.invoices.length) return [];
    
    const monthlyData: Record<string, { exp: number, rev: number }> = {};

    projectDetails.expenses.forEach((e: any) => {
      const month = e.display_date?.substring(0, 7) || 'غير محدد'; 
      if (!monthlyData[month]) monthlyData[month] = { exp: 0, rev: 0 };
      monthlyData[month].exp += Number(e.amount || 0); 
    });

    projectDetails.invoices.forEach((i: any) => {
      const month = i.date?.substring(0, 7) || 'غير محدد';
      if (!monthlyData[month]) monthlyData[month] = { exp: 0, rev: 0 };
      monthlyData[month].rev += Number(i.final_amount || i.net_amount || i.amount || 0);
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

    isAddProjectModalOpen, setIsAddProjectModalOpen,
    currentProjectRecord, setCurrentProjectRecord,
    handleSaveProject, isSavingProject: saveProjectMutation.isPending,
    deleteProjectMutation,

    isBoqModalOpen, 
    setIsBoqModalOpen,
    currentBoqRecord, 
    setCurrentBoqRecord,
    handleSaveBoq: (data: any) => saveBoqMutation.mutate(data),
    deleteBoqMutation,
    isSavingBoq: saveBoqMutation.isPending,
    
    importFromLibrary 
  };
}