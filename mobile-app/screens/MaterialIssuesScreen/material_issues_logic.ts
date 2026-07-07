import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

export function useMaterialIssuesLogic() {
  const [issues, setIssues] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [partnersList, setPartnersList] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [boqItems, setBoqItems] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [filterStatus, setFilterStatus] = useState('الكل');

  const fetchAll = async (table: string, selectQuery: string = '*', orderCol?: string) => {
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
      let query = supabase.from(table).select(selectQuery).range(from, from + step - 1);
      if (orderCol) query = query.order(orderCol, { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (!data || data.length === 0) break;
      allData = [...allData, ...data];
      if (data.length < step) break;
      from += step;
    }
    return allData;
  };

  const fetchInventoryItems = async () => {
    try {
      const { data, error } = await supabase.rpc('rpc_get_inventory_balances');
      if (error) throw error;
      return data?.map((d: any) => ({ ...d, id: d.item_id })) || [];
    } catch (err: any) {
      console.error("Error fetching inventory balances:", err.message);
      return [];
    }
  };

  const fetchData = async () => {
    try {
      const issuesQuery = `*, project:projects(Property, project_name), subcontractor:partners(name), lines:material_issue_lines(*, boq:boq_budget(work_item))`;
      
      const [issuesData, projectsData, partnersData, boqData, invItems] = await Promise.all([
        fetchAll('material_issues', issuesQuery, 'created_at'),
        fetchAll('projects', '*'),
        fetchAll('partners', '*'),
        fetchAll('boq_budget', '*'),
        fetchInventoryItems()
      ]);

      setIssues(issuesData);
      setProjectsList(projectsData);
      setPartnersList(partnersData);
      setBoqItems(boqData);
      setInventoryItems(invItems);
    } catch (error: any) {
      console.error('Error fetching material issues data:', error.message);
      Toast.show({ type: 'error', text1: 'خطأ', text2: 'حدث خطأ أثناء جلب البيانات' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const deleteIssues = async (ids: string[]) => {
    try {
      const { error } = await supabase.rpc('rpc_delete_material_issues_bulk', { issue_ids: ids });
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'نجاح', text2: 'تم الحذف بنجاح' });
      fetchData();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'خطأ', text2: error.message });
    }
  };

  const postIssues = async (ids: string[]) => {
    try {
      const { error } = await supabase.rpc('rpc_post_material_issues', { issue_ids: ids });
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'نجاح', text2: 'تم الاعتماد بنجاح' });
      fetchData();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'خطأ', text2: error.message });
    }
  };

  const suspendIssues = async (ids: string[]) => {
    try {
      const { error } = await supabase.rpc('rpc_unpost_material_issues', { issue_ids: ids });
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'نجاح', text2: 'تم فك الترحيل بنجاح' });
      fetchData();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'خطأ', text2: error.message });
    }
  };

  const saveIssue = async (data: any, isEdit: boolean) => {
    try {
      const { error } = await supabase.rpc('rpc_save_material_issue_v2', {
        p_issue_id: data.id || null,
        p_project_id: data.project_id || null,
        p_subcontractor_id: data.subcontractor_id || null,
        p_issue_date: data.issue_date || new Date().toISOString().split('T')[0],
        p_issue_type: data.issue_type || 'صرف لمقاول',
        p_notes: data.notes || '',
        p_contractor_text_name: data.contractor_text_name || null,
        p_lines_json: data.items || []
      });
      if (error) throw error;
      
      Toast.show({ type: 'success', text1: 'نجاح', text2: 'تم الحفظ بنجاح' });
      fetchData();
      return true;
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'خطأ', text2: error.message });
      return false;
    }
  };

  return {
    issues, loading, refreshing, onRefresh,
    filterStatus, setFilterStatus,
    deleteIssues, postIssues, suspendIssues, saveIssue,
    projectsList, partnersList, inventoryItems, boqItems
  };
}
