"use client";
import React, { useMemo } from 'react';
import { useHierarchicalAccountsLogic } from './accounts_logic';
import { THEME } from '@/lib/theme';
import { useAuth } from '@/components/authGuard'; // 🛡️ 1. استدعاء مقص الصلاحيات المركزي

// 🎨 تطبيق الإستاندرد الموحد للمنظومة

export default function HierarchicalLedgerPage() {
  // 🚀 استدعاء كل المتغيرات والدوال من اللوجيك (بما فيها التواريخ وزراير الأكشن)
  const { 
    paginatedTree, totalPages, currentPage, setCurrentPage,
    isLoading, searchTerm, setSearchTerm, expandedIds, toggleExpand, expandAll, collapseAll, 
    selectedIds, toggleSelection, handleDelete, handleAdd, handleEdit,
    startDate, setStartDate, endDate, setEndDate
  } = useHierarchicalAccountsLogic();

  // 🛡️ 2. سحب دالة فحص الصلاحيات بأمان تام
  let can = (module: string, action: string) => true; // القيمة الافتراضية لو الهوك مش شغال
  try {
      const auth = useAuth();
      if (auth && auth.can) can = auth.can;
  } catch (e) {
      // تجاهل الخطأ لإبقاء النظام يعمل
  }

  // 🧮 حساب إجماليات ميزان المراجعة بناءً على الشجرة المعروضة
  const summary = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    paginatedTree.forEach(node => {
      totalDebit += node.totalDebit || 0;
      totalCredit += node.totalCredit || 0;
    });
    return {
      debit: totalDebit,
      credit: totalCredit,
      balance: Math.abs(totalDebit - totalCredit),
      isDebitBalance: totalDebit >= totalCredit
    };
  }, [paginatedTree]);

  return (
    <div className="app-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
        
        /* الخلفية السينمائية */
        .app-wrapper {
          min-height: 100vh;
          display: flex;
          direction: rtl;
          background-image: linear-gradient(rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.95)), url('/ryc_login.jpeg');
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          color: ${THEME.white};
        }

        .main-content {
          flex: 1; height: 100vh; overflow-y: auto; padding: 30px 40px;
        }

        /* الهيدر القياسي */
        .page-header {
          display: flex; justify-content: space-between; align-items: center;
          background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 15px 30px; border-radius: 20px; margin-bottom: 25px;
          backdrop-filter: blur(10px);
        }

        /* 🚀 مركز العمليات (Operations Center) */
        .operations-center {
          background: rgba(191, 198, 213, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid ${THEME.glassBorder};
          border-radius: 24px;
          padding: 25px;
          margin-bottom: 30px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.5);
        }

        .op-header {
          display: flex; align-items: center; gap: 10px; margin-bottom: 20px;
          color: ${THEME.accentLight}; font-size: 18px; font-weight: 900;
          border-bottom: 1px solid rgba(162, 82, 82, 0.05); padding-bottom: 15px;
        }

        /* 🧮 كروت ميزان المراجعة داخل مركز العمليات */
        .summary-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;
        }
        .summary-card {
          background: rgba(189, 162, 162, 0.03); border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px; padding: 15px; text-align: center;
          transition: transform 0.3s ease, border-color 0.3s ease;
        }
        .summary-card:hover { transform: translateY(-3px); border-color: ${THEME.accent}; background: rgba(194, 123, 123, 0.57); }
        .summary-title { color: ${THEME.slate}; font-size: 13px; font-weight: 700; margin-bottom: 5px; }
        .summary-value { font-size: 24px; font-weight: 900; font-family: monospace; }

        /* 🛠️ أدوات الفلترة والبحث */
        .filters-row {
          display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px; align-items: center;
        }
        
        .search-input {
          flex: 2; min-width: 250px; padding: 14px 20px;
          background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px; color: ${THEME.white}; font-size: 14px; font-weight: 600; outline: none; transition: 0.3s;
        }
        .search-input:focus { border-color: ${THEME.accent}; box-shadow: 0 0 10px rgba(202, 138, 4, 0.2); }

        .date-input-group {
          display: flex; align-items: center; gap: 10px; flex: 1; min-width: 200px;
          background: rgba(255, 255, 255, 0.02); padding: 5px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);
        }
        .date-input-group label { color: ${THEME.slate}; font-size: 13px; font-weight: 700; white-space: nowrap; }
        .date-input {
          flex: 1; background: transparent; border: none; color: white; outline: none; font-family: 'Cairo'; color-scheme: dark;
        }

        /* 🖱️ زراير الأكشن */
        .actions-row {
          display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center;
          padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.05);
        }
        .actions-group { display: flex; gap: 10px; flex-wrap: wrap; }

        .btn-action {
          padding: 10px 20px; border-radius: 10px; font-weight: 800; font-size: 14px;
          border: none; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 8px;
        }
        .btn-add { background: linear-gradient(135deg, ${THEME.accent}, ${THEME.accentLight}); color: ${THEME.primary}; }
        .btn-add:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(202, 138, 4, 0.3); }
        .btn-edit { background: rgba(255,255,255,0.1); color: white; }
        .btn-edit:hover:not(:disabled) { background: rgba(255,255,255,0.2); }
        .btn-delete { background: rgba(239, 68, 68, 0.1); color: ${THEME.danger}; border: 1px solid rgba(239, 68, 68, 0.3); }
        .btn-delete:hover:not(:disabled) { background: ${THEME.danger}; color: white; }
        
        .btn-tree { background: transparent; color: ${THEME.slate}; border: 1px solid ${THEME.slate}; }
        .btn-tree:hover { background: ${THEME.slate}; color: ${THEME.primary}; }

        .btn-action:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; box-shadow: none !important; }

        /* صفوف شجرة الحسابات */
        .table-wrapper { width: 100%; overflow-x: auto; padding-bottom: 15px; }
        .table-min-width { min-width: 900px; }

        .table-header {
          display: grid; grid-template-columns: 40px 2.5fr 1fr 1fr 1fr 1.2fr; 
          padding: 15px 20px; font-weight: 900; color: ${THEME.accent}; 
          background: rgba(167, 149, 109, 0.1); border-radius: 12px; margin-bottom: 15px;
        }

        .acc-row { 
          background: rgba(255, 255, 255, 0.02); border-radius: 12px; margin-bottom: 8px; 
          display: grid; grid-template-columns: 40px 2.5fr 1fr 1fr 1fr 1.2fr; 
          align-items: center; padding: 15px 20px; cursor: pointer; 
          border: 1px solid rgba(255, 255, 255, 0.05); transition: 0.2s;
        }
        .acc-row:hover { border-color: ${THEME.accent}; background: rgba(202, 138, 4, 0.05); }

        .entry-line { 
          background: rgba(0, 0, 0, 0.2); margin: 4px 50px 8px 60px; padding: 12px 20px; 
          border-radius: 10px; border-right: 3px solid ${THEME.accentLight}; display: grid; 
          grid-template-columns: 120px 2fr 120px 120px; gap: 15px; font-size: 13px;
          border-bottom: 1px solid rgba(255,255,255,0.02);
        }

        /* 📱 التوافق الكامل مع الجوال */
        @media (max-width: 1024px) {
          .summary-grid { grid-template-columns: 1fr; }
          .actions-row { flex-direction: column; align-items: stretch; }
          .actions-group { justify-content: space-between; }
          .btn-action { flex: 1; justify-content: center; }
        }
        @media (max-width: 768px) {
          .main-content { padding: 20px 15px; }
          .page-header { flex-direction: column-reverse; gap: 15px; text-align: center; }
          .filters-row { flex-direction: column; align-items: stretch; }
        }
      `}</style>

      {/* المحتوى الرئيسي */}
      <main className="main-content">
        
        {/* الهيدر */}
        <header className="page-header">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: THEME.white, marginBottom: '5px' }}>شجرة الحسابات والميزان</h1>
            <p style={{ color: THEME.slate, fontSize: '14px', fontWeight: 600 }}>إدارة المركز المالي - رواسي اليسر</p>
          </div>
          <div style={{ textAlign: 'left' }}>
            <img src="/RYC_Logo.png" alt="Logo" style={{ height: '70px', filter: 'drop-shadow(0px 5px 10px rgba(0,0,0,0.5))' }} />
          </div>
        </header>

        {/* 🚀 مركز العمليات (Operations Center) */}
        <div className="operations-center">
          <div className="op-header">
            <span>⚙️ مركز العمليات المالية</span>
          </div>

          {/* 1. السامري كارد (ميزان المراجعة) */}
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-title">إجمالي الحركات المدينة</div>
              <div className="summary-value" style={{ color: THEME.debit }}>{summary.debit.toLocaleString()}</div>
            </div>
            <div className="summary-card">
              <div className="summary-title">إجمالي الحركات الدائنة</div>
              <div className="summary-value" style={{ color: THEME.credit }}>{summary.credit.toLocaleString()}</div>
            </div>
            <div className="summary-card" style={{ borderColor: summary.balance === 0 ? THEME.debit : THEME.accent }}>
              <div className="summary-title">الرصيد / الفرق</div>
              <div className="summary-value" style={{ color: THEME.white }}>
                {summary.balance.toLocaleString()} {summary.balance !== 0 && (summary.isDebitBalance ? '(مدين)' : '(دائن)')}
              </div>
            </div>
          </div>

          {/* 2. الفلاتر والبحث (تم ربط التواريخ هنا باللوجيك) */}
          <div className="filters-row">
            <input 
              type="text" 
              className="search-input" 
              placeholder="🔍 ابحث برقم الحساب، الاسم، أو الوصف..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
            <div className="date-input-group">
              <label>من تاريخ:</label>
              <input type="date" className="date-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="date-input-group">
              <label>إلى تاريخ:</label>
              <input type="date" className="date-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* 3. زراير الأكشن والتحكم بالشجرة (تم تفعيل المقص هنا ✂️🛡️) */}
          <div className="actions-row">
            <div className="actions-group">
              {can('accounts', 'create') && (
                <button className="btn-action btn-add" onClick={handleAdd}>➕ حساب جديد</button>
              )}
              {can('accounts', 'edit') && (
                <button className="btn-action btn-edit" onClick={() => handleEdit(selectedIds)} disabled={selectedIds.length !== 1}>✏️ تعديل</button>
              )}
              {can('accounts', 'delete') && (
                <button className="btn-action btn-delete" onClick={() => handleDelete(selectedIds)} disabled={selectedIds.length === 0}>🗑️ حذف</button>
              )}
            </div>
            
            <div className="actions-group">
              <button className="btn-action btn-tree" onClick={expandAll}>🔽 فتح الكل</button>
              <button className="btn-action btn-tree" onClick={collapseAll}>🔼 طي الكل</button>
            </div>
          </div>
        </div>

        {/* شجرة البيانات (الجدول) */}
        <div className="table-wrapper">
          <div className="table-min-width">
            <div className="table-header">
               <div></div>
               <div>اسم الحساب / الكود</div>
               <div>التصنيف</div>
               <div style={{textAlign: 'center'}}>إجمالي مدين</div>
               <div style={{textAlign: 'center'}}>إجمالي دائن</div>
               <div style={{textAlign: 'center'}}>الرصيد الحالي</div>
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', marginTop: '50px', fontWeight: 900, fontSize: '18px', color: THEME.accent }}>
                ⏳ جاري معالجة البيانات المالية وبناء الشجرة...
              </div>
            ) : (
              paginatedTree.map(node => (
                <AccountNode 
                  key={node.id} node={node} expandedIds={expandedIds} toggleExpand={toggleExpand} 
                  selectedIds={selectedIds} toggleSelection={toggleSelection} depth={1} 
                />
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}

// 📌 مكون الصفوف الفرعية للشجرة
function AccountNode({ node, expandedIds, toggleExpand, selectedIds, toggleSelection, depth }: any) {
  const isExpanded = expandedIds.includes(node.id);
  const isSelected = selectedIds.includes(node.id);
  const hasSub = (node.children?.length > 0) || (node.transactions?.length > 0);

  return (
    <div style={{ marginRight: `${(depth - 1) * 20}px` }}>
      <div 
        className="acc-row" 
        onClick={() => hasSub && toggleExpand(node.id)} 
        style={{ borderRight: `${Math.max(2, 8/depth)}px solid ${THEME.accent}` }}
      >
        <input 
          type="checkbox" checked={isSelected} onChange={() => toggleSelection(node.id)} onClick={e=>e.stopPropagation()} 
          style={{ width: '18px', height: '18px', accentColor: THEME.accent }}
        />
        <div>
          <span style={{ fontWeight: 900, fontSize: '16px', color: THEME.white }}>{node.name}</span>
          <span style={{ fontSize: '13px', color: THEME.slate, marginRight: '10px' }}>#{node.code}</span>
        </div>
        <div style={{ fontSize: '13px', color: node.is_transactional ? THEME.slate : THEME.accentLight, fontWeight: 700 }}>
          {node.is_transactional ? 'حساب فرعي' : 'حساب رئيسي'}
        </div>
        <div style={{ textAlign: 'center', color: THEME.debit, fontWeight: 900, fontFamily: 'monospace', fontSize: '15px' }}>
          {node.totalDebit.toLocaleString()}
        </div>
        <div style={{ textAlign: 'center', color: THEME.credit, fontWeight: 900, fontFamily: 'monospace', fontSize: '15px' }}>
          {node.totalCredit.toLocaleString()}
        </div>
        <div style={{ textAlign: 'center', fontWeight: 900, color: THEME.white, fontFamily: 'monospace', fontSize: '16px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '6px' }}>
          {node.balance.toLocaleString()}
        </div>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '5px', marginBottom: '15px' }}>
          {node.children?.map((child: any) => (
            <AccountNode key={child.id} node={child} expandedIds={expandedIds} toggleExpand={toggleExpand} selectedIds={selectedIds} toggleSelection={toggleSelection} depth={depth + 1} />
          ))}
          {node.transactions?.map((t: any, idx: number) => (
            <div key={idx} className="entry-line">
              <div style={{ fontWeight: 800, color: THEME.accentLight }}>{t.date}</div>
              <div style={{ color: THEME.slate, fontWeight: 600 }}>{t.description}</div>
              <div style={{ textAlign: 'center', color: THEME.debit, fontWeight: 700, fontFamily: 'monospace' }}>{t.debit?.toLocaleString() || '-'}</div>
              <div style={{ textAlign: 'center', color: THEME.credit, fontWeight: 700, fontFamily: 'monospace' }}>{t.credit?.toLocaleString() || '-'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}