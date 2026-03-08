"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

const THEME = {
  sandLight: '#F4F1EE',
  sandDark: '#E6D5C3',
  coffeeMain: '#8C6A5D',
  coffeeDark: '#43342E',
  goldAccent: '#C5A059',
  white: '#FFFFFF'
};

export default function DailyReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchName, setSearchName] = useState(''); 
  const [searchCont, setSearchCont] = useState('');
  const [searchItem, setSearchItem] = useState('');
  const [searchSite, setSearchSite] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100); 
  const [totalCount, setTotalCount] = useState(0);

  // --- حسابات الجرد اللحظية ---
  const totalDWVal = reports.reduce((acc, curr) => acc + (Number(curr.D_W) || 0), 0);
  const totalProd = reports.reduce((acc, curr) => acc + (Number(curr.Prod) || 0), 0);
  const totalDaysCount = reports.length; 

  useEffect(() => {
    const handler = setTimeout(() => {
      setCurrentPage(0);
      fetchReports();
    }, 500);
    return () => clearTimeout(handler);
  }, [searchName, searchCont, searchItem, searchSite, startDate, endDate]);

  useEffect(() => { fetchReports(); }, [currentPage, pageSize]);
  useEffect(() => { fetchAssets(); }, []);

  async function fetchAssets() {
    const { data: bgData } = supabase.storage.from('public0').getPublicUrl('back0.png');
    if (bgData?.publicUrl) setBgUrl(bgData.publicUrl);
  }

  async function fetchReports() {
    setLoading(true);
    try {
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;
      let query = supabase.from('Daily_Report').select('*', { count: 'exact' });
      
      if (searchName) query = query.ilike('Emp_Name', `%${searchName}%`);
      if (searchCont) query = query.ilike('Main_Cont', `%${searchCont}%`);
      if (searchItem) query = query.ilike('Item', `%${searchItem}%`);
      if (searchSite) query = query.ilike('Site', `%${searchSite}%`);
      if (startDate) query = query.gte('Date', startDate);
      if (endDate) query = query.lte('Date', endDate);
      
      const { data, error, count } = await query.order('Date', { ascending: false }).range(from, to);
      if (error) throw error;
      setReports(data || []);
      setTotalCount(count || 0);
    } catch (err: any) { console.error(err.message); } 
    finally { setLoading(false); }
  }
