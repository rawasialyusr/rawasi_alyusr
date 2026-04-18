"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { filterData } from '@/lib/helpers';

// 🚀 1. واجهات البيانات (TypeScript Interfaces) لمنع الأخطاء العشوائية
export interface ReceiptVoucher {
  id: string;
  date: string;
  amount: number;
  payment_method: string;
  notes?: string;
  partner_id?: string;
  invoice_id?: string;
  partners?: { name: string };
  invoices?: { invoice_number: string };
  created_at?: string;
}

export function useReceiptVouchers() {
  // 🔹 الحالات الأساسية (كما هي بدون تغيير)
  const [vouchers, setVouchers] = useState<ReceiptVoucher[]>([]);
  const [filteredVouchers, setFilteredVouchers] = useState<ReceiptVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, bank: 0, cash: 0 });

  // 🚀 2. إضافات جديدة: حالات متقدمة للتحكم في الواجهة والمودال
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // للتحكم في الصفوف المحددة

  useEffect(() => {
    fetchVouchers();
  }, []);

  async function fetchVouchers() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('receipt_vouchers')
        .select(`
          *,
          partners (name),
          invoices (invoice_number)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setVouchers(data || []);
      setFilteredVouchers(data || []);
      
      // الإحصائيات (كما هي)
      const total = data?.reduce((acc, v) => acc + v.amount, 0) || 0;
      const bank = data?.filter(v => v.payment_method === 'تحويل بنكي').reduce((acc, v) => acc + v.amount, 0) || 0;
      const cash = data?.filter(v => v.payment_method === 'نقدي (كاش)').reduce((acc, v) => acc + v.amount, 0) || 0;
      
      setStats({ total, bank, cash });
    } catch (err: any) {
      console.error("🚨 Error fetching vouchers:", err.message || err);
      setError(err.message || "حدث خطأ أثناء جلب البيانات");
    } finally {
      setLoading(false);
    }
  }

  // 🔹 التعديل الجوهري للفلترة (كما هو بالضبط)
  const handleFilter = (searchTerm: string) => {
    const results = filterData(
      vouchers, 
      searchTerm, 
      undefined, // dateFrom
      undefined, // dateTo
      ['id', 'payment_method', 'partners.name'] // الخانة الخامسة الصح
    );
    setFilteredVouchers(results);
    setSelectedIds([]); // 🚀 تفريغ التحديد عند البحث لتجنب أخطاء الحذف
  };

  // ==========================================
  // 🚀 3. عمليات الإضافة والحذف (CRUD Operations)
  // ==========================================

  // إضافة سند جديد
  const addVoucher = async (formData: Partial<ReceiptVoucher>) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: insertError } = await supabase
        .from('receipt_vouchers')
        .insert([formData]);

      if (insertError) throw insertError;
      
      setIsModalOpen(false); // قفل المودال بعد النجاح
      await fetchVouchers(); // تحديث الجدول فوراً
      return { success: true };
    } catch (err: any) {
      console.error("🚨 Error adding voucher:", err.message || err);
      setError(err.message || "فشل في حفظ السند");
      return { success: false, error: err.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  // التحكم في تحديد الصفوف (للأزرار الجماعية)
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredVouchers.length) {
      setSelectedIds([]); // إلغاء التحديد
    } else {
      setSelectedIds(filteredVouchers.map(v => v.id)); // تحديد الكل
    }
  };

  // حذف السندات المحددة
  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    // تأكيد الحذف
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} سند؟ لا يمكن التراجع عن هذا الإجراء.`);
    if (!confirmDelete) return;

    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('receipt_vouchers')
        .delete()
        .in('id', selectedIds);

      if (deleteError) throw deleteError;
      
      setSelectedIds([]); // تفريغ التحديد
      await fetchVouchers(); // تحديث الجدول
    } catch (err: any) {
      console.error("🚨 Error deleting vouchers:", err.message || err);
      setError(err.message || "حدث خطأ أثناء الحذف");
    } finally {
      setLoading(false);
    }
  };

  return {
    // البيانات الأساسية
    vouchers,
    filteredVouchers,
    loading,
    stats,
    error,
    
    // الفلترة والتحديث
    handleFilter,
    refreshData: fetchVouchers,
    
    // 🚀 واجهة المودال والإضافة
    isModalOpen,
    setIsModalOpen,
    isSubmitting,
    addVoucher,
    
    // 🚀 التحديد المتعدد والحذف
    selectedIds,
    toggleSelection,
    selectAll,
    deleteSelected,
  };
}