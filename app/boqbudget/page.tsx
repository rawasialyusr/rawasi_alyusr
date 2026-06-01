"use client";
import React, { useMemo, useEffect, useState } from 'react';
import { useBOQLogic } from './boqbudget_logic';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers'; 
import MasterPage from '@/components/MasterPage';
import RawasiSmartTable from '@/components/rawasismarttable';
import RawasiSidebarManager from '@/components/RawasiSidebarManager'; 
import SmartCombo from '@/components/SmartCombo'; 
import BOQModal from './BOQModal';

// 🎨 مكون مساعد لتغليف الخلايا (موضع الاحتواء الشامل والألوان الزجاجية)
const CellWrapper = ({ row, children, justify = 'flex-start', maxWidth = 'none' }: { row: any, children: React.ReactNode, justify?: string, maxWidth?: string }) => (
    <div style={{ 
        background: row.project_color, 
        padding: '2px 4px', 
        borderRadius: '4px', 
        height: '100%',
        minHeight: '26px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: justify,
        border: '1px solid rgba(255,255,255,0.4)',
        transition: '0.2s',
        fontSize: '9.5px', 
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        maxWidth: maxWidth,
        textOverflow: 'ellipsis'
    }}>
        {children}
    </div>
);

export default function BOQBudgetPage() {
  const logic = useBOQLogic(); 
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const currentVisibleIds = useMemo(() => {
    return logic.allFiltered
      .slice((logic.currentPage - 1) * logic.rowsPerPage, logic.currentPage * logic.rowsPerPage)
      .map((v: any) => String(v.id));
  }, [logic.allFiltered, logic.currentPage, logic.rowsPerPage]);

  const isAllVisibleSelected = currentVisibleIds.length > 0 && currentVisibleIds.every((id: string) => logic.selectedIds.includes(id));

  // 💎 أعمدة الجدول الشاملة والمضغوطة بالكامل لابتلاع الـ 31 عمود
  const boqColumns = useMemo(() => [
    {
      key: 'select',
      label: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <input type="checkbox" className="custom-checkbox" checked={isAllVisibleSelected}
                  onChange={() => {
                      if (isAllVisibleSelected) logic.setSelectedIds(logic.selectedIds.filter((id: string) => !currentVisibleIds.includes(id)));
                      else logic.setSelectedIds([...new Set([...logic.selectedIds, ...currentVisibleIds])]);
                  }}
              />
          </div>
      ), 
      render: (row: any) => {
        const isSelected = logic.selectedIds.includes(String(row.id));
        return (
          <CellWrapper row={row} justify="center">
            <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'center' }}>
                <input type="checkbox" className="custom-checkbox" checked={isSelected} 
                    onChange={(e) => {
                        e.stopPropagation();
                        if (isSelected) logic.setSelectedIds(logic.selectedIds.filter((i:any) => i !== String(row.id))); 
                        else logic.setSelectedIds([...logic.selectedIds, String(row.id)]); 
                    }} 
                />
            </div>
          </CellWrapper>
        );
      }
    },
    // --- 📌 الأساسيات ---
    { 
      key: 'project_name', label: 'المشروع', 
      render: (row: any) => (
        <CellWrapper row={row} maxWidth="120px">
            <div style={{ fontWeight: row.is_first_in_group ? 900 : 700, color: row.is_first_in_group ? '#0f172a' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {row.is_first_in_group ? '🏢' : <span style={{ opacity: 0.4 }}>↳</span>} {row.Property || row.projects?.Property || 'عام'}
            </div>
        </CellWrapper>
      )
    },
    { key: 'work_item', label: 'وصف البند', render: (row: any) => <CellWrapper row={row} maxWidth="150px"><span style={{ fontWeight: 900, color: THEME.primary, overflow:'hidden', textOverflow:'ellipsis' }}>{row.work_item}</span></CellWrapper> },
    { key: 'unit', label: 'الوحدة', render: (row: any) => <CellWrapper row={row} justify="center"><span style={{color: '#64748b'}}>{row.unit}</span></CellWrapper> },
    { key: 'start_date', label: 'بدء', render: (row: any) => <CellWrapper row={row} justify="center"><span style={{fontSize:'8.5px'}}>{row.start_date || '-'}</span></CellWrapper> },
    { key: 'end_date', label: 'انتهاء', render: (row: any) => <CellWrapper row={row} justify="center"><span style={{fontSize:'8.5px'}}>{row.end_date || '-'}</span></CellWrapper> },

    // --- 🤝 التعاقد ---
    { key: 'contract_quantity', label: 'كمية عق.', render: (row: any) => <CellWrapper row={row} justify="center"><strong style={{color:'#4f46e5'}}>{Number(row.contract_quantity || 0).toLocaleString()}</strong></CellWrapper> },
    { key: 'unit_contract_price', label: 'سعر و.', render: (row: any) => <CellWrapper row={row} justify="center"><span style={{color:'#4f46e5'}}>{formatCurrency(row.unit_contract_price)}</span></CellWrapper> },
    { key: 'total_contract_amount', label: 'إجمالي العق.', render: (row: any) => <CellWrapper row={row} justify="center"><span style={{fontWeight:900, color:'#4338ca', background:'rgba(79,70,229,0.1)', padding:'1px 4px', borderRadius:'4px'}}>{formatCurrency(row.total_contract_amount)}</span></CellWrapper> },
    { key: 'retention_percentage', label: 'ضمان%', render: (row: any) => <CellWrapper row={row} justify="center"><span>{Number(row.retention_percentage || 0)}%</span></CellWrapper> },
    { key: 'actual_retention_amount', label: 'قيمة الضم.', render: (row: any) => <CellWrapper row={row} justify="center"><span style={{color:'#dc2626'}}>{formatCurrency(row.actual_retention_amount)}</span></CellWrapper> },

    // --- 📊 الموازنة التقديرية ---
    { key: 'estimated_material_cost', label: 'خامات(ت)', render: (row: any) => <CellWrapper row={row} justify="center"><span style={{color:'#b45309'}}>{formatCurrency(row.estimated_material_cost)}</span></CellWrapper> },
    { key: 'estimated_labor_cost', label: 'عمالة(ت)', render: (row: any) => <CellWrapper row={row} justify="center"><span style={{color:'#b45309'}}>{formatCurrency(row.estimated_labor_cost)}</span></CellWrapper> },
    { key: 'estimated_operational_cost', label: 'تشغيل(ت)', render: (row: any) => <CellWrapper row={row} justify="center"><span style={{color:'#b45309'}}>{formatCurrency(row.estimated_operational_cost)}</span></CellWrapper> },
    { key: 'estimated_expenses_cost', label: 'مصروف(ت)', render: (row: any) => <CellWrapper row={row} justify="center"><span style={{color:'#b45309'}}>{formatCurrency(row.estimated_expenses_cost)}</span></CellWrapper> },

    // --- 🟢 الفعلي (المسحوب تلقائياً من الحركة واليوميات) ---
    { key: 'actual_quantity', label: 'منفذ', render: (row: any) => <CellWrapper row={row} justify="center"><span style={{ fontWeight: 900, color: '#047857', background: 'rgba(255,255,255,0.6)', padding: '1px 6px', borderRadius: '4px', border: '1px solid #10b981' }}>{Number(row.actual_quantity || 0).toLocaleString()}</span></CellWrapper> },
    { 
      key: 'completed_percentage', label: 'إنجاز%', 
      render: (row: any) => (
        <CellWrapper row={row} justify="center">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '35px' }}>
                <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#334155' }}>{Number(row.completed_percentage || 0).toFixed(0)}%</span>
                <div style={{ width: '100%', height: '3px', background: 'rgba(0,0,0,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: THEME.accent, width: `${Math.min(row.completed_percentage || 0, 100)}%` }}></div>
                </div>
            </div>
        </CellWrapper>
      )
    },
    { key: 'actual_material_cost', label: 'خامات(ف)', render: (row: any) => <CellWrapper row={row} justify="center"><span style={{color:'#047857'}}>{formatCurrency(row.actual_material_cost)}</span></CellWrapper> },
    { key: 'actual_labor_cost', label: 'عمالة(ف)', render: (row: any) => <CellWrapper row={row} justify="center"><span style={{color:'#047857'}}>{formatCurrency(row.actual_labor_cost)}</span></CellWrapper> },
    { key: 'actual_operational_cost', label: 'تشغيل(ف)', render: (row: any) => <CellWrapper row={row} justify="center"><span style={{color:'#047857'}}>{formatCurrency(row.actual_operational_cost)}</span></CellWrapper> },
    { key: 'actual_expenses_cost', label: 'مصروف(ف)', render: (row: any) => <CellWrapper row={row} justify="center"><span style={{color:'#047857'}}>{formatCurrency(row.actual_expenses_cost)}</span></CellWrapper> },
    { key: 'actual_revenue', label: 'إيراد(ف)', render: (row: any) => <CellWrapper row={row} justify="center"><span style={{color:'#15803d', fontWeight:900}}>{formatCurrency(row.actual_revenue)}</span></CellWrapper> },

    // --- 🚨 الانحرافات التلقائية ---
    { key: 'material_variance', label: '± خامات', render: (row: any) => { const v = Number(row.material_variance||0); return <CellWrapper row={row} justify="center"><span style={{color: v>=0?'#10b981':'#ef4444', fontWeight:700}}>{formatCurrency(v)}</span></CellWrapper>; } },
    { key: 'labor_variance', label: '± العمالة', render: (row: any) => { const v = Number(row.labor_variance||0); return <CellWrapper row={row} justify="center"><span style={{color: v>=0?'#10b981':'#ef4444', fontWeight:700}}>{formatCurrency(v)}</span></CellWrapper>; } },
    { key: 'operational_variance', label: '± تشغيل', render: (row: any) => { const v = Number(row.operational_variance||0); return <CellWrapper row={row} justify="center"><span style={{color: v>=0?'#10b981':'#ef4444', fontWeight:700}}>{formatCurrency(v)}</span></CellWrapper>; } },
    { key: 'expenses_variance', label: '± مصروف', render: (row: any) => { const v = Number(row.expenses_variance||0); return <CellWrapper row={row} justify="center"><span style={{color: v>=0?'#10b981':'#ef4444', fontWeight:700}}>{formatCurrency(v)}</span></CellWrapper>; } },
    { key: 'total_budget_variance', label: '± الإجمالي', render: (row: any) => { const v = Number(row.total_budget_variance||0); return <CellWrapper row={row} justify="center"><span style={{color: v>=0?'#10b981':'#ef4444', fontWeight:900, background:'rgba(255,255,255,0.6)', padding:'1px 4px', borderRadius:'4px'}}>{formatCurrency(v)}</span></CellWrapper>; } },
    
    // --- 💰 صافي الأرباح الاستثمارية للبند ---
    { 
      key: 'item_net_profit', label: 'الربح الصافي', 
      render: (row: any) => {
        const p = Number(row.item_net_profit || 0);
        return (
            <CellWrapper row={row} justify="center">
                <span style={{ fontWeight: 900, color: p >= 0 ? '#10b981' : '#ef4444', background: 'rgba(255,255,255,0.8)', padding: '2px 6px', borderRadius: '4px', boxShadow:'0 1px 2px rgba(0,0,0,0.05)' }}>
                    {formatCurrency(p)}
                </span>
            </CellWrapper>
        );
      }
    }
  ], [logic.selectedIds, isAllVisibleSelected, currentVisibleIds, logic]);

  // 🎛️ لوحة أزرار التحكم الجانبية
  const sidebarActions = useMemo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <button className="btn-main-glass gold" onClick={logic.handleAddNew}>
          ➕ إضافة بند جديد
        </button>

      {logic.selectedIds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '5px', paddingTop: '15px', borderTop: '1px dashed rgba(255,255,255,0.2)' }}>
          <p style={{fontSize:'10px', textAlign:'center', color:'#94a3b8', fontWeight:900, marginBottom:'-5px'}}>الإجراءات على ({logic.selectedIds.length})</p>
          
          {logic.selectedIds.length === 1 && (
              <button className="btn-main-glass white" onClick={() => logic.handleEdit(logic.allFiltered.find((i:any) => String(i.id) === logic.selectedIds[0]))}>
                📝 تعديل البيانات
              </button>
          )}
          <button className="btn-main-glass red" onClick={logic.handleDeleteSelected} disabled={logic.isSaving}>
            🗑️ حذف البنود
          </button>
        </div>
      )}
    </div>
  ), [logic.selectedIds, logic]);

  return (
    <MasterPage title="المقايسات (BOQ)" subtitle="إدارة بنود الأعمال، التكاليف التقديرية والفعلية (مجمعة بالمشاريع)">
      
      <RawasiSidebarManager 
        summary={
          <div className="summary-glass-card">
            <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي البنود المعروضة 📊</span>
            <div className="val" style={{fontSize:'24px', fontWeight:900, color: THEME.goldAccent, marginTop:'5px'}}>{logic.allFiltered.length}</div>
          </div>
        }
        actions={sidebarActions}
        customFilters={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <SmartCombo 
                    label="تصفية سريعة بالمشروع"
                    icon="🏢"
                    table="projects"
                    displayCol="Property"
                    placeholder="ابحث عن مشروع..."
                    enableClear={true}
                    onSelect={(item:any) => logic.setGlobalSearch(item?.Property || '')}
                />
            </div>
        }
        onSearch={logic.setGlobalSearch}
        watchDeps={[logic.selectedIds, logic.allFiltered.length]}
      />

      <style>{`
        /* 🚀 هندسة الاحتواء الشامل - Ultra Compact View CSS */
        .ultra-compact-wrapper {
            width: 100%;
            overflow-x: hidden !important; 
            zoom: 0.75; 
        }
        
        .ultra-compact-wrapper table {
            width: 100% !important;
            table-layout: auto !important;
        }

        .ultra-compact-wrapper th {
            padding: 4px 2px !important;
            font-size: 9px !important;
            white-space: nowrap !important;
            letter-spacing: -0.5px;
            color: #475569;
        }

        .ultra-compact-wrapper td {
            padding: 1px !important; 
        }

        .custom-checkbox { width: 14px; height: 14px; accent-color: ${THEME.goldAccent}; cursor: pointer; transition: 0.1s; }
        .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-main-glass.gold { background: linear-gradient(135deg, rgba(197, 160, 89, 0.9), rgba(151, 115, 50, 1)); color: white; }
        .btn-main-glass.white { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255,255,255,0.8); }
        .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .btn-main-glass:hover { transform: translateY(-3px); filter: brightness(1.1); }
        .badge-glass { background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 4px; font-weight: 700; font-size: 9px; }
      `}</style>

      {(logic.isLoading && logic.allFiltered.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8' }}>⏳ جاري المزامنة...</div>
      ) : (
        <div className="ultra-compact-wrapper cinematic-scroll" style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <RawasiSmartTable 
              data={logic.allFiltered} 
              columns={boqColumns} 
              enablePagination={true}
              currentPage={logic.currentPage}
              totalItems={logic.allFiltered.length}
              rowsPerPage={logic.rowsPerPage}
              onPageChange={logic.setCurrentPage}
              onRowsChange={logic.setRowsPerPage}
              onRowClick={(row:any) => logic.handleEdit(row)}
              rowStyle={(row: any) => ({ backgroundColor: row.project_color })}
          />
        </div>
      )}

      {/* --- النافذة المنبثقة للـ BOQ --- */}
      {mounted && logic.isEditModalOpen && (
          <BOQModal 
            isOpen={logic.isEditModalOpen} 
            onClose={() => logic.setIsEditModalOpen(false)} 
            record={logic.currentRecord} 
            setRecord={logic.setCurrentRecord} 
            onSave={logic.handleSave} 
            isSaving={logic.isSaving}
            projects={logic.projects} 
          />
      )}
      
    </MasterPage>
  );
}