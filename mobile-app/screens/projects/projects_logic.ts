import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

export function useProjectsLogic() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 🚀 حالة تفاصيل المشروع (لشاشة Project Details)
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [projectDetails, setProjectDetails] = useState<any>({
    stages: [], boq: [], expenses: [], ledger: [], invoices: [], inspections: [], laborStats: null, materials: [], contractorAssignments: []
  });
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects();
  };

  const getStatusColor = (status: string) => {
    if (status === 'قيد التنفيذ' || status === 'جاري التنفيذ') return { bg: '#dcfce7', text: '#166534' };
    if (status === 'مكتمل') return { bg: '#dbeafe', text: '#1e40af' };
    if (status === 'متوقف') return { bg: '#fee2e2', text: '#991b1b' };
    return { bg: '#f1f5f9', text: '#475569' };
  };

  // 🚀 جلب كافة تفاصيل المشروع عبر الـ RPC
  const loadProjectDetails = async (projectId: string) => {
    setIsDetailsLoading(true);
    try {
      // Fetch basic info if not already selected
      const { data: projData, error: projErr } = await supabase.from('projects').select('*').eq('id', projectId).single();
      if (projErr) throw projErr;
      setSelectedProject(projData);

      const { data: fullDetails, error } = await supabase.rpc('get_project_full_details', { p_project_id: projectId });
      if (error) throw error;

      // حسابات الـ ABC
      const { data: abcAllocations } = await supabase.from('advanced_cost_allocation_view').select('*').eq('project_id', projectId);
      const abcMap: Record<string, number> = {};
      abcAllocations?.forEach((alloc: any) => {
          const bId = alloc.boq_budget_id || alloc.boq_item_id;
          if (bId) {
              abcMap[bId] = (abcMap[bId] || 0) + Number(alloc['المبلغ المحمل (ر.س)'] || alloc['loaded_amount'] || 0);
          }
      });

      const rawBoqData = fullDetails.boq || [];
      const boqDataWithAllocations = rawBoqData.map((item: any) => {
          if (item.item_type === 'فرعي' || !item.item_type) {
              const allocated = abcMap[item.id] || 0;
              return {
                  ...item,
                  allocated_expenses: allocated,
                  item_net_profit: Number(item.item_net_profit || 0) - allocated,
                  total_budget_variance: Number(item.total_budget_variance || 0) - allocated
              };
          }
          return item; 
      });

      const finalBoqData = boqDataWithAllocations.map((item: any) => {
          if (item.item_type === 'رئيسي') {
              const children = boqDataWithAllocations.filter((child: any) => child.parent_id === item.id);
              const totalAllocated = children.reduce((sum: number, child: any) => sum + (Number(child.allocated_expenses) || 0), 0);
              return {
                  ...item,
                  allocated_expenses: totalAllocated,
                  item_net_profit: Number(item.item_net_profit || 0) - totalAllocated,
                  total_budget_variance: Number(item.total_budget_variance || 0) - totalAllocated
              };
          }
          return item;
      });

      const expensesData = fullDetails.expenses || [];
      const materialsData = fullDetails.materials || [];
      const invoicesData = fullDetails.invoices || [];
      const subClaimsData = fullDetails.sub_claims || [];

      const processedInvoices = invoicesData.map((inv: any) => ({
          ...inv, display_number: inv.invoice_number, display_type: 'مستخلص عام / توريد', final_amount: Number(inv.total_amount || 0)
      }));

      const processedSubClaims = subClaimsData.map((clm: any) => ({
          ...clm, display_number: clm.claim_number, display_type: `مستخلص مقاول باطن`, final_amount: Number(clm.net_amount || 0)
      }));

      setProjectDetails({
        stages: [], 
        boq: finalBoqData, 
        expenses: expensesData, 
        ledger: [], 
        materials: materialsData,
        invoices: [...processedInvoices, ...processedSubClaims], 
        laborStats: null, 
        contractorAssignments: fullDetails.contractor_assignments || [], 
        inspections: [] 
      });

    } catch (err: any) {
      console.error(`Error loading project details: ${err.message}`);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const kpis = useMemo(() => {
    if (!selectedProject) return null;
    const totalContract = Number(selectedProject.contract_value) || 0;
    const totalEstimatedBudget = Number(selectedProject.estimated_budget) || 0;
    
    let totalActualLabor = 0, totalActualMaterial = 0, totalDirectExpenses = 0, totalABCAllocated = 0;

    const leafItems = projectDetails.boq.filter((b: any) => !projectDetails.boq.some((child: any) => child.parent_id === b.id));
    
    leafItems.forEach((item: any) => {
      totalActualLabor += Number(item.actual_labor_cost || 0);
      totalActualMaterial += Number(item.actual_material_cost || 0);
      totalABCAllocated += Number(item.allocated_expenses || 0);
      totalDirectExpenses += Number(item.actual_expenses_cost || 0);
    });

    const actualCost = totalActualLabor + totalActualMaterial + totalDirectExpenses + totalABCAllocated;
    const totalRevenue = projectDetails.invoices.reduce((sum: number, i:any) => sum + (i.final_amount || 0), 0);
    const financialProgress = totalContract > 0 ? ((totalRevenue / totalContract) * 100) : 0;
    const physicalProgress = Number(selectedProject.overall_completion_percentage || 0);
    
    const budgetRatio = totalEstimatedBudget > 0 ? (actualCost / totalEstimatedBudget) : 0;
    let budgetHealth = 'green';
    if (budgetRatio > 1.1) budgetHealth = 'red';
    else if (budgetRatio > 0.9) budgetHealth = 'yellow';

    return { 
      totalContract, totalEstimatedBudget, actualCost, totalRevenue, 
      financialProgress: financialProgress.toFixed(1), physicalProgress: physicalProgress.toFixed(1), 
      budgetRatio: (budgetRatio * 100).toFixed(1), budgetHealth
    };
  }, [selectedProject, projectDetails]);

  return {
    projects,
    loading,
    refreshing,
    onRefresh,
    getStatusColor,
    
    selectedProject,
    projectDetails,
    isDetailsLoading,
    loadProjectDetails,
    activeTab,
    setActiveTab,
    kpis
  };
}
