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
  white: '#FFFFFF',
  success: '#27ae60'
};

const SERVICE_OPTIONS = ["الكل", "سكن وإعاشة", "سكن فقط", "إعاشة فقط", "بدل خارجي"];
const MONTH_OPTIONS = ["الكل", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default function HousingSubsistencePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  const [searchName, setSearchName] = useState('');
  const [filterService, setFilterService] = useState('الكل');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [formData, setFormData] = useState({
    emp_name: '',
    amount: '',
    service_type: 'سكن وإعاشة',
    deduction_month: 'يناير',
    notes: '',
    created_at: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchHousingData();
  }, [searchName, filterService, startDate, endDate, currentPage]);

  async function fetchHousingData() {
    setLoading(true);
    try {
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;
      let query = supabase.from('housing_subsistence').select('*', { count: 'exact' });
      
      if (searchName) query = query.ilike('emp_name', `%${searchName}%`);
      if (filterService !== 'الكل') query = query.eq('service_type', filterService);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);
      
      const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
      if (error) throw error;
      setRecords(data || []);
      setTotalCount(count || 0);
    } catch (err: any) { 
      console.error(err.message); 
    } finally { 
      setLoading(false); 
    }
  }

  // دالة تحميل نموذج الاستيراد
  const downloadTemplate = () => {
    const templateData = [
      { "الاسم": "مثال: محمد أحمد", "المبلغ": 1000, "الخدمة": "سكن وإعاشة", "الشهر": "يناير", "التاريخ": new Date().toISOString().split('T')[0] }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "نموذج_استيراد_الاستقطاعات.xlsx");
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(records);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Deductions");
    XLSX.writeFile(workbook, `استقطاعات_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const processed = data.map((row: any) => ({
        emp_name: String(row.الاسم || row.emp_name || ""),
        amount: parseFloat(row.المبلغ || row.amount || 0),
        service_type: row.الخدمة || row.service_type || "سكن وإعاشة",
        deduction_month: row.الشهر || row.deduction_month || "يناير",
        created_at: row.التاريخ || new Date().toISOString()
      }));
      await supabase.from('housing_subsistence').insert(processed);
      fetchHousingData();
    };
    reader.readAsBinaryString(file);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div style={{ direction: 'rtl', height: '100vh', width: '100vw', display: 'flex', overflow: 'hidden', backgroundColor: THEME.sandLight }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }

        .sidebar-search {
          position: fixed; right: -310px; top: 0; height: 100vh; width: 330px;
          background: ${THEME.coffeeDark}; z-index: 1000; transition: 0.4s ease;
          padding: 30px 20px; display: flex; flex-direction: column;
        }
        .sidebar-search:hover { right: 0; box-shadow: -15px 0 35px rgba(0,0,0,0.4); }

        .sidebar-search input, .sidebar-search select {
          background: rgba(255,255,255,0.08); border: 1px solid ${THEME.coffeeMain};
          color: #fff; padding: 12px; border-radius: 10px; margin-bottom: 15px; width: 100%; outline: none;
          font-size: 14px;
        }

        .side-label { color: ${THEME.goldAccent}; font-size: 13px; font-weight: 700; margin-bottom: 6px; }

        .table-container { flex: 1; padding: 25px; display: flex; flex-direction: column; height: 100vh; }
        .scroll-box { flex: 1; overflow: auto; border-radius: 18px; background: #fff; padding: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        
        table { width: 100%; border-collapse: separate; border-spacing: 0 10px; }
        th { background: ${THEME.coffeeDark}; color: ${THEME.goldAccent}; padding: 18px; position: sticky; top: 0; z-index: 10; font-weight: 700; font-size: 15px; }
        td { background: ${THEME.white}; padding: 14px; text-align: center; border-bottom: 1px solid ${THEME.sandLight}; font-size: 14px; font-variant-numeric: tabular-nums; }

        .btn-op { 
          background: ${THEME.coffeeMain}; color: #fff; border: none; 
          padding: 0 18px; border-radius: 10px; cursor: pointer; 
          font-weight: 700; font-size: 14px; transition: 0.3s;
          display: flex; align-items: center; justify-content: center;
          height: 42px;
        }
        .btn-op:hover { background: ${THEME.coffeeDark}; transform: translateY(-2px); }

        /* ستايل زر تحميل النموذج */
        .btn-template {
          background: transparent; color: ${THEME.coffeeMain}; border: 2px dashed ${THEME.coffeeMain};
          padding: 0 15px; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 13px;
          height: 42px; transition: 0.3s; display: flex; align-items: center; gap: 6px;
        }
        .btn-template:hover { background: ${THEME.coffeeMain}; color: #fff; }

        .btn-special-add {
          background: linear-gradient(135deg, ${THEME.goldAccent} 0%, #a67c37 100%);
          color: ${THEME.coffeeDark}; padding: 0 25px; border-radius: 12px;
          font-weight: 900; border: none; cursor: pointer; height: 42px;
          box-shadow: 0 4px 15px rgba(197, 160, 89, 0.3);
          transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex; align-items: center; gap: 10px; font-size: 15px;
        }
        .btn-special-add:hover {
          transform: scale(1.03);
          box-shadow: 0 6px 22px rgba(197, 160, 89, 0.5);
        }

        .top-pagination { 
          display: flex; align-items: center; gap: 0; 
          background: ${THEME.white}; padding: 4px; 
          border-radius: 12px; border: 1px solid ${THEME.sandDark};
          height: 42px;
        }
        .page-num { font-weight: 900; color: ${THEME.coffeeDark}; padding: 0 15px; font-size: 14px; min-width: 60px; text-align: center; }

        @media print {
          .sidebar-search, button, .top-pagination, .no-print { display: none !important; }
          .table-container { margin: 0 !important; width: 100% !important; padding: 0 !important; }
          .scroll-box { box-shadow: none !important; }
        }
      `}</style>
      
      <div className="sidebar-search">
        <h3 style={{ color: THEME.goldAccent, textAlign: 'center', marginBottom: '25px', fontWeight: 900 }}>⚙️ فلاتر البحث</h3>
        <div className="side-label">اسم الموظف</div>
        <input type="text" placeholder="اكتب اسم الموظف..." value={searchName} onChange={(e)=>setSearchName(e.target.value)} />
        <div className="side-label">من تاريخ</div>
        <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} />
        <div className="side-label">إلى تاريخ</div>
        <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} />
        
        <div style={{ marginTop: 'auto', background: THEME.goldAccent, padding: '20px', borderRadius: '15px', color: THEME.coffeeDark, textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '5px' }}>إجمالي المبالغ المفلترة</div>
          <div style={{ fontSize: '22px', fontWeight: 900 }}>{records.reduce((a,b)=>a+Number(b.amount),0).toLocaleString()} ج.م</div>
        </div>
      </div>

      <div className="table-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h2 style={{ color: THEME.coffeeDark, margin: 0, fontWeight: 900, fontSize: '24px' }}>سجل استقطاعات السكن 🏠</h2>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* زر الإضافة */}
            <button onClick={() => setIsModalOpen(true)} className="btn-special-add">
              <span style={{fontSize: '20px'}}>✨</span>
              إضافة استقطاع جديد
            </button>

            {/* أزرار العمليات والنموذج */}
            <button onClick={downloadTemplate} className="btn-template">📑 نموذج الاستيراد</button>
            <button onClick={() => window.print()} className="btn-op">🖨️ طباعة</button>
            <button onClick={() => fileInputRef.current?.click()} className="btn-op">📥 استيراد</button>
            <button onClick={exportToExcel} className="btn-op">📤 تصدير</button>

            <div className="top-pagination">
              <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} className="btn-op" style={{padding:'0 15px', borderRadius:'8px 0 0 8px', height: '34px'}}>السابق</button>
              <span className="page-num">{currentPage + 1} / {totalPages || 1}</span>
              <button disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} className="btn-op" style={{padding:'0 15px', borderRadius:'0 8px 8px 0', height: '34px'}}>التالي</button>
            </div>

            <input type="file" ref={fileInputRef} hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
          </div>
        </div>

        <div className="scroll-box">
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>اسم الموظف</th>
                <th>نوع الخدمة</th>
                <th>عن شهر</th>
                <th>قيمة المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{r.created_at?.split('T')[0]}</td>
                  <td style={{fontWeight: '700', color: THEME.coffeeDark}}>{r.emp_name}</td>
                  <td>{r.service_type}</td>
                  <td style={{fontWeight: 600}}>{r.deduction_month}</td>
                  <td style={{color: '#c0392b', fontWeight: 900, fontSize: '15px'}}>{Number(r.amount).toLocaleString()} ج.م</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة الإضافة المتبقية كما هي */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={()=>setIsModalOpen(false)} style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.7)', zIndex:2000, display:'flex', justifyContent:'center', alignItems:'center', backdropFilter: 'blur(4px)'}}>
          <div className="modal-content" onClick={e=>e.stopPropagation()} style={{background:'#fff', padding:'45px', borderRadius:'28px', width:'520px', borderTop:`12px solid ${THEME.goldAccent}`, boxShadow:'0 25px 60px rgba(0,0,0,0.4)'}}>
              <h2 style={{textAlign:'center', color: THEME.coffeeDark, marginBottom:'30px', fontWeight: 900, fontSize: '22px'}}>إضافة استقطاع جديد 📝</h2>
              <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                <div>
                  <div style={{fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: THEME.coffeeMain}}>اسم الموظف</div>
                  <input type="text" placeholder="أدخل الاسم الرباعي" style={{width: '100%', padding:'14px', borderRadius:'12px', border:`1px solid ${THEME.sandDark}`, fontSize: '14px'}} onChange={e=>setFormData({...formData, emp_name: e.target.value})} />
                </div>
                
                <div style={{display:'flex', gap:'15px'}}>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: THEME.coffeeMain}}>المبلغ (ج.م)</div>
                    <input type="number" placeholder="0.00" style={{width: '100%', padding:'14px', borderRadius:'12px', border:`1px solid ${THEME.sandDark}`, fontSize: '14px'}} onChange={e=>setFormData({...formData, amount: e.target.value})} />
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: THEME.coffeeMain}}>عن شهر</div>
                    <select style={{width: '100%', padding:'14px', borderRadius:'12px', border:`1px solid ${THEME.sandDark}`, fontSize: '14px', background: '#fff'}} onChange={e=>setFormData({...formData, deduction_month: e.target.value})}>
                       {MONTH_OPTIONS.filter(m=>m!=="الكل").map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <button className="btn-special-add" style={{width:'100%', justifyContent:'center', marginTop: '10px', height: '50px'}} onClick={async()=>{
                   if(!formData.emp_name || !formData.amount) return alert("يرجى ملء البيانات الأساسية");
                   await supabase.from('housing_subsistence').insert([formData]);
                   setIsModalOpen(false);
                   fetchHousingData();
                }}>تأكيد وحفظ البيانات ✅</button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}