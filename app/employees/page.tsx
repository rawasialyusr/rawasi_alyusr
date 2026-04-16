"use client";
import React, { useState } from 'react';
import { useEmployeesLogic } from './employees_logic';

// 🟢 هوية رواسي اليسر البصرية (The Royal Theme)
const THEME = {
  primary: '#0f172a',    // الكحلي الفاخر
  accent: '#ca8a04',     // الذهبي الملكي
  sand: '#f8fafc',       // خلفية رملية فاتحة جداً
  success: '#059669',    // أخضر
  ruby: '#e11d48',       // أحمر
  border: '#e2e8f0',     // حدود
  // ألوان الشارات
  badgeEmp: '#2563eb', badgeWorker: '#16a34a', badgeDaily: '#d97706'
};

const GRID_LAYOUT = "50px 80px 2fr 100px 1.5fr 150px 100px 100px";

const getBadgeColor = (type: string) => {
    if (type === 'موظف') return THEME.badgeEmp;
    if (type === 'عامل يومية') return THEME.badgeDaily;
    return THEME.badgeWorker;
};

// حساب حالة الإقامة للجدول
const getIqamaStatus = (dateStr: string) => {
    if (!dateStr) return { text: 'غير مسجل', color: '#94a3b8' };
    const today = new Date();
    const expiry = new Date(dateStr);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: 'منتهية ⚠️', color: THEME.ruby };
    if (diffDays <= 30) return { text: `باقي ${diffDays} يوم`, color: '#d97706' };
    return { text: 'سارية ✅', color: THEME.success };
};

const ModalField = ({ label, type = "text", value, onChange, hideLabel=false, ...props }: any) => (
    <div style={{ marginBottom: hideLabel ? '0' : '15px' }}>
      {!hideLabel && <label style={{ display: 'block', fontWeight: 900, fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>{label}</label>}
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: `1px solid ${THEME.border}`, fontWeight: 900, fontSize: '14px', outline: 'none', color: THEME.primary, transition: '0.3s', backgroundColor: '#fff' }} 
        onFocus={(e) => e.target.style.borderColor = THEME.accent} onBlur={(e) => e.target.style.borderColor = THEME.border} {...props} />
    </div>
);

