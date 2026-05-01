"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { usePartnerBalancesLogic } from './partner_balances_logic';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import SmartCombo from '@/components/SmartCombo';
import { formatCurrency } from '@/lib/helpers';
import { THEME } from '@/lib/theme';

export default function PartnerBalancesPage() {
  const logic = usePartnerBalancesLogic();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const columns = useMemo(() => [
    { header: 'الاسم / المستفيد', accessor: 'partner_name', render: (row: any) => row ? <b style={{ fontWeight: 900, color: '#1e293b' }}>👤 {row.partner_name}</b> : null },
    { header: 'التصنيف', accessor: 'partner_type', render: (row: any) => row ? <span style={{ background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>{row.partner_type || '---'}</span> : null },
    
    // إجمالي المستحق (الدائن)
    { header: 'إجمالي المستحق له (دائن)', accessor: 'total_earned', render: (row: any) => row ? <span style={{ color: THEME.primary, fontWeight: 900 }}>{formatCurrency(row.total_earned)}</span> : null },
    
    // إجمالي ما تم صرفه (المدين)
    { header: 'إجمالي المنصرف / مخصوم', accessor: 'total_paid', render: (row: any) => row ? <span style={{ color: '#059669', fontWeight: 900 }}>{formatCurrency(row.total_paid)}</span> : null },
    
    // الرصيد النهائي مع الألوان التحذيرية الذكية
    { 
      header: 'الرصيد النهائي (المتبقي)', 
      accessor: 'current_balance', 
      render: (row: any) => {
        if (!row) return null;
        const bal = Number(row.current_balance);
        if (bal > 0) {
            // مستحق له (الشركة مدينة له) -> أحمر كتحذير التزام
            return <span style={{ display: 'inline-block', background: '#fef2f2', color: '#b91c1c', padding: '6px 12px', borderRadius: '10px', fontWeight: 900, border: '1px solid #fecaca' }}>{formatCurrency(bal)} (له)</span>;
        } else if (bal < 0) {
            // مديون (استلم أكثر من حقه/سلفة) -> أخضر لصالح الشركة
            return <span style={{ display: 'inline-block', background: '#ecfdf5', color: '#059669', padding: '6px 12px', borderRadius: '10px', fontWeight: 900, border: '1px solid #a7f3d0' }}>{formatCurrency(Math.abs(bal))} (عليه)</span>;
        } else {
            // مصفر
            return <span style={{ display: 'inline-block', background: '#f1f5f9', color: '#94a3b8', padding: '6px 12px', borderRadius: '10px', fontWeight: 900 }}>مُصَفَّر</span>;
        }
      } 
    }
  ], []);

  if (!mounted) return null;

  return (
    <div className="clean-page">
      <MasterPage title="أرصدة الشركاء والعمال" subtitle="نظرة شاملة للمستحقات والمدفوعات والمتبقي لكل مستفيد من واقع القيود المزدوجة">
        
        <RawasiSidebarManager 
          summary={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{fontSize:'11px', fontWeight:800, color:'#94a3b8'}}>إجمالي الالتزامات (المستحق للعمال/الموردين)</div>
                    <div style={{fontSize:'20px', fontWeight:900, color: THEME.danger, marginTop:'5px'}}>{formatCurrency(logic.totals.balance > 0 ? logic.totals.balance : 0)}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{fontSize:'11px', fontWeight:800, color:'#94a3b8'}}>إجمالي المنصرف (دفعات/سلف)</div>
                    <div style={{fontSize:'20px', fontWeight:900, color: THEME.success, marginTop:'5px'}}>{formatCurrency(logic.totals.paid)}</div>
                </div>
            </div>
          }
          actions={<div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: 900 }}>تحديث لحظي من الدفتر العام 🔄</div>}
          customFilters={
            <div style={{marginTop: '10px'}}>
              <SmartCombo 
                  placeholder="🔍 بحث بالاسم أو التصنيف..."
                  initialDisplay={logic.globalSearch}
                  onSelect={(val: any) => logic.setGlobalSearch(typeof val === 'object' ? val.name : val)}
                  enableClear={true}
                  freeText={true}
              />
            </div>
          }
          onSearch={() => {}} 
          watchDeps={[logic.filteredData.length, logic.totals, logic.globalSearch]}
        />

        {logic.isLoading ? (
          <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8' }}>⏳ جاري تجميع الأرصدة...</div>
        ) : (
          <RawasiSmartTable 
              data={logic.filteredData.slice((logic.currentPage-1)*logic.rowsPerPage, logic.currentPage*logic.rowsPerPage)} 
              columns={columns} 
              
              enablePagination={true}
              currentPage={logic.currentPage}
              totalItems={logic.filteredData.length}
              rowsPerPage={logic.rowsPerPage}
              onPageChange={logic.setCurrentPage}
              onRowsChange={logic.setRowsPerPage}
          />
        )}
      </MasterPage>
    </div>
  );
}