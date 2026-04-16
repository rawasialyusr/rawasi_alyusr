"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export default function AccountLedger() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. جلب قائمة الحسابات لملء القائمة المنسدلة
  useEffect(() => {
    const fetchAccounts = async () => {
      const { data } = await supabase.from('accounts').select('id, name, code').order('code');
      if (data) setAccounts(data);
    };
    fetchAccounts();
  }, []);

  // 2. جلب حركات الحساب المختار (Joining lines with headers)
  const fetchLedger = async (accountId: string) => {
    if (!accountId) return;
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('journal_lines')
      .select(`
        id,
        debit,
        credit,
        item_name,
        notes,
        journal_headers (entry_date, description),
        projects (name),
        partners (name)
      `)
      .eq('account_id', accountId)
      .order('journal_headers(entry_date)', { ascending: true });

    if (data) {
      // حساب الرصيد التراكمي برمجياً
      let runningBalance = 0;
      const enrichedData = data.map((entry: any) => {
        runningBalance += (Number(entry.debit) - Number(entry.credit));
        return { ...entry, runningBalance };
      });
      setLedgerEntries(enrichedData);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLedger(selectedAccountId);
  }, [selectedAccountId]);

  const totalDebit = useMemo(() => ledgerEntries.reduce((sum, e) => sum + Number(e.debit), 0), [ledgerEntries]);
  const totalCredit = useMemo(() => ledgerEntries.reduce((sum, e) => sum + Number(e.credit), 0), [ledgerEntries]);

  return (
    <div style={{ direction: 'rtl', padding: '30px', backgroundColor: '#F4F1EE', minHeight: '100vh', fontFamily: 'Cairo, sans-serif' }}>
      <h1 style={{ color: '#2D2421', fontWeight: 900 }}>📊 كشف حساب تفصيلي (دفتر الأستاذ)</h1>
      
      {/* اختيار الحساب */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px', border: '2px solid #DBC4AD' }}>
        <label style={{ fontWeight: 900, display: 'block', marginBottom: '10px' }}>اختر الحساب للمراجعة:</label>
        <select 
          style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #DBC4AD', fontWeight: 700 }}
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
        >
          <option value="">-- اختر حساباً من الشجرة --</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
          ))}
        </select>
      </div>

      {/* ملخص الأرصدة */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
        <div style={{ background: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center', borderBottom: '4px solid #166534' }}>
          <div style={{ fontSize: '12px', fontWeight: 900 }}>إجمالي المدين</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#166534' }}>{totalDebit.toLocaleString()}</div>
        </div>
        <div style={{ background: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center', borderBottom: '4px solid #991B1B' }}>
          <div style={{ fontSize: '12px', fontWeight: 900 }}>إجمالي الدائن</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#991B1B' }}>{totalCredit.toLocaleString()}</div>
        </div>
        <div style={{ background: '#6F4E37', padding: '15px', borderRadius: '12px', textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '12px', fontWeight: 900 }}>الرصيد الحالي</div>
          <div style={{ fontSize: '24px', fontWeight: 900 }}>{(totalDebit - totalCredit).toLocaleString()}</div>
        </div>
      </div>

      {/* جدول الحركات */}
      <div style={{ backgroundColor: 'white', borderRadius: '20px', overflow: 'hidden', border: '2px solid #DBC4AD' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: '#2D2421', color: 'white' }}>
              <th style={{ padding: '15px' }}>التاريخ</th>
              <th style={{ padding: '15px' }}>البيان / المشروع</th>
              <th style={{ padding: '15px' }}>مدين (+)</th>
              <th style={{ padding: '15px' }}>دائن (-)</th>
              <th style={{ padding: '15px' }}>الرصيد</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>⏳ جاري جلب قيود اليومية...</td></tr>
            ) : ledgerEntries.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{entry.journal_headers?.entry_date}</td>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 900 }}>{entry.item_name}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>{entry.projects?.name} | {entry.partners?.name}</div>
                </td>
                <td style={{ padding: '12px', color: '#166534', fontWeight: 700 }}>{entry.debit > 0 ? entry.debit.toLocaleString() : '-'}</td>
                <td style={{ padding: '12px', color: '#991B1B', fontWeight: 700 }}>{entry.credit > 0 ? entry.credit.toLocaleString() : '-'}</td>
                <td style={{ padding: '12px', fontWeight: 900, backgroundColor: '#fdfbf9' }}>{entry.runningBalance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}