"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAllSupabaseData } from '@/lib/helpers'; 

export function useEmpDedLogic() {
  const [deductions, setDeductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchSite, setSearchSite] = useState(""); 
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const fetchDeductions = useCallback(async () => {
    setLoading(true);
    try {
      const allData = await fetchAllSupabaseData(supabase, 'emp_adv', '*', 'date', false);
      setDeductions(allData || []);
    } catch (err: any) { console.error(err.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDeductions(); }, [fetchDeductions]);

  // ✨ دالة فتح المودال للإضافة
  const handleOpenAdd = () => {
    setEditingRecord({
      date: new Date().toISOString().split('T')[0],
      emp_name: '',
      amount: '',
      Desc: ''
    });
    setIsEditModalOpen(true);
  };

  const handleEdit = (item: any) => {
    if (item.is_posted) return;
    setEditingRecord({ ...item });
    setIsEditModalOpen(true);
  };

  const handleSaveUpdate = async () => {
    if (!editingRecord || !editingRecord.emp_name || !editingRecord.amount) {
        alert("برجاء ملء اسم الموظف والمبلغ");
        return;
    }
    setLoading(true);
    try {
      if (editingRecord.id) {
        // تحديث سجل موجود
        await supabase.from('emp_adv').update({
          date: editingRecord.date,
          emp_name: editingRecord.emp_name,
          Desc: editingRecord.Desc,
          amount: Number(editingRecord.amount)
        }).eq('id', editingRecord.id);
      } else {
        // إضافة سجل جديد
        await supabase.from('emp_adv').insert([{
          ...editingRecord,
          amount: Number(editingRecord.amount),
          is_posted: false
        }]);
      }
      setIsEditModalOpen(false);
      await fetchDeductions();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const filteredDeductions = useMemo(() => {
    return deductions.filter(item => {
      const searchStr = (item.emp_name || "" + item.Desc || "").toLowerCase();
      const matchesSearch = searchStr.includes(searchSite.toLowerCase());
      const itemDate = new Date(item.date);
      const matchesStart = startDate ? itemDate >= new Date(startDate) : true;
      const matchesEnd = endDate ? itemDate <= new Date(endDate) : true;
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [deductions, searchSite, startDate, endDate]);

  return {
    loading, totalDeductionVal: filteredDeductions.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    searchSite, setSearchSite, startDate, setStartDate, endDate, setEndDate,
    selectedIds, setSelectedIds, currentPage, setCurrentPage, pageSize, setPageSize,
    totalCount: filteredDeductions.length,
    totalPages: Math.ceil(filteredDeductions.length / pageSize),
    displayedDeductions: filteredDeductions.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
    isEditModalOpen, setIsEditModalOpen, editingRecord, setEditingRecord,
    handleSaveUpdate, handleOpenAdd, handleEdit, fetchDeductions,
    toggleSelectRow: (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]),
    toggleSelectAll: () => {
        const vIds = deductions.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(d => String(d.id));
        setSelectedIds(vIds.every(id => selectedIds.includes(id)) ? selectedIds.filter(id => !vIds.includes(id)) : Array.from(new Set([...selectedIds, ...vIds])));
    },
    handleDelete: async () => {
      if (!confirm("هل أنت متأكد من حذف السجلات المختارة؟")) return;
      await supabase.from('emp_adv').delete().in('id', selectedIds);
      setSelectedIds([]); await fetchDeductions();
    },
    handlePostSelected: async () => {
      await supabase.from('emp_adv').update({ is_posted: true }).in('id', selectedIds);
      setSelectedIds([]); await fetchDeductions();
    }
  };
}