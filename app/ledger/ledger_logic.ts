"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useLedgerLogic() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // 📥 1. جلب قائمة الحسابات بمحرك القوة (React Query) 
  const { data: accounts = [] } = useQuery({
    queryKey: ['ledger_accounts_list'],
    queryFn: async () => {
      const { data } = await supabase.from('accounts').select('id, name, code').order('code');
      return data || [];
    }
  });

  // 📥 2. جلب الحركات (Joining lines with headers) [cite: 48]
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['ledger_entries', selectedAccountId],
    enabled: !!selectedAccountId,
    queryFn: async () => {
      const { data } = await supabase
        .from('journal_lines')
        .select(`
          id, debit, credit, item_name, notes,
          journal_headers (entry_date, description),
          projects (name),
          partners (name)
        `)
        .eq('account_id', selectedAccountId)
        .order('journal_headers(entry_date)', { ascending: true });
      return data || [];
    }
  });

  // 📊 3. الحسابات والفلترة داخل useMemo حصراً [cite: 6]
  const ledgerStats = useMemo(() => {
    let runningBalance = 0;
    const enrichedEntries = entries.map((entry: any) => {
      runningBalance += (Number(entry.debit) - Number(entry.credit));
      return { ...entry, runningBalance };
    });

    const totalDebit = entries.reduce((sum, e) => sum + Number(e.debit), 0);
    const totalCredit = entries.reduce((sum, e) => sum + Number(e.credit), 0);

    return {
      entries: enrichedEntries,
      totalDebit,
      totalCredit,
      currentBalance: totalDebit - totalCredit
    };
  }, [entries]);

  return {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    isLoading,
    ...ledgerStats
  };
}