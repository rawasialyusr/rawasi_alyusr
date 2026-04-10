"use client";
import { useEmpAdvLogic } from './emp_adv.logic';

const THEME = {
  sandLight: '#F4F1EE',
  sandDark: '#E6D5C3',
  coffeeMain: '#8C6A5D',
  coffeeDark: '#43342E',
  goldAccent: '#C5A059',
  white: '#FFFFFF'
};

export default function EmpAdvPage() {
  // --- تأكد من استدعاء كل هذه القيم من اللوجيك ---
  const {
    loading, displayedAdvances, 
    searchName, setSearchName,
    searchSite, setSearchSite, 
    startDate, setStartDate, 
    endDate, setEndDate,
    currentPage, setCurrentPage, 
    totalCount, totalPages, totalAdvanceVal,
    selectedIds, toggleSelectAll, toggleSelectRow,
    handleDelete, handleEdit,
    isEditModalOpen, setIsEditModalOpen,
    editingRecord, setEditingRecord,
    handleSaveUpdate,
    exportToExcel, handleImportExcel,
    pageSize, setPageSize 
  } = useEmpAdvLogic();

  const formatDate = (dateVal: any) => {
    if (!dateVal) return "---";
    if (typeof dateVal === 'object' && dateVal.$date) {
      const d = new Date(dateVal.$date);
      return d.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${THEME.goldAccent}; border-radius: 10px; }
        .sidebar-search { position: fixed; right: -290px; top: 0; height: 100vh; width: 340px; background: ${THEME.coffeeDark}; z-index: 1000; transition: 0.3s ease; padding: 25px 20px; display: flex; flex-direction: column; box-shadow: -10px 0 30px rgba(0,0,0,0.4); }
        .sidebar-search:hover { right: 0; }
        .sidebar-handle { position: absolute; left: -45px; top: 300px; background: ${THEME.coffeeDark}; color: ${THEME.goldAccent}; padding: 15px 10px; border-radius: 12px 0 0 12px; writing-mode: vertical-rl; font-weight: 900; cursor: pointer; }
        .sidebar-search input { background: rgba(255,255,255,0.06); border: 1px solid ${THEME.coffeeMain}; color: #fff; padding: 10px; border-radius: 6px; margin-bottom: 12px; width: 100%; font-size: 13px; }
        .summary-card { margin-top: 20px; background: ${THEME.goldAccent}; border-radius: 12px; padding: 15px; color: ${THEME.coffeeDark}; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
        table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
        th { background: ${THEME.coffeeDark}; color: ${THEME.goldAccent}; padding: 16px; position: sticky; top: 0; z-index: 10; }
        td { background: ${THEME.white}; padding: 14px; text-align: center; border-top: 1px solid ${THEME.sandDark}; border-bottom: 1px solid ${THEME.sandDark}; }
        .action-btn { border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; color: white; display: flex; align-items: center; justify-content: center; gap: 5px; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .modal-content { background: white; padding: 30px; border-radius: 15px; width: 500px; max-width: 90%; direction: rtl; }
        .modal-field { margin-bottom: 15px; }
        .modal-field label { display: block; margin-bottom: 5px; font-weight: bold; color: ${THEME.coffeeDark}; }
        .modal-field input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; }
        .save-btn { background: #2E7D32; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; flex: 1; font-weight: bold; }
        
        .cancel-btn { background: #777; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; flex: 1; }
        @media print {
  /* 1. اخفاء السايدبار والأزرار وأي عناصر تحكم */
  .sidebar-search, 
  .sidebar-handle, 
  .action-btn, 
  header div:last-child, /* منطقة أزرار الإكسيل والطباعة */
  select, 
  input[type="checkbox"] {
    display: none !important;
  }

  /* 2. إلغاء الهوامش والمسافات الخاصة بالسايدبار */
  .table-container {
    margin-right: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    background-color: white !important;
  }

  /* 3. تعديل شكل الجدول للطباعة */
  table {
    min-width: 100% !important;
    border-spacing: 0 !important; /* إلغاء المسافات بين الصفوف */
  }

  th, td {
    border: 1px solid #ccc !important; /* إضافة حدود خفيفة للطباعة */
    padding: 8px !important;
    background-color: white !important;
    color: black !important;
    font-size: 12px !important;
  }

  th {
    background-color: #f5f5f5 !important;
    color: black !important;
  }

  /* 4. إظهار محتوى السكرول بوكس بالكامل في الصفحة */
  .scroll-box {
    overflow: visible !important;
    height: auto !important;
    border: none !important;
    background: none !important;
  }

  /* 5. ضبط اتجاه الصفحة */
  body {
    direction: rtl !important;
    background-color: white !important;
  }
}
      `}</style>


      {/* Sidebar البحث */}
      <div className="sidebar-search">
        <div className="sidebar-handle">⚙️ التحكم والجرد</div>
        <h2 style={{ color: '#fff', fontSize: '18px', textAlign: 'center', marginBottom: '40px' }}>🔍 بحث | Search</h2>
        <input type="text" placeholder="اسم الموظف..." value={searchName} onChange={(e) => setSearchName(e.target.value)} />
        <input type="text" placeholder="البيان..." value={searchSite} onChange={(e) => setSearchSite(e.target.value)} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div className="summary-card">
          <div className="summary-row"><span>عدد العمليات:</span><span style={{fontWeight: 900}}>{totalCount}</span></div>
          <div className="summary-row" style={{ borderTop: '2px dashed rgba(0,0,0,0.1)', marginTop: '10px', paddingTop: '10px' }}>
            <span style={{fontWeight: 'bold'}}>إجمالي المبالغ:</span>
            <span style={{ fontSize: '24px', fontWeight: 900 }}>{totalAdvanceVal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="table-container">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h1 style={{ color: THEME.coffeeDark, fontSize: '30px', fontWeight: 900, margin: 0 }}>💸 مسحوبات العمالة</h1>
            <p style={{ color: THEME.coffeeMain }}>{loading ? 'جاري التحديث...' : `تم إيجاد ${totalCount} سجل`}</p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '5px', background: 'rgba(0,0,0,0.05)', padding: '5px', borderRadius: '10px' }}>
               <button className="action-btn" style={{background: THEME.goldAccent}} disabled={selectedIds.length !== 1} onClick={handleEdit}>✏️</button>
               <button className="action-btn" style={{background: '#e74c3c'}} disabled={selectedIds.length === 0} onClick={handleDelete}>🗑️ {selectedIds.length > 0 && `(${selectedIds.length})`}</button>
            </div>

            <div style={{ display: 'flex', gap: '5px' }}>
              <input type="file" id="import-excel" accept=".xlsx, .xls" onChange={handleImportExcel} style={{ display: 'none' }} />
              <button onClick={() => document.getElementById('import-excel')?.click()} style={{ background: '#2E7D32', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📥 استيراد</button>
              <button onClick={exportToExcel} style={{ background: '#935b48fb', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer' }}>📤 Excel</button>
              <button onClick={() => window.print()} style={{ background: THEME.coffeeMain, color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer' }}>🖨️ طباعة</button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'white', padding: '5px 12px', borderRadius: '10px' }}>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }} style={{ padding: '5px', borderRadius: '5px', border: `1px solid ${THEME.sandDark}`, fontSize: '12px' }}>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
              <div style={{ display: 'flex', gap: '3px', alignItems: 'center', borderRight: `1px solid ${THEME.sandDark}`, paddingRight: '8px' }}>
                <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: currentPage === 0 ? 0.3 : 1 }}>◀️</button>
                <span style={{ fontWeight: 'bold', fontSize: '13px', color: THEME.coffeeDark }}>{currentPage + 1} / {totalPages}</span>
                <button disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: currentPage >= totalPages - 1 ? 0.3 : 1 }}>▶️</button>
              </div>
            </div>
          </div>
        </header>

        <div className="scroll-box custom-scrollbar">
          <table>
            <thead>
              <tr>
                <th style={{ width: '50px' }}><input type="checkbox" onChange={toggleSelectAll} checked={displayedAdvances.length > 0 && selectedIds.length === displayedAdvances.length} /></th>
                <th>التاريخ</th><th>اسم الموظف</th><th>البيان</th><th>المبلغ المسحوب</th>
              </tr>
            </thead>
            <tbody>
              {displayedAdvances.map((adv, i) => (
                <tr key={adv._id?.$oid || adv._id || i}>
                  <td><input type="checkbox" checked={selectedIds.includes(String(adv._id?.$oid || adv._id))} onChange={() => toggleSelectRow(String(adv._id?.$oid || adv._id))} /></td>
                  <td style={{ color: '#1a237e' }}>{formatDate(adv.Date || adv.date)}</td>
                  <td style={{ fontWeight: '900', color: '#000' }}>{adv.Emp_Name || adv.emp_name}</td>
                  <td style={{ color: THEME.coffeeMain }}>{adv.Site || adv.site || '-'}</td>
                  <td style={{ fontWeight: '900', color: '#c62828' }}>{(Number(adv.amount || adv.amount) || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال التعديل المنبثق */}
      {isEditModalOpen && editingRecord && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>✏️ تعديل المسحوبات</h3>
            <div className="modal-field">
              <label>التاريخ</label>
              <input type="date" value={editingRecord.Date || editingRecord.date || ''} onChange={(e) => setEditingRecord({...editingRecord, Date: e.target.value})} />
            </div>
            <div className="modal-field">
              <label>اسم الموظف</label>
              <input type="text" value={editingRecord.Emp_Name || editingRecord.emp_name || ''} onChange={(e) => setEditingRecord({...editingRecord, Emp_Name: e.target.value})} />
            </div>
            <div className="modal-field">
              <label>البيان</label>
              <input type="text" value={editingRecord.Site || editingRecord.site || ''} onChange={(e) => setEditingRecord({...editingRecord, Site: e.target.value})} />
            </div>
            <div className="modal-field">
              <label>المبلغ</label>
              <input type="number" value={editingRecord.Advance_Val || editingRecord.advance_val || ''} onChange={(e) => setEditingRecord({...editingRecord, Advance_Val: Number(e.target.value)})} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={handleSaveUpdate} className="save-btn">💾 حفظ التعديلات</button>
              <button onClick={() => setIsEditModalOpen(false)} className="cancel-btn">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}