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
    currentPage, setCurrentPage, rowsPerPage, setRowsPerPage, totalPages, totalResults
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
          .main-content { flex: 1; height: 100vh; overflow-y: auto; padding: 50px; margin-right: 70px; transition: margin-right 0.4s; }
          .main-content.sidebar-open { margin-right: 320px; }
          .print-only { display: none !important; }
        }

        @media print {
          @page { size: A4 landscape; margin: 1cm; }
          aside, .no-print, .sidebar-input, .floating-row, .table-header-grid, .stat-card, button { display: none !important; }
          .app-container, .main-content { display: block !important; height: auto !important; width: 100% !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; }
          .print-only { display: block !important; }
          .print-header { display: flex !important; justify-content: space-between; align-items: center; border-bottom: 3px solid ${THEME.coffeeDark}; padding-bottom: 15px; margin-bottom: 25px; }
          .print-table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed; }
          .print-table th, .print-table td { border: 1px solid #000 !important; padding: 6px 4px !important; text-align: center !important; font-size: 9pt !important; word-wrap: break-word; color: black !important; }
          .print-table th { background: #f2f2f2 !important; font-weight: 900; }
          .print-table thead { display: table-header-group !important; }
          .print-footer { position: fixed; bottom: 0; left: 0; width: 100%; text-align: center; font-size: 10pt; border-top: 1px solid #ccc; padding: 10px 0; background: white; }
          body { counter-reset: page; }
          .page-num::after { counter-increment: page; content: "صفحة " counter(page); }
        }

        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
        
        .floating-row, .table-header-grid {
          background: white; border-radius: 20px; margin-bottom: 12px; display: grid; 
          grid-template-columns: 40px 90px 1.2fr 1.5fr 1.2fr 1.2fr 80px 80px 1.5fr 80px;
          align-items: center; padding: 15px; border: 1px solid transparent; transition: 0.3s;
        }
        .table-header-grid { position: sticky; top: 0; z-index: 10; background: ${THEME.coffeeDark}; color: white; border: none; }
        .table-header-grid .label-header { color: white; opacity: 1; }

        .floating-row:hover { border-color: ${THEME.goldAccent}; transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .data-text { font-weight: 700; font-size: 13px; color: ${THEME.coffeeDark}; text-align: center; }
        .label-header { font-size: 11px; font-weight: 900; text-align: center; }
        .control-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; font-weight: 900; cursor: pointer; margin-bottom: 10px; }
        .sidebar-input { background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px; border-radius: 12px; color: white; width: 100%; outline: none; margin-bottom: 15px; }
        .modal-input { width: 100%; padding: 12px; border-radius: 12px; border: 1.5px solid ${THEME.sandDark}; background: #FFF; color: ${THEME.coffeeDark}; font-weight: 700; outline: none; }
        
        .sidebar-select { width: 100%; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; cursor: pointer; outline: none; margin-bottom: 12px; font-size: 12px; }
        .sidebar-select option { color: ${THEME.coffeeDark}; }
        .nav-group { display: flex; gap: 8px; margin-bottom: 15px; }
        .nav-arrow-btn { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; cursor: pointer; font-weight: 900; }
        .nav-arrow-btn:disabled { opacity: 0.2; cursor: not-allowed; }
        
        .filter-btn { width: 100%; padding: 8px 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: 700; text-align: right; font-size: 12px; transition: 0.3s; margin-bottom: 4px; }
        .category-badge { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 900; display: inline-block; }
      `}</style>

      {/* 🟢 السلايدر الجانبي (لوحة التحكم الشاملة) */}
      <aside 
        onMouseEnter={() => setIsSidebarOpen(true)} 
        onMouseLeave={() => setIsSidebarOpen(false)} 
        className="no-print" 
        style={{ width: isSidebarOpen ? '320px' : '70px', backgroundColor: THEME.coffeeDark, position: 'fixed', right: 0, top: 0, height: '100vh', zIndex: 1000, borderLeft: `3px solid ${THEME.goldAccent}`, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', transition: '0.4s' }}
      >
        <div style={{ padding: '30px 25px', width: '320px', opacity: isSidebarOpen ? 1 : 0 }}>
          <h2 style={{ color: THEME.goldAccent, fontWeight: 900, fontSize: '24px', marginBottom: '20px' }}>لوحة التحكم</h2>
          
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '15px', marginBottom: '20px', textAlign: 'center', border: `1px solid ${THEME.goldAccent}` }}>
            <div style={{color: THEME.goldAccent, fontSize: '11px', fontWeight: 900}}>إجمالي الأجور</div>
            <div style={{color: 'white', fontSize: '22px', fontWeight: 900}}>{stats.sum.toLocaleString()}</div>
          </div>

          {/* العمليات الموحدة */}
          <button onClick={handleMainAction} className="control-btn" style={{ backgroundColor: isOneSelected ? THEME.goldAccent : '#FFF', color: THEME.coffeeDark }}>
            {isOneSelected ? '✏️ تعديل المختار' : '➕ إضافة يومية جديدة'}
          </button>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <button onClick={() => selectedIds.forEach(id => handleDelete(id))} className="control-btn" style={{ backgroundColor: isNoneSelected ? 'rgba(255,255,255,0.05)' : '#ef4444', color: '#FFF', marginBottom: 0 }} disabled={isNoneSelected}>🗑️ حذف</button>
            <button onClick={handlePostSelected} className="control-btn" style={{ backgroundColor: isNoneSelected ? 'rgba(255,255,255,0.05)' : '#166534', color: '#FFF', marginBottom: 0 }} disabled={isNoneSelected}>🚀 ترحيل</button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            <button onClick={exportToExcel} className="control-btn" style={{ backgroundColor: THEME.sandDark, color: THEME.coffeeDark, marginBottom: 0, fontSize: '12px' }}>📊 إكسل</button>
            <button onClick={() => window.print()} className="control-btn" style={{ backgroundColor: THEME.coffeeMain, color: '#FFF', marginBottom: 0, fontSize: '12px' }}>🖨️ طباعة</button>
          </div>

          <hr style={{ opacity: 0.1, margin: '15px 0' }} />

          {/* نظام الفلترة المدمج */}
          <label style={{ color: THEME.goldAccent, fontSize: '11px', fontWeight: 900, display: 'block', marginBottom: '10px', opacity: 0.6 }}>تصفية حسب الحالة</label>
          <div style={{ marginBottom: '20px' }}>
            {['الكل', 'مرحل', 'معلق'].map(type => (
              <button key={type} onClick={() => setFilterStatus(type)} className="filter-btn" style={{ backgroundColor: filterStatus === type ? 'rgba(255,255,255,0.1)' : 'transparent', color: filterStatus === type ? THEME.goldAccent : THEME.sandLight }}>{type}</button>
            ))}
          </div>

          <hr style={{ opacity: 0.1, margin: '15px 0' }} />

          {/* نظام الصفحات 🔢 */}
          <label style={{ color: THEME.goldAccent, fontSize: '11px', fontWeight: 900, display: 'block', marginBottom: '8px', opacity: 0.6 }}>إعدادات العرض</label>
          <select className="sidebar-select" value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}>
            <option value={50}>إظهار 50 صف</option><option value={100}>إظهار 100 صف</option><option value={500}>إظهار 500 صف</option>
          </select>

          <div className="nav-group">
            <button className="nav-arrow-btn" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>التالي ◀</button>
            <button className="nav-arrow-btn" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>▶ السابق</button>
          </div>
          
          <div style={{ textAlign: 'center', color: 'white', marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 900 }}>صفحة {currentPage} من {totalPages || 1}</div>
            <div style={{ fontSize: '10px', opacity: 0.5 }}>إجمالي النتائج: {totalResults}</div>
          </div>

          <hr style={{ opacity: 0.1, margin: '15px 0' }} />
          <input type="text" placeholder="بحث موحد (اسم، موقع، بند)..." className="sidebar-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {!isSidebarOpen && <div style={{ fontSize: '28px', textAlign: 'center', marginTop: '40px' }}>⚙️</div>}
      </aside>

      {/* 🟢 المحتوى الرئيسي */}
      <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        
        {/* هيدر الشاشة */}
        <header className="no-print" style={{ marginBottom: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="print-hide-text">
            <h1 style={{ fontSize: '52px', fontWeight: 900, color: THEME.coffeeDark, margin: 0 }}>يوميات العمالة</h1>
            <p style={{ color: THEME.coffeeMain, fontWeight: 700, opacity: 0.8, fontSize: '20px' }}>رواسي اليسر للمقاولات</p>
          </div>
          <div className="logo-container" style={{ width: '320px', height: '140px', background: 'white', borderRadius: '24px', border: `1px solid ${THEME.sandDark}`, padding: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            <img src="/RYC_Logo.png" alt="RYC" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </header>

        {/* هيدر الجدول (شاشة) */}
        <div className="table-header-grid no-print">
           <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length === filteredLogs.length && filteredLogs.length > 0} />
           {['التاريخ', 'المقاول', 'اسم العامل', 'الموقع', 'البند', 'اليومية', 'الحضور', 'الملاحظات', 'الحالة'].map(h => <div key={h} className="label-header">{h}</div>)}
        </div>

        {/* بيانات الجدول (شاشة) */}
        {isLoading ? <div style={{textAlign:'center', padding:'50px', fontWeight:900, color:THEME.coffeeMain}}>⏳ جاري التحميل...</div> : filteredLogs.map((l) => {
          const badge = getAttendanceBadge(l.attendance_value);
          return (
            <div key={l.id} className="floating-row no-print" style={{ backgroundColor: selectedIds.includes(l.id) ? '#fffcf5' : 'white', border: selectedIds.includes(l.id) ? `1px solid ${THEME.goldAccent}` : '1px solid transparent' }}>
              <input type="checkbox" checked={selectedIds.includes(l.id)} onChange={() => toggleSelectRow(l.id)} />
              <div className="data-text" style={{ color: THEME.goldAccent }}>{l.work_date}</div>
              <div className="data-text" style={{ fontSize: '11px' }}>{l.sub_contractor || 'المركز'}</div>
              <div className="data-text" style={{ textAlign: 'right' }}>{l.worker_name}</div>
              <div className="data-text">{l.site_ref}</div>
              <div className="data-text">{l.work_item}</div>
              <div className="data-text" style={{ fontWeight: 900 }}>{l.daily_wage}</div>
              <div className="data-text"><span className="category-badge" style={{ backgroundColor: badge.bg, color: badge.color }}>{badge.text}</span></div>
              <div className="data-text" style={{ fontSize: '11px', opacity: 0.7 }}>{l.notes || '---'}</div>
              <div className="data-text">
                 {!l.is_posted ? (
                     <button onClick={() => handlePostSingle(l.id)} style={{ background: '#166534', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 900 }}>🚀</button>
                 ) : (
                     <span style={{ color: '#166534', fontWeight: 900, fontSize: '18px' }}>✅</span>
                 )}
              </div>
            </div>
          );
        })}

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
                <th style={{width:'80px'}}>التاريخ</th><th>المقاول</th><th style={{width:'150px'}}>اسم العامل</th>
                <th>الموقع</th><th>البند</th><th>اليومية</th><th>الحضور</th><th>الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((l) => (
                <tr key={l.id}>
                  <td>{l.work_date}</td><td>{l.sub_contractor}</td><td style={{fontWeight:'bold'}}>{l.worker_name}</td>
                  <td>{l.site_ref}</td><td>{l.work_item}</td><td>{l.daily_wage}</td><td>{l.attendance_value == 1 ? 'كامل':'نصف'}</td><td style={{fontSize:'9pt'}}>{l.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="print-footer"><span className="page-num"></span><span style={{ marginRight: '40px' }}>تقرير رسمي - رواسي اليسر للمقاولات - {new Date().toLocaleDateString('ar-SA')}</span></div>
        </div>
      </main>

      {/* 🟢 النافذة المنبثقة الشاملة مع حماية القيم الفارغة || '' */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(67, 52, 46, 0.7)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001 }} onClick={() => setIsAddModalOpen(false)}>
          <div className="glass-card" style={{ width: '750px', padding: '40px', background: 'white', borderRadius: '30px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontWeight: 900, color: THEME.coffeeDark, marginBottom: '30px', fontSize: '28px', borderBottom: `2px solid ${THEME.goldAccent}`, paddingBottom: '10px' }}>{editingId ? '✏️ تعديل بيانات اليومية' : '➕ إضافة يومية جديدة'}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                 <div><label className="label-header" style={{color:THEME.coffeeMain, display:'block', textAlign:'right', marginBottom:'5px'}}>📅 التاريخ</label>
                 <input type="date" className="modal-input" value={currentLog.work_date || ''} onChange={e => setCurrentLog({...currentLog, work_date: e.target.value})} /></div>
                 <div><label className="label-header" style={{color:THEME.coffeeMain, display:'block', textAlign:'right', marginBottom:'5px'}}>🏗️ المقاول</label>
                 <input className="modal-input" value={currentLog.sub_contractor || ''} onChange={e => setCurrentLog({...currentLog, sub_contractor: e.target.value})} /></div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                 <div><label className="label-header" style={{color:THEME.coffeeMain, display:'block', textAlign:'right', marginBottom:'5px'}}>👷 اسم العامل (دليل الشركاء)</label>
                 <select className="modal-input" value={currentLog.worker_name || ''} onChange={e => setCurrentLog({...currentLog, worker_name: e.target.value})}>
                    <option value="">-- اختر العامل --</option>
                    {workersList.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                 </select></div>
                 <div><label className="label-header" style={{color:THEME.coffeeMain, display:'block', textAlign:'right', marginBottom:'5px'}}>📍 الموقع / العمارة (دليل الشركاء)</label>
                 <select className="modal-input" value={currentLog.site_ref || ''} onChange={e => setCurrentLog({...currentLog, site_ref: e.target.value})}>
                    <option value="">-- اختر الموقع --</option>
                    {sitesList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                 </select></div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                 <div><label className="label-header" style={{color:THEME.coffeeMain, display:'block', textAlign:'right', marginBottom:'5px'}}>🔨 البند</label>
                 <input className="modal-input" value={currentLog.work_item || ''} onChange={e => setCurrentLog({...currentLog, work_item: e.target.value})} /></div>
                 <div><label className="label-header" style={{color:THEME.coffeeMain, display:'block', textAlign:'right', marginBottom:'5px'}}>💰 اليومية</label>
                 <input type="number" className="modal-input" value={currentLog.daily_wage || ''} onChange={e => setCurrentLog({...currentLog, daily_wage: e.target.value})} /></div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                 <div><label className="label-header" style={{color:THEME.coffeeMain, display:'block', textAlign:'right', marginBottom:'5px'}}>✅ الحضور</label>
                 <select className="modal-input" value={currentLog.attendance_value || '1'} onChange={e => setCurrentLog({...currentLog, attendance_value: e.target.value})}>
                    <option value="1">يوم كامل (1)</option><option value="0.5">نصف يوم (0.5)</option><option value="0">غياب (0)</option>
                 </select></div>
                 <div><label className="label-header" style={{color:THEME.coffeeMain, display:'block', textAlign:'right', marginBottom:'5px'}}>📝 الملاحظات</label>
                 {/* 👈 هنا كان الخطأ، وتم علاجه بوضع || '' لحماية القيمة */}
                 <input className="modal-input" value={currentLog.notes || ''} onChange={e => setCurrentLog({...currentLog, notes: e.target.value})} /></div>
               </div>

               <button onClick={handleSaveLog} disabled={isSaving} style={{ backgroundColor: THEME.coffeeDark, color: 'white', padding: '18px', borderRadius: '15px', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '16px', marginTop: '10px' }}>
                 {isSaving ? '⏳ جاري الحفظ...' : '✅ اعتماد البيانات'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}