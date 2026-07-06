import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export function useBulkBudgetLogic() {
  const [types, setTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  
  const [workItems, setWorkItems] = useState<string[]>([]);
  const [selectedWorkItem, setSelectedWorkItem] = useState<string>('');

  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [availableUnitTypes, setAvailableUnitTypes] = useState<string[]>([]);
  const [selectedUnitType, setSelectedUnitType] = useState<string>('');
  
  // 'all' | 'registered' | 'unregistered'
  const [registrationFilter, setRegistrationFilter] = useState<string>('all');

  // 1. Fetch unique item types and unit types on mount
  useEffect(() => {
    const fetchTypes = async () => {
      // Fetch item_type
      const { data, error } = await supabase.from('boq_budget')
         .select('item_type')
         .not('item_type', 'is', null);
      if (data) {
         const unique = Array.from(new Set(data.map(d => d.item_type))).filter(Boolean);
         setTypes(unique as string[]);
      }

      // Fetch unit_type
      const { data: unitData } = await supabase.from('projects')
         .select('unit_type')
         .not('unit_type', 'is', null);
      if (unitData) {
         const uniqueUnits = Array.from(new Set(unitData.map(d => d.unit_type))).filter(Boolean);
         setAvailableUnitTypes(uniqueUnits as string[]);
      }
    };
    fetchTypes();
  }, []);

  // 2. When selectedType changes, fetch unique work_items for that type
  useEffect(() => {
    const fetchItems = async () => {
      if (!selectedType) {
        setWorkItems([]);
        return;
      }
      const { data, error } = await supabase.from('boq_budget')
        .select('work_item')
        .eq('item_type', selectedType)
        .not('work_item', 'is', null);
      if (data) {
        const unique = Array.from(new Set(data.map(d => d.work_item))).filter(Boolean);
        setWorkItems(unique as string[]);
      }
    };
    fetchItems();
  }, [selectedType]);

  // 3. When selectedWorkItem changes, fetch all projects and match their budgets for this work_item
  useEffect(() => {
    const fetchBudgets = async () => {
      if (!selectedWorkItem) {
        setBudgets([]);
        return;
      }
      setLoading(true);

      try {
        // Fetch ALL projects
        const { data: allProjects, error: projectsError } = await supabase.from('projects')
          .select('id, Property, unit_type, unit_area');
        
        if (projectsError) throw projectsError;

        // Fetch existing budgets for this work_item
        const { data: existingBudgets, error: budgetError } = await supabase.from('boq_budget')
          .select('*')
          .eq('work_item', selectedWorkItem);
          
        if (budgetError) throw budgetError;

        // Map every project to a budget row (existing or a new template)
        const mappedBudgets = (allProjects || []).map(project => {
          const existing = (existingBudgets || []).find(b => b.project_id === project.id);
          
          if (existing) {
            return {
              ...existing,
              projects: project // keep the nested project object for UI filtering
            };
          } else {
            return {
              id: crypto.randomUUID(),
              _isNew: true, // internal flag
              project_id: project.id,
              work_item: selectedWorkItem,
              item_type: selectedType,
              contract_quantity: 0,
              unit_contract_price: 0,
              estimated_material_cost: 0,
              estimated_labor_cost: 0,
              estimated_expenses_cost: 0,
              projects: project
            };
          }
        });

        // Sort alphabetically by Property name
        const sorted = mappedBudgets.sort((a, b) => {
           const pA = a.projects?.Property || '';
           const pB = b.projects?.Property || '';
           return pA.localeCompare(pB, 'ar');
        });
        setBudgets(sorted);

      } catch (error: any) {
        toast.error("حدث خطأ أثناء جلب الفلل والموازنات");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchBudgets();
  }, [selectedWorkItem]);

  const handleFieldChange = (id: string, field: string, value: number) => {
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const handleBulkSave = async () => {
    if (budgets.length === 0) return;
    setIsSaving(true);
    
    // Create the payload for upsert, stripping out joined relations and generated columns
    const activeBudgets = budgets
      // Only process rows that have actual values entered
      .filter(b => !b._isNew || b.contract_quantity > 0 || b.unit_contract_price > 0 || b.estimated_material_cost > 0 || b.estimated_labor_cost > 0 || b.estimated_expenses_cost > 0);

    if (activeBudgets.length === 0) {
      toast.error("لا توجد موازنات ليتم حفظها");
      setIsSaving(false);
      return;
    }

    // Separate into Inserts and Updates to prevent Supabase 400 errors with IDs
    const inserts = activeBudgets.filter(b => b._isNew).map(b => ({
      project_id: b.project_id,
      work_item: b.work_item,
      item_type: b.item_type || 'رئيسي',
      contract_quantity: b.contract_quantity || 0,
      unit_contract_price: b.unit_contract_price || 0,
      estimated_material_cost: b.estimated_material_cost || 0,
      estimated_labor_cost: b.estimated_labor_cost || 0,
      estimated_expenses_cost: b.estimated_expenses_cost || 0
    }));

    const updates = activeBudgets.filter(b => !b._isNew).map(b => ({
      id: b.id,
      project_id: b.project_id,
      work_item: b.work_item,
      item_type: b.item_type || 'رئيسي',
      contract_quantity: b.contract_quantity || 0,
      unit_contract_price: b.unit_contract_price || 0,
      estimated_material_cost: b.estimated_material_cost || 0,
      estimated_labor_cost: b.estimated_labor_cost || 0,
      estimated_expenses_cost: b.estimated_expenses_cost || 0
    }));

    try {
      let savedData: any[] = [];

      if (inserts.length > 0) {
        const { data: inserted, error: insertError } = await supabase.from('boq_budget')
          .insert(inserts)
          .select('id, contract_quantity, unit_contract_price');
        if (insertError) throw insertError;
        if (inserted) savedData = [...savedData, ...inserted];
      }

      if (updates.length > 0) {
        const { data: updated, error: updateError } = await supabase.from('boq_budget')
          .upsert(updates, { onConflict: 'id' })
          .select('id, contract_quantity, unit_contract_price');
        if (updateError) throw updateError;
        if (updated) savedData = [...savedData, ...updated];
      }

      // Update linked Job Orders
      if (savedData && savedData.length > 0) {
        for (const b of savedData) {
          await supabase.from('job_orders')
            .update({ 
              assigned_qty: b.contract_quantity, 
              unit_price: b.unit_contract_price 
            })
            .eq('boq_budget_id', b.id);
        }
      }
      toast.success("تم تطبيق التعديلات على جميع الفلل وتحديث أوامر الشغل بنجاح");
    } catch (error: any) {
      toast.error("فشل الحفظ: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };


  let filteredBudgets = selectedUnitType ? budgets.filter(b => b.projects?.unit_type === selectedUnitType) : budgets;
  
  if (registrationFilter === 'registered') {
    filteredBudgets = filteredBudgets.filter(b => !b._isNew);
  } else if (registrationFilter === 'unregistered') {
    filteredBudgets = filteredBudgets.filter(b => b._isNew);
  }

  return {
    types,
    selectedType,
    setSelectedType,
    workItems,
    selectedWorkItem,
    setSelectedWorkItem,
    availableUnitTypes,
    selectedUnitType,
    setSelectedUnitType,
    registrationFilter,
    setRegistrationFilter,
    budgets: filteredBudgets,
    rawBudgets: budgets,
    loading,
    isSaving,
    handleFieldChange,
    handleBulkSave
  };
}
