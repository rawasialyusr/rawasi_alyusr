"use client";
import React, { useState, useEffect, useMemo } from 'react'; 
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
import PaymentPrintModal from './PaymentPrintModal'; 

export default function PaymentVouchersPage() {
  const logic = usePaymentVouchersLogic();
  const [mounted, setMounted] = useState(false); 
  const { can, loading: permsLoading } = usePermissions();

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState(null);

  useEffect(() => setMounted(true), []);

  // 🚀 استخراج العناصر المعروضة في الصفحة الحالية
  const currentVisibleIds = useMemo(() => {
    return logic.data
      .slice((logic.state.currentPage - 1) * logic.state.rowsPerPage, logic.state.currentPage * logic.state.rowsPerPage)
      .map((v: any) => v.id);
  }, [logic.data, logic.state.currentPage, logic.state.rowsPerPage]);

  const isAllVisibleSelected = currentVisibleIds.length > 0 && currentVisibleIds.every(id => logic.state.selectedIds.includes(id));

  // 🚀 مصفوفة الأعمدة للجدول
  const voucherColumns = useMemo(() => [
    {
      header: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <input 
                  type="checkbox" 
                  className="custom-checkbox"
                  checked={isAllVisibleSelected}
                  title="تحديد كل الصفحة"
                  onChange={() => {
                      if (isAllVisibleSelected) {
                          logic.actions.setSelectedIds(logic.state.selectedIds.filter((id: string) => !currentVisibleIds.includes(id)));
                      } else {
                          logic.actions.setSelectedIds([...new Set([...logic.state.selectedIds, ...currentVisibleIds])]);
                      }
                  }}
              />
          </div>
      ), 
      accessor: 'id',
      render: (row: any) => {
        if (!row) return null; // 🛡️ Render Guard (V11 Standard)
        const isSelected = logic.state.selectedIds.includes(row.id);
        return (
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'center' }}>
              <input 
                  type="checkbox" 
                  className="custom-checkbox" 
                  checked={isSelected} 
                  onChange={(e) => {
                      e.stopPropagation();
                      if (isSelected) logic.actions.setSelectedIds(logic.state.selectedIds.filter((i:any) => i !== row.id)); 
                      else logic.actions.setSelectedIds([...logic.state.selectedIds, row.id]); 
                  }} 
              />
          </div>
        );
      }
    },
    { header: 'رقم السند', accessor: 'voucher_number', render: (row: any) => row ? <b style={{ color: THEME.primary, fontSize: '14px' }}>#{row.voucher_number}</b> : null },
    { header: 'التاريخ', accessor: 'date', render: (row: any) => row ? <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 700 }}>{row.date}</span> : null },
    { 
      header: 'المستفيد', 
      accessor: 'payee_name', 
      render: (row: any) => row ? <b style={{ fontWeight: 900, color: '#1e293b' }}>👤 {row.payee?.name || row.payee_name || '---'}</b> : null 
    },
    { 
      header: 'الحساب الدائن (الخزينة)', 
      accessor: 'credit_account_id', 
      render: (row: any) => row ? (
        <span style={{ fontSize:'11px', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', color: '#475569', fontWeight: 900 }}>
          🏦 {row.credit_account?.name || '---'} 
        </span>
      ) : null 
    },
    { 
      header: 'الحساب المدين', 
      accessor: 'debit_account_id', 
      render: (row: any) => row ? (
        <span style={{ fontSize:'11px', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', color: '#475569', fontWeight: 900 }}>
          🧾 {row.debit_account?.name || '---'}
        </span>
      ) : null 
    },
    { header: 'البيان', accessor: 'description', render: (row: any) => row ? <span style={{ fontSize:'12px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>{row.description}</span> : null },
    { header: 'المبلغ', accessor: 'amount', render: (row: any) => row ? <span style={{ color: THEME.danger, fontWeight: 900, fontSize: '15px' }}>{formatCurrency(row.amount)}</span> : null },
    {
      header: 'الحالة',
      accessor: 'is_posted',
      render: (row: any) => {
        if (!row) return null; // 🛡️ Render Guard (V11 Standard)
        return row.is_posted ? 
          <span style={{ display: 'inline-block', background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 900 }}>مُرحل ✅</span> : 
          <span style={{ display: 'inline-block', background: '#fff7ed', color: '#d97706', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 900 }}>معلق ⏳</span>;
      }
    },
    {
      header: 'الإجراءات',
      accessor: 'actions',
      render: (row: any) => {
        if (!row) return null; // 🛡️ Render Guard (V11 Standard)
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
  ], [logic.state.selectedIds, isAllVisibleSelected, currentVisibleIds, logic.actions]); 

  // 🚀 القائمة الجانبية للأزرار الإجرائية (جسر الترحيل)
  const sidebarActions = useMemo(() => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <SecureAction module="payments" action="create">
          <button className="btn-main-glass gold" onClick={logic.actions.handleAddNew}>➕ إصدار سند صرف</button>
        </SecureAction>

        {logic.state.selectedIds.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '5px', paddingTop: '15px', borderTop: '1px dashed rgba(255,255,255,0.2)' }}>            
            <div style={{ textAlign: 'center', marginBottom: '5px' }}>
              <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 900, margin: 0 }}>
                تم تحديد ({logic.state.selectedIds.length}) سجل
              </p>
              <button 
                onClick={() => logic.actions.setSelectedIds([])}
                style={{ background: 'none', border: 'none', color: THEME.primary, fontSize: '10px', fontWeight: 900, cursor: 'pointer', textDecoration: 'underline' }}
              >
                إلغاء التحديد
              </button>
            </div>
            
            {logic.state.selectedIds.length === 1 && (
              <SecureAction module="payments" action="edit">
                <button className="btn-main-glass white" onClick={logic.actions.handleEditSelected}>✏️ تعديل السجل</button>
              </SecureAction>
            )}
            <SecureAction module="payments" action="post">
              <button className="btn-main-glass green" onClick={logic.actions.handlePostSelected}>🚀 اعتماد وترحيل</button>
            </SecureAction>
            <SecureAction module="payments" action="post">
              <button className="btn-main-glass yellow" onClick={logic.actions.handleUnpostSelected}>↩️ فك الترحيل</button>
            </SecureAction>
            <SecureAction module="payments" action="delete">
              <button className="btn-main-glass red" onClick={logic.actions.handleDeleteSelected}>🗑️ حذف نهائي</button>
            </SecureAction>
          </div>
        )}
      </div>
    );
  }, [logic.state.selectedIds, logic.actions]);

  return (
    <>
      <div className="clean-page">
        <MasterPage title="سندات الصرف" subtitle="إدارة المدفوعات والتحويلات المالية والتوجيه المحاسبي الدقيق">
            <RawasiSidebarManager 
              summary={
                <div className="summary-glass-card">
                  <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي المدفوعات 📉</span>
                  <div className="val" style={{fontSize:'24px', fontWeight:900, color: THEME.danger, marginTop:'5px'}}>{formatCurrency(logic.totals.totalAmount)}</div>
                </div>
              }
              actions={sidebarActions}
              customFilters={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                  <div>
                    <SmartCombo 
                        placeholder="🔍 بحث برقم السند أو المستفيد..."
                        initialDisplay={logic.state.globalSearch}
                        onSelect={(val: any) => logic.actions.setGlobalSearch(typeof val === 'object' ? val.name : val)}
                        enableClear={true}
                        freeText={true}
                    />
                  </div>
                  <div>
                    <label style={{ color: 'white', fontSize: '11px', fontWeight: 900, display: 'block', marginBottom: '8px' }}>تصفية حسب الحالة:</label>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {['الكل', 'مرحل', 'معلق'].map(type => (
                        <button 
                          key={type} 
                          onClick={() => logic.actions.setFilterStatus(type)} 
                          className={`filter-btn ${logic.state.filterStatus === type ? 'active' : ''}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              }
              onSearch={() => {}} 
              watchDeps={[logic.state.selectedIds, logic.totals.totalAmount, logic.state.rowsPerPage, logic.data.length, logic.state.globalSearch, logic.state.filterStatus]}
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
              .filter-btn { flex: 1; padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.1); color: white; border: none; font-weight: 900; cursor: pointer; font-size: 11px; transition: 0.3s; }
              .filter-btn.active { background: ${THEME.goldAccent}; color: #1e293b; }
            `}</style>

            {(logic.isLoading || permsLoading) ? (
              <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8' }}>⏳ جاري المزامنة...</div>
            ) : (
              <RawasiSmartTable 
                  data={logic.data.slice((logic.state.currentPage-1)*logic.state.rowsPerPage, logic.state.currentPage*logic.state.rowsPerPage)} 
                  columns={voucherColumns} 
                  onRowClick={(row) => { setPrintData(row); setIsPrintModalOpen(true); }}
                  
                  enablePagination={true}
                  currentPage={logic.state.currentPage}
                  totalItems={logic.data.length}
                  rowsPerPage={logic.state.rowsPerPage}
                  onPageChange={logic.actions.setCurrentPage}
                  onRowsChange={logic.actions.setRowsPerPage}
              />
            )}
        </MasterPage>
      </div>

      {mounted && logic.state.isEditModalOpen && (
          <PaymentVoucherModal 
              isOpen={logic.state.isEditModalOpen} 
              onClose={() => logic.actions.setIsEditModalOpen(false)} 
              record={logic.state.currentVoucher} 
              setRecord={logic.actions.setCurrentVoucher}
              onSave={logic.actions.handleSaveVoucher}
              isSaving={logic.isLoading}
              partnerBalance={logic.state.partnerBalance}
              isBalanceLoading={logic.state.isBalanceLoading}
          />
      )}

      {mounted && isPrintModalOpen && (
          <PaymentPrintModal 
            isOpen={isPrintModalOpen} 
            onClose={() => setIsPrintModalOpen(false)} 
            record={printData} 
          />
      )}
    </>
  );
}