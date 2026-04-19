"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAllSupabaseData } from '@/lib/helpers'; 
import * as XLSX from 'xlsx';

export function useEmpAdvLogic() {
  const [advances, setAdvances] = useState<any[]>([]);
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

  // 1. جلب البيانات الشامل (بدون ليميت 1000 سطر)
  const fetchAdvances = useCallback(async () => {
    setLoading(true);
    try {
      const allData = await fetchAllSupabaseData(supabase, 'emp_adv', '*', 'date', false);
      setAdvances(allData || []);
    } catch (err: any) {
      console.error("Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdvances(); }, [fetchAdvances]);

  // 2. محرك الفلترة الذكي (Client-side Filtering)
  const filteredAdvances = useMemo(() => {
    return advances.filter(adv => {
      const matchesName = (adv.emp_name || "").toLowerCase().includes(searchName.toLowerCase());
      const matchesDesc = (adv.Desc || adv.notes || "").toLowerCase().includes(searchSite.toLowerCase());
      
      const advDate = new Date(adv.date);
      const matchesStart = startDate ? advDate >= new Date(startDate) : true;
      const matchesEnd = endDate ? advDate <= new Date(endDate) : true;

      return matchesName && matchesDesc && matchesStart && matchesEnd;
    });
  }, [advances, searchName, searchSite, startDate, endDate]);

  // 3. حساب إجمالي المبالغ للسجلات المفلترة
  const totalAdvanceVal = useMemo(() => {
    return filteredAdvances.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [filteredAdvances]);

  // 4. الترقيم (Pagination)
  const displayedAdvances = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredAdvances.slice(start, start + pageSize);
  }, [filteredAdvances, currentPage, pageSize]);

  // 5. وظيفة الحذف المحسنة (التي تم ضبطها سابقاً)
  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      alert("⚠️ لم تقم بتحديد أي سجلات للحذف.");
      return;
    }

    const count = selectedIds.length;
    if (!confirm(`⚠️ تأكيد نهائي: سيتم حذف ${count} سجل من قاعدة البيانات. هل تريد الاستمرار؟`)) return;
    
    setLoading(true);
    console.log("🚀 جاري محاولة حذف الـ IDs التالية:", selectedIds);

    try {
      const formattedIds = selectedIds.map(id => {
          const num = Number(id);
          return isNaN(num) ? id : num;
      });

      const { error, count: deletedCount } = await supabase
        .from('emp_adv')
        .delete({ count: 'exact' }) 
        .in('id', formattedIds);

      if (error) throw error;

      if (deletedCount === 0) {
        alert("🔍 لم يتم حذف أي سجلات، تأكد من صلاحيات قاعدة البيانات (RLS).");
      } else {
        alert(`✅ نجحت العملية: تم حذف ${deletedCount} سجل بنجاح.`);
        setSelectedIds([]); 
        await fetchAdvances(); 
      }

    } catch (err: any) {
      console.error("❌ فشل الحذف:", err);
      alert("❌ حدث خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 🆕 وظيفة الترحيل الجماعي
  const handlePostSelected = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`هل تريد ترحيل (${selectedIds.length}) سجل محاسبياً؟`)) return;
    setLoading(true);
    const { error } = await supabase.from('emp_adv').update({ is_posted: true }).in('id', selectedIds);
    if (!error) {
        alert("✅ تم الترحيل بنجاح");
        setSelectedIds([]);
        await fetchAdvances();
    }
    setLoading(false);
  };

  // 🆕 وظيفة فك الترحيل الجماعي
  const handleUnpostSelected = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`⚠️ تحذير: فك ترحيل (${selectedIds.length}) سجل سيؤدي لحذف الأثر المحاسبي. متابعة؟`)) return;
    setLoading(true);
    const { error } = await supabase.from('emp_adv').update({ is_posted: false }).in('id', selectedIds);
    if (!error) {
        alert("🔓 تم فك الترحيل");
        setSelectedIds([]);
        await fetchAdvances();
    }
    setLoading(false);
  };

  // 6. التعديل والحفظ الفعلي
  const handleEdit = (adv: any) => {
    if (adv.is_posted) {
        alert("🚫 لا يمكن تعديل سجل مُرحل.");
        return;
    }
    setEditingRecord({ ...adv });
    setIsEditModalOpen(true);
  };

  const handleSaveUpdate = async () => {
    if (!editingRecord) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('emp_adv')
        .update({
          date: editingRecord.date,
          emp_name: editingRecord.emp_name,
          Desc: editingRecord.Desc,
          amount: Number(editingRecord.amount)
        })
        .eq('id', editingRecord.id);

      if (error) throw error;
      
      alert("✅ تم التحديث بنجاح");
      setIsEditModalOpen(false);
      await fetchAdvances();
    } catch (err: any) {
      alert("❌ خطأ أثناء التحديث: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 7. استيراد وتصدير إكسيل
  const exportToExcel = () => {
    const dataToExport = filteredAdvances.map(a => ({
        'ID': a.id,
        'التاريخ': a.date,
        'اسم الموظف': a.emp_name,
        'البيان': a.Desc,
        'المبلغ': a.amount,
        'الحالة': a.is_posted ? 'مُرحل' : 'معلق'
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Advances");
    XLSX.writeFile(wb, `سلف_الموظفين_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImportExcel = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);
        
        const mappedData = data.map(row => ({
          emp_name: row['اسم الموظف'] || row['Employee Name'] || row['emp_name'],
          amount: Number(row['المبلغ'] || row['Amount'] || row['amount'] || 0),
          date: row['التاريخ'] || row['Date'] || row['date'],
          Desc: row['البيان'] || row['Description'] || row['Desc'] || '',
          is_posted: false
        })).filter(row => row.emp_name && row.amount > 0);

        const { error } = await supabase.from('emp_adv').insert(mappedData);
        if (error) throw error;

        alert(`✅ تم استيراد ${mappedData.length} سجل بنجاح!`);
        await fetchAdvances();
      } catch (err: any) {
        alert("❌ فشل الاستيراد: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // 8. اختيار الصفوف (تعديل دالة اختيار الكل لتصبح دالة عادية)
  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const visibleIds = displayedAdvances.map(a => String(a.id));
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
    
    if (allVisibleSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  return {
    loading, advances, totalAdvanceVal, searchName, setSearchName, searchSite, setSearchSite,
    startDate, setStartDate, endDate, setEndDate, selectedIds, setSelectedIds,
    currentPage, setCurrentPage, pageSize, setPageSize, 
    totalCount: filteredAdvances.length,
    totalPages: Math.ceil(filteredAdvances.length / pageSize),
    displayedAdvances, isEditModalOpen, setIsEditModalOpen, editingRecord, setEditingRecord,
    handleSaveUpdate, exportToExcel, handleImportExcel,
    handleDelete, handlePostSelected, handleUnpostSelected, 
    toggleSelectRow, toggleSelectAll, handleEdit, fetchAdvances
  };
}