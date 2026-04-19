"use client";
import React from 'react';
import { useRevenueLogic } from './revenue_logic';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { OperationsCenter, PaginationPanel } from '@/components/postingputton';

export default function RevenuePage() {
  const {
    data, totalItems, kpis, isLoading, permissions,
    globalSearch, setGlobalSearch,
    dateFrom, setDateFrom, dateTo, setDateTo,
    currentPage, setCurrentPage, rowsPerPage, setRowsPerPage, refresh
  } = useRevenueLogic();

  // 🛡️ فحص صلاحية الرؤية
  if (!isLoading && permissions && permissions.view === false) {
      return <div style={{ padding: '50px', textAlign: 'center', color: THEME.ruby }}>🚫 ليس لديك صلاحية لعرض هذه الشاشة.</div>;
  }

  // إعداد مؤشرات الأداء للسايد بار
  const sidebarKPIs = [
    { title: 'الإيراد الصافي (المحقق)', value: formatCurrency(kpis.netRevenue), color: THEME.success, icon: '📈' },
    { title: 'إجمالي الضرائب المحصلة', value: formatCurrency(kpis.totalTax), color: THEME.accent, icon: '🏛️' },
    { title: 'إجمالي الخصومات والضمان', value: formatCurrency(kpis.totalDiscounts), color: THEME.ruby, icon: '✂️' },
  ];

  return (
    <div style={{ padding: '20px', background: THEME.slate, minHeight: '100vh', direction: 'rtl', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
      
      {/* 📱 دعم الموبايل: الكنترول بياخد 100% على الشاشات الصغيرة */}
      <style>{`
        .main-content { flex: 1; min-width: 0; }
        .table-container { background: white; border-radius: 12px; overflow-x: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .table-responsive { width: 100%; min-width: 900px; border-collapse: collapse; }
        .table-responsive th { background: ${THEME.primary}; color: white; padding: 15px; text-align: right; white-space: nowrap; }
        .table-responsive td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
        @media (max-width: 768px) {
           .main-content { min-width: 100%; }
        }
      `}</style>

      {/* 🛡️ مركز العمليات (المكون المشترك) */}
      <OperationsCenter 
        title="سجل الإيرادات المحققة"
        searchQuery={globalSearch}
        onSearchChange={setGlobalSearch}
        kpis={sidebarKPIs} 
        
        // 🔐 إخفاء أزرار الإضافة لو مفيش صلاحية
        onAdd={permissions?.add ? () => alert("إضافة إيراد يدوي") : undefined}
        addText="إيراد يدوي جديد"
        
        filtersSlot={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px', background: 'rgba(0,0,0,0.02)', borderRadius: '10px', marginTop: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>الفترة الزمنية:</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
          </div>
        }
      />

      {/* 📄 المحتوى الرئيسي */}
      <div className="main-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <h1 style={{ color: THEME.primary, fontWeight: 900, margin: 0 }}>📊 تفصيل الإيرادات</h1>
             <button onClick={refresh} style={{ padding: '8px 15px', borderRadius: '8px', background: 'white', border: `1px solid ${THEME.border}`, cursor: 'pointer' }}>🔄 تحديث</button>
          </div>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '100px', color: THEME.primary, fontWeight: 'bold' }}>⏳ جاري تحميل السجلات...</div>
          ) : (
            <>
              <div className="table-container">
                <table className="table-responsive">
                  <thead>
                    <tr>
                      <th>رقم المرجع</th>
                      <th>التاريخ</th>
                      <th>البيان / العميل</th>
                      <th>الإجمالي</th>
                      <th>الخصم والضمان</th>
                      <th>الضريبة</th>
                      <th style={{ textAlign: 'center' }}>الصافي المحقق</th>
                      {permissions?.edit && <th style={{ textAlign: 'center' }}>إجراء</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row: any) => (
                      <tr key={row.id}>
                        <td style={{ fontWeight: 'bold', color: THEME.primary }}>#{row.invoice_number || '---'}</td>
                        <td>{new Date(row.date).toLocaleDateString('ar-EG')}</td>
                        <td>
                          <div style={{ fontWeight: 'bold' }}>{row.partners?.name || row.client_name || 'عميل نقدي'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{row.description || 'إيراد خدمات'}</div>
                        </td>
                        <td>{formatCurrency(row.line_total)}</td>
                        <td style={{ color: THEME.ruby }}>
                           {formatCurrency((Number(row.materials_discount) || 0) + (Number(row.guarantee_amount) || 0))}
                        </td>
                        <td style={{ color: THEME.accent }}>{formatCurrency(row.tax_amount)}</td>
                        <td style={{ textAlign: 'center', fontWeight: 900, color: THEME.success, background: '#f0fdf4' }}>
                          {formatCurrency(row.total_amount)}
                        </td>
                        
                        {/* 🔐 زر التعديل مرتبط بالصلاحيات */}
                        {permissions?.edit && (
                            <td style={{ textAlign: 'center' }}>
                                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} title="التفاصيل">⚙️</button>
                            </td>
                        )}
                      </tr>
                    ))}
                    {data.length === 0 && (
                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>لا توجد إيرادات محققة في هذه الفترة.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <PaginationPanel 
                totalItems={totalItems}
                currentPage={currentPage}
                rowsPerPage={rowsPerPage}
                onPageChange={setCurrentPage}
                onRowsChange={setRowsPerPage}
              />
            </>
          )}
      </div>
    </div>
  );
}