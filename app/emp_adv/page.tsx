"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useEmpDedLogic } from './emp_adv.logic';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { usePermissions } from '@/lib/PermissionsContext'; 
import SecureAction from '@/components/SecureAction';      
import SmartCombo from '@/components/SmartCombo'; 
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';

export default function EmpDedPage() {
  const logic = useEmpDedLogic();
  const { can: checkPermission, loading: authLoading } = usePermissions();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // 🛠️ الزراير في السايد بار (تم إضافة زر الإضافة)
  const sidebarActions = useMemo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <SecureAction module="emp_ded" action="create">
        <button className="btn-main-glass gold" onClick={logic.handleOpenAdd}>
            ➕ إضافة سلفة جديدة
        </button>
      </SecureAction>
      
      {logic.selectedIds.length > 0 && (
        <>
          <p style={{fontSize:'10px', textAlign:'center', color:'#94a3b8', fontWeight:900, marginBottom:'-5px'}}>الإجراءات على ({logic.selectedIds.length})</p>
          <SecureAction module="emp_ded" action="post">
            <button className="btn-main-glass blue" onClick={logic.handlePostSelected}>🚀 ترحيل محاسبي</button>
          </SecureAction>
          <SecureAction module="emp_ded" action="delete">
            <button className="btn-main-glass red" onClick={logic.handleDelete}>🗑️ حذف نهائي</button>
          </SecureAction>
        </>
      )}
    </div>
  ), [logic.selectedIds]);

  return (
    <MasterPage title="سجل سلف العمالة" subtitle="إدارة عُهد وسلف العمال والموظفين - رواسي اليسر">
      
      <RawasiSidebarManager 
        actions={sidebarActions}
        summary={
          <div className="summary-glass-card">
              <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي السلف 💸</span>
              <div className="val" style={{fontSize:'24px', fontWeight:900, color: THEME.ruby, marginTop:'5px'}}>{formatCurrency(logic.totalDeductionVal)}</div>
          </div>
        }
        customFilters={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <input type="date" className="glass-input" value={logic.startDate} onChange={(e) => logic.setStartDate(e.target.value)} />
              <input type="date" className="glass-input" value={logic.endDate} onChange={(e) => logic.setEndDate(e.target.value)} />
          </div>
        }
        watchDeps={[logic.selectedIds, logic.totalDeductionVal, logic.startDate, logic.endDate]}
      />

      <div style={{ marginBottom: '20px', zIndex: 100, position: 'relative' }}>
        <SmartCombo placeholder="🔍 بحث سريع باسم الموظف..." initialDisplay={logic.searchSite} onSelect={(val: any) => logic.setSearchSite(typeof val === 'object' ? val.name : val)} freeText={true} />
      </div>

      {(logic.loading || authLoading) ? (
        <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8' }}>⏳ جاري المزامنة...</div>
      ) : (
        <div className="cinematic-scroll">
          <table className="rawasi-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                   <input type="checkbox" onChange={logic.toggleSelectAll} checked={(logic.displayedDeductions?.length ?? 0) > 0 && logic.selectedIds.length === logic.displayedDeductions.length} />
                </th>
                <th>الحالة</th><th>التاريخ</th><th>الموظف</th><th>البيان</th><th>القيمة</th><th>تعديل</th>
              </tr>
            </thead>
            <tbody>
              {logic.displayedDeductions.map((ded:any) => (
                <tr key={ded.id} style={{ background: logic.selectedIds.includes(String(ded.id)) ? 'rgba(202, 138, 4, 0.05)' : 'transparent' }} onClick={() => logic.toggleSelectRow(String(ded.id))}>
                  <td style={{ textAlign: 'center' }}><input type="checkbox" checked={logic.selectedIds.includes(String(ded.id))} readOnly /></td>
                  <td>{ded.is_posted ? '✅ مُرحل' : '⏳ معلق'}</td>
                  <td>{new Date(ded.date).toLocaleDateString('ar-EG')}</td>
                  <td style={{ fontWeight: 900 }}>{ded.emp_name}</td>
                  <td>{ded.Desc || '-'}</td>
                  <td style={{ fontWeight: 900, color: THEME.ruby }}>{formatCurrency(ded.amount)}</td>
                  <td style={{textAlign:'center'}}>{!ded.is_posted && <button onClick={(e) => { e.stopPropagation(); logic.handleEdit(ded); }} style={{background:'none', border:'none', cursor:'pointer'}}>✏️</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ✏️ مودال الإضافة والتعديل المشترك */}
      {mounted && logic.isEditModalOpen && logic.editingRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: 'white', padding: '35px', borderRadius: '30px', width: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <h3 style={{fontWeight: 900, marginBottom: '25px', color: THEME.brand.coffee, borderBottom:'2px dashed #eee', paddingBottom:'15px'}}>
                {logic.editingRecord.id ? '✏️ تعديل بيانات السلفة' : '➕ إضافة سلفة جديدة'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{fontSize:'12px', fontWeight:900, display:'block', marginBottom:'5px'}}>التاريخ</label>
                <input type="date" value={logic.editingRecord.date || ''} onChange={(e) => logic.setEditingRecord({...logic.editingRecord, date: e.target.value})} style={{padding:'12px', borderRadius:'10px', border:'1px solid #ddd', width:'100%'}} />
              </div>
              <SmartCombo label="الموظف / العامل" table="employees" freeText={true} initialDisplay={logic.editingRecord.emp_name} onSelect={(v:any)=>logic.setEditingRecord({...logic.editingRecord, emp_name: v.name || v})} />
              <div>
                <label style={{fontSize:'12px', fontWeight:900, display:'block', marginBottom:'5px'}}>القيمة</label>
                <input type="number" placeholder="0.00" value={logic.editingRecord.amount} onChange={(e) => logic.setEditingRecord({...logic.editingRecord, amount: e.target.value})} style={{padding:'12px', borderRadius:'10px', border:'1px solid #ddd', width:'100%', fontWeight:900, color:THEME.ruby}} />
              </div>
              <div>
                <label style={{fontSize:'12px', fontWeight:900, display:'block', marginBottom:'5px'}}>البيان / ملاحظات</label>
                <input type="text" placeholder="سبب السلفة..." value={logic.editingRecord.Desc || ''} onChange={(e) => logic.setEditingRecord({...logic.editingRecord, Desc: e.target.value})} style={{padding:'12px', borderRadius:'10px', border:'1px solid #ddd', width:'100%'}} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button onClick={logic.handleSaveUpdate} style={{ flex: 2, background: '#10b981', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 900, cursor: 'pointer' }}>💾 حفظ واعتماد</button>
              <button onClick={() => logic.setIsEditModalOpen(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 900, cursor: 'pointer' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .rawasi-table td, .rawasi-table th { padding: 15px; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .glass-input { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white; outline: none; }
        .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; }
        .btn-main-glass.gold { background: linear-gradient(135deg, #c5a059, #977332); color: white; }
        .btn-main-glass.blue { background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; }
        .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .btn-main-glass.white { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255, 255, 255, 0.8); }
        .summary-glass-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); padding: 20px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 25px; }
      `}</style>
    </MasterPage>
  );
}