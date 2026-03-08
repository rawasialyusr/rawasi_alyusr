"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

const THEME = {
  bgLight: '#f8fafc',
  cafeMain: '#d7ccc8',
  cafeDark: '#43342E',
  accentGold: '#c5a059',
  white: '#ffffff'
};

export default function LaborDeductionsPage() {
  const [deductions, setDeductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchName, setSearchName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newReason, setNewReason] = useState(''); 
  const [newNotes, setNewNotes] = useState('');

  const totalDeducted = deductions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => {
    fetchData();
  }, [searchName, startDate, endDate, pageSize, currentPage]);

  async function fetchData() {
    try {
      setLoading(true);
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from('labor_deductions').select('*', { count: 'exact' });
      if (searchName) query = query.ilike('emp_name', `%${searchName}%`);
      if (startDate) query = query.gte('deduction_date', startDate);
      if (endDate) query = query.lte('deduction_date', endDate);

      const { data, error, count } = await query.order('deduction_date', { ascending: false }).range(from, to);
      if (error) throw error;
      setDeductions(data || []);
      setTotalCount(count || 0);
    } catch (err: any) { console.error(err.message); } 
    finally { setLoading(false); }
  }

  // دالة ذكية لتنسيق التاريخ
  const formatExcelDate = (excelDate: any) => {
    if (!excelDate) return new Date().toISOString().split('T')[0];
    if (typeof excelDate === 'number') {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    const d = new Date(excelDate);
    return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
  };

  // وظيفة التصدير (Export)
  const handleExportExcel = () => {
    if (deductions.length === 0) return alert("لا توجد بيانات لتصديرها");
    const exportData = deductions.map(item => ({
      "اسم العامل": item.emp_name,
      "التاريخ": item.deduction_date,
      "المبلغ": item.amount,
      "السبب": item.reason,
      "ملاحظات": item.notes || ""
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الخصومات");
    XLSX.writeFile(workbook, `سجل_الخصومات_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadTemplate = () => {
    const templateData = [{ 
      "اسم العامل": "مثال: احمد محمد", 
      "التاريخ": "2026-03-08", 
      "المبلغ": 100, 
      "السبب": "سلفة", 
      "ملاحظات": "" 
    }];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "نموذج_الاستيراد.xlsx");
  };

  // --- تحديث الاستيراد بنظام البحث عن الكلمات المفتاحية ---
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) throw new Error("الملف فارغ");

        const formattedData = data.map((item: any) => {
          // دالة داخلية للبحث عن أي مفتاح يحتوي على الكلمة المطلوبة
          const getVal = (keywords: string[]) => {
            const foundKey = Object.keys(item).find(key => 
              keywords.some(k => key.toLowerCase().includes(k.toLowerCase()))
            );
            return foundKey ? item[foundKey] : null;
          };

          return {
            emp_name: getVal(["اسم", "worker", "name", "عامل"]),
            amount: Number(getVal(["مبلغ", "amount", "قيمة"])),
            deduction_date: formatExcelDate(getVal(["تاريخ", "date"])),
            reason: getVal(["سبب", "reason"]) || "غير محدد",
            notes: getVal(["ملاحظات", "note"]) || ""
          };
        }).filter(item => item.emp_name && !isNaN(item.amount));

        if (formattedData.length === 0) throw new Error("لم يتم العثور على أعمدة مطابقة (اسم، مبلغ، تاريخ)");

        const { error } = await supabase.from('labor_deductions').insert(formattedData);
        if (error) throw error;
        
        alert(`تم استيراد ${formattedData.length} سجل بنجاح ✅`);
        fetchData();
      } catch (err: any) {
        alert("خطأ في الاستيراد: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ""; 
  };

  const handleAddNew = async () => {
    if (!newName || !newAmount || !newReason) return alert("يرجى إكمال البيانات الأساسية");
    const { error } = await supabase.from('labor_deductions').insert([
      { emp_name: newName, amount: Number(newAmount), deduction_date: newDate, reason: newReason, notes: newNotes }
    ]);
    if (!error) { setIsModalOpen(false); setNewName(''); setNewAmount(''); setNewReason(''); fetchData(); }
  };

  return (
    <div style={{ direction: 'rtl', height: '100vh', width: '100vw', display: 'flex', overflow: 'hidden', backgroundColor: THEME.bgLight }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
        
        @media print {
          .no-print { display: none !important; }
          .table-container { padding: 0 !important; margin: 0 !important; width: 100% !important; background: white !important; }
          .scroll-box { overflow: visible !important; height: auto !important; }
          table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #333 !important; }
          th, td { border: 1px solid #333 !important; padding: 10px !important; border-radius: 0 !important; color: black !important; }
        }

        .sidebar-search {
          position: fixed; right: -330px; top: 0; height: 100vh; width: 340px;
          background: ${THEME.cafeDark}; z-index: 1000; transition: 0.4s;
          padding: 25px 20px; display: flex; flex-direction: column;
          box-shadow: -10px 0 30px rgba(0,0,0,0.3); border-left: 5px solid ${THEME.accentGold};
        }
        .sidebar-search:hover { right: 0; }
        .sidebar-search input {
          background: rgba(255,255,255,0.06); border: 1px solid ${THEME.cafeMain};
          color: #fff; padding: 12px; border-radius: 12px; margin-bottom: 15px; width: 100%;
        }
        
        .table-container { flex: 1; padding: 30px; display: flex; flex-direction: column; height: 100vh; }
        .scroll-box { flex: 1; overflow: auto; padding: 10px; }
        
        table { width: 100%; border-collapse: separate; border-spacing: 0 12px; min-width: 1000px; }
        th { position: sticky; top: 0; background: ${THEME.cafeDark}; color: ${THEME.accentGold}; padding: 18px; z-index: 10; text-align: center; }
        td { background: ${THEME.white}; padding: 18px; text-align: center; border-top: 1px solid ${THEME.cafeMain}; border-bottom: 1px solid ${THEME.cafeMain}; }
        tr td:first-child { border-radius: 0 20px 20px 0; border-right: 1px solid ${THEME.cafeMain}; }
        tr td:last-child { border-radius: 20px 0 0 20px; border-left: 1px solid ${THEME.cafeMain}; }

        .btn-main {
          background: ${THEME.cafeDark}; color: #fff; border: 1px solid ${THEME.accentGold};
          padding: 12px 25px; border-radius: 12px; font-weight: 900; cursor: pointer;
          display: flex; align-items: center; gap: 10px; transition: 0.3s;
        }
        .btn-main:hover { background: ${THEME.accentGold}; color: ${THEME.cafeDark}; }

        .action-btn { 
          border: 1px solid ${THEME.cafeMain}; padding: 10px 20px; border-radius: 10px; 
          font-weight: bold; cursor: pointer; background: #fff; color: ${THEME.cafeDark}; 
          transition: 0.2s; display: flex; align-items: center; gap: 8px;
        }
      `}</style>

      <div className="sidebar-search no-print">
        <h2 style={{ color: THEME.accentGold, textAlign: 'center' }}>🔍 فلترة | Filter</h2>
        <input type="text" placeholder="اسم العامل..." value={searchName} onChange={(e) => setSearchName(e.target.value)} />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <div style={{ marginTop: 'auto', background: 'rgba(197,160,89,0.1)', padding: '20px', borderRadius: '15px', color: '#fff', textAlign: 'center' }}>
          <div>إجمالي المبالغ:</div>
          <div style={{ fontSize: '24px', fontWeight: '900' }}>{totalDeducted.toLocaleString()}</div>
        </div>
      </div>

      <div className="table-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ color: THEME.cafeDark, margin: 0, fontWeight: 900, fontSize: '24px' }}>
              ✂️ سجل الخصومات | Deductions Log
            </h1>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setIsModalOpen(true)} className="btn-main">+ تسجيل جديد</button>
            <button onClick={downloadTemplate} className="action-btn">📄 نموذج</button>
            <button onClick={() => fileInputRef.current?.click()} className="action-btn">📥 استيراد</button>
            <button onClick={handleExportExcel} className="action-btn">📤 تصدير</button>
            <button onClick={() => window.print()} className="action-btn">🖨️ طباعة</button>
            
            <input type="file" ref={fileInputRef} hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
            
            <div style={{ display: 'flex', gap: '5px', marginLeft: '10px' }}>
              <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} className="action-btn">◀</button>
              <div style={{ background: THEME.cafeDark, color: THEME.accentGold, padding: '10px 15px', borderRadius: '10px', fontWeight: 900 }}>{currentPage + 1}</div>
              <button disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} className="action-btn">▶</button>
            </div>
          </div>
        </div>

        <div className="scroll-box">
          <table>
            <thead>
              <tr>
                <th>اسم العامل | Worker Name</th>
                <th>التاريخ | Date</th>
                <th>المبلغ | Amount</th>
                <th>السبب | Reason</th>
                <th>ملاحظات | Notes</th>
              </tr>
            </thead>
            <tbody>
              {deductions.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 900 }}>{r.emp_name}</td>
                  <td>{r.deduction_date}</td>
                  <td style={{ color: '#d32f2f', fontWeight: 900 }}>{r.amount.toLocaleString()}</td>
                  <td>{r.reason}</td>
                  <td style={{ fontSize: '12px', color: '#666' }}>{r.notes || '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#fff', padding: '35px', borderRadius: '25px', width: '450px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '25px', color: THEME.cafeDark }}>تسجيل جديد</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="text" placeholder="اسم العامل" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
              <input type="number" placeholder="المبلغ" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
              <input type="text" placeholder="السبب" value={newReason} onChange={(e) => setNewReason(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
              <button onClick={handleAddNew} className="btn-main" style={{ width: '100%', justifyContent: 'center' }}>حفظ</button>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none', color: '#999', cursor: 'pointer', marginTop: '10px' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}