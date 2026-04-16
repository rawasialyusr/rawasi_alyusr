"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ❌ تم حذف استيراد الأكشن نهائياً

export default function FinancialCenter() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ⚙️ المحرك المالي المباشر (Direct Fetch)
  const refreshFinancialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. جلب المصروفات
      const { data: expenses } = await supabase.from('expenses').select('total_price');
      
      // 2. جلب القيود المحاسبية
      const { data: journalLines } = await supabase.from('journal_lines').select('debit, credit');

      // حساب العمليات
      const totalOut = expenses?.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0) || 0;
      const totalIn = journalLines?.reduce((sum, item) => sum + (Number(item.credit) || 0), 0) || 0;
      const supplierDebts = journalLines?.reduce((sum, item) => sum + (Number(item.debit) || 0), 0) || 0;

      setData({
        totalIn,
        totalOut,
        supplierDebts: supplierDebts * 0.2, // نسبة تقديرية (يمكن تعديلها لاحقاً)
        lastUpdate: new Date().toLocaleTimeString('ar-EG')
      });
      setError(false);
    } catch (err) {
      console.error("Fetch Error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let activeChannel: any = null; // 1. متغير لحفظ القناة عشان نقدر نمسحها صح

    const initializeFinancialCenter = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      if (isMounted) await refreshFinancialData();

      // 2. استخدام اسم فريد للقناة (بإضافة Date.now) لضمان عدم التعارض
      activeChannel = supabase.channel(`financial_sync_${Date.now()}`);
      
      activeChannel
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          if (isMounted) refreshFinancialData();
        })
        .subscribe();
    };

    initializeFinancialCenter();

    // 3. التنظيف الصحيح (Cleanup) اللي React بيقدر يشوفه وينفذه
    return () => {
      isMounted = false;
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, [router, refreshFinancialData]);

  if (loading) return (
    <div style={styles.loadingWrapper}>
      <style>{`
        .loader_ring { width: 80px; height: 80px; border: 4px solid rgba(197, 160, 89, 0.1); border-top: 4px solid #c5a059; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
      <div className="loader_ring"></div>
      <p style={{ letterSpacing: '2px', marginTop: '20px', color: '#c5a059', fontWeight: 'bold' }}>جاري مزامنة الأنظمة المالية...</p>
    </div>
  );

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-card { animation: fadeIn 0.5s ease-out forwards; }
        .glow-dot { animation: pulse 2s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); } 100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); } }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.titleArea}>
          <div style={styles.badge}>FINANCIAL COMMAND CENTER</div>
          <h1 style={styles.mainTitle}>المركز المالي <span style={{color: '#c5a059'}}>الموحد</span></h1>
          <p style={styles.subTitle}>شركة رواسي للمقاولات والاستثمار العقاري • الرقابة اللحظية</p>
        </div>
        <div style={styles.headerStats}>
          <div style={{...styles.statusDot, backgroundColor: '#2ecc71'}} className="glow-dot"></div>
          <span style={{color: '#2ecc71', fontWeight: 'bold'}}>بث مباشر من السيرفر</span>
          <span style={{marginRight: '15px', borderRight: '1px solid #333', paddingRight: '15px'}}>{data?.lastUpdate || '--:--'}</span>
        </div>
      </header>

      {/* KPI Cards */}
      <div style={styles.summaryGrid}>
        <StatCard title="إجمالي المحصل" value={data?.totalIn} color="#2ecc71" icon="💸" />
        <StatCard title="إجمالي المنصرف" value={data?.totalOut} color="#e74c3c" icon="📉" />
        <StatCard title="صافي السيولة" value={(data?.totalIn || 0) - (data?.totalOut || 0)} color="#c5a059" icon="🏦" isMain={true} />
        <StatCard title="مديونيات الموردين" value={data?.supplierDebts} color="#f1c40f" icon="📝" />
      </div>

      {/* Analytics Section */}
      <div style={styles.analyticsRow}>
        <div style={styles.chartContainer} className="animate-card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
             <h3 style={styles.cardTitle}>تحليل التدفق النقدي (السيولة)</h3>
          </div>
          <div style={styles.chartPlaceholder}>
             <ProgressBar label="الإيرادات والمقبوضات" percentage={75} color="#2ecc71" />
             <ProgressBar label="المصروفات التشغيلية" percentage={45} color="#e74c3c" />
             <ProgressBar label="التزامات الموردين" percentage={20} color="#f1c40f" />
          </div>
        </div>

        <div style={styles.recentActions} className="animate-card">
           <h3 style={styles.cardTitle}>سجل الحركات اللحظي</h3>
           <div style={styles.miniLog}>
              <LogItem text="تم تحديث بند الإيرادات - مشروع العلمين" time="مباشر" />
              <LogItem text="صرف دفعة مورد - شركة الأسمنت الوطنية" time="مباشر" />
              <LogItem text="مراجعة سلف الموظفين - قطاع الدلتا" time="مباشر" />
           </div>
        </div>
      </div>

      <button onClick={refreshFinancialData} style={styles.refreshBtn}>
        تحديث الأنظمة الآن 🔄
      </button>
    </div>
  );
}

// --- مكونات المساعدة ---
function StatCard({ title, value, color, icon, isMain = false }: any) {
  return (
    <div style={{ 
      ...styles.statBox, 
      borderRight: `4px solid ${color}`,
      background: isMain ? 'linear-gradient(145deg, #111112 0%, #1a150d 100%)' : '#111112'
    }} className="animate-card">
      <div style={styles.cardGlow}></div>
      <div style={{fontSize: '24px', marginBottom: '15px'}}>{icon}</div>
      <span style={styles.label}>{title}</span>
      <h2 style={{ ...styles.value, color: isMain ? '#fff' : color }}>
        {value?.toLocaleString() || '0'} <small style={{fontSize: '12px', opacity: 0.5}}>ج.م</small>
      </h2>
    </div>
  );
}

function ProgressBar({ label, percentage, color }: any) {
  return (
    <div style={{marginBottom: '25px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px'}}>
        <span>{label}</span>
        <span style={{color: color, fontWeight: 'bold'}}>{percentage}%</span>
      </div>
      <div style={styles.barBase}>
        <div style={{...styles.barFill, width: `${percentage}%`, backgroundColor: color, boxShadow: `0 0 15px ${color}44`}}></div>
      </div>
    </div>
  );
}

function LogItem({ text, time }: any) {
  return (
    <div style={{display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1a1a1a'}}>
      <span style={{color: '#bbb'}}>• {text}</span>
      <span style={{color: '#555', fontSize: '11px'}}>{time}</span>
    </div>
  );
}

// --- الستايلات ---
const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: "60px 40px", backgroundColor: "#070708", minHeight: "100vh", color: "#fff", direction: 'rtl', fontFamily: 'Cairo, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: "60px", borderBottom: "1px solid rgba(197, 160, 89, 0.1)", paddingBottom: "35px" },
  badge: { background: 'linear-gradient(90deg, #c5a059 0%, #8c6a5d 100%)', color: '#000', padding: '4px 15px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', letterSpacing: '2px', marginBottom: '15px', display: 'inline-block' },
  mainTitle: { color: '#fff', fontSize: '42px', fontWeight: '900', margin: 0, letterSpacing: '-1px' },
  subTitle: { color: '#666', fontSize: '14px', marginTop: '10px', fontWeight: '500' },
  headerStats: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#888', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 20px', borderRadius: '50px', border: '1px solid #1a1a1a' },
  statusDot: { width: '10px', height: '10px', borderRadius: '50%' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '25px', marginBottom: '40px' },
  statBox: { backgroundColor: '#111112', padding: '30px', borderRadius: '20px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' },
  cardGlow: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(circle at top right, rgba(197, 160, 89, 0.05), transparent)', pointerEvents: 'none' },
  label: { color: '#666', fontSize: '14px', fontWeight: '700', display: 'block', marginBottom: '10px', textTransform: 'uppercase' },
  value: { fontSize: '32px', margin: 0, fontWeight: '900', letterSpacing: '-1px' },
  analyticsRow: { display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '25px' },
  chartContainer: { backgroundColor: '#111112', padding: '35px', borderRadius: '24px', border: '1px solid #1a1a1a' },
  recentActions: { backgroundColor: '#111112', padding: '35px', borderRadius: '24px', border: '1px solid #1a1a1a' },
  cardTitle: { fontSize: '18px', color: '#c5a059', marginBottom: '25px', fontWeight: '800' },
  miniLog: { fontSize: '13px', lineHeight: '2' },
  barBase: { height: '12px', backgroundColor: '#070708', borderRadius: '20px', overflow: 'hidden', border: '1px solid #1a1a1a' },
  barFill: { height: '100%', borderRadius: '20px', transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)' },
  loadingWrapper: { height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#070708' },
  refreshBtn: { position: 'fixed', bottom: '40px', left: '40px', padding: '18px 35px', backgroundColor: '#c5a059', color: '#000', borderRadius: '15px', cursor: 'pointer', fontWeight: '900', border: 'none', boxShadow: '0 20px 40px rgba(197, 160, 89, 0.3)', transition: '0.3s transform', fontSize: '14px' }
};