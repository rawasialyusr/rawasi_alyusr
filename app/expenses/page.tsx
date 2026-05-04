"use client";
import React, { useState, useEffect, useMemo } from 'react'; // 🚀 أضفنا useMemo للفلترة المحلية
import { createPortal } from 'react-dom'; 
import { useExpensesLogic } from './expenses_logic';
import { THEME } from '@/lib/theme';
import SmartCombo from '@/components/SmartCombo'; 
import RawasiSidebarManager from '@/components/RawasiSidebarManager'; 
import { usePermissions } from '@/lib/PermissionsContext'; 
import SecureAction from '@/components/SecureAction';      
import { formatCurrency } from '@/lib/helpers';
import MasterPage from '@/components/MasterPage';
import RawasiSmartTable from '@/components/rawasismarttable';

// 🎬 المودالز
import ExpenseFormModal from './ExpenseFormModal'; 
import ExpensePrintModal from './ExpensePrintModal'; 
import ExpensePaymentModal from './ExpenseFormModal'; 

const MAIN_CATEGORIES = [
  "إعاشة وتغذية", "محروقات وانتقالات", "عدد ومعدات", "مستهلكات ومواد تشغيل", 
  "صيانة وإصلاحات", "مصاريف إدارية", "عمولات وبقشيش", "سكن وأثاث", 
  "أدوات نظافة", "مواد إنشائية"
];

