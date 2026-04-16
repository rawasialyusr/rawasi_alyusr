"use client";
import { useState } from 'react';

export default function ReportsPage() {
  const [selectedSite, setSelectedSite] = useState('الكل');

  // بيانات افتراضية للتقارير
  const reportData = [
    { id: 101, date: "2026-04-10", site: "فيلا 1010 - العلمين", category: "عمالة", amount: 5000, details: "يومية مبيضين ومساعدين" },
    { id: 102, date: "2026-04-09", site: "برج الرواسي - العاصمة", category: "خامات", amount: 12000, details: "توريد رمل وأسمنت" },
    { id: 103, date: "2026-04-08", site: "فيلا 1010 - العلمين", category: "نثريات", amount: 1500, details: "إعاشة وضيافة موقع" },
    { id: 104, date: "2026-04-07", site: "مجمع الجلالة", category: "عمالة", amount: 8000, details: "حدادة مسلحة - أساسات" },
  ];

  return (
    <div style={styles.container}>
      <style>{`
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .filter-row { flex-direction: column; gap: 10px; }
          .report-table { display: block; overflow-x: auto; }
          .hide-mobile { display: none; }
        }
      `}</style>

      {/* 🔝 الهيدر */}
      <div style={styles.header}>
        <h1 style={styles.title}>📊 تقارير المصروفات والعمليات</h1>
        <p style={styles.subtitle}>عرض وتحليل البيانات المالية للمشاريع</p>
      </div>

      {/* 🔍 أدوات الفلترة */}
      <div style={styles.filterRow} className="filter-row">
        <select 
          style={styles.select} 
          onChange={(e) => setSelectedSite(e.target.value)}
        >
          <option>الكل (كافة المواقع)</option>
          <option>فيلا 1010 - العلمين</option>
          <option>برج الرواسي - العاصمة</option>
          <option>مجمع الجلالة</option>
        </select>
        <div style={styles.dateGroup}>
          <input type="date" style={styles.input} />
          <span style={{color: '#888'}}>إلى</span>
          <input type="date" style={styles.input} />
        </div>
        <button style={styles.printBtn}>🖨️ طباعة تقرير PDF</button>
      </div>

      {/* 💰 ملخص مالي سريع */}
      <div style={styles.statsGrid} className="stats-grid">
        <div style={{...styles.statBox, borderRight: '5px solid #c5a059'}}>
          <span style={styles.statLabel}>إجمالي المنصرف</span>
          <span style={styles.statValue}>26,500 <small>ج.م</small></span>
        </div>
        <div style={{...styles.statBox, borderRight: '5px solid #27ae60'}}>
          <span style={styles.statLabel}>بند العمالة</span>
          <span style={styles.statValue}>13,000 <small>ج.م</small></span>
        </div>
        <div style={{...styles.statBox, borderRight: '5px solid #2980b9'}}>
          <span style={styles.statLabel}>بند التوريدات</span>
          <span style={styles.statValue}>12,000 <small>ج.م</small></span>
        </div>
      </div>

      {/* 📋 الجدول التفصيلي */}
      <div style={styles.tableCard}>
        <table style={styles.table} className="report-table">
          <thead>
            <tr style={styles.trHead}>
              <th style={styles.th}>التاريخ</th>
              <th style={styles.th}>الموقع</th>
              <th style={styles.th}>البند</th>
              <th style={styles.th}>المبلغ</th>
              <th style={{...styles.th, textAlign: 'right'}} className="hide-mobile">التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item) => (
              <tr key={item.id} style={styles.trBody}>
                <td style={styles.td}>{item.date}</td>
                <td style={{...styles.td, fontWeight: 'bold'}}>{item.site}</td>
                <td style={styles.td}>
                  <span style={styles.categoryBadge}>{item.category}</span>
                </td>
                <td style={{...styles.td, color: '#e74c3c', fontWeight: 'bold'}}>{item.amount.toLocaleString()}</td>
                <td style={styles.td} className="hide-mobile">{item.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '30px', backgroundColor: '#f4f1ea', minHeight: '100vh', direction: 'rtl' },
  header: { marginBottom: '30px', borderBottom: '2px solid #c5a059', paddingBottom: '15px' },
  title: { fontSize: '24px', color: '#4a3e35', margin: 0 },
  subtitle: { fontSize: '14px', color: '#888', marginTop: '5px' },

  filterRow: { display: 'flex', gap: '20px', marginBottom: '30px', alignItems: 'center', flexWrap: 'wrap' },
  select: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minWidth: '200px', outline: 'none' },
  dateGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  input: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' },
  printBtn: { padding: '10px 20px', backgroundColor: '#4a3e35', color: '#c5a059', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' },
  statBox: { backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  statLabel: { display: 'block', fontSize: '12px', color: '#888', marginBottom: '10px' },
  statValue: { fontSize: '22px', fontWeight: 'bold', color: '#4a3e35' },

  tableCard: { backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  trHead: { backgroundColor: '#4a3e35' },
  th: { padding: '15px', color: '#c5a059', textAlign: 'right', fontSize: '14px' },
  trBody: { borderBottom: '1px solid #eee' },
  td: { padding: '15px', fontSize: '13px', color: '#444' },
  categoryBadge: { padding: '4px 8px', backgroundColor: '#f4f1ea', borderRadius: '5px', fontSize: '11px', color: '#4a3e35' },
};