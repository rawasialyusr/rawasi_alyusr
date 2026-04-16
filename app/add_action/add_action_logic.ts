"use client";

import { useState, useEffect } from 'react';
import { getFinancialDropdowns, submitJournalEntry } from '../actions/financial_actions';
import { searchEmployees } from '../actions/all_emp_action';
import { submitHrAction } from '../actions/add_action_action';

const initialFormState = {
  emp_id: '', emp_name: '', date: new Date().toISOString().split('T')[0],
  main_cont: '', site: '', item: '', sk_level: '', prod: '', unit: '',
  d_w: '', attendance: '1', amount: '0', period: '', reason: '', notes: '',
  description: '', project_id: '', partner_id: '', primary_account: '',
  secondary_account: '', qty: '1', price: '0', invoice_no: '',
  asset_name: '', service_type: '',
};

export function useAddActionLogic() {
  const [type, setType] = useState<string>('daily');
  // إدارة وضع المصروف هنا لتوحيد اللوجيك
  const [expenseMode, setExpenseMode] = useState<'general' | 'salary' | 'contractor' | 'fuel' | 'materials' | 'rent' | 'operations'>('general');
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdowns, setDropdowns] = useState({ projects: [], partners: [], accounts: [] });

  // 1. جلب البيانات المالية
  useEffect(() => {
    async function loadData() {
      const data = await getFinancialDropdowns();
      if (data) setDropdowns({ projects: data.projects || [], partners: data.partners || [], accounts: data.accounts || [] });
    }
    loadData();
  }, []);

  // 2. بحث الموظفين
  useEffect(() => {
    if (searchTerm.length < 2) { setEmployees([]); return; }
    const delay = setTimeout(() => { searchEmployees(searchTerm).then(setEmployees); }, 300);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  // 3. الحساب التلقائي (الكمية x السعر)
  useEffect(() => {
    const modesWithCalc = ['general', 'fuel', 'materials', 'operations'];
    if (type === 'expense' && modesWithCalc.includes(expenseMode)) {
      const total = (parseFloat(formData.qty) || 0) * (parseFloat(formData.price) || 0);
      setFormData(prev => ({ ...prev, amount: total.toString() }));
    }
  }, [formData.qty, formData.price, expenseMode, type]);

  const updateField = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSelectEmployee = (emp: any) => {
    updateField('emp_id', emp.id || emp.emp_id);
    updateField('emp_name', emp.emp_name);
    setSearchTerm(emp.emp_name);
    setIsDropdownOpen(false);
  };

  // 4. وظيفة الفلترة (تم تحسينها لتناسب أكواد سوبا بيز في الصورة)
  const getFilteredAccounts = () => {
    const all = dropdowns.accounts || [];
    if (type === 'revenue') return all.filter((a: any) => a.account_type === 'إيرادات');
    
    let filtered = [];
    switch (expenseMode) {
      case 'general': filtered = all.filter((a: any) => a.code?.startsWith('53')); break;
      case 'operations': filtered = all.filter((a: any) => a.code?.startsWith('52')); break;
      case 'materials': filtered = all.filter((a: any) => a.code?.startsWith('5101')); break;
      case 'contractor': filtered = all.filter((a: any) => a.code?.startsWith('5102')); break;
      case 'salary': filtered = all.filter((a: any) => a.code?.startsWith('5103') || a.code?.startsWith('5104')); break;
      case 'fuel': filtered = all.filter((a: any) => a.code?.startsWith('5201')); break;
      case 'rent': filtered = all.filter((a: any) => a.code?.startsWith('5301')); break;
      default: filtered = all.filter((a: any) => a.account_type === 'مصروفات');
    }
    return filtered.length > 0 ? filtered : all.filter((a: any) => a.account_type === 'مصروفات');
  };

  const submitAction = async () => {
    setLoading(true);
    try {
      const result = (type === 'expense' || type === 'revenue') 
        ? await submitJournalEntry({ ...formData, type, expenseMode })
        : await submitHrAction(type, formData);
      if (result.success) { alert('✅ تم الحفظ!'); setFormData(initialFormState); }
      else alert('❌ ' + result.message);
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  return {
    type, setType, expenseMode, setExpenseMode, formData, updateField, submitAction, loading,
    employees, searchTerm, setSearchTerm, isDropdownOpen, setIsDropdownOpen,
    handleSelectEmployee, dropdowns, filteredAccounts: getFilteredAccounts()
  };
}