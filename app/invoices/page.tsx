"use client";
import React, { useState, useMemo } from 'react';
import { useInvoicesLogic } from './invoices_logic';
import { THEME } from '@/lib/theme';
import { formatCurrency, getInvoiceSummaryAndAging } from '@/lib/helpers'; 
import { usePermissions } from '@/lib/PermissionsContext'; // 🛡️ استدعاء نظام الصلاحيات المركزي
import SecureAction from '@/components/SecureAction';      // 🛡️ مغلف الأمان للأزرار
import MasterPage from '@/components/MasterPage';

// 🧱 المكونات
import RawasiSmartTable from '@/components/rawasismarttable';
import PaginationPanel from '@/components/PaginationPanel'; 
import RawasiSidebarManager from '@/components/RawasiSidebarManager'; 
import InvoiceAgingDashboard from '@/components/InvoiceAgingDashboard';
import SmartCombo from '@/components/SmartCombo'; 

// 🎬 المودالز
import InvoiceFormModal from './InvoiceFormModal';
import InvoicePrintModal from './InvoicePrintModal';
import ReceiptVoucherModal from '@/app/ReceiptVouchers/ReceiptVoucherModal';

export default function InvoicesPage() {
  const {
    invoices, allFiltered, projects, isLoading, permissions, handleToggleStamp,
    globalSearch, setGlobalSearch, setDateFrom, setDateTo,
    selectedIds, setSelectedIds, currentPage, setCurrentPage, rowsPerPage, setRowsPerPage,
    handlePostSelected, handleDeleteSelected, handleUnpostSelected,
    handleSave, handleAddNew, handleEdit, isEditModalOpen, setIsEditModalOpen, currentRecord, setCurrentRecord,
    isReceiptModalOpen, setIsReceiptModalOpen, selectedInvoiceForPay, setSelectedInvoiceForPay, handleOpenPaymentModal 
  } = useInvoicesLogic();

  // 🛡️ سحب دالة فحص الصلاحيات وحالة التحميل بأمان تام
  const { can, loading: permsLoading } = usePermissions();

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState(null);

  const dataToProcess = useMemo(() => (allFiltered?.length > 0 ? allFiltered : invoices), [allFiltered, invoices]);
  const result = useMemo(() => getInvoiceSummaryAndAging(dataToProcess.filter((i:any)=> i.status !== 'مسودة')), [dataToProcess]);

  // =========================================================================
  // 💎 أعمدة الجدول
  // =========================================================================
  const invoiceColumns = [
    {
      header: 'تحديد',
      accessor: 'id',
      render: (id: string) => (
        <input type="checkbox" className="custom-checkbox" checked={selectedIds.includes(id)} 
          onChange={(e) => {
            e.stopPropagation(); 
            setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
          }} 
        />
      )
    },
    { 
      header: 'رقم الفاتورة', 
      accessor: 'invoice_number', 
      render: (v:any) => <b style={{ color: '#8b5cf6', textShadow: '0 0 10px rgba(139, 92, 246, 0.3)', fontSize: '14px', letterSpacing: '0.5px' }}>#{v}</b> 
    },
    { 
      header: 'تاريخ الفاتورة', 
      accessor: 'date', 
      render: (v: any) => (
        <span style={{ fontSize: '12px', fontWeight: 900, color: '#0284c7', background: 'rgba(2, 132, 199, 0.1)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
          {v ? new Date(v).toLocaleDateString('ar-EG') : '---'}
        </span> 
      )
    },
    { header: 'العميل', accessor: 'client_name', render: (v:any) => <span style={{fontWeight: 800, color: '#1e293b'}}>{v}</span> },
    {
      header: 'حالة الاعتماد',
      accessor: 'status',
      render: (status: string) => {
        const isApproved = status === 'مُعتمد';
        return (
          <div className={`approval-glass-badge ${isApproved ? 'approved' : 'pending'}`}>
            <span className="dot"></span>
            {isApproved ? 'مُعتمد' : 'معلق'}
          </div>
        );
      }
    },
    {
      header: 'مهلة السداد',
      accessor: 'due_date',
      render: (dueDate: any, row: any) => {
        const total = Number(row.total_amount || 0);
        const paid = Number(row.paid_amount || 0);
        if (paid >= total && total > 0) return <span className="deadline-badge paid">✅ مكتمل</span>;
        if (!dueDate) return <span style={{color:'#94a3b8', fontWeight: 'bold'}}>---</span>;
        const today = new Date();
        const due = new Date(dueDate);
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return <div className="deadline-badge overdue">⚠️ متأخر ({Math.abs(diffDays)} يوم)</div>;
        if (diffDays === 0) return <div className="deadline-badge today">🚨 السداد اليوم</div>;
        return <div className="deadline-badge active">⏳ متبقي {diffDays} يوم</div>;
      }
    },
    {
      header: 'حالة السداد',
      accessor: 'paid_amount',
      render: (paid: number, row: any) => {
        const total = Number(row.total_amount || 0);
        if (paid <= 0) return <span className="glass-badge red">🔴 مستحقة</span>;
        if (paid < total) return <span className="glass-badge orange">⏳ جزئي</span>;
        return <span className="glass-badge green">✅ مسددة</span>;
      }
    },
    { 
      header: 'الصافي', 
      accessor: 'total_amount', 
      render: (v:any, row: any) => {
        const total = Number(row.total_amount || 0);
        const paid = Number(row.paid_amount || 0);
        let textColor = '#dc2626'; 
        if (paid >= total && total > 0) textColor = '#16a34a'; 
        else if (paid > 0 && paid < total) textColor = '#d97706'; 
        return <span style={{ fontWeight: 900, color: textColor, fontSize: '14px', textShadow: `0 0 10px ${textColor}40` }}>{formatCurrency(v)}</span>;
      } 
    },
    {
      header: 'الإجراءات',
      accessor: 'id',
      render: (_: any, row: any) => {
        const total = Number(row.total_amount || 0);
        const paid = Number(row.paid_amount || 0);
        const balance = total - paid;
        const needsPayment = balance > 0.01; 
        return (
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
            <button onClick={(e) => { e.stopPropagation(); setPrintData(row); setIsPrintModalOpen(true); }} className="btn-glass-print">🖨️</button>
            {/* 🛡️ زر السداد (يمكننا حمايته بصلاحية الدفع إذا لزم الأمر، حالياً متاح) */}
            {needsPayment && (
              <button onClick={(e) => {
                    e.stopPropagation(); 
                    let propertyName = '';
                    if (row.project_ids && row.project_ids.length > 0 && projects) propertyName = projects.filter((p: any) => row.project_ids.includes(p.id)).map((p: any) => p.Property || p.property_name || p.project_name || p.name).join('، ');
                    setSelectedInvoiceForPay({ ...row, id: undefined, invoice_id: row.id, invoice_number: row.invoice_number, client_name: row.client_name, partner_id: row.partner_id, amount: balance, total_amount: balance, property_name: propertyName, project_name: propertyName, description: `سداد دفعة من فاتورة #${row.invoice_number} ${propertyName ? `- عقار: ${propertyName}` : ''}` });
                    setIsReceiptModalOpen(true);
                }} className="btn-glass-pay">💰 سداد</button>
            )}
          </div>
        );
      }
    }
  ];

  // =========================================================================
  // 🎛️ أزرار السايد بار (مؤمنة بالصلاحيات 🛡️)
  // =========================================================================
  const sidebarActions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      {/* 🛡️ زرار إضافة فاتورة جديدة */}
      <SecureAction module="invoices" action="create">
        <button className="btn-main-glass gold" onClick={handleAddNew}>
          ➕ إنشاء فاتورة جديدة
        </button>
      </SecureAction>

      {selectedIds.length > 0 && (
        <>
          <p style={{fontSize:'10px', textAlign:'center', color:'#94a3b8', fontWeight:900, marginBottom:'-5px'}}>الإجراءات على ({selectedIds.length})</p>
          
          {/* 🛡️ زرار الاعتماد والترحيل */}
          <SecureAction module="invoices" action="post">
            <button className="btn-main-glass blue" onClick={handlePostSelected}>🚀 اعتماد وترحيل</button>
          </SecureAction>

          {/* 🛡️ زرار التعليق */}
          <SecureAction module="invoices" action="post">
            <button className="btn-main-glass yellow" onClick={handleUnpostSelected}>🔴 تعليق الفاتورة</button>
          </SecureAction>

          {/* 🛡️ زرار التعديل */}
          {selectedIds.length === 1 && (
            <SecureAction module="invoices" action="edit">
              <button className="btn-main-glass white" onClick={() => handleEdit(dataToProcess.find(i => i.id === selectedIds[0]))}>📝 تعديل البيانات</button>
            </SecureAction>
          )}

          {/* 🛡️ زرار الحذف */}
          <SecureAction module="invoices" action="delete">
            <button className="btn-main-glass red" onClick={handleDeleteSelected}>🗑️ حذف نهائي</button>
          </SecureAction>
        </>
      )}
    </div>
  );

  return (
    <MasterPage 
      title="فواتير المبيعات" 
      subtitle="مركز إدارة المستخلصات والتحصيل المالي"
    >
      
      {/* 1. السايد بار (مكانه الصحيح هنا) */}
      <RawasiSidebarManager 
        summary={
          <div className="summary-glass-card">
            <span>إجمالي المديونية 💼</span>
            <div className="val">{formatCurrency(result.totalRemaining)}</div>
          </div>
        }
        actions={sidebarActions}
        customFilters={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <SmartCombo 
                    label="تصفية سريعة بالعميل"
                    icon="🔍"
                    table="partners"
                    displayCol="name"
                    placeholder="ابحث عن عميل محدد..."
                    enableClear={true}
                    onSelect={(item) => setGlobalSearch(item?.name || '')}
                />
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />
                <InvoiceAgingDashboard aging={result.aging} />
            </div>
        }
        onSearch={setGlobalSearch}
        onDateFilter={(start, end) => { setDateFrom(start); setDateTo(end); }}
        watchDeps={[selectedIds, sidebarActions, result]}
      />

      {/* 2. محتوى الصفحة (تم حذف العناوين المكررة لترك المجال للماستر بيدج) */}
      {(isLoading || permsLoading) ? (
        <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8' }}>⏳ جاري المزامنة...</div>
      ) : (
        <div className="clickable-rows">
          <RawasiSmartTable 
            data={dataToProcess.slice((currentPage-1)*rowsPerPage, currentPage*rowsPerPage)} 
            columns={invoiceColumns} 
            title="" 
            onRowClick={(row) => {
                if(can('invoices', 'edit') || can('invoices', 'view')) {
                   handleEdit(row);
                }
            }} 
          />
          <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
            <PaginationPanel totalItems={dataToProcess.length} currentPage={currentPage} rowsPerPage={rowsPerPage} onPageChange={setCurrentPage} onRowsChange={setRowsPerPage} />
          </div>
        </div>
      )}

      {/* 3. المودالز */}
      {isReceiptModalOpen && (
        <ReceiptVoucherModal 
            isOpen={isReceiptModalOpen} 
            onClose={() => setIsReceiptModalOpen(false)} 
            record={selectedInvoiceForPay || {}} 
            setRecord={setSelectedInvoiceForPay}
            onSave={() => { setIsReceiptModalOpen(false); setSelectedIds([]); }}
        />
      )}

      {isEditModalOpen && <InvoiceFormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} record={currentRecord} setRecord={setCurrentRecord} onSave={handleSave} projects={projects} />}
      
      {isPrintModalOpen && <InvoicePrintModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} data={printData} />}
      
    </MasterPage>
  );
}