"use client";
import React from 'react';
import { useJournalEditLogic } from './journal_edit_logic';

// 🎨 THEME: Light Cinematic Glassmorphism
const THEME = {
  primary: '#0f172a',      // كحلي داكن للنصوص الأساسية
  primaryLight: '#1e293b',
  accent: '#ca8a04',       // ذهبي للإضاءة والأزرار
  accentLight: '#eab308',
  white: '#ffffff',
  glassSurface: 'rgba(255, 255, 255, 0.65)', // زجاج فاتح شفاف
  glassInput: 'rgba(255, 255, 255, 0.5)',    // زجاج للحقول
  glassBorder: 'rgba(255, 255, 255, 0.6)',   // إطارات زجاجية مضيئة
  text: '#0f172a',         // نصوص واضحة جداً
  textMuted: '#475569',
  danger: '#dc2626',
  success: '#059669'
};

export default function EditJournalEntryPage() {
  const {
    id, isLoading, isSaving, accounts, header, setHeader, lines, totals,
    handleLineChange, addLine, removeLine, handleSave, router
  } = useJournalEditLogic();

  if (isLoading) return <div style={{ color: THEME.primary, textAlign: 'center', marginTop: '100px', fontFamily: 'Cairo', fontSize: '20px', fontWeight: 900 }}>⏳ جاري تحميل بيانات القيد...</div>;

  return (
    <div className="page-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
        
        /* 🚀 1. الخلفية السينمائية الفاتحة (Light Overlay) */
        .page-wrapper {
          min-height: 100vh; padding: 30px; direction: rtl;
          background-image: linear-gradient(rgba(241, 245, 249, 0.85), rgba(255, 255, 255, 0.95)), url('/ryc_login.jpeg');
          background-size: cover; background-position: center; background-attachment: fixed;
          color: ${THEME.text};
        }

        /* 🚀 2. الكروت الزجاجية المصنفرة (Frosted Glass) */
        .glass-container {
          max-width: 1200px; margin: 0 auto; 
          background: ${THEME.glassSurface};
          backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px);
          border: 1px solid ${THEME.glassBorder};
          border-radius: 20px; padding: 30px; 
          box-shadow: 0 20px 40px rgba(0,0,0,0.08); /* ظل سينمائي ناعم */
        }

        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 15px; }
        .header-section { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; margin-bottom: 30px; }
        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group label { color: ${THEME.primary}; font-size: 13px; font-weight: 900; }
        
        /* 🚀 3. حقول الإدخال الزجاجية */
        .standard-input {
          padding: 12px 15px; 
          background: ${THEME.glassInput};
          backdrop-filter: blur(10px);
          border: 1px solid ${THEME.glassBorder}; border-radius: 10px;
          color: ${THEME.text}; font-size: 15px; font-weight: 700; outline: none; transition: 0.3s;
        }
        .standard-input:focus { 
          border-color: ${THEME.accent}; 
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 0 15px rgba(202, 138, 4, 0.15); 
        }
        .standard-input option { background: ${THEME.white}; color: ${THEME.text}; }

        /* 🚀 4. الجدول (زجاجي مع هيدر كحلي للوضوح) */
        .table-responsive { 
          width: 100%; overflow-x: auto; margin-bottom: 20px; 
          background: rgba(255, 255, 255, 0.4); 
          backdrop-filter: blur(15px);
          border-radius: 12px; border: 1px solid ${THEME.glassBorder}; 
          box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        }
        .lines-grid { width: 100%; border-collapse: collapse; min-width: 800px; }
        
        /* هيدر صلب وقوي يفصل البيانات */
        .lines-grid th { background: ${THEME.primary}; color: ${THEME.white}; padding: 15px; text-align: right; font-weight: 900; font-size: 14px; }
        .lines-grid td { padding: 12px; border-bottom: 1px solid rgba(0,0,0,0.05); }

        /* 🚀 5. الأزرار */
        .btn-action { padding: 10px 20px; border-radius: 10px; font-weight: 900; border: none; cursor: pointer; transition: 0.3s; }
        .btn-back { background: rgba(255,255,255,0.5); border: 1px solid rgba(0,0,0,0.1); color: ${THEME.text}; backdrop-filter: blur(5px); }
        .btn-back:hover { background: rgba(255,255,255,0.8); }
        
        .btn-add { background: rgba(255,255,255,0.4); color: ${THEME.primary}; border: 1px dashed rgba(0,0,0,0.2); width: 100%; padding: 15px; margin-bottom: 30px; }
        .btn-add:hover { background: rgba(255,255,255,0.8); border-color: ${THEME.primary}; }
        
        .btn-del { background: rgba(239, 68, 68, 0.1); color: ${THEME.danger}; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2); cursor: pointer; }
        .btn-del:hover { background: ${THEME.danger}; color: white; }
        
        .btn-save { background: linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryLight}); color: ${THEME.white}; font-size: 18px; padding: 15px 40px; width: 100%; box-shadow: 0 5px 15px rgba(15, 23, 42, 0.2); }
        .btn-save:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15, 23, 42, 0.3); }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

        /* 🚀 6. صندوق الملخص الزجاجي */
        .summary-box {
          display: flex; justify-content: space-between; align-items: center; gap: 20px;
          background: rgba(255,255,255,0.5); backdrop-filter: blur(15px);
          padding: 20px 30px; border-radius: 15px; border: 1px solid ${THEME.glassBorder}; border-right: 5px solid ${THEME.accent};
        }
        .summary-item { text-align: center; flex: 1; }
        .summary-value { font-size: 26px; font-weight: 900; font-family: monospace; }

        @media (max-width: 768px) {
          .page-wrapper { padding: 15px; }
          .header-section { grid-template-columns: 1fr; }
          .summary-box { flex-direction: column; align-items: stretch; text-align: center; }
          .summary-item { margin-bottom: 15px; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 10px; }
          .summary-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        }
      `}</style>

      <div className="glass-container">
        
        <div className="page-header">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: THEME.primary, marginBottom: '5px' }}>🛠️ معالجة قيد يومية #{id}</h1>
            <p style={{ color: THEME.textMuted, fontSize: '14px', fontWeight: 700 }}>تعديل الأطراف والمبالغ لضبط ميزان المراجعة</p>
          </div>
          <button className="btn-action btn-back" onClick={() => router.back()}>🔙 تراجع للوحة المراجعة</button>
        </div>

        {/* رأس القيد */}
        <div className="header-section">
          <div className="input-group">
            <label>تاريخ القيد</label>
            <input type="date" className="standard-input" value={header.entry_date} onChange={(e) => setHeader({...header, entry_date: e.target.value})} />
          </div>
          <div className="input-group">
            <label>البيان الرئيسي للقيد (مطلوب)</label>
            <input type="text" className="standard-input" value={header.description} onChange={(e) => setHeader({...header, description: e.target.value})} placeholder="وصف عام للقيد..." />
          </div>
        </div>

        {/* أسطر القيد */}
        <div className="table-responsive">
          <table className="lines-grid">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>الحساب المالي</th>
                <th style={{ width: '30%' }}>البيان (السطر)</th>
                <th style={{ width: '15%', textAlign: 'center' }}>مدين</th>
                <th style={{ width: '15%', textAlign: 'center' }}>دائن</th>
                <th style={{ width: '10%', textAlign: 'center' }}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index}>
                  <td>
                    <select className="standard-input" style={{ width: '100%' }} value={line.account_id} onChange={(e) => handleLineChange(index, 'account_id', e.target.value)}>
                      <option value="">-- اختر الحساب --</option>
                      {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <input type="text" className="standard-input" style={{ width: '100%' }} value={line.item_name} onChange={(e) => handleLineChange(index, 'item_name', e.target.value)} placeholder="شرح تفصيلي للسطر..." />
                  </td>
                  <td>
                    <input type="number" className="standard-input" style={{ width: '100%', textAlign: 'center', color: THEME.success, fontWeight: 900 }} value={line.debit || ''} onChange={(e) => handleLineChange(index, 'debit', e.target.value)} min="0" placeholder="0.00" />
                  </td>
                  <td>
                    <input type="number" className="standard-input" style={{ width: '100%', textAlign: 'center', color: THEME.danger, fontWeight: 900 }} value={line.credit || ''} onChange={(e) => handleLineChange(index, 'credit', e.target.value)} min="0" placeholder="0.00" />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button type="button" className="btn-del" onClick={() => removeLine(index)} title="حذف السطر">🗑️</button>
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
            <div style={{ color: THEME.textMuted, fontSize: '13px', fontWeight: 800, marginBottom: '5px' }}>إجمالي المدين</div>
            <div className="summary-value" style={{ color: THEME.success }}>{totals.debit.toLocaleString()}</div>
          </div>
          
          <div className="summary-item">
            <div style={{ color: THEME.textMuted, fontSize: '13px', fontWeight: 800, marginBottom: '5px' }}>الفرق (عدم الاتزان)</div>
            <div className="summary-value" style={{ color: totals.diff === 0 ? THEME.success : THEME.danger }}>
              {totals.diff === 0 ? '✔️ متزن' : `⚠️ ${totals.diff.toLocaleString()}`}
            </div>
          </div>

          <div className="summary-item">
            <div style={{ color: THEME.textMuted, fontSize: '13px', fontWeight: 800, marginBottom: '5px' }}>إجمالي الدائن</div>
            <div className="summary-value" style={{ color: THEME.danger }}>{totals.credit.toLocaleString()}</div>
          </div>

          <div style={{ flex: '1.5' }}>
            <button className="btn-action btn-save" onClick={handleSave} disabled={isSaving || totals.diff !== 0}>
              {isSaving ? '⏳ جاري الحفظ...' : 'اعتماد وحفظ القيد 💾'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}