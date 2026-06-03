import React, { useState, useMemo } from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import RawasiSmartTable from '@/components/rawasismarttable';

export default function ExpensesTab({ logic }: { logic: any }) {
  // 🚀 سحب كشف الحساب الموحد اللي ضفناه في اللوجيك
  const ledger = logic.projectDetails.ledger || [];

  // فلاتر البحث والنوع
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('الكل');

  // تصفية كشف الحساب بناءً على الفلاتر
  const filteredLedger = useMemo(() => {
    return ledger.filter((row: any) => {
      const matchSearch = row['البيان / البند']?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === 'الكل' || row['نوع التكلفة'] === filterType;
      return matchSearch && matchType;
    });
  }, [ledger, searchQuery, filterType]);

  // حساب الإجماليات بدقة للكروت العلوية
  const summaryStats = useMemo(() => {
    let total = 0, labor = 0, overhead = 0;
    filteredLedger.forEach((r: any) => {
      const amt = Number(r['التكلفة المحملة (جنيه)'] || 0);
      total += amt;
      if (r['نوع التكلفة'] === 'عمالة مباشرة') {
          labor += amt;
      } else {
          overhead += amt;
      }
    });
    return { total, labor, overhead };
  }, [filteredLedger]);

  // إعداد أعمدة الجدول (بنفس مسميات الـ View بتاعك)
  const columns = [
    { 
        header: 'التاريخ', 
        accessor: 'التاريخ',
        render: (row: any) => <span style={{ fontWeight: 800, color: '#475569' }}>{row['التاريخ']}</span> 
    },
    { 
        header: 'الشهر المالي', 
        accessor: 'الشهر المالي',
        render: (row: any) => <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontWeight: 900 }}>{row['الشهر المالي']}</span>
    },
    { 
        header: 'نوع التكلفة', 
        render: (row: any) => {
          const isLabor = row['نوع التكلفة'] === 'عمالة مباشرة';
          return (
            <span style={{ 
              backgroundColor: isLabor ? '#E0F2FE' : '#F3E8FF', 
              color: isLabor ? '#0369A1' : '#6B21A8', 
              padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 900 
            }}>
              {isLabor ? '👷 عمالة مباشرة' : '🏢 أوفر هيد وتشغيل'}
            </span>
          );
        }
    },
    { 
        header: 'البيان / اسم البند', 
        render: (row: any) => <strong style={{ color: THEME.coffeeDark, fontSize: '14px' }}>{row['البيان / البند']}</strong> 
    },
    { 
        header: 'التكلفة المحملة', 
        render: (row: any) => {
            const isLabor = row['نوع التكلفة'] === 'عمالة مباشرة';
            return (
                <strong style={{ fontSize: '15px', color: isLabor ? '#0369A1' : '#6B21A8' }}>
                    {formatCurrency(row['التكلفة المحملة (جنيه)'])}
                </strong>
            );
        } 
    }
  ];

  return (
    <div>
      {/* 📊 كروت الإحصائيات العلوية */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        
        <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', padding: '15px 20px', borderRadius: '20px', borderBottom: `4px solid ${THEME.danger}`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '5px' }}>💸 إجمالي التكلفة الظاهرة بالجدول</span>
          <strong style={{ fontSize: '22px', color: THEME.coffeeDark, fontWeight: 900 }}>{formatCurrency(summaryStats.total)}</strong>
        </div>

        <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', padding: '15px 20px', borderRadius: '20px', borderBottom: `4px solid #0369A1`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '5px' }}>👷 أجور العمالة المباشرة (يوميات)</span>
          <strong style={{ fontSize: '22px', color: '#0369A1', fontWeight: 900 }}>{formatCurrency(summaryStats.labor)}</strong>
        </div>

        <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', padding: '15px 20px', borderRadius: '20px', borderBottom: `4px solid #6B21A8`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '5px' }}>🏢 المصروفات الإدارية والأوفر هيد</span>
          <strong style={{ fontSize: '22px', color: '#6B21A8', fontWeight: 900 }}>{formatCurrency(summaryStats.overhead)}</strong>
        </div>

      </div>

      {/* 📋 جدول كشف الحساب الموحد */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '20px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, color: THEME.coffeeDark, fontWeight: 900, fontSize: '16px' }}>
            📋 كشف الحساب الشامل للتكاليف (عمالة + أوفر هيد)
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            {/* فلتر البحث النصي */}
            <input 
              type="text" 
              placeholder="🔍 ابحث في البيان أو البند..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '10px 15px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontWeight: 800, outline: 'none', width: '220px', fontSize: '13px' }}
            />
            
            {/* فلتر نوع التكلفة */}
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontWeight: 800, backgroundColor: 'white', color: '#1e293b', outline: 'none', cursor: 'pointer', fontSize: '13px' }}
            >
              <option value="الكل">كل أنواع التكاليف 📂</option>
              <option value="عمالة مباشرة">👷 عمالة مباشرة فقط</option>
              <option value="مصروفات تشغيل وأوفر هيد">🏢 أوفر هيد وتشغيل فقط</option>
            </select>
          </div>
        </div>

        {filteredLedger.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: 900 }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔍</div>
                لا توجد تكاليف مطابقة لخيارات البحث.
            </div>
        ) : (
            <RawasiSmartTable data={filteredLedger} columns={columns} />
        )}
      </div>
    </div>
  );
}