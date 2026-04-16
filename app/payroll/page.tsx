"use client";
import React, { useState } from 'react';
import { usePayrollLogic } from './payroll_logic';

const THEME = {
  primary: '#0f172a',    // كحلي فخم
  accent: '#ca8a04',     // ذهبي ملكي
  success: '#059669',    // أخضر
  ruby: '#e11d48',       // أحمر للسلف والخصومات
  slate: '#f8fafc',
  border: '#e2e8f0'
};

const GRID_LAYOUT = "1.5fr 100px 100px 90px 100px 100px 100px 120px 100px 60px";

// دالة التفقيط لطباعة إجمالي المسير
const tafqeet = (number: number) => {
    const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
    const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
    const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
    const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
    if (number === 0) return "صفر";
    let intPart = Math.floor(number);
    const convert = (num: number): string => {
      if (num < 10) return ones[num];
      if (num < 20) return teens[num - 10];
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " و " + ones[num % 10] : "");
      if (num < 1000) return hundreds[Math.floor(num / 100)] + (num % 100 !== 0 ? " و " + convert(num % 100) : "");
      if (num < 10000) return convert(Math.floor(num / 1000)) + " آلاف" + (num % 1000 !== 0 ? " و " + convert(num % 1000) : "");
      if (num < 1000000) return convert(Math.floor(num / 1000)) + " ألف" + (num % 1000 !== 0 ? " و " + convert(num % 1000) : "");
      return num.toString();
    };
    return convert(intPart);
};

