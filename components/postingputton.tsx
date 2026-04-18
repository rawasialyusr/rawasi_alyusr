"use client";
import React from 'react';
import { THEME } from '@/lib/theme';

// ==========================================
// 1. واجهة البيانات (Types)
// ==========================================
interface KPI {
  title: string;
  value: string | number;
  color: string;
  icon: string;
}

interface OperationsCenterProps {
  title: string;
  kpis: KPI[];
  
  // دوال البحث والفلترة
  searchQuery: string;
  onSearchChange: (val: string) => void;
  filtersSlot?: React.ReactNode; // مساحة حرة لإضافة فلاتر التاريخ أو القوائم

  // الأزرار والإجراءات
  selectedCount: number; // عدد الصفوف المحددة لتفعيل أزرار (الترحيل والحذف)
  onAdd: () => void;
  onDeleteSelected: () => void;
  onPostSelected: () => void;
  onUnpostSelected: () => void;
}

// ==========================================
// 2. المكون الرئيسي: مركز العمليات (علوي)
// ==========================================
export function OperationsCenter({ 
  title, kpis, 
  searchQuery, onSearchChange, filtersSlot, 
  selectedCount, onAdd, onDeleteSelected, onPostSelected, onUnpostSelected 
}: OperationsCenterProps) {
  
  const hasSelection = selectedCount > 0;

  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '25px', direction: 'rtl' }}>
      
      {/* الجزء الأول: العنوان والـ KPIs (Summary Cards) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
        <h2 style={{ margin: 0, color: THEME.primary, fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}>
          🎛️ {title}
        </h2>

        <div style={{ display: 'flex', gap: '15px' }}>
          {kpis.map((kpi, idx) => (
            <div key={idx} style={{ background: `${kpi.color}15`, border: `1px solid ${kpi.color}30`, padding: '10px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '15px', minWidth: '150px' }}>
               <span style={{ fontSize: '24px' }}>{kpi.icon}</span>
               <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>{kpi.title}</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: kpi.color }}>{kpi.value}</div>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* الجزء الثاني: شريط الأدوات (البحث + الفلاتر + الأزرار) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        
        {/* البحث والفلاتر الإضافية */}
        <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '300px' }}>
          <input 
            type="text" 
            placeholder="🔍 بحث سريع..." 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ padding: '10px 15px', border: `1px solid ${THEME.border}`, borderRadius: '8px', width: '250px', outline: 'none' }}
          />
          {filtersSlot} {/* هنا سيتم إدخال فلاتر التاريخ من الصفحة الأب */}
        </div>

        {/* أزرار العمليات (فردية وجماعية) */}
        <div style={{ display: 'flex', gap: '10px' }}>
          
          {/* أزرار تظهر فقط عند تحديد صفوف */}
          {hasSelection && (
            <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '5px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <span style={{ padding: '5px 10px', fontSize: '12px', fontWeight: 'bold', color: '#64748b', alignSelf: 'center' }}>
                محدد: {selectedCount}
              </span>
              <button onClick={onPostSelected} style={{ background: THEME.success, color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✅ ترحيل المختار</button>
              <button onClick={onUnpostSelected} style={{ background: THEME.accent, color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>↩️ إلغاء الترحيل</button>
              <button onClick={onDeleteSelected} style={{ background: '#fee2e2', color: THEME.ruby, border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ حذف</button>
            </div>
          )}

          {/* زر الإضافة الأساسي (دائماً ظاهر) */}
          <button onClick={onAdd} style={{ background: THEME.primary, color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            ➕ إضافة جديد
          </button>
        </div>

      </div>
    </div>
  );
}

// ==========================================
// 3. مكون الفلترة السفلية: تغيير الصفحات والصفوف
// ==========================================
interface PaginationPanelProps {
  totalItems: number;
  currentPage: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsChange: (rows: number) => void;
}

export function PaginationPanel({ totalItems, currentPage, rowsPerPage, onPageChange, onRowsChange }: PaginationPanelProps) {
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '15px 20px', borderRadius: '10px', marginTop: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', direction: 'rtl' }}>
      
      {/* تغيير عدد الصفوف */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#475569' }}>
        <span>عرض:</span>
        <select 
          value={rowsPerPage} 
          onChange={(e) => onRowsChange(Number(e.target.value))}
          style={{ padding: '5px 10px', border: `1px solid ${THEME.border}`, borderRadius: '6px', cursor: 'pointer' }}
        >
          <option value={50}>50 صف</option>
          <option value={100}>100 صف</option>
          <option value={500}>500 صف</option>
          <option value={1000}>1000 صف</option>
        </select>
        <span>من إجمالي <strong>{totalItems}</strong> سجل</span>
      </div>

      {/* أزرار التنقل بين الصفحات */}
      <div style={{ display: 'flex', gap: '5px' }}>
        <button 
          onClick={() => onPageChange(currentPage - 1)} 
          disabled={currentPage === 1}
          style={{ padding: '6px 15px', border: `1px solid ${THEME.border}`, background: currentPage === 1 ? '#f1f5f9' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', borderRadius: '6px' }}
        >
          السابق
        </button>
        
        <span style={{ padding: '6px 15px', background: THEME.primary, color: 'white', borderRadius: '6px', fontWeight: 'bold' }}>
          {currentPage} / {totalPages}
        </span>

        <button 
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={currentPage === totalPages}
          style={{ padding: '6px 15px', border: `1px solid ${THEME.border}`, background: currentPage === totalPages ? '#f1f5f9' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', borderRadius: '6px' }}
        >
          التالي
        </button>
      </div>

    </div>
  );
}