import React, { useMemo } from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import RawasiSmartTable from '@/components/rawasismarttable';
import { StatusBadge } from './SharedUI';

export default function FinancialsTab({ logic }: { logic: any }) {
  const financials = logic.projectDetails.invoices || [];

  // 🧠 حسبة مالية ذكية لفصل إيرادات العميل عن التزامات مقاولي الباطن
  const financialStats = useMemo(() => {
    let clientTotal = 0;
    let subContractorTotal = 0;

    financials.forEach((item: any) => {
      const amount = Number(item.final_amount || 0);
      if (item.display_type?.includes('مقاول')) {
        subContractorTotal += amount;
      } else {
        clientTotal += amount;
      }
    });

    return { clientTotal, subContractorTotal };
  }, [financials]);

  const invoiceColumns = [
    { 
        header: 'التاريخ', 
        render: (row: any) => row.date || row.created_at?.split('T')[0] || '---' 
    },
    { 
        header: 'الرقم / النوع', 
        render: (row: any) => (
            <div>
                <strong style={{ color: THEME.primary, fontSize: '14px' }}>
                    {row.display_number || row.invoice_number || '---'}
                </strong>
                <br/>
                <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 900,
                    color: row.display_type?.includes('مقاول') ? '#0369A1' : '#166534',
                    backgroundColor: row.display_type?.includes('مقاول') ? '#E0F2FE' : '#DCFCE7',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginTop: '4px',
                    display: 'inline-block'
                }}>
                    {row.display_type || 'مستخلص عام'}
                </span>
            </div>
        ) 
    },
    {
        header: 'البيان / الوصف',
        render: (row: any) => (
            <span style={{ fontWeight: 700, color: '#475569' }}>
                {row.description || row.notes || 'مستخلص أعمال جارية'}
            </span>
        )
    },
    { 
        header: 'المبلغ الصافي المعتمد', 
        render: (row: any) => (
            <span style={{ 
                fontWeight: 900, 
                color: row.display_type?.includes('مقاول') ? THEME.danger : THEME.success, 
                fontSize: '15px' 
            }}>
                {formatCurrency(row.final_amount || 0)}
            </span>
        )
    },
    { 
        header: 'الحالة', 
        render: (row: any) => <StatusBadge status={row.status} /> 
    },
  ];

  return (
    <div>
      {/* 📊 كروت التحليل المالي السريع في أعلى التاب */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '20px', borderBottom: `4px solid ${THEME.success}`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ display: 'block', fontSize: '12px', color: '#64748b', fontWeight: 800, marginBottom: '5px' }}>💰 إجمالي مستخلصات العميل (إيرادات المشروع)</span>
          <strong style={{ fontSize: '22px', color: THEME.success, fontWeight: 900 }}>{formatCurrency(financialStats.clientTotal)}</strong>
        </div>
        
        <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '20px', borderBottom: `4px solid ${THEME.danger}`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ display: 'block', fontSize: '12px', color: '#64748b', fontWeight: 800, marginBottom: '5px' }}>👷 إجمالي مستخلصات مقاولي الباطن (التزامات العقار)</span>
          <strong style={{ fontSize: '22px', color: THEME.danger, fontWeight: 900 }}>{formatCurrency(financialStats.subContractorTotal)}</strong>
        </div>
      </div>

      {/* 📋 جدول الحسابات الموحد */}
      <div className="glass-card" style={{ padding: '15px' }}>
        {financials.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: 900 }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>💰</div>
                لا توجد مستخلصات مالية أو فواتير مسجلة لهذا المشروع حتى الآن.
            </div>
        ) : (
            <RawasiSmartTable data={financials} columns={invoiceColumns} />
        )}
      </div>
    </div>
  );
}