"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // 👈 استدعاء الراوتر لتوجيه التنبيهات
import MasterPage from '@/components/MasterPage';
import GlassContainer from '@/components/GlassContainer';
import { THEME } from '@/lib/theme';
import { useDashboardLogic } from './dashboard_logic';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = [THEME.goldAccent, THEME.primary, '#10b981', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const logic = useDashboardLogic(); // يتم جلب stats, isLoading من اللوجيك
  const router = useRouter(); // 👈 تهيئة الراوتر

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  // تعريف المسميات العربية للموديولات لاستخدامها في الشارات
  const moduleLabels: Record<string, string> = {
    expenses: 'المصروفات',
    invoices: 'المستخلصات',
    labor: 'اليوميات',
    payments: 'سندات الصرف',
    receipts: 'سندات القبض',
    advances: 'السلف',
    deductions: 'الجزاءات'
  };

  return (
    <MasterPage title="لوحة القيادة المركزية" subtitle="مراقبة الأداء التشغيلي والمالي - رواسي اليسر">
      
      {logic.isLoading ? (
        <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8' }}>
          ⏳ جاري تجميع البيانات وتحليل المؤشرات...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeUp 0.5s ease-out' }}>
          
          {/* 🏛️ القسم الجديد: المركز المالي والموقف (الأصول والخصوم) */}
          <div>
            <h3 className="section-title">🏛️ المركز المالي والالتزامات</h3>
            <div className="stats-grid">
              <GlassContainer className="stat-card" style={{ borderRight: `5px solid #10b981` }}>
                <div className="stat-icon" style={{ background: '#f0fdf4', color: '#10b981' }}>🏦</div>
                <div className="stat-info">
                  <p className="stat-title">إجمالي الأصول (ممتلكاتنا)</p>
                  <h3 className="stat-value" style={{ color: '#10b981' }}>{logic.formatCurrency(logic.stats?.totals?.totalAssets || 0)}</h3>
                </div>
              </GlassContainer>

              <GlassContainer className="stat-card" style={{ borderRight: `5px solid #ef4444` }}>
                <div className="stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>⚖️</div>
                <div className="stat-info">
                  <p className="stat-title">إجمالي الالتزامات (خصوم)</p>
                  <h3 className="stat-value" style={{ color: '#ef4444' }}>{logic.formatCurrency(logic.stats?.totals?.totalLiabilities || 0)}</h3>
                </div>
              </GlassContainer>

              <GlassContainer className="stat-card" style={{ borderRight: `5px solid ${THEME.goldAccent}` }}>
                <div className="stat-icon" style={{ background: '#fffbeb', color: THEME.goldAccent }}>💼</div>
                <div className="stat-info">
                  <p className="stat-title">صافي القيمة التقديرية</p>
                  <h3 className="stat-value">{logic.formatCurrency((logic.stats?.totals?.totalAssets || 0) - (logic.stats?.totals?.totalLiabilities || 0))}</h3>
                </div>
              </GlassContainer>
            </div>
          </div>

          {/* 🚀 القسم الأول: مؤشرات الأداء التشغيلية (KPIs) */}
          <div>
            <h3 className="section-title">📊 الأداء التشغيلي</h3>
            <div className="stats-grid">
              <GlassContainer className="stat-card">
                <div className="stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>💸</div>
                <div className="stat-info">
                  <p className="stat-title">إجمالي المصروفات</p>
                  <h3 className="stat-value">{logic.formatCurrency(logic.stats?.totals?.totalExpenses || 0)}</h3>
                </div>
              </GlassContainer>

              <GlassContainer className="stat-card">
                <div className="stat-icon" style={{ background: '#f0fdf4', color: '#10b981' }}>🧾</div>
                <div className="stat-info">
                  <p className="stat-title">المستخلصات والفواتير</p>
                  <h3 className="stat-value">{logic.formatCurrency(logic.stats?.totals?.totalInvoices || 0)}</h3>
                </div>
              </GlassContainer>

              <GlassContainer className="stat-card">
                <div className="stat-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}>👷</div>
                <div className="stat-info">
                  <p className="stat-title">إجمالي أجور العمالة</p>
                  <h3 className="stat-value">{logic.formatCurrency(logic.stats?.totals?.totalWages || 0)}</h3>
                </div>
              </GlassContainer>

              <GlassContainer className="stat-card">
                <div className="stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>🏗️</div>
                <div className="stat-info">
                  <p className="stat-title">المشاريع النشطة</p>
                  <h3 className="stat-value">{logic.stats?.totals?.activeProjects || 0} <span className="currency">مشروع</span></h3>
                </div>
              </GlassContainer>
            </div>
          </div>

          {/* ⚖️ القسم الثاني: رادار النزاهة واعتماد البيانات لكل موديول */}
          <div style={{ marginBottom: '10px' }}>
            <h3 className="section-title">⚖️ مؤشرات اعتماد وترحيل البيانات (النزاهة المالية)</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: '15px' 
            }}>
              {Object.entries(logic.stats?.postingCharts || {}).map(([key, chartData]: [string, any]) => (
                <GlassContainer key={key} style={{ padding: '15px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <p style={{ fontSize: '12px', fontWeight: 900, marginBottom: '10px', color: THEME.coffeeDark }}>
                    {moduleLabels[key] || key}
                  </p>
                  <div style={{ height: '120px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          innerRadius={30}
                          outerRadius={45}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell fill={THEME.success} stroke="none" /> 
                          <Cell fill="#f59e0b" stroke="none" />
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', fontSize: '10px', fontWeight: 900 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '5px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: THEME.success }}>✅ {chartData[0].value}</div>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#f59e0b' }}>⏳ {chartData[1].value}</div>
                  </div>
                </GlassContainer>
              ))}
            </div>
          </div>

          {/* 📊 القسم الثالث: الرسوم البيانية الرئيسية */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
            
            {/* رسم التدفق النقدي الفعلي */}
            <GlassContainer>
              <h3 className="section-title">📉 التدفق النقدي والسيولة</h3>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={logic.stats?.cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontWeight: 900, direction: 'rtl' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 900 }} />
                    <Bar dataKey="income" name="الإيرادات" fill={THEME.success} radius={[6, 6, 0, 0]} barSize={30} />
                    <Bar dataKey="expense" name="المصروفات" fill={THEME.danger} radius={[6, 6, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassContainer>

            {/* رسم توزيع المصروفات */}
            <GlassContainer>
              <h3 className="section-title">🍩 تحليل المصروفات حسب الفئة</h3>
              <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'center' }}>
                {!logic.stats?.expensesByCategory || logic.stats.expensesByCategory.length === 0 ? (
                    <div style={{width:'100%', textAlign:'center', color:'#94a3b8', fontWeight:900}}>لا توجد مصروفات مسجلة بعد</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={logic.stats.expensesByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                        style={{ fontWeight: 800, fontSize: '11px' }}
                        >
                        {logic.stats.expensesByCategory.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontWeight: 900, direction: 'rtl' }} />
                    </PieChart>
                    </ResponsiveContainer>
                )}
              </div>
            </GlassContainer>

            {/* 🚨 الرادار الأمني (التنبيهات المعالجة آلياً مع التوجيه الذكي) */}
            <GlassContainer style={{ gridColumn: '1 / -1', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="section-title" style={{ margin: 0, color: '#b91c1c' }}>⚠️ الرادار الأمني ومهام الاعتماد المعلقة</h3>
                <span style={{ fontSize: '12px', background: '#fef2f2', color: '#ef4444', padding: '4px 12px', borderRadius: '20px', fontWeight: 900 }}>
                  {logic.stats?.alerts?.length || 0} تنبيهات نشطة
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {!logic.stats?.alerts || logic.stats.alerts.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', background: '#f0fdf4', borderRadius: '12px', color: '#166534', fontWeight: 900, border: '1px solid #bbf7d0' }}>
                        🎉 كافة البيانات مرحلة ومطابقة للمعايير المالية!
                    </div>
                ) : (
                    logic.stats.alerts.map((task: any, idx: number) => (
                    <div key={idx} className="alert-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className={`status-dot ${task.type}`} />
                          <span style={{ fontSize: '13px', fontWeight: 900, color: '#334155' }}>{task.title}</span>
                        </div>
                        {/* 👈 التوجيه الذكي: عند الضغط يتم نقل المستخدم للمسار فوراً */}
                        <button onClick={() => router.push(task.route)} className="review-btn">مراجعة وترحيل 🚀</button>
                    </div>
                    ))
                )}
              </div>
            </GlassContainer>

          </div>
        </div>
      )}

      <style>{`
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .stat-card { display: flex; align-items: center; gap: 20px; padding: 25px !important; transition: 0.3s; }
        .stat-card:hover { transform: translateY(-5px); box-shadow: 0 15px 30px rgba(0,0,0,0.05); border-color: ${THEME.goldAccent}; }
        .stat-icon { width: 55px; height: 55px; border-radius: 14px; display: flex; justify-content: center; align-items: center; font-size: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .stat-info { display: flex; flex-direction: column; gap: 4px; }
        .stat-title { margin: 0; font-size: 12px; color: #64748b; font-weight: 800; }
        .stat-value { margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; display: flex; align-items: baseline; gap: 5px; }
        .currency { font-size: 11px; color: #94a3b8; font-weight: 700; }
        .section-title { font-size: 16px; color: ${THEME.coffeeDark}; font-weight: 900; margin: 0 0 20px 0; display: flex; align-items: center; gap: 8px; }
        
        .alert-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: white; border-radius: 12px; border: 1px solid #f1f5f9; transition: 0.2s; }
        .alert-item:hover { border-color: #cbd5e1; background: #fafafa; }
        .status-dot { width: 10px; height: 10px; border-radius: 50%; position: relative; }
        .status-dot.danger { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
        .status-dot.warning { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
        
        .review-btn { background: #fef2f2; border: 1px solid #fecaca; padding: 8px 18px; border-radius: 8px; font-size: 12px; font-weight: 900; color: #b91c1c; cursor: pointer; transition: 0.2s; }
        .review-btn:hover { background: #ef4444; color: white; border-color: #ef4444; transform: scale(1.05); }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </MasterPage>
  );
}