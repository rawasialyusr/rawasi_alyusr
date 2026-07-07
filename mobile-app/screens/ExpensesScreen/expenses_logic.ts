import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

export function useExpensesLogic() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [partnersList, setPartnersList] = useState<any[]>([]);
  const [jobOrdersList, setJobOrdersList] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [paymentFilter, setPaymentFilter] = useState('الكل');

  const fetchAll = async (table: string, orderCol?: string) => {
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
      let query = supabase.from(table).select('*').range(from, from + step - 1);
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

  const fetchData = async () => {
    try {
      const [expensesData, projectsData, accountsData, partnersData, jobOrdersData] = await Promise.all([
        fetchAll('expenses', 'created_at'),
        fetchAll('projects'),
        fetchAll('accounts'),
        fetchAll('partners'),
        fetchAll('job_orders')
      ]);

      setExpenses(expensesData);
      setProjectsList(projectsData);
      setAccountsList(accountsData);
      setPartnersList(partnersData);
      setJobOrdersList(jobOrdersData);
    } catch (error: any) {
      console.error('Error fetching expenses data:', error.message);
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

  const deleteExpenses = async (ids: string[]) => {
    try {
      const { error } = await supabase.from('expenses').delete().in('id', ids);
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'نجاح', text2: 'تم الحذف بنجاح' });
      fetchData();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'خطأ', text2: error.message });
    }
  };

  const postExpenses = async (ids: string[]) => {
    try {
      const { error } = await supabase.rpc('post_expenses_bulk', { p_ids: ids });
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'نجاح', text2: 'تم الترحيل بنجاح' });
      fetchData();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'خطأ', text2: error.message });
    }
  };

  const suspendExpenses = async (ids: string[]) => {
    try {
      const { error } = await supabase.rpc('unpost_expenses_bulk', { record_ids: ids });
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'نجاح', text2: 'تم فك الترحيل بنجاح' });
      fetchData();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'خطأ', text2: error.message });
    }
  };

  const payExpensesBulk = async (ids: string[]) => {
    try {
      // Pass a dummy user id since mobile auth isn't fully integrated yet, or skip if not needed by rpc
      const { error } = await supabase.rpc('bulk_disburse_v2', { p_ids: ids, p_user_id: '00000000-0000-0000-0000-000000000000' });
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'نجاح', text2: 'تم الصرف المجمع بنجاح' });
      fetchData();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'خطأ', text2: error.message });
    }
  };

  const saveExpense = async (data: any, isEdit: boolean) => {
    try {
      if (isEdit && data.id) {
        const { error } = await supabase.from('expenses').update(data).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expenses').insert([data]);
        if (error) throw error;
      }
      Toast.show({ type: 'success', text1: 'نجاح', text2: 'تم الحفظ بنجاح' });
      fetchData();
      return true;
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'خطأ', text2: error.message });
      return false;
    }
  };

  return {
    expenses, loading, refreshing, onRefresh,
    filterStatus, setFilterStatus, paymentFilter, setPaymentFilter,
    deleteExpenses, postExpenses, suspendExpenses, payExpensesBulk, saveExpense,
    projectsList, accountsList, partnersList, jobOrdersList
  };
}
