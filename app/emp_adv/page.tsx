"use client";

import React, { useEffect, useState } from 'react';
import { useEmpDedLogic } from './emp_adv.logic';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import PaginationPanel from '@/components/PaginationPanel';
import AddAdvanceModal from './AddAdvanceModal';
import { usePermissions } from '@/lib/PermissionsContext'; // 🚀 نظام الصلاحيات
import SecureAction from '@/components/SecureAction';      // 🚀 مكون الحماية

export default function EmpAdvPage() {
  const logic = useEmpDedLogic();
  const [mounted, setMounted] = useState(false);
  const { can, loading: permsLoading } = usePermissions();

  useEffect(() => { setMounted(true); }, []);

  // 🚀 تجهيز أزرار السايد بار (صلاحيات + إجراءات جماعية)
  const sidebarActions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <SecureAction module="emp_adv" action="create">
        <button className="btn-premium-gold" onClick={logic.handleOpenAdd}>
            💸 صرف سلفة جديدة
        </button>
      </SecureAction>
      
      {logic.selectedIds?.length > 0 && (
        <>
          <p style={{fontSize:'10px', textAlign:'center', color:'#94a3b8', fontWeight:900, marginBottom:'-5px'}}>إجراءات على ({logic.selectedIds.length})</p>
          <SecureAction module="emp_adv" action="post">
            <button className="btn-main-glass blue" onClick={logic.handlePostSelected}>🚀 ترحيل المحدد</button>
            <button className="btn-main-glass orange" onClick={logic.handleSuspendSelected}>⏸️ تعليق المحدد</button>
          </SecureAction>
          <SecureAction module="emp_adv" action="delete">
            <button className="btn-main-glass red" onClick={logic.handleDeleteSelected}>🗑️ حذف نهائي</button>
          </SecureAction>
        </>
      )}

      <button className="btn-main-glass white" onClick={logic.exportToExcel}>📊 تصدير إكسل</button>
      <button className="btn-main-glass white" onClick={() => window.print()}>🖨️ طباعة الكشف</button>
    </div>
  );

  return (
    <MasterPage title="سجل سلف العمالة" subtitle="إدارة العهد والسلف المالية الميدانية">
      
      {/* 🏗️ الحاوية العائمة: دي اللي بتعمل ليفل "فوق" الهيدر والسايد بار */}
      <div className="floating-stack-layout">
        
        {/* توهج دافئ في الخلفية يفصل الطبقات */}
        <div className="warm-depth-glow" />

        <div className="content-container">
          <RawasiSidebarManager 
            summary={
              <div className="summary-glass-card">
                  <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي السلف المنصرفة 💸</span>
                  <div style={{fontSize:'26px', fontWeight:900, color: THEME.ruby, marginTop:'5px'}}>{formatCurrency(logic.totalDeductionVal || 0)}</div>
                  <div style={{fontSize:'11px', color:'#10b981', fontWeight:800, marginTop:'5px'}}>إجمالي السجلات: {logic.totalCount || 0}</div>
              </div>
            }
            actions={sidebarActions}
            customFilters={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
                  <div>
                     <label style={{color: 'white', fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px'}}>🔍 بحث سريع:</label>
                     <input type="text" placeholder="اسم العامل، البيان..." className="glass-input" value={logic.searchTerm || ''} onChange={(e) => logic.setSearchTerm && logic.setSearchTerm(e.target.value)} />
                  </div>

                  <div>
                      <label style={{color: 'white', fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px'}}>📌 الحالة:</label>
                      <div style={{ display: 'flex', gap: '5px' }}>
                          {['الكل', 'مرحل', 'معلق'].map(type => (
                              <button key={type} onClick={() => logic.setFilterStatus && logic.setFilterStatus(type)} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: logic.filterStatus === type ? THEME.goldAccent : 'rgba(255,255,255,0.1)', color: logic.filterStatus === type ? '#1e293b' : 'white', border: 'none', fontWeight: 900, cursor: 'pointer', fontSize: '11px', transition: '0.2s' }}>
                                  {type}
                              </button>
                          ))}
                      </div>
                  </div>
                  
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '5px 0' }} />
                  
                  <div>
                      <label style={{color: 'white', fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px'}}>📑 عرض السجلات:</label>
                      <select className="glass-input" value={logic.rowsPerPage || 50} onChange={(e) => { logic.setRowsPerPage && logic.setRowsPerPage(Number(e.target.value)); logic.setCurrentPage && logic.setCurrentPage(1); }}>
                          <option value={50} style={{color: '#000'}}>50 سجل</option>
                          <option value={100} style={{color: '#000'}}>100 سجل</option>
                          <option value={500} style={{color: '#000'}}>500 سجل</option>
                      </select>
                  </div>
              </div>
            }
            watchDeps={[logic.selectedIds, logic.totalDeductionVal, logic.searchTerm, logic.filterStatus]}
          />

          {/* الكارت الزجاجي الرئيسي - الطبقة الأمامية */}
          <div className="glass-master-card no-print">
            <div className="card-header">
              <h4 style={{ margin: 0, fontWeight: 900, color: THEME.primary }}>سجل السلف المستقطعة والمصروفة</h4>
            </div>

            <div className="table-inner-scroll cinematic-scroll">
              <RawasiSmartTable 
                data={logic.displayedDeductions} 
                columns={[
                  { 
                    header: 'التاريخ', 
                    accessor: 'date', 
                    render: (v:any) => <span className="date-badge">{new Date(v).toLocaleDateString('ar-EG')}</span> 
                  },
                  { header: 'الموظف / العامل (المدين)', accessor: 'emp_name', render: (v:any) => <b style={{color: THEME.primary}}>{v}</b> },
                  { header: 'البيان', accessor: 'Desc', render: (v:any) => <span style={{fontSize:'12px', color:'#64748b'}}>{v || '---'}</span> },
                  { header: 'حساب الدفع (الدائن)', accessor: 'credit_account_name', render: (v:any) => <span style={{fontSize:'11px', fontWeight:900, color:THEME.coffeeLight}}>{v || '---'}</span> },
                  { 
                    header: 'القيمة', 
                    accessor: 'amount', 
                    render: (v:any) => <b style={{ color: THEME.ruby, fontSize: '16px' }}>{formatCurrency(v)}</b> 
                  },
                  { 
                    header: 'الحالة', 
                    accessor: 'is_posted', 
                    render: (v:any) => (
                      <span className={`status-badge ${v ? 'posted' : 'pending'}`}>
                        {v ? 'مُرحل ✅' : 'معلق ⏳'}
                      </span>
                    )
                  },
                  // 🚀 عمود الإجراءات (ترحيل وتعليق) بالصلاحيات
                  {
                    header: 'إجراء',
                    accessor: 'actions',
                    render: (v:any, row:any) => (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {can('emp_adv', 'post') && (
                            !row.is_posted ? (
                                <button onClick={(e) => { e.stopPropagation(); logic.handlePostSingle && logic.handlePostSingle(row.id); }} className="action-btn post">🚀 ترحيل</button>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); logic.handleSuspendSingle && logic.handleSuspendSingle(row.id); }} className="action-btn suspend">⏸️ تعليق</button>
                            )
                        )}
                      </div>
                    )
                  }
                ]} 
                // نمنع فتح المودال للتعديل لو كانت مرحلة
                onRowClick={(row) => !row.is_posted && logic.handleEdit(row)}
              />
            </div>

            <div className="footer-pagination">
              <PaginationPanel 
                totalItems={logic.totalCount} 
                currentPage={logic.currentPage} 
                rowsPerPage={logic.rowsPerPage} 
                onPageChange={logic.setCurrentPage} 
                onRowsChange={logic.setRowsPerPage} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* المودال يظهر في أعلى طبقة عند الفتح */}
      {mounted && (
        <AddAdvanceModal 
          isOpen={logic.isEditModalOpen} 
          onClose={() => logic.setIsEditModalOpen(false)} 
          initialData={logic.editingRecord} 
          onSave={logic.handleSaveUpdate} 
        />
      )}

      {/* 🎨 التنسيقات السينمائية (Apple Style) */}
      <style>{`
        .floating-stack-layout {
          position: relative; width: 100%; padding: 20px;
          z-index: 5; direction: rtl;
        }
        .warm-depth-glow {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 20% 30%, rgba(197, 160, 89, 0.15) 0%, transparent 70%);
          z-index: -1; pointer-events: none;
        }
        .content-container { max-width: 1600px; margin: 0 auto; }

        /* 💎 الكارت الزجاجي */
        .glass-master-card {
          background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px);
          border-radius: 30px; border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.08); overflow: hidden;
          margin-top: 25px; animation: cardFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .card-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 25px 35px; background: rgba(255, 255, 255, 0.3); border-bottom: 1px solid rgba(0,0,0,0.03);
        }

        .summary-glass-card { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 15px; border-radius: 20px; text-align: center; }
        .glass-input { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white; font-weight: 800; outline: none; transition: 0.3s; }
        .glass-input:focus { background: rgba(255,255,255,0.2); border-color: ${THEME.goldAccent}; }

        .footer-pagination { padding: 20px; display: flex; justify-content: center; background: rgba(255, 255, 255, 0.1); border-top: 1px solid rgba(0,0,0,0.03); }

        .date-badge { font-size: 11px; background: #f8fafc; padding: 6px 12px; border-radius: 10px; color: #475569; font-weight: 900; border: 1px solid #e2e8f0; }
        .status-badge { padding: 6px 14px; border-radius: 12px; font-size: 11px; font-weight: 900; display: inline-block; }
        .status-badge.posted { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
        .status-badge.pending { background: #fff7ed; color: #d97706; border: 1px solid #fde68a; }

        /* أزرار الإجراءات في الجدول */
        .action-btn { padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 900; cursor: pointer; border: none; transition: 0.2s; }
        .action-btn.post { background: #166534; color: white; }
        .action-btn.post:hover { background: #14532d; transform: scale(1.05); }
        .action-btn.suspend { background: #d97706; color: white; }
        .action-btn.suspend:hover { background: #b45309; transform: scale(1.05); }

        .btn-premium-gold {
          width: 100%; padding: 16px; border-radius: 16px;
          background: linear-gradient(135deg, #c5a059, #977332);
          color: white; font-weight: 900; border: none; cursor: pointer;
          box-shadow: 0 10px 25px rgba(197, 160, 89, 0.3); transition: 0.3s;
        }
        .btn-premium-gold:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(197, 160, 89, 0.4); filter: brightness(1.1); }

        .btn-main-glass { width: 100%; padding: 12px; border-radius: 12px; border: none; font-weight: 900; cursor: pointer; transition: 0.3s; font-size: 13px; }
        .btn-main-glass.blue { background: rgba(59, 130, 246, 0.1); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.2); }
        .btn-main-glass.blue:hover { background: #3b82f6; color: white; }
        .btn-main-glass.orange { background: rgba(245, 158, 11, 0.1); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.2); }
        .btn-main-glass.orange:hover { background: #f59e0b; color: white; }
        .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.2); }
        .btn-main-glass.red:hover { background: #ef4444; color: white; }
        .btn-main-glass.white { background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2); }
        .btn-main-glass.white:hover { background: white; color: #1e293b; }

        .cinematic-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .cinematic-scroll::-webkit-scrollbar-track { background: transparent; }
        .cinematic-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }

        @keyframes cardFadeUp { from { opacity: 0; transform: translateY(40px); filter: blur(10px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      `}</style>
    </MasterPage>
  );
}