"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useLaborLogsLogic } from './labor_logs_logic';
import { THEME } from '@/lib/theme';
import { usePermissions } from '@/lib/PermissionsContext'; 
import SecureAction from '@/components/SecureAction';      
import SmartCombo from '@/components/SmartCombo'; 
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';

export default function LaborLogsDirectory() {
  const logic = useLaborLogsLogic();
  const [mounted, setMounted] = useState(false);
  const { can, loading: permsLoading } = usePermissions();

  useEffect(() => { setMounted(true); }, []);

  const isOneSelected = logic.selectedIds.length === 1;

  // 📋 1. تعريف أعمدة الجدول الذكي - مطابق للميثاق V11
  const columns = useMemo(() => [
    { 
      key: 'work_date', 
      label: 'التاريخ', 
      sortable: true,
      render: (row: any) => {
        if (!row) return null; // 🛡️ حارس الرندر الإلزامي
        return <span style={{ color: THEME.goldAccent, fontWeight: 900 }}>{row.work_date}</span>
      }
    },
    { key: 'sub_contractor', label: 'المقاول', render: (row: any) => row?.sub_contractor || 'المركز' },
    { key: 'worker_name', label: 'اسم العامل', bold: true },
    { key: 'site_ref', label: 'الموقع' },
    { key: 'work_item', label: 'البند' },
    { 
      key: 'daily_wage', 
      label: 'اليومية 💰', 
      render: (row: any) => {
        if (!row) return null;
        return <span style={{ fontWeight: 900, color: '#059669' }}>{logic.formatCurrency(row.daily_wage || 0)}</span>
      }
    },
    { 
      key: 'attendance_value', 
      label: 'الحضور', 
      render: (row: any) => {
        if (!row) return null;
        const style = logic.getAttendanceStyle(String(row.attendance_value));
        return (
          <span className="glass-badge" style={{ backgroundColor: style.bg, color: style.color }}>
            {row.attendance_value === 1 ? 'يوم كامل' : row.attendance_value === 0.5 ? 'نصف يوم' : 'غياب'}
          </span>
        );
      }
    },
    { 
      key: 'is_posted', 
      label: 'الحالة', 
      render: (row: any) => {
        if (!row) return null;
        return (
          <span className="glass-badge" style={{ backgroundColor: row.is_posted ? '#ecfdf5' : '#fff7ed', color: row.is_posted ? '#059669' : '#d97706' }}>
            {row.is_posted ? 'مرحل ✅' : 'معلق ⏳'}
          </span>
        );
      }
    }
  ], [logic]);

  // 🚀 2. إجراءات السايد بار (Actions)
  const sidebarActions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <SecureAction module="labor_logs" action="create">
        <button className="btn-main-glass gold" onClick={() => {
            if (isOneSelected) {
                const logToEdit = logic.filteredLogs.find((l:any) => l.id === logic.selectedIds[0]);
                if (logToEdit) logic.handleEdit(logToEdit);
            } else {
                logic.setEditingId(null);
                logic.setCurrentLog(logic.defaultLog);
                logic.setIsAddModalOpen(true);
            }
        }}>
            {isOneSelected ? '✏️ تعديل اليومية' : '➕ إضافة يومية جديدة'}
        </button>
      </SecureAction>
      
      {logic.selectedIds.length > 0 && (
        <>
          <p style={{fontSize:'10px', textAlign:'center', color:'#94a3b8', fontWeight:900, marginBottom:'-5px'}}>الإجراءات على ({logic.selectedIds.length})</p>
          <SecureAction module="labor_logs" action="post">
            <button className="btn-main-glass blue" onClick={logic.handlePostSelected} disabled={logic.isPosting}>
                {logic.isPosting ? '⏳ جاري الترحيل...' : '🚀 اعتماد وترحيل'}
            </button>
          </SecureAction>
          
          <SecureAction module="labor_logs" action="post">
            <button className="btn-main-glass" style={{background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white'}} onClick={logic.handleSuspendSelected} disabled={logic.isSuspending}>
                {logic.isSuspending ? '⏳ جاري التعليق...' : '⏸️ تعليق اليومية'}
            </button>
          </SecureAction>

          <SecureAction module="labor_logs" action="delete">
            <button className="btn-main-glass red" onClick={logic.handleDeleteSelected}>🗑️ حذف نهائي</button>
          </SecureAction>
        </>
      )}

      <button className="btn-main-glass white" onClick={logic.exportToExcel}>📊 تصدير إكسل</button>
      <button className="btn-main-glass white" onClick={() => window.print()}>🖨️ طباعة الكشف</button>
    </div>
  );
  
  return (
    // 🟢 تم إضافة Fragment ( <> ) لفصل المودال عن الـ MasterPage
    <>
      <MasterPage 
        title="يوميات العمالة" 
        subtitle="إدارة الحضور والأجور الميدانية - رواسي اليسر للمقاولات"
      >
        <RawasiSidebarManager 
          summary={
            <div className="summary-glass-card">
              <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي الأجور المحسوبة 💰</span>
              <div className="val" style={{fontSize:'24px', fontWeight:900, color: THEME.goldAccent, marginTop:'5px'}}>
                {logic.formatCurrency(logic.stats.sum || 0)}
              </div>
              <div style={{fontSize:'11px', color:'#10b981', fontWeight:800, marginTop:'5px'}}>
                إجمالي السجلات: {logic.totalResults}
              </div>
            </div>
          }
          actions={sidebarActions}
          customFilters={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
              <div>
                <label className="glass-label">بحث سريع:</label>
                <input 
                  type="text" 
                  placeholder="الاسم، الموقع، البند..." 
                  className="glass-input" 
                  value={logic.searchTerm} 
                  onChange={(e) => logic.setSearchTerm(e.target.value)} 
                />
              </div>

              <div>
                <label className="glass-label">تصفية حسب الحالة:</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {['الكل', 'مرحل', 'معلق'].map(type => (
                    <button 
                      key={type} 
                      onClick={() => logic.setFilterStatus(type)} 
                      className={`filter-btn ${logic.filterStatus === type ? 'active' : ''}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-divider" />
              
              <div>
                <label className="glass-label">عرض السجلات:</label>
                <select 
                  className="glass-input dark-select" 
                  value={logic.rowsPerPage} 
                  onChange={(e) => { logic.setRowsPerPage(Number(e.target.value)); logic.setCurrentPage(1); }}
                >
                  <option value={50}>50 سجل</option>
                  <option value={100}>100 سجل</option>
                  <option value={500}>500 سجل</option>
                </select>
              </div>
            </div>
          }
          watchDeps={[logic.selectedIds, logic.stats.sum, logic.searchTerm, logic.filterStatus, logic.rowsPerPage]}
        />

        <style>{`
          .glass-label { color: white; fontSize: 12px; fontWeight: 900; display: block; marginBottom: 8px; }
          .filter-btn { flex: 1; padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.1); color: white; border: none; fontWeight: 900; cursor: pointer; fontSize: 11px; transition: 0.3s; }
          .filter-btn.active { background: ${THEME.goldAccent}; color: #1e293b; }
          .glass-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 5px 0; }
          .dark-select option { color: #000; }
          .pagination-container { marginTop: 20px; display: flex; justifyContent: center; alignItems: center; gap: 15px; paddingBottom: 20px; }
          .page-indicator { background: ${THEME.coffeeDark}; color: white; padding: 10px 25px; border-radius: 12px; fontWeight: 900; }
          .btn-nav { padding: 10px 20px; border-radius: 12px; border: 1px solid #cbd5e1; background: white; fontWeight: 900; cursor: pointer; }
          .glass-badge { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 900; display: inline-block; }
          
          /* أنماط المودال التي تم نقلها هنا لتطبيقها بأمان */
          .modal-label { color: ${THEME.coffeeMain}; fontSize: 12px; fontWeight: 900; display: block; marginBottom: 8px; }
          .modal-input { padding: 14px; border-radius: 12px; border: 2px solid #e2e8f0; width: 100%; fontWeight: 800; outline: none; }
          .success-text { fontWeight: 900; color: ${THEME.success}; }
          .save-btn { flex: 2; background: ${THEME.coffeeDark}; color: white; padding: 16px; border-radius: 15px; border: none; fontWeight: 900; cursor: pointer; fontSize: 16px; transition: 0.3s; }
          .cancel-btn { flex: 1; background: #f1f5f9; color: #64748b; padding: 16px; border-radius: 15px; border: none; fontWeight: 900; cursor: pointer; transition: 0.3s; }
          .save-btn:hover { background: ${THEME.goldAccent}; color: #1e293b; }
        `}</style>

        {/* 💎 منطقة الجدول الذكي (Smart Table Engine) */}
        <div className="no-print">
          {logic.isLoading ? (
            <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8' }}>
              ⏳ جاري المزامنة مع رواسي...
            </div>
          ) : (
            <div className="cinematic-scroll" style={{ background: 'white', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <RawasiSmartTable 
                columns={columns} 
                data={logic.filteredLogs}
                isLoading={logic.isLoading}
                selectable={true} 
                selectedIds={logic.selectedIds}
                onSelectionChange={logic.setSelectedIds}
              />
              
              <div className="pagination-container">
                <button 
                  disabled={logic.currentPage === 1} 
                  onClick={() => logic.setCurrentPage(p => p - 1)} 
                  className="btn-nav"
                >
                  السابق
                </button>
                <div className="page-indicator">
                  صفحة {logic.currentPage} من {logic.totalPages || 1}
                </div>
                <button 
                  disabled={logic.currentPage >= logic.totalPages} 
                  onClick={() => logic.setCurrentPage(p => p + 1)} 
                  className="btn-nav"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 🖨️ نسخة الطباعة القانونية (Print-Only) */}
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
              <tr>
                <th>التاريخ</th><th>المقاول</th><th>اسم العامل</th><th>الموقع</th><th>البند</th>
                <th>الطريحة</th><th>الإنتاجية</th><th>الإنجاز</th><th>اليومية</th><th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {logic.filteredLogs.map((l:any, idx: number) => (
                <tr key={`print-${l.id}-${idx}`}>
                  <td>{l.work_date}</td>
                  <td>{l.sub_contractor || 'المركز'}</td>
                  <td>{l.worker_name}</td>
                  <td>{l.site_ref}</td>
                  <td>{l.work_item}</td>
                  <td>{l.tareeha || '-'}</td>
                  <td>{l.productivity || '-'}</td>
                  <td>{l.completion_percentage ? `${l.completion_percentage}%` : '-'}</td>
                  <td>{logic.formatCurrency(l.daily_wage)}</td>
                  <td>{l.is_posted ? 'مرحل' : 'معلق'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MasterPage>

      {/* ➕ المودال خارج الـ MasterPage ليكون متوسطاً 100% بدون سكرول */}
      {mounted && logic.isAddModalOpen && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            // 🟢 خلفية بلور دافية (Warm Blur) باستخدام لون الـ Coffee
            backgroundColor: 'rgba(67, 52, 46, 0.5)', 
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 999999, 
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
          }}
          onClick={() => logic.setIsAddModalOpen(false)}
        >
          <div 
            className="cinematic-scroll modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              background: 'white', padding: '35px', borderRadius: '24px', 
              width: '100%', maxWidth: '750px', maxHeight: '90vh', 
              overflowY: 'auto', direction: 'rtl', boxShadow: '0 40px 100px rgba(0,0,0,0.5)'
            }}
          >
            <h2 style={{ fontWeight: 900, color: THEME.coffeeDark, marginBottom: '25px', fontSize: '24px', borderBottom: `2px dashed ${THEME.goldAccent}`, paddingBottom: '15px' }}>
              {logic.editingId ? '✏️ تعديل بيانات اليومية' : '➕ إضافة يومية جديدة'}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                 <div>
                    <label className="modal-label">📅 التاريخ</label>
                    <input 
                      type="date" 
                      value={logic.currentLog.work_date || ''} 
                      onChange={e => logic.setCurrentLog({...logic.currentLog, work_date: e.target.value})} 
                      className="modal-input" 
                    />
                 </div>
                 <div>
                    <label className="modal-label">🏗️ المقاول (اختياري)</label>
                    <input 
                      type="text" 
                      placeholder="اسم المقاول" 
                      value={logic.currentLog.sub_contractor || ''} 
                      onChange={e => logic.setCurrentLog({...logic.currentLog, sub_contractor: e.target.value})} 
                      className="modal-input" 
                    />
                 </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', zIndex: 100 }}>
                 <SmartCombo 
                   label="👷 اسم العامل" 
                   table="partners" 
                   displayCol="name" 
                   freeText={true} 
                   initialDisplay={logic.currentLog.worker_name} 
                   onSelect={(v:any)=>logic.setCurrentLog({...logic.currentLog, worker_name: v?.name || v, worker_partner_id: v?.id || null})} 
                 />
                 <SmartCombo 
                   label="📍 الموقع / العمارة" 
                   table="projects" 
                   displayCol="Property" 
                   searchCols="Property,project_name,project_code" 
                   freeText={true} 
                   initialDisplay={logic.currentLog.site_ref} 
                   onSelect={(v:any)=>logic.setCurrentLog({...logic.currentLog, site_ref: v?.Property || v, project_id: v?.id || null})} 
                 />
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', zIndex: 90 }}>
                 <SmartCombo 
                   label="🔨 البند" 
                   table="boq_items" 
                   searchCols="item_name,item_code" 
                   displayCol="item_name" 
                   freeText={true} 
                   initialDisplay={logic.currentLog.work_item || ''} 
                   onSelect={(v:any) => logic.setCurrentLog({...logic.currentLog, work_item: v?.item_name || v})} 
                 />
                 <div>
                    <label className="modal-label">💰 اليومية</label>
                    <input 
                      type="number" 
                      placeholder="القيمة" 
                      value={logic.currentLog.daily_wage || ''} 
                      onChange={e => logic.setCurrentLog({...logic.currentLog, daily_wage: e.target.value})} 
                      className="modal-input success-text" 
                    />
                 </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                 <div>
                    <label className="modal-label">📦 الطريحة (المهمة)</label>
                    <input 
                      type="text" 
                      placeholder="مثال: مباني" 
                      value={logic.currentLog.tareeha || ''} 
                      onChange={e => logic.setCurrentLog({...logic.currentLog, tareeha: e.target.value})} 
                      className="modal-input" 
                    />
                 </div>
                 <div>
                    <label className="modal-label">📈 الإنتاجية</label>
                    <input 
                      type="text" 
                      placeholder="مثال: 50 متر" 
                      value={logic.currentLog.productivity || ''} 
                      onChange={e => logic.setCurrentLog({...logic.currentLog, productivity: e.target.value})} 
                      className="modal-input" 
                    />
                 </div>
                 <div>
                    <label className="modal-label">📊 الإنجاز (%)</label>
                    <input 
                      type="number" 
                      min="0" max="100" 
                      placeholder="100" 
                      value={logic.currentLog.completion_percentage || ''} 
                      onChange={e => logic.setCurrentLog({...logic.currentLog, completion_percentage: e.target.value})} 
                      className="modal-input success-text" 
                    />
                 </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                 <div>
                    <label className="modal-label">⏱️ الحضور</label>
                    <select 
                      value={logic.currentLog.attendance_value ?? 1} 
                      onChange={e => logic.setCurrentLog({...logic.currentLog, attendance_value: Number(e.target.value)})} 
                      className="modal-input"
                    >
                      <option value={1}>يوم كامل</option>
                      <option value={0.5}>نصف يوم</option>
                      <option value={0}>غياب</option>
                    </select>
                 </div>
                 <div>
                    <label className="modal-label">📝 الملاحظات</label>
                    <input 
                      type="text" 
                      placeholder="أي ملاحظات إضافية..." 
                      value={logic.currentLog.notes || ''} 
                      onChange={e => logic.setCurrentLog({...logic.currentLog, notes: e.target.value})} 
                      className="modal-input" 
                    />
                 </div>
               </div>

               <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                 <button 
                   onClick={logic.handleSaveLog} 
                   disabled={logic.isSaving} 
                   className="save-btn"
                 >
                   {logic.isSaving ? '⏳ جاري الحفظ...' : '💾 اعتماد اليومية'}
                 </button>
                 <button 
                   onClick={() => logic.setIsAddModalOpen(false)} 
                   className="cancel-btn"
                 >
                   إلغاء
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}