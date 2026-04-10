"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RawasiMainDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lastReport, setLastReport] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      
      // هنا بنجلب بيانات افتراضية لآخر يومية (يمكنك ربطها بجدول التقارير لاحقاً)
      setLastReport({
        site: "موقع الفرسان شركة المواطن -  فيلا 1010",
        task: "اعمال دهانات - الدور الـ 2",
        supervisor: "م.محمد عبده الحزين",
        laborCount: 38,
        expense: 8500,
        time: "اليوم، 10:30 ص"
      });
      
      setLoading(false);
    };
    init();
  }, [router]);

  if (loading) return <div style={styles.loader}>جاري معالجة البيانات الحية...</div>;

  return (
    <div style={styles.container}>
      {/* 🔝 1. الهيدر الرئيسي (بدون قائمة جانبية) */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.brand}>
            <div style={styles.logo}>R</div>
            <div>
              <h1 style={styles.title}>رواسي للمقاولات <span style={styles.erpTag}>ERP SYSTEM</span></h1>
              <p style={styles.subtitle}>لوحة التحكم الرئيسية والتحليل التشغيلي</p>
            </div>
          </div>
          <div style={styles.userSection}>
            <div style={styles.dateTime}>📅 {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <button style={styles.refreshBtn}>🔄 تحديث البيانات</button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* 🚨 2. شريط الحالة - آخر يومية مدخلة (Live Update) */}
        <section style={styles.liveSection}>
          <div style={styles.liveHeader}>
            <span style={styles.liveBadge}>● تحديث ميداني مباشر</span>
            <span style={styles.liveTime}>{lastReport?.time}</span>
          </div>
          <div style={styles.liveBody}>
            <div style={styles.liveInfo}>
              <h3 style={styles.siteTitle}>{lastReport?.site}</h3>
              <p style={styles.taskText}><b>البند الحالي:</b> {lastReport?.task}</p>
              <div style={styles.metaInfo}>
                <span>👤 المشرف: {lastReport?.supervisor}</span>
                <span style={{marginRight: '20px'}}>👷 العمالة: {lastReport?.laborCount} فرد</span>
              </div>
            </div>
            <div style={styles.livePrice}>
              <span style={styles.priceLabel}>مصروف اليومية</span>
              <span style={styles.priceValue}>{lastReport?.expense.toLocaleString()} <small>ج.م</small></span>
            </div>
          </div>
        </section>

        {/* 💰 3. ملخص الأرقام الكلية (Aggregated Stats) */}
        <section style={styles.statsGrid}>
          <StatBox title="إجمالي مصروفات الشهر" value="1,240,500" color="#4a3e35" icon="📉" />
          <StatBox title="تكلفة العمالة الكلية" value="480,200" color="#c5a059" icon="👥" />
          <StatBox title="عدد المواقع النشطة" value="12" color="#2980b9" icon="🏗️" />
          <StatBox title="القوى العاملة اليوم" value="245" color="#27ae60" icon="👷" />
        </section>

        {/* 📊 4. التحليلات البصرية (Distribution Charts) */}
        <div style={styles.chartsRow}>
          {/* تحليل توزيع المصروفات */}
          <div style={styles.chartCard}>
            <h3 style={styles.cardTitle}>توزيع المصروفات التشغيلية</h3>
            <div style={styles.progressList}>
              <ProgressItem label="خامات وتوريدات" percent={60} color="#4a3e35" />
              <ProgressItem label="يوميات عمالة" percent={25} color="#c5a059" />
              <ProgressItem label="سلف ومصروفات إدارية" percent={15} color="#7f8c8d" />
            </div>
          </div>

          {/* تحليل كثافة العمالة في المواقع */}
          <div style={styles.chartCard}>
            <h3 style={styles.cardTitle}>كثافة العمالة بالمواقع (أعلى 4)</h3>
            <div style={styles.barChart}>
              <VerticalBar label="العاصمة" value={85} color="#2980b9" />
              <VerticalBar label="العلمين" value={65} color="#c5a059" />
              <VerticalBar label="المنصورة" value={45} color="#27ae60" />
              <VerticalBar label="الجلالة" value={30} color="#e74c3c" />
            </div>
          </div>
        </div>

        {/* 📋 5. ملخص القطاعات (Sector Summary) */}
        <section style={styles.tableSection}>
          <div style={styles.tableHeader}>
            <h3 style={{margin: 0}}>ملخص ميزانيات القطاعات</h3>
            <button style={styles.viewMoreBtn}>عرض كافة التقارير ←</button>
          </div>
          <table style={styles.mainTable}>
            <thead>
              <tr style={styles.trHead}>
                <th style={styles.th}>القطاع الإداري / الفني</th>
                <th style={styles.th}>إجمالي المنصرف</th>
                <th style={styles.th}>حصة العمالة</th>
                <th style={styles.th}>الميزانية المتبقية</th>
              </tr>
            </thead>
            <tbody>
              <tr style={styles.trBody}>
                <td style={styles.tdBold}>قطاع الإنشاءات والخرسانة</td>
                <td style={styles.td}>450,000 ج.م</td>
                <td style={styles.td}>120,000 ج.م</td>
                <td style={{...styles.td, color: '#27ae60'}}>600,000 ج.م</td>
              </tr>
              <tr style={styles.trBody}>
                <td style={styles.tdBold}>قطاع التشطيبات والديكور</td>
                <td style={styles.td}>280,000 ج.م</td>
                <td style={styles.td}>95,000 ج.م</td>
                <td style={{...styles.td, color: '#27ae60'}}>350,000 ج.م</td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

// --- Components ---
function StatBox({ title, value, color, icon }: any) {
  return (
    <div style={{...styles.statBox, borderTop: `4px solid ${color}`}}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statTitle}>{title}</div>
      <div style={styles.statValue}>{value} <small style={{fontSize: '12px'}}>ج.م</small></div>
    </div>
  );
}

