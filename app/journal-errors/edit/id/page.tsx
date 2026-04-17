"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const THEME = {
  primary: '#0f172a',
  accent: '#ca8a04',
  accentLight: '#eab308',
  white: '#ffffff',
  slate: '#94a3b8',
  danger: '#ef4444',
  success: '#22c55e'
};

export default function EditJournalEntryPage() {
  const router = useRouter();
  const { id } = useParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // بيانات رأس القيد
  const [header, setHeader] = useState({ entry_date: '', description: '' });
  
  // بيانات أسطر القيد
  const [lines, setLines] = useState<any[]>([]);

  // 1️⃣ سحب بيانات القيد والحسابات
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // سحب شجرة الحسابات (الحسابات الفرعية فقط اللي بتقبل حركات)
        const { data: accData } = await supabase.from('accounts').select('id, code, name').eq('is_transactional', true);
        if (accData) setAccounts(accData);

        // سحب رأس القيد
        const { data: headerData } = await supabase.from('journal_headers').select('*').eq('id', id).single();
        if (headerData) {
          setHeader({ entry_date: headerData.entry_date, description: headerData.description || '' });
        }

        // سحب أسطر القيد
        const { data: linesData } = await supabase.from('journal_lines').select('*').eq('header_id', id);
        if (linesData && linesData.length > 0) {
          setLines(linesData);
        } else {
          // لو القيد فاضي، نفتحله سطرين افتراضيين
          setLines([
            { account_id: '', debit: 0, credit: 0, item_name: '' },
            { account_id: '', debit: 0, credit: 0, item_name: '' }
          ]);
        }
      } catch (err: any) {
        alert("❌ خطأ في سحب البيانات: " + err.message);
      }
      setIsLoading(false);
    };

    if (id) fetchData();
  }, [id]);

  // 🧮 حساب الإجماليات والاتزان
  const totals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    lines.forEach(line => {
      totalDebit += Number(line.debit || 0);
      totalCredit += Number(line.credit || 0);
    });
    return {
      debit: Number(totalDebit.toFixed(2)),
      credit: Number(totalCredit.toFixed(2)),
      diff: Number(Math.abs(totalDebit - totalCredit).toFixed(2))
    };
  }, [lines]);

  // ✍️ تعديل سطر معين
  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    
    // منع إدخال مدين ودائن في نفس السطر
    if (field === 'debit' && value > 0) newLines[index].credit = 0;
    if (field === 'credit' && value > 0) newLines[index].debit = 0;
    
    setLines(newLines);
  };

  // ➕ إضافة سطر جديد
  const addLine = () => {
    setLines([...lines, { account_id: '', debit: 0, credit: 0, item_name: '' }]);
  };

  // 🗑️ حذف سطر
  const removeLine = (index: number) => {
    if (lines.length <= 2) return alert("لا يمكن أن يقل القيد عن طرفين!");
    const newLines = lines.filter((_, i) => i !== index);
    setLines(newLines);
  };

  // 💾 حفظ التعديلات
  const handleSave = async () => {
    if (totals.diff !== 0) return alert("❌ لا يمكن حفظ القيد وهو غير متزن!");
    
    // التأكد من اختيار حسابات لكل الأسطر
    const hasEmptyAccounts = lines.some(l => !l.account_id);
    if (hasEmptyAccounts) return alert("❌ يرجى التأكد من اختيار حساب مالي لجميع الأطراف!");

    setIsSaving(true);
    try {
      // 1. تحديث الرأس
      await supabase.from('journal_headers').update({
        entry_date: header.entry_date,
        description: header.description
      }).eq('id', id);

      // 2. مسح الأسطر القديمة وإدخال الأسطر الجديدة بالكامل لضمان التحديث النظيف
      await supabase.from('journal_lines').delete().eq('header_id', id);
      
      const newLinesToInsert = lines.map(line => ({
        header_id: id,
        account_id: line.account_id,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        item_name: line.item_name || header.description
      }));

      await supabase.from('journal_lines').insert(newLinesToInsert);

      alert("✅ تم تعديل واتزان القيد بنجاح!");
      router.push('/journal-errors'); // الرجوع لشاشة الأخطاء
    } catch (err: any) {
      alert("❌ خطأ أثناء الحفظ: " + err.message);
    }
    setIsSaving(false);
  };

  if (isLoading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '100px', fontFamily: 'Cairo' }}>⏳ جاري تحميل القيد...</div>;

  return (
    <div className="page-wrapper">
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
        .page-wrapper {
          min-height: 100vh; padding: 40px; direction: rtl;
          background-image: linear-gradient(rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.95)), url('/ryc_login.jpeg');
          background-size: cover; background-position: center; background-attachment: fixed; color: white;
        }

        .glass-container {
          max-width: 1200px; margin: 0 auto; background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(20px); border: 1px solid ${THEME.accent}44;
          border-radius: 20px; padding: 30px; box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        }

        .header-section { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; margin-bottom: 30px; }
        
        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group label { color: ${THEME.slate}; font-size: 13px; font-weight: 700; }
        .standard-input {
          padding: 12px 15px; background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px;
          color: white; font-size: 14px; font-weight: 600; outline: none; transition: 0.3s; color-scheme: dark;
        }
        .standard-input:focus { border-color: ${THEME.accent}; }

        .lines-grid { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .lines-grid th { background: rgba(202, 138, 4, 0.1); color: ${THEME.accent}; padding: 15px; text-align: right; font-weight: 900; }
        .lines-grid td { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }

        .btn-action { padding: 10px 20px; border-radius: 10px; font-weight: 900; border: none; cursor: pointer; transition: 0.3s; }
        .btn-add { background: rgba(255,255,255,0.05); color: white; border: 1px dashed rgba(255,255,255,0.3); width: 100%; padding: 15px; }
        .btn-add:hover { background: rgba(255,255,255,0.1); }
        .btn-del { background: rgba(239, 68, 68, 0.1); color: ${THEME.danger}; padding: 8px 12px; border-radius: 8px; border: none; cursor: pointer; }
        .btn-save { background: linear-gradient(135deg, ${THEME.accent}, ${THEME.accentLight}); color: ${THEME.primary}; font-size: 18px; padding: 15px 40px; }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

        .summary-box {
          display: flex; justify-content: space-between; align-items: center;
          background: rgba(0,0,0,0.3); padding: 20px; border-radius: 15px; border-right: 4px solid ${THEME.accent}; margin-top: 30px;
        }
        .summary-item { text-align: center; }
        .summary-value { font-size: 24px; font-weight: 900; font-family: monospace; }
      `}</style>

      <div className="glass-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, color: THEME.accentLight }}>🛠️ معالجة قيد يومية #{id}</h1>
            <p style={{ color: THEME.slate, fontSize: '14px' }}>تعديل الأطراف والمبالغ لضبط ميزان المراجعة</p>
          </div>
          <button className="btn-action" style={{ background: 'transparent', border: '1px solid white', color: 'white' }} onClick={() => router.back()}>
            🔙 تراجع
          </button>
        </div>

        {/* رأس القيد */}
        <div className="header-section">
          <div className="input-group">
            <label>تاريخ القيد</label>
            <input type="date" className="standard-input" value={header.entry_date} onChange={(e) => setHeader({...header, entry_date: e.target.value})} />
          </div>
          <div className="input-group">
            <label>البيان الرئيسي للقيد</label>
            <input type="text" className="standard-input" value={header.description} onChange={(e) => setHeader({...header, description: e.target.value})} placeholder="وصف عام للقيد..." />
          </div>
        </div>

        {/* أسطر القيد */}
        <div style={{ overflowX: 'auto' }}>
          <table className="lines-grid">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>الحساب المالي</th>
                <th style={{ width: '30%' }}>البيان (السطر)</th>
                <th style={{ width: '15%', textAlign: 'center' }}>مدين</th>
                <th style={{ width: '15%', textAlign: 'center' }}>دائن</th>
                <th style={{ width: '10%', textAlign: 'center' }}>حذف</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index}>
                  <td>
                    <select className="standard-input" style={{ width: '100%', padding: '10px' }} value={line.account_id} onChange={(e) => handleLineChange(index, 'account_id', e.target.value)}>
                      <option value="">-- اختر الحساب --</option>
                      {accounts.map(acc => <option key={acc.id} value={acc.id} style={{color:'black'}}>{acc.code} - {acc.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <input type="text" className="standard-input" style={{ width: '100%', padding: '10px' }} value={line.item_name} onChange={(e) => handleLineChange(index, 'item_name', e.target.value)} placeholder="شرح تفصيلي..." />
                  </td>
                  <td>
                    <input type="number" className="standard-input" style={{ width: '100%', padding: '10px', textAlign: 'center', color: '#4ade80' }} value={line.debit || ''} onChange={(e) => handleLineChange(index, 'debit', e.target.value)} min="0" />
                  </td>
                  <td>
                    <input type="number" className="standard-input" style={{ width: '100%', padding: '10px', textAlign: 'center', color: '#f87171' }} value={line.credit || ''} onChange={(e) => handleLineChange(index, 'credit', e.target.value)} min="0" />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button type="button" className="btn-del" onClick={() => removeLine(index)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" className="btn-action btn-add" onClick={addLine}>➕ إضافة طرف جديد للقيد</button>

        {/* ملخص الاتزان */}
        <div className="summary-box">
          <div className="summary-item">
            <div style={{ color: THEME.slate, fontSize: '14px' }}>إجمالي المدين</div>
            <div className="summary-value" style={{ color: '#4ade80' }}>{totals.debit.toLocaleString()}</div>
          </div>
          
          <div className="summary-item">
            <div style={{ color: THEME.slate, fontSize: '14px' }}>الفرق (عدم الاتزان)</div>
            <div className="summary-value" style={{ color: totals.diff === 0 ? THEME.success : THEME.danger }}>
              {totals.diff === 0 ? '✔️ القيد متزن' : `⚠️ ${totals.diff.toLocaleString()}`}
            </div>
          </div>

          <div className="summary-item">
            <div style={{ color: THEME.slate, fontSize: '14px' }}>إجمالي الدائن</div>
            <div className="summary-value" style={{ color: '#f87171' }}>{totals.credit.toLocaleString()}</div>
          </div>

          <div>
            <button className="btn-action btn-save" onClick={handleSave} disabled={isSaving || totals.diff !== 0}>
              {isSaving ? '⏳ جاري الحفظ...' : 'اعتماد وحفظ القيد 💾'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}