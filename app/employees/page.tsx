"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

const THEME = {
  sandLight: '#F4F1EE',
  sandDark: '#E6D5C3',
  coffeeMain: '#8C6A5D',
  coffeeDark: '#43342E',
  goldAccent: '#C5A059',
  white: '#FFFFFF',
  neonGold: '#FFD700'
};

export default function EmployeesFinancialPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [searchName, setSearchName] = useState(''); 
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(20); 
  const [totalCount, setTotalCount] = useState(0);

  const [newEmp, setNewEmp] = useState({
    Emp_Name: '',
    daily_rate: '',
    job_title: '', 
    phone_number: '',
    housing_and_subsistence: '0'
  });

  const [totals, setTotals] = useState({ earnings: 0, received: 0, onlyDeductions: 0, net: 0 });

  useEffect(() => {
    const handler = setTimeout(() => {
      setCurrentPage(0);
      fetchEmployees();
    }, 500);
    return () => clearTimeout(handler);
  }, [searchName]);

  useEffect(() => { fetchEmployees(); }, [currentPage]);

  // دالة جلب البيانات (تتضمن المزامنة التلقائية الآن)
  async function fetchEmployees() {
    setLoading(true);
    try {
      // 1. جلب البيانات الأساسية للموظفين
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;

      let empQuery = supabase.from('all_emp').select('*', { count: 'exact' });
      if (searchName) empQuery = empQuery.ilike('Emp_Name', `%${searchName}%`);

      const { data: emps, error: empError, count } = await empQuery
        .order('id', { ascending: true })
        .range(from, to);

      if (empError) throw empError;

      // 2. جلب كافة سجلات الحسابات الفرعية
      const [dailyRes, advanceRes, deductionsRes, housingRes] = await Promise.all([
        supabase.from('Daily_Report').select('Emp_Name, D_W, Attendance'),
        supabase.from('labor_advance').select('emp_name, amount'),
        supabase.from('labor_deductions').select('emp_name, amount'),
        supabase.from('housing_subsistence').select('emp_name, amount')
      ]);

      const dailyData = dailyRes.data || [];
      const advanceData = advanceRes.data || [];
      const deductionsData = deductionsRes.data || [];
      const housingData = housingRes.data || [];

      // 3. المعالجة الحسابية الدقيقة لكل موظف
      const processedEmployees = (emps || []).map(emp => {
        const empNameKey = emp.Emp_Name?.trim();

        // حساب الإعاشة مباشرة من جدولها لضمان الدقة
        const totalHousing = housingData
          .filter(h => h.emp_name?.trim() === empNameKey)
          .reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);

        const totalAttendance = dailyData
          .filter(d => d.Emp_Name?.trim() === empNameKey)
          .reduce((sum, curr) => sum + (Number(curr.Attendance) || 0), 0);

        const totalEarned = dailyData
          .filter(d => d.Emp_Name?.trim() === empNameKey)
          .reduce((sum, curr) => sum + (Number(curr.D_W) || 0), 0);

        const totalAdvanced = advanceData
          .filter(a => a.emp_name?.trim() === empNameKey)
          .reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);

        const totalDeductions = deductionsData
          .filter(p => p.emp_name?.trim() === empNameKey)
          .reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);

        // المعادلة النهائية: المستحق - (السلف + الخصومات + الإعاشة)
        const net = totalEarned - (totalAdvanced + totalDeductions + totalHousing);

        return {
          ...emp,
          total_attendance: totalAttendance,
          total_earnings: totalEarned,
          total_received: totalAdvanced,
          deductions_calculated: totalDeductions,
          housing_and_subsistence: totalHousing, // نستخدم القيمة المحسوبة فوراً
          net_earnings: net
        };
      });

      setEmployees(processedEmployees);
      setTotalCount(count || 0);

      // حساب الإجمالية العامة للصفحة
      const stats = processedEmployees.reduce((acc, curr) => ({
        earnings: acc.earnings + curr.total_earnings,
        received: acc.received + curr.total_received,
        onlyDeductions: acc.onlyDeductions + curr.deductions_calculated,
        net: acc.net + curr.net_earnings,
      }), { earnings: 0, received: 0, onlyDeductions: 0, net: 0 });
      
      setTotals(stats);
    } catch (err: any) { 
      console.error("Error:", err.message); 
    } finally { 
      setLoading(false); 
    }
  }

      setEmployees(processedEmployees);
      setTotalCount(count || 0);

      const stats = processedEmployees.reduce((acc, curr) => ({
        earnings: acc.earnings + curr.total_earnings,
        received: acc.received + curr.total_received,
        onlyDeductions: acc.onlyDeductions + curr.deductions_calculated,
        net: acc.net + curr.net_earnings,
      }), { earnings: 0, received: 0, onlyDeductions: 0, net: 0 });
      
      setTotals(stats);
    } catch (err: any) { console.error("Error:", err.message); } finally { setLoading(false); }
  } //
  const handleAddEmployee = async () => {
    if (!newEmp.Emp_Name || !newEmp.daily_rate) return alert("يرجى إدخال الاسم والراتب");
    try {
      const { error } = await supabase.from('all_emp').insert([
        { 
          Emp_Name: newEmp.Emp_Name, 
          daily_rate: Number(newEmp.daily_rate), 
          job_title: newEmp.job_title, 
          phone_number: newEmp.phone_number,
          housing_and_subsistence: Number(newEmp.housing_and_subsistence)
        }
      ]);
      if (error) throw error;
      setShowAddModal(false);
      fetchEmployees();
      setNewEmp({ Emp_Name: '', daily_rate: '', job_title: '', phone_number: '', housing_and_subsistence: '0' });
    } catch (err: any) { alert(err.message); }
  };

  const exportToExcel = () => {
    const dataToExport = employees.map(emp => ({
      "اسم الموظف": emp.Emp_Name,
      "المهنة": emp.job_title,
      "الحضور": emp.total_attendance,
      "صافي المستحق": emp.net_earnings
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "FinancialReport");
    XLSX.writeFile(workbook, `Report_${new Date().toLocaleDateString()}.xlsx`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div style={{ direction: 'rtl', height: '100vh', width: '100vw', display: 'flex', overflow: 'hidden', backgroundColor: THEME.sandLight }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
        
        .table-container { flex: 1; display: flex; flex-direction: column; padding: 20px; transition: margin-right 0.4s; margin-right: 40px; }
        .scroll-box { flex: 1; overflow: auto; background: rgba(255,255,255,0.4); border-radius: 15px; padding: 10px; }
        
        .header-controls { display: flex; align-items: center; gap: 10px; flex-direction: row; }
        .divider { width: 2px; height: 30px; background-color: ${THEME.sandDark}; margin: 0 10px; }

        .btn-add-modern {
          background: ${THEME.coffeeDark};
          color: ${THEME.goldAccent};
          border: 2px solid ${THEME.goldAccent};
          padding: 8px 22px;
          border-radius: 50px;
          cursor: pointer;
          font-weight: 900;
          box-shadow: 0 0 15px rgba(197, 160, 89, 0.2);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .control-btn { background: ${THEME.white}; border: 1px solid ${THEME.sandDark}; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; }
        
        .nav-group { display: flex; align-items: center; background: ${THEME.white}; border-radius: 8px; border: 1px solid ${THEME.sandDark}; overflow: hidden; }
        .nav-item { padding: 8px 12px; border: none; background: none; cursor: pointer; font-weight: bold; }
        .nav-item:disabled { opacity: 0.3; }
        .page-info { border-right: 1px solid ${THEME.sandDark}; border-left: 1px solid ${THEME.sandDark}; padding: 0 15px; font-weight: 900; }

        table { width: 100%; border-collapse: separate; border-spacing: 0 8px; min-width: 1300px; }
        th { background: ${THEME.coffeeDark}; color: ${THEME.goldAccent}; padding: 15px; position: sticky; top: 0; z-index: 10; }
        td { background: ${THEME.white}; padding: 12px; text-align: center; border-top: 1px solid ${THEME.sandDark}; border-bottom: 1px solid ${THEME.sandDark}; }
        
        .sidebar-search { position: fixed; right: -310px; top: 0; height: 100vh; width: 350px; background: ${THEME.coffeeDark}; z-index: 1000; transition: 0.4s; padding: 25px 20px; border-left: 5px solid ${THEME.goldAccent}; }
        .sidebar-search:hover { right: 0; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4px); }
        .modal-box { background: white; padding: 30px; border-radius: 20px; width: 450px; box-shadow: 0 15px 40px rgba(0,0,0,0.4); border: 2px solid ${THEME.goldAccent}; }
        .modal-title { color: ${THEME.coffeeDark}; text-align: center; font-weight: 900; margin-bottom: 20px; border-bottom: 2px solid ${THEME.sandLight}; padding-bottom: 10px; }
        .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .modal-input { width: 100%; padding: 12px; border: 1px solid ${THEME.sandDark}; border-radius: 10px; outline: none; font-weight: bold; }

        @media print { .no-print { display: none !important; } }
      `}</style>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 className="modal-title">✨ إضافة عضو جديد</h2>
            <div className="modal-grid">
              <input className="modal-input full-span" placeholder="الاسم الكامل" value={newEmp.Emp_Name} onChange={e => setNewEmp({...newEmp, Emp_Name: e.target.value})} />
              <input className="modal-input" placeholder="المهنة" value={newEmp.job_title} onChange={e => setNewEmp({...newEmp, job_title: e.target.value})} />
              <input className="modal-input" type="number" placeholder="اليومية / الراتب" value={newEmp.daily_rate} onChange={e => setNewEmp({...newEmp, daily_rate: e.target.value})} />
              <input className="modal-input full-span" placeholder="رقم الجوال" value={newEmp.phone_number} onChange={e => setNewEmp({...newEmp, phone_number: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
              <button onClick={handleAddEmployee} style={{ flex: 1.5, padding: '12px', background: THEME.coffeeDark, color: THEME.goldAccent, border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}>حفظ البيانات</button>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', background: THEME.sandDark, color: 'black', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h1 style={{ color: THEME.coffeeDark, fontWeight: 900, fontSize: '26px', margin: 0 }}>التقرير المالي العام 👥</h1>

          <div className="no-print header-controls">
            <button className="btn-add-modern" onClick={() => setShowAddModal(true)}>
              <span style={{fontSize: '20px'}}>+</span> إضافة موظف جديد
            </button>

            <div className="divider"></div>

            <button className="control-btn" onClick={() => window.print()}>🖨️ طباعة</button>
            <button className="control-btn" onClick={exportToExcel} style={{ color: '#1B5E20' }}>📥 تصدير</button>

            <div className="nav-group">
              <button className="nav-item" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}>التالي</button>
              <div className="page-info">{currentPage + 1} / {totalPages || 1}</div>
              <button className="nav-item" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>السابق</button>
            </div>
          </div>
        </div>

        <div className="scroll-box">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>الاسم</th>
                <th>المهنة</th>
                <th>الحضور</th>
                <th>اليومية</th>
                <th>المستحق</th>
                <th>السلف</th>
                <th>الخصومات</th>
                <th>الإعاشة</th>
                <th>الصافي</th>
                <th>الجوال</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11}>جاري جلب ومزامنة البيانات...</td></tr>
              ) : employees.map((emp, i) => (
                <tr key={i}>
                  <td>{emp.id}</td>
                  <td style={{ fontWeight: 'bold' }}>{emp.Emp_Name}</td>
                  <td style={{ color: THEME.coffeeMain }}>{emp.job_title || '-'}</td>
                  <td>{emp.total_attendance} يوم</td>
                  <td>{Number(emp.daily_rate).toLocaleString()}</td>
                  <td style={{color: '#2E7D32'}}>{Number(emp.total_earnings).toLocaleString()}</td>
                  <td>{Number(emp.total_received).toLocaleString()}</td>
                  <td style={{color: '#C62828'}}>{Number(emp.deductions_calculated).toLocaleString()}</td>
                  <td>{Number(emp.housing_and_subsistence).toLocaleString()}</td>
                  <td style={{background: '#f0f4ff', fontWeight: 900}}>{Number(emp.net_earnings).toLocaleString()}</td>
                  <td>{emp.phone_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sidebar-search no-print">
        <h2 style={{ color: THEME.goldAccent, textAlign: 'center', fontWeight: 900 }}>📊 الإحصائيات</h2>
        <input type="text" placeholder="بحث بالاسم..." value={searchName} onChange={e => setSearchName(e.target.value)} style={{width:'100%', padding:'12px', borderRadius:'10px', marginBottom:'20px', border:'none'}} />
        <div style={{color: 'white', background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '10px'}}>
            <p>إجمالي الصافي: <br/><span style={{fontSize: '20px', color: THEME.goldAccent}}>{totals.net.toLocaleString()}</span></p>
        </div>
      </div>
    </div>
  );
}