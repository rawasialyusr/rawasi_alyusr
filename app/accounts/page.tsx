"use client";
import React, { useState } from 'react';
import { useHierarchicalAccountsLogic } from './accounts_logic';

const THEME = { 
  sandLight: '#F4F1EE', 
  sandDark: '#E6D5C3', 
  coffeeMain: '#8C6A5D', 
  coffeeDark: '#43342E', 
  goldAccent: '#C5A059' 
};

export default function HierarchicalLedgerPage() {
  const { 
    paginatedTree, totalPages, currentPage, setCurrentPage,
    isLoading, searchTerm, setSearchTerm, expandedIds, toggleExpand, expandAll, collapseAll, 
    selectedIds, toggleSelection, handleDelete
  } = useHierarchicalAccountsLogic();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="app-container" style={{ direction: 'rtl', backgroundColor: THEME.sandLight, display: 'flex' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        .main-content { flex: 1; height: 100vh; overflow-y: auto; padding: 40px; transition: 0.4s; }
        .main-content.sidebar-open { margin-right: 320px; }
        .acc-row { 
          background: white; border-radius: 12px; margin-bottom: 8px; 
          display: grid; grid-template-columns: 40px 2.5fr 1fr 1fr 1fr 1.2fr; 
          align-items: center; padding: 12px 20px; cursor: pointer; border: 1px solid transparent;
        }
        .acc-row:hover { border-color: ${THEME.goldAccent}; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .entry-line { 
          background: #fdfbf7; margin: 2px 50px 6px 60px; padding: 10px 15px; 
          border-radius: 8px; border-right: 3px solid ${THEME.goldAccent}; display: grid; 
          grid-template-columns: 100px 2fr 100px 100px; gap: 15px; font-size: 13px;
        }
        .sidebar-input { width: 100%; padding: 12px; border-radius: 10px; border: none; font-weight: 700; }
        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
      `}</style>

      {/* سايد بار التحكم */}
      <aside style={{ width: isSidebarOpen ? '320px' : '70px', backgroundColor: THEME.coffeeDark, position: 'fixed', right: 0, height: '100vh', zIndex: 1000, borderLeft: `3px solid ${THEME.goldAccent}`, transition: '0.4s' }}>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'none', border: 'none', color: THEME.goldAccent, fontSize: '24px', cursor: 'pointer', padding: '15px', width: '100%', textAlign: 'right' }}>☰</button>
        <div style={{ padding: '20px', display: isSidebarOpen ? 'block' : 'none' }}>
           <input className="sidebar-input" placeholder="🔍 بحث..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
           <div style={{ marginTop: '20px' }}>
              <button onClick={expandAll} style={{ width: '100%', marginBottom: '10px', padding: '10px', background: THEME.goldAccent, border: 'none', borderRadius: '8px', color: 'white', fontWeight: 900 }}>🔽 فتح الكل</button>
              <button onClick={collapseAll} style={{ width: '100%', padding: '10px', background: THEME.coffeeMain, border: 'none', borderRadius: '8px', color: 'white', fontWeight: 900 }}>🔼 طي الكل</button>
           </div>
        </div>
      </aside>

      <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <header style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: '#fff', padding: '20px', borderRadius: '15px' }}>
          <img src="/RYC_Logo.png" alt="Logo" style={{ width: '90px' }} />
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: THEME.coffeeDark }}>ميزان المراجعة والقيود</h1>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '40px 2.5fr 1fr 1fr 1fr 1.2fr', padding: '10px 20px', fontWeight: 900, color: THEME.coffeeDark, fontSize: '13px' }}>
           <div></div><div>الحساب</div><div>النوع</div><div style={{textAlign: 'center'}}>مدين</div><div style={{textAlign: 'center'}}>دائن</div><div style={{textAlign: 'center'}}>الرصيد</div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', marginTop: '50px', fontWeight: 900, color: THEME.coffeeMain }}>⏳ جاري جلب البيانات المالية...</div>
        ) : (
          paginatedTree.map(node => (
            <AccountNode 
              key={node.id} 
              node={node} 
              expandedIds={expandedIds} 
              toggleExpand={toggleExpand} 
              selectedIds={selectedIds} 
              toggleSelection={toggleSelection} 
              depth={1} 
            />
          ))
        )}
      </main>
    </div>
  );
}

function AccountNode({ node, expandedIds, toggleExpand, selectedIds, toggleSelection, depth }: any) {
  const isExpanded = expandedIds.includes(node.id);
  const isSelected = selectedIds.includes(node.id);
  const hasSub = (node.children?.length > 0) || (node.transactions?.length > 0);

  return (
    <div style={{ marginRight: `${(depth - 1) * 20}px` }}>
      <div className="acc-row" onClick={() => hasSub && toggleExpand(node.id)} style={{ borderRight: `${6/depth}px solid ${THEME.goldAccent}` }}>
        <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(node.id)} onClick={e=>e.stopPropagation()} />
        <div style={{ fontWeight: 800 }}>{node.code} - {node.name}</div>
        <div style={{ fontSize: '12px', color: '#666' }}>{node.is_transactional ? 'فرعي' : 'رئيسي'}</div>
        <div style={{ textAlign: 'center', color: '#166534', fontWeight: 900 }}>{node.totalDebit.toLocaleString()}</div>
        <div style={{ textAlign: 'center', color: '#991B1B', fontWeight: 900 }}>{node.totalCredit.toLocaleString()}</div>
        <div style={{ textAlign: 'center', fontWeight: 900, color: THEME.coffeeDark }}>{node.balance.toLocaleString()}</div>
      </div>

      {isExpanded && (
        <div>
          {node.children?.map((child: any) => (
            <AccountNode key={child.id} node={child} expandedIds={expandedIds} toggleExpand={toggleExpand} selectedIds={selectedIds} toggleSelection={toggleSelection} depth={depth + 1} />
          ))}
          {node.transactions?.map((t: any, idx: number) => (
            <div key={idx} className="entry-line">
              <div style={{ fontWeight: 800 }}>{t.date}</div>
              <div style={{ color: '#444' }}>{t.description}</div>
              <div style={{ textAlign: 'center', color: '#166534' }}>{t.debit?.toLocaleString() || '-'}</div>
              <div style={{ textAlign: 'center', color: '#991B1B' }}>{t.credit?.toLocaleString() || '-'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}