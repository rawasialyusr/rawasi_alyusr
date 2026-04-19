"use client";
import React, { useState } from 'react';
import { useLaborLogsLogic } from './labor_logs_logic';

const THEME = {
  sandLight: '#F4F1EE',
  sandDark: '#E6D5C3',
  coffeeMain: '#8C6A5D',
  coffeeDark: '#43342E',
  goldAccent: '#C5A059',
};

export default function LaborLogsDirectory() {
  const {
    isLoading, searchTerm, setSearchTerm, filterStatus, setFilterStatus,
    isAddModalOpen, setIsAddModalOpen, currentLog, setCurrentLog,
    isSaving, handleSaveLog, filteredLogs, stats, 
    handleDelete, exportToExcel, handleEdit, selectedIds, setSelectedIds, editingId, setEditingId, defaultLog,
    handlePostSingle, handlePostSelected, workersList, sitesList,
    currentPage, setCurrentPage, rowsPerPage, setRowsPerPage, totalPages, totalResults,
    formatCurrency // 👈 سحبنا دالة تنسيق الفلوس من اللوجيك
  } = useLaborLogsLogic();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isOneSelected = selectedIds.length === 1;
  const isNoneSelected = selectedIds.length === 0;

  const handleMainAction = () => {
    if (isOneSelected) {
      const logToEdit = filteredLogs.find(l => l.id === selectedIds[0]);
      if (logToEdit) handleEdit(logToEdit);
    } else {
      setEditingId(null);
      setCurrentLog(defaultLog);
      setIsAddModalOpen(true);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLogs.length && filteredLogs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLogs.map(l => l.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getAttendanceBadge = (val: any) => {
    const num = parseFloat(val);
    if (num === 1) return { bg: '#DCFCE7', color: '#166534', text: 'يوم كامل' };
    if (num === 0.5) return { bg: '#FEF3C7', color: '#B45309', text: 'نص يوم' };
    return { bg: '#FEE2E2', color: '#991B1B', text: 'غياب' };
  };

  return (
    <div className="app-container" style={{ direction: 'rtl', backgroundColor: THEME.sandLight, display: 'flex' }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.02); }
        ::-webkit-scrollbar-thumb { background-color: ${THEME.sandDark}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background-color: ${THEME.coffeeMain}; }

        @media screen {
          .app-container { height: 100vh; width: 100vw; overflow: hidden; }
          .main-content { flex: 1; height: 100vh; overflow-y: auto; padding: 40px 50px; margin-right: 70px; transition: margin-right 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
          .main-content.sidebar-open { margin-right: 320px; }
          .print-only { display: none !important; }
        }

        @media print {
          @page { size: A4 landscape; margin: 1cm; }
          aside, .no-print, .sidebar-input, .floating-row, .table-header-grid, .stat-card, button { display: none !important; }
          .app-container, .main-content { display: block !important; height: auto !important; width: 100% !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          .print-only { display: block !important; }
          .print-header { display: flex !important; justify-content: space-between; align-items: center; border-bottom: 3px solid ${THEME.coffeeDark}; padding-bottom: 15px; margin-bottom: 25px; }
          .print-table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed; }
          .print-table th, .print-table td { border: 1px solid #000 !important; padding: 8px 6px !important; text-align: center !important; font-size: 10pt !important; word-wrap: break-word; color: black !important; }
          .print-table th { background: #f2f2f2 !important; font-weight: 900; }
          .print-table thead { display: table-header-group !important; }
          .print-footer { position: fixed; bottom: 0; left: 0; width: 100%; text-align: center; font-size: 10pt; border-top: 1px solid #ccc; padding: 10px 0; background: white; }
          body { counter-reset: page; background: white; }
          .page-num::after { counter-increment: page; content: "صفحة " counter(page); }
        }

        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
        
        .table-wrapper { min-width: 1100px; padding-bottom: 20px; }
        
        .floating-row, .table-header-grid {
          background: white; border-radius: 16px; margin-bottom: 10px; display: grid; 
          grid-template-columns: 40px 90px 1.2fr 1.5fr 1.2fr 1.2fr 80px 80px 1.5fr 60px;
          gap: 10px; align-items: center; padding: 12px 15px; border: 1px solid transparent; transition: 0.2s ease;
        }
        .table-header-grid { position: sticky; top: 0; z-index: 10; background: ${THEME.coffeeDark}; color: white; border: none; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .table-header-grid .label-header { color: white; opacity: 0.9; }

        .floating-row:hover { border-color: ${THEME.goldAccent}; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(140, 106, 93, 0.1); }
        .data-text { font-weight: 700; font-size: 13px; color: ${THEME.coffeeDark}; text-align: center; }
        .label-header { font-size: 12px; font-weight: 900; text-align: center; }
        
        .control-btn { width: 100%; padding: 12px; border-radius: 10px; border: none; font-weight: 900; cursor: pointer; margin-bottom: 10px; transition: 0.2s; }
        .control-btn:hover:not(:disabled) { filter: brightness(1.1); transform: scale(1.02); }
        
        .sidebar-input { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); padding: 12px; border-radius: 10px; color: white; width: 100%; outline: none; margin-bottom: 15px; font-size: 13px; transition: 0.2s; }
        .sidebar-input:focus { border-color: ${THEME.goldAccent}; background: rgba(255, 255, 255, 0.12); }
        
        .modal-input { width: 100%; padding: 12px 15px; border-radius: 10px; border: 2px solid ${THEME.sandDark}; background: #FFF; color: ${THEME.coffeeDark}; font-weight: 700; outline: none; font-size: 14px; transition: 0.2s; }
        .modal-input:focus { border-color: ${THEME.goldAccent}; box-shadow: 0 0 0 3px rgba(197, 160, 89, 0.1); }
        
        .sidebar-select { width: 100%; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; cursor: pointer; outline: none; margin-bottom: 12px; font-size: 12px; }
        .sidebar-select option { color: ${THEME.coffeeDark}; }
        
        .nav-group { display: flex; gap: 8px; margin-bottom: 15px; }
        .nav-arrow-btn { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; cursor: pointer; font-weight: 900; transition: 0.2s; }
        .nav-arrow-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
        .nav-arrow-btn:disabled { opacity: 0.2; cursor: not-allowed; }
        
        .filter-btn { width: 100%; padding: 10px 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: 700; text-align: right; font-size: 13px; transition: 0.2s; margin-bottom: 6px; }
        .filter-btn:hover { padding-right: 18px; }
        .category-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 900; display: inline-block; border: 1px solid rgba(0,0,0,0.05); }
      `}</style>

      {/* 🟢 السلايدر الجانبي (لوحة التحكم الشاملة) */}
      <aside 
        onMouseEnter={() => setIsSidebarOpen(true)} 
        onMouseLeave={() => setIsSidebarOpen(false)} 
        className="no-print" 
        style={{ width: isSidebarOpen ? '320px' : '70px', backgroundColor: THEME.coffeeDark, position: 'fixed', right: 0, top: 0, height: '100vh', zIndex: 1000, borderLeft: `4px solid ${THEME.goldAccent}`, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '-5px 0 25px rgba(0,0,0,0.1)' }}
      >
        <div style={{ padding: '30px 25px', width: '320px', opacity: isSidebarOpen ? 1 : 0, transition: 'opacity 0.3s 0.1s' }}>
          <h2 style={{ color: THEME.goldAccent, fontWeight: 900, fontSize: '24px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⚙️</span> لوحة التحكم
          </h2>
          
          <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))', padding: '20px', borderRadius: '15px', marginBottom: '20px', textAlign: 'center', border: `1px solid ${THEME.goldAccent}`, boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
            <div style={{color: THEME.goldAccent, fontSize: '12px', fontWeight: 900, marginBottom: '5px'}}>إجمالي الأجور المحسوبة</div>
            <div style={{color: 'white', fontSize: '26px', fontWeight: 900}}>{formatCurrency(stats.sum || 0)}</div>
          </div>

          {/* العمليات الموحدة */}
          <button onClick={handleMainAction} className="control-btn" style={{ backgroundColor: isOneSelected ? THEME.goldAccent : THEME.sandLight, color: THEME.coffeeDark }}>
            {isOneSelected ? '✏️ تعديل المختار' : '➕ إضافة يومية جديدة'}
          </button>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <button onClick={() => selectedIds.forEach(id => handleDelete(id))} className="control-btn" style={{ backgroundColor: isNoneSelected ? 'rgba(255,255,255,0.05)' : '#ef4444', color: isNoneSelected ? 'rgba(255,255,255,0.3)' : '#FFF', marginBottom: 0 }} disabled={isNoneSelected}>🗑️ حذف</button>
            <button onClick={handlePostSelected} className="control-btn" style={{ backgroundColor: isNoneSelected ? 'rgba(255,255,255,0.05)' : '#166534', color: isNoneSelected ? 'rgba(255,255,255,0.3)' : '#FFF', marginBottom: 0 }} disabled={isNoneSelected}>🚀 ترحيل</button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '25px' }}>
            <button onClick={exportToExcel} className="control-btn" style={{ backgroundColor: THEME.sandDark, color: THEME.coffeeDark, marginBottom: 0, fontSize: '13px' }}>📊 إكسل</button>
            <button onClick={() => window.print()} className="control-btn" style={{ backgroundColor: THEME.coffeeMain, color: '#FFF', marginBottom: 0, fontSize: '13px' }}>🖨️ طباعة</button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '15px 0' }} />

          {/* نظام الفلترة المدمج */}
          <label style={{ color: THEME.goldAccent, fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '10px', opacity: 0.8 }}>تصفية حسب الحالة</label>
          <div style={{ marginBottom: '25px' }}>
            {['الكل', 'مرحل', 'معلق'].map(type => (
              <button key={type} onClick={() => setFilterStatus(type)} className="filter-btn" style={{ backgroundColor: filterStatus === type ? 'rgba(255,255,255,0.15)' : 'transparent', color: filterStatus === type ? THEME.goldAccent : THEME.sandLight, borderLeft: filterStatus === type ? `3px solid ${THEME.goldAccent}` : '3px solid transparent' }}>{type}</button>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '15px 0' }} />

          {/* نظام الصفحات 🔢 */}
          <label style={{ color: THEME.goldAccent, fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '10px', opacity: 0.8 }}>إعدادات العرض</label>
          <select className="sidebar-select" value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}>
            <option value={50}>إظهار 50 صف</option><option value={100}>إظهار 100 صف</option><option value={500}>إظهار 500 صف</option>
          </select>

          <div className="nav-group">
            <button className="nav-arrow-btn" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>التالي ◀</button>
            <button className="nav-arrow-btn" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>▶ السابق</button>
          </div>
          
          <div style={{ textAlign: 'center', color: 'white', marginBottom: '25px' }}>
            <div style={{ fontSize: '15px', fontWeight: 900 }}>صفحة {currentPage} من {totalPages || 1}</div>
            <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '2px' }}>إجمالي النتائج: {totalResults}</div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '15px 0 20px 0' }} />
          <input type="text" placeholder="بحث موحد (اسم، موقع، بند)..." className="sidebar-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {!isSidebarOpen && <div style={{ fontSize: '26px', textAlign: 'center', marginTop: '30px', color: THEME.goldAccent }}>⚙️</div>}
      </aside>

      {/* 🟢 المحتوى الرئيسي */}
      <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        
        {/* هيدر الشاشة */}
        <header className="no-print" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="print-hide-text">
            <h1 style={{ fontSize: '48px', fontWeight: 900, color: THEME.coffeeDark, margin: 0, letterSpacing: '-1px' }}>يوميات العمالة</h1>
            <p style={{ color: THEME.coffeeMain, fontWeight: 700, opacity: 0.8, fontSize: '18px', marginTop: '5px' }}>رواسي اليسر للمقاولات</p>
          </div>
          <div className="logo-container" style={{ width: '280px', height: '120px', background: 'white', borderRadius: '20px', border: `1px solid ${THEME.sandDark}`, padding: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 25px rgba(140, 106, 93, 0.08)' }}>
            <img src="/RYC_Logo.png" alt="RYC" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </header>

        <div className="table-wrapper">
            {/* هيدر الجدول (شاشة) */}
            <div className="table-header-grid no-print">
               <input type="checkbox" style={{ transform: 'scale(1.2)', cursor: 'pointer' }} onChange={toggleSelectAll} checked={selectedIds.length === filteredLogs.length && filteredLogs.length > 0} />
               {['التاريخ', 'المقاول', 'اسم العامل', 'الموقع', 'البند', 'اليومية', 'الحضور', 'الملاحظات', 'إجراء'].map(h => <div key={h} className="label-header">{h}</div>)}
            </div>

            {/* بيانات الجدول (شاشة) */}
            {isLoading ? <div style={{textAlign:'center', padding:'80px', fontWeight:900, color:THEME.coffeeMain, fontSize: '20px'}}>⏳ جاري تحميل البيانات...</div> : filteredLogs.map((l) => {
              const badge = getAttendanceBadge(l.attendance_value);
              return (
                <div key={l.id} className="floating-row no-print" style={{ backgroundColor: selectedIds.includes(l.id) ? '#fffcf5' : 'white', border: selectedIds.includes(l.id) ? `1px solid ${THEME.goldAccent}` : '1px solid transparent' }}>
                  <input type="checkbox" style={{ transform: 'scale(1.2)', cursor: 'pointer' }} checked={selectedIds.includes(l.id)} onChange={() => toggleSelectRow(l.id)} />
                  <div className="data-text" style={{ color: THEME.goldAccent, fontWeight: 900 }}>{l.work_date}</div>
                  <div className="data-text" style={{ fontSize: '12px' }}>{l.sub_contractor || 'المركز'}</div>
                  
                  <div className="data-text" style={{ textAlign: 'right' }}>
                     <a href={`/profile/${encodeURIComponent(l.worker_name)}`} style={{ color: THEME.coffeeDark, textDecoration: 'none' }}>
                        👤 {l.worker_name}
                     </a>
                  </div>
                  
                  <div className="data-text">{l.site_ref}</div>
                  <div className="data-text">{l.work_item}</div>
                  
                  {/* 🚀 استخدام formatCurrency لليومية في الجدول */}
                  <div className="data-text" style={{ fontWeight: 900, color: THEME.success }}>{formatCurrency(l.daily_wage || 0)}</div>
                  
                  <div className="data-text"><span className="category-badge" style={{ backgroundColor: badge.bg, color: badge.color }}>{badge.text}</span></div>
                  <div className="data-text" style={{ fontSize: '12px', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={l.notes}>{l.notes || '---'}</div>
                  <div className="data-text">
                     {!l.is_posted ? (
                         <button onClick={() => handlePostSingle(l.id)} title="ترحيل القيد" style={{ background: '#166534', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 900, transition: '0.2s' }}>🚀</button>
                     ) : (
                         <span title="مُرحل ومُعتمد" style={{ color: '#166534', fontWeight: 900, fontSize: '18px' }}>✅</span>
                     )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* 🖨️ نظام الطباعة (يظهر فقط في الورق) */}
        <div className="print-only">
           <div className="print-header">
             <div style={{ textAlign: 'right' }}>
               <h1 style={{ margin: 0, fontSize: '26pt', color: THEME.coffeeDark, fontWeight: 900 }}>سجل يوميات العمالة</h1>
               <p style={{ margin: 0, fontSize: '14pt', color: THEME.coffeeMain, fontWeight: 700 }}>شركة رواسي اليسر للمقاولات العامة</p>
             </div>
             <img src="/RYC_Logo.png" style={{ width: '180px' }} alt="Logo" />
           </div>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{width:'90px'}}>التاريخ</th><th>المقاول</th><th style={{width:'160px'}}>اسم العامل</th>
                <th>الموقع</th><th>البند</th><th style={{width:'90px'}}>اليومية</th><th style={{width:'80px'}}>الحضور</th><th>الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((l) => (
                <tr key={l.id}>
                  <td>{l.work_date}</td><td>{l.sub_contractor || 'المركز'}</td><td style={{fontWeight:'bold'}}>{l.worker_name}</td>
                  <td>{l.site_ref}</td><td>{l.work_item}</td><td style={{fontWeight: 'bold'}}>{formatCurrency(l.daily_wage || 0)}</td><td>{l.attendance_value == 1 ? 'كامل':'نصف'}</td><td style={{fontSize:'9pt'}}>{l.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="print-footer"><span className="page-num"></span><span style={{ marginRight: '40px' }}>تقرير رسمي - رواسي اليسر للمقاولات - {new Date().toLocaleDateString('ar-SA')}</span></div>
        </div>
      </main>

      {/* 🟢 النافذة المنبثقة الشاملة مع حماية القيم الفارغة || '' */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(67, 52, 46, 0.6)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001, opacity: 1, transition: '0.3s' }} onClick={() => setIsAddModalOpen(false)}>
          <div className="glass-card" style={{ width: '750px', padding: '40px', background: 'white', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontWeight: 900, color: THEME.coffeeDark, marginBottom: '30px', fontSize: '26px', borderBottom: `3px solid ${THEME.goldAccent}`, paddingBottom: '15px', display: 'inline-block' }}>
              {editingId ? '✏️ تعديل بيانات اليومية' : '➕ إضافة يومية جديدة'}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                 <div><label className="label-header" style={{color:THEME.coffeeMain, display:'block', textAlign:'right', marginBottom:'8px'}}>📅 التاريخ</label>
                 <input type="date" className="modal-input" value={currentLog.work_date || ''} onChange={e => setCurrentLog({...currentLog, work_date: e.target.value})} /></div>
                 <div><label className="label-header" style={{color:THEME.coffeeMain, display:'block', textAlign:'right', marginBottom:'8px'}}>🏗️ المقاول</label>
                 <input className="modal-input" placeholder="اسم المقاول (اختياري)" value={currentLog.sub_contractor || ''} onChange={e => setCurrentLog({...currentLog, sub_contractor: e.target.value})} /></div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                 <div><label className="label-header" style={{color:THEME.coffeeMain, display:'block', textAlign:'right', marginBottom:'8px'}}>👷 اسم العامل (دليل الشركاء)</label>
                 <select className="modal-input" value={currentLog.worker_name || ''} onChange={e => setCurrentLog({...currentLog, worker_name: e.target.value})}>
                    <option value="">-- اختر العامل --</option>
                    {workersList.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                 </select></div>
                 <div><label className="label-header" style={{color:THEME.coffeeMain, display:'block', textAlign:'right', marginBottom:'8px'}}>📍 الموقع / العمارة</label>
                 <select className="modal-input" value={currentLog.site_ref || ''} onChange={e => setCurrentLog({...currentLog, site_ref: e.target.value})}>
                    <option value="">-- اختر الموقع --</option>
                    {sitesList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                 </select></div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                 <div><label className="label-header" style={{color:THEME.coffeeMain, display:'block', textAlign:'right', marginBottom:'8px'}}>🔨 البند</label>
                 <input className="modal-input" placeholder="مثال: حدادة، نجارة..." value={currentLog.work_item || ''} onChange={e => setCurrentLog({...currentLog, work_item: e.target.value})} /></div>
                 <div><label className="label-header" style={{color:THEME.coffeeMain, display:'block', textAlign:'right', marginBottom:'8px'}}>💰 اليومية</label>
                 <input type="number" className="modal-input" placeholder="القيمة بالريال" value={currentLog.daily_wage || ''} onChange={e => setCurrentLog({...currentLog, daily_wage: e.target.value})} /></div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                 <div><label className="label-header" style={{color:THEME.coffeeMain, display:'block', textAlign:'right', marginBottom:'8px'}}>✅ الحضور</label>
                 <select className="modal-input" value={currentLog.attendance_value || '1'} onChange={e => setCurrentLog({...currentLog, attendance_value: e.target.value})}>
                    <option value="1">يوم كامل (1)</option><option value="0.5">نصف يوم (0.5)</option><option value="0">غياب (0)</option>
                 </select></div>
                 <div><label className="label-header" style={{color:THEME.coffeeMain, display:'block', textAlign:'right', marginBottom:'8px'}}>📝 الملاحظات</label>
                 <input className="modal-input" placeholder="أي ملاحظات إضافية..." value={currentLog.notes || ''} onChange={e => setCurrentLog({...currentLog, notes: e.target.value})} /></div>
               </div>

               <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                 <button onClick={handleSaveLog} disabled={isSaving} style={{ flex: 2, backgroundColor: THEME.coffeeDark, color: 'white', padding: '16px', borderRadius: '12px', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '16px', transition: '0.2s' }}>
                   {isSaving ? '⏳ جاري الحفظ...' : '✅ اعتماد البيانات'}
                 </button>
                 <button onClick={() => setIsAddModalOpen(false)} style={{ flex: 1, backgroundColor: THEME.sandDark, color: THEME.coffeeDark, padding: '16px', borderRadius: '12px', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '16px', transition: '0.2s' }}>
                   ❌ إلغاء
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}