export default function PayrollPage() {
  const logic = usePayrollLogic();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const months = Array.from({length: 12}, (_, i) => i + 1);
  const years = [2024, 2025, 2026, 2027];

  if (logic.isLoading) return <div style={{padding:'100px', textAlign:'center', fontWeight:900, color: THEME.primary, fontSize: '20px'}}>⏳ جاري تهيئة مسير الرواتب...</div>;

  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', background: '#f1f5f9', display: 'flex', fontFamily: 'Cairo, sans-serif' }}>
      <style>{`
        @media print { 
            @page { size: landscape; margin: 10mm; }
            body { background: white; -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; } 
            .print-area { display: block !important; width: 100%; }
            .print-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; text-align: center; }
            .print-table th, .print-table td { border: 1px solid #1e293b; padding: 8px; }
            .print-table th { background-color: ${THEME.primary} !important; color: white !important; font-weight: 900; }
            .print-table tr:nth-child(even) { background-color: #f8fafc !important; }
            .sign-col { width: 150px; }
        }
        .payroll-input { width: 100%; border: 1px solid transparent; background: transparent; text-align: center; font-weight: 900; font-family: 'Cairo'; outline: none; border-radius: 6px; padding: 4px; transition: 0.2s; }
        .payroll-input:focus, .payroll-input:hover { border-color: ${THEME.accent}; background: white; }
        .row-card { display: grid; grid-template-columns: ${GRID_LAYOUT}; background: white; padding: 12px 15px; border-radius: 12px; margin-bottom: 8px; align-items: center; border: 1px solid #e2e8f0; transition: 0.2s; }
        .row-card:hover { border-color: ${THEME.accent}; transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
      `}</style>

      {/* 🏰 السايد بار */}
      <aside className="no-print" onMouseEnter={() => setIsSidebarOpen(true)} onMouseLeave={() => setIsSidebarOpen(false)} style={{ width: isSidebarOpen ? '280px' : '70px', background: THEME.primary, transition: '0.3s', position: 'fixed', right: 0, height: '100vh', zIndex: 1001, borderLeft: `3px solid ${THEME.accent}` }}>
         <div style={{ padding: '25px 15px', opacity: isSidebarOpen ? 1 : 0, transition: '0.2s', width: '280px' }}>
            <h3 style={{ color: 'white', fontWeight: 900, marginBottom: '20px', borderBottom: `2px solid ${THEME.accent}`, paddingBottom: '10px' }}>إعدادات المسير</h3>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
               <select value={logic.selectedMonth} onChange={e => logic.setSelectedMonth(Number(e.target.value))} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 900, outline: 'none' }}>
                   {months.map(m => <option key={m} value={m}>شهر {m}</option>)}
               </select>
               <select value={logic.selectedYear} onChange={e => logic.setSelectedYear(Number(e.target.value))} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 900, outline: 'none' }}>
                   {years.map(y => <option key={y} value={y}>سنة {y}</option>)}
               </select>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: `1px solid ${THEME.accent}` }}>
               <div style={{color: THEME.accent, fontSize: '11px', fontWeight: 900}}>إجمالي المطلوب صرفه (الصافي)</div>
               <div style={{color: 'white', fontSize: '26px', fontWeight: 900}}>{logic.totals.net.toLocaleString()} <span style={{fontSize:'12px'}}>ر.س</span></div>
            </div>

            <input placeholder="🔍 بحث في المسير..." value={logic.globalSearch} onChange={e => logic.setGlobalSearch(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', border: 'none', outline: 'none', marginBottom: '30px' }} />
            
            <button onClick={() => window.print()} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: THEME.success, color: 'white', border: 'none', cursor: 'pointer', fontWeight: 900, marginBottom: '10px' }}>🖨️ طباعة مسير الرواتب</button>
            <button onClick={logic.exportToExcel} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#334155', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 900 }}>📊 تصدير Excel</button>
         </div>
      </aside>

      {/* 🏙️ المحتوى الرئيسي */}
      <main className="no-print" style={{ flex: 1, padding: '40px', marginRight: isSidebarOpen ? '280px' : '70px', transition: '0.3s' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 900, color: THEME.primary, margin: 0 }}>مسير الرواتب والأجور</h1>
            <p style={{ color: '#64748b', fontWeight: 900, margin: 0 }}>إدارة رواتب ويوميات شهر ({logic.selectedMonth} / {logic.selectedYear})</p>
          </div>
          <img src="/RYC_Logo.png" alt="Logo" style={{ height: '70px' }} />
        </header>

        {/* كروت التلخيص العلوية */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', borderBottom: `4px solid ${THEME.primary}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 900 }}>إجمالي الكوادر</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: THEME.primary }}>{logic.filteredRecords.length}</div>
            </div>
            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', borderBottom: `4px solid ${THEME.success}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 900 }}>إجمالي البدلات والمكافآت</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: THEME.success }}>{logic.totals.allowances.toLocaleString()}</div>
            </div>
            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', borderBottom: `4px solid ${THEME.ruby}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 900 }}>إجمالي السلف والخصومات</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: THEME.ruby }}>{(logic.totals.deductions + logic.totals.advances).toLocaleString()}</div>
            </div>
            <div style={{ background: THEME.primary, color: 'white', padding: '20px', borderRadius: '15px', borderBottom: `4px solid ${THEME.accent}`, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '13px', color: THEME.accent, fontWeight: 900 }}>الصافي النهائي للمسير</div>
                <div style={{ fontSize: '24px', fontWeight: 900 }}>{logic.totals.net.toLocaleString()}</div>
            </div>
        </div>

        {/* رأس الجدول */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID_LAYOUT, background: THEME.primary, color: 'white', padding: '15px', borderRadius: '12px', fontWeight: 900, fontSize: '12px', marginBottom: '15px', textAlign: 'center', alignItems: 'center' }}>
          <div style={{textAlign: 'right', paddingRight:'10px'}}>اسم الكادر / المهنة</div>
          <div>الأساسي/اليومية</div><div>أيام العمل</div><div>بدلات</div><div>سلف</div><div>خصومات</div><div style={{color: THEME.accent}}>الصافي</div><div>الحالة</div><div></div>
        </div>

        {/* صفوف مسير الرواتب (قابلة للتعديل المباشر) */}
        {logic.filteredRecords.map(r => (
          <div key={r.id} className="row-card" style={{ textAlign: 'center' }}>
            <div style={{ textAlign: 'right', paddingRight: '10px' }}>
                <div style={{ fontWeight: 900, color: THEME.primary, fontSize: '14px' }}>{r.name}</div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                    <span style={{color: r.type==='عامل يومية'?THEME.accent:THEME.success}}>{r.type}</span> | {r.job_role || 'بدون مسمى'}
                </div>
            </div>
            
            {/* حقول الإدخال السريع (Excel-like interface) */}
            <div><input type="number" className="payroll-input" value={r.base_rate || ''} onChange={e => logic.updateRecord(r.id, 'base_rate', e.target.value)} placeholder="0" /></div>
            <div><input type="number" className="payroll-input" value={r.days_worked || ''} onChange={e => logic.updateRecord(r.id, 'days_worked', e.target.value)} placeholder="0" disabled={r.type !== 'عامل يومية'} style={{opacity: r.type !== 'عامل يومية' ? 0.3 : 1}} /></div>
            <div><input type="number" className="payroll-input" style={{color: THEME.success}} value={r.allowances || ''} onChange={e => logic.updateRecord(r.id, 'allowances', e.target.value)} placeholder="0" /></div>
            <div><input type="number" className="payroll-input" style={{color: THEME.ruby}} value={r.advances || ''} onChange={e => logic.updateRecord(r.id, 'advances', e.target.value)} placeholder="0" /></div>
            <div><input type="number" className="payroll-input" style={{color: THEME.ruby}} value={r.deductions || ''} onChange={e => logic.updateRecord(r.id, 'deductions', e.target.value)} placeholder="0" /></div>
            
            <div style={{ fontWeight: 900, color: THEME.primary, fontSize: '16px', background: '#f8fafc', padding: '5px', borderRadius: '6px' }}>
                {Number(r.net_salary).toLocaleString()}
            </div>

            <div>
               <select className="payroll-input" value={r.status} onChange={e => logic.updateRecord(r.id, 'status', e.target.value)} style={{ color: r.status==='مدفوع' ? THEME.success : '#94a3b8', fontSize: '11px' }}>
                  <option value="غير مدفوع">غير مدفوع</option>
                  <option value="مدفوع">✅ مدفوع</option>
               </select>
            </div>

            <div>
                <button onClick={() => { logic.setCurrentRecord(r); logic.setIsEditModalOpen(true); }} style={{ background: '#f1f5f9', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 900, fontSize: '11px', color: THEME.primary }}>⚙️ تفاصيل</button>
            </div>
          </div>
        ))}
      </main>

      {/* 📝 مودال مفردات الراتب التفصيلية */}
      {logic.isEditModalOpen && logic.currentRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', zIndex: 5000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: 'white', width: '600px', padding: '30px', borderRadius: '20px', border: `4px solid ${THEME.accent}` }}>
            <h2 style={{ fontWeight: 900, color: THEME.primary, marginBottom: '20px', borderBottom: `2px solid ${THEME.slate}`, paddingBottom: '10px' }}>
                مفردات راتب: <span style={{color: THEME.accent}}>{logic.currentRecord.name}</span>
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
               <div>
                  <label style={{ display: 'block', fontWeight: 900, fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>{logic.currentRecord.type === 'عامل يومية' ? 'فئة اليومية' : 'الراتب الأساسي'}</label>
                  <input type="number" value={logic.currentRecord.base_rate} onChange={e => logic.setCurrentRecord({...logic.currentRecord, base_rate: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontWeight: 900, outline: 'none' }} />
               </div>
               <div>
                  <label style={{ display: 'block', fontWeight: 900, fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>أيام العمل (لعمال اليومية)</label>
                  <input type="number" disabled={logic.currentRecord.type !== 'عامل يومية'} value={logic.currentRecord.days_worked} onChange={e => logic.setCurrentRecord({...logic.currentRecord, days_worked: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontWeight: 900, outline: 'none', background: logic.currentRecord.type !== 'عامل يومية' ? '#f1f5f9' : 'white' }} />
               </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '12px' }}>
               <div>
                  <label style={{ display: 'block', fontWeight: 900, fontSize: '12px', color: THEME.success, marginBottom: '5px' }}>➕ بدلات / مكافآت</label>
                  <input type="number" value={logic.currentRecord.allowances} onChange={e => logic.setCurrentRecord({...logic.currentRecord, allowances: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${THEME.success}80`, fontWeight: 900, outline: 'none' }} />
               </div>
               <div>
                  <label style={{ display: 'block', fontWeight: 900, fontSize: '12px', color: THEME.ruby, marginBottom: '5px' }}>➖ سلف مسحوبة</label>
                  <input type="number" value={logic.currentRecord.advances} onChange={e => logic.setCurrentRecord({...logic.currentRecord, advances: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${THEME.ruby}80`, fontWeight: 900, outline: 'none' }} />
               </div>
               <div>
                  <label style={{ display: 'block', fontWeight: 900, fontSize: '12px', color: THEME.ruby, marginBottom: '5px' }}>➖ خصم / غياب</label>
                  <input type="number" value={logic.currentRecord.deductions} onChange={e => logic.setCurrentRecord({...logic.currentRecord, deductions: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${THEME.ruby}80`, fontWeight: 900, outline: 'none' }} />
               </div>
            </div>

            <div style={{ background: THEME.primary, color: 'white', padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ fontWeight: 900 }}>الصافي المستحق للدفع:</div>
               <div style={{ fontSize: '24px', fontWeight: 900, color: THEME.accent }}>{Number(logic.currentRecord.net_salary).toLocaleString()} <small style={{fontSize:'14px'}}>ريال</small></div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
               <button onClick={() => logic.setIsEditModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${THEME.primary}`, background: 'white', fontWeight: 900, cursor: 'pointer' }}>إلغاء</button>
               <button onClick={logic.saveModalRecord} style={{ flex: 2, padding: '12px', borderRadius: '10px', background: THEME.success, color: 'white', border: 'none', fontWeight: 900, cursor: 'pointer' }}>✅ حفظ التعديلات</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🖨️ منطقة الطباعة الملكية Landscape (Payroll Sheet) */}
      {/* ========================================================= */}
      <div className="print-area" style={{ display: 'none' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `4px solid ${THEME.primary}`, paddingBottom: '15px', marginBottom: '20px' }}>
            <div>
               <h1 style={{ margin: 0, color: THEME.primary, fontSize: '26px' }}>مسير الرواتب والأجور (Payroll Sheet)</h1>
               <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '14px' }}>شركة رواسي اليسر للمقاولات | عن شهر ({logic.selectedMonth} / {logic.selectedYear})</p>
            </div>
            <img src="/RYC_Logo.png" alt="Logo" style={{ height: '70px' }} />
         </div>

         <table className="print-table">
            <thead>
               <tr>
                  <th style={{width: '30px'}}>م</th>
                  <th style={{width: '20%'}}>اسم الموظف / العامل</th>
                  <th>التصنيف</th>
                  <th>الرقم القومي</th>
                  <th>الأساسي / اليومية</th>
                  <th>أيام العمل</th>
                  <th>الاستحقاقات (بدلات)</th>
                  <th>الاستقطاعات (سلف+خصم)</th>
                  <th style={{color: THEME.accent}}>الصافي المستحق</th>
                  <th className="sign-col">توقيع المستلم (البصمة)</th>
               </tr>
            </thead>
            <tbody>
               {logic.filteredRecords.map((r, i) => (
                  <tr key={r.id}>
                     <td>{i + 1}</td>
                     <td style={{ fontWeight: 'bold', textAlign: 'right' }}>{r.name} <br/><span style={{fontSize:'10px', color:'#555'}}>{r.job_role}</span></td>
                     <td>{r.type}</td>
                     <td style={{letterSpacing: '1px'}}>{r.identity_number || '---'}</td>
                     <td>{Number(r.base_rate).toLocaleString()}</td>
                     <td>{r.type === 'عامل يومية' ? r.days_worked : '---'}</td>
                     <td>{Number(r.allowances).toLocaleString()}</td>
                     <td>{(Number(r.deductions) + Number(r.advances)).toLocaleString()}</td>
                     <td style={{ fontWeight: '900', fontSize: '14px' }}>{Number(r.net_salary).toLocaleString()}</td>
                     <td></td> {/* خانة التوقيع فارغة */}
                  </tr>
               ))}
               {/* صف الإجماليات */}
               <tr style={{ background: THEME.primary, color: 'white', fontWeight: 900 }}>
                   <td colSpan={6} style={{ textAlign: 'left', paddingRight: '20px' }}>الإجمـــــالي الكــــلي:</td>
                   <td>{logic.totals.allowances.toLocaleString()}</td>
                   <td>{(logic.totals.deductions + logic.totals.advances).toLocaleString()}</td>
                   <td style={{ fontSize: '16px', color: THEME.accent }}>{logic.totals.net.toLocaleString()} ريال</td>
                   <td></td>
               </tr>
            </tbody>
         </table>

         <div style={{ marginTop: '20px', fontSize: '13px', fontWeight: 900 }}>
             الإجمالي بالحروف: فقط {tafqeet(logic.totals.net)} لا غير.
         </div>

         <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '50px', fontSize: '14px', fontWeight: 'bold' }}>
             <div style={{textAlign: 'center'}}>محاسب الرواتب<br/><br/>........................</div>
             <div style={{textAlign: 'center'}}>مدير الموارد البشرية<br/><br/>........................</div>
             <div style={{textAlign: 'center'}}>المدير المالي (للاعتماد)<br/><br/>........................</div>
         </div>
      </div>

    </div>
  );
}