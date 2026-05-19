import React from 'react';
import { THEME } from '@/lib/theme';
import { KpiCard, ProgressBar } from './SharedUI';

export default function OverviewTab({ logic }: { logic: any }) {
  const { kpis, projectDetails, selectedProject } = logic;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        <KpiCard title="قيمة التعاقد" value={kpis?.totalContract} color={THEME.coffeeDark} />
        <KpiCard title="الميزانية المعتمدة" value={kpis?.totalEstimatedBudget} color={THEME.goldAccent} />
        <KpiCard title="إجمالي الصرف الفعلي" value={kpis?.actualCost} color={kpis?.budgetHealth === 'red' ? THEME.danger : THEME.warning} alert={kpis?.budgetHealth === 'red' ? '🚨 تجاوز للميزانية' : '✅ ضمن الميزانية'} />
        <KpiCard title="المحصل (إيرادات مخصصة)" value={kpis?.totalRevenue} color={THEME.success} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' }}>
        <div className="glass-card">
          <h3 style={{ margin: '0 0 20px 0', color: THEME.coffeeDark, fontWeight: 900 }}>👷 تقرير العمالة الميدانية</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="labor-stat-item"><span style={{fontSize:'11px', color:'#64748b', fontWeight:800}}>عمالة اليوم</span><strong style={{fontSize:'18px'}}>{projectDetails.laborStats?.todayWorkers || 0}</strong></div>
            <div className="labor-stat-item"><span style={{fontSize:'11px', color:'#64748b', fontWeight:800}}>تكلفة اليوم</span><strong style={{fontSize:'18px', color: THEME.danger}}>{projectDetails.laborStats?.todayCost?.toLocaleString() || 0} ج.م</strong></div>
            <div className="labor-stat-item"><span style={{fontSize:'11px', color:'#64748b', fontWeight:800}}>إجمالي العمالة السابقة</span><strong style={{fontSize:'18px'}}>{projectDetails.laborStats?.totalWorkersToDate || 0}</strong></div>
            <div className="labor-stat-item"><span style={{fontSize:'11px', color:'#64748b', fontWeight:800}}>إجمالي الأجور</span><strong style={{fontSize:'18px'}}>{projectDetails.laborStats?.totalLaborCost?.toLocaleString() || 0} ج.م</strong></div>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ margin: '0 0 20px 0', color: THEME.coffeeDark, fontWeight: 900 }}>📈 مؤشر الإنجاز والزمن</h3>
          <ProgressBar label="الوقت المنقضي من مدة المشروع" percentage={kpis?.timeProgress} color={THEME.coffeeMain} />
          <div style={{height:'15px'}}/>
          <ProgressBar label="الإنجاز المالي والتحصيل" percentage={kpis?.financialProgress} color={THEME.goldAccent} />
          <div style={{ marginTop: '20px', padding: '12px', backgroundColor: kpis?.timeStatus.includes('متأخر') ? '#FEE2E2' : '#DCFCE7', borderRadius: '12px', fontWeight: 900, textAlign: 'center', color: kpis?.timeStatus.includes('متأخر') ? THEME.danger : THEME.success }}>
            حالة الجدول الزمني: {kpis?.timeStatus}
          </div>
        </div>
      </div>
    </div>
  );
}