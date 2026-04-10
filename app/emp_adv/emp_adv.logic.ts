"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAdvances } from '@/app/actions/emp_adv_action'; 

export function useEmpAdvLogic() {
  const [advances, setAdvances] = useState<any[]>([]);
  const [totalSumFromBackend, setTotalSumFromBackend] = useState(0); // مخزن المجموع القادم من السيرفر
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

  const fetchAdvances = useCallback(async () => {
    setLoading(true);
    // استلام الكائن الجديد { data, totalSum } من الأكشن
    const result = await getAdvances(searchName, startDate, endDate);
    
    // تأكد من استلام المصفوفة والإجمالي بشكل منفصل
    setAdvances(Array.isArray(result.data) ? result.data : []);
    setTotalSumFromBackend(result.totalSum || 0);
    
    setLoading(false);
  }, [searchName, startDate, endDate]);

  useEffect(() => { fetchAdvances(); }, [fetchAdvances]);

  // 1. الفلترة الجانبية للموقع (Site)
  const filteredAdvances = useMemo(() => {
    return advances.filter(adv => 
      (adv.Site || adv.site || "").toLowerCase().includes(searchSite.toLowerCase())
    );
  }, [advances, searchSite]);

  // 2. إجمالي المبالغ: نستخدم الرقم القادم من الباك أند مباشرة
  // إذا كان هناك فلترة بالموقع، نحسبها محلياً، وإلا نستخدم إجمالي السيرفر
  const totalAdvanceVal = useMemo(() => {
    if (searchSite.trim() !== "") {
      // لو المستخدم بيفلتر بالموقع يدوياً، نحسب من المصفوفة المفلترة
      return filteredAdvances.reduce((sum, item) => sum + (Number(item.advance_val) || 0), 0);
    }
    // لو مفيش فلترة بالموقع، نرجع المجموع الكلي الدقيق من الباك أند
    return totalSumFromBackend;
  }, [filteredAdvances, totalSumFromBackend, searchSite]);

  // 3. الترقيم (Pagination)
  const displayedAdvances = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredAdvances.slice(start, start + pageSize);
  }, [filteredAdvances, currentPage, pageSize]);

  // 4. الاختيار والتعديل
  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const currentVisibleIds = displayedAdvances.map(a => String(a._id?.$oid || a._id || a.id));
    const allVisibleSelected = currentVisibleIds.every(id => selectedIds.includes(id));
    if (allVisibleSelected) {
      setSelectedIds(prev => prev.filter(id => !currentVisibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentVisibleIds])));
    }
  };

  const handleEdit = () => {
    const record = advances.find(a => String(a._id?.$oid || a._id || a.id) === selectedIds[0]);
    if (record) { setEditingRecord({...record}); setIsEditModalOpen(true); }
  };

  return {
    loading, 
    totalAdvanceVal, // سيعرض الآن إجمالي الباك أند (الـ 1288 سجل)
    searchName, setSearchName, 
    searchSite, setSearchSite,
    startDate, setStartDate, 
    endDate, setEndDate, 
    selectedIds, setSelectedIds,
    currentPage, setCurrentPage, 
    pageSize, setPageSize, 
    totalCount: filteredAdvances.length,
    totalPages: Math.ceil(filteredAdvances.length / pageSize),
    displayedAdvances,
    isEditModalOpen, setIsEditModalOpen, 
    editingRecord, setEditingRecord,
    handleSaveUpdate: async () => { setIsEditModalOpen(false); await fetchAdvances(); },
    exportToExcel: () => console.log("Excel Export"),
    handleImportExcel: (e: any) => console.log("Excel Import"),
    handleDelete: () => console.log("Delete", selectedIds),
    toggleSelectRow, toggleSelectAll, handleEdit, fetchAdvances
  };
}