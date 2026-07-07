import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Alert } from 'react-native';

export interface LaborLog {
  id?: string;
  work_date: string;
  worker_name: string;
  worker_partner_id: string | null;
  site_ref: string;
  project_id: string | null;
  job_order_id: string | null;
  work_item: string;
  work_item_id: string | null;
  unit: string;
  skill_level: string;
  production_desc: string;
  tareeha: string;
  productivity: string;
  completion_percentage: string;
  daily_wage: string;
  attendance_value: number;
  sub_contractor: string;
  sub_contractor_id: string | null;
  notes: string;
  is_posted?: boolean;
}

export function useLaborLogsLogic() {
  const [logs, setLogs] = useState<LaborLog[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('الكل'); // الكل, معتمد, معلق
  
  const defaultLog: LaborLog = {
    work_date: new Date().toISOString().split('T')[0],
    worker_name: '',
    worker_partner_id: null,
    site_ref: '',
    project_id: null,
    job_order_id: null,
    work_item: '',
    work_item_id: null,
    unit: '',
    skill_level: '',
    production_desc: '',
    tareeha: '',
    productivity: '',
    completion_percentage: '',
    daily_wage: '',
    attendance_value: 1,
    sub_contractor: '',
    sub_contractor_id: null,
    notes: ''
  };

  const [projects, setProjects] = useState<any[]>([]);
  const [jobOrders, setJobOrders] = useState<any[]>([]);

  const fetchLogsAndPartners = async () => {
    try {
      const [logsRes, partnersRes, projectsRes, jobOrdersRes] = await Promise.all([
        supabase.from('labor_daily_logs').select('*').order('created_at', { ascending: false }),
        supabase.from('partners').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('job_orders').select('*, boq_budget:boq_budget_id(work_item)')
      ]);

      if (logsRes.error) throw logsRes.error;
      if (partnersRes.error) throw partnersRes.error;
      
      setLogs(logsRes.data || []);
      setPartners(partnersRes.data || []);
      if (projectsRes.data) setProjects(projectsRes.data);
      if (jobOrdersRes.data) setJobOrders(jobOrdersRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogsAndPartners();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogsAndPartners();
  };

  const workersList = partners.filter(p => p.partner_type === 'عامل يومية' || p.partner_type === 'موظف');
  const sitesList = partners.filter(p => p.partner_type === 'جهة داخلية' || p.partner_type === 'عميل' || p.partner_type === 'مقاول');


  const saveLog = async (logData: LaborLog, isEdit: boolean) => {
    try {
      let finalPercentage = logData.completion_percentage;
      const t = parseFloat(logData.tareeha);
      const p = parseFloat(logData.productivity);
      
      if (!isNaN(t) && t > 0 && !isNaN(p)) {
          finalPercentage = String(Math.round((p / t) * 100));
      }

      const payload = {
        ...logData,
        completion_percentage: finalPercentage ? Number(finalPercentage) : null,
        daily_wage: Number(logData.daily_wage) || 0,
        attendance_value: Number(logData.attendance_value ?? 1),
        credit_account_id: '39f878cd-dc58-4a2a-a199-50f6fca983d4',
        debit_account_id: '70d181ba-6385-4c1e-b0fc-d5b1f800dd2c'
      };

      if (isEdit) {
        const { error } = await supabase.from('labor_daily_logs').update(payload).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('labor_daily_logs').insert([payload]);
        if (error) throw error;
      }
      onRefresh();
      return true;
    } catch (err: any) {
      console.error('Error saving labor log:', err);
      Alert.alert('خطأ', 'تعذر حفظ السجل.');
      return false;
    }
  };

  const postLogs = async (ids: string[]) => {
    try {
      const { error } = await supabase.rpc('post_labor_logs_bulk', { p_ids: ids });
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      Alert.alert('خطأ', 'حدث خطأ أثناء الاعتماد');
    }
  };

  const suspendLogs = async (ids: string[]) => {
    try {
      const { error } = await supabase.rpc('unpost_labor_logs_bulk', { record_ids: ids });
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      Alert.alert('خطأ', 'حدث خطأ أثناء فك الترحيل');
    }
  };

  const deleteLogs = async (ids: string[]) => {
    try {
      const { error } = await supabase.rpc('delete_labor_logs_bulk', { p_ids: ids });
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      Alert.alert('خطأ', 'حدث خطأ أثناء الحذف');
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterStatus === 'معتمد') return log.is_posted === true;
    if (filterStatus === 'معلق') return log.is_posted === false;
    return true;
  });

  return {
    logs: filteredLogs,
    loading,
    refreshing,
    onRefresh,
    filterStatus,
    setFilterStatus,
    defaultLog,
    saveLog,
    postLogs,
    suspendLogs,
    deleteLogs,
    workersList,
    sitesList,
    projectsList: projects,
    jobOrdersList: jobOrders,
    partnersList: partners
  };
}
