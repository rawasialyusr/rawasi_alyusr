// app/journal/page.tsx
"use client";
import React from 'react';
import { useJournalLogic } from './journal_logic';

const THEME = { odooBg: '#F3F4F6', odooText: '#374151', odooPurple: '#714B67', odooTeal: '#017E84', odooBorder: '#E5E7EB' };

export default function ProfessionalJournalPage() {
  const {
    accounts, partners, projects, isLoading, isSaving, status, entryDate, setEntryDate,
    reference, setReference, lines, addLine, removeLine, updateLine, totals, handleSaveEntry
  } = useJournalLogic();

  return (
    <div className="app-container" style={{ direction: 'rtl', backgroundColor: THEME.odooBg, minHeight: '100vh', padding: '20px 40px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
        
        .top-action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .btn-primary { background-color: ${THEME.odooTeal}; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-weight: 700; cursor: pointer; font-size: 14px; transition: 0.2s; }
        .btn-primary:hover { background-color: #016b70; }
        .btn-secondary { background-color: white; color: ${THEME.odooText}; border: 1px solid ${THEME.odooBorder}; padding: 8px 16px; border-radius: 4px; font-weight: 700; cursor: pointer; font-size: 14px; margin-right: 10px; }
        
        .status-tracker { display: flex; align-items: center; font-size: 13px; font-weight: 700; }
        .status-badge { padding: 5px 15px; border-radius: 20px; border: 1px solid ${THEME.odooBorder}; color: #9CA3AF; margin-right: 5px; }
        .status-badge.active { background-color: white; color: ${THEME.odooTeal}; border-color: ${THEME.odooTeal}; border-radius: 0; border: none; border-bottom: 2px solid ${THEME.odooTeal}; }

        .odoo-sheet { background: white; border: 1px solid ${THEME.odooBorder}; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); min-height: 70vh; }
        .sheet-title { font-size: 28px; font-weight: 900; color: ${THEME.odooText}; margin-bottom: 30px; }
        
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
        .form-group { display: flex; align-items: center; border-bottom: 1px solid transparent; padding-bottom: 5px; }
        .form-group:hover { border-bottom: 1px solid ${THEME.odooBorder}; }
        .form-label { width: 140px; font-size: 14px; font-weight: 700; color: #4B5563; }
        .form-input { flex: 1; border: none; outline: none; font-size: 14px; color: ${THEME.odooText}; padding: 5px 0; background: transparent; }
        .form-input:focus { border-bottom: 1px solid ${THEME.odooTeal}; }

        .tabs { display: flex; border-bottom: 1px solid ${THEME.odooBorder}; margin-bottom: 15px; }
        .tab { padding: 10px 20px; font-size: 14px; font-weight: 700; color: ${THEME.odooText}; cursor: pointer; border-bottom: 2px solid transparent; }
        .tab.active { border-bottom: 2px solid ${THEME.odooTeal}; color: ${THEME.odooTeal}; }

        .odoo-table { width: 100%; border-collapse: collapse; }
        .odoo-table th { text-align: right; padding: 10px 5px; font-size: 13px; font-weight: 700; color: #6B7280; border-bottom: 2px solid ${THEME.odooBorder}; }
        .odoo-table td { padding: 4px 5px; border-bottom: 1px solid ${THEME.odooBorder}; }
        .cell-input { width: 100%; border: none; outline: none; font-size: 14px; padding: 8px 5px; background: transparent; color: ${THEME.odooText}; }
        .cell-input:focus { background-color: #F9FAFB; }
        .num-input { text-align: left; direction: ltr; }

        .add-line-link { color: ${THEME.odooTeal}; font-size: 14px; font-weight: 700; cursor: pointer; display: inline-block; padding: 10px 5px; }
        .add-line-link:hover { text-decoration: underline; }

        .totals-section { float: left; width: 300px; margin-top: 20px; font-size: 14px; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid ${THEME.odooBorder}; }
      `}</style>

      <div className="top-action-bar">
        <div>
          <button className="btn-primary" onClick={handleSaveEntry} disabled={isSaving || !totals.isBalanced}>
            {isSaving ? 'جاري الحفظ...' : 'حفظ / ترحيل'}
          </button>
          <button className="btn-secondary">إلغاء</button>
        </div>
        <div className="status-tracker">
          <span className={`status-badge ${status === 'مُرحّل' ? 'active' : ''}`}>مُرحّل</span>
          <span className={`status-badge ${status === 'مسودة' ? 'active' : ''}`}>مسودة</span>
        </div>
      </div>

      <div className="odoo-sheet">
        <h1 className="sheet-title">قيد يومية جديد</h1>

        <div className="form-grid">
          <div>
            <div className="form-group">
              <label className="form-label">المرجع</label>
              <input type="text" className="form-input" placeholder="مثال: INV/2026/001" value={reference} onChange={e => setReference(e.target.value)} />
            </div>
          </div>
          <div>
            <div className="form-group">
              <label className="form-label">تاريخ المحاسبة</label>
              <input type="date" className="form-input" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginTop: '10px' }}>
              <label className="form-label">دفتر اليومية</label>
              <select className="form-input">
                <option>عمليات متنوعة (Miscellaneous)</option>
                <option>يومية البنك (Bank)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="tabs">
          <div className="tab active">عناصر دفتر اليومية</div>
          <div className="tab">معلومات أخرى</div>
        </div>

        {/* 🟢 الجدول الاحترافي بعد إضافة مركز التكلفة */}
        <table className="odoo-table">
          <thead>
            <tr>
              <th style={{ width: '20%' }}>الحساب</th>
              <th style={{ width: '15%' }}>الشريك</th>
              <th style={{ width: '15%' }}>مركز التكلفة</th>
              <th style={{ width: '20%' }}>التسمية</th>
              <th style={{ width: '12%', textAlign: 'left' }}>مدين</th>
              <th style={{ width: '12%', textAlign: 'left' }}>دائن</th>
              <th style={{ width: '6%' }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td>
                  <select className="cell-input" value={line.account_id} onChange={e => updateLine(line.id, 'account_id', e.target.value)}>
                    <option value=""></option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} {acc.name}</option>)}
                  </select>
                </td>
                <td>
                  <select className="cell-input" value={line.partner_id} onChange={e => updateLine(line.id, 'partner_id', e.target.value)}>
                    <option value=""></option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                {/* 🆕 عمود مركز التكلفة (المشروع) */}
                <td>
                  <select className="cell-input" value={line.project_id} onChange={e => updateLine(line.id, 'project_id', e.target.value)}>
                    <option value=""></option>
                    {projects.map(proj => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
                  </select>
                </td>
                <td>
                  <input type="text" className="cell-input" placeholder="التسمية..." value={line.notes} onChange={e => updateLine(line.id, 'notes', e.target.value)} />
                </td>
                <td>
                  <input type="number" className="cell-input num-input" placeholder="0.00" value={line.debit} onChange={e => updateLine(line.id, 'debit', e.target.value)} disabled={!!line.credit} />
                </td>
                <td>
                  <input type="number" className="cell-input num-input" placeholder="0.00" value={line.credit} onChange={e => updateLine(line.id, 'credit', e.target.value)} disabled={!!line.debit} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button onClick={() => removeLine(line.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="add-line-link" onClick={addLine}>إضافة بند</div>

        <div style={{ clear: 'both' }}>
          <div className="totals-section">
            <div className="total-row">
              <span style={{ fontWeight: 700 }}>إجمالي المدين:</span>
              <span>{totals.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م</span>
            </div>
            <div className="total-row">
              <span style={{ fontWeight: 700 }}>إجمالي الدائن:</span>
              <span>{totals.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م</span>
            </div>
            <div className="total-row" style={{ borderBottom: 'none', color: totals.difference === 0 ? THEME.odooTeal : '#DC2626', fontWeight: 900 }}>
              <span>{totals.difference === 0 ? '✔️ متوازن' : '❌ غير متوازن:'}</span>
              <span>{totals.difference === 0 ? '' : totals.difference.toLocaleString(undefined, { minimumFractionDigits: 2 }) + ' ج.م'}</span>
            </div>
          </div>
        </div>
        <div style={{ clear: 'both' }}></div>

      </div>
    </div>
  );
}