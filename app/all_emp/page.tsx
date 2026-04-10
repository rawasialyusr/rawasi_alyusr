"use client";
import { useState } from 'react';
import { useEmpLogic } from './all_emp_logic';

const THEME = {
  sandLight: '#F4F1EE',
  sandDark: '#E6D5C3',
  coffeeMain: '#8C6A5D',
  coffeeDark: '#43342E',
  goldAccent: '#C5A059',
  white: '#FFFFFF',
  black: '#000000',
  danger: '#e74c3c',
  success: '#2E7D32'
};

export default function AllEmployeesPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const {
    loading, displayedEmployees,
    searchName, setSearchName,
    totalCount, exportToExcel,
    selectedIds, toggleSelectAll, toggleSelectRow,
    handleDelete, handleEdit,
    isModalOpen, setIsModalOpen,
    editingRecord, setEditingRecord,
    handleSaveUpdate,
    fetchData 
  } = useEmpLogic();

  // حسابات السامري كارد (Summary Calculations)
  const summary = displayedEmployees.reduce((acc, emp) => {
    acc.earnings += (Number(emp.earnings) || 0);
    acc.deductions += (Number(emp.deductions) || 0);
    acc.housing += (Number(emp.housing) || 0);
    acc.received += (Number(emp.received) || 0);
    acc.net += (Number(emp.net_earnings) || 0);
    return acc;
  }, { earnings: 0, deductions: 0, housing: 0, received: 0, net: 0 });

  return (
    <div style={{ direction: 'rtl', height: '100vh', width: '100vw', display: 'flex', overflow: 'hidden', backgroundColor: THEME.sandLight }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
        
        .table-container { flex: 1; margin-right: 55px; padding: 20px; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
        
        .scroll-box { flex: 1; overflow: auto; border-radius: 15px; background: rgba(255,255,255,0.3); padding: 10px; border: 1px solid ${THEME.sandDark}; }

        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${THEME.goldAccent}; border-radius: 10px; }

        table { width: 100%; border-collapse: separate; border-spacing: 0 8px; table-layout: fixed; min-width: 1600px; }
        th { background: ${THEME.coffeeDark} !important; color: ${THEME.goldAccent} !important; padding: 16px 10px; position: sticky; top: 0; z-index: 10; font-weight: 900; text-align: center; border-bottom: 3px solid ${THEME.goldAccent}; }
        td { background: ${THEME.white}; padding: 12px 10px; text-align: center; border-top: 1px solid ${THEME.sandDark}; border-bottom: 1px solid ${THEME.sandDark}; color: ${THEME.black} !important; font-weight: 700; }

        .sidebar-search { position: fixed; right: -290px; top: 0; height: 100vh; width: 340px; background: ${THEME.coffeeDark}; z-index: 1000; transition: 0.3s ease; padding: 20px; display: flex; flex-direction: column; box-shadow: -10px 0 30px rgba(0,0,0,0.4); overflow-y: auto; }
        .sidebar-search:hover { right: 0; }
        .sidebar-handle { position: absolute; left: -45px; top: 300px; background: ${THEME.coffeeDark}; color: ${THEME.goldAccent}; padding: 15px 10px; border-radius: 12px 0 0 12px; writing-mode: vertical-rl; font-weight: 900; cursor: pointer; }
        
        .action-btn { border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; color: white; display: flex; align-items: center; justify-content: center; gap: 5px; }
        .edit-btn { background: ${THEME.goldAccent}; color: ${THEME.coffeeDark}; }
        .delete-btn { background: ${THEME.danger}; }

        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .modal-content { background: white; padding: 30px; border-radius: 15px; width: 600px; max-width: 95%; direction: rtl; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        
        .summary-card { background: rgba(255,255,255,0.05); border: 1px solid ${THEME.coffeeMain}; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
        .summary-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
        .summary-label { color: ${THEME.sandDark}; font-size: 13px; }
        .summary-value { color: ${THEME.white}; font-weight: 700; font-size: 14px; }
        .sidebar-input { background: rgba(255,255,255,0.08); border: 1px solid ${THEME.coffeeMain}; color: #fff; padding: 10px; border-radius: 6px; margin-bottom: 10px; width: 100%; outline: none; font-size: 14px; }
      `}</style>

      {/* Sidebar UI */}
      <div className="sidebar-search">
        <div className="sidebar-handle">⚙️ التحكم والفلترة</div>
        <h3 style={{ color: THEME.goldAccent, textAlign: 'center', marginBottom: '20px', fontWeight: 900 }}>🔍 بحث شامل</h3>
        
        <input 
          type="text" 
          placeholder="ابحث بالاسم، الكود، أو الإقامة..." 
          value={searchName} 
          onChange={(e) => setSearchName(e.target.value)} 
          className="sidebar-input" 
          style={{ height: '50px', fontSize: '16px' }}
        />

        <div style={{ borderTop: `1px solid ${THEME.coffeeMain}`, margin: '15px 0', paddingTop: '15px' }}>
          <label style={{ color: THEME.goldAccent, fontSize: '12px', fontWeight: 'bold' }}>📅 من تاريخ</label>
          <input type="date" className="sidebar-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <label style={{ color: THEME.goldAccent, fontSize: '12px', fontWeight: 'bold' }}>📅 إلى تاريخ</label>
          <input type="date" className="sidebar-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <button onClick={() => fetchData(startDate, endDate)} style={{ width: '100%', background: THEME.goldAccent, color: THEME.coffeeDark, border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '900', cursor: 'pointer', marginTop: '5px' }}>تحديث البيانات والجمع</button>
        </div>

        <h3 style={{ color: THEME.goldAccent, textAlign: 'center', marginTop: '10px', marginBottom: '15px' }}>📊 ملخص الحسابات</h3>
        
        <div className="summary-card" style={{ borderRight: `4px solid ${THEME.goldAccent}` }}>
          <div className="summary-item">
            <span className="summary-label">إجمالي المستحق:</span>
            <span className="summary-value" style={{ color: THEME.goldAccent }}>{summary.earnings.toLocaleString()}</span>
          </div>
        </div>

        <div className="summary-card" style={{ borderRight: `4px solid ${THEME.danger}` }}>
          <div className="summary-item"><span className="summary-label">إجمالي السكن:</span><span className="summary-value">{summary.housing.toLocaleString()}</span></div>
          <div className="summary-item"><span className="summary-label">إجمالي الخصومات:</span><span className="summary-value">{summary.deductions.toLocaleString()}</span></div>
          <div className="summary-item"><span className="summary-label">إجمالي المستلم:</span><span className="summary-value">{summary.received.toLocaleString()}</span></div>
        </div>

        <div className="summary-card" style={{ background: THEME.goldAccent, border: 'none' }}>
          <div className="summary-item">
            <span className="summary-label" style={{ color: THEME.coffeeDark, fontWeight: '900' }}>إجمالي الصافي:</span>
            <span className="summary-value" style={{ color: THEME.coffeeDark, fontSize: '18px', fontWeight: '900' }}>{summary.net.toLocaleString()}</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: THEME.sandDark, fontSize: '12px', marginTop: '10px' }}>
          عدد الموظفين المعروضين: <b>{totalCount}</b>
        </div>
      </div>

      <div className="table-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h1 style={{ color: THEME.coffeeDark, fontSize: '32px', fontWeight: 900, margin: 0 }}>سجل الموظفين 👥</h1>
            <p style={{ color: THEME.coffeeMain, fontWeight: 700 }}>نظام إدارة الموارد البشرية والرواتب</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '5px', background: 'rgba(0,0,0,0.05)', padding: '5px', borderRadius: '10px' }}>
               <button className="action-btn edit-btn" disabled={selectedIds.length !== 1} onClick={handleEdit}>✏️ تعديل</button>
               <button className="action-btn delete-btn" disabled={selectedIds.length === 0} onClick={handleDelete}>🗑️ حذف ({selectedIds.length})</button>
            </div>
            <button onClick={() => { setEditingRecord({}); setIsModalOpen(true); }} style={{ background: '#2E7D32', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '900' }}>➕ إضافة موظف</button>
            <button onClick={exportToExcel} style={{ background: THEME.coffeeMain, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '900' }}>📤 Excel</button>
          </div>
        </div>

        <div className="scroll-box custom-scrollbar">
          <table>
            <thead>
              <tr>
                <th style={{ width: '50px' }}><input type="checkbox" checked={displayedEmployees.length > 0 && selectedIds.length === displayedEmployees.length} onChange={toggleSelectAll} /></th>
                <th style={{ width: '80px' }}>كود</th>
                <th style={{ width: '220px' }}>اسم الموظف</th>
                <th style={{ width: '130px' }}>الجوال</th>
                <th style={{ width: '130px' }}>المهنة</th>
                <th style={{ width: '110px' }}>الراتب\يوميه</th>
                <th style={{ width: '140px' }}>رقم الإقامة</th>
                <th style={{ width: '120px' }}>نهاية الإقامة</th>
                <th style={{ width: '100px' }}>أيام الدوام</th>
                <th style={{ width: '100px' }}>المستحق</th>
                <th style={{ width: '100px' }}>السكن</th>
                <th style={{ width: '100px' }}>الخصومات</th>
                <th style={{ width: '100px' }}>المستلم</th>
                <th style={{ width: '110px' }}>الصافي</th>
              </tr>
            </thead>
            <tbody>
              {displayedEmployees.map((emp) => (
                <tr key={emp.emp_id}>
                  <td><input type="checkbox" checked={selectedIds.includes(emp.emp_id)} onChange={() => toggleSelectRow(emp.emp_id)} /></td>
                  <td style={{ color: '#777' }}>{emp.emp_id}</td>
                  <td style={{ fontWeight: '900' }}>{emp.emp_name}</td>
                  <td dir="ltr">{emp.phone_number}</td>
                  <td style={{ color: '#6a1b9a' }}>{emp.job_title}</td>
                  <td style={{ fontWeight: 'bold' }}>{Number(emp.Salary || 0).toLocaleString()}</td>
                  <td>{emp.iqama_num}</td>
                  <td style={{ color: '#c62828' }}>{emp.expire_date}</td>
                  <td style={{ fontWeight: 'bold' }}>{emp.work_days || 0}</td>
                  <td>{(emp.earnings || 0).toLocaleString()}</td>
                  <td style={{ color: '#2e7d32' }}>{Number(emp.housing || 0).toLocaleString()}</td>
                  <td style={{ color: '#c62828' }}>{Number(emp.deductions || 0).toLocaleString()}</td>
                  <td>{(emp.received || 0).toLocaleString()}</td>
                  <td style={{ background: '#FFF9C4', fontWeight: '900' }}>{(emp.net_earnings || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderTop: `8px solid ${THEME.coffeeDark}` }}>
            <h2 style={{ color: THEME.coffeeDark, borderBottom: `2px solid ${THEME.goldAccent}`, paddingBottom: '10px', marginTop: 0, fontWeight: 900, textAlign: 'center' }}>
              {editingRecord?.emp_id ? '✏️ تعديل بيانات موظف' : '➕ إضافة موظف جديد'}
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
              {[
                { label: "كود الموظف", key: "emp_id", type: "text" },
                { label: "اسم الموظف", key: "emp_name", type: "text", fullWidth: true },
                { label: "الجوال", key: "phone_number", type: "text" },
                { label: "المهنة", key: "job_title", type: "text" },
                { label: "رقم الإقامة", key: "iqama_num", type: "text" },
                { label: "نهاية الإقامة", key: "expire_date", type: "date" },
                { label: "الراتب / يومية", key: "Salary", type: "number" },
              ].map((field) => (
                <div key={field.key} style={{ gridColumn: field.fullWidth ? "span 2" : "span 1" }}>
                  <label style={{ display: 'block', fontWeight: '900', marginBottom: '8px', fontSize: '14px', color: THEME.black }}>{field.label}</label>
                  <input 
                    type={field.type}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `2px solid ${THEME.sandDark}`, fontWeight: 'bold', fontSize: '15px', color: '#000', outlineColor: THEME.goldAccent }}
                    value={editingRecord[field.key] || ''}
                    onChange={(e) => setEditingRecord({...editingRecord, [field.key]: e.target.value})}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '35px' }}>
              <button onClick={handleSaveUpdate} style={{ flex: 2, background: THEME.coffeeDark, color: THEME.goldAccent, border: 'none', padding: '16px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '18px' }}>💾 حفظ البيانات</button>
              <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, background: '#eee', color: '#000', border: 'none', padding: '16px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}