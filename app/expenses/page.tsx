"use client";
import React, { useState, useRef, useEffect } from 'react'; 
import { useExpensesLogic } from './expenses_logic';

// 🎨 التنسيق اللوني الموحد
const THEME = {
  primary: '#0f172a',    
  accent: '#ca8a04',     
  success: '#059669',    
  slate: '#f8fafc',      
  text: '#000000',       
  border: '#cbd5e1',     
  ruby: '#991B1B',
  info: '#0284c7',   
  warning: '#f59e0b',
  purple: '#8b5cf6' 
};

// 🟢 مكون الإكمال التلقائي الذكي الشامل
const UniversalAutocomplete = ({ label, value, onChange, options, placeholder, strict = false, isTextArea = false, disabled = false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearch(value || ''); }, [value]);

  useEffect(() => { 
    const click = (e:any) => { if(ref.current && !ref.current.contains(e.target)) setIsOpen(false); }; 
    document.addEventListener('mousedown', click); 
    return () => document.removeEventListener('mousedown', click); 
  }, []);

  const normalizeText = (text: string) => text?.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim() || '';
  const filtered = options.filter((o:string) => normalizeText(o).includes(normalizeText(search)) && o !== search).slice(0, 15); 

  useEffect(() => { setHighlightedIndex(-1); }, [search, isOpen]);

  const handleSelect = (opt: string) => {
     setSearch(opt);
     onChange(opt);
     setIsOpen(false);
     setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: any) => {
    if (!isOpen || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
            e.preventDefault();
            handleSelect(filtered[highlightedIndex]);
        }
    } else if (e.key === 'Escape') { setIsOpen(false); }
  };

  const handleBlur = () => {
     if (strict && search) {
        const match = options.find((o:string) => o === search);
        if (!match) { setSearch(''); onChange(''); }
     }
     setTimeout(() => { setIsOpen(false); }, 200); 
  };

  const InputElement = isTextArea ? 'textarea' : 'input';

  return (
    <div style={{ position: 'relative', marginBottom: '15px' }} ref={ref}>
      {label && <label style={{ display: 'block', fontWeight: 900, fontSize: '14px', color: THEME.primary, marginBottom: '6px' }}>{label}</label>}
      <InputElement 
        type="text"
        disabled={disabled}
        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `2px solid ${THEME.border}`, fontWeight: 900, outline: 'none', color: '#000', fontSize: '15px', marginBottom: 0, resize: isTextArea ? 'vertical' : 'none', minHeight: isTextArea ? '80px' : 'auto', opacity: disabled ? 0.5 : 1, backgroundColor: disabled ? '#f1f5f9' : 'white' }}
        placeholder={placeholder}
        value={search}
        onChange={(e:any) => { setSearch(e.target.value); if(!strict) onChange(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur} 
        onKeyDown={handleKeyDown} 
      />
      {isOpen && filtered.length > 0 && !disabled && (
         <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: 'white', zIndex: 10000, border: `2px solid ${THEME.accent}`, borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', maxHeight: '200px', overflowY: 'auto', marginTop: '5px' }}>
          {filtered.map((o:string, i:number) => (
              <div key={i} onMouseDown={(e) => { e.preventDefault(); handleSelect(o); }} onMouseEnter={() => setHighlightedIndex(i)} 
                style={{ padding: '12px 15px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '14px', fontWeight: 900, color: THEME.primary, backgroundColor: highlightedIndex === i ? '#fef3c7' : 'transparent' }}>
                {o}
              </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ExpensesPage() {
  const logic = useExpensesLogic();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (logic.canView === false) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: THEME.slate, direction: 'rtl' }}>
        <div style={{ textAlign: 'center', background: 'white', padding: '50px', borderRadius: '25px', border: `3px solid ${THEME.ruby}` }}>
          <h1 style={{ color: THEME.ruby, fontWeight: 900 }}>🚫 تم رفض الوصول</h1>
          <p style={{ fontWeight: 900 }}>يرجى مراجعة الإدارة لتفعيل صلاحية المصروفات.</p>
        </div>
      </div>
    );
  }

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { alert("خطأ في تشغيل الكاميرا"); setIsCameraOpen(false); }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const imageDataUrl = canvasRef.current.toDataURL('image/jpeg');
      setImagePreview(imageDataUrl);
      logic.setCurrentExpense({ ...logic.currentExpense, invoice_image: imageDataUrl });
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop()); }
    setIsCameraOpen(false);
  };

  const subtotal = Number(logic.currentExpense.quantity || 0) * Number(logic.currentExpense.unit_price || 0);
  const vat = Number(logic.currentExpense.vat_amount || 0);
  const discount = Number(logic.currentExpense.discount_amount || 0);
  const modalTotalAmount = subtotal + vat - discount;

  const projectOptions = Array.from(new Set(logic.projects.map((p:any) => p.Property || p.project_name).filter(Boolean)));
  const contractorOptions = Array.from(new Set(logic.contractors.map((c:any) => c.name).filter(Boolean)));
  const payeeOptions = Array.from(new Set(logic.payees.map((p:any) => p.name).filter(Boolean)));
  const accountOptions = logic.accounts.map((a:any) => a.name);
  const descriptionOptions = Array.from(new Set([...(logic.boqItems || []), ...(logic.historicalData?.descriptions || [])].filter(Boolean)));

  return (
    <div style={{ direction: 'rtl', backgroundColor: '#f1f5f9', display: 'flex', minHeight: '100vh', fontFamily: 'Cairo, sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        .main-content { flex: 1; padding: 40px; margin-right: 70px; transition: 0.4s; }
        .main-content.sidebar-open { margin-right: 280px; }
        .header-grid { display: grid; grid-template-columns: 50px 110px 1.5fr 1fr 1.5fr 100px 90px 120px 1.5fr 80px; gap: 15px; background: ${THEME.primary}; color: white; padding: 18px; border-radius: 12px; margin-bottom: 20px; font-weight: 900; font-size: 14px; text-align: center; align-items: center; }
        .row-card { display: grid; grid-template-columns: 50px 110px 1.5fr 1fr 1.5fr 100px 90px 120px 1.5fr 80px; gap: 15px; background: white; padding: 15px; border-radius: 12px; margin-bottom: 10px; align-items: center; border: 1px solid #cbd5e1; transition: 0.2s; text-align: center; }
        .row-card:hover { border-color: ${THEME.accent}; transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .data-cell { font-weight: 900; color: #000; font-size: 14px; }
        .modal-input { width: 100%; padding: 12px; border-radius: 10px; border: 2px solid ${THEME.border}; margin-bottom: 15px; font-weight: 900; outline: none; transition: 0.3s; color: #000; font-size: 15px; }
        .modal-input:focus { border-color: ${THEME.accent}; }
        .label-royal { display: block; font-weight: 900; font-size: 14px; color: ${THEME.primary}; marginBottom: 8px; }
      `}</style>

      <aside onMouseEnter={() => setIsSidebarOpen(true)} onMouseLeave={() => setIsSidebarOpen(false)}
        style={{ width: isSidebarOpen ? '280px' : '70px', backgroundColor: THEME.primary, position: 'fixed', right: 0, height: '100vh', zIndex: 1001, borderLeft: `3px solid ${THEME.accent}`, transition: '0.4s', overflowY: 'auto' }}>
        
        <div style={{ padding: '25px 15px', width: '280px', opacity: isSidebarOpen ? 1 : 0, transition: '0.2s' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px', marginBottom: '20px', textAlign: 'center', border: `1px solid ${THEME.accent}` }}>
            <div style={{color: THEME.accent, fontSize: '12px', fontWeight: 900}}>إجمالي مصروفات الفترة</div>
            <div style={{color: 'white', fontSize: '24px', fontWeight: 900}}>{logic.totalAmount.toLocaleString()}</div>
          </div>

          <input style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', color: 'white', marginBottom: '20px', outline: 'none', fontWeight: 900 }} placeholder="🔍 بحث سريع..." value={logic.globalSearch} onChange={e => logic.setGlobalSearch(e.target.value)} />

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '15px', marginBottom: '20px' }}>
            <label style={{color: THEME.accent, fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '10px'}}>العمليات</label>
            {logic.canAdd && <button onClick={logic.handleAddNew} style={{ background: 'white', color: THEME.primary, width: '100%', padding: '10px', borderRadius: '10px', fontWeight: 900, border: 'none', cursor: 'pointer', marginBottom: '10px' }}>➕ إضافة مصروف</button>}
            
            {logic.canEdit && <button onClick={() => logic.setIsBulkFixModalOpen(true)} disabled={logic.selectedIds.length === 0} style={{ background: THEME.info, color: 'white', width: '100%', padding: '10px', borderRadius: '10px', fontWeight: 900, border: 'none', marginBottom: '10px', cursor: 'pointer', opacity: logic.selectedIds.length > 0 ? 1 : 0.3 }}>🛠️ تصحيح مجمع</button>}
            
            <button onClick={logic.handleEditSelected} disabled={logic.selectedIds.length !== 1} style={{ background: THEME.accent, color: 'white', width: '100%', padding: '10px', borderRadius: '10px', fontWeight: 900, border: 'none', marginBottom: '10px', cursor: 'pointer', opacity: logic.selectedIds.length === 1 ? 1 : 0.3 }}>✏️ تعديل واحد</button>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {logic.canDelete && <button onClick={logic.handleDeleteSelected} disabled={logic.selectedIds.length === 0} style={{ background: THEME.ruby, color: 'white', padding: '10px', borderRadius: '10px', border: 'none', fontWeight: 900, cursor: 'pointer', opacity: logic.selectedIds.length > 0 ? 1 : 0.3 }}>🗑️ حذف</button>}
              {logic.canPost && <button onClick={logic.handlePostSelected} disabled={logic.selectedIds.length === 0} style={{ background: THEME.success, color: 'white', padding: '10px', borderRadius: '10px', border: 'none', fontWeight: 900, cursor: 'pointer', opacity: logic.selectedIds.length > 0 ? 1 : 0.3 }}>🚀 ترحيل</button>}
              
              {logic.canPost && <button onClick={logic.handleUnpostSelected} disabled={logic.selectedIds.length === 0} style={{ background: THEME.warning, color: 'white', padding: '10px', borderRadius: '10px', border: 'none', fontWeight: 900, cursor: 'pointer', opacity: logic.selectedIds.length > 0 ? 1 : 0.3 }}>↩️ فك ترحيل</button>}
            </div>
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
          {logic.canExport && <button onClick={logic.exportToExcel} style={{ background: '#334155', color: 'white', width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 900, border: 'none', cursor: 'pointer' }}>📊 تصدير Excel</button>}
        </div>
      </aside>

      <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '38px', fontWeight: 900, color: THEME.primary, margin: 0 }}>سجل المصروفات الموحد</h1>
            <p style={{ color: '#000', fontWeight: 900, margin: 0 }}>شركة رواسي اليسر للمقاولات</p>
          </div>
          <img src="/RYC_Logo.png" alt="Logo" style={{ height: '110px' }} />
        </header>

        <div className="header-grid">
          <input type="checkbox" onChange={() => { if (logic.selectedIds.length === logic.filteredExpenses.length) logic.setSelectedIds([]); else logic.setSelectedIds(logic.filteredExpenses.map((l:any) => l.id)); }} />
          <div>التاريخ</div><div style={{textAlign:'right'}}>المقاول / المستفيد</div><div>المشروع</div><div style={{textAlign:'right'}}>البيان التفصيلي</div><div>الضريبة</div><div>الخصم</div><div>الإجمالي</div><div>ملاحظات</div><div>الحالة</div>
        </div>

        {logic.isLoading ? <div style={{textAlign: 'center', padding: '100px', fontWeight: 900, fontSize: '20px', color: THEME.primary}}>⏳ جاري التحميل...</div> : logic.filteredExpenses.map((exp:any) => (
          <div key={exp.id} className="row-card" style={{ backgroundColor: logic.selectedIds.includes(exp.id) ? '#fef3c7' : 'white' }}>
            <input type="checkbox" checked={logic.selectedIds.includes(exp.id)} onChange={() => { if (logic.selectedIds.includes(exp.id)) logic.setSelectedIds(logic.selectedIds.filter((i:any) => i !== exp.id)); else logic.setSelectedIds([...logic.selectedIds, exp.id]); }} />
            <div className="data-cell">{exp.exp_date}</div>
            <div className="data-cell" style={{textAlign:'right'}}>{exp.sub_contractor || exp.payee_name || '---'}</div>
            <div className="data-cell" style={{ color: THEME.primary }}>{exp.site_ref || 'عام'}</div>
            <div className="data-cell" style={{textAlign:'right'}}>{exp.description}</div>
            <div className="data-cell">{Number(exp.vat_amount || 0).toLocaleString()}</div>
            <div className="data-cell" style={{color: THEME.ruby}}>{Number(exp.discount_amount || 0).toLocaleString()}</div>
            <div className="data-cell" style={{ color: THEME.success, fontSize: '16px' }}>{((Number(exp.quantity) * Number(exp.unit_price)) + Number(exp.vat_amount || 0) - Number(exp.discount_amount || 0)).toLocaleString()}</div>
            <div className="data-cell" style={{ fontSize: '12px' }}>{exp.notes || '---'}</div>
            <div>
              {exp.is_posted ? <span style={{ padding: '4px 12px', background: '#dcfce7', color: THEME.success, borderRadius: '20px', fontSize: '12px', fontWeight: 900 }}>✅ مرحل</span> : <span style={{ padding: '4px 12px', background: '#f1f5f9', color: '#64748b', borderRadius: '20px', fontSize: '12px', fontWeight: 900 }}>⏳ معلق</span>}
            </div>
          </div>
        ))}
      </main>

      {/* 🛠️ شاشة التصحيح المجمع */}
      {logic.isBulkFixModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'white', width: '650px', padding: '35px', borderRadius: '24px', border: `4px solid ${THEME.info}` }}>
            <h2 style={{ fontWeight: 900, color: THEME.primary, marginBottom: '10px', textAlign: 'center' }}>🛠️ تصحيح حسابات مجمع</h2>
            <p style={{ fontWeight: 900, color: '#64748b', marginBottom: '25px', textAlign: 'center' }}>سيتم تطبيق التعديل على <span style={{color: THEME.ruby, fontSize: '18px'}}>{logic.selectedIds.length}</span> مصروف معلق.</p>
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', border: `2px solid ${THEME.border}`, marginBottom: '25px' }}>
              <UniversalAutocomplete label="🧾 حساب المصروف (المدين)" placeholder="ابحث في شجرة الحسابات..." value={logic.bulkFixAccounts.creditor_account} onChange={(val:string)=>logic.setBulkFixAccounts({...logic.bulkFixAccounts, creditor_account:val})} options={accountOptions} strict={true} />
              <UniversalAutocomplete label="🏦 حساب السداد (الدائن)" placeholder="ابحث في شجرة الحسابات..." value={logic.bulkFixAccounts.payment_account} onChange={(val:string)=>logic.setBulkFixAccounts({...logic.bulkFixAccounts, payment_account:val})} options={accountOptions} strict={true} />
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
               <button onClick={()=>logic.setIsBulkFixModalOpen(false)} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: `2px solid ${THEME.primary}`, fontWeight: 900, cursor: 'pointer' }}>إلغاء</button>
               <button onClick={logic.handleBulkFixSave} disabled={logic.isSaving} style={{ flex: 2, padding: '15px', borderRadius: '12px', background: THEME.info, color: 'white', fontWeight: 900, border: 'none', cursor: 'pointer' }}>✅ حفظ التعديلات</button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 شاشة معاينة وتأكيد التوزيع النسبي */}
      {logic.distributionPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 4000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'white', width: '800px', padding: '35px', borderRadius: '24px', border: `4px solid ${THEME.purple}`, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontWeight: 900, color: THEME.purple, marginBottom: '10px', textAlign: 'center' }}>✂️ معاينة توزيع التكلفة</h2>
            <p style={{ textAlign: 'center', fontWeight: 900, marginBottom: '20px' }}>بناءً على التقرير اليومي، سيتم تقسيم إجمالي المبلغ ({modalTotalAmount}) كالتالي:</p>
            
            {logic.distributionPreview.map((item:any, index:number) => (
                <div key={index} style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', marginBottom: '10px', border: `2px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 900 }}>🏢 {item.site_ref}</div>
                    <div style={{ color: THEME.info, fontWeight: 900 }}>👷 {item.workers_count} عامل ({item.ratio_percent}%)</div>
                    <div style={{ color: THEME.success, fontWeight: 900, fontSize: '18px' }}>💰 {(Number(item.unit_price) + Number(item.vat_amount) - Number(item.discount_amount)).toLocaleString()} ج</div>
                </div>
            ))}

            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
               <button onClick={()=>logic.setDistributionPreview(null)} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: `2px solid ${THEME.primary}`, fontWeight: 900, cursor: 'pointer' }}>إلغاء التوزيع</button>
               <button onClick={logic.confirmDistribution} disabled={logic.isSaving} style={{ flex: 2, padding: '15px', borderRadius: '12px', background: THEME.purple, color: 'white', fontWeight: 900, border: 'none', cursor: 'pointer' }}>{logic.isSaving ? '⏳ جاري التقسيم والحفظ...' : '✅ تأكيد وحفظ المشاريع المنفصلة'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 📝 موديول الإضافة والتعديل الأساسي */}
      {logic.isEditModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(8px)' }} onClick={() => logic.setIsEditModalOpen(false)}>
          <div style={{ background: 'white', width: '1000px', padding: '35px', borderRadius: '24px', border: `4px solid ${THEME.accent}`, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontWeight: 900, color: THEME.primary, marginBottom: '25px', borderBottom: `4px solid ${THEME.accent}`, paddingBottom: '15px' }}>📝 {logic.editingId ? 'تعديل المصروف' : 'مصروف جديد'}</h2>
            
            {/* 🟢 زر التفعيل اليدوي لخاصية التوزيع */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: logic.isDistributionEnabled ? '#f3e8ff' : '#f8fafc', padding: '15px', borderRadius: '15px', border: `2px dashed ${logic.isDistributionEnabled ? THEME.purple : THEME.border}`, marginBottom: '20px', transition: '0.3s' }}>
              <input type="checkbox" id="distToggle" checked={logic.isDistributionEnabled} onChange={(e) => logic.setIsDistributionEnabled(e.target.checked)} style={{ width: '22px', height: '22px', accentColor: THEME.purple, cursor: 'pointer' }} />
              <label htmlFor="distToggle" style={{ fontWeight: 900, color: logic.isDistributionEnabled ? THEME.purple : '#64748b', cursor: 'pointer', fontSize: '16px' }}>✂️ تفعيل توزيع قيمة هذا المصروف على مشاريع اليوم (نسبة وتناسب حسب عدد العمال)</label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
              <div><label className="label-royal">📅 التاريخ</label><input type="date" className="modal-input" style={{marginBottom: 0}} value={logic.currentExpense.exp_date || ''} onChange={e => logic.setCurrentExpense({...logic.currentExpense, exp_date: e.target.value})} /></div>
              {/* 🟢 تعطيل خانة المشروع عند التفعيل لأن السيستم هيجيبهم من التقرير */}
              <UniversalAutocomplete label="🏢 المشروع (العقار)" placeholder={logic.isDistributionEnabled ? "سيتم التوزيع تلقائياً..." : "اختر العقار..."} value={logic.isDistributionEnabled ? '' : logic.currentExpense.site_ref} onChange={(val:string)=>logic.setCurrentExpense({...logic.currentExpense, site_ref:val})} options={projectOptions} strict={true} disabled={logic.isDistributionEnabled} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
              <UniversalAutocomplete label="👷 المقاول (الباطن)" placeholder="قائمة المقاولين..." value={logic.currentExpense.sub_contractor} onChange={(val:string)=>logic.setCurrentExpense({...logic.currentExpense, sub_contractor:val})} options={contractorOptions} strict={true} />
              <UniversalAutocomplete label="👤 المستفيد المباشر" placeholder="قائمة المستفيدين..." value={logic.currentExpense.payee_name} onChange={(val:string)=>logic.setCurrentExpense({...logic.currentExpense, payee_name:val})} options={payeeOptions} strict={true} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#f8fafc', padding: '15px', borderRadius: '15px', border: `2px solid ${THEME.border}`, marginBottom: '15px' }}>
              <UniversalAutocomplete label="🧾 حساب المصروف (المدين)" value={logic.currentExpense.creditor_account} onChange={(val:string)=>logic.setCurrentExpense({...logic.currentExpense, creditor_account:val})} options={accountOptions} strict={true} />
              <UniversalAutocomplete label="🏦 حساب السداد (الدائن)" value={logic.currentExpense.payment_account} onChange={(val:string)=>logic.setCurrentExpense({...logic.currentExpense, payment_account:val})} options={accountOptions} strict={true} />
            </div>
            
            <UniversalAutocomplete label="📂 البيان والتفاصيل" placeholder="اختر بند المقايسة أو اكتب بياناً..." value={logic.currentExpense.description} onChange={(val:string)=>logic.setCurrentExpense({...logic.currentExpense, description:val})} options={descriptionOptions} />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', backgroundColor: '#f1f5f9', padding: '20px', borderRadius: '15px', border: `2px solid ${THEME.border}`, marginBottom: '20px' }}>
                <div><label className="label-royal">الكمية</label><input type="number" className="modal-input" value={logic.currentExpense.quantity} onChange={e => logic.setCurrentExpense({...logic.currentExpense, quantity: e.target.value})} /></div>
                <div><label className="label-royal">السعر</label><input type="number" className="modal-input" value={logic.currentExpense.unit_price} onChange={e => logic.setCurrentExpense({...logic.currentExpense, unit_price: e.target.value})} /></div>
                <div><label className="label-royal">الضريبة</label><input type="number" className="modal-input" value={logic.currentExpense.vat_amount} onChange={e => logic.setCurrentExpense({...logic.currentExpense, vat_amount: e.target.value})} /></div>
                <div><label className="label-royal" style={{color: THEME.ruby}}>الخصم (-)</label><input type="number" className="modal-input" value={logic.currentExpense.discount_amount} onChange={e => logic.setCurrentExpense({...logic.currentExpense, discount_amount: e.target.value})} /></div>
                <div style={{ textAlign: 'center' }}>
                  <label className="label-royal" style={{color: THEME.success}}>الصافي</label>
                  <div style={{ padding: '10px', background: 'white', borderRadius: '10px', border: `2px solid ${THEME.success}`, fontWeight: 900, color: THEME.success, fontSize: '20px' }}>{modalTotalAmount.toLocaleString()}</div>
                </div>
            </div>

            {logic.currentExpense.discount_amount > 0 && (
                <div style={{ background: '#fff1f2', padding: '15px', borderRadius: '15px', border: `2px dashed ${THEME.ruby}`, marginBottom: '20px' }}>
                   <UniversalAutocomplete label="حساب توجيه الخصم" placeholder="اختر حساب الخصومات..." value={logic.currentExpense.discount_account} onChange={(val:string)=>logic.setCurrentExpense({...logic.currentExpense, discount_account:val})} options={accountOptions} strict={true} />
                </div>
            )}
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, padding: '15px', background: '#f8fafc', border: `2px solid ${THEME.primary}`, borderRadius: '12px', fontWeight: 900, cursor: 'pointer', color: '#000', fontSize: '15px' }}>📁 إرفاق فاتورة / سند</button>
                <button onClick={isCameraOpen ? startCamera : takePhoto} style={{ flex: 1, padding: '15px', background: THEME.primary, color: 'white', borderRadius: '12px', border: 'none', fontWeight: 900, cursor: 'pointer', fontSize: '15px' }}>{isCameraOpen ? '📸 التقاط الآن' : '📷 تصوير الفاتورة'}</button>
            </div>
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if(file) { const r = new FileReader(); r.onload = () => setImagePreview(r.result as string); r.readAsDataURL(file); } }} />

            <UniversalAutocomplete label="ملاحظات وتفاصيل إضافية (اختياري)" placeholder="اكتب أي ملاحظات إضافية هنا..." value={logic.currentExpense.notes} onChange={(val:string)=>logic.setCurrentExpense({...logic.currentExpense, notes:val})} options={logic.historicalData.notes} isTextArea={true} />

            {/* 🟢 تغيير الزرار تلقائياً بناءً على اختيار المحاسب */}
            <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
               {logic.isDistributionEnabled ? (
                   <button onClick={logic.calculateDistribution} disabled={logic.isSaving} style={{ flex: 1, background: THEME.purple, color: 'white', padding: '18px', borderRadius: '15px', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '18px', boxShadow: '0 10px 20px rgba(139, 92, 246, 0.2)' }}>
                     ✂️ معاينة وتوزيع التكلفة
                   </button>
               ) : (
                   <button onClick={logic.handleSaveExpense} disabled={logic.isSaving} style={{ flex: 1, background: THEME.success, color: 'white', padding: '18px', borderRadius: '15px', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '18px', boxShadow: '0 10px 20px rgba(5, 150, 105, 0.2)' }}>
                     {logic.isSaving ? '⏳ جاري الحفظ...' : '✅ اعتماد وحفظ المصروف'}
                   </button>
               )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}