function ProgressItem({ label, percent, color }: any) {
  return (
    <div style={styles.progressItem}>
      <div style={styles.progressLabel}><span>{label}</span> <span>{percent}%</span></div>
      <div style={styles.progressTrack}><div style={{...styles.progressFill, width: `${percent}%`, backgroundColor: color}}></div></div>
    </div>
  );
}

function VerticalBar({ label, value, color }: any) {
  return (
    <div style={styles.barWrapper}>
      <div style={{...styles.bar, height: `${value}%`, backgroundColor: color}}>
        <span style={styles.barValue}>{value}</span>
      </div>
      <div style={styles.barLabel}>{label}</div>
    </div>
  );
}

// --- Styles (Oracle Redwood x Rawasi Identity) ---
const styles: { [key: string]: React.CSSProperties } = {
  container: { backgroundColor: '#f4f1ea', minHeight: '100vh', direction: 'rtl', fontFamily: 'Arial, sans-serif' },
  header: { backgroundColor: '#fff', borderBottom: '2px solid #4a3e35', padding: '15px 50px' },
  headerContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' },
  brand: { display: 'flex', alignItems: 'center', gap: '15px' },
  logo: { width: '45px', height: '45px', backgroundColor: '#4a3e35', color: '#c5a059', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' },
  title: { fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#333' },
  erpTag: { fontSize: '12px', color: '#c5a059', marginRight: '5px' },
  subtitle: { fontSize: '12px', color: '#888', margin: 0 },
  userSection: { display: 'flex', alignItems: 'center', gap: '30px' },
  dateTime: { fontSize: '14px', color: '#4a3e35', fontWeight: 'bold' },
  refreshBtn: { padding: '8px 15px', backgroundColor: 'transparent', border: '1px solid #c5a059', color: '#c5a059', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },

  main: { padding: '30px 50px', maxWidth: '1400px', margin: '0 auto' },
  
  // Live Section
  liveSection: { backgroundColor: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #e0ddd5', marginBottom: '30px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' },
  liveHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' },
  liveBadge: { color: '#e74c3c', fontSize: '12px', fontWeight: 'bold' },
  liveTime: { color: '#999', fontSize: '11px' },
  liveBody: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  siteTitle: { fontSize: '22px', color: '#4a3e35', margin: '0 0 10px 0' },
  taskText: { fontSize: '14px', color: '#666', margin: '0 0 10px 0' },
  metaInfo: { fontSize: '13px', color: '#999' },
  livePrice: { textAlign: 'left', borderRight: '1px solid #eee', paddingRight: '40px' },
  priceLabel: { display: 'block', fontSize: '12px', color: '#888' },
  priceValue: { fontSize: '26px', fontWeight: 'bold', color: '#4a3e35' },

  // Stats Grid
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' },
  statBox: { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0ddd5', textAlign: 'center' },
  statIcon: { fontSize: '24px', marginBottom: '10px' },
  statTitle: { fontSize: '12px', color: '#888', marginBottom: '8px' },
  statValue: { fontSize: '22px', fontWeight: '900', color: '#333' },

  // Charts
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' },
  chartCard: { backgroundColor: '#fff', padding: '25px', borderRadius: '8px', border: '1px solid #e0ddd5' },
  cardTitle: { fontSize: '16px', fontWeight: 'bold', color: '#4a3e35', marginBottom: '20px', borderBottom: '1px solid #f4f1ea', paddingBottom: '10px' },
  progressItem: { marginBottom: '15px' },
  progressLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#666', marginBottom: '5px' },
  progressTrack: { height: '8px', backgroundColor: '#f4f1ea', borderRadius: '10px' },
  progressFill: { height: '100%', borderRadius: '10px' },
  barChart: { height: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '15px' },
  barWrapper: { textAlign: 'center', flex: 1 },
  bar: { width: '100%', borderRadius: '4px 4px 0 0', position: 'relative' },
  barValue: { position: 'absolute', top: '-20px', width: '100%', fontSize: '11px', fontWeight: 'bold' },
  barLabel: { fontSize: '11px', marginTop: '10px', color: '#888' },

  // Table
  tableSection: { backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e0ddd5', overflow: 'hidden' },
  tableHeader: { backgroundColor: '#4a3e35', color: '#fff', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  viewMoreBtn: { backgroundColor: 'transparent', border: 'none', color: '#c5a059', cursor: 'pointer', fontSize: '13px' },
  mainTable: { width: '100%', borderCollapse: 'collapse' },
  trHead: { backgroundColor: '#f8f9fa' },
  th: { padding: '15px', textAlign: 'right', fontSize: '13px', color: '#888' },
  trBody: { borderBottom: '1px solid #f4f1ea' },
  tdBold: { padding: '18px 25px', fontSize: '14px', fontWeight: 'bold', color: '#333' },
  td: { padding: '18px 25px', fontSize: '14px', color: '#666' },

  loader: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f1ea', color: '#4a3e35' }
};