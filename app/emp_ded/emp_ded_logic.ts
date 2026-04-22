"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase'; 

export function useEmpDedLogic() {
  const [deductions, setDeductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSumFromDB, setTotalSumFromDB] = useState(0); 
  
  const [searchName, setSearchName] = useState("");
  const [searchReason, setSearchReason] = useState(""); 
  const [startDate, setStartDate] = useState(""); 
  const [endDate, setEndDate] = useState("");

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  // 1. جلب البيانات
  const fetchDeductions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('emp_deductions') 
        .select('*')
        .order('date', { ascending: false });

      if (searchName) {
        query = query.ilike('emp_name', `%${searchName}%`);
      }
      if (startDate) {
        query = query.gte('date', startDate);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      if (data) {
        setDeductions(data);
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

  // 2. الفلترة المتقدمة
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

  const displayedDeductions = useMemo(() => {
    return filteredDeductions.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [filteredDeductions, currentPage, pageSize]);

  // 4. العمليات الأساسية (حذف وتعديل)
  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.length} سجل؟`)) return;
    
    try {
      const { error } = await supabase.from('emp_deductions').delete().in('id', selectedIds);
      if (error) throw error;
      
      await fetchDeductions(); 
      setSelectedIds([]);
    } catch (err: any) {
      alert("❌ حدث خطأ أثناء الحذف: " + err.message);
    }
  };

  const handleEdit = (record?: any) => {
    // التعديل عشان يقبل الـ record المبعوت من زرار الجدول مباشرة
    if (record) {
      setEditingRecord({ ...record });
      setIsEditModalOpen(true);
      return;
    }

    if (selectedIds.length !== 1) return;
    const targetId = String(selectedIds[0]);
    const foundRecord = deductions.find(d => String(d.id || d.generated_id) === targetId);
    if (foundRecord) {
      setEditingRecord({ ...foundRecord });
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

  // ➕ إضافة: دوال الترحيل وفك الترحيل (عشان الـ UI ميضربش إيرور)
  const handlePostSelected = async () => {
      if (selectedIds.length === 0) return;
      try {
          const { error } = await supabase.from('emp_deductions').update({ is_posted: true }).in('id', selectedIds);
          if (error) throw error;
          await fetchDeductions();
          setSelectedIds([]);
      } catch (err: any) { alert("خطأ في الترحيل: " + err.message); }
  };

  const handleUnpostSelected = async () => {
      if (selectedIds.length === 0) return;
      try {
          const { error } = await supabase.from('emp_deductions').update({ is_posted: false }).in('id', selectedIds);
          if (error) throw error;
          await fetchDeductions();
          setSelectedIds([]);
      } catch (err: any) { alert("خطأ في فك الترحيل: " + err.message); }
  };

  // 5. التحديد
  const toggleSelectRow = (id: any) => {
    const cleanId = String(id);
    setSelectedIds(prev => prev.includes(cleanId) ? prev.filter(i => i !== cleanId) : [...prev, cleanId]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayedDeductions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedDeductions.map(d => String(d.id || d.generated_id)));
    }
  };

  // 6. تصدير واستيراد
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
  };

  // 7. الـ Return (إرجاع القيم بأسماء تتطابق مع واجهة المستخدم)
  return {
    loading, 
    displayedDeductions, 
    searchName, setSearchName,
    searchSite: searchName, setSearchSite: setSearchName, // 👈 دمجنا searchSite مع searchName عشان الـ UI يشتغل صح
    searchReason, setSearchReason, 
    startDate, setStartDate,
    endDate, setEndDate,
    totalCount, totalPages, 
    totalDeductionVal: totalDedVal, // 👈 خليناها تطابق اسم المتغير اللي الواجهة بتناديه
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
    handlePostSelected, // 👈 تم التصدير
    handleUnpostSelected, // 👈 تم التصدير
    refresh: fetchDeductions
  };
}