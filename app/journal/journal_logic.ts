"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useJournalLogic() {
  // --- الحالات الأساسية (Data States) ---
  const [accounts, setAccounts] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('مسودة'); // مسودة | جاري الحفظ | تم الترحيل

  // --- بيانات رأس القيد (Header Data) ---
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState(''); // وصف عام للقيد

  // --- أسطر القيد (Journal Lines) ---
  const [lines, setLines] = useState([
    { id: crypto.randomUUID(), account_id: '', partner_id: '', project_id: '', notes: '', debit: '', credit: '' },
    { id: crypto.randomUUID(), account_id: '', partner_id: '', project_id: '', notes: '', debit: '', credit: '' }
  ]);

  // 1. جلب البيانات الأساسية عند التحميل
  useEffect(() => {
    const fetchMasterData = async () => {
      setIsLoading(true);
      try {
        const [accRes, partRes, projRes] = await Promise.all([
          supabase.from('accounts').select('id, code, name').eq('is_transactional', true).order('code'),
          supabase.from('partners').select('id, name'),
          supabase.from('projects').select('id, project_name').order('project_name')
        ]);

        setAccounts(accRes.data || []);
        setPartners(partRes.data || []);
        setProjects(projRes.data || []);
      } catch (err) {
        console.error("Master Data Fetch Error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMasterData();
  }, []);

  // 2. تحديث السطور (Line Management)
  const addLine = () => {
    setLines([...lines, { id: crypto.randomUUID(), account_id: '', partner_id: '', project_id: '', notes: '', debit: '', credit: '' }]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 2) return alert('عذراً، يجب أن يحتوي القيد على سطرين على الأقل (مدين ودائن).');
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: string, value: any) => {
    setLines(prevLines => prevLines.map(line => {
      if (line.id === id) {
        const updated = { ...line, [field]: value };
        // ميزة ذكية: لو أدخل مدين يمسح الدائن والعكس (منع الخطأ البشري)
        if (field === 'debit' && Number(value) > 0) updated.credit = '';
        if (field === 'credit' && Number(value) > 0) updated.debit = '';
        return updated;
      }
      return line;
    }));
  };

  // 3. الحسابات اللحظية (Reactive Totals)
  const totals = useMemo(() => {
    const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

    return { totalDebit, totalCredit, difference, isBalanced };
  }, [lines]);

  // 4. وظيفة الحفظ النهائية (The Engine)
  const handleSaveEntry = async () => {
    // التحقق المسبق (Validation Gate)
    if (!totals.isBalanced) return alert(`❌ القيد غير متزن! يوجد فرق قدره ${totals.difference}`);
    if (lines.some(l => !l.account_id)) return alert('⚠️ يرجى التأكد من اختيار الحساب لجميع الأسطر.');
    if (!description && !reference) return alert('📝 يرجى إدخال وصف للقيد أو رقم مرجعي.');

    setIsSaving(true);
    setStatus('جاري الحفظ...');

    try {
      // أ- حفظ رأس القيد
      const { data: header, error: hErr } = await supabase
        .from('journal_headers')
        .insert([{ 
          entry_date: entryDate, 
          description: description || reference || 'قيد يومية يدوي',
          status: 'posted' // ترحيل مباشر
        }])
        .select()
        .single();

      if (hErr) throw hErr;

      // ب- تجهيز وحفظ الأسطر
      const journalLines = lines.map(line => ({
        header_id: header.id,
        account_id: line.account_id,
        partner_id: line.partner_id || null,
        project_id: line.project_id || null,
        notes: line.notes || description || 'قيد آلي',
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
      }));

      const { error: lErr } = await supabase.from('journal_lines').insert(journalLines);
      if (lErr) throw lErr;

      // ج- النجاح وإعادة التعيين
      setStatus('تم الترحيل بنجاح ✅');
      setTimeout(() => {
        resetForm();
        setStatus('مسودة');
      }, 2000);

    } catch (error: any) {
      alert('❌ فشل الحفظ: ' + error.message);
      setStatus('مسودة');
    } finally {
      setIsSaving(false);
    }
  };

  // 5. تفريغ النموذج (Reset)
  const resetForm = () => {
    setReference('');
    setDescription('');
    setLines([
      { id: crypto.randomUUID(), account_id: '', partner_id: '', project_id: '', notes: '', debit: '', credit: '' },
      { id: crypto.randomUUID(), account_id: '', partner_id: '', project_id: '', notes: '', debit: '', credit: '' }
    ]);
  };

  return { 
    accounts, partners, projects, isLoading, isSaving, status, 
    entryDate, setEntryDate, reference, setReference, 
    description, setDescription, 
    lines, addLine, removeLine, updateLine, totals, handleSaveEntry 
  };
}