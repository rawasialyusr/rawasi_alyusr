"use client";
import React, { useState, useMemo } from 'react';
import { useInvoicesLogic } from './invoices_logic';
import { THEME } from '@/lib/theme';
import { formatCurrency, getInvoiceSummaryAndAging } from '@/lib/helpers'; 
import { useAuth } from '@/components/authGuard'; // 🛡️ استدعاء مقص الصلاحيات

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

  // 🛡️ سحب دالة فحص الصلاحيات بأمان
  let can = (module: string, action: string) => true; // القيمة الافتراضية
  try {
      const auth = useAuth();
      if (auth && auth.can) can = auth.can;
  } catch (e) {
      // لو الهوك مش موجود هيكمل عادي
  }

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
      
      {/* 🛡️ زرار إضافة فاتورة جديدة (يظهر لو معاه صلاحية create) */}
      {can('invoices', 'create') && (
        <button className="btn-main-glass gold" onClick={handleAddNew}>
          ➕ إنشاء فاتورة جديدة
        </button>
      )}

      {selectedIds.length > 0 && (
        <>
          <p style={{fontSize:'10px', textAlign:'center', color:'#94a3b8', fontWeight:900, marginBottom:'-5px'}}>الإجراءات على ({selectedIds.length})</p>
          
          {/* 🛡️ زرار الاعتماد والترحيل (يظهر لو معاه صلاحية post) */}
          {can('invoices', 'post') && (
            <button className="btn-main-glass blue" onClick={handlePostSelected}>🚀 اعتماد وترحيل</button>
          )}

          {/* 🛡️ زرار التعليق (يظهر لو معاه صلاحية post) */}
          {can('invoices', 'post') && (
            <button className="btn-main-glass yellow" onClick={handleUnpostSelected}>🔴 تعليق الفاتورة</button>
          )}

          {/* 🛡️ زرار التعديل (يظهر لو معاه صلاحية edit ومحدد صف واحد) */}
          {selectedIds.length === 1 && can('invoices', 'edit') && (
            <button className="btn-main-glass white" onClick={() => handleEdit(dataToProcess.find(i => i.id === selectedIds[0]))}>📝 تعديل البيانات</button>
          )}

          {/* 🛡️ زرار الحذف (يظهر لو معاه صلاحية delete) */}
          {can('invoices', 'delete') && (
            <button className="btn-main-glass red" onClick={handleDeleteSelected}>🗑️ حذف نهائي</button>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="clean-page">
      <RawasiSidebarManager 
        summary={<div className="summary-glass-card"><span>إجمالي المديونية 💼</span><div className="val">{formatCurrency(result.totalRemaining)}</div></div>}
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
                    showRecent={true}
                    isMobileBottomSheet={true}
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

      <style>{`
        /* 🚀 سحر المسافات والهوامش السلبية هنا */
        .clean-page { 
            padding: 30px 20px 30px 0px !important; /* خلينا اليمين صفر */
            margin-right: -25px !important; /* الهامش السلبي عشان نتخطى الـ Wrapper ويلزق في السايد بار */
            direction: rtl; 
            background: transparent; 
            min-height: 100vh; 
        }

        .clickable-rows {
            background: rgba(255,255,255,0.5);
            backdrop-filter: blur(10px);
            border-radius: 24px 0 0 24px !important; /* كيرف من الشمال بس، عشان يلحم يمين */
            padding: 10px;
            border: 1px solid rgba(255,255,255,0.7);
            border-right: none !important; /* شلنا الخط اليمين */
            transition: all 0.3s ease;
        }

        /* 📱 تظبيط الموبايل عشان مفيش سايد بار ثابت */
        @media (max-width: 768px) {
            .clean-page { padding: 15px !important; margin-right: -10px !important; }
            .clickable-rows { border-radius: 24px !important; border-right: 1px solid rgba(255,255,255,0.7) !important; }
        }

        .btn-glass-pay { background: linear-gradient(135deg, rgba(34, 197, 94, 0.85), rgba(16, 185, 129, 0.95)); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.4); color: white; padding: 6px 14px; border-radius: 10px; font-weight: 800; cursor: pointer; transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94); font-size: 11px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.2); }
        .btn-glass-pay:hover { transform: scale(1.08) translateY(-2px); box-shadow: 0 8px 25px rgba(34, 197, 94, 0.5); filter: brightness(1.1); }
        .btn-glass-print { background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.5); padding: 7px; border-radius: 10px; cursor: pointer; transition: all 0.15s; }
        .btn-glass-print:hover { background: rgba(255, 255, 255, 0.9); transform: scale(1.1); }
        .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-main-glass.gold { background: linear-gradient(135deg, rgba(197, 160, 89, 0.9), rgba(151, 115, 50, 1)); color: white; }
        .btn-main-glass.blue { background: linear-gradient(135deg, rgba(14, 165, 233, 0.8), rgba(2, 132, 199, 0.9)); color: white; }
        .btn-main-glass.yellow { background: linear-gradient(135deg, rgba(245, 158, 11, 0.8), rgba(217, 119, 6, 0.9)); color: white; }
        .btn-main-glass.white { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255,255,255,0.8); }
        .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .btn-main-glass:hover { transform: translateY(-3px); filter: brightness(1.1); }
        .glass-badge { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(5px); border: 1px solid rgba(255, 255, 255, 0.6); }
        .glass-badge.green { color: #059669; }
        .glass-badge.red { color: #dc2626; }
        .glass-badge.orange { color: #d97706; }
        .summary-glass-card { background: rgba(255, 255, 255, 0.3); backdrop-filter: blur(10px); padding: 20px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.4); margin-bottom: 25px; }
        .summary-glass-card .val { font-size: 24px; font-weight: 900; color: ${THEME.coffeeDark}; margin-top: 5px; }
        .custom-checkbox { width: 20px; height: 20px; accent-color: ${THEME.goldAccent}; cursor: pointer; transition: 0.1s; }
        .approval-glass-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 12px; font-size: 11px; font-weight: 900; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.4); }
        .approval-glass-badge.approved { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
        .approval-glass-badge.pending { background: rgba(239, 68, 68, 0.05); color: #dc2626; }
        .approval-glass-badge .dot { width: 8px; height: 8px; border-radius: 50%; }
        .approved .dot { background: #22c55e; box-shadow: 0 0 10px #22c55e; animation: pulse-green 2s infinite; }
        .pending .dot { background: #ef4444; box-shadow: 0 0 10px #ef4444; }
        @keyframes pulse-green { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } }
        .clickable-rows tbody tr { cursor: pointer !important; transition: 0.2s; }
        .clickable-rows tbody tr:hover { background: rgba(197, 160, 89, 0.08) !important; }
        .deadline-badge { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 900; display: inline-flex; align-items: center; gap: 5px; backdrop-filter: blur(5px); }
        .deadline-badge.paid { background: rgba(34, 197, 94, 0.1); color: #16a34a; border: 1px solid rgba(34, 197, 94, 0.2); }
        .deadline-badge.overdue { background: rgba(239, 68, 68, 0.1); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.3); animation: shake-alert 0.8s infinite alternate; }
        .deadline-badge.today { background: rgba(245, 158, 11, 0.15); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.3); }
        .deadline-badge.active { background: rgba(59, 130, 246, 0.1); color: #2563eb; border: 1px solid rgba(59, 130, 246, 0.2); }
        @keyframes shake-alert { 0% { transform: translateX(0); } 100% { transform: translateX(3px); } }
      `}</style>

      {/* ضفنا padding-right بسيط هنا عشان العنوان ميبقاش لازق في السايد بار بالظبط */}
      <div style={{ marginBottom: '30px', paddingRight: '15px' }}>
          <h1 style={{ fontWeight: 900, fontSize: '34px', color: '#0f172a', margin: 0, letterSpacing: '-1px' }}>فواتير المبيعات</h1>
          <p style={{ color: '#64748b', fontSize: '15px', fontWeight: 600 }}>مركز إدارة المستخلصات والتحصيل المالي</p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8' }}>⏳ جاري المزامنة...</div>
      ) : (
        // 🚀 السر هنا: شيلنا الـ style المباشر وسبنا الكلاس يشتغل براحته
        <div className="clickable-rows">
          <RawasiSmartTable 
            data={dataToProcess.slice((currentPage-1)*rowsPerPage, currentPage*rowsPerPage)} 
            columns={invoiceColumns} 
            title="" 
            /* 🛡️ إضافة الحماية على ضغطة الصف: لو معندوش صلاحية تعديل ميفتحش المودال! */
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

      {/* 💰 مودال السداد */}
      {isReceiptModalOpen && (
        <ReceiptVoucherModal 
            isOpen={isReceiptModalOpen} 
            onClose={() => setIsReceiptModalOpen(false)} 
            record={selectedInvoiceForPay || {}} 
            setRecord={setSelectedInvoiceForPay}
            onSave={() => { setIsReceiptModalOpen(false); setSelectedIds([]); }}
        />
      )}

      {/* 📝 مودال الإضافة والتعديل */}
      {isEditModalOpen && <InvoiceFormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} record={currentRecord} setRecord={setCurrentRecord} onSave={handleSave} projects={projects} />}
      
      {/* 🖨️ مودال الطباعة */}
      <InvoicePrintModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} data={printData} />
    </div>
  );
}