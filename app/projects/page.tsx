"use client";
import React from 'react';
import { useProjectsLogic } from './projects_logic';

const THEME = { 
  sandLight: '#F4F1EE', sandDark: '#E6D5C3', 
  coffeeMain: '#8C6A5D', coffeeDark: '#2D221E', goldAccent: '#C5A059',
  success: '#166534', danger: '#991B1B', warning: '#CA8A04', white: '#FFFFFF'
};

export default function AdvancedProjectsPage() {
  const logic = useProjectsLogic();

  if (logic.isLoading) return <div style={styles.loader}>⏳ جاري مزامنة بيانات المشاريع...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', direction: 'rtl', fontFamily: 'Cairo, sans-serif', backgroundColor: THEME.sandLight }}>
      
      {/* 🟢 الشريط العلوي */}
      <header style={{ backgroundColor: THEME.coffeeDark, padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `3px solid ${THEME.goldAccent}`, zIndex: 10 }}>
        <div>
          <h1 style={{ color: THEME.goldAccent, margin: 0, fontSize: '22px', fontWeight: 900 }}>🏢 غرفة عمليات المشاريع المتقدمة</h1>
        </div>
        <button onClick={() => logic.setIsFilterOpen(!logic.isFilterOpen)} style={styles.filterBtn}>
          {logic.isFilterOpen ? '✖ إخفاء الفلاتر' : '🔍 بحث وتصفية متقدمة'}
        </button>
      </header>

      {/* 🟢 السلايد العلوي المنسدل */}
      <div style={{...styles.filterDrawer, maxHeight: logic.isFilterOpen ? '300px' : '0px', padding: logic.isFilterOpen ? '20px 30px' : '0 30px', boxShadow: logic.isFilterOpen ? '0 10px 20px rgba(0,0,0,0.05)' : 'none'}}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
          <div><label style={styles.filterLabel}>البحث الحر</label><input type="text" placeholder="اسم العقار..." style={styles.input} value={logic.searchQuery} onChange={e => logic.setSearchQuery(e.target.value)} /></div>
          <div><label style={styles.filterLabel}>العميل</label><select style={styles.input} value={logic.filterClient} onChange={e => logic.setFilterClient(e.target.value)}><option value="الكل">الكل</option>{logic.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <button onClick={logic.resetFilters} style={{ backgroundColor: THEME.sandDark, color: THEME.coffeeDark, padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}>🔄 إعادة ضبط</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* العمود الأيمن: القائمة */}
        <aside style={{ width: '350px', backgroundColor: THEME.white, borderLeft: `2px solid ${THEME.sandDark}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '15px 25px', backgroundColor: '#fafafa', borderBottom: `1px solid ${THEME.sandDark}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: THEME.coffeeMain }}>نتائج البحث:</span>
            <span style={{ backgroundColor: THEME.goldAccent, color: THEME.white, padding: '2px 10px', borderRadius: '15px', fontWeight: 900 }}>{logic.projects.length}</span>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {logic.projects.map(proj => (
              <div key={proj.id} onClick={() => logic.loadProjectDetails(proj)} style={{ ...styles.projectListItem, backgroundColor: logic.selectedProject?.id === proj.id ? THEME.sandLight : 'transparent', borderColor: logic.selectedProject?.id === proj.id ? THEME.goldAccent : '#eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: THEME.goldAccent, fontWeight: 900, backgroundColor: THEME.coffeeDark, padding: '2px 8px', borderRadius: '4px' }}>{proj.project_code}</span>
                  <StatusBadge status={proj.status || 'قيد الدراسة'} />
                </div>
                <h4 style={{ color: THEME.coffeeDark, margin: '0 0 5px 0', fontWeight: 800 }}>{proj.Property}</h4>
              </div>
            ))}
          </div>
        </aside>

        {/* العمود الأيسر: لوحة التحكم المركزية */}
        <main style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
          {!logic.selectedProject ? (
            <div style={styles.emptyState}>👈 يرجى اختيار مشروع من القائمة الجانبية.</div>
          ) : logic.isDetailsLoading ? (
            <div style={styles.loader}>جاري تحميل الهيكل الهندسي والمالي للعقار...</div>
          ) : (
            <div>
              <header style={{ marginBottom: '30px', backgroundColor: THEME.white, padding: '30px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 10px 0' }}>
                  <h1 style={{ color: THEME.coffeeDark, fontSize: '32px', margin: 0, fontWeight: 900 }}>{logic.selectedProject.Property}</h1>
                  <button onClick={logic.runDiagnostics} style={{ backgroundColor: THEME.danger, color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🔍 تشغيل فحص الداتا بيز
                  </button>
                </div>
              </header>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                <TabButton active={logic.activeTab === 'overview'} onClick={() => logic.setActiveTab('overview')} text="📊 النظرة العامة و KPIs" />
                <TabButton active={logic.activeTab === 'boq'} onClick={() => logic.setActiveTab('boq')} text="📋 المقايسات (BOQ)" />
                <TabButton active={logic.activeTab === 'financials'} onClick={() => logic.setActiveTab('financials')} text="💰 المستخلصات والماليات" />
                <TabButton active={logic.activeTab === 'qc'} onClick={() => logic.setActiveTab('qc')} text="📸 الجودة والصور" />
              </div>

              {/* 📊 التبويب 1: النظرة العامة والمؤشرات */}
              {logic.activeTab === 'overview' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                    <KpiCard title="قيمة التعاقد" value={logic.kpis?.totalContract} color={THEME.coffeeDark} />
                    <KpiCard title="الميزانية المعتمدة" value={logic.kpis?.totalEstimatedBudget} color={THEME.goldAccent} />
                    <KpiCard 
                      title="إجمالي الصرف الفعلي" 
                      value={logic.kpis?.actualCost} 
                      color={logic.kpis?.budgetHealth === 'red' ? THEME.danger : logic.kpis?.budgetHealth === 'yellow' ? THEME.warning : THEME.success} 
                      alert={logic.kpis?.budgetHealth === 'red' ? '🚨 تجاوز خطير للميزانية' : logic.kpis?.budgetHealth === 'yellow' ? '⚠️ تحذير اقتراب للميزانية' : '✅ ضمن الميزانية'}
                    />
                    <KpiCard title="المحصل (إيرادات)" value={logic.kpis?.totalRevenue} color={THEME.success} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' }}>
                    <div style={styles.card}>
                      <h3 style={styles.cardTitle}>👷 تقرير العمالة الميدانية</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div style={styles.laborStatItem}><span>عمالة اليوم</span><strong>{logic.projectDetails.laborStats?.todayWorkers || 0}</strong></div>
                        <div style={styles.laborStatItem}><span>تكلفة اليوم</span><strong style={{color: THEME.danger}}>{logic.projectDetails.laborStats?.todayCost?.toLocaleString() || 0} ج.م</strong></div>
                        <div style={styles.laborStatItem}><span>إجمالي العمالة السابقة</span><strong>{logic.projectDetails.laborStats?.totalWorkersToDate || 0}</strong></div>
                        <div style={styles.laborStatItem}><span>إجمالي الأجور</span><strong>{logic.projectDetails.laborStats?.totalLaborCost?.toLocaleString() || 0} ج.م</strong></div>
                      </div>
                      <div style={{marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px'}}>
                         <span style={{fontSize: '12px', fontWeight: 800}}>🔨 البنود الجارية حالياً:</span>
                         <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                            {logic.projectDetails.laborStats?.activeTasks.map((task:any) => <span key={task} style={styles.taskBadge}>{task}</span>)}
                         </div>
                      </div>
                    </div>

                    <div style={styles.card}>
                      <h3 style={styles.cardTitle}>📝 توصيات الإدارة والعقار</h3>
                      <textarea 
                        key={logic.selectedProject.id}
                        style={{ ...styles.input, height: '120px', resize: 'none', backgroundColor: '#fffbeB', border: '1px solid #FDE68A' }} 
                        placeholder="أدخل التوصيات والملاحظات الهامة..."
                        defaultValue={logic.selectedProject.notes || ''}
                        onBlur={(e) => logic.updateRecommendations(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                    <div style={styles.card}>
                      <h3 style={styles.cardTitle}>📈 مؤشر الإنجاز والزمن (S-Curve)</h3>
                      <ProgressBar label="الوقت المنقضي من مدة المشروع" percentage={logic.kpis?.timeProgress} color={THEME.coffeeMain} />
                      <br/>
                      <ProgressBar label="الإنجاز المالي والتحصيل" percentage={logic.kpis?.financialProgress} color={THEME.goldAccent} />
                      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: logic.kpis?.timeStatus.includes('متأخر') ? '#FEE2E2' : '#DCFCE7', borderRadius: '8px', fontWeight: 800, textAlign: 'center', color: logic.kpis?.timeStatus.includes('متأخر') ? THEME.danger : THEME.success }}>
                        حالة الجدول الزمني: {logic.kpis?.timeStatus}
                      </div>
                    </div>
                    
                    <div style={styles.card}>
                      <h3 style={styles.cardTitle}>💸 التدفق النقدي المتبقي (Cash Flow)</h3>
                      <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <span style={{ fontSize: '14px', color: '#555', fontWeight: 700 }}>لإتمام بنود المقايسة المتبقية، الموقع بحاجة إلى توفير سيولة نقدية تُقدر بـ:</span>
                        <div style={{ fontSize: '32px', fontWeight: 900, color: logic.kpis?.requiredCashflow > 0 ? THEME.danger : THEME.success, margin: '15px 0' }}>
                           {Math.abs(logic.kpis?.requiredCashflow || 0).toLocaleString()} <span style={{fontSize:'16px'}}>ج.م</span>
                        </div>
                        {logic.kpis?.requiredCashflow < 0 && <span style={{ color: THEME.success, fontWeight: 900 }}>✅ تم تحقيق وفر في الميزانية المعتمدة!</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 📋 التبويب 2: المقايسات */}
              {logic.activeTab === 'boq' && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>بنود أعمال المقايسة وموازنة العقار</h3>
                  <table style={styles.table}>
                    <thead><tr><th>البند</th><th>الوحدة</th><th>الكمية</th><th>السعر المتعاقد</th><th>التكلفة العمالية التقديرية</th></tr></thead>
                    <tbody>
                      {logic.projectDetails.boq.map((item:any) => (
                        <tr key={item.id}><td>{item.work_item}</td><td>{item.unit}</td><td>{item.contract_quantity}</td><td>{item.unit_contract_price}</td><td>{item.estimated_labor_cost}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 💰 التبويب 3: المستخلصات والماليات (مضاف جديد) */}
              {logic.activeTab === 'financials' && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>سجل المستخلصات والمطالبات المالية</h3>
                  <table style={styles.table}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${THEME.sandDark}` }}>
                        <th style={styles.th}>المستخلص</th>
                        <th style={styles.th}>النوع</th>
                        <th style={styles.th}>الصافي المستحق</th>
                        <th style={styles.th}>ضمان أعمال</th>
                        <th style={styles.th}>الواصل</th>
                        <th style={styles.th}>المتبقي</th>
                        <th style={styles.th}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logic.projectDetails.invoices.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>لا توجد مستخلصات مسجلة لهذا المشروع</td></tr>
                      ) : (
                        logic.projectDetails.invoices.map((inv:any) => (
                          <tr key={inv.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={styles.td}>
                              <strong>{inv.invoice_number || '---'}</strong><br/>
                              <span style={{fontSize:'11px', color:'#888'}}>{inv.date}</span>
                            </td>
                            <td style={styles.td}>{inv.type}</td>
                            <td style={{ ...styles.td, fontWeight: 900, color: THEME.coffeeDark }}>{Number(inv.net_amount || inv.amount).toLocaleString()}</td>
                            <td style={{ ...styles.td, color: THEME.warning }}>{Number(inv.retention_amount || 0).toLocaleString()}</td>
                            <td style={{ ...styles.td, color: THEME.success }}>{Number(inv.paid_amount || 0).toLocaleString()}</td>
                            <td style={{ ...styles.td, color: THEME.danger, fontWeight: 900 }}>{Number(inv.remaining_amount || 0).toLocaleString()}</td>
                            <td style={styles.td}><StatusBadge status={inv.status} /></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 📸 التبويب 4: الجودة والصور الميدانية */}
              {logic.activeTab === 'qc' && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>📸 ألبوم صور الإنجاز وطلبات الاستلام</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                    {logic.projectDetails.inspections.map((insp:any) => (
                      <div key={insp.id} style={{ border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
                        <img src={insp.photo} alt={insp.element} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                        <div style={{ padding: '15px' }}>
                          <h4 style={{ margin: '0 0 5px 0', color: THEME.coffeeDark }}>{insp.element}</h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#555', marginBottom: '10px' }}>
                            <span>المهندس: {insp.engineer}</span><span>{insp.date}</span>
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
        </main>
      </div>
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
    <div style={{ backgroundColor: THEME.white, padding: '25px', borderRadius: '15px', borderBottom: `5px solid ${color}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative' }}>
      <span style={{ display: 'block', fontSize: '13px', color: THEME.coffeeMain, fontWeight: 800, marginBottom: '10px' }}>{title}</span>
      <strong style={{ fontSize: '24px', color: color, fontWeight: 900 }}>{Number(value || 0).toLocaleString()} <span style={{fontSize:'14px'}}>ج.م</span></strong>
      {alert && <div style={{ fontSize: '11px', color: color, marginTop: '8px', fontWeight: 800, backgroundColor: '#f9f9f9', padding: '4px', borderRadius: '4px' }}>{alert}</div>}
    </div>
  );
}

function ProgressBar({ label, percentage, color }: any) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: THEME.coffeeDark }}>
        <span>{label}</span><span>{percentage}%</span>
      </div>
      <div style={{ height: '12px', backgroundColor: THEME.sandLight, borderRadius: '20px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%`, height: '100%', backgroundColor: color, borderRadius: '20px', transition: 'width 1s ease-in-out' }}></div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, text }: any) {
  return <button onClick={onClick} style={{ padding: '12px 25px', borderRadius: '10px', border: 'none', fontWeight: 900, cursor: 'pointer', transition: '0.2s', backgroundColor: active ? THEME.coffeeDark : THEME.white, color: active ? THEME.goldAccent : THEME.coffeeMain, boxShadow: active ? '0 10px 20px rgba(45,34,30,0.15)' : 'none' }}>{text}</button>;
}

const styles: Record<string, React.CSSProperties> = {
  loader: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', fontSize: '20px', color: THEME.goldAccent, fontWeight: 900 },
  emptyState: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', fontSize: '24px', color: '#bbb', fontWeight: 900 },
  projectListItem: { padding: '15px', borderBottom: '1px solid #eee', borderRight: '4px solid transparent', cursor: 'pointer', transition: '0.2s', borderRadius: '8px', margin: '0 5px 10px 5px' },
  card: { backgroundColor: THEME.white, padding: '25px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' },
  cardTitle: { color: THEME.coffeeDark, margin: '0 0 20px 0', fontSize: '18px', fontWeight: 900, borderBottom: `2px solid ${THEME.sandLight}`, paddingBottom: '10px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'right' },
  filterLabel: { display: 'block', fontSize: '12px', fontWeight: 800, color: THEME.coffeeMain, marginBottom: '6px' },
  input: { width: '100%', padding: '10px 15px', borderRadius: '8px', border: `1px solid ${THEME.sandDark}`, fontSize: '14px', outline: 'none', backgroundColor: '#fafafa' },
  laborStatItem: { display: 'flex', flexDirection: 'column', backgroundColor: '#F9FAFB', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB' },
  taskBadge: { backgroundColor: THEME.goldAccent, color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 900 },
  filterBtn: { backgroundColor: 'transparent', color: THEME.white, border: `1px solid ${THEME.goldAccent}`, padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, transition: '0.3s' },
  filterDrawer: { backgroundColor: THEME.white, overflow: 'hidden', transition: 'max-height 0.4s ease-in-out, padding 0.4s ease-in-out', zIndex: 5 }
};