import React from 'react';
import { formatCurrency } from '@/lib/helpers';
import { THEME } from '@/lib/theme';

export default function ProjectReportModal({ isOpen, onClose, logic, boqStats, flatBoqData }: any) {
  if (!isOpen) return null;

  const project = logic.selectedProject || {};
  const expenses = logic.projectDetails?.expenses || []; // 🚀 سحب المصروفات من السيرفر
  const today = new Date().toLocaleDateString('ar-EG');

  // حساب إجمالي المصروفات الفعلية لتذييل الجدول
  const totalActualExpenses = expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* 🚀 كود CSS السحري للطباعة المرفق داخل المودال */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; background: white; }
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 15mm; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col relative">
        
        {/* شريط التحكم (يختفي في الطباعة) */}
        <div className="no-print sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center z-10">
          <h2 style={{ color: THEME.coffeeDark, fontWeight: 900, fontSize: '18px', margin: 0 }}>🖨️ معاينة التقرير المالي والفني</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => window.print()} style={{ backgroundColor: THEME.primary, color: 'white', padding: '8px 20px', borderRadius: '8px', fontWeight: 800, display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>🖨️</span> طباعة الآن
            </button>
            <button onClick={onClose} style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '8px 20px', borderRadius: '8px', fontWeight: 800 }}>
              إغلاق
            </button>
          </div>
        </div>

        {/* 📄 بداية الورقة الرسمية (التي ستطبع) */}
        <div id="printable-report" style={{ padding: '40px', color: '#1e293b', direction: 'rtl', backgroundColor: 'white' }}>
          
          {/* الترويسة Header */}
          <div style={{ display: 'flex', justifyContenثt: 'space-between', borderBottom: `3px solid ${THEME.primary}`, paddingBottom: '20px', marginBottom: '30px' }}>
            <div>
              <h1 style={{ margin: 0, color: THEME.coffeeDark, fontWeight: 900, fontSize: '24px' }}>التقرير المالي والتحليلي للمشروع</h1>
              <p style={{ margin: '5px 0 0 0', color: '#64748b', fontWeight: 800 }}>تاريخ الإصدار: {today}</p>
            </div>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ margin: 0, color: THEME.primary, fontWeight: 900 }}>إدارة المشاريع والتكاليف</h2>
              <p style={{ margin: '5px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '12px' }}>نظام الرقابة المالية</p>
            </div>
          </div>

          {/* بيانات المشروع */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div><strong style={{ color: '#64748b' }}>اسم المشروع / العقار:</strong> <span style={{ fontWeight: 900, fontSize: '16px' }}>{project.Property}</span></div>
            <div><strong style={{ color: '#64748b' }}>العميل المالك:</strong> <span style={{ fontWeight: 900 }}>{project.client?.name || 'غير محدد'}</span></div>
            <div><strong style={{ color: '#64748b' }}>حالة المشروع:</strong> <span style={{ fontWeight: 900 }}>{project.status}</span></div>
            <div><strong style={{ color: '#64748b' }}>مدير المشروع:</strong> <span style={{ fontWeight: 900 }}>{project.project_manager || 'غير محدد'}</span></div>
          </div>

          {/* ملخص التحليل المالي الكلي */}
          <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', color: THEME.coffeeDark, fontWeight: 900 }}>📊 الملخص المالي التقديري (من المقايسة)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '40px' }}>
            <div style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 800 }}>إجمالي قيمة التعاقد</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: THEME.coffeeDark }}>{formatCurrency(boqStats.totalContractValue)}</div>
            </div>
            <div style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 800 }}>إجمالي التكاليف المقدرة</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: THEME.danger }}>
                {formatCurrency(boqStats.totalEstimatedLabor + boqStats.totalEstimatedMaterial + boqStats.totalEstimatedExpenses)}
              </div>
            </div>
            <div style={{ padding: '15px', border: `1px solid ${boqStats.isLoss ? THEME.danger : THEME.success}`, backgroundColor: boqStats.isLoss ? '#FEF2F2' : '#F0FDF4', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: boqStats.isLoss ? THEME.danger : '#166534', fontWeight: 800 }}>{boqStats.isLoss ? 'خسارة متوقعة' : 'صافي الربح المتوقع'}</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: boqStats.isLoss ? THEME.danger : THEME.success }}>{formatCurrency(boqStats.expectedProfit)}</div>
            </div>
            <div style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 800 }}>هامش الربح</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#1e293b', direction: 'ltr' }}>{boqStats.profitMargin}%</div>
            </div>
          </div>

          {/* 📋 جدول المقايسة (بدون أي شُرط، إظهار كامل للأرقام) */}
          <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', color: THEME.coffeeDark, fontWeight: 900 }}>📋 التفاصيل الإنشائية والمالية للبنود (WBS)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 900 }}>البند / المرحلة</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: 900 }}>الكمية</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: 900 }}>سعر البيع</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: 900 }}>إجمالي البند</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: 900 }}>التكلفة المقدرة</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: 900 }}>الربح المتوقع</th>
              </tr>
            </thead>
            <tbody>
              {flatBoqData.map((row: any, idx: number) => {
                const isMain = row.item_type === 'رئيسي';
                const itemRevenue = Number(row.contract_quantity || 0) * Number(row.unit_contract_price || 0);
                const itemCost = Number(row.estimated_labor_cost || 0) + Number(row.estimated_operational_cost || 0) + Number(row.estimated_expenses_cost || 0);
                const itemProfit = itemRevenue - itemCost;

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: isMain ? '#f1f5f9' : 'transparent' }}>
                    <td style={{ padding: '10px', fontWeight: isMain ? 900 : 700 }}>
                      {isMain ? `📂 ${row.work_item}` : `↪️ ${row.work_item}`}
                    </td>
                    {/* 🚀 الأرقام ظاهرة للجميع بدون إخفاء */}
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800 }}>{row.contract_quantity} {row.unit}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800 }}>{formatCurrency(row.unit_contract_price)}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 900, color: THEME.coffeeDark }}>{formatCurrency(itemRevenue)}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 900, color: THEME.danger }}>{formatCurrency(itemCost)}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 900, color: itemProfit < 0 ? THEME.danger : THEME.success }}>
                      {formatCurrency(itemProfit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 💸 جدول المصروفات الفعلية (الجديد والمطلوب للتقرير) */}
          {expenses.length > 0 && (
            <div className="page-break">
              <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', color: THEME.coffeeDark, fontWeight: 900, marginTop: '20px' }}>
                💸 بيان التكاليف والمصروفات الفعلية المنصرفة للموقع
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px', textAlign: 'right', fontWeight: 900 }}>التاريخ</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontWeight: 900 }}>البيان / الوصف</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontWeight: 900 }}>التصنيف</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontWeight: 900 }}>المستفيد / المقاول</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontWeight: 900 }}>القيمة الفعلية</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#475569' }}>{exp.display_date}</td>
                      <td style={{ padding: '10px', fontWeight: 800 }}>{exp.description}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: THEME.primary }}>{exp.category}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>{exp.payee}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 900, color: THEME.danger }}>
                        {formatCurrency(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan={4} style={{ padding: '15px 10px', textAlign: 'left', fontWeight: 900, fontSize: '14px' }}>
                      إجمالي التكاليف الفعلية المنصرفة:
                    </td>
                    <td style={{ padding: '15px 10px', textAlign: 'center', fontWeight: 900, color: THEME.danger, fontSize: '15px' }}>
                      {formatCurrency(totalActualExpenses)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* التوقيعات Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', paddingTop: '20px', pageBreakInside: 'avoid' }}>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <strong style={{ display: 'block', color: THEME.coffeeDark, marginBottom: '40px' }}>المهندس المسئول</strong>
              <div style={{ borderBottom: '1px solid #94a3b8' }}></div>
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <strong style={{ display: 'block', color: THEME.coffeeDark, marginBottom: '40px' }}>المدير المالي</strong>
              <div style={{ borderBottom: '1px solid #94a3b8' }}></div>
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <strong style={{ display: 'block', color: THEME.coffeeDark, marginBottom: '40px' }}>اعتماد الإدارة</strong>
              <div style={{ borderBottom: '1px solid #94a3b8' }}></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}