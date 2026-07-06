'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useJobOrdersLogic } from './joborders_logic';
import { THEME } from '@/lib/theme';
import SecureAction from '@/components/SecureAction';      
import MasterPage from '@/components/MasterPage';

// 🧱 المكونات
import RawasiSmartTable from '@/components/rawasismarttable';
import RawasiSidebarManager from '@/components/RawasiSidebarManager'; 
import SmartCombo from '@/components/SmartCombo'; 

// 🎬 المودالات
import JobOrderModal from './JobOrderModal';
import JobOrderLedgerModal from './JobOrderLedgerModal'; 
import LoadingScreen from '@/components/LoadingScreen';

export default function JobOrdersPage() {
  const logic = useJobOrdersLogic(); 
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // 🚀 استخراج العناصر الحالية لتحديد الكل بأمان
  const currentVisibleIds = useMemo(() => {
    return logic.allFiltered
      .slice((logic.currentPage - 1) * logic.rowsPerPage, logic.currentPage * logic.rowsPerPage)
      .map((v: any) => String(v.id));
  }, [logic.allFiltered, logic.currentPage, logic.rowsPerPage]);

  const isAllVisibleSelected = currentVisibleIds.length > 0 && currentVisibleIds.every((id: string) => logic.selectedIds.includes(id));

  // =========================================================================
  // 💎 أعمدة الجدول (متوافقة مع RawasiSmartTable)
  // =========================================================================
  const jobOrderColumns = useMemo(() => [
    {
      key: 'select',
      label: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <input 
                  type="checkbox" 
                  className="custom-checkbox"
                  checked={isAllVisibleSelected}
                  title="تحديد كل الصفحة"
                  onChange={() => {
                      if (isAllVisibleSelected) {
                          logic.setSelectedIds(logic.selectedIds.filter((id: string) => !currentVisibleIds.includes(id)));
                      } else {
                          logic.setSelectedIds([...new Set([...logic.selectedIds, ...currentVisibleIds])]);
                      }
                  }}
              />
          </div>
      ), 
      render: (row: any) => {
        if (!row) return null;
        const isSelected = logic.selectedIds.includes(String(row.id));
        return (
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'center' }}>
              <input 
                  type="checkbox" 
                  className="custom-checkbox" 
                  checked={isSelected} 
                  onChange={(e) => {
                      e.stopPropagation();
                      if (isSelected) logic.setSelectedIds(logic.selectedIds.filter((i:any) => i !== String(row.id))); 
                      else logic.setSelectedIds([...logic.selectedIds, String(row.id)]); 
                  }} 
              />
          </div>
        );
      }
    },
    { 
      key: 'order_number',
      label: 'رقم وتاريخ الأمر', 
      render: (row: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <b style={{ color: '#8b5cf6', textShadow: '0 0 10px rgba(139, 92, 246, 0.3)', fontSize: '14px' }}>#{row.order_number}</b>
          <span style={{ fontSize: '10px', color: '#64748b' }}>
              📅 البدء: {row.start_date ? new Date(row.start_date).toLocaleDateString('ar-EG') : '---'}
          </span>
        </div>
      ) 
    },
    { 
      key: 'project_name',
      label: 'العقار والبند المستهدف', 
      render: (row: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '250px' }}>
          {row.job_order_name && (
             <span style={{fontWeight: 900, color: '#1e293b', fontSize: '12px', lineHeight: '1.4'}}>
                 {row.job_order_name}
             </span>
          )}
          <span style={{fontWeight: 900, color: row.job_order_name ? '#64748b' : '#1e293b', fontSize: row.job_order_name ? '11px' : '13px'}}>
              {row.projects?.Property || row.projects?.project_name || 'العقار غير محدد'}
          </span>
          {row.boq_budget?.work_item && (
             <span style={{ fontSize: '10px', color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', width: 'fit-content', border: '1px solid #e2e8f0' }}>
               🛠️ {row.boq_budget.work_item}
             </span>
          )}
        </div>
      ) 
    },
    { 
      key: 'executor',
      label: 'المنفذ / المقاول', 
      render: (row: any) => {
        const isSelf = row.executor_type === 'تنفيذ ذاتي';
        const executorName = isSelf ? 'تنفيذ ذاتي (عمالة الشركة)' : (row.partners?.name || 'غير محدد');
        return (
          <span style={{ 
            padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, display: 'inline-block',
            background: isSelf ? 'rgba(99, 102, 241, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            color: isSelf ? '#4f46e5' : '#d97706',
            border: `1px solid ${isSelf ? 'rgba(99, 102, 241, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
          }}>
            {isSelf ? '👷‍♂️' : '🤝'} {executorName}
          </span>
        );
      } 
    },
    {
      key: 'qty_price',
      label: 'الكمية والسعر المقدر',
      render: (row: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', fontWeight: 700, textAlign: 'right' }}>
           <span style={{ color: '#334155' }}>الكمية: {Number(row.assigned_qty || 0).toLocaleString()}</span>
           <span style={{ color: THEME.primary }}>السعر: {Number(row.unit_price || 0).toLocaleString()} ر.س</span>
        </div>
      )
    },
    {
      key: 'performance',
      label: 'الأداء والربحية 📊',
      render: (row: any) => {
        // 🚀 المعادلة المحاسبية الدقيقة والصريحة جداً
        
        // 1. أصل الموازنة (قيمة البند الأساسية في المقايسة)
        const targetBudget = Number(row.boq_budget?.total_price || row.boq_total_budget || 0); 
        
        // 2. المنصرف الفعلي (مواد وخامات وعمالة يوميات ومصروفات)
        const materialsAndExpenses = Number(row.effective_cost || 0); 
        
        // 3. المنصرف للمقاول (من المستخلصات)
        const subcontractorPaid = Number(row.subcontractor_paid || 0); 
        
        // إجمالي التكلفة الحقيقية = المنصرف (خامات/عمالة/مصاريف) + اللي خده المقاول
        const finalCost = row.executor_type === 'مقاول باطن' 
            ? materialsAndExpenses + subcontractorPaid 
            : materialsAndExpenses;
        
        // صافي الربح = أصل قيمة البند - إجمالي المنصرف
        const calculatedProfit = targetBudget - finalCost;
        
        let profitColor = '#10b981'; 
        let profitBg = 'rgba(16, 185, 129, 0.1)';
        let profitLabel = 'الربح الصافي:';
        
        if (calculatedProfit < 0) {
            profitColor = '#ef4444'; 
            profitBg = 'rgba(239, 68, 68, 0.1)';
            profitLabel = 'الخسارة:';
        } else if (calculatedProfit === 0 && finalCost === 0) {
            profitColor = '#94a3b8'; 
            profitBg = '#f1f5f9';
            profitLabel = 'لم يبدأ:';
        } else if (calculatedProfit === 0 && finalCost > 0) {
            profitColor = '#f59e0b'; 
            profitBg = 'rgba(245, 158, 11, 0.1)';
            profitLabel = 'تعادل:';
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 800, minWidth: '200px' }}>
             <span style={{ color: '#0ea5e9', display: 'flex', justifyContent: 'space-between' }}>
                 <span>أصل الموازنة:</span> <span>{targetBudget.toLocaleString()} ر.س</span>
             </span>
             
             {row.executor_type === 'مقاول باطن' ? (
                <>
                    <span style={{ color: '#f59e0b', display: 'flex', justifyContent: 'space-between' }}>
                        <span>خامات ومصروفات:</span> <span dir="ltr"> - {materialsAndExpenses.toLocaleString()}</span>
                    </span>
                    <span style={{ color: '#8b5cf6', display: 'flex', justifyContent: 'space-between' }}>
                        <span>مسدد للمقاول:</span> <span dir="ltr"> - {subcontractorPaid.toLocaleString()}</span>
                    </span>
                </>
             ) : (
                <span style={{ color: '#ef4444', display: 'flex', justifyContent: 'space-between' }}>
                    <span>منصرف (عمالة/خامات):</span> <span dir="ltr"> - {materialsAndExpenses.toLocaleString()}</span>
                </span>
             )}
             
             <span style={{ color: '#1e293b', borderTop: '1px dashed #cbd5e1', paddingTop: '4px', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                 <span>إجمالي التكلفة:</span> <span>{finalCost.toLocaleString()} ر.س</span>
             </span>
             
             <span style={{ 
                 color: profitColor, background: profitBg, 
                 padding: '4px 8px', borderRadius: '6px', border: `1px solid ${profitColor}40`, marginTop: '4px', display: 'flex', justifyContent: 'space-between'
             }}>
               <span>{profitLabel}</span> <span>{Math.abs(calculatedProfit).toLocaleString()} ر.س</span>
             </span>
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (row: any) => {
        let badgeStyle = { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8', icon: '📄' }; // مسودة
        if (row.status === 'جاري التنفيذ') badgeStyle = { bg: '#dbeafe', color: '#2563eb', dot: '#3b82f6', icon: '⏳' };
        if (row.status === 'مكتمل') badgeStyle = { bg: '#dcfce3', color: '#10b981', dot: '#22c55e', icon: '✅' };
        if (row.status === 'موقوف') badgeStyle = { bg: '#fee2e2', color: '#dc2626', dot: '#ef4444', icon: '⏸️' };
        
        return (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800,
            backgroundColor: badgeStyle.bg, color: badgeStyle.color, border: `1px solid ${badgeStyle.dot}40`
          }}>
            <span>{badgeStyle.icon}</span>
            {row.status}
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row: any) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
          <button onClick={(e) => { e.stopPropagation(); logic.handleEdit(row); }} className="btn-glass-pay" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }} title="تعديل الأمر">📝</button>
          
          <button onClick={(e) => { 
              e.stopPropagation(); 
              logic.setLedgerRecord(row); 
              logic.setIsLedgerOpen(true); 
          }} 
          className="btn-glass-pay" 
          style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 900, fontSize: '12px' }} title="عرض السجل التحليلي">
              📊 السجل
          </button>
        </div>
      )
    }
  ], [logic.selectedIds, isAllVisibleSelected, currentVisibleIds, logic]);

  // =========================================================================
  // 🎛️ أزرار السايد بار
  // =========================================================================
  const sidebarActions = useMemo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <SecureAction module="job_orders" action="create">
        <button className="btn-main-glass gold" onClick={logic.handleAddNew}>
          ➕ إصدار أمر تشغيل جديد
        </button>
      </SecureAction>

      {logic.selectedIds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '5px', paddingTop: '15px', borderTop: '1px dashed rgba(255,255,255,0.2)' }}>
          <p style={{fontSize:'10px', textAlign:'center', color:'#94a3b8', fontWeight:900, marginBottom:'-5px'}}>الإجراءات المجمعة ({logic.selectedIds.length})</p>
          
          <SecureAction module="job_orders" action="edit">
            <button className="btn-main-glass green" onClick={logic.handleCompleteSelected} disabled={logic.isSaving}>
              {logic.isSaving ? '⏳ جاري...' : '✅ تعيين كمكتمل'}
            </button>
          </SecureAction>

          <SecureAction module="job_orders" action="edit">
            <button className="btn-main-glass yellow" onClick={logic.handleSuspendSelected} disabled={logic.isSaving}>
              ⏸️ إيقاف مؤقت
            </button>
          </SecureAction>

          <SecureAction module="job_orders" action="delete">
            <button className="btn-main-glass red" onClick={logic.handleDeleteSelected} disabled={logic.isSaving}>
              🗑️ حذف نهائي
            </button>
          </SecureAction>
        </div>
      )}
    </div>
  ), [logic.selectedIds, logic]);

  return (
    <MasterPage 
      title="أوامر التشغيل (Job Orders)" 
      subtitle="إدارة ومتابعة التكاليف وإسناد الأعمال للمقاولين والعمالة"
    >
      
      <RawasiSidebarManager 
        summary={
          <div className="summary-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>جاري التنفيذ ⏳</span>
                <span style={{fontSize:'14px', fontWeight:900, color: '#3b82f6'}}>{logic.kpis.running}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>موقوف ⏸️</span>
                <span style={{fontSize:'14px', fontWeight:900, color: '#dc2626'}}>{logic.kpis.suspended}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>مكتمل ✅</span>
                <span style={{fontSize:'14px', fontWeight:900, color: '#10b981'}}>{logic.kpis.completed}</span>
            </div>
          </div>
        }
        actions={sidebarActions}
        customFilters={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <SmartCombo 
                    label="تصفية بالمشروع"
                    icon="🏢"
                    table="projects"
                    displayCol="project_name"
                    placeholder="ابحث عن مشروع..."
                    enableClear={true}
                    onSelect={(item:any) => logic.setGlobalSearch(item?.project_name || '')}
                />
            </div>
        }
        onSearch={logic.setGlobalSearch}
        onDateFilter={(start, end) => { logic.setDateFrom(start); logic.setDateTo(end); }}
        watchDeps={[logic.selectedIds, logic.allFiltered.length]}
      />

      <style>{`
        .custom-checkbox { width: 20px; height: 20px; accent-color: ${THEME.goldAccent || '#d97706'}; cursor: pointer; transition: 0.1s; border-radius: 4px; }
        .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-main-glass.gold { background: linear-gradient(135deg, rgba(197, 160, 89, 0.9), rgba(151, 115, 50, 1)); color: white; }
        .btn-main-glass.green { background: linear-gradient(135deg, rgba(16, 185, 129, 0.8), rgba(5, 150, 105, 0.9)); color: white; }
        .btn-main-glass.yellow { background: linear-gradient(135deg, rgba(245, 158, 11, 0.8), rgba(217, 119, 6, 0.9)); color: white; }
        .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .btn-main-glass:hover:not(:disabled) { transform: translateY(-3px); filter: brightness(1.1); }
        .btn-main-glass:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {(logic.isLoading && logic.allFiltered.length === 0) ? (
        <LoadingScreen message="جاري تحميل أوامر التشغيل..." fullScreen={false} />
      ) : (
        <div className="clickable-rows cinematic-scroll" style={{ background: 'white', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <RawasiSmartTable 
              data={logic.allFiltered} 
              columns={jobOrderColumns} 
              enablePagination={true}
              currentPage={logic.currentPage}
              totalItems={logic.allFiltered.length}
              rowsPerPage={logic.rowsPerPage}
              onPageChange={logic.setCurrentPage}
              onRowsChange={logic.setRowsPerPage}
              onRowClick={(row:any) => logic.handleEdit(row)}
          />
        </div>
      )}

      {/* المودال الخاص بإضافة/تعديل أمر التشغيل */}
      {mounted && logic.isEditModalOpen && (
        <JobOrderModal 
          isOpen={logic.isEditModalOpen} 
          onClose={() => logic.setIsEditModalOpen(false)} 
          record={logic.currentRecord} 
          setRecord={logic.setCurrentRecord} 
          onSave={logic.handleSave} 
          isSaving={logic.isSaving}
        />
      )}

      {/* 🚀 المودال الجديد: دفتر الأستاذ التحليلي */}
      {mounted && logic.isLedgerOpen && (
        <JobOrderLedgerModal 
          isOpen={logic.isLedgerOpen} 
          onClose={() => logic.setIsLedgerOpen(false)} 
          jobOrder={logic.ledgerRecord} 
        />
      )}
      
    </MasterPage>
  );
}