const exportToExcel = () => {
  // 1. تجهيز البيانات (نأخذ النسخة الحالية من الـ reports)
  const worksheet = XLSX.utils.json_to_sheet(reports);
  
  // 2. إنشاء كتاب عمل (Workbook)
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Report");
  
  // 3. تحميل الملف باسم محدد مع التاريخ الحالي
  const fileName = `تقرير_الإنتاجية_${new Date().toLocaleDateString('ar-EG')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
  <div style={{ 
    direction: 'rtl', 
    height: '100vh',    // مهم جداً لثبات الصفحة
    width: '100vw',
    display: 'flex', 
    overflow: 'hidden', // يمنع ظهور سكرول للمتصفح نفسه
    // بقية تنسيقات الخلفية...
  }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        * { box-sizing: border-box; }
/* 1. اجعل الصفحة الأم (الخلفية) ثابتة لا تتحرك لأسفل */
.parent-div { 
  height: 100vh; 
  overflow: hidden; 
  display: flex; 
}

/* 2. حاوية الجدول: اجعلها مرنة لتأخذ الطول المتبقي */
.table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden; /* لمنع سكرول الصفحة ككل */
}

/* 3. صندوق البيانات: هذا هو السر في ظهور السكرول بالأسفل */
.scroll-box {
  flex: 1;
  overflow: auto; /* سيظهر شريط التمرير هنا في أسفل الشاشة */
  background: rgba(255,255,255,0.4);
}
        /* شريط التمرير العرضي المطور - ظاهر دائماً بالأسفل */
        .custom-scrollbar::-webkit-scrollbar { 
          height: 14px; 
          width: 8px; 
        }
        .custom-scrollbar::-webkit-scrollbar-track { 
          background: rgba(230, 213, 195, 0.4); 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: ${THEME.goldAccent}; 
          border-radius: 10px;
          border: 3px solid ${THEME.sandLight};
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${THEME.coffeeMain};
        }

        .sidebar-search {
          position: fixed;
          right: -290px;
          top: 0;
          height: 100vh;
          width: 340px;
          background: ${THEME.coffeeDark};
          z-index: 1000;
          transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 25px 20px;
          display: flex;
          flex-direction: column;
          box-shadow: -10px 0 30px rgba(0,0,0,0.4);
          overflow: hidden;
        }
        .sidebar-search:hover { right: 0; }

        .sidebar-handle {
          position: absolute;
          left: -45px;
          top: 50px;
          background: ${THEME.coffeeDark};
          color: ${THEME.goldAccent};
          padding: 15px 10px;
          border-radius: 12px 0 0 12px;
          border: 1px solid ${THEME.goldAccent};
          border-right: none;
          writing-mode: vertical-rl;
          font-weight: 900;
          cursor: pointer;
        }

        .sidebar-search input {
          background: rgba(255,255,255,0.06);
          border: 1px solid ${THEME.coffeeMain};
          color: #fff;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 12px;
          outline: none;
          width: 100%;
          font-size: 13px;
        }
        
        .side-label { color: ${THEME.goldAccent}; font-size: 11px; margin-bottom: 4px; font-weight: bold; }

        .summary-card {
          margin-top: 15px;
          background: ${THEME.goldAccent};
          border-radius: 12px;
          padding: 15px;
          color: ${THEME.coffeeDark};
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .summary-row:last-child { border-bottom: none; }
        .summary-val { font-size: 16px; font-weight: 900; }

        .table-container {
          flex: 1;
          margin-right: 55px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          height: 100vh;
        }

        /* الحاوية التي تضمن بقاء السكرول العرضي في أسفل الشاشة */
        .scroll-box {
          flex: 1;
          overflow: auto; 
          border-radius: 15px;
          background: rgba(255,255,255,0.3);
          padding: 10px;
        }

        table { width: 100%; border-collapse: separate; border-spacing: 0 8px; min-width: 1600px; }
        th { background: ${THEME.coffeeDark}; color: ${THEME.goldAccent}; padding: 16px; font-size: 14px; position: sticky; top: 0; z-index: 10; }
        td { background: ${THEME.white}; padding: 14px; color: ${THEME.coffeeDark}; text-align: center; border-top: 1px solid ${THEME.sandDark}; border-bottom: 1px solid ${THEME.sandDark}; }
        
        tr td:first-child { border-radius: 0 12px 12px 0; }
        tr td:last-child { border-radius: 12px 0 0 12px; }
        @media print {
  /* 1. إخفاء القائمة والزرار وأي أزرار تانية نهائياً */
  #sidebar-to-hide, 
  #handle-to-hide, 
  .sidebar-search, 
  .sidebar-handle, 
  button, 
  .pagination-controls {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* 2. تظبيط الحاوية الرئيسية للجدول */
  .table-container {
    margin: 0 !important; /* إلغاء الـ margin اللي كان سايب مكان للزرار */
    padding: 0 !important;
    width: 100% !important;
    position: static !important; /* إلغاء أي تموضع fixed أو absolute */
    right: 0 !important;
  }

  /* 3. جعل الجدول يملأ عرض الورقة */
  .scroll-box {
    overflow: visible !important; /* عشان يطبع كل الصفوف لو الجدول طويل */
    background: none !important;
  }

  table {
    width: 100% !important;
    min-width: 100% !important;
    border-collapse: collapse !important;
    border: 1px solid #000 !important; /* حدود سوداء خفيفة للطباعة */
  }

  th, td {
    border: 1px solid #ddd !important;
    color: #000 !important;
    padding: 10px !important;
    font-size: 11px !important; /* تصغير الخط قليلاً ليناسب الورقة */
  }

  /* 4. إلغاء الصور الخلفية لتوفير الحبر وظهور الكلام بوضوح */
  body {
    background-image: none !important;
    background-color: white !important;
  }
}
      `}</style>
      
      {/* القائمة الجانبية */}
      <div className="sidebar-search">
        <div className="sidebar-handle">⚙️ التحكم والجرد</div>
        
        <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 900, marginBottom: '20px', textAlign: 'center', borderBottom: '1px solid #5a463e', paddingBottom: '10px' }}>🔍 بحث | Search </h2>
        
        <div className="side-label">اسم الموظف</div>
        <input type="text" placeholder="بحث..." value={searchName} onChange={(e) => setSearchName(e.target.value)} />
        
        <div className="side-label">المقاول الرئيسي</div>
        <input type="text" placeholder="المقاول..." value={searchCont} onChange={(e) => setSearchCont(e.target.value)} />

        <div className="side-label">الموقع</div>
        <input type="text" placeholder="الموقع..." value={searchSite} onChange={(e) => setSearchSite(e.target.value)} />
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <div className="side-label">من تاريخ</div>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="side-label">إلى تاريخ</div>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        {/* مربع الجرد الشامل */}
        <div className="summary-card">
          <div style={{ fontSize: '12px', fontWeight: 900, textAlign: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>ملخص البحث</div>
          
          <div className="summary-row">
            <span style={{fontSize: '12px'}}>عدد الأيام:</span>
            <span className="summary-val">{totalDaysCount}</span>
          </div>
          
          <div className="summary-row">
            <span style={{fontSize: '12px'}}>إجمالي الإنتاجية:</span>
            <span className="summary-val">{totalProd.toLocaleString()}</span>
          </div>
          
          <div className="summary-row" style={{ marginTop: '5px', paddingTop: '10px', borderTop: '2px dashed rgba(0,0,0,0.1)' }}>
            <span style={{fontSize: '12px', fontWeight: 'bold'}}>المبلغ الإجمالي:</span>
            <span className="summary-val" style={{ fontSize: '22px' }}>{totalDWVal.toLocaleString()}</span>
          </div>
        </div>
        
      </div>

      {/* منطقة الجدول */}
      <div className="table-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h1 style={{ color: THEME.coffeeDark, fontSize: '30px', fontWeight: 900, margin: 0 }}>السجّل اليومي | Daily Log 📝</h1>
            <p style={{ color: THEME.coffeeMain, fontSize: '20px', margin: 0 }}>{loading ? 'جاري التحديث...' : `تم إيجاد ${totalCount} سجل`}</p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
  
  {/* 1. مجموعة أزرار العمليات (حجم أكبر) */}
  <div style={{ 
    display: 'flex', 
    gap: '10px', 
    paddingLeft: '15px', 
    borderLeft: `2px solid ${THEME.sandDark}` 
  }}>
    
    {/* زر الطباعة الجديد - بلون أزرق هادئ ومميز */}
    <button 
      onClick={() => window.print()} 
      style={{ 
        background: '#935b48fb', color: '#fff', border: 'none', 
        padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', 
        fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
      🖨️ طباعة التقرير
    </button>

    {/* زر الاستيراد - حجم أكبر */}
    <button 
  onClick={() => fileInputRef.current?.click()} 
  style={{ 
    background: '#935b48fb', // أخضر مريح للعين
    color: '#ffffff', // نص أبيض للوضوح
    border: 'none', 
    padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', 
    fontSize: '14px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  }}>
  📥 استيراد
</button>

    {/* زر التصدير - حجم أكبر */}
    <button 
      onClick={exportToExcel} 
      style={{ 
        background: '#935b48fb', color: '#fff', border: 'none', 
        padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', 
        fontSize: '14px', fontWeight: 'bold' 
      }}>
      📤 تصدير
    </button>

    {/* زر النموذج */}
    <button style={{ 
      background: '#935b48fb', color  : '#fff', border: `1px dashed ${THEME.coffeeMain}`, 
      padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' 
    }}>
      📄 نموذج
    </button>

    <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" />
  </div>

  {/* 2. أرقام الصفحات (1 / 10) */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '10px 15px', borderRadius: '8px', border: `1px solid ${THEME.coffeeMain}`, background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>السابق</button>
    
    <div style={{ 
      background: THEME.coffeeDark, color: THEME.goldAccent, 
      padding: '10px 18px', borderRadius: '8px', fontWeight: '900', 
      fontSize: '15px', display: 'flex', gap: '8px', direction: 'ltr' 
    }}>
      <span>{totalPages}</span>
      <span>/</span>
      <span style={{ color: '#fff' }}>{currentPage + 1}</span>
    </div>

    <button disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '10px 15px', borderRadius: '8px', border: `1px solid ${THEME.coffeeMain}`, background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>التالي</button>
  </div>

</div>


        </div>

        {/* صندوق التمرير الذي يظهر شريط التمرير العرضي دائماً في أسفل الصفحة */}
        <div className="scroll-box custom-scrollbar">
          <table>
            <thead>
              <tr>
                {["التاريخ", "المقاول", "الموظف", "الموقع", "البند", "الإنتاج", "الوحدة", "اليومية", "الحضور", "ملاحظات"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={i}>
                  <td>{r.Date}</td>
                  <td>{r.Main_Cont}</td>
                  <td style={{ fontWeight: '900', color: THEME.coffeeDark }}>{r.Emp_Name}</td>
                  <td>{r.Site}</td>
                  <td>{r.Item}</td>
                  <td style={{ fontWeight: 'bold', color: '#2E7D32' }}>{r.Prod}</td>
                  <td>{r.Unit}</td>
                  <td style={{ fontWeight: '900', color: THEME.coffeeMain }}>{r.D_W}</td>
                  <td>{r.Attendance}</td>
                  <td style={{ fontSize: '11px', color: '#888' }}>{r.Notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}