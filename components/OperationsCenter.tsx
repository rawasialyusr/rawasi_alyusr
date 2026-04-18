"use client";
import React, { useState, useEffect } from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { calculateMassiveTotals } from '@/lib/accounting_engine'; // تأكد من وجود الملف في هذا المسار

export function OperationsCenter({ 
  title, searchQuery, onSearchChange, filtersSlot, 
  selectedCount, onAdd, onEdit, onDeleteSelected, onPostSelected, onUnpostSelected, kpis 
}: any) {
  const [isOpen, setIsOpen] = useState(false);
  
  // --- [جزء حسابات الإجماليات الضخمة] ---
  const [totals, setTotals] = useState({ invoices: 0, receipts: 0 });
  const [isFinLoading, setIsFinLoading] = useState(true);

  useEffect(() => {
    const fetchRealTotals = async () => {
      setIsFinLoading(true);
      try {
        const invResult: any = await calculateMassiveTotals('invoices', 'net_amount');
        const recResult: any = await calculateMassiveTotals('receipts', 'amount');
        
        setTotals({
          invoices: invResult?.success ? (invResult?.total || 0) : 0,
          receipts: recResult?.success ? (recResult?.total || 0) : 0
        });
      } catch (error) {
        console.error("Error fetching totals:", error);
      } finally {
        setIsFinLoading(false);
      }
    };

    if (isOpen) fetchRealTotals(); // يعمل فقط عند فتح السايد بار لتحسين الأداء
  }, [isOpen]);

  const hasSelection = selectedCount > 0;
  const isSingleSelection = selectedCount === 1;

  return (
    <>
      {/* 1. الزر العائم لفتح السايد بار */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed', top: '120px', right: isOpen ? '380px' : '0px',
          zIndex: 1001, background: THEME.primary, color: 'white',
          border: 'none', padding: '15px 20px', borderRadius: '12px 0 0 12px',
          cursor: 'pointer', transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '-5px 0 20px rgba(0,0,0,0.2)', fontWeight: 900,
          display: 'flex', alignItems: 'center', gap: '10px'
        }}
      >
        {isOpen ? '◀' : '⚙️ مركز العمليات'}
      </button>

      {/* 2. طبقة التعتيم الخلفية (Blur Overlay) */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)',
            zIndex: 999, backdropFilter: 'blur(4px)',
            transition: 'opacity 0.5s ease'
          }}
        />
      )}

      {/* 3. السايد بار الجلاسي (Glassy Sidebar) */}
      <div style={{
        position: 'fixed', top: 0, right: isOpen ? 0 : '-400px',
        width: '380px', height: '100vh', zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.7)', 
        backdropFilter: 'blur(30px) saturate(200%)',
        WebkitBackdropFilter: 'blur(30px) saturate(200%)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '-15px 0 40px rgba(0,0,0,0.15)',
        padding: '40px 25px', display: 'flex', flexDirection: 'column', gap: '25px',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        direction: 'rtl'
      }}>
        
        {/* العنوان */}
        <div style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '10px' }}>
            <h2 style={{ color: THEME.primary, fontWeight: 900, margin: 0, fontSize: '22px' }}>🎛️ {title}</h2>
            <p style={{ color: '#64748b', fontSize: '11px', marginTop: '5px' }}>الإحصائيات المباشرة والتحكم السينمائي</p>
        </div>

        {/* كروت الإحصائيات (الدمج بين الـ KPIs والـ Massive Totals) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.5)', padding: '12px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.8)' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>إجمالي الفواتير</div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: THEME.primary }}>{kpis?.total || 0}</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.5)', padding: '12px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.8)' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>الحالة: معتمد</div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: THEME.success }}>{kpis?.posted || 0}</div>
            </div>
            
            {/* كروت المحرك المحاسبي الضخم */}
            <div style={{ gridColumn: 'span 2', background: 'rgba(34, 197, 94, 0.1)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#166534' }}>سيولة الإيرادات الإجمالية</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#166534' }}>
                    {isFinLoading ? '...' : formatCurrency(totals.invoices)}
                </div>
            </div>
        </div>

        {/* البحث والفلترة */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary }}>🔍 البحث والفلترة</label>
            <input 
              type="text" placeholder="ابحث برقم أو اسم..." value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ 
                padding: '12px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', 
                background: 'rgba(255,255,255,0.6)', outline: 'none', fontSize: '14px'
              }}
            />
            {filtersSlot}
        </div>

        {/* 🚀 قسم الأزرار (إضافة، تعديل، حذف، ترحيل) */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* 1. زر الإضافة */}
            <button 
                onClick={() => { onAdd(); setIsOpen(false); }} 
                style={{ 
                    background: THEME.primary, color: 'white', border: 'none', 
                    padding: '16px', borderRadius: '15px', cursor: 'pointer', 
                    fontWeight: 900, fontSize: '16px', boxShadow: `0 8px 20px ${THEME.primary}40`
                }}
            >
               ➕ إضافة سجل جديد
            </button>

            {/* 2. قسم العمليات على المختار */}
            <div style={{ 
                maxHeight: hasSelection ? '400px' : '0', overflow: 'hidden', 
                transition: 'all 0.6s ease', display: 'flex', flexDirection: 'column', gap: '10px' 
            }}>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', margin: '5px 0' }}>عمليات على ({selectedCount}) سجل</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button onClick={onPostSelected} style={{ background: THEME.success, color: 'white', border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>✅ ترحيل</button>
                    <button onClick={onUnpostSelected} style={{ background: THEME.accent, color: 'white', border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>↩️ تراجع</button>
                </div>

                {isSingleSelection && (
                    <button onClick={() => { onEdit(); setIsOpen(false); }} style={{ background: '#e2e8f0', color: THEME.primary, border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>
                        📝 تعديل البيانات
                    </button>
                )}

                <button onClick={onDeleteSelected} style={{ background: 'rgba(153, 27, 27, 0.1)', color: THEME.ruby, border: `1px solid ${THEME.ruby}`, padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                    🗑️ حذف السجلات
                </button>
            </div>
        </div>

      </div>
    </>
  );
}

export function PaginationPanel({ totalItems, currentPage, rowsPerPage, onPageChange, onRowsChange }: any) {
    const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '15px 25px', borderRadius: '15px', marginTop: '20px', direction: 'rtl', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
          <span>عرض:</span>
          <select value={rowsPerPage} onChange={(e) => onRowsChange(Number(e.target.value))} style={{ padding: '5px', borderRadius: '8px', border: '1px solid #ddd' }}>
            {[50, 100, 500, 1000].map(n => <option key={n} value={n}>{n} صف</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} style={{ padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #eee' }}>السابق</button>
          <span style={{ fontWeight: 900, color: THEME.primary }}>{currentPage} من {totalPages}</span>
          <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #eee' }}>التالي</button>
        </div>
      </div>
    );
}export default OperationsCenter;