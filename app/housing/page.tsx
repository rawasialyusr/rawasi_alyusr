"use client";
import { useHousingLogic } from './housing_logic';

// الهوية البصرية المعتمدة (Daily Report Style)
const THEME = {
  sandLight: '#F4F1EE',   // خلفية الصفحة
  sandDark: '#E6D5C3',    // حدود وعناصر ثانوية
  coffeeMain: '#8C6A5D',  // نصوص فرعية
  coffeeDark: '#43342E',  // الهيدر والسايدبار
  goldAccent: '#C5A059',  // الأزرار والملخصات
  white: '#FFFFFF'        // خلفية الجداول
};

export default function HousingPage() {
  const {
    loading, displayedRecords,
    searchName, setSearchName,
    searchService, setSearchService,
    searchMonth, setSearchMonth, // ✅ تم إضافتها هنا الآن لتجنب ReferenceError
    startDate, setStartDate,
    endDate, setEndDate,
    totalAmount,
    totalCount,
    currentPage, setCurrentPage,
    totalPages, pageSize, setPageSize,
    exportToExcel, 
    downloadTemplate
  } = useHousingLogic();

  return (
    <div style={{ direction: 'rtl', height: '100vh', width: '100vw', display: 'flex', overflow: 'hidden', backgroundColor: THEME.sandLight }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
        
        .table-container { flex: 1; margin-right: 55px; padding: 20px; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
        .main-card { flex: 1; overflow: hidden; border-radius: 15px; background: rgba(255,255,255,0.3); display: flex; flex-direction: column; border: 1px solid ${THEME.sandDark}; }
        .scroll-box { flex: 1; overflow: auto; padding: 10px; }
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${THEME.goldAccent}; border-radius: 10px; border: 1px solid ${THEME.sandLight}; }

        .sidebar-search { position: fixed; right: -290px; top: 0; height: 100vh; width: 340px; background: ${THEME.coffeeDark}; z-index: 1000; transition: 0.3s ease; padding: 25px 20px; display: flex; flex-direction: column; box-shadow: -10px 0 30px rgba(0,0,0,0.4); }
        .sidebar-search:hover { right: 0; }
        .sidebar-handle { position: absolute; left: -45px; top: 300px; background: ${THEME.coffeeDark}; color: ${THEME.goldAccent}; padding: 15px 10px; border-radius: 12px 0 0 12px; writing-mode: vertical-rl; font-weight: 900; cursor: pointer; }
        
        .sidebar-search input { background: rgba(255,255,255,0.06); border: 1px solid ${THEME.coffeeMain}; color: #fff; padding: 10px; border-radius: 6px; margin-bottom: 12px; width: 100%; font-size: 13px; outline: none; }
        .filter-label { color: ${THEME.goldAccent}; font-size: 13px; margin-bottom: 5px; font-weight: bold; display: block; }
        
        .summary-card { margin-top: 15px; background: ${THEME.goldAccent}; border-radius: 12px; padding: 15px; color: ${THEME.coffeeDark}; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }

        table { width: 100%; border-collapse: separate; border-spacing: 0 8px; min-width: 900px; }
        th { background: ${THEME.coffeeDark}; color: ${THEME.goldAccent}; padding: 16px; position: sticky; top: 0; z-index: 10; font-weight: 900; }
        td { background: ${THEME.white}; padding: 14px; text-align: center; border-top: 1px solid ${THEME.sandDark}; border-bottom: 1px solid ${THEME.sandDark}; color: #000; }
        
        .tool-btn { color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 5px; transition: 0.2s; }
        .tool-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        @media print { .no-print { display: none !important; } .table-container { margin-right: 0; } }
      `}</style>

      {/* Sidebar UI */}
      <div className="sidebar-search no-print">
        <div className="sidebar-handle">⚙️ التحكم والفلاتر</div>
        <h2 style={{ color: '#fff', fontSize: '18px', textAlign: 'center', marginBottom: '30px', fontWeight: 900 }}>🔍 بحث متقدم</h2>

        <label className="filter-label">الاسم أو الموقع</label>
        <input placeholder="إبحث بالاسم..." value={searchName} onChange={(e) => { setSearchName(e.target.value); setCurrentPage(0); }} />

        {/* ✅ فلتر شهر الاستحقاق المضاف حديثاً */}
        <label className="filter-label">شهر الاستحقاق</label>
        <input 
          placeholder="مثال: يناير 2024" 
          value={searchMonth} 
          onChange={(e) => { setSearchMonth(e.target.value); setCurrentPage(0); }} 
        />

        <label className="filter-label">نوع الخدمة / الاشتراك</label>
        <input placeholder="إبحث بالخدمة..." value={searchService} onChange={(e) => { setSearchService(e.target.value); setCurrentPage(0); }} />

        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <label className="filter-label">من تاريخ</label>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(0); }} style={{ colorScheme: 'dark' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="filter-label">إلى تاريخ</label>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(0); }} style={{ colorScheme: 'dark' }} />
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-row">
            <span>إجمالي السجلات:</span>
            <b style={{ fontSize: '18px' }}>{totalCount}</b>
          </div>
          <div className="summary-row" style={{ borderTop: '2px dashed rgba(0,0,0,0.1)', marginTop: '10px', paddingTop: '10px' }}>
            <span>المبلغ الإجمالي:</span>
            <b style={{ fontSize: '20px' }}>{(totalAmount || 0).toLocaleString()}</b>
          </div>
        </div>
      </div>

      <div className="table-container">
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h1 style={{ color: THEME.coffeeDark, fontSize: '30px', fontWeight: 900, margin: 0 }}>سجل المواقع والاشتراكات 🌐</h1>
            <div style={{ width: '60px', height: '4px', background: THEME.goldAccent, marginTop: '5px' }}></div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
              <button className="tool-btn" style={{ background: '#2E7D32' }} onClick={downloadTemplate}>📄 نموذج</button>
              <button className="tool-btn" style={{ background: '#935b48' }} onClick={exportToExcel}>📤 Excel</button>
              <button className="tool-btn" style={{ background: THEME.coffeeMain }} onClick={() => window.print()}>🖨️ طباعة</button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'white', padding: '5px 12px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: `1px solid ${THEME.sandDark}` }}>
              <select 
                value={pageSize} 
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
                style={{ padding: '5px', borderRadius: '5px', border: 'none', fontWeight: 'bold' }}
              >
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
              <div style={{ width: '1px', height: '20px', background: THEME.sandDark, margin: '0 5px' }}></div>
              <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>◀️</button>
              <span style={{ fontWeight: '900', color: THEME.coffeeDark }}>{currentPage + 1} / {totalPages}</span>
              <button disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>▶️</button>
            </div>
          </div>
        </div>

        <div className="main-card">
          <div className="scroll-box custom-scrollbar">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '100px', color: THEME.coffeeMain, fontWeight: 'bold' }}>جاري تحميل البيانات...</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>الاسم / الموقع</th>
                    <th>شهر الاستحقاق</th>
                    <th>نوع الخدمة</th>
                    <th>المبلغ</th>
                    <th>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRecords.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: '900', color: '#000' }}>{r.display_name}</td>
                      <td style={{ color: '#1a237e', fontWeight: 'bold' }}>{r.display_month}</td>
                      <td style={{ color: THEME.coffeeDark, fontWeight: 'bold' }}>{r.display_service}</td>
                      <td style={{ fontWeight: '900', color: '#c62828', fontSize: '16px' }}>
                        {Number(r.display_amount).toLocaleString()}
                      </td>
                      <td style={{ fontSize: '12px', color: '#444' }}>{r.display_notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}