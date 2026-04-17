"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function useJournalEditLogic() {
  const router = useRouter();
  const { id } = useParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  const [header, setHeader] = useState({ entry_date: '', description: '', reference: '' });
  const [lines, setLines] = useState<any[]>([]);

  // 1️⃣ جلب بيانات القيد (الأصل) - تم تعديل طريقة الجلب لتجنب الـ Fetch Error
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // سحب قائمة الحسابات
        const { data: accData } = await supabase.from('accounts').select('id, code, name').eq('is_transactional', true);
        if (accData) setAccounts(accData);

        // سحب الرأس
        const { data: headerData, error: hErr } = await supabase.from('journal_headers').select('*').eq('id', id).maybeSingle();
        if (hErr) throw hErr;
        if (headerData) {
          setHeader({ 
            entry_date: headerData.entry_date, 
            description: headerData.description || '',
            reference: headerData.reference || '' 
          });
        }

        // سحب الأسطر (تم تبسيط الاستعلام لضمان التسميع)
        const { data: linesData, error: lErr } = await supabase.from('journal_lines').select('*').eq('header_id', id);
        if (lErr) throw lErr;

        if (linesData && linesData.length > 0) {
          setLines(linesData);
        } else {
          setLines([
            { account_id: '', debit: 0, credit: 0, item_name: '' },
            { account_id: '', debit: 0, credit: 0, item_name: '' }
          ]);
        }
      } catch (err: any) {
        console.error("Fetch Error Details:", err);
        alert("❌ فشل جلب القيد: " + (err.message || "تأكد من اتصال قاعدة البيانات"));
      }
      setIsLoading(false);
    };

    if (id) fetchData();
  }, [id]);

  // 🧮 حسابات الاتزان
  const totals = useMemo(() => {
    const d = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const c = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
    return { debit: d, credit: c, diff: Number(Math.abs(d - c).toFixed(2)) };
  }, [lines]);

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    if (field === 'debit' && Number(value) > 0) newLines[index].credit = 0;
    if (field === 'credit' && Number(value) > 0) newLines[index].debit = 0;
    setLines(newLines);
  };

  const addLine = () => setLines([...lines, { account_id: '', debit: 0, credit: 0, item_name: '' }]);
  const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));

  // 💾 عملية الحفظ والتسميع الأكيدة
  const handleSave = async () => {
    if (totals.diff !== 0) return alert("❌ القيد غير متزن!");
    
    setIsSaving(true);
    try {
      // 1. تحديث الرأس
      const { error: hErr } = await supabase.from('journal_headers')
        .update({ entry_date: header.entry_date, description: header.description })
        .eq('id', id);
      if (hErr) throw hErr;

      // 2. التسميع (حذف قديم وإضافة جديد)
      const { error: dErr } = await supabase.from('journal_lines').delete().eq('header_id', id);
      if (dErr) throw dErr;

      const toInsert = lines.map(l => ({
        header_id: id,
        account_id: l.account_id,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        item_name: l.item_name || header.description
      }));

      const { error: iErr } = await supabase.from('journal_lines').insert(toInsert);
      if (iErr) throw iErr;

      alert("✅ تم التعديل والتسميع بنجاح!");
      router.push('/journal-errors');
    } catch (err: any) {
      alert("❌ فشل التسميع: " + err.message);
    }
    setIsSaving(false);
  };

  // 🗑️ حذف القيد
  const handleDeleteEntry = async () => {
    if (!confirm("حذف القيد نهائياً؟")) return;
    try {
      await supabase.from('journal_lines').delete().eq('header_id', id);
      await supabase.from('journal_headers').delete().eq('id', id);
      router.push('/journal-errors');
    } catch (err: any) { alert(err.message); }
  };

  return { id, isLoading, isSaving, accounts, header, setHeader, lines, totals, handleLineChange, addLine, removeLine, handleSave, handleDeleteEntry, router };
}