export default function ExpensesPage() {
  const logic = useExpensesLogic();
  const [mounted, setMounted] = useState(false); 
  
  // 🚀 حالة محليّة للفلترة بالتصنيف بما أن الـ Hook لا يدعمها مباشرة
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const { can, loading: permsLoading } = usePermissions();

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [expenseForPay, setExpenseForPay] = useState<any>(null);

  useEffect(() => {
      setMounted(true);
  }, []);

  // 🛠️ عملية الفلترة المحلية: نأخذ البيانات من الـ logic ونفلترها حسب التصنيف المختار
  const displayedExpenses = useMemo(() => {
    if (!categoryFilter) return logic.filteredExpenses;
    return logic.filteredExpenses.filter((item: any) => item.main_category === categoryFilter);
  }, [logic.filteredExpenses, categoryFilter]);

  // 💰 حساب الإجمالي المحلي بناءً على البيانات المفلترة حالياً
  const displayedTotal = useMemo(() => {
    return displayedExpenses.reduce((sum: number, row: any) => {
      const total = row.total_price || ((Number(row.quantity || 1) * Number(row.unit_price || 0)) + Number(row.vat_amount || 0) - Number(row.discount_amount || 0));
      return sum + total;
    }, 0);
  }, [displayedExpenses]);

  // =========================================================================
  // 💎 أعمدة الجدول (كما هي دون أي حذف)
  // =========================================================================
  const expenseColumns = [
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
    { header: 'التاريخ', accessor: 'exp_date', render: (row: any) => row ? <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 700 }}>{row.exp_date}</span> : null },
    { header: 'المقاول/المستفيد', accessor: 'sub_contractor', render: (row: any) => row ? <b style={{ fontWeight: 900, color: '#1e293b' }}>{row.sub_contractor || row.payee_name || '---'}</b> : null },
    
    { 
      header: 'التصنيف الرئيسي', 
      accessor: 'main_category', 
      render: (row: any) => row ? (
        <span style={{ 
          fontSize:'11px', 
          background: '#e0f2fe', 
          padding: '4px 10px', 
          borderRadius: '8px', 
          color: '#0369a1', 
          fontWeight: 900,
          border: '1px solid #bae6fd',
          whiteSpace: 'nowrap'
        }}>
          📁 {row.main_category || 'غير مصنف'}
        </span>
      ) : null 
    },

    { 
      header: 'المشروع', 
      accessor: 'site_ref', 
      render: (row: any) => row ? (
        <span style={{ fontSize:'11px', background: row.is_auto_distributed ? '#f3e8ff' : '#f1f5f9', padding: '4px 10px', borderRadius: '8px', color: row.is_auto_distributed ? THEME.purple : THEME.brand.coffee, fontWeight: 900 }}>
          {row.is_auto_distributed ? '⚡ توزيع ذكي' : row.site_ref || 'عام'}
        </span>
      ) : null 
    },
    
    { 
      header: 'حساب المصروف (مدين)', 
      accessor: 'creditor_account', 
      render: (row: any) => row ? (
        <span style={{ fontSize:'11px', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', color: '#475569', fontWeight: 900 }}>
          🧾 {row.creditor_account || '---'}
        </span>
      ) : null 
    },
    { 
      header: 'حساب السداد (دائن)', 
      accessor: 'payment_account', 
      render: (row: any) => row ? (
        <span style={{ fontSize:'11px', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', color: '#475569', fontWeight: 900 }}>
          🏦 {row.payment_account || '---'}
        </span>
      ) : null 
    },

    { 
      header: 'البيان التفصيلي', 
      accessor: 'description', 
      render: (row: any) => {
        if (!row) return null;
        let displayDesc = row.description;
        if ((!displayDesc || displayDesc.trim() === '') && row.lines_data && Array.isArray(row.lines_data) && row.lines_data.length > 0) {
            displayDesc = row.lines_data.map((l: any) => l.description).filter(Boolean).join(' + ');
        }
        return <span style={{ fontSize:'12px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }} title={displayDesc || '---'}>{displayDesc || '---'}</span>;
      } 
    },
    { header: 'الضريبة', accessor: 'vat_amount', render: (row: any) => row ? <span style={{fontWeight: 700}}>{Number(row.vat_amount || 0).toLocaleString()}</span> : null },
    { header: 'الخصم', accessor: 'discount_amount', render: (row: any) => row ? <span style={{ color: THEME.ruby, fontWeight: 700 }}>{Number(row.discount_amount || 0).toLocaleString()}</span> : null },
    { 
      header: 'الإجمالي', 
      accessor: 'total', 
      render: (row: any) => {
        if (!row) return null;
        const total = row.total_price || ((Number(row.quantity || 1) * Number(row.unit_price || 0)) + Number(row.vat_amount || 0) - Number(row.discount_amount || 0));
        return <span style={{ color: THEME.success, fontWeight: 900, fontSize: '14px' }}>{total.toLocaleString()}</span>;
      } 
    },
    
    {
      header: 'حالة السداد',
      accessor: 'payment_status',
      render: (row: any) => {
        if (!row) return null;
        
        const total = row.total_price || (Number(row.quantity || 1) * Number(row.unit_price || 0)) + Number(row.vat_amount || 0) - Number(row.discount_amount || 0);
        const paid = Number(row.paid_amount || 0);
        
        let statusText = '';
        let bgColor = '';
        let textColor = '';

        if (paid <= 0) {
            statusText = 'لم يتم الصرف ❌';
            bgColor = '#fef2f2'; 
            textColor = '#ef4444';
        } else if (paid > 0 && paid < total) {
            statusText = 'مدفوع جزئي ⏳';
            bgColor = '#fffbeb'; 
            textColor = '#f59e0b';
        } else if (paid >= total) {
            statusText = 'مدفوع كلياً ✅';
            bgColor = '#ecfdf5'; 
            textColor = '#10b981';
        }

        return (
          <span style={{ 
            display: 'inline-block', 
            background: bgColor, 
            color: textColor, 
            padding: '4px 10px', 
            borderRadius: '8px', 
            fontSize: '11px', 
            fontWeight: 900,
            border: `1px solid ${textColor}30`,
            whiteSpace: 'nowrap'
          }}>
            {statusText}
          </span>
        );
      }
    },
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
        const total = row.total_price || ((Number(row.quantity || 1) * Number(row.unit_price || 0)) + Number(row.vat_amount || 0) - Number(row.discount_amount || 0));
        const paid = Number(row.paid_amount || 0);
        const balance = total - paid;
        
        const needsPayment = balance > 0 && row.is_posted === true; 

        return (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setPrintData(row); setIsPrintModalOpen(true); }} 
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.1)', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', fontSize: '14px' }}
              title="طباعة المصروف"
            >
              🖨️
            </button>
            {needsPayment && (
              <button 
                onClick={(e) => {
                  e.stopPropagation(); 
                  setExpenseForPay({ ...row, amount: balance }); 
                  setIsPaymentModalOpen(true);
                }} 
                style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '11px', boxShadow: '0 4px 10px rgba(239,68,68,0.3)' }}
                title="إصدار سند صرف"
              >
                💸 صرف
              </button>
            )}
          </div>
        );
      }
    }
  ];

  // 🚀 القائمة الجانبية للأزرار الإجرائية
  const sidebarActions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <SecureAction module="expenses" action="create">
        <button className="btn-main-glass gold" onClick={logic.handleAddNew}>➕ إضافة مصروف جديد</button>
      </SecureAction>

      {logic.selectedIds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '5px', paddingTop: '15px', borderTop: '1px dashed rgba(255,255,255,0.2)' }}>
          <div style={{ textAlign: 'center', marginBottom: '5px' }}>
              <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 900, margin: 0 }}>الإجراءات على ({logic.selectedIds.length})</p>
              <button onClick={() => logic.setSelectedIds([])} style={{ background: 'none', border: 'none', color: THEME.primary, fontSize: '10px', fontWeight: 900, cursor: 'pointer', textDecoration: 'underline' }}>إلغاء التحديد</button>
          </div>

          <SecureAction module="expenses" action="edit">
            <button className="btn-main-glass blue" onClick={() => logic.setIsBulkFixModalOpen(true)}>🛠️ تصحيح مجمع</button>
          </SecureAction>
          {logic.selectedIds.length === 1 && (
            <SecureAction module="expenses" action="edit">
              <button className="btn-main-glass white" onClick={logic.handleEditSelected}>✏️ تعديل السجل</button>
            </SecureAction>
          )}
          <SecureAction module="expenses" action="post">
            <button className="btn-main-glass green" onClick={logic.handlePostSelected}>🚀 اعتماد وترحيل</button>
          </SecureAction>
          <SecureAction module="expenses" action="post">
            <button className="btn-main-glass yellow" onClick={logic.handleUnpostSelected}>↩️ فك الترحيل</button>
          </SecureAction>
          <SecureAction module="expenses" action="delete">
            <button className="btn-main-glass red" onClick={logic.handleDeleteSelected}>🗑️ حذف نهائي</button>
          </SecureAction>
        </div>
      )}

      <button className="btn-main-glass white" onClick={logic.exportToExcel}>📊 تصدير Excel</button>
    </div>
  );

  return (
    <div className="clean-page">
      <MasterPage title="سجل المصروفات الموحد" subtitle="إدارة التكاليف والمشتريات وتوزيع بنود العمل">
          <RawasiSidebarManager 
            summary={
              <div className="summary-glass-card">
                <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي مصروفات الفترة 📉</span>
                {/* 🚀 تم التعديل لعرض الإجمالي المفلتر محلياً */}
                <div className="val" style={{fontSize:'24px', fontWeight:900, color: THEME.primary, marginTop:'5px'}}>{formatCurrency(displayedTotal)}</div>
                <div style={{fontSize:'11px', color:'#10b981', fontWeight:800, marginTop:'5px'}}>إجمالي القيود: {displayedExpenses.length}</div>
              </div>
            }
            actions={sidebarActions}
            customFilters={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                
                {/* 🚀 فلتر التصنيف الرئيسي (تم ربطه بالحالة المحلية) */}
                <div>
                  <label style={{color: 'white', fontSize: '11px', fontWeight: 900, display: 'block', marginBottom: '8px'}}>تصفية بالتصنيف:</label>
                  <select 
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, outline: 'none', cursor: 'pointer', fontSize: '12px', appearance: 'auto' }} 
                      value={categoryFilter || "الكل"}
                      onChange={e => {
                        const val = e.target.value;
                        // تحديث الحالة المحلية فقط لتجنب أخطاء الـ Hook
                        setCategoryFilter(val === 'الكل' ? null : val);
                      }}
                  >
                    <option value="الكل" style={{color:'#000'}}>📁 كل التصنيفات</option>
                    {MAIN_CATEGORIES.map(c => <option key={c} value={c} style={{color:'#000'}}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{color: 'white', fontSize: '11px', fontWeight: 900, display: 'block', marginBottom: '8px'}}>عرض السجلات:</label>
                  <select 
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, outline: 'none', cursor: 'pointer', fontSize: '12px' }} 
                      value={logic.rowsPerPage} 
                      onChange={e => { logic.setRowsPerPage(Number(e.target.value)); logic.setCurrentPage(1); }}
                  >
                    <option value="50" style={{color:'#000'}}>50 سجل</option>
                    <option value="100" style={{color:'#000'}}>100 سجل</option>
                    <option value="500" style={{color:'#000'}}>500 سجل</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ color: 'white', fontSize: '11px', fontWeight: 900, display: 'block', marginBottom: '8px' }}>تصفية حسب الحالة:</label>
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
              </div>
            }
            watchDeps={[logic.selectedIds, displayedTotal, logic.rowsPerPage, displayedExpenses.length, logic.filterStatus]}
          />

          <style>{`
            .table-glass-wrapper { background: rgba(255,255,255,0.5); backdrop-filter: blur(10px); border-radius: 24px; padding: 10px; border: 1px solid rgba(255,255,255,0.7); transition: all 0.3s ease; }
            .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
            .btn-main-glass.gold { background: linear-gradient(135deg, rgba(197, 160, 89, 0.9), rgba(151, 115, 50, 1)); color: white; }
            .btn-main-glass.blue { background: linear-gradient(135deg, rgba(14, 165, 233, 0.8), rgba(2, 132, 199, 0.9)); color: white; }
            .btn-main-glass.green { background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(22, 163, 74, 0.9)); color: white; }
            .btn-main-glass.yellow { background: linear-gradient(135deg, rgba(245, 158, 11, 0.8), rgba(217, 119, 6, 0.9)); color: white; }
            .btn-main-glass.white { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255,255,255,0.8); }
            .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
            .btn-main-glass:hover { transform: translateY(-3px); filter: brightness(1.1); }
            .summary-glass-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); padding: 20px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 25px; }
            .filter-btn { flex: 1; padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.1); color: white; border: none; font-weight: 900; cursor: pointer; font-size: 11px; transition: 0.3s; }
            .filter-btn.active { background: ${THEME.goldAccent}; color: #1e293b; }
            .custom-checkbox { width: 20px; height: 20px; accent-color: ${THEME.goldAccent}; cursor: pointer; transition: 0.1s; }
            @keyframes modalEntrance { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
          `}</style>

          {(logic.isLoading || permsLoading) ? (
            <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8' }}>⏳ جاري المزامنة...</div>
          ) : (
            <div className="table-glass-wrapper cinematic-scroll" style={{ overflowX: 'auto' }}>
              <RawasiSmartTable 
                /* 🚀 تم تمرير البيانات المفلترة محلياً للجدول */
                data={displayedExpenses.slice((logic.currentPage-1)*logic.rowsPerPage, logic.currentPage*logic.rowsPerPage)} 
                columns={expenseColumns} 
                onRowClick={(row) => { setPrintData(row); setIsPrintModalOpen(true); }}
                enablePagination={true}
                currentPage={logic.currentPage}
                totalItems={displayedExpenses.length}
                rowsPerPage={logic.rowsPerPage}
                onPageChange={logic.setCurrentPage}
                onRowsChange={logic.setRowsPerPage}
              />
            </div>
          )}

          {/* 🚀 المودالز المدمجة في الصفحة الأساسية (التصحيح المجمع) */}
          {mounted && logic.isBulkFixModalOpen && createPortal(
            <div style={{ position: 'fixed', inset: 0, zIndex: 999999999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'rgba(40, 24, 10, 0.85)', backdropFilter: 'blur(10px)', padding: '50px 20px', overflowY: 'auto' }}>
              <div style={{ position: 'fixed', inset: 0 }} onClick={() => logic.setIsBulkFixModalOpen(false)} />
              <div className="cinematic-scroll" style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '32px', width: '100%', maxWidth: '600px', padding: '40px', position: 'relative', zIndex: 10, margin: 'auto', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)', animation: 'modalEntrance 0.4s forwards' }}>
                <h2 style={{ fontWeight: 900, textAlign: 'center', marginBottom: '30px', color: THEME.brand.coffee, fontSize: '24px' }}>🛠️ تصحيح الحسابات لـ ({logic.selectedIds.length}) سجل</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', zIndex: 50, position: 'relative' }}>
                  <div style={{ zIndex: 60, position: 'relative' }}>
                    <SmartCombo label="🧾 حساب المصروف (المدين)" table="accounts" displayCol="name" initialDisplay={logic.bulkFixAccounts.creditor_account} onSelect={(val:any)=>logic.setBulkFixAccounts({...logic.bulkFixAccounts, creditor_account: val.name})} strict={true} />
                  </div>
                  <div style={{ zIndex: 50, position: 'relative' }}>
                    <SmartCombo label="🏦 حساب السداد (الدائن)" table="accounts" displayCol="name" initialDisplay={logic.bulkFixAccounts.payment_account} onSelect={(val:any)=>logic.setBulkFixAccounts({...logic.bulkFixAccounts, payment_account: val.name})} strict={true} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '15px', marginTop: '40px' }}>
                  <button onClick={logic.handleBulkFixSave} disabled={logic.isLoading} style={{ flex: 2, padding: '18px', borderRadius: '16px', background: THEME.info, color: 'white', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '16px', boxShadow: `0 10px 25px ${THEME.info}40` }}>{logic.isLoading ? '⏳ جاري الحفظ...' : '✅ تطبيق التعديلات'}</button>
                  <button onClick={()=>logic.setIsBulkFixModalOpen(false)} style={{ flex: 1, padding: '18px', borderRadius: '16px', border: '2px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 900, cursor: 'pointer', fontSize: '16px' }}>إلغاء</button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* 🚀 المكونات المستقلة (المودالز) */}
          {mounted && isPaymentModalOpen && (
              <ExpensePaymentModal 
                isOpen={isPaymentModalOpen} 
                onClose={() => setIsPaymentModalOpen(false)} 
                record={expenseForPay || {}} 
                onSave={(data: any) => { 
                  if(logic.handleSavePayment) logic.handleSavePayment(data); 
                  setIsPaymentModalOpen(false); 
                }} 
              />
          )}

          {mounted && logic.isEditModalOpen && (
              <ExpenseFormModal 
                isOpen={logic.isEditModalOpen} 
                onClose={() => logic.setIsEditModalOpen(false)} 
                record={logic.currentExpense} 
                setRecord={logic.setCurrentExpense} 
                onSave={logic.handleSaveExpense} 
                projects={logic.projects} 
                historicalData={logic.historicalData}
                isSaving={logic.isLoading}
              />
          )}

          {mounted && isPrintModalOpen && (
              <ExpensePrintModal 
                isOpen={isPrintModalOpen} 
                onClose={() => setIsPrintModalOpen(false)} 
                record={printData} 
                projects={logic.projects} 
              />
          )}

      </MasterPage>
    </div>
  );
}