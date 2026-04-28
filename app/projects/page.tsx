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
  // 🎛️ تجهيز بيانات الجداول للـ RawasiSmartTable (تُعرض داخل تفاصيل المشروع)
  // =========================================================================
  
  // 1. جدول المقايسة الشجري (WBS)
  const flatBoqData = useMemo(() => {
    if (!logic.projectDetails?.boq) return [];
    const result: any[] = [];
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

  // 2. 🚀 جدول الخامات المسحوبة الجديد
  const materialsColumns = [
    { header: 'تاريخ السحب', render: (row: any) => row.date || row.created_at?.split('T')[0] || '---' },
    { header: 'اسم الخامة', render: (row: any) => <strong style={{ color: THEME.primary }}>{row.material_name || row.item_name}</strong> },
    { header: 'الكمية المسحوبة', render: (row: any) => <span style={{ fontWeight: 900 }}>{row.quantity} {row.unit}</span> },
    { header: 'سعر الوحدة', render: (row: any) => formatCurrency(row.unit_price) },
    { header: 'إجمالي التكلفة', render: (row: any) => <span style={{ fontWeight: 900, color: THEME.danger }}>{formatCurrency(row.total_price)}</span> },
    { header: 'المورد / ملاحظات', render: (row: any) => <span style={{ fontSize: '11px', color: '#64748b' }}>{row.supplier_name || row.notes || '---'}</span> },
  ];

  // 3. جدول المستخلصات 
  const invoiceColumns = [
    { 
        header: 'المستخلص / البيان', 
        render: (row: any) => (
            <div>
                <strong style={{ color: THEME.primary }}>{row.invoice_number || '---'}</strong><br/>
                <span style={{ fontSize:'11px', color:'#64748b', fontWeight: 800 }}>{row.description || 'مستخلص أعمال'}</span>
            </div>
        ) 
    },
    { 
        header: 'المبلغ المخصص للمشروع', 
        render: (row: any) => (
            <div>
                <span style={{ fontWeight: 900, color: THEME.success, fontSize: '14px' }}>
                    {formatCurrency(row.allocatedAmount || row.net_amount || row.amount)}
                </span>
                {row.allocationNotes && <div style={{ fontSize: '9px', color: THEME.warning, marginTop: '4px' }}>{row.allocationNotes}</div>}
            </div>
        )
    },
    { header: 'الواصل', render: (row: any) => <span style={{ color: THEME.coffeeDark, fontWeight: 700 }}>{formatCurrency(row.paid_amount || 0)}</span> },
    { header: 'الحالة', render: (row: any) => <StatusBadge status={row.status} /> },
  ];

  // =========================================================================
  // 🎛️ أزرار وفلاتر السايد بار 
  // =========================================================================
  const sidebarActions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {logic.selectedProject && (
          <button onClick={() => logic.setSelectedProject(null)} className="btn-main-glass white">
              🔙 العودة لقائمة المشاريع
          </button>
      )}

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

      {!logic.selectedProject && (
          <button onClick={logic.resetFilters} className="btn-main-glass white">
              🔄 إعادة ضبط الفلاتر
          </button>
      )}
    </div>
  );

  const sidebarFilters = (
    <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
            type="text" 
            placeholder="🔍 ابحث عن مشروع..." 
            className="glass-input-field" 
            value={logic.searchQuery} 
            onChange={e => logic.setSearchQuery(e.target.value)} 
        />
        {!logic.selectedProject && (
            <>
                <select className="glass-input-field" value={logic.filterStatus} onChange={e => logic.setFilterStatus(e.target.value)}>
                    <option value="الكل">كل الحالات 🏢</option>
                    <option value="قيد الدراسة">قيد الدراسة</option>
                    <option value="جاري تجهيز الموقع">جاري تجهيز الموقع</option>
                    <option value="قيد التنفيذ">قيد التنفيذ</option>
                    <option value="متوقف مؤقتا">متوقف مؤقتا</option>
                    <option value="متوقف">متوقف نهائياً</option>
                    <option value="منتهي">منتهي</option>
                </select>
                
                <select className="glass-input-field" value={logic.filterStage} onChange={e => logic.setFilterStage(e.target.value)}>
                    <option value="الكل">كل المراحل الإنشائية 🛠️</option>
                    {logic.availableStages?.map((stage: string) => (
                        <option key={stage} value={stage}>{stage}</option>
                    ))}
                </select>
            </>
        )}
    </div>
  );

  return (
    <div className="clean-page">
      <MasterPage title="غرفة عمليات المشاريع المتقدمة" subtitle="إدارة الميزانيات، المقايسات، والتدفقات النقدية للمشروعات">
        
        <RawasiSidebarManager 
            summary={
                <div className="summary-glass-card">
                    <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>{logic.selectedProject ? 'المشروع الحالي 📍' : 'إجمالي المشاريع النشطة 🏗️'}</span>
                    <div className="val" style={{fontSize:'22px', fontWeight:900, color: THEME.primary, marginTop:'5px'}}>
                        {logic.selectedProject ? logic.selectedProject.project_code : logic.projects.length}
                    </div>
                </div>
            }
            actions={sidebarActions}
            customFilters={sidebarFilters}
            watchDeps={[logic.selectedProject, logic.activeTab, logic.searchQuery, logic.projects.length, logic.filterStatus, logic.filterStage]}
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
          
          .projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; }
          .project-card { background: rgba(255,255,255,0.7); backdrop-filter: blur(15px); border-radius: 24px; padding: 25px; border: 1px solid rgba(255,255,255,0.8); transition: 0.3s; cursor: pointer; position: relative; overflow: hidden; }
          .project-card:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0,0,0,0.08); border-color: ${THEME.goldAccent}; }
          .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed rgba(0,0,0,0.05); fontSize: 12px; font-weight: 800; color: #475569; }
          .stat-row:last-child { border-bottom: none; }
          .stage-badge { position: absolute; top: 20px; left: 20px; background: linear-gradient(135deg, ${THEME.goldAccent}, #d97706); color: white; padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 900; box-shadow: 0 4px 10px rgba(217, 119, 6, 0.3); z-index: 2; }
        `}</style>

        {logic.isLoading ? (
             <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: THEME.goldAccent }}>⏳ جاري تحميل بيانات المشاريع...</div>
        ) : !logic.selectedProject ? (
             
             <div className="projects-grid" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                 {logic.projects.map(proj => {
                     let timeProgress = 0;
                     if (proj.start_date && proj.end_date) {
                         const start = new Date(proj.start_date).getTime();
                         const end = new Date(proj.end_date).getTime();
                         const now = new Date().getTime();
                         if (now > end) timeProgress = 100;
                         else if (now > start) timeProgress = Math.round(((now - start) / (end - start)) * 100);
                     }

                     return (
                         <div key={proj.id} className="project-card" onClick={() => logic.loadProjectDetails(proj)}>
                             {proj.current_stage && <div className="stage-badge">⚙️ {proj.current_stage}</div>}

                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                 <span style={{ fontSize: '11px', color: THEME.white, fontWeight: 900, backgroundColor: THEME.coffeeDark, padding: '4px 10px', borderRadius: '8px' }}>
                                     {proj.project_code}
                                 </span>
                                 <StatusBadge status={proj.status || 'قيد الدراسة'} />
                             </div>
                             
                             <h3 style={{ margin: '0 0 5px 0', color: THEME.coffeeDark, fontWeight: 900, fontSize: '18px', paddingLeft: '90px' }}>🏢 {proj.Property}</h3>
                             <p style={{ margin: '0 0 20px 0', fontSize: '11px', color: '#64748b', fontWeight: 800 }}>العميل: {proj.client?.name || '---'}</p>

                             <div style={{ background: 'rgba(255,255,255,0.5)', padding: '15px', borderRadius: '16px', marginBottom: '20px' }}>
                                 <div className="stat-row">
                                     <span>💰 الميزانية المعتمدة:</span>
                                     <span style={{ color: THEME.primary, fontWeight: 900 }}>{formatCurrency(proj.estimated_budget || 0)}</span>
                                 </div>
                                 <div className="stat-row">
                                     <span>👷 تقرير العمالة:</span>
                                     <span style={{ color: THEME.warning, fontWeight: 900 }}>اضغط لعرض التفاصيل 👆</span>
                                 </div>
                             </div>

                             <div>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 900, color: THEME.coffeeDark, marginBottom: '8px' }}>
                                     <span>نسبة الإنجاز الزمني المتوقعة</span>
                                     <span>{timeProgress}%</span>
                                 </div>
                                 <div style={{ height: '8px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                     <div style={{ width: `${timeProgress}%`, height: '100%', backgroundColor: timeProgress === 100 ? THEME.danger : THEME.success, borderRadius: '10px' }}></div>
                                 </div>
                             </div>
                         </div>
                     );
                 })}
                 {logic.projects.length === 0 && (
                     <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: '#94a3b8', fontWeight: 900 }}>
                         لا توجد مشاريع تطابق شروط البحث أو الفلاتر المحددة.
                     </div>
                 )}
             </div>

        ) : logic.isDetailsLoading ? (
             <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: THEME.coffeeDark }}>⏳ جاري سحب الهيكل الهندسي والمالي للعقار...</div>
        ) : (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', background: 'rgba(255,255,255,0.4)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.5)' }}>
                  <h2 style={{ margin: 0, fontWeight: 900, color: THEME.coffeeDark, fontSize: '24px' }}>🏢 {logic.selectedProject.Property}</h2>
                  
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 900, color: '#64748b' }}>تغيير حالة المشروع:</span>
                      <select 
                          value={logic.selectedProject.status || 'قيد الدراسة'}
                          onChange={(e) => logic.updateProjectStatus(e.target.value)}
                          style={{ 
                              padding: '10px 20px', borderRadius: '12px', border: 'none', 
                              fontWeight: 900, backgroundColor: 'white', color: THEME.primary, 
                              boxShadow: '0 5px 15px rgba(0,0,0,0.05)', outline: 'none', cursor: 'pointer'
                          }}
                      >
                          <option value="قيد الدراسة">قيد الدراسة 🟡</option>
                          <option value="جاري تجهيز الموقع">جاري تجهيز الموقع 🟠</option>
                          <option value="قيد التنفيذ">قيد التنفيذ 🟢</option>
                          <option value="متوقف مؤقتا">متوقف مؤقتا ⏸️</option>
                          <option value="متوقف">متوقف نهائياً 🔴</option>
                          <option value="منتهي">منتهي 🔵</option>
                      </select>
                  </div>
              </div>

              {/* 🚀 أزرار التبويبات متضمنة تاب الخامات */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', overflowX: 'auto', paddingBottom: '10px' }}>
                <TabButton active={logic.activeTab === 'overview'} onClick={() => logic.setActiveTab('overview')} text="📊 النظرة العامة و KPIs" />
                <TabButton active={logic.activeTab === 'boq'} onClick={() => logic.setActiveTab('boq')} text="📋 المقايسات (WBS)" />
                <TabButton active={logic.activeTab === 'materials'} onClick={() => logic.setActiveTab('materials')} text="🧱 الخامات المسحوبة" />
                <TabButton active={logic.activeTab === 'financials'} onClick={() => logic.setActiveTab('financials')} text="💰 المستخلصات والماليات" />
                <TabButton active={logic.activeTab === 'qc'} onClick={() => logic.setActiveTab('qc')} text="📸 الجودة والصور" />
              </div>

              {logic.activeTab === 'overview' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                    <KpiCard title="قيمة التعاقد" value={logic.kpis?.totalContract} color={THEME.coffeeDark} />
                    <KpiCard title="الميزانية المعتمدة" value={logic.kpis?.totalEstimatedBudget} color={THEME.goldAccent} />
                    <KpiCard title="إجمالي الصرف الفعلي" value={logic.kpis?.actualCost} color={logic.kpis?.budgetHealth === 'red' ? THEME.danger : THEME.warning} alert={logic.kpis?.budgetHealth === 'red' ? '🚨 تجاوز للميزانية' : '✅ ضمن الميزانية'} />
                    <KpiCard title="المحصل (إيرادات مخصصة)" value={logic.kpis?.totalRevenue} color={THEME.success} />
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

              {logic.activeTab === 'boq' && (
                <div className="glass-card" style={{ padding: '15px' }}>
                  <RawasiSmartTable data={flatBoqData} columns={boqColumns} />
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

              {/* 🚀 تاب الخامات المسحوبة */}
              {logic.activeTab === 'materials' && (
                <div className="glass-card" style={{ padding: '15px' }}>
                  <RawasiSmartTable 
                      data={logic.projectDetails.materials || []}
                      columns={materialsColumns}
                  />
                </div>
              )}

              {logic.activeTab === 'financials' && (
                <div className="glass-card" style={{ padding: '15px' }}>
                  <RawasiSmartTable data={logic.projectDetails.invoices} columns={invoiceColumns} />
                </div>
              )}

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
  if (!status) return null;
  if (status.includes('تجهيز') || status.includes('دراسة')) { color = '#CA8A04'; bg = '#FEF9C3'; }
  else if (status.includes('تنفيذ') || status.includes('جاري') || status.includes('مُعتمد')) { color = '#166534'; bg = '#DCFCE7'; }
  else if (status.includes('مؤقتا')) { color = '#9a3412'; bg = '#ffedd5'; } // برتقالي للمتوقف مؤقتاً
  else if (status.includes('توقف') || status.includes('مرفوض') || status.includes('خطأ')) { color = '#991B1B'; bg = '#FEE2E2'; } // أحمر للمتوقف نهائياً
  else if (status.includes('منتهي') || status.includes('مكتمل')) { color = '#1e40af'; bg = '#dbeafe'; }
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