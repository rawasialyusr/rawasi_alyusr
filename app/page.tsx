"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RawasiEliteDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [lastReport, setLastReport] = useState<any>({
    site: "مشروع برج الفرسان - جدة",
    task: "صب خرسانة الدور العاشر",
    supervisor: "م. أحمد الشمراني",
    laborCount: 45,
    expense: 12500,
    status: "جاري التنفيذ",
    progress: 65
  });

  useEffect(() => {
    setMounted(true);
    // محاكاة جلب بيانات حقيقية
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) console.log("User Authenticated");
    };
    checkUser();
  }, []);

  if (!mounted) return null;

  return (
    <div style={styles.dashboard}>
      {/* استايلات إضافية للتأثيرات الحركية */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade { animation: fadeIn 0.6s ease-out forwards; }
        .stat-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; transition: 0.3s; }
        .progress-bar { height: 8px; border-radius: 4px; background: #eee; overflow: hidden; margin-top: 10px; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #C5A059, #8C6A5D); transition: width 1s ease-in-out; }
      `}</style>

      {/* الرأس (Header) */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.brand}>
            <div style={styles.logoFrame}>R</div>
            <div>
              <h1 style={styles.brandTitle}>رواسي للمقاولات <span style={styles.edition}>ELITE ERP</span></h1>
              <p style={styles.brandSubtitle}>منصة التحليل والرقابة التشغيلية</p>
            </div>
          </div>
          <div style={styles.headerActions}>
            <div style={styles.statusDot}>● متصل</div>
            <div style={styles.dateBadge}>
              📅 {new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* صف الكروت العلوية (Quick Stats) */}
        <section style={styles.statsGrid}>
          <StatCard title="إجمالي المصروفات" value="1,240,000" unit="ج.م" trend="+12%" icon="💰" color="#43342E" />
          <StatCard title="تكلفة القوى العاملة" value="482,500" unit="ج.م" trend="+5%" icon="👷" color="#C5A059" />
          <StatCard title="المشاريع النشطة" value="14" unit="موقع" trend="0%" icon="🏗️" color="#2980b9" />
          <StatCard title="ساعات العمل اليوم" value="2,140" unit="ساعة" trend="+8%" icon="⏱️" color="#27ae60" />
        </section>

        <div style={styles.contentLayout}>
          {/* القسم الرئيسي (Live Control Tower) */}
          <section style={{...styles.card, flex: 2}} className="animate-fade">
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>🛰️ برج المراقبة الميداني</h2>
              <span style={styles.livePulse}>تحديث حي الآن</span>
            </div>
            
            <div style={styles.liveDetails}>
              <div style={styles.projectHero}>
                <h3 style={styles.siteName}>{lastReport.site}</h3>
                <p style={styles.taskName}><b>المهمة الحالية:</b> {lastReport.task}</p>
                <div style={styles.progressContainer}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px'}}>
                    <span>نسبة الإنجاز</span>
                    <span>{lastReport.progress}%</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{width: `${lastReport.progress}%`}}></div></div>
                </div>
              </div>

              <div style={styles.liveStats}>
                <div style={styles.miniStat}>
                  <span style={styles.miniLabel}>المشرف المسؤول</span>
                  <span style={styles.miniValue}>{lastReport.supervisor}</span>
                </div>
                <div style={styles.miniStat}>
                  <span style={styles.miniLabel}>العمالة بالموقع</span>
                  <span style={styles.miniValue}>{lastReport.laborCount} فني</span>
                </div>
                <div style={styles.miniStat}>
                  <span style={styles.miniLabel}>صرفية اليوم</span>
                  <span style={{...styles.miniValue, color:'#e74c3c'}}>{lastReport.expense.toLocaleString()} ج.م</span>
                </div>
              </div>
            </div>
          </section>

          {/* قسم التحليلات الجانبي (Analytics Preview) */}
          <section style={{...styles.card, flex: 1}} className="animate-fade">
            <h2 style={styles.cardTitle}>📊 توزيع الميزانية</h2>
            <div style={styles.chartPlaceholder}>
              {/* محاكاة تشارت بسيط */}
              {[80, 40, 60, 90].map((h, i) => (
                <div key={i} style={{
                  height: `${h}%`, 
                  width: '30px', 
                  background: i % 2 === 0 ? '#C5A059' : '#43342E',
                  borderRadius: '5px 5px 0 0'
                }}></div>
              ))}
            </div>
            <div style={{marginTop: '20px'}}>
              <div style={styles.legendItem}><span style={{...styles.dot, background:'#C5A059'}}></span> خامات ومواد</div>
              <div style={styles.legendItem}><span style={{...styles.dot, background:'#43342E'}}></span> أجور وخدمات</div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// مكون كارت الإحصائيات
function StatCard({ title, value, unit, trend, icon, color }: any) {
  return (
    <div style={styles.statCard} className="stat-card animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
        <div style={{ ...styles.iconBox, backgroundColor: `${color}15`, color: color }}>{icon}</div>
        <div style={{ ...styles.trendTag, color: trend.includes('+') ? '#27ae60' : '#888' }}>{trend}</div>
      </div>
      <h3 style={styles.statTitle}>{title}</h3>
      <div style={styles.statValue}>{value} <small style={styles.unit}>{unit}</small></div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  dashboard: { backgroundColor: '#F8F6F2', minHeight: '100vh', direction: 'rtl', fontFamily: 'Cairo, sans-serif' },
  header: { backgroundColor: '#fff', borderBottom: '1px solid #E6D5C3', padding: '15px 0', position: 'sticky', top: 0, zIndex: 100 },
  headerContent: { maxWidth: '1400px', margin: '0 auto', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  brand: { display: 'flex', alignItems: 'center', gap: '15px' },
  logoFrame: { width: '45px', height: '45px', background: '#43342E', color: '#C5A059', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(67,52,46,0.3)' },
  brandTitle: { margin: 0, fontSize: '20px', color: '#43342E', fontWeight: '900' },
  edition: { fontSize: '10px', background: '#C5A059', color: '#fff', padding: '2px 8px', borderRadius: '20px', verticalAlign: 'middle', marginRight: '5px' },
  brandSubtitle: { margin: 0, fontSize: '12px', color: '#8C6A5D' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '20px' },
  statusDot: { fontSize: '12px', color: '#27ae60', fontWeight: 'bold', backgroundColor: '#e8f5e9', padding: '5px 15px', borderRadius: '20px' },
  dateBadge: { fontSize: '13px', color: '#43342E', fontWeight: '600' },
  
  main: { maxWidth: '1400px', margin: '0 auto', padding: '40px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '25px', marginBottom: '40px' },
  statCard: { backgroundColor: '#fff', padding: '25px', borderRadius: '20px', border: '1px solid #E6D5C3', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  iconBox: { width: '50px', height: '50px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
  statTitle: { fontSize: '14px', color: '#8C6A5D', margin: '0 0 10px 0' },
  statValue: { fontSize: '28px', fontWeight: '900', color: '#43342E' },
  unit: { fontSize: '14px', fontWeight: 'normal', color: '#8C6A5D' },
  trendTag: { fontSize: '12px', fontWeight: 'bold' },

  contentLayout: { display: 'flex', gap: '30px', alignItems: 'flex-start' },
  card: { backgroundColor: '#fff', borderRadius: '24px', padding: '30px', border: '1px solid #E6D5C3', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  cardTitle: { fontSize: '18px', fontWeight: 'bold', color: '#43342E', margin: 0 },
  livePulse: { fontSize: '11px', color: '#e74c3c', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' },
  
  projectHero: { backgroundColor: '#FDFCFB', padding: '25px', borderRadius: '18px', border: '1px solid #F4F1EE', marginBottom: '25px' },
  siteName: { fontSize: '24px', fontWeight: '900', color: '#43342E', margin: '0 0 10px 0' },
  taskName: { fontSize: '15px', color: '#8C6A5D', margin: '0 0 20px 0' },
  progressContainer: { marginTop: '20px' },
  
  liveStats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' },
  miniStat: { display: 'flex', flexDirection: 'column', gap: '5px' },
  miniLabel: { fontSize: '12px', color: '#8C6A5D' },
  miniValue: { fontSize: '16px', fontWeight: '700', color: '#43342E' },

  chartPlaceholder: { height: '150px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '20px', backgroundColor: '#FDFCFB', borderRadius: '15px', border: '1px dashed #E6D5C3' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#43342E', marginBottom: '8px' },
  dot: { width: '10px', height: '10px', borderRadius: '50%' }
};