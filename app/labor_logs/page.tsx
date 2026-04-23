"use client";
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom'; 
import { useLaborLogsLogic } from './labor_logs_logic';
import { THEME } from '@/lib/theme';
import { usePermissions } from '@/lib/PermissionsContext'; 
import SecureAction from '@/components/SecureAction';      
import SmartCombo from '@/components/SmartCombo'; 
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';

export default function LaborLogsDirectory() {
  const logic = useLaborLogsLogic();
  const [mounted, setMounted] = useState(false);
  const { can, loading: permsLoading } = usePermissions();

  useEffect(() => { setMounted(true); }, []);

  const isOneSelected = logic.selectedIds.length === 1;
  const isNoneSelected = logic.selectedIds.length === 0;

  const toggleSelectAll = () => {
    if (logic.selectedIds.length === logic.filteredLogs.length && logic.filteredLogs.length > 0) {
      logic.setSelectedIds([]);
    } else {
      logic.setSelectedIds(logic.filteredLogs.map((l:any) => l.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (logic.selectedIds.includes(id)) {
      logic.setSelectedIds(logic.selectedIds.filter((item:any) => item !== id));
    } else {
      logic.setSelectedIds([...logic.selectedIds, id]);
    }
  };

  const handleMainAction = () => {
    if (isOneSelected) {
      const logToEdit = logic.filteredLogs.find((l:any) => l.id === logic.selectedIds[0]);
      if (logToEdit) logic.handleEdit(logToEdit);
    } else {
      logic.setEditingId(null);
      logic.setCurrentLog(logic.defaultLog);
      logic.setIsAddModalOpen(true);
    }
  };

  const getAttendanceBadge = (val: any) => {
    const num = parseFloat(val);
    if (num === 1) return { bg: '#ecfdf5', color: '#059669', text: 'يوم كامل' };
    if (num === 0.5) return { bg: '#fff7ed', color: '#d97706', text: 'نص يوم' };
    return { bg: '#fef2f2', color: '#dc2626', text: 'غياب' };
  };

  const sidebarActions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <SecureAction module="labor_logs" action="create">
        <button className="btn-main-glass gold" onClick={handleMainAction}>
            {isOneSelected ? '✏️ تعديل اليومية' : '➕ إضافة يومية جديدة'}
        </button>
      </SecureAction>
      
      {logic.selectedIds.length > 0 && (
        <>
          <p style={{fontSize:'10px', textAlign:'center', color:'#94a3b8', fontWeight:900, marginBottom:'-5px'}}>الإجراءات على ({logic.selectedIds.length})</p>
          <SecureAction module="labor_logs" action="post">
            <button className="btn-main-glass blue" onClick={logic.handlePostSelected}>🚀 اعتماد وترحيل</button>
          </SecureAction>
          
          <SecureAction module="labor_logs" action="post">
            <button className="btn-main-glass" style={{background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white'}} onClick={logic.handleSuspendSelected}>⏸️ تعليق اليومية</button>
          </SecureAction>

          <SecureAction module="labor_logs" action="delete">
            <button className="btn-main-glass red" onClick={() => logic.selectedIds.forEach((id:any) => logic.handleDelete(id))}>🗑️ حذف نهائي</button>
          </SecureAction>
        </>
      )}

      <button className="btn-main-glass white" onClick={logic.exportToExcel}>📊 تصدير إكسل</button>
      <button className="btn-main-glass white" onClick={() => window.print()}>🖨️ طباعة الكشف</button>
    </div>
  );
  
  return (
    <MasterPage 
      title="يوميات العمالة" 
      subtitle="إدارة الحضور والأجور الميدانية - رواسي اليسر للمقاولات"
    >
      <RawasiSidebarManager 
        summary={
            <div className="summary-glass-card">
                <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي الأجور المحسوبة 💰</span>
                <div className="val" style={{fontSize:'24px', fontWeight:900, color: THEME.goldAccent, marginTop:'5px'}}>{logic.formatCurrency(logic.stats.sum || 0)}</div>
                <div style={{fontSize:'11px', color:'#10b981', fontWeight:800, marginTop:'5px'}}>إجمالي السجلات: {logic.totalResults}</div>
            </div>
        }
        actions={sidebarActions}
        customFilters={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
                <div>
                   <label style={{color: 'white', fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px'}}>بحث سريع:</label>
                   <input type="text" placeholder="الاسم، الموقع، البند..." className="glass-input" value={logic.searchTerm} onChange={(e) => logic.setSearchTerm(e.target.value)} />
                </div>

                <div>
                    <label style={{color: 'white', fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px'}}>تصفية حسب الحالة:</label>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        {['الكل', 'مرحل', 'معلق'].map(type => (
                            <button key={type} onClick={() => logic.setFilterStatus(type)} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: logic.filterStatus === type ? THEME.goldAccent : 'rgba(255,255,255,0.1)', color: logic.filterStatus === type ? '#1e293b' : 'white', border: 'none', fontWeight: 900, cursor: 'pointer', fontSize: '11px' }}>
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '5px 0' }} />
                
                <div>
                    <label style={{color: 'white', fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px'}}>عرض السجلات:</label>
                    <select className="glass-input" value={logic.rowsPerPage} onChange={(e) => { logic.setRowsPerPage(Number(e.target.value)); logic.setCurrentPage(1); }}>
                        <option value={50} style={{color: '#000'}}>50 سجل</option>
                        <option value={100} style={{color: '#000'}}>100 سجل</option>
                        <option value={500} style={{color: '#000'}}>500 سجل</option>
                    </select>
                </div>
            </div>
        }
        watchDeps={[logic.selectedIds, logic.stats.sum, logic.searchTerm, logic.filterStatus, logic.rowsPerPage]}
      />

      <style>{`
        .rawasi-table { width: 100%; border-collapse: collapse; text-align: right; min-width: 1300px; }
        .rawasi-table th { padding: 15px; border-bottom: 2px solid rgba(0,0,0,0.05); color: #64748b; font-weight: 900; font-size: 13px; }
        .rawasi-table td { padding: 15px; border-bottom: 1px solid rgba(0,0,0,0.02); font-size: 13px; font-weight: 700; color: #1e293b; }
        .rawasi-table tbody tr { transition: 0.2s; cursor: pointer; }
        .rawasi-table tbody tr:hover { background: rgba(197, 160, 89, 0.08) !important; }
        .custom-checkbox { width: 20px; height: 20px; accent-color: ${THEME.goldAccent}; cursor: pointer; }
        .glass-badge { padding: 6px 12px; border-radius: 10px; font-size: 11px; font-weight: 900; display: inline-block; }
        .glass-input { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white; font-weight: 800; outline: none; }
        
        .warm-portal-overlay-fullscreen {
            position: fixed !important;
            top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
            width: 100vw !important; height: 100vh !important;
            background: radial-gradient(circle at center, rgba(139, 69, 19, 0.4) 0%, rgba(15, 7, 0, 0.9) 100%) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            display: flex !important; align-items: center !important; justify-content: center !important;
            z-index: 999999999 !important;
        }

        @keyframes modalScaleUp {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        
        @media print {
          @page { size: A4 landscape; margin: 1cm; }
          aside, .no-print, button, .master-header { display: none !important; }
          .clean-page { display: block !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          .print-only { display: block !important; }
          .print-header { display: flex !important; justify-content: space-between; align-items: center; border-bottom: 3px solid ${THEME.coffeeDark}; padding-bottom: 15px; margin-bottom: 25px; }
          .print-table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed; }
          .print-table th, .print-table td { border: 1px solid #000 !important; padding: 8px 6px !important; text-align: center !important; font-size: 10pt !important; color: black !important; }
          .print-table th { background: #f2f2f2 !important; font-weight: 900; }
        }
      `}</style>

      <div className="no-print">
        {(logic.isLoading || permsLoading) ? (
          <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8' }}>⏳ جاري المزامنة...</div>
        ) : (
          <div className="cinematic-scroll" style={{ overflowX: 'auto' }}>
            <table className="rawasi-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                     <input type="checkbox" className="custom-checkbox" onChange={toggleSelectAll} checked={logic.selectedIds.length === logic.filteredLogs.length && logic.filteredLogs.length > 0} />
                  </th>
                  <th>التاريخ</th>
                  <th>المقاول</th>
                  <th>اسم العامل</th>
                  <th>الموقع</th>
                  <th>البند</th>
                  {/* 🆕 العواميد المجمعة للإنتاجية */}
                  <th>الطريحة</th>
                  <th>الإنتاجية</th>
                  <th>الإنجاز (%)</th>
                  
                  <th>اليومية 💰</th>
                  <th>الحضور</th>
                  <th>حالة الترحيل</th>
                  <th>الملاحظات</th>
                  <th style={{ textAlign: 'center' }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {logic.filteredLogs.length === 0 ? (
                  <tr><td colSpan={14} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 900 }}>🔍 لا توجد سجلات</td></tr>
                ) : logic.filteredLogs.map((l:any) => {
                    const isSelected = logic.selectedIds.includes(l.id);
                    const badge = getAttendanceBadge(l.attendance_value);
                    return (
                      <tr key={l.id} style={{ background: isSelected ? 'rgba(197, 160, 89, 0.08)' : (l.is_posted ? 'rgba(16, 185, 129, 0.02)' : 'transparent') }} onClick={() => toggleSelectRow(l.id)}>
                        <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={isSelected} readOnly /></td>
                        <td style={{ color: THEME.goldAccent, fontWeight: 900 }}>{l.work_date}</td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>{l.sub_contractor || 'المركز'}</td>
                        <td style={{ fontWeight: 900 }}>{l.worker_name}</td>
                        <td style={{ color: '#475569' }}>{l.site_ref}</td>
                        <td style={{ color: '#475569' }}>{l.work_item}</td>
                        
                        <td style={{ color: '#0f172a', fontWeight: 800 }}>{l.tareeha || '---'}</td>
                        {/* 🆕 داتا عمود الإنتاجية */}
                        <td style={{ color: THEME.goldAccent, fontWeight: 800 }}>{l.productivity || '---'}</td>
                        <td style={{ color: THEME.success, fontWeight: 900 }}>{l.completion_percentage ? `${l.completion_percentage}%` : '---'}</td>
                        
                        <td style={{ fontWeight: 900, color: '#059669' }}>{logic.formatCurrency(l.daily_wage || 0)}</td>
                        <td><span className="glass-badge" style={{ backgroundColor: badge.bg, color: badge.color }}>{badge.text}</span></td>
                        
                        <td>
                           {l.is_posted ? (
                               <span className="glass-badge" style={{backgroundColor: '#ecfdf5', color: '#059669'}}>مرحل ✅</span>
                           ) : (
                               <span className="glass-badge" style={{backgroundColor: '#fff7ed', color: '#d97706'}}>معلق ⏳</span>
                           )}
                        </td>

                        <td style={{ fontSize: '12px', color: '#94a3b8' }}>{l.notes || '---'}</td>
                        <td style={{ textAlign: 'center' }}>
                          {can('labor_logs', 'post') && (
                              !l.is_posted ? (
                                  <button onClick={(e) => { e.stopPropagation(); logic.handlePostSingle(l.id); }} style={{ background: '#166534', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 900 }}>🚀 ترحيل</button>
                              ) : (
                                  <button onClick={(e) => { e.stopPropagation(); logic.handleSuspendSingle(l.id); }} style={{ background: '#d97706', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 900 }}>⏸️ تعليق</button>
                              )
                          )}
                        </td>
                      </tr>
                    );
                })}
              </tbody>
            </table>
            
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', paddingBottom: '10px' }}>
                <button disabled={logic.currentPage === 1} onClick={() => logic.setCurrentPage((p:number) => p - 1)} style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 900, cursor: 'pointer' }}>السابق</button>
                <div style={{background: THEME.coffeeDark, color:'white', padding:'10px 25px', borderRadius:'12px', fontWeight:900}}>صفحة {logic.currentPage} من {logic.totalPages || 1}</div>
                <button disabled={logic.currentPage >= logic.totalPages} onClick={() => logic.setCurrentPage((p:number) => p + 1)} style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 900, cursor: 'pointer' }}>التالي</button>
            </div>
          </div>
        )}
      </div>

      <div className="print-only" style={{ display: 'none' }}>
        <div className="print-header">
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: '26pt', color: THEME.coffeeDark, fontWeight: 900 }}>سجل يوميات العمالة</h1>
            <p style={{ margin: 0, fontSize: '14pt', color: THEME.goldAccent, fontWeight: 700 }}>رواسي اليسر للمقاولات</p>
          </div>
          <img src="/RYC_Logo.png" style={{ width: '180px' }} alt="Logo" />
        </div>
        <table className="print-table">
          <thead>
            {/* 🆕 إضافة عمود الإنتاجية في الطباعة */}
            <tr><th>التاريخ</th><th>المقاول</th><th>اسم العامل</th><th>الموقع</th><th>البند</th><th>الطريحة</th><th>الإنتاجية</th><th>الإنجاز</th><th>اليومية</th><th>الحضور</th><th>الترحيل</th></tr>
          </thead>
          <tbody>
            {logic.filteredLogs.map((l:any) => (
              <tr key={l.id}>
                <td>{l.work_date}</td>
                <td>{l.sub_contractor}</td>
                <td>{l.worker_name}</td>
                <td>{l.site_ref}</td>
                <td>{l.work_item}</td>
                
                <td>{l.tareeha || '-'}</td>
                {/* 🆕 بيانات الإنتاجية في الطباعة */}
                <td>{l.productivity || '-'}</td>
                <td>{l.completion_percentage ? `${l.completion_percentage}%` : '-'}</td>
                
                <td>{logic.formatCurrency(l.daily_wage)}</td>
                <td>{l.attendance_value == 1 ? 'كامل':'نصف'}</td>
                <td>{l.is_posted ? 'مرحل' : 'معلق'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mounted && logic.isAddModalOpen && createPortal(
        <div className="warm-portal-overlay-fullscreen" onClick={() => logic.setIsAddModalOpen(false)}>
          <div className="cinematic-scroll" onClick={(e) => e.stopPropagation()} style={{ background: 'white', padding: '35px', borderRadius: '30px', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', direction: 'rtl', boxShadow: '0 40px 100px rgba(0,0,0,0.8)', animation: 'modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <h2 style={{ fontWeight: 900, color: THEME.coffeeDark, marginBottom: '25px', fontSize: '24px', borderBottom: `2px dashed ${THEME.goldAccent}`, paddingBottom: '15px' }}>
              {logic.editingId ? '✏️ تعديل بيانات اليومية' : '➕ إضافة يومية جديدة'}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                 <div>
                    <label style={{color:THEME.coffeeMain, fontSize:'12px', fontWeight:900, display:'block', marginBottom:'8px'}}>📅 التاريخ</label>
                    <input type="date" value={logic.currentLog.work_date || ''} onChange={e => logic.setCurrentLog({...logic.currentLog, work_date: e.target.value})} style={{padding:'14px', borderRadius:'12px', border:'2px solid #e2e8f0', width:'100%', fontWeight:800, outline:'none'}} />
                 </div>
                 <div>
                    <label style={{color:THEME.coffeeMain, fontSize:'12px', fontWeight:900, display:'block', marginBottom:'8px'}}>🏗️ المقاول (اختياري)</label>
                    <input type="text" placeholder="اسم المقاول" value={logic.currentLog.sub_contractor || ''} onChange={e => logic.setCurrentLog({...logic.currentLog, sub_contractor: e.target.value})} style={{padding:'14px', borderRadius:'12px', border:'2px solid #e2e8f0', width:'100%', fontWeight:800, outline:'none'}} />
                 </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', zIndex: 100 }}>
                 <SmartCombo label="👷 اسم العامل" table="partners" displayCol="name" freeText={true} initialDisplay={logic.currentLog.worker_name} onSelect={(v:any)=>logic.setCurrentLog({...logic.currentLog, worker_name: v.name || v})} />
                 <SmartCombo label="📍 الموقع / العمارة" table="projects" displayCol="Property" freeText={true} initialDisplay={logic.currentLog.site_ref} onSelect={(v:any)=>logic.setCurrentLog({...logic.currentLog, site_ref: v.Property || v})} />
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', zIndex: 90 }}>
                 <SmartCombo 
                    label="🔨 البند" 
                    table="boq_items" 
                    searchCols="item_name,item_code" 
                    displayCol="item_name" 
                    freeText={true} 
                    initialDisplay={logic.currentLog.work_item || ''} 
                    onSelect={(v:any) => logic.setCurrentLog({...logic.currentLog, work_item: v.item_name || v})} 
                 />
                 <div>
                    <label style={{color:THEME.coffeeMain, fontSize:'12px', fontWeight:900, display:'block', marginBottom:'8px'}}>💰 اليومية</label>
                    <input type="number" placeholder="القيمة" value={logic.currentLog.daily_wage || ''} onChange={e => logic.setCurrentLog({...logic.currentLog, daily_wage: e.target.value})} style={{padding:'14px', borderRadius:'12px', border:'2px solid #e2e8f0', width:'100%', fontWeight:900, color: THEME.success, outline:'none'}} />
                 </div>
               </div>

               {/* 🆕 تقسيم الـ 3 خانات (طريحة - إنتاجية - إنجاز) */}
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                 <div>
                    <label style={{color:THEME.coffeeMain, fontSize:'12px', fontWeight:900, display:'block', marginBottom:'8px'}}>📦 الطريحة (المهمة)</label>
                    <input type="text" placeholder="مثال: مباني" value={logic.currentLog.tareeha || ''} onChange={e => logic.setCurrentLog({...logic.currentLog, tareeha: e.target.value})} style={{padding:'14px', borderRadius:'12px', border:'2px solid #e2e8f0', width:'100%', fontWeight:800, outline:'none'}} />
                 </div>
                 <div>
                    <label style={{color:THEME.coffeeMain, fontSize:'12px', fontWeight:900, display:'block', marginBottom:'8px'}}>📈 الإنتاجية</label>
                    <input type="text" placeholder="مثال: 50 متر" value={logic.currentLog.productivity || ''} onChange={e => logic.setCurrentLog({...logic.currentLog, productivity: e.target.value})} style={{padding:'14px', borderRadius:'12px', border:'2px solid #e2e8f0', width:'100%', fontWeight:800, outline:'none'}} />
                 </div>
                 <div>
                    <label style={{color:THEME.coffeeMain, fontSize:'12px', fontWeight:900, display:'block', marginBottom:'8px'}}>📊 الإنجاز (%)</label>
                    <input type="number" min="0" max="100" placeholder="100" value={logic.currentLog.completion_percentage || ''} onChange={e => logic.setCurrentLog({...logic.currentLog, completion_percentage: e.target.value})} style={{padding:'14px', borderRadius:'12px', border:'2px solid #e2e8f0', width:'100%', fontWeight:900, color: THEME.success, outline:'none'}} />
                 </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                 <div>
                    <label style={{color:THEME.coffeeMain, fontSize:'12px', fontWeight:900, display:'block', marginBottom:'8px'}}>⏱️ الحضور</label>
                    <select value={logic.currentLog.attendance_value ?? 1} onChange={e => logic.setCurrentLog({...logic.currentLog, attendance_value: Number(e.target.value)})} style={{padding:'14px', borderRadius:'12px', border:'2px solid #e2e8f0', width:'100%', fontWeight:800, outline:'none', appearance: 'auto'}}>
                        <option value={1}>يوم كامل</option>
                        <option value={0.5}>نصف يوم</option>
                        <option value={0}>غياب</option>
                    </select>
                 </div>
                 <div>
                    <label style={{color:THEME.coffeeMain, fontSize:'12px', fontWeight:900, display:'block', marginBottom:'8px'}}>📝 الملاحظات</label>
                    <input type="text" placeholder="أي ملاحظات إضافية..." value={logic.currentLog.notes || ''} onChange={e => logic.setCurrentLog({...logic.currentLog, notes: e.target.value})} style={{padding:'14px', borderRadius:'12px', border:'2px solid #e2e8f0', width:'100%', fontWeight:800, outline:'none'}} />
                 </div>
               </div>

               <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                 <button onClick={logic.handleSaveLog} disabled={logic.isSaving} style={{ flex: 2, background: THEME.coffeeDark, color: 'white', padding: '16px', borderRadius: '15px', border: 'none', fontWeight: 900, cursor: 'pointer', fontSize: '16px', transition: '0.3s' }}>
                   {logic.isSaving ? '⏳ جاري الحفظ...' : '💾 اعتماد اليومية'}
                 </button>
                 <button onClick={() => logic.setIsAddModalOpen(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', padding: '16px', borderRadius: '15px', border: 'none', fontWeight: 900, cursor: 'pointer', transition: '0.3s' }}>إلغاء</button>
               </div>

            </div>
          </div>
        </div>, document.body
      )}
   </MasterPage>
  );
}