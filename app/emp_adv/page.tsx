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

export default function EmpAdvPage() {
  const logic = useEmpDedLogic();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <MasterPage title="سجل سلف العمالة" subtitle="إدارة العهد والسلف المالية">
      
      {/* 🏗️ الحاوية العائمة: دي اللي بتعمل ليفل "فوق" الهيدر والسايد بار */}
      <div className="floating-stack-layout">
        
        {/* توهج دافئ في الخلفية يفصل الطبقات */}
        <div className="warm-depth-glow" />

        <div className="content-container">
          <RawasiSidebarManager 
            actions={
              <button className="btn-premium-gold" onClick={logic.handleOpenAdd}>
                  ➕ إضافة سلفة جديدة
              </button>
            }
            watchDeps={[logic.selectedIds]}
          />

          {/* الكارت الزجاجي الرئيسي - الطبقة الأمامية */}
          <div className="glass-master-card">
            <div className="card-header">
              <h4 style={{ margin: 0, fontWeight: 900, color: THEME.primary }}>سجل السلف والمستخلصات</h4>
              <div className="stat-pill">الإجمالي: {formatCurrency(logic.totalDeductionVal)}</div>
            </div>

            <div className="table-inner-scroll">
              <RawasiSmartTable 
                data={logic.displayedDeductions} 
                columns={[
                  { 
                    header: 'التاريخ', 
                    accessor: 'date', 
                    render: (v:any) => <span className="date-badge">{new Date(v).toLocaleDateString('ar-EG')}</span> 
                  },
                  { header: 'الموظف / الشريك', accessor: 'emp_name' },
                  { header: 'البيان', accessor: 'Desc' },
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
                  }
                ]} 
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

      {/* 🎨 التنسيقات السينمائية للفصل بين الطبقات */}
      <style>{`
        .floating-stack-layout {
          position: relative;
          width: 100%;
          padding: 20px;
          z-index: 5; /* ليفل أعلى من خلفية الـ MasterPage */
          direction: rtl;
        }

        .warm-depth-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 20% 30%, rgba(197, 160, 89, 0.15) 0%, transparent 70%);
          z-index: -1;
          pointer-events: none;
        }

        .content-container { max-width: 1600px; margin: 0 auto; }

        /* 💎 الكارت الزجاجي (القدام) */
        .glass-master-card {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border-radius: 35px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          margin-top: 25px;
          animation: cardFadeUp 0.6s ease-out;
        }

        .card-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 25px 35px; background: rgba(255, 255, 255, 0.2);
          border-bottom: 1px solid rgba(0,0,0,0.03);
        }

        .stat-pill { background: white; color: ${THEME.primary}; padding: 8px 18px; border-radius: 14px; font-weight: 900; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        .footer-pagination { padding: 20px; display: flex; justify-content: center; background: rgba(255, 255, 255, 0.1); }

        .date-badge { font-size: 11px; background: #f8fafc; padding: 4px 10px; border-radius: 8px; color: #64748b; font-weight: 800; border: 1px solid #f1f5f9; }
        .status-badge { padding: 5px 12px; border-radius: 10px; font-size: 11px; font-weight: 900; }
        .status-badge.posted { background: #ecfdf5; color: #059669; }
        .status-badge.pending { background: #fff7ed; color: #d97706; }

        .btn-premium-gold {
          width: 100%; padding: 16px; border-radius: 20px;
          background: linear-gradient(135deg, #c5a059, #977332);
          color: white; font-weight: 900; border: none; cursor: pointer;
          box-shadow: 0 10px 25px rgba(197, 160, 89, 0.3); transition: 0.3s;
        }
        .btn-premium-gold:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(197, 160, 89, 0.4); }

        @keyframes cardFadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </MasterPage>
  );
}