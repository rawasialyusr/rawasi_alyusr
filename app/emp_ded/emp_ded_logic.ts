"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase'; // 👈 استدعاء مباشر من Supabase بدلاً من الأكشن

export function useEmpDedLogic() {
  const [deductions, setDeductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSumFromDB, setTotalSumFromDB] = useState(0); // المجموع الكلي
  
  // فلاتر البحث
  const [searchName, setSearchName] = useState("");
  const [searchReason, setSearchReason] = useState(""); 
  const [startDate, setStartDate] = useState(""); 
  const [endDate, setEndDate] = useState("");

  // الترقيم والتحكم (Pagination)
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // حالة التعديل (Modal)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  // 1. جلب البيانات (الربط المباشر مع Supabase)
  const fetchDeductions = useCallback(async () => {
    setLoading(true);
    try {
      // بناء الاستعلام (تأكد أن اسم الجدول هو emp_deductions أو عدله حسب قاعدة بياناتك)
      let query = supabase
        .from('emp_deductions') 
        .select('*')
        .order('date', { ascending: false });

      // تطبيق فلاتر البحث في الداتابيز مباشرة لتقليل التحميل
      if (searchName) {
        query = query.ilike('emp_name', `%${searchName}%`); // البحث بجزء من الاسم
      }
      if (startDate) {
        query = query.gte('date', startDate); // من تاريخ كذا
      }

      const { data, error } = await query;
      
      if (error) throw error;

      if (data) {
        setDeductions(data);
        // حساب المجموع الكلي للبيانات القادمة من الداتابيز لضمان دقة الإجمالي
        const sum = data.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        setTotalSumFromDB(sum);
      }
    } catch (error) {
      console.error("❌ خطأ في جلب البيانات:", error);
    } finally {
      setLoading(false);
    }
  }, [searchName, startDate]);

  useEffect(() => {
    fetchDeductions();
  }, [fetchDeductions]);

  // 2. الفلترة المتقدمة (تصفية النتائج محلياً للسبب ونطاق التاريخ النهائي)
  const filteredDeductions = useMemo(() => {
    return deductions.filter(item => {
      const reasonText = (item.reason || item.notes || "").toLowerCase();
      const itemDate = item.date || "";

      const matchReason = reasonText.includes(searchReason.toLowerCase());
      let matchEndDate = true;
      if (endDate) matchEndDate = itemDate <= endDate;

      return matchReason && matchEndDate;
    });
  }, [deductions, searchReason, endDate]);

  // 3. الحسابات الإجمالية
  const totalDedVal = totalSumFromDB; 
  const totalCount = filteredDeductions.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // السجلات المعروضة بناءً على الصفحة الحالية (Pagination)
  const displayedDeductions = useMemo(() => {
    return filteredDeductions.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [filteredDeductions, currentPage, pageSize]);

  // 4. العمليات (حذف وتعديل)
  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.length} سجل؟`)) return;
    
    try {
      const { error } = await supabase.from('emp_deductions').delete().in('id', selectedIds);
      if (error) throw error;
      
      await fetchDeductions(); // تحديث القائمة بعد الحذف
      setSelectedIds([]);
    } catch (err: any) {
      alert("❌ حدث خطأ أثناء الحذف: " + err.message);
    }
  };

  const handleEdit = () => {
    if (selectedIds.length !== 1) return;
    const targetId = String(selectedIds[0]);
    const record = deductions.find(d => String(d.id || d.generated_id) === targetId);
    if (record) {
      setEditingRecord({ ...record });
      setIsEditModalOpen(true);
    }
  };

  const handleSaveUpdate = async () => {
    if (!editingRecord) return;
    
    try {
      const { error } = await supabase
        .from('emp_deductions')
        .update(editingRecord)
        .eq('id', editingRecord.id || editingRecord.generated_id);
        
      if (error) throw error;

      await fetchDeductions();
      setIsEditModalOpen(false);
      setSelectedIds([]);
    } catch (err: any) {
      alert("❌ حدث خطأ أثناء التعديل: " + err.message);
    }
  };

  // 5. التحديد (Selection)
  const toggleSelectRow = (id: any) => {
    const cleanId = String(id);
    setSelectedIds(prev => 
      prev.includes(cleanId) ? prev.filter(i => i !== cleanId) : [...prev, cleanId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayedDeductions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedDeductions.map(d => String(d.id || d.generated_id)));
    }
  };

  // 6. تصدير واستيراد (إكسيل)
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredDeductions.map(r => ({
      "التاريخ": r.date,
      "الاسم": r.emp_name,
      "المبلغ": r.amount,
      "السبب": r.reason,
      "ملاحظات": r.notes
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Deductions");
    XLSX.writeFile(wb, `Deductions_${new Date().toLocaleDateString()}.xlsx`);
  };

  const downloadTemplate = () => {
    const template = [{ date: "2026-04-10", emp_name: "اسم الموظف", amount: 0, reason: "", notes: "" }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Deduction_Template.xlsx");
  };

  const handleImportExcel = (e: any) => {
    console.log("Importing Excel...");
    // سيتم تنفيذ لوجيك الاستيراد لاحقاً
  };

  return {
    loading, 
    displayedDeductions, 
    searchName, setSearchName,
    searchReason, setSearchReason, 
    startDate, setStartDate,
    endDate, setEndDate,
    totalCount, totalPages, totalDedVal,
    selectedIds, toggleSelectRow, toggleSelectAll,
    currentPage, setCurrentPage,
    pageSize, setPageSize,
    handleDelete, handleEdit,
    isEditModalOpen, setIsEditModalOpen,
    editingRecord, setEditingRecord,
    handleSaveUpdate,
    exportToExcel, 
    handleImportExcel,
    downloadTemplate,
    refresh: fetchDeductions
  };
}