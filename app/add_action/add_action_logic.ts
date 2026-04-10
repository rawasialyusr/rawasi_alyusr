"use client";
import { useState, useEffect, useMemo } from 'react';

export function useAddActionLogic() {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('daily');
  const [allEmployees, setAllEmployees] = useState<any[]>([]); // الاحتفاظ بالقائمة كاملة للبحث
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    emp_name: '',
    main_cont: '', site: '', item: '', sk_level: '', prod: '', unit: '', d_w: '', attendance: '1',
    amount: '', reason: '', period: '',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    const fetchEmps = async () => {
      try {
        const res = await fetch('/api/all_emp');
        const data = await res.json();
        const sorted = Array.isArray(data) ? data.sort((a, b) => 
          (a.Emp_Name || a.emp_name || '').localeCompare(b.Emp_Name || b.emp_name || '', 'ar')
        ) : [];
        setAllEmployees(sorted);
      } catch (err) { console.error("خطأ:", err); }
    };
    fetchEmps();
  }, []);

  // الفلترة بناءً على ما يكتبه المستخدم
  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return [];
    return allEmployees.filter(emp => {
      const name = (emp.Emp_Name || emp.emp_name || '').toLowerCase();
      return name.includes(searchTerm.toLowerCase());
    });
  }, [allEmployees, searchTerm]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ✅ الدالة الجديدة لسحب البيانات تلقائياً عند الاختيار
  const handleSelectEmployee = (emp: any) => {
    const name = emp.Emp_Name || emp.emp_name;
    
    setFormData(prev => ({
      ...prev,
      emp_name: name,
      // سحب البيانات من سجل الموظف المختار (تأكد من مطابقة أسماء الحقول في الـ API)
      item: emp.Item || emp.item || prev.item,
      sk_level: emp.SK_Level || emp.sk_level || prev.sk_level,
      d_w: emp.D_W || emp.d_w || prev.d_w,
    }));
    
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const submitAction = async () => {
    if (!formData.emp_name) return alert("⚠️ يرجى اختيار اسم الموظف أولاً");
    setLoading(true);
    const apiMap: Record<string, string> = {
      daily: '/api/daily_report',
      advance: '/api/emp_adv',
      deduction: '/api/emp_ded',
      housing: '/api/housing'
    };

    try {
      const response = await fetch(apiMap[type], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        alert('تم الحفظ بنجاح ✅');
        setFormData(prev => ({ ...prev, amount: '', d_w: '', prod: '', notes: '', reason: '' }));
      }
    } catch (err) { alert('حدث خطأ'); } finally { setLoading(false); }
  };

  return { 
    type, setType, formData, updateField, submitAction, loading, 
    employees: filteredEmployees,
    searchTerm, setSearchTerm, 
    isDropdownOpen, setIsDropdownOpen,
    handleSelectEmployee // تصدير الدالة للاستخدام في الصفحة
  };
}