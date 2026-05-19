import React, { useState, useMemo } from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import RawasiSmartTable from '@/components/rawasismarttable';

export default function ExpensesTab({ logic }: { logic: any }) {
  const expenses = logic.projectDetails.expenses || [];
  const boqItems = logic.projectDetails.boq || [];

  // 1️⃣ حالات التحكم في الفلاتر المزدوجة (بند + بحث بالخامة/العامل)
  const [selectedWorkItem, setSelectedWorkItem] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');

  // 2️⃣ تصفية التكاليف بشبكة أمان مزدوجة وتطهير للغة العربية
  const filteredExpenses = useMemo(() => {
    // دالة تطهير قوية جداً لتوحيد الحروف والمسافات
    const normalizeArabic = (str: string) => {
      if (!str) return '';
      return str.trim().toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/\s+/g, ' '); 
    };

    const targetItem = normalizeArabic(selectedWorkItem);
    const targetSearch = normalizeArabic(searchQuery);

    return expenses.filter((e: any) => {
      // -----------------------------------------------------
      // أ) فلترة البند الإنشائي (WBS Filter)
      // -----------------------------------------------------
      let matchItem = true;
      if (selectedWorkItem !== 'الكل') {
        if (e.row_type === 'labor_allocated') {
          matchItem = false; // التحميل العام لا يتبع بند
        } else {
          const rowItem = normalizeArabic(e.boq_work_item || '');
          const desc = normalizeArabic(e.description || '');

          // حماية صارمة لمنع تداخل بند قصير مع بند طويل (مثل سيستم وسيستم مساطر)
          const isTargetSystemButRowIsMasater = targetItem === 'سيستم' && (desc.includes('سيستم مساطر') || rowItem === 'سيستم مساطر');
          
          if (isTargetSystemButRowIsMasater) {
            matchItem = false;
          } else {
            const keywordWithItem = `البند: ${targetItem}`;
            const shortKeywordWithItem = `بند: ${targetItem}`;
            const hasExactItemInDesc = desc.includes(keywordWithItem) || desc.includes(shortKeywordWithItem);
            
            matchItem = rowItem === targetItem || hasExactItemInDesc || desc === targetItem;
          }
        }
      }

      // -----------------------------------------------------
      // ب) فلترة البحث بالخامة / العامل / المستفيد (Search Filter)
      // -----------------------------------------------------
      let matchSearch = true;
      if (targetSearch) {
        const desc = normalizeArabic(e.description || '');
        const payee = normalizeArabic(e.payee || '');
        const cat = normalizeArabic(e.category || '');
        matchSearch = desc.includes(targetSearch) || payee.includes(targetSearch) || cat.includes(targetSearch);
      }

      return matchItem && matchSearch;
    });
  }, [expenses, selectedWorkItem, searchQuery]);

  // 3️⃣ حساب السامري والملخص المالي ليتحدث مع الفلاتر المزدوجة
  const summaryStats = useMemo(() => {
    let total = 0, direct = 0, labor = 0, materials = 0;

    filteredExpenses.forEach((e: any) => {
      const amt = Number(e.amount || 0);
      total += amt;
      if (e.row_type === 'direct') direct += amt;
      else if (e.row_type === 'material') materials += amt;
      else labor += amt; 
    });

    return { total, direct, labor, materials };
  }, [filteredExpenses]);

  // 4️⃣ 🚀 استخراج ذكي وشامل للبنود لضمان عدم خلو القائمة المنسدلة أبداً
  const uniqueBoqSubItems = useMemo(() => {
    const names = new Set<string>();
    
    // سحب أي بند موجود في المقايسة مهما كان نوعه
    boqItems.forEach((b: any) => {
      if (b.work_item) names.add(b.work_item);
    });

    // سحب أي بند تم تسجيل مصروف عليه (أمان إضافي)
    expenses.forEach((e: any) => {
      if (e.boq_work_item) names.add(e.boq_work_item);
    });

    return Array.from(names).map(name => ({ work_item: name }));
  }, [boqItems, expenses]);

  const expensesColumns = [
      { header: 'التاريخ', accessor: 'display_date' },
      { header: 'البيان / الوصف', render: (row: any) => <span style={{ fontWeight: row.row_type === 'direct' ? 900 : 700, color: row.row_type === 'labor_allocated' ? '#475569' : 'inherit' }}>{row.description}</span> },
      { header: 'التصنيف', render: (row: any) => {
          let bg = '#f1f5f9'; let color = '#475569';
          if (row.row_type === 'labor_direct') { bg = '#FEF9C3'; color = '#CA8A04'; }
          if (row.row_type === 'labor_allocated') { bg = '#E0F2FE'; color = '#0369A1'; }
          if (row.row_type === 'material') { bg = '#F3E8FF'; color = '#6B21A8'; } 
          return <span style={{ fontSize: '11px', fontWeight: 900, backgroundColor: bg, color: color, padding: '4px 8px', borderRadius: '6px' }}>{row.category}</span>;
      }},
      { header: 'المستفيد / المقاول', accessor: 'payee' },
      { header: 'طريقة الدفع', render: (row: any) => <span style={{ fontSize: '11px', padding: '4px 8px', background: '#f1f5f9', borderRadius: '6px', fontWeight: 800, color: THEME.coffeeDark }}>{row.method}</span> },
      { header: 'القيمة', render: (row: any) => <span style={{ fontWeight: 900, color: row.row_type === 'labor_allocated' ? THEME.primary : THEME.danger, fontSize: '14px' }}>{formatCurrency(row.amount)}</span> },
  ];

  return (
    <div>
      {/* 📊 كروت السامري الرباعية المتغيرة مع الفلتر والبحث */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', padding: '15px 20px', borderRadius: '20px', borderBottom: `4px solid ${THEME.danger}`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '5px' }}>💸 إجمالي التكلفة للفلاتر الحالية</span>
          <strong style={{ fontSize: '22px', color: THEME.coffeeDark, fontWeight: 900 }}>{formatCurrency(summaryStats.total)}</strong>
        </div>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', padding: '15px 20px', borderRadius: '20px', borderBottom: `4px solid ${THEME.goldAccent}`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '5px' }}>🧱 مصروفات موقع مباشرة</span>
          <strong style={{ fontSize: '22px', color: THEME.primary, fontWeight: 900 }}>{formatCurrency(summaryStats.direct)}</strong>
        </div>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', padding: '15px 20px', borderRadius: '20px', borderBottom: `4px solid #0369A1`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '5px' }}>👷 أجور وعمالة موقع</span>
          <strong style={{ fontSize: '22px', color: '#0369A1', fontWeight: 900 }}>{formatCurrency(summaryStats.labor)}</strong>
        </div>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', padding: '15px 20px', borderRadius: '20px', borderBottom: `4px solid #6B21A8`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '5px' }}>🧱 تكلفة الخامات المسحوبة</span>
          <strong style={{ fontSize: '22px', color: '#6B21A8', fontWeight: 900 }}>{formatCurrency(summaryStats.materials)}</strong>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '20px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, color: THEME.coffeeDark, fontWeight: 900, fontSize: '16px' }}>💸 بيان حركة التكاليف المنصرفة للموقع</h3>
          
          {/* 🔍 أدوات التحكم: فلتر البند + مربع بحث الخامة */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="🔍 ابحث باسم الخامة أو العامل..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '10px 15px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontWeight: 800, outline: 'none', width: '220px', fontSize: '13px' }}
            />
            
            <select 
              value={selectedWorkItem} 
              onChange={(e) => setSelectedWorkItem(e.target.value)}
              style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontWeight: 800, backgroundColor: 'white', color: '#1e293b', outline: 'none', cursor: 'pointer', fontSize: '13px' }}
            >
              <option value="الكل">كل البنود 📂</option>
              {uniqueBoqSubItems.map((opt: any, idx: number) => (
                <option key={idx} value={opt.work_item}>↪️ {opt.work_item}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: 900 }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔍</div>
                لا توجد بيانات تطابق البند والخامة المحددة.
            </div>
        ) : (
            <RawasiSmartTable data={filteredExpenses} columns={expensesColumns} />
        )}
      </div>
    </div>
  );
}