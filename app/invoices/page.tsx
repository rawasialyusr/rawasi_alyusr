"use client";
import React, { useState, useRef, useEffect } from 'react'; 
import { useInvoicesLogic } from './invoices_logic'; 
import { QRCodeSVG } from 'qrcode.react'; 

const THEME = {
  primary: '#0f172a', accent: '#ca8a04', success: '#059669', slate: '#f8fafc', text: '#111827', border: '#cbd5e1', ruby: '#e11d48'
};

const TABLE_GRID_LAYOUT = "50px 100px 2fr 130px 120px 120px 100px 100px";

const tafqeet = (n: number) => {
  if (n === 0) return "صفر";
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const convert = (num: number): string => {
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " و " + ones[num % 10] : "");
    return num.toString();
  };
  return convert(Math.floor(n)) + " ريال سعودي لا غير";
};

const ZatcaQRCode = ({ record }: { record: any }) => {
  if (!record) return null;
  if (record.is_internal) {
     return (
        <div style={{ padding: '4px', border: `2px solid ${THEME.ruby}`, borderRadius: '8px', background: 'white', display: 'inline-block' }}>
           <QRCodeSVG value={`INTERNAL-INV-${record.invoice_number}`} size={90} level="H" imageSettings={{ src: "/RYC_Logo.png", height: 20, width: 20, excavate: true }} />
        </div>
     );
  }

  const timestamp = record.date ? `${record.date}T12:00:00Z` : new Date().toISOString().split('.')[0] + 'Z';
  const generateQR = (s:string, v:string, t:string, it:string, vt:string) => {
    const getB = (tag:number, val:string) => {
      const enc = new TextEncoder(); const b = Array.from(enc.encode(val));
      return [tag, b.length, ...b];
    };
    const tlvs = [...getB(1, s), ...getB(2, v), ...getB(3, t), ...getB(4, it), ...getB(5, vt)];
    return btoa(String.fromCharCode(...new Uint8Array(tlvs)));
  };
  return (
    <div style={{ padding: '4px', border: `2px solid ${THEME.primary}`, borderRadius: '8px', background: 'white', display: 'inline-block' }}>
      <QRCodeSVG value={generateQR("شركة رواسي اليسر", "312487477800003", timestamp, Number(record.net_amount||0).toFixed(2), Number(record.tax_amount||0).toFixed(2))} 
        size={90} level="H" imageSettings={{ src: "/RYC_Logo.png", height: 20, width: 20, excavate: true }} />
    </div>
  );
};

const ModalField = ({ label, value, onChange, type="text", readOnly=false, hideLabel=false }: any) => (
  <div style={{ marginBottom: hideLabel ? '0' : '15px' }}>
    {!hideLabel && <label style={{ display: 'block', fontWeight: 900, fontSize: '13px', color: THEME.primary, marginBottom: '6px' }}>{label}</label>}
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} readOnly={readOnly}
      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: `1px solid ${THEME.border}`, fontWeight: 900, fontSize: '15px', outline: 'none', background: readOnly ? '#f1f5f9' : 'white', color: THEME.text }} 
      onFocus={(e) => e.target.style.borderColor = THEME.accent} onBlur={(e) => e.target.style.borderColor = THEME.border} />
  </div>
);

