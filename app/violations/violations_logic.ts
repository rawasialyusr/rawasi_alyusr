"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export function useViolationsLogic() {
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSumFromDB, setTotalSumFromDB] = useState(0); 

  const [searchName, setSearchName] = useState("");
  const [startDate, setStartDate] = useState(""); 
  const [endDate, setEndDate] = useState("");

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // حالة المودال والكاميرا
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    try {
      // 💡 تنبيه: غير 'violations' لاسم الجدول بتاعك في الداتابيز
      let query = supabase.from('violations').select('*').order('date', { ascending: false });

      if (searchName) query = query.ilike('emp_name', `%${searchName}%`);
      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data, error } = await query;
      
      // 🛡️ طباعة الخطأ بالتفصيل عشان نعرف المشكلة منين
      if (error) {
        console.error("❌ تفاصيل خطأ الداتابيز:", error.message);
        return;
      }

      if (data) {
        setViolations(data);
        setTotalSumFromDB(data.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0));
      }
    } catch (error: any) {
      console.error("❌ خطأ غير متوقع في جلب المخالفات:", error.message || error);
    } finally {
      setLoading(false);
    }
  }, [searchName, startDate, endDate]);

  useEffect(() => { fetchViolations(); }, [fetchViolations]);

  // 🧠 الدالة السحرية لسحب المهنة والموقع أوتوماتيك
  const handleEmployeeSelect = async (emp: any) => {
    if (!emp) return;

    try {
      // 1. جلب المهنة من جدول الشركاء (تأكد إن العمود اسمه job_title أو غيره حسب تصميمك)
      const { data: partnerData } = await supabase
        .from('partners')
        .select('job_title') 
        .eq('id', emp.id)
        .single();

      // 2. جلب آخر موقع مسجل للعامل في "اليومية" بتاريخ اليوم
      const today = new Date().toISOString().split('T')[0];
      const { data: logData } = await supabase
        .from('labor_logs') // 👈 تأكد إن ده اسم جدول يومية العمالة عندك
        .select('site_ref')
        .eq('emp_id', emp.id)
        .eq('date', today)
        .limit(1)
        .maybeSingle();

      // 3. دمج البيانات الجديدة جوه المودال
      setEditingRecord((prev: any) => ({
        ...prev,
        emp_id: emp.id,
        emp_name: emp.name,
        profession: partnerData?.job_title || 'غير محدد',
        site_name: logData?.site_ref || 'لم يسجل في يومية اليوم'
      }));
    } catch (err) {
      console.error("❌ خطأ أثناء سحب بيانات العامل:", err);
    }
  };

  const totalCount = violations.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const displayedViolations = useMemo(() => violations.slice(currentPage * pageSize, (currentPage + 1) * pageSize), [violations, currentPage, pageSize]);

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.length} مخالفة؟`)) return;
    try {
      const { error } = await supabase.from('violations').delete().in('id', selectedIds);
      if (error) throw error;
      await fetchViolations(); 
      setSelectedIds([]);
    } catch (err: any) { alert("❌ خطأ: " + err.message); }
  };

  const handleEdit = (record?: any) => {
    setEditingRecord(record ? { ...record } : { date: new Date().toISOString().split('T')[0], amount: 0, reason: '', image_url: null, profession: '', site_name: '' });
    setIsEditModalOpen(true);
  };

  const handleSaveUpdate = async () => {
    if (!editingRecord) return;
    try {
      if (editingRecord.id) {
        // تحديث
        const { error } = await supabase.from('violations').update(editingRecord).eq('id', editingRecord.id);
        if (error) throw error;
      } else {
        // إضافة جديدة
        const { error } = await supabase.from('violations').insert([editingRecord]);
        if (error) throw error;
      }
      await fetchViolations();
      setIsEditModalOpen(false);
      setSelectedIds([]);
    } catch (err: any) { alert("❌ خطأ في الحفظ: " + err.message); }
  };

  const handlePostSelected = async () => { /* لوجيك الترحيل */ };
  const handleUnpostSelected = async () => { /* لوجيك فك الترحيل */ };

  return {
    loading, displayedViolations, 
    searchName, setSearchName, startDate, setStartDate, endDate, setEndDate,
    totalCount, totalPages, totalSumFromDB,
    selectedIds, setSelectedIds, currentPage, setCurrentPage, pageSize, setPageSize,
    handleDelete, handleEdit, isEditModalOpen, setIsEditModalOpen,
    editingRecord, setEditingRecord, handleSaveUpdate,
    handleEmployeeSelect, // 👈 تم تصدير الدالة الجديدة للواجهة
    handlePostSelected, handleUnpostSelected, refresh: fetchViolations
  };
}