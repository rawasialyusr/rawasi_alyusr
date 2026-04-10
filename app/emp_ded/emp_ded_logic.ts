"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { getEmpDeductions } from '@/app/actions/emp_ded'; // استدعاء الأكشن المربوط بـ RPC

export function useEmpDedLogic() {
  const [deductions, setDeductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSumFromDB, setTotalSumFromDB] = useState(0); // المجموع الكلي من السيرفر قبل الـ Pagination
  
  // فلاتر البحث (أضفنا searchDate ليتوافق مع الـ RPC)
  const [searchName, setSearchName] = useState("");
  const [searchReason, setSearchReason] = useState(""); 
  const [startDate, setStartDate] = useState(""); // يستخدم كفلتر رئيسي في الـ RPC
  const [endDate, setEndDate] = useState("");

  // الترقيم والتحكم (Pagination)
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // حالة التعديل (Modal)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  // 1. جلب البيانات (الربط مع السيرفر أكشن لضمان الجمع قبل الـ 1000 صف)
  const fetchDeductions = useCallback(async () => {
    setLoading(true);
    try {
      // نرسل الاسم وتاريخ البداية للسيرفر للفلترة والجمع هناك
      const result = await getEmpDeductions(searchName, startDate);
      
      if (result) {
        setDeductions(result.data || []);
        setTotalSumFromDB(result.totalSum || 0); // المجموع الحقيقي من الداتابيز
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, [searchName, startDate]);

  useEffect(() => {
    fetchDeductions();
  }, [fetchDeductions]);

  // 2. الفلترة المتقدمة (تصفية النتائج محلياً للسبب ونطاق التاريخ)
  const filteredDeductions = useMemo(() => {
    return deductions.filter(item => {
      // التعامل مع المسميات من الصورة (reason أو notes)
      const reasonText = (item.reason || item.notes || "").toLowerCase();
      const itemDate = item.date || "";

      const matchReason = reasonText.includes(searchReason.toLowerCase());
      let matchEndDate = true;
      if (endDate) matchEndDate = itemDate <= endDate;

      return matchReason && matchEndDate;
    });
  }, [deductions, searchReason, endDate]);

  // 3. الحسابات الإجمالية (حل مشكلة NaN الظاهرة في الصورة)
  // نعتمد على القيمة القادمة من الداتابيز مباشرة
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
    // يتم الربط مع أكشن الحذف لاحقاً
    console.log("Delete IDs:", selectedIds);
  };

  const handleEdit = () => {
    if (selectedIds.length !== 1) return;
    const targetId = String(selectedIds[0]);
    // البحث عن السجل باستخدام المعرف (id أو generated_id)
    const record = deductions.find(d => String(d.id || d.generated_id) === targetId);
    if (record) {
      setEditingRecord({ ...record });
      setIsEditModalOpen(true);
    }
  };

  const handleSaveUpdate = async () => {
    if (!editingRecord) return;
    // يتم الربط مع أكشن التعديل لاحقاً
    setIsEditModalOpen(false);
    setSelectedIds([]);
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