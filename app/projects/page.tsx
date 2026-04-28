"use client";
import React, { useMemo } from 'react';
import { useProjectsLogic } from './projects_logic';
import BoqFormModal from './BoqFormModal';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import { formatCurrency } from '@/lib/helpers';
import { THEME } from '@/lib/theme';

export default function AdvancedProjectsPage() {
  const logic = useProjectsLogic();

  // =========================================================================
  // 🎛️ تجهيز بيانات الجداول للـ RawasiSmartTable
  // =========================================================================
  
  // 1. جدول المقايسة الشجري (WBS)
  const flatBoqData = useMemo(() => {
    if (!logic.projectDetails?.boq) return [];
    const result: any[] = [];
    // نجيب الرئيسي الأول ونحط تحته الفروع بتاعته
    logic.projectDetails.boq.filter((i: any) => i.item_type === 'رئيسي').forEach((main: any) => {
        result.push(main);
        const subs = logic.projectDetails.boq.filter((sub: any) => sub.parent_id === main.id);
        result.push(...subs);
    });
    return result;
  }, [logic.projectDetails.boq]);

  const boqColumns = [
    { 
        header: 'البند / المرحلة', 
        accessor: 'work_item',
        render: (row: any) => {
            if (row.item_type === 'رئيسي') return <span style={{ fontWeight: 900, color: THEME.coffeeDark, fontSize: '15px' }}>📂 {row.work_item}</span>;
            return <span style={{ paddingRight: '25px', color: '#475569', fontWeight: 700 }}>↪️ {row.work_item}</span>;
        }
    },
    { header: 'الكمية', render: (row: any) => <span style={{ fontWeight: 900 }}>{row.contract_quantity} {row.unit}</span> },
    { header: 'سعر الوحدة', render: (row: any) => <span style={{ fontWeight: 900 }}>{formatCurrency(row.unit_contract_price)}</span> },
    { header: 'عمالة تقديري', render: (row: any) => <span style={{ fontWeight: 900, color: THEME.warning }}>{formatCurrency(row.estimated_labor_cost)}</span> },
    { header: 'تشغيل/خامات تقديري', render: (row: any) => <span style={{ fontWeight: 900, color: THEME.success }}>{formatCurrency(row.estimated_operational_cost)}</span> },
  ];

  // 2. جدول المستخلصات والماليات
  const invoiceColumns = [
    { 
        header: 'المستخلص', 
        render: (row: any) => (
            <div>
                <strong>{row.invoice_number || '---'}</strong><br/>
                <span style={{ fontSize:'11px', color:'#888' }}>{row.date}</span>
            </div>
        ) 
    },
    { header: 'النوع', accessor: 'type' },
    { header: 'الصافي المستحق', render: (row: any) => <span style={{ fontWeight: 900, color: THEME.coffeeDark }}>{formatCurrency(row.net_amount || row.amount)}</span> },
    { header: 'ضمان أعمال', render: (row: any) => <span style={{ color: THEME.warning, fontWeight: 700 }}>{formatCurrency(row.retention_amount || 0)}</span> },
    { header: 'الواصل', render: (row: any) => <span style={{ color: THEME.success, fontWeight: 700 }}>{formatCurrency(row.paid_amount || 0)}</span> },
    { header: 'المتبقي', render: (row: any) => <span style={{ color: THEME.danger, fontWeight: 900 }}>{formatCurrency(row.remaining_amount || 0)}</span> },
    { header: 'الحالة', render: (row: any) => <StatusBadge status={row.status} /> },
  ];

  // =========================================================================
  // 🎛️ أزرار وفلاتر السايد بار 
  // =========================================================================
  const sidebarActions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {logic.selectedProject && logic.activeTab === 'boq' && (
          <button onClick={() => {
              logic.setCurrentBoqRecord({ item_type: 'رئيسي', contract_quantity: 1, unit_contract_price: 0, estimated_labor_cost: 0, estimated_operational_cost: 0 });
              logic.setIsBoqModalOpen(true);
          }} className="btn-main-glass gold">
              ➕ إضافة بند للمقايسة (WBS)
          </button>
      )}

      {logic.selectedProject && (
          <button onClick={logic.runDiagnostics} className="btn-main-glass red">
              🔍 تشغيل فحص الداتا بيز
          </button>
      )}

      <button onClick={logic.resetFilters} className="btn-main-glass white">
          🔄 إعادة ضبط الفلاتر
      </button>
    </div>
  );

  const sidebarFilters = (
    <div style={{ marginTop: '15px' }}>
        <input 
            type="text" 
            placeholder="🔍 ابحث في المشاريع..." 
            className="glass-input-field" 
            value={logic.searchQuery} 
            onChange={e => logic.setSearchQuery(e.target.value)} 
            style={{ marginBottom: '15px' }}
        />
        
        <div style={{ fontSize: '11px', fontWeight: 900, color: THEME.coffeeMain, marginBottom: '10px' }}>
            قائمة المشاريع ({logic.projects.length})
        </div>

        <div className="cinematic-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '5px' }}>
            {logic.projects.map(proj => (
                <div 
                    key={proj.id} 
                    onClick={() => logic.loadProjectDetails(proj)} 
                    style={{ 
                        padding: '15px', borderRadius: '12px', cursor: 'pointer', transition: '0.3s',
                        background: logic.selectedProject?.id === proj.id ? 'rgba(197, 160, 89, 0.1)' : 'rgba(255,255,255,0.5)',
                        border: `1px solid ${logic.selectedProject?.id === proj.id ? THEME.goldAccent : 'rgba(0,0,0,0.05)'}`
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '10px', color: THEME.white, fontWeight: 900, backgroundColor: THEME.coffeeDark, padding: '2px 8px', borderRadius: '6px' }}>
                            {proj.project_code}
                        </span>
                        <StatusBadge status={proj.status || 'قيد الدراسة'} />
                    </div>
                    <h4 style={{ color: THEME.coffeeDark, margin: '0', fontSize: '13px', fontWeight: 900 }}>{proj.Property}</h4>
                </div>
            ))}
        </div>
    </div>
  );

  return (
    <div className="clean-page">
      <MasterPage title="غرفة عمليات المشاريع المتقدمة" subtitle="إدارة الميزانيات، المقايسات، والتدفقات النقدية للمشروعات">
        
        <RawasiSidebarManager 
            summary={
                <div className="summary-glass-card">
                    <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي المشاريع النشطة 🏗️</span>
                    <div className="val" style={{fontSize:'24px', fontWeight:900, color: THEME.primary, marginTop:'5px'}}>{logic.projects.length}</div>
                </div>
            }
            actions={sidebarActions}
            customFilters={sidebarFilters}
            watchDeps={[logic.selectedProject, logic.activeTab, logic.searchQuery, logic.projects.length]}
        />

        <style>{`
          .glass-input-field { width: 100%; padding: 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.65); border: 1px solid rgba(255, 255, 255, 0.8); outline: none; font-weight: 700; color: #1e293b; transition: 0.3s; }
          .glass-input-field:focus { background: #ffffff; border-color: ${THEME.goldAccent}; box-shadow: 0 0 0 4px rgba(197, 160, 89, 0.15); }
          .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
          .btn-main-glass.gold { background: linear-gradient(135deg, rgba(197, 160, 89, 0.9), rgba(151, 115, 50, 1)); color: white; }
          .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
          .btn-main-glass.white { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255,255,255,0.8); }
          .btn-main-glass:hover { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
          .summary-glass-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); padding: 20px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 25px; }
          .glass-card { background: rgba(255,255,255,0.6); backdrop-filter: blur(20px); padding: 25px; borderRadius: 24px; border: 1px solid rgba(255,255,255,0.8); boxShadow: 0 10px 30px rgba(0,0,0,0.03); margin-bottom: 25px; }
          .labor-stat-item { display: flex; flex-direction: column; background: rgba(255,255,255,0.5); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.7); }
        `}</style>

        {logic.isLoading ? (
             <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: THEME.goldAccent }}>⏳ جاري تحميل لوحة القيادة...</div>
        ) : !logic.selectedProject ? (
             <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontSize: '20px', color: '#94a3b8', fontWeight: 900 }}>
                 👈 يرجى اختيار مشروع من القائمة الجانبية لعرض لوحة التحكم.
             </div>
        ) : logic.isDetailsLoading ? (
             <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: THEME.coffeeDark }}>⏳ جاري سحب الهيكل الهندسي والمالي للعقار...</div>
        ) : (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', background: 'rgba(255,255,255,0.4)', padding: '20px', borderRadius: '20px' }}>
                  <h2 style={{ margin: 0, fontWeight: 900, color: THEME.coffeeDark, fontSize: '28px' }}>🏢 {logic.selectedProject.Property}</h2>
              </div>

              {/* أزرار التبويبات الزجاجية */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', overflowX: 'auto', paddingBottom: '10px' }}>
                <TabButton active={logic.activeTab === 'overview'} onClick={() => logic.setActiveTab('overview')} text="📊 النظرة العامة و KPIs" />
                <TabButton active={logic.activeTab === 'boq'} onClick={() => logic.setActiveTab('boq')} text="📋 المقايسات (WBS)" />
                <TabButton active={logic.activeTab === 'financials'} onClick={() => logic.setActiveTab('financials')} text="💰 المستخلصات والماليات" />
                <TabButton active={logic.activeTab === 'qc'} onClick={() => logic.setActiveTab('qc')} text="📸 الجودة والصور" />
              </div>

              {/* 📊 التبويب 1: النظرة العامة والمؤشرات */}
              {logic.activeTab === 'overview' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                    <KpiCard title="قيمة التعاقد" value={logic.kpis?.totalContract} color={THEME.coffeeDark} />
                    <KpiCard title="الميزانية المعتمدة" value={logic.kpis?.totalEstimatedBudget} color={THEME.goldAccent} />
                    <KpiCard title="إجمالي الصرف الفعلي" value={logic.kpis?.actualCost} color={logic.kpis?.budgetHealth === 'red' ? THEME.danger : THEME.warning} alert={logic.kpis?.budgetHealth === 'red' ? '🚨 تجاوز للميزانية' : '✅ ضمن الميزانية'} />
                    <KpiCard title="المحصل (إيرادات)" value={logic.kpis?.totalRevenue} color={THEME.success} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' }}>
                    <div className="glass-card">
                      <h3 style={{ margin: '0 0 20px 0', color: THEME.coffeeDark, fontWeight: 900 }}>👷 تقرير العمالة الميدانية</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="labor-stat-item"><span style={{fontSize:'11px', color:'#64748b', fontWeight:800}}>عمالة اليوم</span><strong style={{fontSize:'18px'}}>{logic.projectDetails.laborStats?.todayWorkers || 0}</strong></div>
                        <div className="labor-stat-item"><span style={{fontSize:'11px', color:'#64748b', fontWeight:800}}>تكلفة اليوم</span><strong style={{fontSize:'18px', color: THEME.danger}}>{logic.projectDetails.laborStats?.todayCost?.toLocaleString() || 0} ج.م</strong></div>
                        <div className="labor-stat-item"><span style={{fontSize:'11px', color:'#64748b', fontWeight:800}}>إجمالي العمالة السابقة</span><strong style={{fontSize:'18px'}}>{logic.projectDetails.laborStats?.totalWorkersToDate || 0}</strong></div>
                        <div className="labor-stat-item"><span style={{fontSize:'11px', color:'#64748b', fontWeight:800}}>إجمالي الأجور</span><strong style={{fontSize:'18px'}}>{logic.projectDetails.laborStats?.totalLaborCost?.toLocaleString() || 0} ج.م</strong></div>
                      </div>
                    </div>

                    <div className="glass-card">
                      <h3 style={{ margin: '0 0 20px 0', color: THEME.coffeeDark, fontWeight: 900 }}>📈 مؤشر الإنجاز والزمن</h3>
                      <ProgressBar label="الوقت المنقضي من مدة المشروع" percentage={logic.kpis?.timeProgress} color={THEME.coffeeMain} />
                      <div style={{height:'15px'}}/>
                      <ProgressBar label="الإنجاز المالي والتحصيل" percentage={logic.kpis?.financialProgress} color={THEME.goldAccent} />
                      <div style={{ marginTop: '20px', padding: '12px', backgroundColor: logic.kpis?.timeStatus.includes('متأخر') ? '#FEE2E2' : '#DCFCE7', borderRadius: '12px', fontWeight: 900, textAlign: 'center', color: logic.kpis?.timeStatus.includes('متأخر') ? THEME.danger : THEME.success }}>
                        حالة الجدول الزمني: {logic.kpis?.timeStatus}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 📋 التبويب 2: المقايسات (WBS) */}
              {logic.activeTab === 'boq' && (
                <div className="glass-card" style={{ padding: '15px' }}>
                  <RawasiSmartTable 
                      data={flatBoqData}
                      columns={boqColumns}
                  />
                  {logic.isBoqModalOpen && (
                      <BoqFormModal 
                          isOpen={logic.isBoqModalOpen}
                          onClose={() => logic.setIsBoqModalOpen(false)}
                          record={logic.currentBoqRecord}
                          setRecord={logic.setCurrentBoqRecord}
                          onSave={logic.handleSaveBoq}
                          projectBoq={logic.projectDetails.boq}
                      />
                  )}
                </div>
              )}

              {/* 💰 التبويب 3: المستخلصات والماليات */}
              {logic.activeTab === 'financials' && (
                <div className="glass-card" style={{ padding: '15px' }}>
                  <RawasiSmartTable 
                      data={logic.projectDetails.invoices}
                      columns={invoiceColumns}
                  />
                </div>
              )}

              {/* 📸 التبويب 4: الجودة والصور */}
              {logic.activeTab === 'qc' && (
                <div className="glass-card">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                    {logic.projectDetails.inspections.map((insp:any) => (
                      <div key={insp.id} style={{ border: '1px solid #eee', borderRadius: '16px', overflow: 'hidden', background: 'white' }}>
                        <img src={insp.photo} alt={insp.element} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                        <div style={{ padding: '15px' }}>
                          <h4 style={{ margin: '0 0 5px 0', color: THEME.coffeeDark, fontWeight: 900 }}>{insp.element}</h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '10px', fontWeight: 700 }}>
                            <span>{insp.engineer}</span><span>{insp.date}</span>
                          </div>
                          <StatusBadge status={insp.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
      </MasterPage>
    </div>
  );
}

// ==========================================
// 🧩 المكونات المساعدة
// ==========================================
function StatusBadge({ status }: { status: string }) {
  let color = '#555'; let bg = '#eee';
  if (status.includes('جاري') || status.includes('مقبول') || status.includes('مُعتمد')) { color = '#166534'; bg = '#DCFCE7'; }
  else if (status.includes('دراسة') || status.includes('مراجعة') || status.includes('قيد')) { color = '#CA8A04'; bg = '#FEF9C3'; }
  else if (status.includes('توقف') || status.includes('مرفوض') || status.includes('خطأ')) { color = '#991B1B'; bg = '#FEE2E2'; }
  return <span style={{ backgroundColor: bg, color: color, padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 900 }}>{status}</span>;
}

function KpiCard({ title, value, color, alert }: any) {
  return (
    <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', padding: '25px', borderRadius: '20px', borderBottom: `4px solid ${color}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative' }}>
      <span style={{ display: 'block', fontSize: '13px', color: '#64748b', fontWeight: 800, marginBottom: '10px' }}>{title}</span>
      <strong style={{ fontSize: '26px', color: color, fontWeight: 900 }}>{Number(value || 0).toLocaleString()} <span style={{fontSize:'14px'}}>ج.م</span></strong>
      {alert && <div style={{ fontSize: '11px', color: color, marginTop: '8px', fontWeight: 800, backgroundColor: 'rgba(255,255,255,0.8)', padding: '6px', borderRadius: '8px' }}>{alert}</div>}
    </div>
  );
}

function ProgressBar({ label, percentage, color }: any) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 800, color: THEME.coffeeDark }}>
        <span>{label}</span><span>{percentage}%</span>
      </div>
      <div style={{ height: '14px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '20px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%`, height: '100%', backgroundColor: color, borderRadius: '20px', transition: 'width 1s ease-in-out' }}></div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, text }: any) {
  return (
      <button onClick={onClick} style={{ 
          padding: '12px 25px', borderRadius: '14px', border: 'none', fontWeight: 900, cursor: 'pointer', transition: '0.3s', 
          backgroundColor: active ? THEME.coffeeDark : 'rgba(255,255,255,0.6)', 
          color: active ? THEME.goldAccent : THEME.coffeeMain, 
          boxShadow: active ? '0 10px 20px rgba(45,34,30,0.15)' : 'none',
          whiteSpace: 'nowrap'
      }}>
          {text}
      </button>
  );
}