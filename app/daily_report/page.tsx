"use client";

import { useDailyReportLogic } from './daily_report_logic';

const THEME = {
  sandLight: '#F4F1EE',
  sandDark: '#E6D5C3',
  coffeeMain: '#8C6A5D',
  coffeeDark: '#43342E',
  goldAccent: '#C5A059',
  white: '#FFFFFF'
};

export default function DailyReportsPage() {
  const {
    loading, displayedReports, 
    searchName, setSearchName,
    searchCont, setSearchCont, 
    searchSite, setSearchSite,
    startDate, setStartDate, 
    endDate, setEndDate,
    currentPage, setCurrentPage, 
    totalCount, totalPages,
    totalDWVal, totalProd, totalDaysCount, 
    exportToExcel,
    totalAttendance,
    downloadTemplate, 
    handleImportExcel,
    selectedIds,
    searchItem, 
    setSearchItem, 
    toggleSelectAll, 
    toggleSelectRow, 
    handleDelete, 
    handleEdit,
    isEditModalOpen, setIsEditModalOpen,
    editingRecord, setEditingRecord,
    handleSaveUpdate,
    pageSize, setPageSize 
  } = useDailyReportLogic();

  return (
    <div style={{ direction: 'rtl', height: '100vh', width: '100vw', display: 'flex', overflow: 'hidden', backgroundColor: THEME.sandLight }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
        .table-container { 
          flex: 1; 
          margin-right: 55px; 
          padding: 20px; 
          display: flex; 
          flex-direction: column; 
          height: 100vh; 
          overflow: hidden; 
        }        
        .scroll-box { 
          flex: 1; 
          overflow: auto; 
          border-radius: 15px; 
          background: rgba(255,255,255,0.3); 
          padding: 10px;
          border: 1px solid ${THEME.sandDark};
          position: relative; /* أضيفت لدعم طبقة اللودينج */
        }
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${THEME.goldAccent}; border-radius: 10px; border: 1px solid ${THEME.sandLight}; }
        .sidebar-search { position: fixed; right: -290px; top: 0; height: 100vh; width: 340px; background: ${THEME.coffeeDark}; z-index: 1000; transition: 0.3s ease; padding: 25px 20px; display: flex; flex-direction: column; box-shadow: -10px 0 30px rgba(0,0,0,0.4); }
        .sidebar-search:hover { right: 0; }
        .sidebar-handle { position: absolute; left: -45px; top: 300px; background: ${THEME.coffeeDark}; color: ${THEME.goldAccent}; padding: 15px 10px; border-radius: 12px 0 0 12px; writing-mode: vertical-rl; font-weight: 900; cursor: pointer; }
        .sidebar-search input { background: rgba(255,255,255,0.06); border: 1px solid ${THEME.coffeeMain}; color: #fff; padding: 10px; border-radius: 6px; margin-bottom: 12px; width: 100%; font-size: 13px; }
        .summary-card { margin-top: 15px; background: ${THEME.goldAccent}; border-radius: 12px; padding: 15px; color: ${THEME.coffeeDark}; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
        table { width: 100%; border-collapse: separate; border-spacing: 0 8px; min-width: 1600px; }
        th { background: ${THEME.coffeeDark}; color: ${THEME.goldAccent}; padding: 16px; position: sticky; top: 0; z-index: 10; }
        td { background: ${THEME.white}; padding: 14px; text-align: center; border-top: 1px solid ${THEME.sandDark}; border-bottom: 1px solid ${THEME.sandDark}; transition: 0.2s; }
        .action-btn { border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; color: white; display: flex; align-items: center; justify-content: center; gap: 5px; }
        .edit-btn { background: ${THEME.goldAccent}; }
        .delete-btn { background: #e74c3c; }
        .action-btn:disabled { background: #ccc; cursor: not-allowed; opacity: 0.6; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .modal-content { background: white; padding: 30px; border-radius: 15px; width: 500px; max-width: 90%; direction: rtl; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .save-btn { background: #2E7D32; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; flex: 1; font-weight: bold; }
        .cancel-btn { background: #777; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; flex: 1; }
        
        /* تأثير التظليل عند اختيار صف */
        .selected-row td { background-color: #FFF9C4 !important; border-color: ${THEME.goldAccent} !important; }
        
        /* طبقة اللودينج */
        .loading-overlay {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(244, 241, 238, 0.7); z-index: 20;
          display: flex; alignItems: center; justifyContent: center;
          font-weight: bold; color: ${THEME.coffeeDark};
          backdrop-filter: blur(2px);
        }
      `}</style>
      
      {/* Sidebar UI */}
      <div className="sidebar-search">
        <div className="sidebar-handle">⚙️ التحكم والجرد</div>
        <h2 style={{ color: '#fff', fontSize: '18px', textAlign: 'center', marginBottom: '90px' }}>🔍 بحث | Search </h2>
        <input type="text" placeholder="اسم الموظف..." value={searchName} onChange={(e) => { setSearchName(e.target.value); setCurrentPage(0); }} />
        <input type="text" placeholder="المقاول..." value={searchCont} onChange={(e) => { setSearchCont(e.target.value); setCurrentPage(0); }} />
        <input type="text" placeholder="البند..." value={searchItem} onChange={(e) => { setSearchItem(e.target.value); setCurrentPage(0); }} />
        <input type="text" placeholder="الموقع..." value={searchSite} onChange={(e) => { setSearchSite(e.target.value); setCurrentPage(0); }} />
        
        <div style={{ display: 'flex', gap: '8px' }}>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(0); }} />
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(0); }} />
        </div>
        <div className="summary-card">
          <div className="summary-row"><span>عدد السجلات:</span><span style={{fontWeight: 900}}>{totalDaysCount}</span></div>
          <div className="summary-row"><span>أيام الحضور:</span><span style={{ fontSize: '22px', fontWeight: 900 }}>{totalAttendance} يوم</span></div>
          <div className="summary-row"><span>إجمالي الإنتاج:</span><span style={{fontWeight: 900}}>{totalProd.toLocaleString()}</span></div>
          <div className="summary-row" style={{ borderTop: '2px dashed rgba(0,0,0,0.1)', marginTop: '10px', paddingTop: '10px' }}>
            <span style={{fontWeight: 'bold'}}>إجمالي اليوميات:</span>
            <span style={{ fontSize: '22px', fontWeight: 900 }}>{totalDWVal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h1 style={{ color: THEME.coffeeDark, fontSize: '30px', fontWeight: 900, margin: 0 }}>السجّل اليومي 📝</h1>
            <p style={{ color: THEME.coffeeMain }}>{loading ? 'جاري التحديث...' : `تم إيجاد ${totalCount} سجل`}</p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '5px', background: 'rgba(0,0,0,0.05)', padding: '5px', borderRadius: '10px' }}>
               <button className="action-btn edit-btn" disabled={selectedIds.length !== 1} onClick={handleEdit} title="تعديل">✏️</button>
               <button className="action-btn delete-btn" disabled={selectedIds.length === 0} onClick={handleDelete} title="حذف">🗑️ {selectedIds.length > 0 && `(${selectedIds.length})`}</button>
            </div>

            <div style={{ display: 'flex', gap: '5px' }}>
              <input type="file" id="import-excel" accept=".xlsx, .xls" onChange={handleImportExcel} style={{ display: 'none' }} />
              <button onClick={() => document.getElementById('import-excel')?.click()} style={{ background: '#2E7D32', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', gap: '5px', alignItems: 'center' }}>📥 استيراد</button>
              <button onClick={downloadTemplate} style={{ background: '#0277bd', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', gap: '5px', alignItems: 'center' }}>📄 نموذج</button>
              <button onClick={exportToExcel} style={{ background: '#935b48fb', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'center' }}>📤 Excel</button>
              <button onClick={() => window.print()} style={{ background: THEME.coffeeMain, color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer' }}>🖨️ طباعة</button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'white', padding: '5px 12px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }} style={{ padding: '5px', borderRadius: '5px', border: `1px solid ${THEME.sandDark}`, fontSize: '12px',color: '#000000' }}>
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
              <div style={{ display: 'flex', gap: '3px', alignItems: 'center', borderRight: `1px solid ${THEME.sandDark}`, paddingRight: '8px' }}>
                <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: currentPage === 0 ? 0.3 : 1, fontSize: '16px' }}>◀️</button>
                <span style={{ fontWeight: 'bold', fontSize: '13px', color: THEME.coffeeDark, margin: '0 5px' }}>{currentPage + 1} / {totalPages}</span>
                <button disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: currentPage >= totalPages - 1 ? 0.3 : 1, fontSize: '16px' }}>▶️</button>
              </div>
            </div>
          </div>
        </div>

        <div className="scroll-box custom-scrollbar">
          {/* طبقة حماية أثناء التحميل */}
          {loading && (
            <div className="loading-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '30px' }}>⏳</div>
                  <div>جاري تحديث البيانات...</div>
               </div>
            </div>
          )}

          <table>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>
                  <input type="checkbox" checked={displayedReports.length > 0 && selectedIds.length === displayedReports.length} onChange={toggleSelectAll} />
                </th>
                {["التاريخ", "المقاول", "الموظف", "الموقع", "البند", "الإنتاج", "الوحدة", "المهنة","اليومية", "الحضور", "ملاحظات"].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {displayedReports.length > 0 ? (
                displayedReports.map((r, i) => {
                  const rowId = r.tempId || String(r.id || r._id?.$oid || `row-${i}`);
                  const isSelected = selectedIds.includes(rowId);
                  return (
                    <tr key={rowId} className={isSelected ? 'selected-row' : ''}>
                      <td>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelectRow(rowId)} />
                      </td>
                      <td style={{ color: '#1a237e', minWidth: '180px' }}>
                        {(() => {
                          let rawValue = r.Date || r.date;
                          if (!rawValue) return '-';
                          if (typeof rawValue === 'object' && rawValue.$date) rawValue = rawValue.$date;
                          let dateObj = (typeof rawValue === 'number' || !isNaN(Number(rawValue))) 
                            ? new Date(Math.round((Number(rawValue) - 25569) * 86400 * 1000)) 
                            : new Date(rawValue);
                          if (isNaN(dateObj.getTime()) || dateObj.getFullYear() <= 1970) return String(rawValue);
                          return dateObj.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        })()}
                      </td>
                      <td style={{ color: '#43342E' }}>{r.Main_Cont || '-'}</td>
                      <td style={{ fontWeight: '900', color: '#000000' }}>{r.Emp_Name || '-'}</td>
                      <td style={{ color: '#555' }}>{r.Site || '-'}</td>
                      <td style={{ color: '#0277bd' }}>{r.Item || '-'}</td>
                      <td style={{ fontWeight: 'bold', color: '#2E7D32' }}>{r.Prod || '-'}</td>
                      <td style={{ color: '#777' }}>{r.Unit || '-'}</td>
                      <td style={{ color: '#6a1b9a' }}>{r.sk_level || r.Sk_level || '-'}</td>
                      <td style={{ fontWeight: '900', color: '#c62828' }}>{r.D_W || '-'}</td>
                      <td style={{ color: '#00695c', fontWeight: 'bold' }}>{r.Attendance || '-'}</td>
                      <td style={{ color: '#333', fontSize: '12px' }}>{r.Notes || '-'}</td>
                    </tr>
                  );
                })
              ) : !loading && (
                <tr><td colSpan={12} style={{ padding: '40px', textAlign: 'center' }}>لا توجد بيانات تطابق البحث 🔍</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isEditModalOpen && editingRecord && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '800px', maxWidth: '95%', backgroundColor: '#fff' }}>
            <h3 style={{ borderBottom: `2px solid ${THEME.goldAccent}`, paddingBottom: '10px', color: THEME.coffeeDark }}>✏️ تعديل بيانات السجل بالكامل</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
              {[
                { label: "التاريخ", key: "Date", type: "date" },
                { label: "اسم الموظف", key: "Emp_Name", type: "text" },
                { label: "المقاول", key: "Main_Cont", type: "text" },
                { label: "الموقع", key: "Site", type: "text" },
                { label: "البند", key: "Item", type: "text" },
                { label: "المهنة", key: "sk_level", type: "text" },
                { label: "الإنتاج", key: "Prod", type: "number" },
                { label: "اليومية", key: "D_W", type: "number", step: "0.5" }
              ].map((field) => (
                <div className="modal-field" key={field.key}>
                  <label style={{ color: THEME.coffeeDark, fontWeight: 'bold' }}>{field.label}</label>
                  <input 
                    type={field.type} 
                    step={field.step}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: '#000', fontWeight: 'bold' }}
                    value={editingRecord[field.key] || ''} 
                    onChange={(e) => setEditingRecord({...editingRecord, [field.key]: field.type === 'number' ? +e.target.value : e.target.value})} 
                  />
                </div>
              ))}
              <div className="modal-field">
                <label style={{ color: THEME.coffeeDark, fontWeight: 'bold' }}>الحضور</label>
                <select 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: '#000', fontWeight: 'bold' }}
                  value={editingRecord.Attendance || ''}
                  onChange={(e) => setEditingRecord({...editingRecord, Attendance: e.target.value})}
                >
                  <option value="حاضر">حاضر</option>
                  <option value="غائب">غائب</option>
                  <option value="إجازة">إجازة</option>
                </select>
              </div>
              <div className="modal-field" style={{ gridColumn: 'span 2' }}>
                <label style={{ color: THEME.coffeeDark, fontWeight: 'bold' }}>ملاحظات</label>
                <input type="text" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: '#000', fontWeight: 'bold' }} value={editingRecord.Notes || ''} onChange={(e) => setEditingRecord({...editingRecord, Notes: e.target.value})} />
              </div>
            </div>
            <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={handleSaveUpdate} className="save-btn">💾 حفظ التعديلات</button>
              <button onClick={() => setIsEditModalOpen(false)} className="cancel-btn">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}