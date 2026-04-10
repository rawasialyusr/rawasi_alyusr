"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getMasterFinancialStats } from "@/app/actions/financial_actions";

export default function FinancialCenter() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refreshFinancialData = useCallback(async () => {
    try {
      const res = await getMasterFinancialStats();
      if (res) {
        setData(res);
        setError(false);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeFinancialCenter = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = profile?.role?.toString().trim().toLowerCase();

      if (profileError || userRole !== 'admin') {
        alert("⚠️ وصول غير مصرح");
        router.push("/");
        return;
      }

      if (isMounted) await refreshFinancialData();

      const channel = supabase.channel('financial_realtime_sync');
      channel
        .on('postgres_changes', { event: '*', schema: 'public' }, () => refreshFinancialData())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    initializeFinancialCenter();
    return () => { isMounted = false; };
  }, [router, refreshFinancialData]);

  if (loading) return (
    <div style={styles.loadingWrapper}>
      <div className="loader_ring"></div>
      <p style={{ letterSpacing: '2px', marginTop: '20px' }}>جاري مزامنة الأنظمة المالية...</p>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Header بخش */}
      <header style={styles.header}>
        <div style={styles.titleArea}>
          <div style={styles.badge}>ERP SYSTEM LIVE</div>
          <h1 style={styles.mainTitle}>المركز المالي الموحد</h1>
          <p style={styles.subTitle}>شركة رواسي للمقاولات والاستثمار العقاري</p>
        </div>
        <div style={styles.headerStats}>
          <div style={styles.statusDot}></div>
          <span>متصل بالسيرفر الرئيسي: {data?.lastUpdate || 'جاري التحديث...'}</span>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <div style={styles.summaryGrid}>
        <div style={{ ...styles.statBox, borderTop: '4px solid #2ecc71' }}>
          <div style={styles.iconCircle}>💸</div>
          <span style={styles.label}>إجمالي المحصل</span>
          <h2 style={{ ...styles.value, color: '#2ecc71' }}>{data?.totalIn?.toLocaleString()} <small>ج.م</small></h2>
        </div>

        <div style={{ ...styles.statBox, borderTop: '4px solid #e74c3c' }}>
          <div style={styles.iconCircle}>📉</div>
          <span style={styles.label}>إجمالي المنصرف</span>
          <h2 style={{ ...styles.value, color: '#e74c3c' }}>{data?.totalOut?.toLocaleString()} <small>ج.m</small></h2>
        </div>

        <div style={{ ...styles.statBox, borderTop: '4px solid #c5a059' }}>
          <div style={styles.iconCircle}>🏦</div>
          <span style={styles.label}>صافي الكاش الحالي</span>
          <h2 style={{ ...styles.value, color: '#fff' }}>{(data?.totalIn - data?.totalOut)?.toLocaleString()} <small>ج.م</small></h2>
        </div>

        <div style={{ ...styles.statBox, borderTop: '4px solid #f1c40f' }}>
          <div style={styles.iconCircle}>📝</div>
          <span style={styles.label}>مديونيات الموردين</span>
          <h2 style={{ ...styles.value, color: '#f1c40f' }}>{data?.supplierDebts?.toLocaleString()} <small>ج.م</small></h2>
        </div>
      </div>

      {/* Modern Analytics Section */}
      <div style={styles.analyticsRow}>
        <div style={styles.chartContainer}>
          <h3 style={styles.cardTitle}>تحليل التدفق النقدي (السيولة)</h3>
          <div style={styles.chartPlaceholder}>
             {/* Simple visual bar comparison */}
             <div style={styles.barRow}>
                <span style={{width: '80px'}}>الإيرادات</span>
                <div style={{...styles.barBase, width: '100%'}}>
                   <div style={{...styles.barFill, width: '75%', backgroundColor: '#2ecc71'}}></div>
                </div>
             </div>
             <div style={styles.barRow}>
                <span style={{width: '80px'}}>المصروفات</span>
                <div style={{...styles.barBase, width: '100%'}}>
                   <div style={{...styles.barFill, width: '45%', backgroundColor: '#e74c3c'}}></div>
                </div>
             </div>
          </div>
        </div>

        <div style={styles.recentActions}>
           <h3 style={styles.cardTitle}>آخر الحركات المالية</h3>
           <div style={styles.miniLog}>
              <p>• تم تحديث بند الإيرادات - مشروع العلمين</p>
              <p>• صرف دفعة مورد - شركة الأسمنت</p>
              <p>• مراجعة سلف الموظفين - قطاع الدلتا</p>
           </div>
        </div>
      </div>

      <button onClick={refreshFinancialData} style={styles.refreshBtn}>تحديث فوري للبيانات 🔄</button>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { 
    padding: "40px", backgroundColor: "#070708", minHeight: "100vh", color: "#fff", 
    direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif' 
  },
  header: { 
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', 
    marginBottom: "50px", borderBottom: "1px solid #1a1a1a", paddingBottom: "30px" 
  },
  badge: { 
    backgroundColor: 'rgba(197, 160, 89, 0.15)', color: '#c5a059', 
    padding: '4px 12px', borderRadius: '20px', fontSize: '10px', 
    fontWeight: 'bold', letterSpacing: '1px', marginBottom: '10px', display: 'inline-block' 
  },
  mainTitle: { color: '#fff', fontSize: '32px', fontWeight: '800', margin: 0 },
  subTitle: { color: '#666', fontSize: '15px', marginTop: '5px' },
  headerStats: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#888' },
  statusDot: { width: '8px', height: '8px', backgroundColor: '#2ecc71', borderRadius: '50%', boxShadow: '0 0 10px #2ecc71' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' },
  statBox: { 
    backgroundColor: '#111112', padding: '25px', borderRadius: '16px', 
    position: 'relative', overflow: 'hidden', border: '1px solid #1a1a1a' 
  },
  iconCircle: { fontSize: '20px', marginBottom: '15px', opacity: 0.7 },
  label: { color: '#888', fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '8px' },
  value: { fontSize: '28px', margin: 0, fontWeight: '900' },
  analyticsRow: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' },
  chartContainer: { backgroundColor: '#111112', padding: '25px', borderRadius: '16px', border: '1px solid #1a1a1a' },
  recentActions: { backgroundColor: '#111112', padding: '25px', borderRadius: '16px', border: '1px solid #1a1a1a' },
  cardTitle: { fontSize: '16px', color: '#c5a059', marginBottom: '20px', fontWeight: '700' },
  miniLog: { fontSize: '13px', color: '#777', lineHeight: '2.2' },
  barRow: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', fontSize: '13px' },
  barBase: { height: '8px', backgroundColor: '#1a1a1b', borderRadius: '10px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '10px' },
  loadingWrapper: { 
    height: '100vh', display: 'flex', flexDirection: 'column', 
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#070708', color: '#c5a059' 
  },
  refreshBtn: { 
    position: 'fixed', bottom: '30px', left: '30px', padding: '14px 28px', 
    backgroundColor: '#c5a059', color: '#000', borderRadius: '12px', 
    cursor: 'pointer', fontWeight: 'bold', border: 'none', boxShadow: '0 10px 20px rgba(197, 160, 89, 0.2)' 
  }
};