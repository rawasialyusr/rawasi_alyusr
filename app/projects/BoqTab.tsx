import React, { useMemo, useState } from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import RawasiSmartTable from '@/components/rawasismarttable';
import BoqFormModal from './BoqFormModal';
import ProjectReportModal from './ProjectReportModal'; 

// دالة تطهير النصوص خارج المكون لمنع الـ Loop وتنظيف الكلمات
const normalizeArabic = (str: string) => {
  if (!str) return '';
  return str.trim().toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ');
};

export default function BoqTab({ logic, setDeleteAlert }: { logic: any, setDeleteAlert: any }) {
  const [isReportOpen, setIsReportOpen] = useState(false);

  // استخراج الداتا بأمان
  const boqList = logic.projectDetails?.boq || [];
  const assignments = logic.projectDetails?.contractorAssignments || [];
  const expenses = logic.projectDetails?.expenses || [];

  // 1️⃣ ترتيب بنود المقايسة (رئيسي ثم فرعي)
  const flatBoqData = useMemo(() => {
      if (boqList.length === 0) return [];
      const result: any[] = [];
      const mains = boqList.filter((i: any) => i.item_type === 'رئيسي');
      
      mains.forEach((main: any) => {
          result.push(main);
          const subs = boqList.filter((sub: any) => sub.parent_id === main.id);
          result.push(...subs);
      });
      const mappedIds = new Set(result.map(r => r.id));
      const orphans = boqList.filter((b: any) => !mappedIds.has(b.id));
      return [...result, ...orphans];
  }, [boqList]);

  // 2️⃣ حساب الإحصائيات الكلية للسامري بقراءة الأعمدة المحسوبة من الداتا بيز مباشرة
  const boqStats = useMemo(() => {
    let totalContractValue = 0, totalEstimatedCosts = 0, subItemsCount = 0;
    let totalActualLabor = 0, totalActualMaterial = 0, totalDirectExpenses = 0, totalActualOperational = 0;
    let totalRetentionValue = 0, totalNetProfit = 0, totalBudgetVariance = 0;

    flatBoqData.forEach((item: any) => {
      const hasChildren = flatBoqData.some((child: any) => child.parent_id === item.id);
      if (!hasChildren) {
        subItemsCount++;
        totalContractValue += Number(item.total_contract_amount || 0);
        totalEstimatedCosts += (Number(item.estimated_labor_cost || 0) + Number(item.estimated_material_cost || 0) + Number(item.estimated_expenses_cost || 0) + Number(item.estimated_operational_cost || 0));
        
        // التكاليف الفعلية المباشرة المسحوبة للبند
        totalActualLabor += Number(item.actual_labor_cost || 0);
        totalActualMaterial += Number(item.actual_material_cost || 0);
        totalDirectExpenses += Number(item.actual_expenses_cost || 0);
        totalActualOperational += Number(item.actual_operational_cost || 0);

        // القيم المالية المحسوبة من السيرفر
        totalRetentionValue += Number(item.actual_retention_amount || 0);
        totalNetProfit += Number(item.item_net_profit || 0);
        totalBudgetVariance += Number(item.total_budget_variance || 0);
      }
    });

    // سحب إجمالي المصاريف المحملة (الإدارية والتشغيلية العامة)
    const totalAllocatedOverhead = expenses
        .filter((e: any) => !['direct', 'material', 'labor_direct', 'labor_allocated'].includes(e.row_type))
        .reduce((sum: number, e: any) => sum + Number(e.amount || e.total_price || 0), 0);

    const totalAssignedContracts = assignments.reduce((sum: number, a: any) => sum + Number(a.total_contract_amount || 0), 0);
    
    // الهوامش والنسب المئوية
    const profitMargin = totalContractValue > 0 ? ((totalNetProfit / totalContractValue) * 100).toFixed(1) : "0.0";
    const isLoss = totalNetProfit < 0;

    return { 
      totalContractValue, totalEstimatedCosts, subItemsCount, totalAssignedContracts, 
      totalRetentionValue, totalNetProfit, profitMargin, isLoss, totalBudgetVariance,
      totalAllocatedOverhead, totalActualLabor, totalActualMaterial, totalDirectExpenses, totalActualOperational
    };
  }, [flatBoqData, assignments, expenses]);

  // 3️⃣ تجهيز أعمدة الجدول الذكي بمطابقتها للأعمدة الجديدة
  const boqColumns = useMemo(() => [
    { 
        header: 'البند / المرحلة', 
        accessor: 'work_item',
        render: (row: any) => {
            if (row.item_type === 'رئيسي') return <span style={{ fontWeight: 900, color: THEME.coffeeDark, fontSize: '15px' }}>📂 {row.work_item}</span>;
            return <span style={{ paddingRight: '25px', color: '#475569', fontWeight: 800 }}>↪️ {row.work_item}</span>;
        }
    },
    { 
        header: 'إجمالى البند (البيع)', 
        render: (row: any) => <span style={{ fontWeight: 900, color: THEME.coffeeDark, fontSize: '14px' }}>{formatCurrency(row.total_contract_amount)}</span>
    },
    { 
        header: 'ضمان الأعمال', 
        render: (row: any) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: 900, color: '#475569' }}>{formatCurrency(row.actual_retention_amount)}</span>
            {Number(row.retention_percentage) > 0 && <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>({row.retention_percentage}%)</span>}
          </div>
        )
    },
    { 
        header: 'الميزانية المقدرة', 
        render: (row: any) => {
            const budget = Number(row.estimated_labor_cost || 0) + Number(row.estimated_material_cost || 0) + Number(row.estimated_expenses_cost || 0) + Number(row.estimated_operational_cost || 0);
            return <span style={{ fontWeight: 900, color: '#475569', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>{formatCurrency(budget)}</span>;
        }
    },
    { 
        header: 'مصروفات فعلية', 
        render: (row: any) => <span style={{ fontWeight: 900, color: '#ea580c' }}>{formatCurrency(row.actual_expenses_cost)}</span>
    },
    { 
        header: 'خامات فعلية', 
        render: (row: any) => <span style={{ fontWeight: 900, color: THEME.goldAccent }}>{formatCurrency(row.actual_material_cost)}</span>
    },
    { 
        header: 'عمالة ومعدات فعلية', 
        render: (row: any) => {
            const laborAndOps = Number(row.actual_labor_cost || 0) + Number(row.actual_operational_cost || 0);
            return <span style={{ fontWeight: 900, color: '#0369A1' }}>{formatCurrency(laborAndOps)}</span>;
        }
    },
    { 
        header: 'انحراف الميزانية', 
        render: (row: any) => {
            const variance = Number(row.total_budget_variance || 0);
            const isOverrun = variance < 0; // سالب يعني تخطي وعجز
            return (
              <span style={{ fontWeight: 900, color: isOverrun ? THEME.danger : '#047857' }}>
                {variance > 0 ? '+' : ''}{formatCurrency(variance)}
              </span>
            );
        }
    },
    { 
        header: 'صافي ربح البند', 
        render: (row: any) => {
            const netProfit = Number(row.item_net_profit || 0);
            const isLoss = netProfit < 0;
            return (
              <span style={{ 
                fontWeight: 900, color: isLoss ? THEME.danger : THEME.success, 
                backgroundColor: isLoss ? '#FEF2F2' : '#F0FDF4', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', display: 'inline-block'
              }}>
                {formatCurrency(netProfit)}
              </span>
            );
        } 
    },
    { 
        header: 'عقود باطن', 
        render: (row: any) => {
            const itemAssignments = assignments.filter((a: any) => a.boq_budget_id === row.id);
            const assignedTotal = itemAssignments.reduce((sum: number, a: any) => sum + Number(a.total_contract_amount || 0), 0);
            return <span style={{ fontWeight: 900, color: assignedTotal > 0 ? '#6B21A8' : '#94a3b8', fontSize: '14px' }}>{formatCurrency(assignedTotal)}</span>;
        } 
    },
    {
        header: 'الإجراءات',
        render: (row: any) => (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button onClick={() => { logic.setCurrentBoqRecord(row); logic.setIsBoqModalOpen(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} title="تعديل البند">✏️</button>
                <button onClick={() => { setDeleteAlert({ isOpen: true, type: 'boq', id: row.id, title: 'حذف بند مقايسة', message: `هل أنت متأكد من حذف البند "${row.work_item}"؟` }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.8 }} title="حذف البند">🗑️</button>
            </div>
        )
    }
  ], [assignments, logic, setDeleteAlert]);

  return (
    <div>
      {/* 📊 كروت السامري الكلية المطورة للرقابة المالية */}
      {flatBoqData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', padding: '15px 20px', borderRadius: '20px', borderBottom: `4px solid ${THEME.coffeeDark}`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '5px' }}>臨 إجمالي قيمة المقايسة</span>
            <strong style={{ fontSize: '20px', color: THEME.coffeeDark, fontWeight: 900 }}>{formatCurrency(boqStats.totalContractValue)}</strong>
          </div>

          <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', padding: '15px 20px', borderRadius: '20px', borderBottom: `4px solid #475569`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '5px' }}>📋 إجمالي الميزانية التقديرية</span>
            <strong style={{ fontSize: '20px', color: '#1e293b', fontWeight: 900 }}>{formatCurrency(boqStats.totalEstimatedCosts)}</strong>
          </div>

          {/* 🔐 الكارت الجديد: إجمالي محجوز ضمان الأعمال */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', padding: '15px 20px', borderRadius: '20px', borderBottom: `4px solid #64748b`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '5px' }}>🔐 محجوز ضمان الأعمال الكلي</span>
            <strong style={{ fontSize: '20px', color: '#475569', fontWeight: 900 }}>{formatCurrency(boqStats.totalRetentionValue)}</strong>
          </div>

          {/* 🏢 كارت المصروفات المحملة غير المباشرة */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', padding: '15px 20px', borderRadius: '20px', borderBottom: `4px solid #0284C7`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '5px' }}>🏢 المصروفات المحملة (إدارة وتتشغيل)</span>
            <strong style={{ fontSize: '20px', color: '#0284C7', fontWeight: 900 }}>{formatCurrency(boqStats.totalAllocatedOverhead)}</strong>
          </div>

          {/* ⚖️ كارت مؤشر انحراف الميزانية الكلي */}
          <div style={{ 
            backgroundColor: boqStats.totalBudgetVariance < 0 ? 'rgba(254,226,226,0.6)' : 'rgba(209,250,229,0.6)', 
            backdropFilter: 'blur(10px)', padding: '15px 20px', borderRadius: '20px', 
            borderBottom: `4px solid ${boqStats.totalBudgetVariance < 0 ? THEME.danger : '#057857'}`, 
            boxShadow: '0 4px 15px rgba(0,0,0,0.02)' 
          }}>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '5px' }}>⚖️ انحراف الميزانية الكلي (وفر/عجز)</span>
            <strong style={{ fontSize: '20px', color: boqStats.totalBudgetVariance < 0 ? THEME.danger : '#057857', fontWeight: 900 }}>
              {boqStats.totalBudgetVariance > 0 ? '+' : ''}{formatCurrency(boqStats.totalBudgetVariance)}
            </strong>
          </div>

          {/* 📊 كارت صافي الأرباح الفعلية المحدث من السيرفر */}
          <div style={{ 
              backgroundColor: boqStats.isLoss ? 'rgba(254,226,226,0.8)' : 'rgba(220,252,231,0.6)', 
              backdropFilter: 'blur(10px)', padding: '15px 20px', borderRadius: '20px', 
              borderBottom: `4px solid ${boqStats.isLoss ? THEME.danger : THEME.success}`, 
              boxShadow: '0 4px 15px rgba(0,0,0,0.02)' 
          }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: boqStats.isLoss ? THEME.danger : '#166534', fontWeight: 900, marginBottom: '5px' }}>
              <span>{boqStats.isLoss ? '📉 صافي خسارة فعلية' : '📊 صافي الأرباح الحقيقية'}</span>
              <span style={{ background: boqStats.isLoss ? THEME.danger : '#166534', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', direction: 'ltr' }}>
                {boqStats.profitMargin}%
              </span>
            </span>
            <strong style={{ fontSize: '20px', color: boqStats.isLoss ? THEME.danger : THEME.success, fontWeight: 900, direction: 'ltr' }}>
              {formatCurrency(boqStats.totalNetProfit)}
            </strong>
          </div>
        </div>
      )}

      {/* 📋 جدول المقايسة الذكي ومتابعة التكاليف الفعلية */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 10px', flexWrap: 'wrap', gap: '15px' }}>
           <h3 style={{ margin: 0, color: THEME.coffeeDark, fontWeight: 900 }}>📋 مقارنة ومتابعة الميزانيات بالتكاليف الفعلية والانحرافات</h3>
           
           {flatBoqData.length > 0 && (
             <button 
               onClick={() => setIsReportOpen(true)}
               style={{
                 backgroundColor: THEME.primary, color: 'white', padding: '10px 20px', borderRadius: '10px',
                 border: 'none', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                 boxShadow: '0 4px 10px rgba(0,0,0,0.1)', transition: 'all 0.3s'
               }}
             >
               <span>🖨️</span> عرض التقرير للطباعة
             </button>
           )}
        </div>

        {flatBoqData.length === 0 ? (
            <div style={{ textalign: 'center', padding: '40px', color: '#94a3b8', fontWeight: 900 }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
                لا توجد بنود مقايسة مضافة لهذا المشروع بعد.<br/>
            </div>
        ) : (
            <RawasiSmartTable data={flatBoqData} columns={boqColumns} />
        )}
        
        {logic.isBoqModalOpen && (
            <BoqFormModal 
                isOpen={logic.isBoqModalOpen} onClose={() => logic.setIsBoqModalOpen(false)}
                record={logic.currentBoqRecord} setRecord={logic.setCurrentBoqRecord}
                onSave={logic.handleSaveBoq} projectBoq={logic.projectDetails.boq}
            />
        )}

        <ProjectReportModal 
          isOpen={isReportOpen} 
          onClose={() => setIsReportOpen(false)} 
          logic={logic} 
          boqStats={boqStats} 
          flatBoqData={flatBoqData} 
          normalizeArabic={normalizeArabic}
        />
      </div>
    </div>
  );
}