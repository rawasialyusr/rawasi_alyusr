"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { useHierarchicalAccountsLogic } from './accounts_logic';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import UserMenu from '@/components/UserMenu';
import { usePermissions } from '@/lib/PermissionsContext'; 
import SecureAction from '@/components/SecureAction'; 

export default function HierarchicalLedgerPage() {
  const { 
    paginatedTree, totalPages, currentPage, setCurrentPage,
    isLoading, searchTerm, setSearchTerm, expandedIds, toggleExpand, expandAll, collapseAll, 
    selectedIds, toggleSelection, handleDelete, handleAdd, handleEdit,
    startDate, setStartDate, endDate, setEndDate
  } = useHierarchicalAccountsLogic();

  const [mounted, setMounted] = useState(false);
  const { can, loading: permsLoading } = usePermissions();

  useEffect(() => { setMounted(true); }, []);

  // 🧮 حساب إجماليات ميزان المراجعة
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

  // 🚀 تجهيز أزرار السايد بار
  const sidebarActions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <SecureAction module="accounts" action="create">
        <button className="btn-premium-gold" onClick={handleAdd}>
            ➕ إضافة حساب جديد
        </button>
      </SecureAction>
      
      {selectedIds.length > 0 && (
        <>
          <p style={{fontSize:'10px', textAlign:'center', color:'#94a3b8', fontWeight:900, marginBottom:'-5px'}}>إجراءات على ({selectedIds.length})</p>
          <SecureAction module="accounts" action="edit">
            <button className="btn-main-glass blue" onClick={() => handleEdit(selectedIds)} disabled={selectedIds.length !== 1}>✏️ تعديل الحساب</button>
          </SecureAction>
          <SecureAction module="accounts" action="delete">
            <button className="btn-main-glass red" onClick={() => handleDelete(selectedIds)}>🗑️ حذف الحساب</button>
          </SecureAction>
        </>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
         <button className="btn-main-glass white" style={{flex: 1}} onClick={expandAll}>🔽 فتح الكل</button>
         <button className="btn-main-glass white" style={{flex: 1}} onClick={collapseAll}>🔼 طي الكل</button>
      </div>

      <button className="btn-main-glass white" onClick={() => window.print()}>🖨️ طباعة الميزان</button>
    </div>
  );

  return (
    <MasterPage title="شجرة الحسابات والميزان" subtitle="إدارة المركز المالي ودليل الحسابات - رواسي اليسر">
      
      {/* 🚀 إضافة كارت UserMenu الموحد */}
      <div style={{ marginBottom: '25px', padding: '0 20px', animation: 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <UserMenu />
      </div>

      <div className="floating-stack-layout">
        <div className="warm-depth-glow" />

        <div className="content-container">
          {/* 📡 إدارة السايد بار المركزي */}
          <RawasiSidebarManager 
            summary={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="summary-glass-card">
                      <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي المدين 📈</span>
                      <div style={{fontSize:'18px', fontWeight:900, color: THEME.success}}>{formatCurrency(summary.debit)}</div>
                  </div>
                  <div className="summary-glass-card">
                      <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي الدائن 📉</span>
                      <div style={{fontSize:'18px', fontWeight:900, color: THEME.danger}}>{formatCurrency(summary.credit)}</div>
                  </div>
                  <div className="summary-glass-card" style={{ background: summary.balance === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', borderColor: summary.balance === 0 ? THEME.success : THEME.warning }}>
                      <span style={{fontSize:'12px', fontWeight:800, color: summary.balance === 0 ? THEME.success : THEME.warning}}>الرصيد / الفارق ⚖️</span>
                      <div style={{fontSize:'22px', fontWeight:900, color: 'white'}}>
                        {formatCurrency(summary.balance)}
                      </div>
                      <div style={{fontSize:'10px', marginTop: '4px', color: '#94a3b8'}}>{summary.balance !== 0 && (summary.isDebitBalance ? '(رصيد مدين)' : '(رصيد دائن)')}</div>
                  </div>
              </div>
            }
            actions={sidebarActions}
            customFilters={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
                  <div>
                     <label style={{color: 'white', fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px'}}>🔍 بحث في الدليل:</label>
                     <input type="text" placeholder="الاسم، الكود..." className="glass-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>

                  <div>
                      <label style={{color: 'white', fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px'}}>📅 من تاريخ:</label>
                      <input type="date" className="glass-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                      <label style={{color: 'white', fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px'}}>📅 إلى تاريخ:</label>
                      <input type="date" className="glass-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
              </div>
            }
            watchDeps={[selectedIds, summary.balance, searchTerm, startDate, endDate]}
          />

          {/* الكارت الزجاجي الرئيسي - الطبقة الأمامية */}
          <div className="glass-master-card no-print">
            <div className="card-header">
              <h4 style={{ margin: 0, fontWeight: 900, color: THEME.primary }}>الدليل المحاسبي وميزان المراجعة</h4>
            </div>

            <div className="table-inner-scroll cinematic-scroll" style={{ padding: '20px' }}>
              
              <div className="table-header">
                 <div></div>
                 <div>اسم الحساب / الكود</div>
                 <div>التصنيف</div>
                 <div style={{textAlign: 'center'}}>إجمالي مدين</div>
                 <div style={{textAlign: 'center'}}>إجمالي دائن</div>
                 <div style={{textAlign: 'center'}}>الرصيد النهائي</div>
              </div>

              {(isLoading || permsLoading) ? (
                <div style={{ textAlign: 'center', marginTop: '50px', fontWeight: 900, fontSize: '16px', color: '#94a3b8' }}>
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
        </div>
      </div>

      {/* 🎨 التنسيقات السينمائية (Apple Style) */}
      <style>{`
        .floating-stack-layout { position: relative; width: 100%; padding: 0 20px 20px 20px; z-index: 5; direction: rtl; }
        .warm-depth-glow { position: absolute; inset: 0; background: radial-gradient(circle at 20% 30%, rgba(197, 160, 89, 0.15) 0%, transparent 70%); z-index: -1; pointer-events: none; }
        .content-container { max-width: 1600px; margin: 0 auto; }

        .glass-master-card {
          background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px);
          border-radius: 30px; border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.08); overflow: hidden;
          margin-top: 25px; animation: cardFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .card-header { padding: 25px 35px; background: rgba(255, 255, 255, 0.3); border-bottom: 1px solid rgba(0,0,0,0.03); }

        .summary-glass-card { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 15px; border-radius: 16px; text-align: center; transition: 0.3s; }
        .glass-input { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white; font-weight: 800; outline: none; transition: 0.3s; color-scheme: dark;}
        .glass-input:focus { background: rgba(255,255,255,0.2); border-color: ${THEME.goldAccent}; }

        .btn-premium-gold { width: 100%; padding: 16px; border-radius: 16px; background: linear-gradient(135deg, #c5a059, #977332); color: white; font-weight: 900; border: none; cursor: pointer; box-shadow: 0 10px 25px rgba(197, 160, 89, 0.3); transition: 0.3s; }
        .btn-premium-gold:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(197, 160, 89, 0.4); filter: brightness(1.1); }

        .btn-main-glass { width: 100%; padding: 12px; border-radius: 12px; border: none; font-weight: 900; cursor: pointer; transition: 0.3s; font-size: 13px; }
        .btn-main-glass.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }
        .btn-main-glass.blue:hover:not(:disabled) { background: #3b82f6; color: white; }
        .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .btn-main-glass.red:hover:not(:disabled) { background: #ef4444; color: white; }
        .btn-main-glass.white { background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2); }
        .btn-main-glass.white:hover:not(:disabled) { background: white; color: #1e293b; }
        .btn-main-glass:disabled { opacity: 0.5; cursor: not-allowed; }

        /* 🌳 تنسيق جدول الشجرة */
        .table-header {
          display: grid; grid-template-columns: 40px 2.5fr 1fr 1fr 1fr 1.2fr; 
          padding: 15px 20px; font-weight: 900; color: #64748b; font-size: 13px;
          background: rgba(0,0,0,0.02); border-radius: 16px; margin-bottom: 15px; border: 1px solid #f1f5f9;
        }
        .acc-row { 
          background: white; border-radius: 16px; margin-bottom: 8px; 
          display: grid; grid-template-columns: 40px 2.5fr 1fr 1fr 1fr 1.2fr; 
          align-items: center; padding: 15px 20px; cursor: pointer; 
          border: 1px solid #f1f5f9; transition: 0.2s; box-shadow: 0 2px 10px rgba(0,0,0,0.01);
        }
        .acc-row:hover { border-color: ${THEME.goldAccent}; transform: translateY(-1px); box-shadow: 0 5px 15px rgba(197, 160, 89, 0.1); }
        .acc-row.selected { background: rgba(197, 160, 89, 0.05); border-color: ${THEME.goldAccent}; }

        .entry-line { 
          background: #f8fafc; margin: 4px 20px 8px 60px; padding: 12px 20px; 
          border-radius: 12px; border-right: 3px solid ${THEME.goldAccent}; display: grid; 
          grid-template-columns: 120px 2fr 120px 120px; gap: 15px; font-size: 12px;
          border: 1px solid #f1f5f9;
        }

        .custom-checkbox { width: 18px; height: 18px; accent-color: ${THEME.goldAccent}; cursor: pointer; }
        .cinematic-scroll::-webkit-scrollbar { width: 6px; }
        .cinematic-scroll::-webkit-scrollbar-track { background: transparent; }
        .cinematic-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }

        @keyframes cardFadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </MasterPage>
  );
}

// 📌 مكون الصفوف الفرعية للشجرة (تم تحديثه ليتناسب مع الخلفية البيضاء للكارت الزجاجي)
function AccountNode({ node, expandedIds, toggleExpand, selectedIds, toggleSelection, depth }: any) {
  const isExpanded = expandedIds.includes(node.id);
  const isSelected = selectedIds.includes(node.id);
  const hasSub = (node.children?.length > 0) || (node.transactions?.length > 0);

  return (
    <div style={{ marginRight: `${(depth - 1) * 25}px` }}>
      <div 
        className={`acc-row ${isSelected ? 'selected' : ''}`}
        onClick={() => hasSub && toggleExpand(node.id)} 
        style={{ borderRight: `${Math.max(2, 8/depth)}px solid ${THEME.goldAccent}` }}
      >
        <input 
          type="checkbox" className="custom-checkbox" checked={isSelected} 
          onChange={() => toggleSelection(node.id)} onClick={e=>e.stopPropagation()} 
        />
        <div>
          <span style={{ fontWeight: 900, fontSize: '15px', color: THEME.primary }}>{node.name}</span>
          <span style={{ fontSize: '12px', color: '#94a3b8', marginRight: '10px' }}>#{node.code}</span>
        </div>
        <div style={{ fontSize: '12px', color: node.is_transactional ? '#64748b' : THEME.goldAccent, fontWeight: 800 }}>
          {node.is_transactional ? 'حساب فرعي' : 'حساب رئيسي'}
        </div>
        <div style={{ textAlign: 'center', color: THEME.success, fontWeight: 900, fontFamily: 'monospace', fontSize: '14px' }}>
          {formatCurrency(node.totalDebit)}
        </div>
        <div style={{ textAlign: 'center', color: THEME.danger, fontWeight: 900, fontFamily: 'monospace', fontSize: '14px' }}>
          {formatCurrency(node.totalCredit)}
        </div>
        <div style={{ textAlign: 'center', fontWeight: 900, color: THEME.primary, fontFamily: 'monospace', fontSize: '15px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          {formatCurrency(node.balance)}
        </div>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '5px', marginBottom: '15px' }}>
          {node.children?.map((child: any) => (
            <AccountNode key={child.id} node={child} expandedIds={expandedIds} toggleExpand={toggleExpand} selectedIds={selectedIds} toggleSelection={toggleSelection} depth={depth + 1} />
          ))}
          {node.transactions?.map((t: any, idx: number) => (
            <div key={idx} className="entry-line">
              <div style={{ fontWeight: 800, color: THEME.goldAccent }}>{t.date}</div>
              <div style={{ color: THEME.primary, fontWeight: 700 }}>{t.description}</div>
              <div style={{ textAlign: 'center', color: THEME.success, fontWeight: 800, fontFamily: 'monospace' }}>{t.debit ? formatCurrency(t.debit) : '-'}</div>
              <div style={{ textAlign: 'center', color: THEME.danger, fontWeight: 800, fontFamily: 'monospace' }}>{t.credit ? formatCurrency(t.credit) : '-'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}