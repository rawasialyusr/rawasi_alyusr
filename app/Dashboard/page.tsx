"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MasterPage from '@/components/MasterPage';
import LoadingScreen from '@/components/LoadingScreen';
import { THEME } from '@/lib/theme';
import { useDashboardLogic } from './dashboard_logic';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = [THEME.goldAccent, THEME.primary, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#d946ef'];

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const logic = useDashboardLogic();
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const moduleLabels: Record<string, string> = {
    expenses: 'المصروفات العامة',
    invoices: 'مستخلصات العملاء',
    labor: 'يوميات العمالة',
    payments: 'سندات الصرف',
    receipts: 'سندات القبض',
    advances: 'سلف الموظفين',
    deductions: 'الجزاءات والمخالفات',
    subClaims: 'مقاولي الباطن',
    materialReceipts: 'توريد الخامات'
  };

  return (
    <MasterPage title="لوحة القيادة المركزية" subtitle="مراقبة الأداء التشغيلي والمالي - رواسي اليسر">
      
      {logic.isLoading ? (
        <LoadingScreen message="جاري معالجة البيانات المالية..." subMessage="نقوم الآن بتجميع وتحليل البيانات من جميع الأقسام..." fullScreen={false} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px', animation: 'fadeUp 0.6s ease-out', paddingBottom: '50px' }}>
          
          {/* 🏛️ القسم الأول: المركز المالي */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
              <h3 className="section-title">🏛️ الموقف المالي للمؤسسة</h3>
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#64748b', background: '#f1f5f9', padding: '6px 15px', borderRadius: '20px' }}>تحديث لحظي 🟢</span>
            </div>
            <div className="premium-grid-3">
              <div className="premium-card" style={{ borderBottom: `4px solid #10b981` }}>
                <div className="card-header-flex">
                  <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #10b98120, #05966920)', color: '#10b981' }}>🏦</div>
                  <span className="trend-badge positive">أصول وممتلكات</span>
                </div>
                <p className="card-subtitle">إجمالي الأصول</p>
                <h2 className="card-value gradient-text-green">{logic.formatCurrency(logic.stats?.totals?.totalAssets || 0)}</h2>
              </div>

              <div className="premium-card" style={{ borderBottom: `4px solid #ef4444` }}>
                <div className="card-header-flex">
                  <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #ef444420, #dc262620)', color: '#ef4444' }}>⚖️</div>
                  <span className="trend-badge negative">خصوم متداولة</span>
                </div>
                <p className="card-subtitle">إجمالي الالتزامات</p>
                <h2 className="card-value gradient-text-red">{logic.formatCurrency(logic.stats?.totals?.totalLiabilities || 0)}</h2>
              </div>

              <div className="premium-card" style={{ borderBottom: `4px solid ${THEME.goldAccent}`, background: `linear-gradient(135deg, #ffffff, #fdfbf7)` }}>
                <div className="card-header-flex">
                  <div className="icon-wrapper" style={{ background: `linear-gradient(135deg, ${THEME.goldAccent}20, #b4530920)`, color: THEME.goldAccent }}>💼</div>
                  <span className="trend-badge neutral">رأس المال العامل</span>
                </div>
                <p className="card-subtitle">صافي القيمة التقديرية</p>
                <h2 className="card-value gradient-text-gold">{logic.formatCurrency((logic.stats?.totals?.totalAssets || 0) - (logic.stats?.totals?.totalLiabilities || 0))}</h2>
              </div>
            </div>
          </div>

          {/* 🚀 القسم الجديد: حالة المشاريع والعقارات (الفلل) */}
          <div>
            <h3 className="section-title">🏢 حالة المشاريع والعقارات</h3>
            <div className="premium-grid-4">
              {logic.stats?.projectsStatusData?.map((statusObj: any, index: number) => {
                // تحديد لون الأيقونة والاسم ديناميكياً حسب الحالة
                let colorClass = 'blue';
                let icon = '🏗️';
                if (statusObj.name.includes('مكتمل')) { colorClass = 'green'; icon = '✅'; }
                else if (statusObj.name.includes('متوقف')) { colorClass = 'red'; icon = '🛑'; }
                else if (statusObj.name.includes('دراسة') || statusObj.name.includes('تجهيز')) { colorClass = 'orange'; icon = '⏳'; }

                return (
                  <div key={index} className="mini-stat-card">
                    <div className={`mini-icon ${colorClass}`}>{icon}</div>
                    <div>
                      <p>{statusObj.name}</p>
                      <h3>{statusObj.value} <span className="currency">مشروع/فيلا</span></h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 📊 القسم الثاني: الرسوم البيانية الاستراتيجية */}
          <div className="premium-grid-2">
            
            {/* 1. التدفق النقدي */}
            <div className="premium-card">
              <h3 className="section-title" style={{ fontSize: '18px' }}>📉 التدفق النقدي والسيولة (التراكمي)</h3>
              <div style={{ height: '320px', width: '100%', marginTop: '20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={logic.stats?.cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.3}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#64748b', fontWeight: 800 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 800 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 900, direction: 'rtl', padding: '15px' }} formatter={(value: any) => [logic.formatCurrency(value), '']} />
                    <Legend wrapperStyle={{ fontSize: '13px', fontWeight: 900, paddingTop: '10px' }} />
                    <Bar dataKey="income" name="إجمالي الإيرادات" fill="url(#colorIncome)" radius={[8, 8, 0, 0]} barSize={40} />
                    <Bar dataKey="expense" name="إجمالي التكاليف" fill="url(#colorExpense)" radius={[8, 8, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. تحليل التكاليف */}
            <div className="premium-card">
              <h3 className="section-title" style={{ fontSize: '18px' }}>🍩 هيكل التكاليف (مقاولين، خامات، مصروفات)</h3>
              <div style={{ height: '320px', width: '100%', display: 'flex', alignItems: 'center', marginTop: '20px' }}>
                {!logic.stats?.expensesByCategory || logic.stats.expensesByCategory.length === 0 ? (
                    <div style={{width:'100%', textAlign:'center', color:'#94a3b8', fontWeight:900}}>لا توجد تكاليف مسجلة بعد</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                          data={logic.stats.expensesByCategory}
                          cx="50%" cy="50%"
                          innerRadius={85} outerRadius={120}
                          paddingAngle={6}
                          dataKey="value"
                          stroke="none"
                          label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                          labelLine={false}
                          style={{ fontWeight: 900, fontSize: '12px', fill: THEME.coffeeDark }}
                        >
                        {logic.stats.expensesByCategory.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))' }} />
                        ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 900, direction: 'rtl', padding: '15px' }} formatter={(value: any) => [logic.formatCurrency(value), '']} />
                    </PieChart>
                    </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          {/* 🚀 القسم الجديد: أداء أوامر الشغل */}
          <div style={{ marginTop: '30px', marginBottom: '30px' }}>
            <div className="premium-card" style={{ width: '100%' }}>
              <h3 className="section-title">📊 أداء أوامر الشغل (الميزانية مقابل التكلفة الفعلية)</h3>
              <div style={{ height: '350px', width: '100%', marginTop: '20px' }}>
                {!logic.stats?.jobOrdersPerformance || logic.stats.jobOrdersPerformance.length === 0 ? (
                    <div style={{width:'100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color:'#94a3b8', fontWeight:900}}>لا توجد بيانات لأوامر الشغل أو لم يتم تسجيل تكاليف عليها بعد</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={logic.stats.jobOrdersPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 900, direction: 'rtl' }}
                            formatter={(value: any, name: string) => [logic.formatCurrency(value), name === 'budget' ? 'الميزانية المعتمدة' : 'التكلفة الفعلية']}
                        />
                        <Legend wrapperStyle={{ fontWeight: 900, fontSize: '14px', paddingTop: '20px' }} />
                        <Bar dataKey="budget" name="الميزانية المعتمدة" fill={THEME.primary} radius={[6, 6, 0, 0]} barSize={30} />
                        <Bar dataKey="actual" name="التكلفة الفعلية" fill={THEME.goldAccent} radius={[6, 6, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* 🚀 القسم الثالث: مؤشرات الأداء السريعة (ماليات) */}
          <div>
            <h3 className="section-title">📊 الأداء التشغيلي (شامل كافة التكاليف)</h3>
            <div className="premium-grid-4">
              <div className="mini-stat-card">
                <div className="mini-icon blue">🏗️</div>
                <div>
                  <p>مشاريع نشطة (جاري العمل بها)</p>
                  <h3>{logic.stats?.totals?.activeProjects || 0}</h3>
                </div>
              </div>
              <div className="mini-stat-card">
                <div className="mini-icon red">💸</div>
                <div>
                  <p>تكاليف ومصروفات إجمالية</p>
                  <h3>{logic.formatCurrency(logic.stats?.totals?.totalExpenses || 0)}</h3>
                </div>
              </div>
              <div className="mini-stat-card">
                <div className="mini-icon green">🧾</div>
                <div>
                  <p>مستخلصات وإيرادات معتمدة</p>
                  <h3>{logic.formatCurrency(logic.stats?.totals?.totalInvoices || 0)}</h3>
                </div>
              </div>
              <div className="mini-stat-card">
                <div className="mini-icon orange">👷</div>
                <div>
                  <p>أجور عمالة مباشرة</p>
                  <h3>{logic.formatCurrency(logic.stats?.totals?.totalWages || 0)}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* ⚖️ القسم الرابع: الرادار الأمني */}
          <div>
            <h3 className="section-title">🛡️ الرادار المالي (معدلات الترحيل والاعتماد)</h3>
            <div className="health-rings-grid">
              {Object.entries(logic.stats?.postingCharts || {}).map(([key, chartData]: [string, any]) => {
                const total = chartData[0].value + chartData[1].value;
                const percent = total === 0 ? 0 : Math.round((chartData[0].value / total) * 100);
                const isWarning = percent < 100 && total > 0;

                return (
                  <div key={key} className={`health-ring-card ${isWarning ? 'warning-glow' : ''}`}>
                    <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={total === 0 ? [{value: 1}] : chartData}
                            innerRadius={28} outerRadius={38}
                            dataKey="value" stroke="none" startAngle={90} endAngle={-270}
                          >
                            {total === 0 ? <Cell fill="#f1f5f9" /> : (
                              <>
                                <Cell fill={THEME.success} /> 
                                <Cell fill="#f1f5f9" />
                              </>
                            )}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="ring-center-text">
                        {total === 0 ? '-' : `${percent}%`}
                      </div>
                    </div>
                    <div className="ring-info">
                      <h4>{moduleLabels[key] || key}</h4>
                      <p>{chartData[1].value} معلق من أصل {total}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 🚨 القسم الخامس: المهام العاجلة */}
          <div className="premium-card alerts-container" style={{ border: '1px solid #fecaca' }}>
            <div className="alerts-header">
              <h3 className="section-title" style={{ margin: 0, color: '#b91c1c' }}>⚠️ صندوق المهام العاجلة (يحتاج اعتماد)</h3>
              <span className="alerts-badge">
                {logic.stats?.alerts?.length || 0} مهام
              </span>
            </div>
            
            <div className="alerts-list">
              {!logic.stats?.alerts || logic.stats.alerts.length === 0 ? (
                  <div className="empty-alerts">
                      🎉 أحسنت! كافة المستندات والقيود معتمدة ومطابقة للمعايير المالية.
                  </div>
              ) : (
                  logic.stats.alerts.map((task: any, idx: number) => (
                  <div key={idx} className="alert-row">
                      <div className="alert-content">
                        <div className={`pulse-dot ${task.type}`} />
                        <span>{task.title}</span>
                      </div>
                      <button onClick={() => router.push(task.route)} className="action-btn">
                        استعراض المستندات ➔
                      </button>
                  </div>
                  ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* 🎨 CSS Styles */}
      <style>{`
        /* Typography & Globals */
        .section-title { font-size: 20px; color: ${THEME.coffeeDark}; font-weight: 900; margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px; }
        
        /* Grids */
        .premium-grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px; }
        .premium-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 25px; }
        .premium-grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
        .health-rings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }

        /* Premium Cards */
        .premium-card { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 1); border-radius: 28px; padding: 30px; box-shadow: 0 20px 40px -15px rgba(0,0,0,0.05); transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .premium-card:hover { transform: translateY(-5px); box-shadow: 0 30px 60px -15px rgba(0,0,0,0.08); }

        /* Card Internals */
        .card-header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .icon-wrapper { width: 50px; height: 50px; border-radius: 16px; display: flex; justify-content: center; align-items: center; font-size: 22px; }
        .trend-badge { font-size: 11px; font-weight: 900; padding: 6px 12px; border-radius: 20px; }
        .trend-badge.positive { background: #f0fdf4; color: #16a34a; }
        .trend-badge.negative { background: #fef2f2; color: #dc2626; }
        .trend-badge.neutral { background: #f8fafc; color: #475569; }
        .card-subtitle { margin: 0 0 5px 0; font-size: 14px; color: #64748b; font-weight: 800; }
        .card-value { margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }

        /* Gradients */
        .gradient-text-green { background: linear-gradient(to left, #059669, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .gradient-text-red { background: linear-gradient(to left, #dc2626, #ef4444); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .gradient-text-gold { background: linear-gradient(to left, #977332, #c5a059); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        /* Mini Stat Cards */
        .mini-stat-card { background: white; border-radius: 20px; padding: 20px; display: flex; align-items: center; gap: 15px; border: 1px solid #f1f5f9; box-shadow: 0 10px 20px -10px rgba(0,0,0,0.03); transition: 0.3s; }
        .mini-stat-card:hover { border-color: ${THEME.goldAccent}; transform: translateY(-3px); }
        .mini-stat-card p { margin: 0; font-size: 12px; color: #64748b; font-weight: 800; }
        .mini-stat-card h3 { margin: 5px 0 0 0; font-size: 18px; font-weight: 900; color: ${THEME.coffeeDark}; display: flex; align-items: baseline; gap: 5px;}
        .mini-icon { width: 45px; height: 45px; border-radius: 14px; display: flex; justify-content: center; align-items: center; font-size: 20px; }
        .mini-icon.blue { background: #eff6ff; color: #3b82f6; }
        .mini-icon.red { background: #fef2f2; color: #ef4444; }
        .mini-icon.green { background: #f0fdf4; color: #10b981; }
        .mini-icon.orange { background: #fffbeb; color: #f59e0b; }
        .currency { font-size: 11px; color: #94a3b8; font-weight: 700; }

        /* Health Rings */
        .health-ring-card { background: white; padding: 15px; border-radius: 20px; display: flex; align-items: center; gap: 15px; border: 1px solid #f1f5f9; box-shadow: 0 4px 10px rgba(0,0,0,0.02); transition: 0.3s; }
        .health-ring-card.warning-glow { border-color: #fde68a; background: #fffbeb; }
        .health-ring-card:hover { transform: scale(1.02); }
        .ring-center-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 13px; font-weight: 900; color: ${THEME.coffeeDark}; }
        .ring-info h4 { margin: 0 0 4px 0; font-size: 13px; font-weight: 900; color: ${THEME.coffeeDark}; }
        .ring-info p { margin: 0; font-size: 11px; font-weight: 800; color: #94a3b8; }

        /* Alerts Inbox */
        .alerts-container { background: #fef2f2 !important; border-radius: 28px; padding: 30px; }
        .alerts-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .alerts-badge { font-size: 13px; background: #ef4444; color: white; padding: 6px 16px; border-radius: 20px; font-weight: 900; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3); }
        .alerts-list { display: flex; flexDirection: column; gap: 12px; }
        .alert-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 25px; background: white; border-radius: 16px; border: 1px solid #fecaca; transition: 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.02); }
        .alert-row:hover { transform: translateX(-5px); border-color: #ef4444; box-shadow: 0 8px 20px rgba(239, 68, 68, 0.1); }
        .alert-content { display: flex; align-items: center; gap: 15px; font-size: 14px; font-weight: 900; color: #1e293b; }
        .action-btn { background: white; border: 2px solid #e2e8f0; padding: 10px 20px; border-radius: 12px; font-size: 12px; font-weight: 900; color: #475569; cursor: pointer; transition: 0.2s; }
        .action-btn:hover { background: #ef4444; color: white; border-color: #ef4444; }
        .empty-alerts { padding: 30px; textAlign: center; background: #f0fdf4; borderRadius: 20px; color: #166534; font-weight: 900; border: 2px dashed #bbf7d0; font-size: 16px; }

        /* Pulse Animation */
        .pulse-dot { width: 12px; height: 12px; border-radius: 50%; }
        .pulse-dot.danger { background: #ef4444; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); animation: pulse-red 2s infinite; }
        .pulse-dot.warning { background: #f59e0b; box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); animation: pulse-orange 2s infinite; }
        
        @keyframes pulse-red { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
        @keyframes pulse-orange { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

        /* Loader */
        .loader-spinner { width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid ${THEME.goldAccent}; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </MasterPage>
  );
}