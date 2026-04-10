"use client";
import { useState, useEffect, useMemo } from 'react';
import { getAllEmployeesAction } from '@/app/actions/add_action_action'; 

export function useAddActionLogic() {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('daily');
  const [allEmployees, setAllEmployees] = useState<any[]>([]); 
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

  // جلب البيانات عند فتح الصفحة
  useEffect(() => {
    const fetchEmps = async () => {
      try {
        console.log("جاري جلب الموظفين من السيرفر...");
        const data = await getAllEmployeesAction(); 
        
        console.log("البيانات المستلمة:", data); // عشان تشوف الـ Array في المتصفح

        if (data && Array.isArray(data)) {
          // ترتيب الأسماء أبجدياً مع مراعاة اختلاف حالة الأحرف في سوبابيز
          const sorted = [...data].sort((a: any, b: any) => {
            const nameA = a.emp_name || a.Emp_Name || '';
            const nameB = b.emp_name || b.Emp_Name || '';
            return nameA.localeCompare(nameB, 'ar');
          });
          setAllEmployees(sorted);
        }
      } catch (err) { 
        console.error("خطأ في جلب البيانات:", err); 
      }
    };
    fetchEmps();
  }, []);

  // تصفية الأسماء بناءً على البحث
  const filteredEmployees = useMemo(() => {
    // لو مفيش بحث، اظهر أول 10 كمقترح، لو البحث شغال فلتر الكل
    const list = searchTerm 
      ? allEmployees.filter(emp => {
          const name = (emp.emp_name || emp.Emp_Name || '').toLowerCase();
          return name.includes(searchTerm.toLowerCase());
        })
      : allEmployees.slice(0, 10); 
    
    return list;
  }, [allEmployees, searchTerm]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectEmployee = (emp: any) => {
    // دمج ذكي للبيانات: بياخد الاسم والمهنة والمستوى سواء حروف كبيرة أو صغيرة
    setFormData(prev => ({
      ...prev,
      emp_name: emp.emp_name || emp.Emp_Name || '',
      item: emp.item || emp.Item || prev.item,
      sk_level: emp.sk_level || emp.SK_Level || prev.sk_level,
      d_w: emp.d_w || emp.D_W || prev.d_w,
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
        // إعادة تصغير النموذج بعد الحفظ (تصفير الخانات المتغيرة فقط)
        setFormData(prev => ({ ...prev, amount: '', d_w: '', prod: '', notes: '', reason: '' }));
      } else {
        alert('فشل الحفظ في قاعدة البيانات');
      }
    } catch (err) { 
      alert('حدث خطأ في الاتصال بالسيرفر'); 
    } finally { 
      setLoading(false); 
    }
  };

  return { 
    type, setType, formData, updateField, submitAction, loading, 
    employees: filteredEmployees,
    searchTerm, setSearchTerm, 
    isDropdownOpen, setIsDropdownOpen,
    handleSelectEmployee 
  };
}