const SmartSelect = ({ options, value, displayKey='name', onChange, label, hideLabel=false, placeholder="اختر..." }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => { 
    const click = (e:any) => { if(ref.current && !ref.current.contains(e.target)) setIsOpen(false); }; 
    document.addEventListener('mousedown', click); 
    return () => document.removeEventListener('mousedown', click); 
  }, []);

  const normalizeText = (text: string) => text.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
  
  const filtered = options.filter((o:any) => {
    const val = normalizeText(o[displayKey] || '');
    const q = normalizeText(search);
    return val.includes(q);
  });

  const display = options.find((o:any) => o.id === value || o[displayKey] === value)?.[displayKey] || placeholder;

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      {!hideLabel && <label style={{ display: 'block', fontWeight: 900, fontSize: '13px', color: THEME.primary, marginBottom: '6px' }}>{label}</label>}
      <div onClick={() => setIsOpen(!isOpen)} style={{ minHeight: '42px', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${THEME.border}`, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 900, fontSize: '14px', color: THEME.text }}>
        <span style={{ flex: 1, whiteSpace: 'normal', wordBreak: 'break-word', textAlign: 'right' }}>{display}</span>
        <span style={{ fontSize: '10px', color: '#94a3b8', paddingLeft: '5px' }}>▼</span>
      </div>
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: 'white', zIndex: 10000, border: `2px solid ${THEME.accent}`, borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', marginTop: '5px' }}>
          <div style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '8px 8px 0 0' }}>
            <input autoFocus placeholder="🔍 بحث ذكي سريع..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px', border: `1px solid ${THEME.border}`, borderRadius: '6px', outline: 'none', fontWeight: 900, color: THEME.text, fontSize: '13px' }} onFocus={(e) => e.target.style.borderColor = THEME.accent} onBlur={(e) => e.target.style.borderColor = THEME.border} />
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="custom-scrollbar">
            {filtered.length === 0 ? (
                <div style={{ padding: '15px', textAlign: 'center', color: '#94a3b8', fontWeight: 700, fontSize: '13px' }}>لا توجد نتائج مطابقة...</div>
            ) : (
                filtered.map((o:any) => (
                  <div key={o.id} onClick={() => { onChange(o); setIsOpen(false); setSearch(''); }} className="select-item-hover" style={{ padding: '12px 15px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '14px', fontWeight: 900, color: THEME.primary, transition: '0.2s', whiteSpace: 'normal' }}>
                    {o[displayKey]}
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function InvoicesPage() {
  const logic = useInvoicesLogic();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [pRec, setPRec] = useState<any>(null);

  const downloadPDF = () => { window.print(); };

  if (logic.isLoading) return <div style={{padding:'100px', textAlign:'center', fontWeight:900, color: THEME.primary, fontSize: '20px'}}>⏳ جاري تحميل الفواتير...</div>;

  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', background: '#f1f5f9', display: 'flex', fontFamily: 'Cairo, sans-serif' }}>
      <style>{`
        @media print { 
            @page { size: A4 portrait; margin: 10mm; }
            body { background: white; -webkit-print-color-adjust: exact; color: #000; }
            .no-print { display: none !important; } 
            .print-area { display: block !important; width: 100%; }
        }
        .row-hover:hover { border-color: ${THEME.accent}; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
        .kpi-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid ${THEME.border}; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .sidebar-input { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 10px; border-radius: 8px; width: 100%; outline: none; font-weight: bold; }
        .sidebar-input::placeholder { color: rgba(255,255,255,0.6); }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .select-item-hover:hover { background-color: #fef3c7; color: ${THEME.accent} !important; }
        .modern-invoice { font-family: 'Cairo', sans-serif; color: #000; }
        .modern-header { display: flex; justify-content: space-between; border-bottom: 3px solid ${THEME.primary}; padding-bottom: 20px; margin-bottom: 30px; }
        .modern-company h2 { margin: 0 0 5px 0; color: ${THEME.primary}; font-weight: 900; }
        .modern-company p { margin: 0; color: #111827; font-size: 14px; font-weight: 800; }
        .modern-title h1 { margin: 0 0 10px 0; font-size: 28px; font-weight: 900; }
        .modern-client { margin-bottom: 30px; background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; }
        .modern-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #cbd5e1; }
        .modern-table th, .modern-table td { padding: 15px; text-align: right; border-bottom: 1px solid #cbd5e1; font-weight: 800; color: #000; }
        .modern-table th { background-color: ${THEME.primary}; color: white; font-weight: 900; font-size: 15px; }
        .modern-table tbody tr:nth-child(even) { background-color: #f8fafc; }
        .modern-totals { width: 400px; margin-right: auto; margin-left: 0; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; }
        .modern-totals table th, .modern-totals table td { border-bottom: none; padding: 10px 15px; font-weight: 900; color: #000; font-size: 15px;}
        .modern-grand-total { border-top: 2px solid ${THEME.primary}; font-weight: 900; font-size: 20px; color: ${THEME.primary}; background: #e2e8f0; }
        .modern-footer { margin-top: 40px; text-align: center; font-size: 14px; color: #111827; border-top: 2px solid ${THEME.primary}; padding-top: 20px; font-weight: 800; }
      `}</style>

      {/* سايد بار العمليات */}
      <aside className="no-print" onMouseEnter={() => setIsSidebarOpen(true)} onMouseLeave={() => setIsSidebarOpen(false)} style={{ width: isSidebarOpen ? '280px' : '70px', background: THEME.primary, color: 'white', transition: '0.4s', position: 'fixed', right: 0, height: '100vh', zIndex: 1001, borderLeft: `3px solid ${THEME.accent}`, overflow: 'hidden' }}>
          <div style={{ padding: '25px 15px', opacity: isSidebarOpen ? 1 : 0, transition: '0.2s', width: '280px' }}>
             <h3 style={{ color: THEME.accent, fontWeight: 900, marginBottom: '20px', borderBottom: `1px solid rgba(255,255,255,0.1)`, paddingBottom: '10px' }}>مركز العمليات</h3>
             <button onClick={logic.handleAddNew} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'white', color: THEME.primary, fontWeight: 900, border: 'none', cursor: 'pointer', marginBottom: '20px', fontSize: '15px' }}>➕ مستند مالي جديد</button>
             <div style={{ marginBottom: '20px' }}>
               <input placeholder="🔍 بحث برقم المستند، العميل..." value={logic.globalSearch} onChange={e => logic.setGlobalSearch(e.target.value)} className="sidebar-input" />
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                <label style={{color: THEME.accent, fontSize: '12px', fontWeight: 900, marginBottom: '5px'}}>إجراءات المستندات المحددة</label>
                <button onClick={logic.handleEditSelected} disabled={logic.selectedIds.length!==1} style={{ padding: '10px', borderRadius: '8px', background: THEME.accent, color: 'white', border: 'none', cursor: logic.selectedIds.length===1?'pointer':'not-allowed', fontWeight: 900, opacity: logic.selectedIds.length===1?1:0.3 }}>✏️ تعديل المستند</button>
                <button onClick={logic.handlePostSelected} disabled={logic.selectedIds.length===0} style={{ padding: '10px', borderRadius: '8px', background: THEME.success, color: 'white', border: 'none', cursor: logic.selectedIds.length>0?'pointer':'not-allowed', fontWeight: 900, opacity: logic.selectedIds.length>0?1:0.3 }}>🚀 اعتماد وترحيل</button>
                <button onClick={logic.handleDeleteSelected} disabled={logic.selectedIds.length===0} style={{ padding: '10px', borderRadius: '8px', background: THEME.ruby, color: 'white', border: 'none', cursor: logic.selectedIds.length>0?'pointer':'not-allowed', fontWeight: 900, opacity: logic.selectedIds.length>0?1:0.3 }}>🗑️ حذف المختار</button>
                <button onClick={logic.handleUnpostSelected} disabled={logic.selectedIds.length===0} style={{ padding: '10px', borderRadius: '8px', background: '#4b5563', color: 'white', border: 'none', cursor: logic.selectedIds.length>0?'pointer':'not-allowed', fontWeight: 900, opacity: logic.selectedIds.length>0?1:0.3 }}>↩️ فك ترحيل</button>
             </div>
             <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px' }}>
                <label style={{color: THEME.accent, fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '10px'}}>عرض السجلات</label>
                <select className="sidebar-input" style={{marginBottom: '15px', padding: '8px'}} value={logic.rowsPerPage} onChange={e => { logic.setRowsPerPage(Number(e.target.value)); logic.setCurrentPage(1); }}>
                  <option value="50" style={{color: 'black'}}>50 سجل</option>
                  <option value="100" style={{color: 'black'}}>100 سجل</option>
                  <option value="500" style={{color: 'black'}}>500 سجل</option>
                </select>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={() => logic.setCurrentPage(p => Math.max(1, p - 1))} disabled={logic.currentPage === 1} style={{background: THEME.accent, color:'white', border:'none', padding:'5px 10px', borderRadius:'5px', cursor: logic.currentPage===1?'not-allowed':'pointer', opacity: logic.currentPage===1?0.5:1, fontWeight: 900}}>السابق</button>
                  <span style={{ color: 'white', fontWeight: 900, fontSize: '14px' }}>{logic.currentPage} / {logic.totalPages}</span>
                  <button onClick={() => logic.setCurrentPage(p => Math.min(logic.totalPages, p + 1))} disabled={logic.currentPage === logic.totalPages} style={{background: THEME.accent, color:'white', border:'none', padding:'5px 10px', borderRadius:'5px', cursor: logic.currentPage===logic.totalPages?'not-allowed':'pointer', opacity: logic.currentPage===logic.totalPages?0.5:1, fontWeight: 900}}>التالي</button>
                </div>
             </div>
          </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="no-print" style={{ flex: 1, padding: '40px', marginRight: isSidebarOpen ? '280px' : '70px', transition: '0.4s' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 900, color: THEME.primary, margin: 0 }}>الفواتير والمستخلصات</h1>
            <p style={{ color: THEME.text, fontWeight: 900, margin: 0 }}>المركز المالي لشركة رواسي اليسر</p>
          </div>
          <img src="/RYC_Logo.png" alt="Logo" style={{ height: '70px' }} />
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <div className="kpi-card" style={{ borderBottom: `4px solid ${THEME.primary}` }}>
                <div style={{ fontSize: '14px', color: THEME.text, fontWeight: 900 }}>إجمالي المستندات</div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: THEME.primary }}>{logic.kpis.total}</div>
            </div>
            <div className="kpi-card" style={{ borderBottom: `4px solid ${THEME.success}` }}>
                <div style={{ fontSize: '14px', color: THEME.text, fontWeight: 900 }}>مستندات مرحلة ومعتمدة</div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: THEME.success }}>{logic.kpis.posted}</div>
                <div style={{ fontSize: '14px', color: THEME.success, fontWeight: 900, marginTop: '5px' }}>إجمالي: {logic.kpis.totalNet.toLocaleString()} ريال</div>
            </div>
            <div className="kpi-card" style={{ borderBottom: `4px solid ${logic.kpis.pending > 0 ? THEME.ruby : THEME.accent}` }}>
                <div style={{ fontSize: '14px', color: THEME.text, fontWeight: 900 }}>مستندات معلقة (غير مرحلة)</div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: logic.kpis.pending > 0 ? THEME.ruby : THEME.accent }}>{logic.kpis.pending}</div>
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: TABLE_GRID_LAYOUT, background: THEME.primary, color: 'white', padding: '15px', borderRadius: '12px', fontWeight: 900, fontSize: '14px', marginBottom: '15px', alignItems: 'center', textAlign: 'center' }}>
          <input type="checkbox" onChange={() => { if (logic.selectedIds.length === logic.paginatedInvoices.length) logic.setSelectedIds([]); else logic.setSelectedIds(logic.paginatedInvoices.map(r => r.id)); }} checked={logic.selectedIds.length > 0 && logic.selectedIds.length === logic.paginatedInvoices.length} />
          <div>التاريخ</div><div style={{textAlign:'right'}}>العميل / المشروع</div><div>رقم المستند</div><div>الإجمالي</div><div>الصافي</div><div>النوع</div><div>الإجراءات</div>
        </div>

        {logic.paginatedInvoices.map(inv => (
          <div key={inv.id} className="row-hover" style={{ display: 'grid', gridTemplateColumns: TABLE_GRID_LAYOUT, background: 'white', padding: '15px', borderRadius: '12px', marginBottom: '10px', alignItems: 'center', border: `1px solid ${THEME.border}`, transition: '0.2s', textAlign: 'center', backgroundColor: logic.selectedIds.includes(inv.id) ? '#fef3c7' : 'white' }}>
            <input type="checkbox" checked={logic.selectedIds.includes(inv.id)} onChange={() => logic.setSelectedIds(p => p.includes(inv.id)?p.filter(x=>x!==inv.id):[...p, inv.id])} />
            <div style={{fontWeight:900, color: THEME.primary, fontSize: '15px'}}>{inv.date}</div>
            <div style={{textAlign:'right', paddingRight:'5px'}}>
               <div style={{fontWeight:900, color: THEME.primary, fontSize: '16px'}}>{inv.client_name}</div>
               <div style={{fontSize: '13px', color: THEME.accent, fontWeight: 900}}>{inv.property_name || 'بدون مشروع'}</div>
            </div>
            <div style={{fontWeight:900, color: THEME.primary, fontSize: '15px'}}>{inv.invoice_number}</div>
            <div style={{fontWeight:900, color: THEME.primary, fontSize: '15px'}}>{Number(inv.total_amount).toLocaleString()}</div>
            <div style={{color: THEME.success, fontWeight: 900, fontSize: '17px'}}>{Number(inv.net_amount).toLocaleString()}</div>
            <div>{inv.is_internal ? <span style={{ padding: '6px 12px', background: '#ffe4e6', color: THEME.ruby, borderRadius: '8px', fontSize: '12px', fontWeight: 900 }}>داخلية</span> : <span style={{ padding: '6px 12px', background: '#e0f2fe', color: '#0369a1', borderRadius: '8px', fontSize: '12px', fontWeight: 900 }}>ضريبية</span>}</div>
            <div style={{display:'flex', justifyContent: 'center', gap:'8px'}}>
               <button onClick={() => { setPRec(inv); setIsPrintOpen(true); }} style={{ background: '#f8fafc', border: `2px solid ${THEME.primary}`, padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }} title="عرض وطباعة">🖨️</button>
               {inv.status !== 'مُعتمد' && <button onClick={() => logic.handlePostSingle(inv.id)} style={{ background: THEME.success, color: 'white', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 900, fontSize: '16px' }} title="ترحيل فوري">🚀</button>}
            </div>
          </div>
        ))}
      </main>

      {/* مودال الإضافة والتعديل */}
      {logic.isEditModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', zIndex: 5000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: 'white', width: '1150px', padding: '35px', borderRadius: '24px', maxHeight: '90vh', overflowY: 'auto', border: `4px solid ${THEME.accent}`, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `3px solid ${THEME.primary}`, paddingBottom: '15px', marginBottom: '25px' }}>
                <h2 style={{ fontWeight: 900, margin: 0, color: THEME.primary }}>{logic.editingId ? '✏️ تحديث المستند المالي' : '➕ إصدار مستند مالي جديد'}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff1f2', padding: '10px 15px', borderRadius: '10px', border: `2px solid ${THEME.ruby}` }}>
                   <input type="checkbox" id="is_internal" checked={logic.currentRecord.is_internal || false} onChange={e => logic.setCurrentRecord({...logic.currentRecord, is_internal: e.target.checked})} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                   <label htmlFor="is_internal" style={{ fontWeight: 900, color: THEME.ruby, cursor: 'pointer', fontSize: '14px' }}>إلغاء ربط الزكاة (فاتورة داخلية)</label>
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
              <ModalField label="التاريخ" type="date" value={logic.currentRecord.date} onChange={(v:any)=>logic.setCurrentRecord({...logic.currentRecord, date:v})} />
              <ModalField label="رقم المستند" value={logic.currentRecord.invoice_number} onChange={(v:any)=>logic.setCurrentRecord({...logic.currentRecord, invoice_number:v})} />
              <SmartSelect label="العميل / المقاول" options={logic.partners} value={logic.currentRecord.client_name} onChange={(o:any)=>logic.setCurrentRecord({...logic.currentRecord, client_name:o.name})} />
              <SmartSelect label="المشروع / العقار" options={logic.projects} value={logic.currentRecord.project_id} onChange={(o:any)=>logic.setCurrentRecord({...logic.currentRecord, project_id:o.id, property_name:o.Property})} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
              <SmartSelect label="حساب الدائن (إلى)" options={logic.accounts} value={logic.currentRecord.creditor_account_id} onChange={(o:any)=>logic.setCurrentRecord({...logic.currentRecord, creditor_account_id:o.id})} />
              <SmartSelect label="حساب المدين (من)" options={logic.accounts} value={logic.currentRecord.debtor_account_id} onChange={(o:any)=>logic.setCurrentRecord({...logic.currentRecord, debtor_account_id:o.id})} />
            </div>

            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: `2px solid ${THEME.border}`, marginBottom: '20px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr 1.2fr 50px', gap: '15px', fontWeight: 900, marginBottom: '10px', fontSize: '14px', color: THEME.primary }}>
                  <div>اختر البند</div><div>البيان التفصيلي</div><div>الوحدة</div><div>الكمية</div><div>السعر</div><div>الإجمالي</div><div></div>
               </div>
               {logic.currentRecord.lines.map((l:any, i:number) => (
                 <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr 1.2fr 50px', gap: '15px', marginBottom: '10px', alignItems: 'start' }}>
                    <SmartSelect hideLabel options={logic.items} value={l.item_id} onChange={(o:any)=>logic.handleLineChange(i, 'item_id', o.id)} placeholder="ابحث عن البند..." />
                    <textarea value={l.description || ''} onChange={(e)=>logic.handleLineChange(i, 'description', e.target.value)} placeholder="وصف البند..." style={{ width: '100%', minHeight: '42px', padding: '10px', borderRadius: '8px', border: `1px solid ${THEME.border}`, fontWeight: 900, fontSize: '14px', outline: 'none', resize: 'vertical', color: THEME.text, fontFamily: 'inherit' }} />
                    <input value={l.unit || ''} onChange={(e)=>logic.handleLineChange(i, 'unit', e.target.value)} placeholder="الوحدة" style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: `1px solid ${THEME.border}`, fontWeight: 900, fontSize: '14px', outline: 'none', color: THEME.text }} />
                    <input type="number" value={l.quantity} onChange={(e)=>logic.handleLineChange(i, 'quantity', e.target.value)} placeholder="الكمية" style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: `1px solid ${THEME.border}`, fontWeight: 900, fontSize: '14px', outline: 'none', color: THEME.text }} />
                    <input type="number" value={l.unit_price} onChange={(e)=>logic.handleLineChange(i, 'unit_price', e.target.value)} placeholder="السعر" style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: `1px solid ${THEME.border}`, fontWeight: 900, fontSize: '14px', outline: 'none', color: THEME.text }} />
                    <div style={{ background: 'white', borderRadius: '8px', border: `2px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '16px', color: THEME.primary, height: '42px' }}>{Number(l.total_price||0).toLocaleString()}</div>
                    <button onClick={()=>logic.handleRemoveLine(i)} style={{ height: '42px', background: '#fee2e2', color: THEME.ruby, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 900, fontSize: '18px' }}>✕</button>
                 </div>
               ))}
               <button onClick={logic.handleAddLine} style={{ marginTop: '10px', padding: '12px 30px', borderRadius: '10px', background: THEME.primary, color: 'white', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '15px' }}>➕ إضافة سطر جديد</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '15px', alignItems: 'end' }}>
               <ModalField label="إجمالي الأعمال" value={Number(logic.currentRecord.total_amount).toLocaleString()} readOnly />
               <ModalField label="ضمان أعمال (%)" type="number" value={logic.currentRecord.retention_percentage} onChange={(v:any)=>logic.setCurrentRecord({...logic.currentRecord, retention_percentage:v})} />
               <ModalField label="مبلغ الضمان" value={Number(logic.currentRecord.retention_amount).toLocaleString()} readOnly />
               <ModalField label="خصومات مواد" type="number" value={logic.currentRecord.material_discount} onChange={(v:any)=>logic.setCurrentRecord({...logic.currentRecord, material_discount:v})} />
               <ModalField label="الضريبة (15%)" value={Number(logic.currentRecord.tax_amount).toLocaleString()} readOnly />
               <div style={{ background: THEME.primary, padding: '10px', borderRadius: '12px', color: 'white', textAlign: 'center', border: `1px solid ${THEME.accent}` }}>
                  <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 900, color: THEME.accent }}>الصافي المستحق</div>
                  <div style={{ fontSize: '18px', fontWeight: 900 }}>{Number(logic.currentRecord.net_amount).toLocaleString()}</div>
               </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
               <button onClick={()=>logic.setIsEditModalOpen(false)} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: `2px solid ${THEME.primary}`, background: 'white', color: THEME.primary, fontWeight: 900, cursor: 'pointer', fontSize: '16px' }}>إغلاق وتجاهل</button>
               <button onClick={logic.handleSaveInvoice} disabled={logic.isSaving} style={{ flex: 2, padding: '15px', borderRadius: '12px', background: THEME.success, color: 'white', fontWeight: 900, border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', fontSize: '16px' }}>{logic.isSaving ? '⏳ جاري الحفظ...' : '✅ حفظ المستند المالي'}</button>
            </div>
          </div>
        </div>
      )}

      {/* شاشة الطباعة */}
      {isPrintOpen && pRec && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.95)', zIndex: 6000, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', padding: '20px' }}>
          <div className="no-print" style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
             <button onClick={downloadPDF} style={{ padding: '12px 30px', background: THEME.ruby, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', fontSize: '16px', boxShadow: '0 4px 10px rgba(225,29,72,0.4)' }}>📥 تحميل كـ PDF / طباعة</button>
             <button onClick={() => setIsPrintOpen(false)} style={{ padding: '12px 40px', background: '#334155', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', fontSize: '16px' }}>✕ إغلاق</button>
          </div>
          
          <div className="print-area modern-invoice" style={{ width: '210mm', minHeight: '297mm', background: 'white', padding: '15mm', position: 'relative', boxShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
             <div className="modern-header">
                <div className="modern-company">
                    <img src="/RYC_Logo.png" alt="Logo" style={{ height: '90px', marginBottom: '10px' }} />
                    <h2>شركة رواسي اليسر للمقاولات</h2>
                    <p>المملكة العربية السعودية - الرياض</p>
                    <p>الرقم الضريبي: 312487477800003</p>
                </div>
                <div className="modern-title" style={{ textAlign: 'left' }}>
                    <h1 style={{ background: pRec.is_internal ? THEME.ruby : THEME.primary, color: 'white', padding: '12px 60px', borderRadius: '50px', fontSize: '26px', border: `3px solid ${THEME.accent}`, display: 'inline-block' }}>{pRec.is_internal ? 'فاتورة داخلية' : 'فاتورة ضريبية'}</h1>
                    <p style={{ margin: '8px 0 15px 0', fontWeight: 900, color: '#111827', fontSize: '14px', textAlign: 'center' }}>{pRec.is_internal ? 'INTERNAL INVOICE' : 'TAX INVOICE'}</p>
                    <p style={{ fontSize: '16px', fontWeight: 900 }}><strong>رقم الفاتورة:</strong> #{pRec.invoice_number}</p>
                    <p style={{ fontSize: '16px', fontWeight: 900 }}><strong>تاريخ الإصدار:</strong> {pRec.date}</p>
                    <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end' }}><ZatcaQRCode record={pRec} /></div>
                </div>
             </div>

             <div className="modern-client" style={{ borderRight: `6px solid ${pRec.is_internal ? THEME.ruby : THEME.primary}` }}>
                <h3 style={{ color: THEME.primary, margin: '0 0 12px 0', fontSize: '18px', fontWeight: 900 }}>فاتورة إلى العميل:</h3>
                <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 900 }}><strong>الاسم:</strong> {pRec.client_name}</p>
                <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 900 }}><strong>المشروع:</strong> {pRec.property_name || '---'}</p>
                <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 900 }}><strong>الرقم الضريبي:</strong> {pRec.client_vat || '---'}</p>
             </div>

             <table className="modern-table">
                <thead>
                   <tr>
                      <th style={{textAlign: 'center', width: '50px'}}>م</th>
                      <th style={{textAlign: 'right'}}>البيان التفصيلي</th>
                      <th style={{textAlign: 'center', width: '100px'}}>الكمية</th>
                      <th style={{textAlign: 'center', width: '100px'}}>الوحدة</th>
                      <th style={{textAlign: 'center', width: '120px'}}>السعر</th>
                      <th style={{textAlign: 'center', width: '150px'}}>الإجمالي</th>
                   </tr>
                </thead>
                <tbody>
                   {(pRec.invoice_lines || pRec.lines || []).map((l:any, i:number) => (
                     <tr key={i}>
                        <td style={{textAlign: 'center', fontWeight: 900}}>{i+1}</td>
                        <td style={{fontWeight: 900, whiteSpace: 'pre-wrap', lineHeight: '1.6'}}>{l.description}</td>
                        <td style={{textAlign: 'center', fontWeight: 900}}>{l.quantity}</td>
                        <td style={{textAlign: 'center', fontWeight: 900}}>{l.unit}</td>
                        <td style={{textAlign: 'center', fontWeight: 900}}>{Number(l.unit_price || 0).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                        <td style={{textAlign: 'center', fontWeight: 900, color: THEME.primary}}>{Number(l.total_price || 0).toLocaleString()}</td>
                     </tr>
                   ))}
                </tbody>
             </table>

             <div className="modern-totals">
                <table style={{ width: '100%' }}>
                   <tbody>
                      <tr>
                         <td>إجمالي الأعمال:</td>
                         <td style={{textAlign: 'left'}}>{Number(pRec?.total_amount || 0).toLocaleString()} ريال</td>
                      </tr>
                      <tr>
                         <td>ضمان أعمال ({pRec?.retention_percentage || 0}%):</td>
                         <td style={{textAlign: 'left'}}>- {Number(pRec?.retention_amount || 0).toLocaleString()} ريال</td>
                      </tr>
                      <tr>
                         <td>الخصومات:</td>
                         <td style={{textAlign: 'left'}}>- {Number(pRec?.material_discount || 0).toLocaleString()} ريال</td>
                      </tr>
                      <tr>
                         <td>ضريبة القيمة المضافة (15%):</td>
                         <td style={{textAlign: 'left'}}>{Number(pRec?.tax_amount || 0).toLocaleString()} ريال</td>
                      </tr>
                      <tr className="modern-grand-total">
                         <td style={{ padding: '15px' }}>الصافي المستحق للدفع:</td>
                         <td style={{textAlign: 'left', padding: '15px', fontSize: '22px'}}>{Number(pRec?.net_amount || 0).toLocaleString(undefined, {minimumFractionDigits:2})} ريال</td>
                      </tr>
                   </tbody>
                </table>
             </div>

             <div style={{ marginTop: '25px', fontWeight: 900, fontSize: '16px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                المبلغ بالحروف: فقط {tafqeet(Number(pRec?.net_amount || 0))}
             </div>

             <div className="modern-footer">
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '40px', fontWeight: 900 }}>
                    <div>توقيع المحاسب / المدير المالي<br/><br/>.................................</div>
                    <div>الختم الرسمي للشركة<br/><br/>.................................</div>
                </div>
                <p style={{ margin: 0, color: pRec.is_internal ? THEME.ruby : '#111827', fontWeight: 900, fontSize: '14px' }}>
                   {pRec.is_internal ? '⚠️ فاتورة داخلية وغير مرتبطة بهيئة الزكاة' : '✅ تم إصدار هذه الفاتورة إلكترونياً وهي مطابقة لمواصفات الزكاة والضريبة'}
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}