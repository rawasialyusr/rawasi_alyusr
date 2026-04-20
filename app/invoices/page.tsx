"use client";
import React, { useState, useMemo } from 'react';
import { useInvoicesLogic } from './invoices_logic';
import { THEME } from '@/lib/theme';
import { formatCurrency, getInvoiceSummaryAndAging } from '@/lib/helpers'; 
import InvoiceAgingDashboard from '@/components/InvoiceAgingDashboard';

import InvoiceFormModal from './InvoiceFormModal';
import InvoicePrintModal from './InvoicePrintModal';
import { PaginationPanel } from '@/components/postingputton'; // احتفظنا بالـ Pagination فقط
import RawasiSidebarManager from '@/components/RawasiSidebarManager'; // 🚀 السايد بار الذكي

// --- [عنصر الجدول الزجاجي (Apple UX)] ---
const InvoicesTable = ({ data, projects, selectedIds, onToggleSelect, onSelectAll, onPrint, onEdit, permissions, onStamp }: any) => {
  return (
    <div className="table-container fade-in-up">
      <table>
        <thead>
          <tr>
            <th style={{ width: '50px', textAlign: 'center' }}>
              <input 
                type="checkbox" 
                style={{ accentColor: THEME.goldAccent, width: '16px', height: '16px', cursor: 'pointer' }}
                onChange={(e) => onSelectAll(e.target.checked)} 
                checked={data.length > 0 && selectedIds.length === data.length}
              />
            </th>
            <th>رقم الفاتورة</th>
            <th>العميل / المشروع</th>
            <th style={{ textAlign: 'center' }}>الصافي</th>
            <th style={{ textAlign: 'center' }}>حالة الترحيل</th>
            <th style={{ textAlign: 'center' }}>حالة السداد</th>
            <th style={{ textAlign: 'center' }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {data.map((inv: any) => {
            const projectNames = (inv.project_ids && inv.project_ids.length > 0 && projects)
              ? projects.filter((p: any) => inv.project_ids.includes(p.id)).map((p: any) => p.Property || p.project_name || p.name).join('، ')
              : (inv.projects?.name || 'بدون مشروع');

            // 🚀 حساب حالة السداد مع "التصحيح الذكي"
            const total = Number(inv.net_amount || inv.total_amount || 0);
            let paid = Number(inv.paid_amount || 0);
            
            if (inv.status === 'مدفوعة' && paid === 0) {
                paid = total;
            }
            paid = Math.min(paid, total);
            
            const balance = total - paid;
            const isPaid = (balance === 0 && total > 0) || inv.status === 'مدفوعة';
            const isDraft = !inv.status || inv.status === 'مسودة';

            return (
              <tr key={inv.id}>
                <td style={{ textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    style={{ accentColor: THEME.goldAccent, width: '16px', height: '16px', cursor: 'pointer' }}
                    checked={selectedIds.includes(inv.id)} 
                    onChange={() => onToggleSelect(inv.id)} 
                  />
                </td>
                <td style={{ fontWeight: 800 }}>#{inv.invoice_number}</td>
                <td>
                  <div style={{ fontWeight: 700, color: THEME.primary }}>{inv.client_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{projectNames}</div>
                </td>
                <td style={{ textAlign: 'center' }} className="text-money">
                  {formatCurrency(total)}
                </td>
                
                <td style={{ textAlign: 'center' }}>
                  <span className={`badge ${isDraft ? 'badge-draft' : 'badge-posted'}`}>
                    {inv.status || 'مسودة'}
                  </span>
                </td>

                <td style={{ textAlign: 'center' }}>
                  <span className={`badge ${isPaid ? 'badge-posted' : 'badge-cancelled'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    {isPaid ? '✅ مسددة' : '⏳ مستحقة'}
                  </span>
                </td>

                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                    
                    {!isPaid && !isDraft && (
                      <button 
                        onClick={() => {
                          const params = new URLSearchParams({
                            invoice_id: inv.id,
                            amount: balance.toString(), 
                            partner_id: inv.partner_id || '',
                            client_name: inv.client_name || '',
                            inv_no: inv.invoice_number || ''
                          });
                          window.location.href = `/receipt-vouchers?${params.toString()}`;
                        }}
                        title="تحصيل المبلغ المتبقي"
                        className="btn"
                        style={{ padding: '6px 12px', background: 'rgba(52, 199, 89, 0.15)', color: '#28a745', fontSize: '11px', borderRadius: '8px' }}
                      >
                        <span>تحصيل</span> 💰
                      </button>
                    )}

                    <button onClick={() => onPrint(inv)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '18px', transition: '0.3s' }} className="hover-scale" title="طباعة">🖨️</button>
                    <button onClick={() => onEdit(inv)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '18px', transition: '0.3s' }} className="hover-scale" title="تعديل">📝</button>
                    
                    {/* 🔏 زر الختم يظهر فقط لو المستخدم أدمن */}
                    {permissions?.isAdmin && (
                        <button 
                            onClick={() => onStamp(inv.id, inv.is_stamped)}
                            style={{ 
                                background: inv.is_stamped ? 'rgba(255, 59, 48, 0.1)' : 'rgba(52, 199, 89, 0.1)', 
                                color: inv.is_stamped ? '#ff3b30' : '#28a745', 
                                border: 'none', borderRadius: '8px', cursor: 'pointer', 
                                padding: '6px', fontSize: '14px', display: 'flex', alignItems: 'center',
                                transition: '0.3s'
                            }}
                            className="hover-scale"
                            title={inv.is_stamped ? "إلغاء الختم" : "ختم الفاتورة"}
                        >
                            {inv.is_stamped ? "🔓" : "🔏"}
                        </button>
                    )}
                  </div>
                </td>
              </tr>
            )})}
        </tbody>
      </table>
    </div>
  );
};

export default function InvoicesPage() {
  const {
    invoices, allFiltered, projects, isLoading, isSaving,
    permissions, handleToggleStamp, 
    globalSearch, setGlobalSearch,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    selectedIds, setSelectedIds,
    currentPage, setCurrentPage,
    rowsPerPage, setRowsPerPage,
    handlePostSelected, handleUnpostSelected, handleDeleteSelected,
    handleSave, handleAddNew, handleEdit,
    isEditModalOpen, setIsEditModalOpen, currentRecord, setCurrentRecord
  } = useInvoicesLogic();

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const onPostWithNotification = async () => {
    if (selectedIds.length === 0) return;
    await handlePostSelected(); 
    setToastMsg(`✅ تم ترحيل واعتماد ${selectedIds.length} فاتورة بنجاح!`);
    setTimeout(() => setToastMsg(''), 4000); 
    setSelectedIds([]); 
  };

  const onUnpostWithNotification = async () => {
    if (selectedIds.length === 0) return;
    await handleUnpostSelected(); 
    setToastMsg(`↩️ تم التراجع عن ترحيل ${selectedIds.length} فاتورة (عادت كمسودة)!`);
    setTimeout(() => setToastMsg(''), 4000); 
    setSelectedIds([]); 
  };

  const dataToProcess = allFiltered && allFiltered.length > 0 ? allFiltered : invoices;
  const validForAging = dataToProcess.filter((inv: any) => inv.status && inv.status !== 'مسودة');
  const result = getInvoiceSummaryAndAging(validForAging);

  const onToggleSelect = (id: string) => {
    setSelectedIds((p: string[]) => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const onSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? dataToProcess.map((i: any) => i.id) : []);
  };

  // 🚀 1. تجهيز الملخص للسايد بار
  const sidebarSummary = useMemo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div className="kpi-card" style={{ padding: '15px', borderRadius: '15px' }}>
        <span className="summary-label">إجمالي المديونية 💰</span>
        <span className="summary-value text-money">{formatCurrency(result.totalRemaining)}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="kpi-card" style={{ padding: '15px', borderRadius: '15px', background: 'rgba(52, 199, 89, 0.05)', borderColor: 'rgba(52, 199, 89, 0.2)' }}>
          <span className="summary-label" style={{color: '#28a745'}}>محصل 📥</span>
          <span className="summary-value" style={{fontSize: '14px', color: '#28a745'}}>{formatCurrency(result.totalPaidAmount)}</span>
        </div>
        <div className="kpi-card" style={{ padding: '15px', borderRadius: '15px', background: 'rgba(255, 59, 48, 0.05)', borderColor: 'rgba(255, 59, 48, 0.2)' }}>
          <span className="summary-label" style={{color: '#ff3b30'}}>متأخر ⚠️</span>
          <span className="summary-value" style={{fontSize: '14px', color: '#ff3b30'}}>{formatCurrency(result.totalOverdue)}</span>
        </div>
      </div>
    </div>
  ), [result.totalRemaining, result.totalPaidAmount, result.totalOverdue]);

  // 🚀 2. تجهيز الأكشنز للسايد بار
  const sidebarActions = useMemo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <button className="btn btn-primary" onClick={handleAddNew} style={{ width: '100%', padding: '15px' }}>
        <span style={{ fontSize: '18px' }}>➕</span> إنشاء فاتورة جديدة
      </button>

      {selectedIds.length > 0 && (
        <div className="fade-in-up" style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '20px', marginTop: '10px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px', textAlign: 'center', fontWeight: 900 }}>
            محدد ({selectedIds.length}) فواتير
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="btn" style={{ background: '#28a745', color: 'white', width: '100%' }} onClick={onPostWithNotification}>
              🚀 اعتماد وترحيل
            </button>
            <button className="btn" style={{ background: '#eab308', color: 'white', width: '100%' }} onClick={onUnpostWithNotification}>
              ↩️ فك الترحيل
            </button>
            <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleDeleteSelected}>
              🗑️ حذف المحدد
            </button>
          </div>
        </div>
      )}
    </div>
  ), [selectedIds.length, handleAddNew, handleDeleteSelected]); // eslint-disable-line

  // 🚀 3. تجهيز الفلاتر المخصصة (أعمار الديون)
  const sidebarFilters = useMemo(() => (
    !isLoading ? (
      <div style={{ marginTop: '10px' }}>
        <InvoiceAgingDashboard aging={{
          ...result.aging,
          totalOverdue: result.totalOverdue,
          totalOpen: result.totalRemaining
        }} />
      </div>
    ) : null
  ), [isLoading, result]);

  return (
    <div style={{ padding: '30px', minHeight: '100vh', direction: 'rtl', position: 'relative' }}>
      
      {/* 🚀 مدير السايد بار (هياخد الداتا ويبعتها لمركز العمليات الرئيسي اللي على اليمين) */}
      <RawasiSidebarManager 
        summary={sidebarSummary}
        actions={sidebarActions}
        customFilters={sidebarFilters}
        onSearch={(term) => setGlobalSearch(term)}
        onDateFilter={(start, end) => { setDateFrom(start); setDateTo(end); }} // 👈 ربط التواريخ أوتوماتيك
        watchDeps={[sidebarSummary, sidebarActions, sidebarFilters]} 
      />

      <style>{`
        .hover-scale:hover { transform: scale(1.15); }
        .toast-glass {
          position: fixed; top: 40px; left: 50%; transform: translateX(-50%);
          background: rgba(52, 199, 89, 0.85); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
          color: white; padding: 16px 32px; border-radius: 999px;
          font-weight: 700; font-size: 15px; box-shadow: 0 15px 35px rgba(52,199,89,0.3);
          border: 1px solid rgba(255,255,255,0.4);
          z-index: 9999; animation: fadeInUp 0.5s cubic-bezier(0.15, 0.83, 0.66, 1);
        }
      `}</style>

      {toastMsg && <div className="toast-glass">{toastMsg}</div>}

      <div style={{ flex: 1, minWidth: 0, marginTop: '10px' }}>
          <h1 style={{ fontWeight: 900, marginBottom: '25px', marginTop: 0, textShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            📄 المستخلصات وفواتير المبيعات
          </h1>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: 'var(--text-muted)' }}>
              ⏳ جاري جلب الفواتير...
            </div>
          ) : (
            <>
              {/* 🚀 الجدول الزجاجي الجديد */}
              <InvoicesTable 
                data={dataToProcess.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)} 
                projects={projects} 
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
                onSelectAll={onSelectAll}
                onEdit={handleEdit}
                permissions={permissions} 
                onStamp={handleToggleStamp} 
                onPrint={(inv: any) => { 
                    let projNames = 'بدون مشروع';
                    if (inv.project_ids && inv.project_ids.length > 0 && projects) {
                        projNames = projects.filter((p: any) => inv.project_ids.includes(p.id)).map((p: any) => p.Property || p.project_name || p.name).join('، ');
                    }
                    setPrintData({ ...inv, _projectNames: projNames }); 
                    setIsPrintModalOpen(true); 
                }}
              />

              {/* 🚀 الباجينيشن */}
              <div style={{ marginTop: '20px' }}>
                <PaginationPanel 
                  totalItems={dataToProcess.length}
                  currentPage={currentPage}
                  rowsPerPage={rowsPerPage}
                  onPageChange={setCurrentPage}
                  onRowsChange={setRowsPerPage}
                />
              </div>
            </>
          )}
      </div>

      {isEditModalOpen && (
        <InvoiceFormModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          record={currentRecord}
          setRecord={setCurrentRecord}
          onSave={handleSave}
          isSaving={isSaving}
          projects={projects}
        />
      )}

      <InvoicePrintModal 
        isOpen={isPrintModalOpen} 
        onClose={() => setIsPrintModalOpen(false)} 
        data={printData} 
      />
    </div>
  );
}