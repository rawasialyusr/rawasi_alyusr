"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

const THEME = {
  bgLight: '#f8fafc',
  cafeMain: '#d7ccc8',
  cafeDark: '#43342E',
  accentGold: '#c5a059',
  textDark: '#4e342e',
  white: '#ffffff'
};

export default function LaborAdvancePage() {
  const [advances, setAdvances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoUrl = "/RYC_Logo.png"; 

  const [searchName, setSearchName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNotes, setNewNotes] = useState('');

  const totalAmount = advances.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => {
    fetchData();
  }, [searchName, startDate, endDate, pageSize, currentPage]);

  async function fetchData() {
    try {
      setLoading(true);
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from('labor_advance').select('*', { count: 'exact' });
      if (searchName) query = query.ilike('emp_name', `%${searchName}%`);
      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data, error, count } = await query.order('date', { ascending: false }).range(from, to);
      if (error) throw error;
      setAdvances(data || []);
      setTotalCount(count || 0);
    } catch (err: any) { console.error(err.message); } 
    finally { setLoading(false); }
  }

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(advances);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Labor Advances");
    XLSX.writeFile(workbook, `مسحوبات_العمال_${new Date().toLocaleDateString('ar-EG')}.xlsx`);
  };

  const handleAddNew = async () => {
    if (!newName || !newAmount) return alert("يرجى إكمال البيانات");
    const { error } = await supabase.from('labor_advance').insert([
      { emp_name: newName, amount: Number(newAmount), date: newDate, notes: newNotes }
    ]);
    if (!error) { setIsModalOpen(false); setNewName(''); setNewAmount(''); fetchData(); }
  };

  return (
    <div style={{ direction: 'rtl', height: '100vh', width: '100vw', display: 'flex', overflow: 'hidden', backgroundColor: THEME.bgLight }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
        
        @media print {
          .no-print { display: none !important; }
          .table-container { padding: 0 !important; margin: 0 !important; width: 100% !important; }
          table { border-collapse: collapse !important; width: 100% !important; }
          th, td { border: 1px solid #000 !important; padding: 10px !important; }
        }

        .sidebar-search {
          position: fixed; right: -330px; top: 0; height: 100vh; width: 340px;
          background: ${THEME.cafeDark}; z-index: 1000; transition: 0.4s;
          padding: 25px 20px; display: flex; flex-direction: column;
          box-shadow: -10px 0 30px rgba(0,0,0,0.3);
          border-left: 5px solid ${THEME.accentGold};
        }
        .sidebar-search:hover { right: 0; }
        .sidebar-search input {
          background: rgba(255,255,255,0.06); border: 1px solid ${THEME.cafeMain};
          color: #fff; padding: 10px; border-radius: 8px; margin-bottom: 12px; width: 100%;
        }
        
        .table-container { flex: 1; padding: 20px; display: flex; flex-direction: column; height: 100vh; z-index: 1; }
        .scroll-box { flex: 1; overflow: auto; padding: 10px; }
        
        table { width: 100%; border-collapse: separate; border-spacing: 0 12px; min-width: 1000px; }
        th { position: sticky; top: 0; background: ${THEME.cafeDark}; color: ${THEME.accentGold}; padding: 15px; z-index: 10; }
        td { background: ${THEME.white}; padding: 15px; text-align: center; border-top: 1px solid ${THEME.cafeMain}; border-bottom: 1px solid ${THEME.cafeMain}; }
        tr td:first-child { border-radius: 0 15px 15px 0; border-right: 1px solid ${THEME.cafeMain}; }
        tr td:last-child { border-radius: 15px 0 0 15px; border-left: 1px solid ${THEME.cafeMain}; }

        .btn-special {
          background: ${THEME.accentGold};
          color: #fff;
          border: none;
          padding: 12px 30px;
          border-radius: 12px;
          font-weight: 900;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(197, 160, 89, 0.4);
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }

        .btn-special:hover {
          background: ${THEME.cafeDark};
          transform: scale(1.08);
          box-shadow: 0 6px 20px rgba(67, 52, 46, 0.4);
        }

        .action-btn { border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px; transition: 0.2s; background: #fff; color: ${THEME.cafeDark}; border: 1px solid ${THEME.cafeMain}; }
        .action-btn:hover { background: #f0f0f0; }
      `}</style>

      {/* الخلفية المائية */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, opacity: 0.1 }}>
        <img src={logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>

      {/* القائمة الجانبية */}
      <div className="sidebar-search no-print">
        <h2 style={{ color: '#fff', fontSize: '18px', textAlign: 'center', marginBottom: '20px' }}>🔍 بحث وجرد</h2>
        <input type="text" placeholder="اسم العامل" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <div style={{ marginTop: 'auto', background: THEME.accentGold, padding: '15px', borderRadius: '15px', color: THEME.cafeDark }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>إجمالي الصفحة:</div>
          <div style={{ fontSize: '24px', fontWeight: '900' }}>{totalAmount.toLocaleString()}</div>
        </div>
      </div>

      <div className="table-container">
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ color: THEME.cafeDark, fontSize: '28px', fontWeight: 900, margin: 0 }}>💸 مسحوبات العمال | Labor Advances</h1>
            <p style={{ color: THEME.accentGold, margin: 0 }}>{loading ? 'جاري التحميل...' : `إجمالي السجلات: ${totalCount}`}</p>
          </div>

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {/* زر الإضافة المميز والكبير */}
            <button onClick={() => setIsModalOpen(true)} className="btn-special">
              <span>+</span> إضافة جديد
            </button>
            
            <div style={{ display: 'flex', gap: '8px', borderRight: `2px solid ${THEME.cafeMain}`, paddingRight: '15px' }}>
                <button onClick={() => window.print()} className="action-btn">🖨️ طباعة</button>
                <button onClick={() => fileInputRef.current?.click()} className="action-btn" style={{ background: '#f59e0b', color: '#fff', border: 'none' }}>📥 استيراد</button>
                <button onClick={exportToExcel} className="action-btn" style={{ background: '#935b48', color: '#fff', border: 'none' }}>📤 تصدير</button>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>◀</button>
              <div style={{ background: THEME.cafeDark, color: THEME.accentGold, padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold' }}>{currentPage + 1}</div>
              <button disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>▶</button>
            </div>
          </div>
        </div>

        <div className="scroll-box">
          <table>
            <thead>
              <tr>
                <th>اسم العامل</th>
                <th>التاريخ</th>
                <th>المبلغ</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {advances.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: '900', fontSize: '18px' }}>{r.emp_name}</td>
                  <td>{r.date}</td>
                  <td style={{ color: '#d84315', fontWeight: '900', fontSize: '20px' }}>{r.amount.toLocaleString()}</td>
                  <td style={{ color: '#666', fontSize: '13px' }}>{r.notes || '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال الإضافة */}
      {isModalOpen && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '30px', width: '450px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h2 style={{ textAlign: 'center', color: THEME.cafeDark, fontWeight: 900 }}>تسجيل عملية سحب</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <input type="text" placeholder="اسم العامل" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
              <input type="number" placeholder="المبلغ" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
              <textarea placeholder="ملاحظات" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', minHeight: '80px' }} />
              <button onClick={handleAddNew} className="btn-special" style={{ width: '100%', justifyContent: 'center' }}>حفظ البيانات</button>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', marginTop: '10px' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}