export default function EmployeesMasterPage() {
  const logic = useEmployeesLogic();
  // 🟢 حل مشكلة السايد بار: أصبح يفتح ويغلق بالضغط فقط (ليس بالمرور)
  const [isSidebarPinned, setIsSidebarPinned] = useState(true);

  if (logic.isLoading) return <div style={{padding:'100px', textAlign:'center', fontWeight:900, color: THEME.primary, fontSize: '20px'}}>⏳ جاري تحميل الموارد البشرية...</div>;

  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', background: THEME.sand, display: 'flex', fontFamily: 'Cairo, sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        .row-card:hover { border-color: ${THEME.accent}; transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .kpi-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid ${THEME.border}; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        /* Scrollbar styling for modal */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${THEME.accent}; border-radius: 10px; }
        
        .tab-btn { padding: 12px 25px; font-weight: 900; border: none; cursor: pointer; transition: 0.3s; border-bottom: 3px solid transparent; background: transparent; color: #64748b; font-size: 15px; }
        .tab-btn.active { color: ${THEME.primary}; border-bottom-color: ${THEME.accent}; }
        
        @media print { 
            @page { size: landscape; margin: 10mm; }
            body { background: white; }
            .no-print { display: none !important; } 
            .print-area { display: block !important; width: 100%; }
            .print-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; text-align: center; }
            .print-table th, .print-table td { border: 1px solid #1e293b; padding: 8px; }
            .print-table th { background-color: ${THEME.primary} !important; color: white !important; font-weight: 900; }
            .print-table tr:nth-child(even) { background-color: #f8fafc !important; }
        }
      `}</style>

      {/* 🏰 السايد بار (Fixed toggle via click) */}
      <aside className="no-print" style={{ width: isSidebarPinned ? '280px' : '0px', background: THEME.primary, transition: '0.4s', position: 'fixed', right: 0, height: '100vh', zIndex: 1001, borderLeft: isSidebarPinned ? `3px solid ${THEME.accent}` : 'none', overflow: 'hidden' }}>
         <div style={{ padding: '25px 15px', width: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
               <h3 style={{ color: 'white', fontWeight: 900, margin: 0 }}>إدارة الكوادر</h3>
               <button onClick={() => setIsSidebarPinned(false)} style={{ background: 'transparent', border: 'none', color: THEME.accent, cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            
            <button onClick={logic.handleAddNew} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'white', color: THEME.primary, fontWeight: 900, border: 'none', cursor: 'pointer', marginBottom: '20px' }}>➕ إضافة كادر جديد</button>
            <input placeholder="🔍 بحث سريع..." value={logic.globalSearch} onChange={e => logic.setGlobalSearch(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', border: 'none', outline: 'none', marginBottom: '20px' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
               <button onClick={logic.handleEditSelected} disabled={logic.selectedIds.length!==1} style={{ padding: '12px', borderRadius: '10px', background: THEME.accent, color: 'white', border: 'none', cursor: logic.selectedIds.length===1 ? 'pointer':'not-allowed', fontWeight: 900, opacity: logic.selectedIds.length===1 ? 1:0.4 }}>✏️ تعديل بيانات السجل</button>
               <button onClick={logic.handleDelete} disabled={logic.selectedIds.length===0} style={{ padding: '12px', borderRadius: '10px', background: THEME.ruby, color: 'white', border: 'none', cursor: logic.selectedIds.length>0 ? 'pointer':'not-allowed', fontWeight: 900, opacity: logic.selectedIds.length>0 ? 1:0.4 }}>🗑️ طي قيد / حذف</button>
               <button onClick={logic.exportToExcel} style={{ padding: '12px', borderRadius: '10px', background: '#334155', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 900, marginTop: '20px' }}>📊 تصدير Excel</button>
               <button onClick={() => window.print()} style={{ padding: '12px', borderRadius: '10px', background: THEME.success, color: 'white', border: 'none', cursor: 'pointer', fontWeight: 900 }}>🖨️ طباعة تقرير HR</button>
            </div>
         </div>
      </aside>

      {/* 🏙️ المحتوى الرئيسي */}
      <main className="no-print" style={{ flex: 1, padding: '40px', marginRight: isSidebarPinned ? '280px' : '0px', transition: '0.4s' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {!isSidebarPinned && (
                <button onClick={() => setIsSidebarPinned(true)} style={{ background: THEME.primary, color: THEME.accent, border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 900, fontSize: '18px' }}>☰</button>
            )}
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 900, color: THEME.primary, margin: 0 }}>لوحة قيادة الموارد البشرية</h1>
              <p style={{ color: '#64748b', fontWeight: 900, margin: 0 }}>نظام إدارة شؤون الموظفين والعمال المتقدم</p>
            </div>
          </div>
          <img src="/RYC_Logo.png" alt="Logo" style={{ height: '70px' }} />
        </header>

        {/* 📊 منطقة مؤشرات الأداء (KPIs) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <div className="kpi-card" style={{ borderBottom: `4px solid ${THEME.primary}` }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 900 }}>إجمالي الكوادر البشرية</div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: THEME.primary }}>{logic.kpis.total}</div>
                <div style={{ fontSize: '12px', color: THEME.success, fontWeight: 900, marginTop: '5px' }}>🟢 {logic.kpis.active} على رأس العمل</div>
            </div>
            
            <div className="kpi-card" style={{ borderBottom: `4px solid ${THEME.success}` }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 900 }}>الرواتب الأساسية للموظفين</div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: THEME.success }}>{logic.kpis.totalBasicSalaries.toLocaleString()} <span style={{fontSize:'14px'}}>ر.س</span></div>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 900, marginTop: '5px' }}>إجمالي الالتزام الشهري الثابت</div>
            </div>

            <div className="kpi-card" style={{ borderBottom: `4px solid ${logic.kpis.expiringCount > 0 ? THEME.ruby : THEME.accent}` }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 900 }}>إقامات/عقود تنتهي قريباً (30 يوم)</div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: logic.kpis.expiringCount > 0 ? THEME.ruby : THEME.accent }}>{logic.kpis.expiringCount}</div>
                <div style={{ fontSize: '12px', color: THEME.ruby, fontWeight: 900, marginTop: '5px' }}>🚨 يتطلب اتخاذ إجراء فوري</div>
            </div>

            <div className="kpi-card" style={{ borderBottom: `4px solid ${THEME.badgeEmp}` }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 900 }}>مؤشر التوطين (نطاقات)</div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: THEME.badgeEmp }}>{logic.kpis.saudizationRate}%</div>
                <div style={{ width: '100%', background: '#e2e8f0', height: '6px', borderRadius: '3px', marginTop: '10px' }}>
                    <div style={{ width: `${logic.kpis.saudizationRate}%`, background: THEME.badgeEmp, height: '100%', borderRadius: '3px' }}></div>
                </div>
            </div>
        </div>

        {/* رأس الجدول */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID_LAYOUT, background: THEME.primary, color: 'white', padding: '16px', borderRadius: '12px', fontWeight: 900, fontSize: '13px', marginBottom: '15px', textAlign: 'center', alignItems: 'center' }}>
          <input type="checkbox" onChange={() => { if (logic.selectedIds.length === logic.paginatedRecords.length) logic.setSelectedIds([]); else logic.setSelectedIds(logic.paginatedRecords.map(r => r.id)); }} checked={logic.selectedIds.length > 0 && logic.selectedIds.length === logic.paginatedRecords.length} />
          <div>الكود</div><div style={{textAlign: 'right'}}>اسم الموظف / العامل</div><div>التصنيف</div><div style={{textAlign: 'right', paddingRight: '15px'}}>المهنة</div><div>تاريخ الإقامة</div><div>الراتب الأساسي</div><div>الحالة</div>
        </div>

        {/* صفوف الجدول العائمة */}
        {logic.paginatedRecords.map(r => {
          const iqama = getIqamaStatus(r.iqama_expiry);
          return (
          <div key={r.id} className="row-card row-hover" style={{ display: 'grid', gridTemplateColumns: GRID_LAYOUT, background: 'white', padding: '16px', borderRadius: '12px', marginBottom: '10px', alignItems: 'center', border: `1px solid ${THEME.border}`, transition: '0.2s', textAlign: 'center', backgroundColor: logic.selectedIds.includes(r.id) ? '#fef3c7' : 'white', cursor: 'pointer' }} onClick={() => logic.openEmployeeProfile(r.id)}>
            <input type="checkbox" checked={logic.selectedIds.includes(r.id)} onClick={e => e.stopPropagation()} onChange={() => logic.setSelectedIds(p => p.includes(r.id)?p.filter(x=>x!==r.id):[...p, r.id])} />
            <div style={{ fontWeight: 900, color: THEME.primary }}>{r.code || '---'}</div>
            <div style={{ fontWeight: 900, textAlign: 'right', fontSize: '15px', color: THEME.primary }}>
               {r.name} <br/> <span style={{fontSize: '11px', color: '#64748b', fontWeight: 700}}>{r.nationality || '---'} | {r.identity_number || '---'}</span>
            </div>
            <div><span style={{ background: getBadgeColor(r.partner_type), color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 900 }}>{r.partner_type}</span></div>
            <div style={{ fontWeight: 700, color: THEME.primary, textAlign: 'right', paddingRight: '15px' }}>{r.job_role || '---'}</div>
            
            {/* حالة الإقامة الذكية */}
            <div style={{ fontWeight: 900, fontSize: '12px', color: iqama.color, background: `${iqama.color}15`, padding: '4px 8px', borderRadius: '6px' }}>{iqama.text}<br/><span style={{fontSize:'10px'}}>{r.iqama_expiry || ''}</span></div>
            
            <div style={{ fontWeight: 900, color: THEME.success, fontSize: '14px' }}>{Number(r.basic_salary || 0).toLocaleString()}</div>
            
            <div><span style={{ color: r.status === 'نشط' ? THEME.success : THEME.ruby, fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <div style={{width:'8px', height:'8px', borderRadius:'50%', background: r.status === 'نشط' ? THEME.success : THEME.ruby}}></div> {r.status}
            </span></div>
          </div>
        )})}
      </main>

      {/* 🟢 ملف العامل الشامل (Master Profile Modal) */}
      {logic.isEditModalOpen && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)', zIndex: 5000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: THEME.sand, width: '950px', height: '85vh', borderRadius: '20px', border: `4px solid ${THEME.accent}`, boxShadow: '0 25px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ background: THEME.primary, padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '50px', height: '50px', background: THEME.accent, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px' }}>👤</div>
                    <div>
                        <h2 style={{ color: 'white', margin: 0, fontWeight: 900 }}>{logic.currentRecord.name || 'عامل جديد'}</h2>
                        <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 700 }}>{logic.currentRecord.job_role || 'بدون مهنة'} | {logic.currentRecord.partner_type}</div>
                    </div>
                </div>
                <button onClick={() => logic.setIsEditModalOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer', fontWeight: 900, fontSize: '16px' }}>✕</button>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', background: 'white', borderBottom: `1px solid ${THEME.border}`, padding: '0 30px' }}>
                <button className={`tab-btn ${logic.activeTab === 'info' ? 'active' : ''}`} onClick={() => logic.setActiveTab('info')}>📄 البيانات الوظيفية والأساسية</button>
                <button className={`tab-btn ${logic.activeTab === 'ledger' ? 'active' : ''}`} onClick={() => logic.setActiveTab('ledger')} disabled={!logic.editingId}>💰 كشف الحساب والمستحقات</button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
                
                {/* 📌 التبويب الأول: البيانات */}
                {logic.activeTab === 'info' && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', background: 'white', padding: '20px', borderRadius: '12px', border: `1px solid ${THEME.border}`, marginBottom: '20px' }}>
                            <ModalField label="الرقم الوظيفي" value={logic.currentRecord.code} onChange={(v:any) => logic.setCurrentRecord({...logic.currentRecord, code: v})} />
                            <ModalField label="الاسم الرباعي المعتمد" value={logic.currentRecord.name} onChange={(v:any) => logic.setCurrentRecord({...logic.currentRecord, name: v})} />
                            <ModalField label="الجنسية" value={logic.currentRecord.nationality} onChange={(v:any) => logic.setCurrentRecord({...logic.currentRecord, nationality: v})} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', background: 'white', padding: '20px', borderRadius: '12px', border: `1px solid ${THEME.border}`, marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 900, fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>التصنيف المهني</label>
                                <select value={logic.currentRecord.partner_type} onChange={(e) => logic.setCurrentRecord({...logic.currentRecord, partner_type: e.target.value})} style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: `1px solid ${THEME.border}`, fontWeight: 900, outline: 'none' }}>
                                    <option value="موظف">موظف (إداري/مهندس)</option>
                                    <option value="عامل يومية">عامل يومية (مياومة)</option>
                                    <option value="عامل">عامل شهري</option>
                                </select>
                            </div>
                            <ModalField label="المهنة المعتمدة" value={logic.currentRecord.job_role} onChange={(v:any) => logic.setCurrentRecord({...logic.currentRecord, job_role: v})} />
                            <ModalField label="رقم الهوية / الإقامة" type="number" value={logic.currentRecord.identity_number} onChange={(v:any) => logic.setCurrentRecord({...logic.currentRecord, identity_number: v})} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', background: 'white', padding: '20px', borderRadius: '12px', border: `1px solid ${THEME.border}`, marginBottom: '20px' }}>
                            <ModalField label="تاريخ انتهاء الإقامة" type="date" value={logic.currentRecord.iqama_expiry} onChange={(v:any) => logic.setCurrentRecord({...logic.currentRecord, iqama_expiry: v})} />
                            <ModalField label="الراتب الأساسي / فئة اليومية" type="number" value={logic.currentRecord.basic_salary} onChange={(v:any) => logic.setCurrentRecord({...logic.currentRecord, basic_salary: v})} />
                            <div>
                                <label style={{ display: 'block', fontWeight: 900, fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>حالة الكادر</label>
                                <select value={logic.currentRecord.status} onChange={(e) => logic.setCurrentRecord({...logic.currentRecord, status: e.target.value})} style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: `1px solid ${THEME.border}`, fontWeight: 900, outline: 'none', color: logic.currentRecord.status === 'نشط' ? THEME.success : THEME.ruby }}>
                                    <option value="نشط">نشط (على رأس العمل)</option>
                                    <option value="موقوف">موقوف / مجاز</option>
                                    <option value="خروج نهائي">خروج نهائي / إنهاء خدمات</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* 📌 التبويب الثاني: كشف الحساب والمستحقات */}
                {logic.activeTab === 'ledger' && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: `1px solid ${THEME.border}`, borderRight: `4px solid ${THEME.success}` }}>
                                <div style={{ fontSize: '12px', fontWeight: 900, color: '#64748b' }}>إجمالي المستحقات (له)</div>
                                <div style={{ fontSize: '24px', fontWeight: 900, color: THEME.success }}>{logic.employeeLedger.reduce((a,b)=>a+b.credit,0).toLocaleString()}</div>
                            </div>
                            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: `1px solid ${THEME.border}`, borderRight: `4px solid ${THEME.ruby}` }}>
                                <div style={{ fontSize: '12px', fontWeight: 900, color: '#64748b' }}>إجمالي السلف والخصومات (عليه)</div>
                                <div style={{ fontSize: '24px', fontWeight: 900, color: THEME.ruby }}>{logic.employeeLedger.reduce((a,b)=>a+b.debit,0).toLocaleString()}</div>
                            </div>
                            <div style={{ background: THEME.primary, color: 'white', padding: '20px', borderRadius: '12px', borderRight: `4px solid ${THEME.accent}` }}>
                                <div style={{ fontSize: '12px', fontWeight: 900, color: THEME.accent }}>الرصيد النهائي المستحق</div>
                                <div style={{ fontSize: '24px', fontWeight: 900 }}>{logic.employeeLedger.length > 0 ? logic.employeeLedger[logic.employeeLedger.length - 1].balance.toLocaleString() : '0'}</div>
                            </div>
                        </div>

                        <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${THEME.border}`, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                                <thead style={{ background: '#f8fafc', borderBottom: `2px solid ${THEME.border}` }}>
                                    <tr>
                                        <th style={{ padding: '15px', fontWeight: 900, color: '#475569', fontSize: '13px' }}>التاريخ</th>
                                        <th style={{ padding: '15px', fontWeight: 900, color: '#475569', fontSize: '13px', textAlign: 'right' }}>البيان / الحركة</th>
                                        <th style={{ padding: '15px', fontWeight: 900, color: '#475569', fontSize: '13px' }}>مستحق له</th>
                                        <th style={{ padding: '15px', fontWeight: 900, color: '#475569', fontSize: '13px' }}>سلفة / خصم</th>
                                        <th style={{ padding: '15px', fontWeight: 900, color: THEME.primary, fontSize: '13px' }}>الرصيد التراكمي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logic.employeeLedger.map((row, i) => (
                                        <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '15px', fontWeight: 700, fontSize: '13px' }}>{row.date}</td>
                                            <td style={{ padding: '15px', fontWeight: 900, textAlign: 'right', fontSize: '14px' }}>{row.description}</td>
                                            <td style={{ padding: '15px', fontWeight: 900, color: THEME.success }}>{row.credit > 0 ? row.credit.toLocaleString() : '-'}</td>
                                            <td style={{ padding: '15px', fontWeight: 900, color: THEME.ruby }}>{row.debit > 0 ? row.debit.toLocaleString() : '-'}</td>
                                            <td style={{ padding: '15px', fontWeight: 900, color: THEME.primary, fontSize: '15px', background: '#f8fafc' }}>{row.balance.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Footer */}
            <div style={{ background: 'white', padding: '20px 30px', borderTop: `1px solid ${THEME.border}`, display: 'flex', gap: '15px' }}>
               <button onClick={() => logic.setIsEditModalOpen(false)} style={{ flex: 1, padding: '15px', borderRadius: '10px', background: '#f1f5f9', color: THEME.primary, fontWeight: 900, border: 'none', cursor: 'pointer' }}>إغلاق</button>
               {logic.activeTab === 'info' && (
                   <button onClick={logic.handleSave} disabled={logic.isSaving} style={{ flex: 2, padding: '15px', borderRadius: '10px', background: THEME.primary, color: THEME.accent, fontWeight: 900, border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                       {logic.isSaving ? '⏳ جاري الحفظ...' : '✅ تحديث السجل الوظيفي'}
                   </button>
               )}
            </div>
          </div>
        </div>
      )}

      {/* منطقة المطبعة الكلاسيكية (A4) */}
      <div className="print-area" style={{ display: 'none' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `4px solid ${THEME.primary}`, paddingBottom: '15px', marginBottom: '20px' }}>
            <div>
               <h1 style={{ margin: 0, color: THEME.primary, fontSize: '26px' }}>كشف بيانات الموارد البشرية</h1>
               <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>شركة رواسي اليسر للمقاولات | HR Master Report</p>
            </div>
            <img src="/RYC_Logo.png" alt="Logo" style={{ height: '75px' }} />
         </div>
         <table className="print-table">
            <thead>
               <tr>
                  <th>م</th><th>الكود</th><th>الاسم الكامل</th><th>المهنة</th><th>الجنسية</th><th>رقم الهوية</th><th>انتهاء الإقامة</th><th>الراتب الأساسي</th><th>الحالة</th>
               </tr>
            </thead>
            <tbody>
               {logic.filteredRecords.map((r, i) => (
                  <tr key={r.id}>
                     <td>{i + 1}</td><td>{r.code}</td><td style={{ fontWeight: 'bold', textAlign: 'right' }}>{r.name}</td>
                     <td>{r.job_role}</td><td>{r.nationality}</td><td>{r.identity_number}</td>
                     <td style={{ color: getIqamaStatus(r.iqama_expiry).color === THEME.ruby ? 'red' : 'black' }}>{r.iqama_expiry || '---'}</td>
                     <td>{Number(r.basic_salary||0).toLocaleString()}</td>
                     <td style={{ fontWeight: 'bold' }}>{r.status || 'نشط'}</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );
}