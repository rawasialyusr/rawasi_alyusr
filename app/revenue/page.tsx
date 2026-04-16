"use client";
import { useState } from 'react';

export default function DetailedExpensesPage() {
  // بيانات افتراضية مفصلة للمصروفات
  const [expenses, setExpenses] = useState([
    { id: 1, invoiceNo: 'INV-1042', date: '2026-04-10', site: 'فيلا 1010 - العلمين', category: 'خامات ومواد', item: 'رمل وأسمنت بورتلاندي', vendor: 'مورد الأمل', method: 'تحويل بنكي', hasAttachment: true, amount: 15000 },
    { id: 2, invoiceNo: 'REC-089', date: '2026-04-09', site: 'برج الرواسي - العاصمة', category: 'نثريات', item: 'بنزين وزيوت معدات', vendor: 'محطة الوطنية', method: 'عهدة مهندس', hasAttachment: true, amount: 1200 },
    { id: 3, invoiceNo: 'INV-1045', date: '2026-04-08', site: 'مجمع الجلالة السكني', category: 'إيجار معدات', item: 'إيجار حفار كاتربيلر', vendor: 'شركة المعدات', method: 'شيك مؤجل', hasAttachment: false, amount: 8000 },
    { id: 4, invoiceNo: 'VOU-012', date: '2026-04-08', site: 'الإدارة العامة', category: 'مصروفات إدارية', item: 'أدوات مكتبية وبوفيه', vendor: 'مكتبة جرير', method: 'كاش خزنة', hasAttachment: true, amount: 650 },
    { id: 5, invoiceNo: 'SUB-003', date: '2026-04-07', site: 'فيلا 1010 - العلمين', category: 'مقاول باطن', item: 'دفعة مقاول المحارة', vendor: 'م. سيد عبدالتواب', method: 'تحويل بنكي', hasAttachment: true, amount: 25000 },
  ]);

  // فلاتر البحث
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSite, setFilterSite] = useState('الكل');
  const [filterCategory, setFilterCategory] = useState('الكل');

  // تطبيق الفلاتر على البيانات
  const filteredExpenses = expenses.filter(exp => {
    const matchSearch = exp.item.includes(searchTerm) || exp.invoiceNo.includes(searchTerm) || exp.vendor.includes(searchTerm);
    const matchSite = filterSite === 'الكل' || exp.site === filterSite;
    const matchCategory = filterCategory === 'الكل' || exp.category === filterCategory;
    return matchSearch && matchSite && matchCategory;
  });

  // حساب الإحصائيات (بناءً على الفلتر الحالي)
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const materialsAmount = filteredExpenses.filter(e => e.category === 'خامات ومواد').reduce((sum, exp) => sum + exp.amount, 0);
  const equipmentAmount = filteredExpenses.filter(e => e.category === 'إيجار معدات').reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div style={styles.container}>
      <style>{`
        @media (max-width: 768px) {
          .header-flex { flex-direction: column; align-items: flex-start !important; gap: 15px; }
          .stats-grid { grid-template-columns: 1fr !important; }
          .filters-row { flex-direction: column; }
          .table-wrapper { overflow-x: auto; }
        }
      `}</style>

      {/* 🔝 الهيدر */}
      <div style={styles.header} className="header-flex">
        <div>
          <h1 style={styles.title}>💸 سجل المصروفات التفصيلي</h1>
          <p style={styles.subtitle}>متابعة كافة التدفقات النقدية الخارجة وتوجيهها المحاسبي</p>
        </div>
        <div style={styles.headerActions}>
          <button style={{...styles.actionBtn, backgroundColor: '#fff', color: '#4a3e35', border: '1px solid #4a3e35'}}>🖨️ طباعة كشف</button>
          <button style={{...styles.actionBtn, backgroundColor: '#e74c3c', color: '#fff', border: 'none'}}>+ سند صرف جديد</button>
        </div>
      </div>

      {/* 📊 الإحصائيات السريعة */}
      <div style={styles.statsGrid} className="stats-grid">
        <div style={{...styles.statCard, borderTop: '4px solid #e74c3c'}}>
          <span style={styles.statLabel}>إجمالي المنصرف (للفلتر الحالي)</span>
          <strong style={{...styles.statValue, color: '#e74c3c'}}>{totalAmount.toLocaleString()} <small>ج.م</small></strong>
        </div>
        <div style={{...styles.statCard, borderTop: '4px solid #c5a059'}}>
          <span style={styles.statLabel}>مسحوبات الخامات والمواد</span>
          <strong style={styles.statValue}>{materialsAmount.toLocaleString()} <small>ج.م</small></strong>
        </div>
        <div style={{...styles.statCard, borderTop: '4px solid #2980b9'}}>
          <span style={styles.statLabel}>إيجارات المعدات</span>
          <strong style={styles.statValue}>{equipmentAmount.toLocaleString()} <small>ج.م</small></strong>
        </div>
      </div>

      {/* 🔍 شريط الفلاتر */}
      <div style={styles.filtersContainer} className="filters-row">
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>بحث حر</label>
          <input 
            type="text" 
            placeholder="رقم الفاتورة، البيان، أو المورد..." 
            style={styles.input}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>توجيه المشروع</label>
          <select style={styles.input} onChange={(e) => setFilterSite(e.target.value)}>
            <option value="الكل">كافة المشاريع</option>
            <option value="فيلا 1010 - العلمين">فيلا 1010 - العلمين</option>
            <option value="برج الرواسي - العاصمة">برج الرواسي - العاصمة</option>
            <option value="الإدارة العامة">الإدارة العامة</option>
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>تصنيف المصروف</label>
          <select style={styles.input} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="الكل">كافة التصنيفات</option>
            <option value="خامات ومواد">خامات ومواد</option>
            <option value="إيجار معدات">إيجار معدات</option>
            <option value="مقاول باطن">مقاول باطن</option>
            <option value="نثريات">نثريات وضيافة</option>
          </select>
        </div>
      </div>

      {/* 📋 الجدول التفصيلي */}
      <div style={styles.tableCard} className="table-wrapper">
        <table style={styles.table}>
          <thead>
            <tr style={styles.trHead}>
              <th style={styles.th}>المستند</th>
              <th style={styles.th}>التاريخ</th>
              <th style={styles.th}>التوجيه / المشروع</th>
              <th style={styles.th}>التصنيف</th>
              <th style={styles.th}>البيان والمورد</th>
              <th style={styles.th}>طريقة الدفع</th>
              <th style={{...styles.th, textAlign: 'left'}}>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length > 0 ? filteredExpenses.map(exp => (
              <tr key={exp.id} style={styles.trBody}>
                <td style={styles.td}>
                  <div style={styles.docInfo}>
                    <span style={styles.invoiceNo}>{exp.invoiceNo}</span>
                    {exp.hasAttachment && <span title="يوجد مرفق" style={{fontSize:'12px'}}>📎</span>}
                  </div>
                </td>
                <td style={styles.td}>{exp.date}</td>
                <td style={{...styles.td, fontWeight: 'bold'}}>{exp.site}</td>
                <td style={styles.td}>
                  <span style={styles.categoryBadge}>{exp.category}</span>
                </td>
                <td style={styles.td}>
                  <div style={{color: '#333', fontWeight: 'bold', marginBottom: '3px'}}>{exp.item}</div>
                  <div style={{color: '#888', fontSize: '11px'}}>المورد: {exp.vendor}</div>
                </td>
                <td style={styles.td}>
                  <span style={styles.methodBadge}>{exp.method}</span>
                </td>
                <td style={{...styles.td, color: '#e74c3c', fontWeight: '900', fontSize: '16px', textAlign: 'left'}}>
                  {exp.amount.toLocaleString()} ج.م
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} style={{padding: '30px', textAlign: 'center', color: '#888'}}>لا توجد مصروفات تطابق شروط البحث</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '30px', backgroundColor: '#f4f1ea', minHeight: '100vh', direction: 'rtl', fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  title: { fontSize: '24px', color: '#4a3e35', fontWeight: 'bold', margin: 0 },
  subtitle: { fontSize: '14px', color: '#888', margin: '5px 0 0 0' },
  headerActions: { display: 'flex', gap: '10px' },
  actionBtn: { padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: '0.3s' },
  
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '25px' },
  statCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '8px' },
  statLabel: { fontSize: '13px', color: '#666', fontWeight: 'bold' },
  statValue: { fontSize: '22px', color: '#4a3e35' },

  filtersContainer: { display: 'flex', gap: '15px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '25px', border: '1px solid #e0ddd5' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
  filterLabel: { fontSize: '12px', color: '#888', fontWeight: 'bold' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', backgroundColor: '#fdfbf7', fontSize: '14px' },

  tableCard: { backgroundColor: '#fff', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 5px 15px rgba(0,0,0,0.03)', border: '1px solid #e0ddd5' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '950px' },
  trHead: { backgroundColor: '#4a3e35' },
  th: { padding: '15px 20px', color: '#c5a059', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' },
  trBody: { borderBottom: '1px solid #f4f1ea' },
  td: { padding: '15px 20px', fontSize: '13px', color: '#444', verticalAlign: 'middle' },
  
  docInfo: { display: 'flex', alignItems: 'center', gap: '8px' },
  invoiceNo: { backgroundColor: '#f0ede4', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', color: '#4a3e35' },
  categoryBadge: { padding: '6px 10px', backgroundColor: '#fcfaf7', border: '1px solid #ddd', color: '#555', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' },
  methodBadge: { padding: '4px 10px', backgroundColor: '#eef2f5', color: '#2c3e50', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }
};