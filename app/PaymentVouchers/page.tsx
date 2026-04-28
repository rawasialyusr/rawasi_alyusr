"use client";
import React, { useState, useEffect } from 'react'; 
import { usePaymentVouchersLogic } from './payment_vouchers_logic';
import { THEME } from '@/lib/theme';
import SmartCombo from '@/components/SmartCombo'; 
import RawasiSidebarManager from '@/components/RawasiSidebarManager'; 
import { usePermissions } from '@/lib/PermissionsContext'; 
import SecureAction from '@/components/SecureAction';      
import { formatCurrency } from '@/lib/helpers';
import MasterPage from '@/components/MasterPage';
import RawasiSmartTable from '@/components/rawasismarttable';

import PaymentVoucherModal from './PaymentVoucherModal'; 
import PaymentPrintModal from './PaymentPrintModal'; // مودال الطباعة

export default function PaymentVouchersPage() {
  const logic = usePaymentVouchersLogic();
  const [mounted, setMounted] = useState(false); 
  const { can, loading: permsLoading } = usePermissions();

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState(null);

  useEffect(() => setMounted(true), []);

  const voucherColumns = [
    {
      header: 'تحديد',
      accessor: 'id',
      render: (row: any) => {
        if (!row) return null;
        const isSelected = logic.selectedIds.includes(row.id);
        return (
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-block' }}>
              <input 
                  type="checkbox" 
                  className="custom-checkbox" 
                  checked={isSelected} 
                  onChange={(e) => {
                      e.stopPropagation();
                      if (isSelected) logic.setSelectedIds(logic.selectedIds.filter((i:any) => i !== row.id)); 
                      else logic.setSelectedIds([...logic.selectedIds, row.id]); 
                  }} 
              />
          </div>
        );
      }
    },
    { header: 'رقم السند', accessor: 'voucher_number', render: (row: any) => row ? <b style={{ color: THEME.primary, fontSize: '14px' }}>#{row.voucher_number}</b> : null },
    { header: 'التاريخ', accessor: 'date', render: (row: any) => row ? <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 700 }}>{row.date}</span> : null },
    { header: 'المستفيد', accessor: 'payee_name', render: (row: any) => row ? <b style={{ fontWeight: 900, color: '#1e293b' }}>{row.payee_name || '---'}</b> : null },
    { header: 'طريقة الدفع', accessor: 'payment_method', render: (row: any) => row ? <span style={{ fontSize:'11px', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', color: '#475569', fontWeight: 900 }}>{row.payment_method || '---'}</span> : null },
    { header: 'البيان', accessor: 'description', render: (row: any) => row ? <span style={{ fontSize:'12px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>{row.description}</span> : null },
    { header: 'المبلغ', accessor: 'amount', render: (row: any) => row ? <span style={{ color: THEME.danger, fontWeight: 900, fontSize: '15px' }}>{formatCurrency(row.amount)}</span> : null },
    {
      header: 'الحالة',
      accessor: 'is_posted',
      render: (row: any) => {
        if (!row) return null;
        return row.is_posted ? 
          <span style={{ display: 'inline-block', background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 900 }}>مُرحل ✅</span> : 
          <span style={{ display: 'inline-block', background: '#fff7ed', color: '#d97706', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 900 }}>معلق ⏳</span>;
      }
    },
    {
      header: 'الإجراءات',
      accessor: 'actions',
      render: (row: any) => {
        if (!row) return null;
        return (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setPrintData(row); setIsPrintModalOpen(true); }} 
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.1)', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', fontSize: '14px' }}
              title="طباعة السند"
            >
              🖨️
            </button>
          </div>
        );
      }
    }
  ];

  const sidebarActions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <SecureAction module="payments" action="create">
        <button className="btn-main-glass gold" onClick={logic.handleAddNew}>➕ إصدار سند صرف</button>
      </SecureAction>

      {logic.selectedIds.length > 0 && (
        <>
          <p style={{fontSize:'10px', textAlign:'center', color:'#94a3b8', fontWeight:900, marginBottom:'-5px'}}>الإجراءات على ({logic.selectedIds.length})</p>
          
          {logic.selectedIds.length === 1 && (
            <SecureAction module="payments" action="edit">
              <button className="btn-main-glass white" onClick={logic.handleEditSelected}>✏️ تعديل السجل</button>
            </SecureAction>
          )}

          <SecureAction module="payments" action="post">
            <button className="btn-main-glass green" onClick={logic.handlePostSelected}>🚀 اعتماد وترحيل</button>
          </SecureAction>

          <SecureAction module="payments" action="post">
            <button className="btn-main-glass yellow" onClick={logic.handleUnpostSelected}>↩️ فك الترحيل</button>
          </SecureAction>

          <SecureAction module="payments" action="delete">
            <button className="btn-main-glass red" onClick={logic.handleDeleteSelected}>🗑️ حذف نهائي</button>
          </SecureAction>
        </>
      )}
    </div>
  );

  return (
    <div className="clean-page">
      <MasterPage title="سندات الصرف" subtitle="إدارة المدفوعات والتحويلات المالية">
          <RawasiSidebarManager 
            summary={
              <div className="summary-glass-card">
                <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي المدفوعات 📉</span>
                <div className="val" style={{fontSize:'24px', fontWeight:900, color: THEME.danger, marginTop:'5px'}}>{formatCurrency(logic.totalAmount)}</div>
              </div>
            }
            actions={sidebarActions}
            customFilters={
              <div style={{marginTop: '10px'}}>
                <SmartCombo 
                    placeholder="🔍 بحث برقم السند أو المستفيد..."
                    initialDisplay={logic.globalSearch}
                    onSelect={(val: any) => logic.setGlobalSearch(typeof val === 'object' ? val.name : val)}
                    enableClear={true}
                    freeText={true}
                />
              </div>
            }
            onSearch={() => {}} 
            watchDeps={[logic.selectedIds, logic.totalAmount, logic.rowsPerPage, logic.filteredVouchers.length, logic.globalSearch]}
          />

          <style>{`
            .custom-checkbox { width: 20px; height: 20px; accent-color: ${THEME.goldAccent}; cursor: pointer; transition: 0.1s; }
            .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
            .btn-main-glass.gold { background: linear-gradient(135deg, rgba(197, 160, 89, 0.9), rgba(151, 115, 50, 1)); color: white; }
            .btn-main-glass.green { background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(22, 163, 74, 0.9)); color: white; }
            .btn-main-glass.yellow { background: linear-gradient(135deg, rgba(245, 158, 11, 0.8), rgba(217, 119, 6, 0.9)); color: white; }
            .btn-main-glass.white { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255,255,255,0.8); }
            .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
            .btn-main-glass:hover { transform: translateY(-3px); filter: brightness(1.1); }
            .summary-glass-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); padding: 20px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 25px; }
          `}</style>

          {(logic.isLoading || permsLoading) ? (
            <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8' }}>⏳ جاري المزامنة...</div>
          ) : (
            <RawasiSmartTable 
                data={logic.filteredVouchers.slice((logic.currentPage-1)*logic.rowsPerPage, logic.currentPage*logic.rowsPerPage)} 
                columns={voucherColumns} 
                onRowClick={(row) => { setPrintData(row); setIsPrintModalOpen(true); }}
                
                // 🚀 تشغيل الـ Pagination السيادي من داخل الجدول
                enablePagination={true}
                currentPage={logic.currentPage}
                totalItems={logic.filteredVouchers.length}
                rowsPerPage={logic.rowsPerPage}
                onPageChange={logic.setCurrentPage}
                onRowsChange={logic.setRowsPerPage}
            />
          )}

          {mounted && logic.isEditModalOpen && (
             <PaymentVoucherModal 
                 isOpen={logic.isEditModalOpen} 
                 onClose={() => logic.setIsEditModalOpen(false)} 
                 record={logic.currentVoucher} 
                 setRecord={logic.setCurrentVoucher}
                 onSave={logic.handleSaveVoucher}
                 isSaving={logic.isSaving}
             />
          )}

          {mounted && isPrintModalOpen && (
              <PaymentPrintModal 
                isOpen={isPrintModalOpen} 
                onClose={() => setIsPrintModalOpen(false)} 
                record={printData} 
              />
          )}

      </MasterPage>
    </div>
  );
}