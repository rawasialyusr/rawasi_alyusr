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
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
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

  return {
    loading, totalDeductionVal: deductions.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    searchSite, setSearchSite, startDate, setStartDate, endDate, setEndDate,
    selectedIds, setSelectedIds, currentPage, setCurrentPage, rowsPerPage, setRowsPerPage,
    displayedDeductions: deductions,
    isEditModalOpen, setIsEditModalOpen, editingRecord, setEditingRecord,
    handleOpenAdd: () => { setEditingRecord({ date: new Date().toISOString().split('T')[0], emp_name: '', amount: '' }); setIsEditModalOpen(true); },
    handleEdit: (item: any) => { setEditingRecord({ ...item }); setIsEditModalOpen(true); },
    handleSaveUpdate: async (formData: any) => {
        setLoading(true);
        if (formData.id) await supabase.from('emp_adv').update(formData).eq('id', formData.id);
        else await supabase.from('emp_adv').insert([{ ...formData, is_posted: false }]);
        setIsEditModalOpen(false); fetchDeductions();
    },
    toggleSelectRow: (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]),
    toggleSelectAll: () => {
      const vIds = deductions.map(d => String(d.id));
      setSelectedIds(vIds.every(id => selectedIds.includes(id)) ? [] : vIds);
    },
    handleDelete: async () => {
      if (!confirm("حذف؟")) return;
      await supabase.from('emp_adv').delete().in('id', selectedIds);
      setSelectedIds([]); fetchDeductions();
    },
    handlePostSelected: async () => {
      await supabase.from('emp_adv').update({ is_posted: true }).in('id', selectedIds);
      setSelectedIds([]); fetchDeductions();
    },
    handleUnpostSelected: async () => {
      await supabase.from('emp_adv').update({ is_posted: false }).in('id', selectedIds);
      setSelectedIds([]); fetchDeductions();
    }
  };
}