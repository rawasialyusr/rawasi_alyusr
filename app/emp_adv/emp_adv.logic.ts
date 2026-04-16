"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase'; // الربط المباشر بسوبابيز

export function useEmpAdvLogic() {
  const [advances, setAdvances] = useState<any[]>([]);
  const [totalSumFromBackend, setTotalSumFromBackend] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // فلاتر البحث
  const [searchName, setSearchName] = useState("");
  const [searchSite, setSearchSite] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // الترقيم والعرض
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  
  // التعديل
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  // 1. وظيفة جلب البيانات (عوضاً عن الأكشن المحذوف)
  const fetchAdvances = useCallback(async () => {
    setLoading(true);
    try {
      // بناء الاستعلام (Query Builder)
      let query = supabase.from('emp_adv').select('*');

      // تطبيق فلاتر البحث (Name, Date)
      if (searchName.trim()) query = query.ilike('emp_name', `%${searchName}%`);
      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;

      const resultData = data || [];
      setAdvances(resultData);

      // حساب المجموع الكلي (Total Sum) بدقة من البيانات القادمة
      const sum = resultData.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
      setTotalSumFromBackend(sum);

    } catch (err: any) {
      console.error("Fetch Error:", err.message);
      alert("حدث خطأ أثناء جلب البيانات");
    } finally {
      setLoading(false);
    }
  }, [searchName, startDate, endDate]);

  useEffect(() => { fetchAdvances(); }, [fetchAdvances]);

  // 2. الفلترة الجانبية للموقع (Site) - بناءً على الملاحظات أو الوصف
  const filteredAdvances = useMemo(() => {
    return advances.filter(adv => 
      (adv.notes || adv.Desc || "").toLowerCase().includes(searchSite.toLowerCase())
    );
  }, [advances, searchSite]);

  // 3. إجمالي المبالغ الذكي
  const totalAdvanceVal = useMemo(() => {
    if (searchSite.trim() !== "") {
      return filteredAdvances.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }
    return totalSumFromBackend;
  }, [filteredAdvances, totalSumFromBackend, searchSite]);

  // 4. الترقيم (Pagination)
  const displayedAdvances = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredAdvances.slice(start, start + pageSize);
  }, [filteredAdvances, currentPage, pageSize]);

  // 5. وظائف التحكم (الحذف والترحيل)
  const handleDelete = async () => {
    if (!selectedIds.length || !confirm(`سيتم حذف ${selectedIds.length} سجل نهائياً. هل أنت متأكد؟`)) return;
    
    setLoading(true);
    const { error } = await supabase.from('emp_adv').delete().in('id', selectedIds);
    
    if (!error) {
      alert("تم الحذف بنجاح ✅");
      setSelectedIds([]);
      await fetchAdvances();
    } else {
      alert("فشل الحذف: " + error.message);
    }
    setLoading(false);
  };

  const handlePostSelected = async () => {
    if (!selectedIds.length) return;
    setLoading(true);
    const { error } = await supabase.from('emp_adv').update({ is_posted: true }).in('id', selectedIds);
    if (!error) {
      alert("تم الترحيل للدفاتر بنجاح ✅");
      setSelectedIds([]);
      await fetchAdvances();
    }
    setLoading(false);
  };

  const handleUnpostSelected = async () => {
    if (!selectedIds.length) return;
    const { error } = await supabase.from('emp_adv').update({ is_posted: false }).in('id', selectedIds);
    if (!error) await fetchAdvances();
  };

  // 6. اختيار الصفوف والتعديل
  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const currentVisibleIds = displayedAdvances.map(a => String(a.id));
    const allVisibleSelected = currentVisibleIds.every(id => selectedIds.includes(id));
    if (allVisibleSelected) {
      setSelectedIds(prev => prev.filter(id => !currentVisibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentVisibleIds])));
    }
  };

  const handleEdit = () => {
    const record = advances.find(a => String(a.id) === selectedIds[0]);
    if (record) { setEditingRecord({...record}); setIsEditModalOpen(true); }
  };

  return {
    loading, totalAdvanceVal, searchName, setSearchName, searchSite, setSearchSite,
    startDate, setStartDate, endDate, setEndDate, selectedIds, setSelectedIds,
    currentPage, setCurrentPage, pageSize, setPageSize, 
    totalCount: filteredAdvances.length,
    totalPages: Math.ceil(filteredAdvances.length / pageSize),
    displayedAdvances, isEditModalOpen, setIsEditModalOpen, editingRecord, setEditingRecord,
    handleSaveUpdate: async () => { setIsEditModalOpen(false); await fetchAdvances(); },
    exportToExcel: () => console.log("تصدير إكسل للـ 1288 سجل..."),
    handleDelete, handlePostSelected, handleUnpostSelected,
    toggleSelectRow, toggleSelectAll, handleEdit, fetchAdvances
  };
}