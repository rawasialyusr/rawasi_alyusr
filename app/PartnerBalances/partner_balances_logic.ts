"use client";
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';

export function usePartnerBalancesLogic() {
  const { showToast } = useToast();
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // 🚀 سحب البيانات من الـ View الجاهز والمحسوب في السيرفر
  const { data: balances = [], isLoading, error } = useQuery({
    queryKey: ['partner_balances_summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_balances_summary')
        .select('*')
        .order('current_balance', { ascending: false }); // ترتيب بالأعلى رصيداً
      
      if (error) {
        showToast("فشل جلب الأرصدة", 'error');
        throw error;
      }
      return data;
    }
  });

  // 🛡️ التصفية اللحظية
  const filteredData = useMemo(() => {
    if (!balances) return [];
    return balances.filter((item: any) => 
      item.partner_name?.toLowerCase().includes(globalSearch.toLowerCase()) ||
      item.partner_type?.toLowerCase().includes(globalSearch.toLowerCase())
    );
  }, [balances, globalSearch]);

  // 📊 إجماليات الرادار
  const totals = useMemo(() => {
    return filteredData.reduce((acc: any, row: any) => {
      acc.earned += Number(row.total_earned || 0);
      acc.paid += Number(row.total_paid || 0);
      acc.balance += Number(row.current_balance || 0);
      return acc;
    }, { earned: 0, paid: 0, balance: 0 });
  }, [filteredData]);

  return {
    filteredData,
    isLoading,
    globalSearch,
    setGlobalSearch,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totals
  };
}