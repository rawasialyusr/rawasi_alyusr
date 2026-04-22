"use client";
// تم تصحيح الاستيراد هنا ليكون الملف الخاص بالخصومات
import { useEmpAdvLogic } from './emp_adv.logic';
const THEME = {
  sandLight: '#F4F1EE',
  sandDark: '#E6D5C3',
  coffeeMain: '#8C6A5D',
  coffeeDark: '#43342E',
  goldAccent: '#C5A059',
  white: '#FFFFFF'
};

export default function EmpDeductionsPage() {
  const {
    loading, totalDedVal, totalCount, displayedDeductions,
    searchName, setSearchName, searchReason, setSearchReason,
    startDate, setStartDate, endDate, setEndDate,
    selectedIds, toggleSelectRow, toggleSelectAll,
    handleEdit, handleDelete,
    isEditModalOpen, setIsEditModalOpen,
    editingRecord, setEditingRecord,
    handleSaveUpdate,
    exportToExcel, 
    handleImportExcel, 
    downloadTemplate,
    currentPage, setCurrentPage, totalPages, pageSize, setPageSize 
  } = useEmpAdvLogic();// استخدام اللوجيك الصحيح

  const formatDate = (dateVal: any) => {
    if (!dateVal) return "---";
    if (typeof dateVal === 'object' && dateVal.$date) return new Date(dateVal.$date).toLocaleDateString('ar-EG');
    return String(dateVal);
  };

  return (
    <div style={{ direction: 'rtl', height: '100vh', width: '100vw', display: 'flex', overflow: 'hidden', backgroundColor: THEME.sandLight }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
        
        .table-container { flex: 1; margin-right: 55px; padding: 20px; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }        
        .scroll-box { flex: 1; overflow: auto; border-radius: 15px; background: rgba(255,255,255,0.3); padding: 10px; border: 1px solid ${THEME.sandDark}; }
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${THEME.goldAccent}; border-radius: 10px; border: 1px solid ${THEME.sandLight}; }

        /* Sidebar - ضبط الحدود */
        .sidebar-search { position: fixed; right: -290px; top: 0; height: 100vh; width: 340px; background: ${THEME.coffeeDark}; z-index: 1000; transition: 0.3s ease; padding: 25px 20px; display: flex; flex-direction: column; box-shadow: -10px 0 30px rgba(0,0,0,0.4); border-left: 1px solid ${THEME.goldAccent}; }
        .sidebar-search:hover { right: 0; }
        .sidebar-handle { position: absolute; left: -45px; top: 300px; background: ${THEME.coffeeDark}; color: ${THEME.goldAccent}; padding: 15px 10px; border-radius: 12px 0 0 12px; writing-mode: vertical-rl; font-weight: 900; cursor: pointer; border: 1px solid ${THEME.goldAccent}; border-right: none; }
        .sidebar-search input { background: rgba(255,255,255,0.06); border: 1px solid ${THEME.coffeeMain}; color: #fff; padding: 10px; border-radius: 6px; margin-bottom: 12px; width: 100%; font-size: 13px; outline: none; }
        
        .date-grid { display: flex; gap: 8px; width: 100%; margin-bottom: 12px; }
        .date-grid input { margin-bottom: 0; flex: 1; width: 0; }

        .summary-card { margin-top: auto; background: ${THEME.goldAccent}; border-radius: 12px; padding: 15px; color: ${THEME.coffeeDark}; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
        .summary-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05); font-size: 14px; }

        .action-btn { border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; color: white; display: flex; align-items: center; justify-content: center; gap: 5px; }
        .edit-btn { background: ${THEME.goldAccent}; }
        .delete-btn { background: #e74c3c; }
        .action-btn:disabled { background: #ccc; cursor: not-allowed; opacity: 0.6; }

        table { width: 100%; border-collapse: separate; border-spacing: 0 8px; min-width: 1000px; }
        th { background: ${THEME.coffeeDark}; color: ${THEME.goldAccent}; padding: 16px; position: sticky; top: 0; z-index: 10; }
        td { background: ${THEME.white}; padding: 14px; text-align: center; border-top: 1px solid ${THEME.sandDark}; border-bottom: 1px solid ${THEME.sandDark}; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(4px); }
        .modal-content { background: white; padding: 30px; border-radius: 20px; width: 600px; max-width: 95%; box-shadow: 0 20px 40px rgba(0,0,0,0.4); border: 2px solid ${THEME.sandDark}; }
        .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
        .modal-field { display: flex; flex-direction: column; gap: 5px; }
        .modal-field label { font-weight: bold; color: ${THEME.coffeeDark}; font-size: 13px; }
        .modal-field input { padding: 10px; border: 1px solid ${THEME.sandDark}; border-radius: 8px; background: ${THEME.sandLight}; font-weight: 600; outline: none; }
      `}</style>
      
      {/* Sidebar UI */}
      <div className="sidebar-search no-print">
        <div className="sidebar-handle">⚙️ التحكم والجرد</div>
        <h2 style={{ color: '#fff', fontSize: '18px', textAlign: 'center', marginBottom: '60px', fontWeight: 900 }}>🔍 بحث | Search </h2>
        
        <input type="text" placeholder="اسم الموظف..." value={searchName} onChange={(e) => setSearchName(e.target.value)} />
        <input type="text" placeholder="السبب..." value={searchReason} onChange={(e) => setSearchReason(e.target.value)} />
        
        <div className="date-grid">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} title="من تاريخ" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} title="إلى تاريخ" />
        </div>

        <div className="summary-card">
          <div className="summary-row"><span>عدد السجلات:</span><span style={{fontWeight: 900}}>{totalCount}</span></div>
          <div className="summary-row" style={{ borderTop: '2px dashed rgba(0,0,0,0.1)', marginTop: '10px', paddingTop: '10px' }}>
            <span style={{fontWeight: 'bold'}}>إجمالي الخصومات:</span>
            <span style={{ fontSize: '20px', fontWeight: 900 }}>{totalDedVal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="table-container">
        {/* Header - مطابقة للتقارير اليومية */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
  {/* الجزء الأيمن: العنوان */}
  <div>
    <h1 style={{ color: THEME.coffeeDark, fontSize: '30px', fontWeight: 900, margin: 0 }}>سجل الخصومات 🚫</h1>
    <div style={{ width: '80px', height: '4px', background: THEME.goldAccent, marginTop: '4px' }}></div>
  </div>
  
  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
    
    {/* 1. أزرار العمليات (تعديل ومسح) - نفس شكل ديلي ريبورت */}
    <div style={{ display: 'flex', gap: '5px', background: 'rgba(0,0,0,0.05)', padding: '5px', borderRadius: '10px' }}>
       <button className="action-btn edit-btn" disabled={selectedIds.length !== 1} onClick={handleEdit} title="تعديل">✏️</button>
       <button className="action-btn delete-btn" disabled={selectedIds.length === 0} onClick={handleDelete} title="حذف">🗑️ {selectedIds.length > 0 && `(${selectedIds.length})`}</button>
    </div>

    {/* 2. أزرار الأدوات (إكسيل، استيراد، طباعة) */}
    <div style={{ display: 'flex', gap: '5px' }}>
      <input type="file" id="import-excel" accept=".xlsx, .xls" onChange={handleImportExcel} style={{ display: 'none' }} />
      <button 
        onClick={() => document.getElementById('import-excel')?.click()} 
        style={{ background: '#2E7D32', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
      >
        📥 استيراد
      </button>
      
      <button 
        onClick={downloadTemplate} 
        style={{ background: '#0277bd', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
      >
        📄 نموذج
      </button>
      
      <button 
        onClick={exportToExcel} 
        style={{ background: '#935b48', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
      >
        📤 Excel
      </button>
      
      <button onClick={() => window.print()} style={{ background: THEME.coffeeMain, color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>🖨️ طباعة</button>
    </div>

    {/* 3. الترقيم وحجم الصفحة */}
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'white', padding: '5px 12px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
      <select 
        value={pageSize} 
        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
        style={{ padding: '5px', borderRadius: '5px', border: `1px solid ${THEME.sandDark}`, fontSize: '12px', color: '#000' }}
      >
        <option value={100}>100</option>
        <option value={500}>500</option>
        <option value={1000}>1000</option>
      </select>
      
      <div style={{ display: 'flex', gap: '3px', alignItems: 'center', borderRight: `1px solid ${THEME.sandDark}`, paddingRight: '8px' }}>
        <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: currentPage === 0 ? 0.3 : 1 }}>◀️</button>
        <span style={{ fontWeight: 'bold', fontSize: '13px', color: THEME.coffeeDark, margin: '0 5px' }}>{currentPage + 1} / {totalPages}</span>
        <button disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: currentPage >= totalPages - 1 ? 0.3 : 1 }}>▶️</button>
      </div>
    </div>
  </div>
</div>
        

        <div className="scroll-box custom-scrollbar">
          <table>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>
                  <input type="checkbox" checked={displayedDeductions.length > 0 && selectedIds.length === displayedDeductions.length} onChange={toggleSelectAll} />
                </th>
                <th>التاريخ</th>
                <th>اسم الموظف</th>
                <th>قيمة الخصم</th>
                <th>السبب / البيان</th>
                <th>الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {displayedDeductions.map((d, i) => {
                const rowId = String(d._id?.$oid || d._id || i);
                return (
                  <tr key={rowId}>
                    <td><input type="checkbox" checked={selectedIds.includes(rowId)} onChange={() => toggleSelectRow(rowId)} /></td>
                    <td style={{ color: '#1a237e' }}>{formatDate(d.Date || d.date)}</td>
                    <td style={{ fontWeight: '900', color: '#000' }}>{d.Emp_Name || d.emp_name}</td>
                    <td style={{ fontWeight: '900', color: '#c62828' }}>{Number(d.Amount || d.amount || 0).toLocaleString()}</td>
                    <td style={{ color: '#0277bd' }}>{d.Reason || d.reason || '-'}</td>
                    <td style={{ color: '#333', fontSize: '12px' }}>{d.Notes || d.notes || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة التعديل المظبوطة */}
      {isEditModalOpen && editingRecord && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: 0, color: THEME.coffeeDark, borderBottom: `2px solid ${THEME.goldAccent}`, paddingBottom: '10px' }}>✏️ تعديل بيانات الخصم</h3>
            
            <div className="modal-grid">
              <div className="modal-field">
                <label>تاريخ الخصم</label>
                <input type="date" value={editingRecord.Date || editingRecord.date || ''} onChange={(e) => setEditingRecord({...editingRecord, Date: e.target.value})} />
              </div>
              <div className="modal-field">
                <label>اسم الموظف</label>
                <input type="text" value={editingRecord.Emp_Name || editingRecord.emp_name || ''} onChange={(e) => setEditingRecord({...editingRecord, Emp_Name: e.target.value})} />
              </div>
              <div className="modal-field">
                <label>القيمة (ج.م)</label>
                <input type="number" value={editingRecord.Amount || editingRecord.amount || ''} onChange={(e) => setEditingRecord({...editingRecord, Amount: +e.target.value})} />
              </div>
              <div className="modal-field">
                <label>السبب</label>
                <input type="text" value={editingRecord.Reason || editingRecord.reason || ''} onChange={(e) => setEditingRecord({...editingRecord, Reason: e.target.value})} />
              </div>
              <div className="modal-field" style={{ gridColumn: 'span 2' }}>
                <label>ملاحظات</label>
                <input type="text" value={editingRecord.Notes || editingRecord.notes || ''} onChange={(e) => setEditingRecord({...editingRecord, Notes: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
              <button onClick={handleSaveUpdate} className="action-btn" style={{ background: '#2E7D32', flex: 2, padding: '12px' }}>💾 حفظ التعديلات</button>
              <button onClick={() => setIsEditModalOpen(false)} className="action-btn" style={{ background: '#777', flex: 1 }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}