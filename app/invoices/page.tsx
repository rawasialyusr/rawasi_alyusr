"use client";
import React, { useState } from 'react';
import { useInvoicesLogic } from './invoices_logic';
import { THEME } from '@/lib/theme';
import { formatCurrency, getInvoiceSummaryAndAging } from '@/lib/helpers'; 
import InvoiceAgingDashboard from '@/components/InvoiceAgingDashboard';


import InvoiceFormModal from './InvoiceFormModal';
import InvoicePrintModal from './InvoicePrintModal';
import { OperationsCenter, PaginationPanel } from '@/components/postingputton';

// --- [عنصر الجدول] ---
const InvoicesTable = ({ data, projects, selectedIds, onToggleSelect, onSelectAll, onPrint, onEdit }: any) => {
  return (
    <div style={{ background: 'white', borderRadius: '12px', overflowX: 'auto', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl', minWidth: '1050px' }}>
        <thead>
          <tr style={{ background: THEME.primary, color: 'white' }}>
            <th style={{ padding: '15px', width: '50px' }}>
              <input 
                type="checkbox" 
                onChange={(e) => onSelectAll(e.target.checked)} 
                checked={data.length > 0 && selectedIds.length === data.length}
              />
            </th>
            <th style={{ padding: '15px', textAlign: 'right' }}>رقم الفاتورة</th>
            <th style={{ padding: '15px', textAlign: 'right' }}>العميل / المشروع</th>
            <th style={{ padding: '15px', textAlign: 'center' }}>الصافي</th>
            <th style={{ padding: '15px', textAlign: 'center' }}>حالة الترحيل</th>
            <th style={{ padding: '15px', textAlign: 'center' }}>حالة السداد</th>
            <th style={{ padding: '15px', textAlign: 'center' }}>الإجراءات</th>
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
            
            // لو الفاتورة اتعملت مدفوعة بس المبلغ متسجلش، اعتبرها ادفعت بالكامل
            if (inv.status === 'مدفوعة' && paid === 0) {
                paid = total;
            }
            // تأمين عشان المبلغ المدفوع ميتخطاش الإجمالي ويبوظ الحسبة
            paid = Math.min(paid, total);
            
            const balance = total - paid;
            const isPaid = (balance === 0 && total > 0) || inv.status === 'مدفوعة';
            const isDraft = !inv.status || inv.status === 'مسودة';

            return (
              <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(inv.id)} 
                    onChange={() => onToggleSelect(inv.id)} 
                  />
                </td>
                <td style={{ padding: '12px' }}><strong>#{inv.invoice_number}</strong></td>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 'bold' }}>{inv.client_name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{projectNames}</div>
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 900, color: THEME.primary }}>
                  {formatCurrency(total)}
                </td>
                
                {/* عرض حالة الترحيل */}
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
                    background: isDraft ? '#f1f5f9' : '#e0e7ff',
                    color: isDraft ? '#64748b' : '#4338ca'
                  }}>
                    {inv.status || 'مسودة'}
                  </span>
                </td>

                {/* عرض حالة السداد */}
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
                    background: isPaid ? '#dcfce7' : '#fef3c7',
                    color: isPaid ? '#166534' : '#b45309',
                    display: 'inline-flex', alignItems: 'center', gap: '5px'
                  }}>
                    {isPaid ? '✅ تم السداد' : '⏳ لم يتم'}
                  </span>
                </td>

                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
                    
                    {/* زر التحصيل يظهر فقط لو الفاتورة مرحلة ومش مدفوعة بالكامل */}
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
                        style={{ 
                          background: '#10b981', color: 'white', border: 'none', 
                          padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                          fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px',
                          boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'
                        }}
                      >
                        <span>تحصيل</span>
                        <span>💰</span>
                      </button>
                    )}

                    <button onClick={() => onPrint(inv)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '18px' }} title="طباعة">🖨️</button>
                    <button onClick={() => onEdit(inv)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '18px' }} title="تعديل">📝</button>
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
  
  // حالة لرسالة الإشعار
  const [toastMsg, setToastMsg] = useState('');

  // دالة ترحيل بتشغل الإشعار بعد الترحيل
  // 🚀 دالة ترحيل بتشغل الإشعار بعد الترحيل
  const onPostWithNotification = async () => {
    if (selectedIds.length === 0) return;
    await handlePostSelected(); 
    setToastMsg(`✅ تم ترحيل واعتماد ${selectedIds.length} فاتورة بنجاح!`);
    setTimeout(() => setToastMsg(''), 4000); 
    setSelectedIds([]); 
  };

  // 🚀 1. ضيف الدالة دي هنا (دالة التراجع مع الإشعار)
  const onUnpostWithNotification = async () => {
    if (selectedIds.length === 0) return;
    await handleUnpostSelected(); // تشغيل دالة التراجع من اللوجيك
    setToastMsg(`↩️ تم التراجع عن ترحيل ${selectedIds.length} فاتورة بنجاح (عادت كمسودة)!`);
    setTimeout(() => setToastMsg(''), 4000); 
    setSelectedIds([]); 
  };

  const dataToProcess = allFiltered && allFiltered.length > 0 ? allFiltered : invoices;
  
  // تصفية الفواتير لاستبعاد المسودات من أعمار الديون
  const validForAging = dataToProcess.filter((inv: any) => inv.status && inv.status !== 'مسودة');
  const result = getInvoiceSummaryAndAging(validForAging);

  const sidebarKPIs = [
    { title: 'إجمالي المديونية (للمرحل)', value: formatCurrency(result.totalRemaining), color: THEME.primary, icon: '💰' },
    { title: 'تحصيلات مستلمة', value: formatCurrency(result.totalPaidAmount), color: '#10b981', icon: '📥' },
    { title: 'ديون متأخرة', value: formatCurrency(result.totalOverdue), color: '#ef4444', icon: '⚠️' },
  ];

  const onToggleSelect = (id: string) => {
    setSelectedIds((p: string[]) => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const onSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? dataToProcess.map((i: any) => i.id) : []);
  };

  const dateInputStyle: React.CSSProperties = {
    padding: '10px', borderRadius: '8px', border: `1px solid #cbd5e1`,
    fontSize: '13px', width: '100%', outline: 'none', background: 'white'
  };

  return (
    <div style={{ padding: '25px', background: '#f8fafc', minHeight: '100vh', direction: 'rtl', position: 'relative' }}>
      
      {/* إشعار الترحيل (Toast) */}
      {toastMsg && (
        <div style={{
          position: 'fixed', top: '30px', left: '50%', transform: 'translateX(-50%)',
          background: '#10b981', color: 'white', padding: '15px 30px', borderRadius: '50px',
          fontWeight: 'bold', fontSize: '15px', boxShadow: '0 10px 25px rgba(16,185,129,0.4)',
          zIndex: 9999, animation: 'fadeInDown 0.5s ease'
        }}>
          {toastMsg}
        </div>
      )}

      {/* 🛡️ السايد بار (مركز التحكم) */}
     {/* 🛡️ السايد بار (مركز التحكم) */}
      <OperationsCenter 
        title="مركز عمليات الفواتير"
        searchQuery={globalSearch}
        onPostSelected={handlePostSelected} // 👈 دي اللي فيها اللوجيك الصح بتاع الجورنال
        onUnpostSelected={handleUnpostSelected}
        onSearchChange={setGlobalSearch}
        onDeleteSelected={handleDeleteSelected}
        selectedCount={selectedIds.length}
        
        // 🚀 الـ 3 سطور دول هما اللي بيشغلوا الترحيل في المكون الجديد:
        selectedIds={selectedIds}
        moduleType="invoices"
        onSuccess={() => {
          setSelectedIds([]); // عشان يمسح التحديد بعد ما يرحل بنجاح
          // لو عندك دالة fetchInvoices في اللوجيك، اكتبها هنا عشان الجدول يعمل Refresh
          // if (fetchInvoices) fetchInvoices(); 
        }}
        
        onAdd={handleAddNew}
        onEdit={() => handleEdit(invoices.find(i => i.id === selectedIds[0]))}
        onDeleteSelected={handleDeleteSelected}
        
        kpis={sidebarKPIs} 
        filtersSlot={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
            {!isLoading && (
              <InvoiceAgingDashboard aging={{
                ...result.aging,
                totalOverdue: result.totalOverdue,
                totalOpen: result.totalRemaining
              }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px', background: 'rgba(0,0,0,0.02)', borderRadius: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>تصفية بالتاريخ:</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={dateInputStyle} />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={dateInputStyle} />
            </div>
          </div>
        }
      />

      {/* 📄 الجزء الرئيسي (الجدول) */}
      <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ color: THEME.primary, fontWeight: 900, marginBottom: '20px', marginTop: 0 }}>📄 قائمة الفواتير والمستخلصات</h1>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '100px', color: THEME.primary }}>⏳ جاري تحميل البيانات...</div>
          ) : (
            <>
              <InvoicesTable 
                data={dataToProcess} 
                projects={projects} 
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
                onSelectAll={onSelectAll}
                onEdit={handleEdit}
                onPrint={(inv: any) => { 
                    let projNames = 'بدون مشروع';
                    if (inv.project_ids && inv.project_ids.length > 0 && projects) {
                        projNames = projects.filter((p: any) => inv.project_ids.includes(p.id)).map((p: any) => p.Property || p.project_name || p.name).join('، ');
                    }
                    setPrintData({ ...inv, _projectNames: projNames }); 
                    setIsPrintModalOpen(true); 
                }}
              />

              <PaginationPanel 
                totalItems={allFiltered.length}
                currentPage={currentPage}
                rowsPerPage={rowsPerPage}
                onPageChange={setCurrentPage}
                onRowsChange={setRowsPerPage}
              />
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