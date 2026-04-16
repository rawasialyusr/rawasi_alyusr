"use client";
import React, { useState, useRef, useEffect } from 'react'; 
import { useInvoicesLogic } from './invoices_logic'; 
import { QRCodeSVG } from 'qrcode.react'; 

const THEME = {
  primary: '#0f172a', accent: '#ca8a04', success: '#059669', slate: '#f8fafc', text: '#111827', border: '#cbd5e1', ruby: '#991B1B', info: '#0284c7'
};

const TABLE_GRID_LAYOUT = "50px 100px 2.5fr 120px 120px 120px 100px 100px";

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
    {!hideLabel && <label style={{ display: 'block', fontWeight: 900, fontSize: '14px', color: THEME.primary, marginBottom: '8px' }}>{label}</label>}
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} readOnly={readOnly}
      style={{ width: '100%', height: '45px', padding: '0 12px', borderRadius: '10px', border: `2px solid ${THEME.border}`, fontWeight: 900, fontSize: '16px', outline: 'none', background: readOnly ? '#f1f5f9' : '#ffffff', color: '#000000' }} 
      onFocus={(e) => e.target.style.borderColor = THEME.accent} onBlur={(e) => e.target.style.borderColor = THEME.border} />
  </div>
);

// 🟢 مكون الإكمال التلقائي الذكي المأمن
const UniversalAutocomplete = ({ label, value, onChange, options, placeholder, strict = false, isTextArea = false, disabled = false, freeText = false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen && !freeText) {
      const selectedOption = (options || []).find((o: any) => String(o.id || o) === String(value));
      const labelToShow = typeof selectedOption === 'object' ? (selectedOption.display || selectedOption.item_name || selectedOption.Property || selectedOption.name) : selectedOption;
      setSearch(labelToShow || '');
    } else if (freeText && value) {
      setSearch(value);
    }
  }, [value, isOpen, options, freeText]);

  useEffect(() => { 
    const click = (e:any) => { if(ref.current && !ref.current.contains(e.target)) setIsOpen(false); }; 
    document.addEventListener('mousedown', click); 
    return () => document.removeEventListener('mousedown', click); 
  }, []);

  const normalizeText = (text: any) => String(text || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();

  const filtered = (options || []).filter((o:any) => {
    const textToSearch = typeof o === 'object' ? (o.display || o.item_name || o.Property || o.name || '') : o;
    return normalizeText(textToSearch).includes(normalizeText(search));
  }).slice(0, 15);

  const handleSelect = (opt: any) => {
     const actualValue = typeof opt === 'object' ? (opt.id || opt.display || opt) : opt;
     const displayLabel = typeof opt === 'object' ? (opt.display || opt.item_name || opt.Property || opt.name || opt) : opt;
     setSearch(displayLabel);
     onChange(actualValue); 
     setIsOpen(false);
     setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: any) => {
    if (!isOpen || filtered.length === 0) {
       if (e.key === 'ArrowDown') setIsOpen(true);
       return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev)); } 
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1)); } 
    else if (e.key === 'Enter' || e.key === 'Tab') { 
        if (highlightedIndex >= 0) { 
            e.preventDefault(); 
            handleSelect(filtered[highlightedIndex]); 
        } else if (freeText) {
            setIsOpen(false);
        }
    } 
    else if (e.key === 'Escape') { setIsOpen(false); }
  };

  const handleBlur = () => {
     if (strict && search) {
        const match = options.find((o:any) => {
            const lbl = typeof o === 'object' ? (o.display || o.item_name || o.Property || o.name) : o;
            return String(lbl) === search;
        });
        if (!match) { setSearch(''); onChange(''); }
     }
     setTimeout(() => { setIsOpen(false); }, 200); 
  };

  const InputElement = isTextArea ? 'textarea' : 'input';

  return (
    <div style={{ position: 'relative', marginBottom: '15px' }} ref={ref}>
      {label && <label className="label-royal" style={{display: 'block', fontWeight: 900, fontSize: '14px', color: THEME.primary, marginBottom: '6px'}}>{label}</label>}
      <div onClick={() => !disabled && setIsOpen(true)} style={{ minHeight: isTextArea ? '80px' : '45px', padding: isTextArea ? '10px 12px' : '0 12px', borderRadius: '10px', border: `2px solid ${THEME.border}`, background: disabled ? '#f1f5f9' : '#ffffff', display: 'flex', alignItems: isTextArea ? 'flex-start' : 'center', cursor: disabled ? 'not-allowed' : 'text', color: '#000000', fontWeight: 900, fontSize: '15px' }}>
        <InputElement 
          disabled={disabled}
          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', color: '#000000', fontWeight: 900, fontSize: '16px', resize: isTextArea ? 'vertical' : 'none', minHeight: isTextArea ? '70px' : 'auto' }}
          placeholder={placeholder}
          value={search}
          onChange={(e:any) => { setSearch(e.target.value); if(freeText) onChange(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur} 
          onKeyDown={handleKeyDown} 
        />
        {!isTextArea && <span style={{ fontSize: '10px', color: '#000000', cursor: 'pointer', paddingRight: '5px' }} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>▼</span>}
      </div>
      {isOpen && filtered.length > 0 && !disabled && (
         <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: '#ffffff', zIndex: 10000, border: `2px solid ${THEME.accent}`, borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', maxHeight: '200px', overflowY: 'auto', marginTop: '5px' }}>
          {filtered.map((o:any, i:number) => (
              <div key={i} onMouseDown={(e) => { e.preventDefault(); handleSelect(o); }} onMouseEnter={() => setHighlightedIndex(i)} 
                style={{ padding: '12px 15px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '15px', fontWeight: 900, color: '#000000', backgroundColor: highlightedIndex === i ? '#fef3c7' : 'transparent' }}>
                {typeof o === 'object' ? (o.display || o.item_name || o.Property || o.name) : o}
              </div>
          ))}
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

  if (logic.isLoading) return <div style={{padding:'100px', textAlign:'center', fontWeight:900, color: THEME.primary, fontSize: '20px'}}>⏳ جاري تحميل مركز المستخلصات...</div>;

  const projectOptions = logic.projects || [];
  const partnerOptions = logic.partners || [];
  const accountOptions = logic.accounts || [];
  const boqItemsList = logic.boqItems || [];
  const descriptionOptions = Array.from(new Set([...(logic.boqItems||[]).map((b:any)=>b.item_name), ...(logic.historicalDescriptions||[]).map((h:any)=>h.display)].filter(Boolean)));

  return (
    <div style={{ direction: 'rtl', backgroundColor: '#f1f5f9', display: 'flex', minHeight: '100vh', fontFamily: 'Cairo, sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        @media print { 
            @page { size: A4 portrait; margin: 10mm; }
            body { background: white; -webkit-print-color-adjust: exact; color: #000; }
            .no-print { display: none !important; } 
            .print-area { display: block !important; width: 100%; }
        }
        .main-content { flex: 1; padding: 40px; margin-right: 70px; transition: 0.4s; }
        .main-content.sidebar-open { margin-right: 280px; }
        .row-hover:hover { border-color: ${THEME.accent}; transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .control-btn { width: 100%; padding: 12px; border-radius: 10px; border: none; font-weight: 900; cursor: pointer; transition: 0.3s; margin-bottom: 8px; color: #fff; }
        .modal-input { width: 100%; padding: 12px; border-radius: 10px; border: 2px solid ${THEME.border}; margin-bottom: 15px; font-weight: 900; outline: none; transition: 0.3s; color: #000000; font-size: 16px; background-color: #ffffff; }
        .label-royal { display: block; font-weight: 900; font-size: 14px; color: ${THEME.primary}; margin-bottom: 8px; }
      `}</style>

      {/* السايد بار */}
      <aside className="no-print" onMouseEnter={() => setIsSidebarOpen(true)} onMouseLeave={() => setIsSidebarOpen(false)}
        style={{ width: isSidebarOpen ? '280px' : '70px', backgroundColor: THEME.primary, position: 'fixed', right: 0, height: '100vh', zIndex: 1001, borderLeft: `3px solid ${THEME.accent}`, transition: '0.4s', overflowY: 'auto' }}>
        
        <div style={{ padding: '25px 15px', width: '280px', opacity: isSidebarOpen ? 1 : 0, transition: '0.2s' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px', marginBottom: '20px', textAlign: 'center', border: `1px solid ${THEME.accent}` }}>
            <div style={{color: THEME.accent, fontSize: '12px', fontWeight: 900}}>إجمالي فواتير الفترة (الصافي)</div>
            <div style={{color: 'white', fontSize: '24px', fontWeight: 900}}>{logic.kpis.totalNet.toLocaleString()}</div>
          </div>

          <input style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', color: 'white', marginBottom: '20px', outline: 'none', fontWeight: 900 }} placeholder="🔍 بحث سريع..." value={logic.globalSearch} onChange={e => logic.setGlobalSearch(e.target.value)} />

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '15px', marginBottom: '20px' }}>
            <label style={{color: THEME.accent, fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '10px'}}>إجراءات مجمعة</label>
            <button onClick={logic.handleAddNew} className="control-btn" style={{ background: 'white', color: THEME.primary }}>➕ مستند مالي جديد</button>
            <button onClick={logic.handleEditSelected} disabled={logic.selectedIds.length !== 1} className="control-btn" style={{ background: THEME.accent, color: 'white', opacity: logic.selectedIds.length === 1 ? 1 : 0.3 }}>✏️ تعديل المختار</button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <button onClick={logic.handleDeleteSelected} disabled={logic.selectedIds.length === 0} className="control-btn" style={{ background: THEME.ruby, margin: 0, opacity: logic.selectedIds.length > 0 ? 1 : 0.3 }}>🗑️ حذف</button>
              <button onClick={logic.handlePostSelected} disabled={logic.selectedIds.length === 0} className="control-btn" style={{ background: THEME.success, margin: 0, opacity: logic.selectedIds.length > 0 ? 1 : 0.3 }}>🚀 ترحيل</button>
            </div>
            <button onClick={logic.handleUnpostSelected} disabled={logic.selectedIds.length === 0} className="control-btn" style={{ background: '#4b5563', opacity: logic.selectedIds.length > 0 ? 1 : 0.3, width: '100%' }}>↩️ فك ترحيل</button>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
             <label style={{color: THEME.accent, fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '10px'}}>عرض السجلات</label>
             <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', outline: 'none', fontWeight: 900, marginBottom: '15px', color: '#000' }} value={logic.rowsPerPage} onChange={e => { logic.setRowsPerPage(Number(e.target.value)); logic.setCurrentPage(1); }}>
               <option value="50">50 سجل</option><option value="100">100 سجل</option><option value="500">500 سجل</option>
             </select>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <button onClick={() => logic.setCurrentPage((p:number) => Math.max(1, p - 1))} style={{background: THEME.accent, color:'white', border:'none', padding:'5px 10px', borderRadius:'5px', fontWeight:900, cursor:'pointer'}}>السابق</button>
               <span style={{ color: 'white', fontWeight: 900, fontSize: '14px' }}>{logic.currentPage} / {logic.totalPages}</span>
               <button onClick={() => logic.setCurrentPage((p:number) => Math.min(logic.totalPages, p + 1))} style={{background: THEME.accent, color:'white', border:'none', padding:'5px 10px', borderRadius:'5px', fontWeight:900, cursor:'pointer'}}>التالي</button>
             </div>
          </div>
          <button onClick={logic.exportToExcel} className="control-btn" style={{ background: '#334155' }}>📊 تصدير Excel</button>
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '38px', fontWeight: 900, color: THEME.primary, margin: 0 }}>سجل المستخلصات والفواتير</h1>
            <p style={{ color: '#000', fontWeight: 900, margin: 0 }}>شركة رواسي اليسر للمقاولات</p>
          </div>
          <img src="/RYC_Logo.png" alt="Logo" style={{ height: '110px' }} />
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' }}>
            <div style={{ background: 'white', padding: '15px', borderRadius: '12px', borderRight: `5px solid ${THEME.primary}` }}>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#000' }}>إجمالي المستندات</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#000' }}>{logic.kpis.total}</div>
            </div>
            <div style={{ background: 'white', padding: '15px', borderRadius: '12px', borderRight: `5px solid ${THEME.success}` }}>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#000' }}>المرحلة</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: THEME.success }}>{logic.kpis.posted}</div>
            </div>
            <div style={{ background: 'white', padding: '15px', borderRadius: '12px', borderRight: `5px solid ${THEME.accent}` }}>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#000' }}>إجمالي الصافي (ريال)</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: THEME.accent }}>{logic.kpis.totalNet.toLocaleString()}</div>
            </div>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', background: 'white', padding: '10px', borderRadius: '12px' }}>
                <input type="date" value={logic.dateFrom} onChange={e=>logic.setDateFrom(e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', color: '#000', fontWeight: 900 }} />
                <input type="date" value={logic.dateTo} onChange={e=>logic.setDateTo(e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', color: '#000', fontWeight: 900 }} />
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: TABLE_GRID_LAYOUT, background: THEME.primary, color: 'white', padding: '15px', borderRadius: '12px', fontWeight: 900, fontSize: '14px', marginBottom: '15px', alignItems: 'center', textAlign: 'center' }}>
          <input type="checkbox" onChange={(e) => logic.setSelectedIds(e.target.checked ? (logic.paginatedInvoices||[]).map((r:any) => r.id) : [])} checked={logic.selectedIds.length > 0 && logic.selectedIds.length === logic.paginatedInvoices.length} />
          <div>التاريخ</div><div style={{textAlign:'right'}}>العميل / المشروع</div><div>رقم المستند</div><div>الإجمالي</div><div>الصافي</div><div>النوع</div><div>الإجراءات</div>
        </div>

        {(logic.paginatedInvoices || []).map((inv:any) => (
          <div key={inv.id} className="row-hover" style={{ display: 'grid', gridTemplateColumns: TABLE_GRID_LAYOUT, background: 'white', padding: '15px', borderRadius: '12px', marginBottom: '10px', alignItems: 'center', border: `1px solid ${THEME.border}`, transition: '0.2s', textAlign: 'center', backgroundColor: logic.selectedIds.includes(inv.id) ? '#fef3c7' : 'white' }}>
            <input type="checkbox" checked={logic.selectedIds.includes(inv.id)} onChange={() => { if (logic.selectedIds.includes(inv.id)) logic.setSelectedIds(logic.selectedIds.filter((i:any) => i !== inv.id)); else logic.setSelectedIds([...logic.selectedIds, inv.id]); }} />
            <div className="data-cell" style={{color: THEME.primary, fontWeight: 900}}>{inv.date}</div>
            <div className="data-cell" style={{textAlign:'right'}}>
               <div style={{fontSize: '15px', fontWeight: 900, color: '#000'}}>{inv.client_name}</div>
               <div style={{fontSize: '12px', color: THEME.accent, fontWeight: 900}}>{inv.property_name || 'بدون مشروع'}</div>
            </div>
            <div className="data-cell" style={{fontWeight: 900, color: '#000'}}>{inv.invoice_number}</div>
            <div className="data-cell" style={{fontWeight: 900, color: '#000'}}>{Number(inv.total_amount).toLocaleString()}</div>
            <div className="data-cell" style={{color: THEME.success, fontSize: '16px', fontWeight: 900}}>{Number(inv.net_amount).toLocaleString()}</div>
            <div>
               {inv.is_internal ? <span style={{ padding: '4px 12px', background: '#ffe4e6', color: THEME.ruby, borderRadius: '20px', fontSize: '12px', fontWeight: 900 }}>داخلية</span> : <span style={{ padding: '4px 12px', background: '#e0f2fe', color: '#0369a1', borderRadius: '20px', fontSize: '12px', fontWeight: 900 }}>ضريبية</span>}
            </div>
            <div style={{display:'flex', justifyContent: 'center', gap:'8px'}}>
               <button onClick={() => { setPRec(inv); setIsPrintOpen(true); }} style={{ background: '#f8fafc', border: `1px solid ${THEME.border}`, padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }} title="عرض وطباعة">🖨️</button>
               {inv.status !== 'مُعتمد' && <button onClick={() => logic.handlePostSingle(inv.id)} style={{ background: THEME.success, color: 'white', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 900, fontSize: '14px' }} title="ترحيل فوري">🚀</button>}
            </div>
          </div>
        ))}
      </main>

      {/* 📝 موديول الإضافة والتعديل */}
      {logic.isEditModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(8px)' }} onClick={() => logic.setIsEditModalOpen(false)}>
          <div style={{ background: '#ffffff', width: '1100px', padding: '35px', borderRadius: '24px', border: `4px solid ${THEME.accent}`, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `4px solid ${THEME.accent}`, paddingBottom: '15px', marginBottom: '25px' }}>
                <h2 style={{ fontWeight: 900, margin: 0, color: THEME.primary }}>📝 {logic.editingId ? 'تعديل المستند المالي' : 'إصدار مستند مالي جديد'}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff1f2', padding: '10px 15px', borderRadius: '10px', border: `2px dashed ${THEME.ruby}` }}>
                   <input type="checkbox" id="is_internal" checked={logic.currentRecord.is_internal || false} onChange={e => logic.setCurrentRecord({...logic.currentRecord, is_internal: e.target.checked})} style={{ width: '20px', height: '20px', accentColor: THEME.ruby, cursor: 'pointer' }} />
                   <label htmlFor="is_internal" style={{ fontWeight: 900, color: THEME.ruby, cursor: 'pointer', fontSize: '14px' }}>إلغاء ربط الزكاة (فاتورة داخلية)</label>
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
              <div><label className="label-royal">📅 التاريخ</label><input type="date" className="modal-input" style={{marginBottom: 0, color: '#000'}} value={logic.currentRecord.date} onChange={e=>logic.setCurrentRecord({...logic.currentRecord, date:e.target.value})} /></div>
              <div><label className="label-royal">🔢 رقم المستند (تلقائي)</label><input className="modal-input" style={{marginBottom: 0, background: '#f1f5f9', color: '#000'}} value={logic.currentRecord.invoice_number} readOnly /></div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
              <UniversalAutocomplete label="👤 العميل / المقاول" placeholder="اختر العميل..." value={logic.currentRecord.client_name} onChange={(val:string)=>logic.setCurrentRecord({...logic.currentRecord, client_name:val})} options={partnerOptions} strict={true} />
              <UniversalAutocomplete label="🏢 المشروع / العقار" placeholder="اختر العقار..." value={logic.currentRecord.project_id} onChange={(id:any)=>{
                  const p = logic.projects.find((x:any)=>String(x.id) === String(id));
                  logic.setCurrentRecord({...logic.currentRecord, project_id:id, property_name: p?.Property || ''});
              }} options={projectOptions} strict={true} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#f8fafc', padding: '20px', borderRadius: '15px', border: `2px solid ${THEME.border}`, marginBottom: '20px' }}>
               <UniversalAutocomplete label="🧾 حساب الإيراد (الدائن)" placeholder="ابحث في الحسابات..." value={logic.currentRecord.creditor_account_id} onChange={(val:string)=>{
                   logic.setCurrentRecord({...logic.currentRecord, creditor_account_id: val});
               }} options={accountOptions} strict={true} />
               
               <UniversalAutocomplete label="🏦 حساب العميل (المدين)" placeholder="ابحث في الحسابات..." value={logic.currentRecord.debtor_account_id} onChange={(val:string)=>{
                   logic.setCurrentRecord({...logic.currentRecord, debtor_account_id: val});
               }} options={accountOptions} strict={true} />
            </div>

            {/* جدول البنود - زيتونة الـ BOQ */}
            <div style={{ background: '#fff', border: `2px solid ${THEME.border}`, padding: '15px', borderRadius: '15px', marginBottom: '20px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 0.8fr 0.8fr 1fr 1fr 40px', gap: '10px', fontWeight: 900, marginBottom: '10px', fontSize: '14px', color: THEME.primary }}>
                  <div>بند المقايسة (BOQ)</div><div>البيان التفصيلي</div><div>الوحدة</div><div>الكمية</div><div>السعر</div><div>الإجمالي</div><div></div>
               </div>
               {(logic.currentRecord.lines || []).map((l:any, i:number) => (
                 <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 0.8fr 0.8fr 1fr 1fr 40px', gap: '10px', marginBottom: '10px', alignItems: 'start' }}>
                    <UniversalAutocomplete 
                        placeholder="بحث بكود أو اسم البند..." 
                        options={boqItemsList} 
                        value={l.item_id} 
                        onChange={(val: string) => logic.handleLineChange(i, 'item_id', val)} 
                        strict={true} 
                    />
                    <UniversalAutocomplete freeText={true} isTextArea={true} options={descriptionOptions} placeholder="وصف البند..." value={l.description || ''} onChange={(val:string)=>logic.handleLineChange(i, 'description', val)} />
                    <input className="modal-input" style={{marginBottom:0, padding:'10px', fontSize:'14px', color: '#000'}} value={l.unit || ''} onChange={(e)=>logic.handleLineChange(i, 'unit', e.target.value)} placeholder="الوحدة" />
                    <input type="number" className="modal-input" style={{marginBottom:0, padding:'10px', fontSize:'14px', color: '#000'}} value={l.quantity} onChange={(e)=>logic.handleLineChange(i, 'quantity', e.target.value)} placeholder="الكمية" />
                    <input type="number" className="modal-input" style={{marginBottom:0, padding:'10px', fontSize:'14px', color: '#000'}} value={l.unit_price} onChange={(e)=>logic.handleLineChange(i, 'unit_price', e.target.value)} placeholder="السعر" />
                    <div style={{ background: '#f8fafc', borderRadius: '10px', border: `2px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '15px', color: THEME.primary, height: '45px' }}>{Number(l.total_price||0).toLocaleString()}</div>
                    <button onClick={()=>logic.handleRemoveLine(i)} style={{ height: '45px', background: '#fee2e2', color: THEME.ruby, border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 900, fontSize: '18px' }}>✕</button>
                 </div>
               ))}
               <button onClick={logic.handleAddLine} style={{ padding: '12px 25px', background: THEME.primary, color: 'white', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '15px' }}>➕ إضافة بند جديد</button>
            </div>

            {/* الحسابات الختامية */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', backgroundColor: '#f1f5f9', padding: '20px', borderRadius: '15px', border: `2px solid ${THEME.border}`, marginBottom: '15px' }}>
               <div><label className="label-royal">إجمالي الأعمال</label><div className="modal-input" style={{marginBottom:0, background:'white', color: '#000'}}>{Number(logic.currentRecord.total_amount || 0).toLocaleString()}</div></div>
               <div><label className="label-royal">ضمان أعمال %</label><input type="number" className="modal-input" style={{marginBottom:0, color: '#000'}} value={logic.currentRecord.retention_percentage} onChange={(e)=>logic.setCurrentRecord({...logic.currentRecord, retention_percentage: e.target.value})} /></div>
               <div><label className="label-royal" style={{color: THEME.ruby}}>خصم خامات (-)</label><input type="number" className="modal-input" style={{marginBottom:0, color: THEME.ruby}} value={logic.currentRecord.material_discount} onChange={(e)=>logic.setCurrentRecord({...logic.currentRecord, material_discount: e.target.value})} /></div>
               <div><label className="label-royal">ضريبة 15%</label><div className="modal-input" style={{marginBottom:0, background:'white', color: '#000'}}>{Number(logic.currentRecord.tax_amount || 0).toLocaleString()}</div></div>
               <div style={{ textAlign: 'center' }}>
                  <label className="label-royal" style={{color: THEME.success}}>الصافي المستحق</label>
                  <div style={{ padding: '10px', background: 'white', borderRadius: '10px', border: `2px solid ${THEME.success}`, fontWeight: 900, color: THEME.success, fontSize: '20px' }}>{Number(logic.currentRecord.net_amount || 0).toLocaleString()}</div>
               </div>
            </div>

            {Number(logic.currentRecord.material_discount) > 0 && (
                <div style={{ background: '#fff1f2', padding: '15px', borderRadius: '15px', border: `2px dashed ${THEME.ruby}`, marginBottom: '20px' }}>
                   <UniversalAutocomplete label="🧾 حساب توجيه خصم خامات العميل (للقيد المحاسبي)" placeholder="ابحث في شجرة الحسابات..." value={logic.currentRecord.discount_account_id} onChange={(val:string)=>{
                       logic.setCurrentRecord({...logic.currentRecord, discount_account_id: val});
                   }} options={accountOptions} strict={true} />
                </div>
            )}

            <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
               <button onClick={logic.handleSaveInvoice} disabled={logic.isSaving} style={{ flex: 2, background: THEME.success, color: 'white', padding: '18px', borderRadius: '15px', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '18px', boxShadow: '0 10px 20px rgba(5, 150, 105, 0.2)' }}>
                  {logic.isSaving ? '⏳ جاري الحفظ...' : '✅ اعتماد وحفظ المستند'}
               </button>
               <button onClick={()=>logic.setIsEditModalOpen(false)} style={{ flex: 1, padding: '18px', background: '#f8fafc', border: `2px solid ${THEME.primary}`, borderRadius: '15px', fontWeight: 900, cursor: 'pointer', color: THEME.primary, fontSize: '16px' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* 🖨️ شاشة الطباعة */}
      {isPrintOpen && pRec && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.95)', zIndex: 6000, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', padding: '20px' }}>
          <div className="no-print" style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
             <button onClick={downloadPDF} style={{ padding: '12px 30px', background: THEME.ruby, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', fontSize: '16px' }}>📥 تحميل كـ PDF / طباعة</button>
             <button onClick={() => setIsPrintOpen(false)} style={{ padding: '12px 40px', background: '#334155', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', fontSize: '16px' }}>✕ إغلاق</button>
          </div>
          
          <div className="print-area modern-invoice" style={{ width: '210mm', minHeight: '297mm', background: 'white', padding: '15mm', position: 'relative', boxShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
             <div className="modern-header" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `3px solid ${THEME.primary}`, paddingBottom: '20px', marginBottom: '30px' }}>
                <div className="modern-company">
                    <img src="/RYC_Logo.png" alt="Logo" style={{ height: '90px', marginBottom: '10px' }} />
                    <h2 style={{ color: THEME.primary, fontWeight: 900, margin: '0 0 5px 0' }}>شركة رواسي اليسر للمقاولات</h2>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '14px', color: '#000' }}>المملكة العربية السعودية - الرياض</p>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '14px', color: '#000' }}>الرقم الضريبي: 312487477800003</p>
                </div>
                <div className="modern-title" style={{ textAlign: 'left' }}>
                    <h1 style={{ background: pRec.is_internal ? THEME.ruby : THEME.primary, margin: '0 0 10px 0', color: 'white', padding: '12px 60px', borderRadius: '50px', fontSize: '26px', border: `3px solid ${THEME.accent}`, display: 'inline-block' }}>{pRec.is_internal ? 'فاتورة داخلية' : 'فاتورة ضريبية'}</h1>
                    <p style={{ margin: '8px 0 15px 0', fontWeight: 900, color: '#111827', fontSize: '14px', textAlign: 'center' }}>{pRec.is_internal ? 'INTERNAL INVOICE' : 'TAX INVOICE'}</p>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#000' }}><strong>رقم الفاتورة:</strong> #{pRec.invoice_number}</p>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#000' }}><strong>تاريخ الإصدار:</strong> {pRec.date}</p>
                    <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end' }}><ZatcaQRCode record={pRec} /></div>
                </div>
             </div>

             <div className="modern-client" style={{ borderRight: `6px solid ${pRec.is_internal ? THEME.ruby : THEME.primary}`, marginBottom: '30px', background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <h3 style={{ color: THEME.primary, margin: '0 0 12px 0', fontSize: '18px', fontWeight: 900 }}>فاتورة إلى العميل:</h3>
                <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 900, color: '#000' }}><strong>الاسم:</strong> {pRec.client_name}</p>
                <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 900, color: '#000' }}><strong>المشروع:</strong> {pRec.property_name || '---'}</p>
                <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 900, color: '#000' }}><strong>الرقم الضريبي:</strong> {pRec.client_vat || '---'}</p>
             </div>

             <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', border: '1px solid #cbd5e1' }}>
                <thead>
                   <tr>
                      <th style={{ padding: '15px', textAlign: 'center', background: THEME.primary, color: 'white' }}>م</th>
                      <th style={{ padding: '15px', textAlign: 'right', background: THEME.primary, color: 'white' }}>البيان التفصيلي</th>
                      <th style={{ padding: '15px', textAlign: 'center', background: THEME.primary, color: 'white' }}>الكمية</th>
                      <th style={{ padding: '15px', textAlign: 'center', background: THEME.primary, color: 'white' }}>الوحدة</th>
                      <th style={{ padding: '15px', textAlign: 'center', background: THEME.primary, color: 'white' }}>السعر</th>
                      <th style={{ padding: '15px', textAlign: 'center', background: THEME.primary, color: 'white' }}>الإجمالي</th>
                   </tr>
                </thead>
                <tbody>
                   {(pRec.invoice_lines || pRec.lines || []).map((l:any, i:number) => (
                     <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                        <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #cbd5e1', fontWeight: 900, color: '#000' }}>{i+1}</td>
                        <td style={{ padding: '15px', textAlign: 'right', borderBottom: '1px solid #cbd5e1', fontWeight: 900, color: '#000', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{l.description}</td>
                        <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #cbd5e1', fontWeight: 900, color: '#000' }}>{l.quantity}</td>
                        <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #cbd5e1', fontWeight: 900, color: '#000' }}>{l.unit}</td>
                        <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #cbd5e1', fontWeight: 900, color: '#000' }}>{Number(l.unit_price || 0).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                        <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #cbd5e1', fontWeight: 900, color: '#000' }}>{Number(l.total_price || 0).toLocaleString()}</td>
                     </tr>
                   ))}
                </tbody>
             </table>

             <div className="modern-totals" style={{ width: '400px', marginRight: 'auto', marginLeft: 0, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px' }}>
                <table style={{ width: '100%' }}>
                   <tbody>
                      <tr><td style={{ padding: '10px 15px', fontWeight: 900, color: '#000' }}>إجمالي الأعمال:</td><td style={{ textAlign: 'left', padding: '10px 15px', fontWeight: 900 }}>{Number(pRec?.total_amount || 0).toLocaleString()} ريال</td></tr>
                      <tr><td style={{ padding: '10px 15px', fontWeight: 900, color: '#000' }}>ضمان أعمال ({pRec?.retention_percentage || 0}%):</td><td style={{ textAlign: 'left', padding: '10px 15px', fontWeight: 900 }}>- {Number(pRec?.retention_amount || 0).toLocaleString()} ريال</td></tr>
                      <tr><td style={{ padding: '10px 15px', fontWeight: 900, color: '#000' }}>الخصومات:</td><td style={{ textAlign: 'left', padding: '10px 15px', fontWeight: 900 }}>- {Number(pRec?.material_discount || 0).toLocaleString()} ريال</td></tr>
                      <tr><td style={{ padding: '10px 15px', fontWeight: 900, color: '#000' }}>ضريبة القيمة المضافة (15%):</td><td style={{ textAlign: 'left', padding: '10px 15px', fontWeight: 900 }}>{Number(pRec?.tax_amount || 0).toLocaleString()} ريال</td></tr>
                      <tr className="modern-grand-total" style={{ borderTop: `2px solid ${THEME.primary}`, background: '#e2e8f0' }}><td style={{ padding: '15px', fontWeight: 900, fontSize: '20px' }}>الصافي المستحق:</td><td style={{ textAlign: 'left', padding: '15px', fontSize: '22px', fontWeight: 900 }}>{Number(pRec?.net_amount || 0).toLocaleString(undefined, {minimumFractionDigits:2})} ريال</td></tr>
                   </tbody>
                </table>
             </div>

             <div style={{ marginTop: '25px', fontWeight: 900, fontSize: '16px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#000' }}>المبلغ بالحروف: فقط {tafqeet(Number(pRec?.net_amount || 0))}</div>

             <div className="modern-footer" style={{ marginTop: '40px', textAlign: 'center', borderTop: `2px solid ${THEME.primary}`, paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '40px', fontWeight: 900 }}><div>توقيع المحاسب / المدير المالي<br/><br/>.................................</div><div>الختم الرسمي للشركة<br/><br/>.................................</div></div>
                <p style={{ fontWeight: 900, fontSize: '14px' }}>{pRec.is_internal ? '⚠️ فاتورة داخلية' : '✅ فاتورة إلكترونية معتمدة'}</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}