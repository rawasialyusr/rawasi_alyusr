"use client";
import React, { useState, useRef, useEffect } from 'react'; 
import { useExpensesLogic } from './expenses_logic';
import { THEME } from '@/lib/theme';
import { useAuth } from '@/components/authGuard'; 
import MasterPage from '@/components/MasterPage'; 
import SmartCombo from '@/components/SmartCombo'; 
import { useSidebar } from '@/lib/SidebarContext'; 
import { formatCurrency } from '@/lib/helpers';

export default function ExpensesPage() {
  const logic = useExpensesLogic();
  const { setSidebarContent } = useSidebar();
  const { can } = useAuth();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 🛡️ 1. مزامنة العمليات والملخص مع السايد بار الرئيسي (اللاياوت)
  useEffect(() => {
    const sidebarActions = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {can('expenses', 'create') && logic.canAdd && (
            <button className="btn-main-glass gold" onClick={logic.handleAddNew}>
                ➕ إضافة مصروف جديد
            </button>
        )}
        
        {logic.selectedIds.length > 0 && (
          <>
            <p style={{fontSize:'10px', textAlign:'center', color:'#94a3b8', fontWeight:900, marginBottom:'-5px'}}>الإجراءات على ({logic.selectedIds.length})</p>
            
            {can('expenses', 'edit') && (
                <button className="btn-main-glass blue" onClick={() => logic.setIsBulkFixModalOpen(true)}>
                    🛠️ تصحيح مجمع
                </button>
            )}

            {logic.selectedIds.length === 1 && (
                <button className="btn-main-glass white" onClick={logic.handleEditSelected}>
                    ✏️ تعديل السجل
                </button>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {can('expenses', 'post') && <button className="btn-main-glass green" style={{padding:'10px'}} onClick={logic.handlePostSelected}>🚀 ترحيل</button>}
                {can('expenses', 'delete') && <button className="btn-main-glass red" style={{padding:'10px'}} onClick={logic.handleDeleteSelected}>🗑️ حذف</button>}
            </div>

            {can('expenses', 'post') && (
                <button className="btn-main-glass yellow" onClick={logic.handleUnpostSelected}>
                    ↩️ فك ترحيل المحدّد
                </button>
            )}
          </>
        )}

        <button className="btn-main-glass white" onClick={logic.exportToExcel}>
            📊 تصدير Excel
        </button>
      </div>
    );

    const sidebarSummary = (
        <div className="summary-glass-card">
            <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي مصروفات الفترة 📉</span>
            <div style={{fontSize:'22px', fontWeight:900, color: THEME.primary}}>{formatCurrency(logic.totalAmount)}</div>
            <div style={{fontSize:'11px', color:'#10b981', fontWeight:800, marginTop:'5px'}}>إجمالي القيود: {logic.filteredExpenses.length}</div>
        </div>
    );

    setSidebarContent({
      actions: sidebarActions,
      summary: sidebarSummary,
      customFilters: (
        <div style={{marginTop: '10px'}}>
             <label style={{color: THEME.accent, fontSize: '11px', fontWeight: 900, display: 'block', marginBottom: '8px'}}>عرض السجلات</label>
             <select 
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, outline: 'none' }} 
                value={logic.rowsPerPage} 
                onChange={e => { logic.setRowsPerPage(Number(e.target.value)); logic.setCurrentPage(1); }}
             >
               <option value="50" style={{color:'#000'}}>50 سجل</option>
               <option value="100" style={{color:'#000'}}>100 سجل</option>
               <option value="500" style={{color:'#000'}}>500 سجل</option>
             </select>
        </div>
      )
    });

    return () => setSidebarContent({ actions: null, summary: null, customFilters: null });
  }, [logic.selectedIds, logic.totalAmount, logic.rowsPerPage, can]);

  // 🛡️ حماية الوصول الكلية
  if (logic.canView === false) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', direction: 'rtl' }}>
        <div style={{ textAlign: 'center', background: 'white', padding: '50px', borderRadius: '25px', border: `3px solid ${THEME.ruby}` }}>
          <h1 style={{ color: THEME.ruby, fontWeight: 900 }}>🚫 تم رفض الوصول</h1>
          <p style={{ fontWeight: 900 }}>يرجى مراجعة الإدارة لتفعيل صلاحية المصروفات.</p>
        </div>
      </div>
    );
  }

  // دالة التقاط الصور (لم يتم تغييرها لضمان عمل الهاردوير)
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

  return (
    <MasterPage 
        title="سجل المصروفات الموحد" 
        subtitle="إدارة التكاليف والمشتريات وتوزيع بنود العمل"
    >
      <style>{`
        .header-grid { 
            display: grid; grid-template-columns: 40px 110px 1.5fr 1fr 1.5fr 80px 80px 100px 1.2fr 80px; gap: 10px; 
            padding: 15px; font-weight: 900; font-size: 13px; text-align: center; color: #64748b;
            border-bottom: 2px solid #f1f5f9;
        }
        .row-card { 
            display: grid; grid-template-columns: 40px 110px 1.5fr 1fr 1.5fr 80px 80px 100px 1.2fr 80px; gap: 10px; 
            padding: 12px 15px; align-items: center; text-align: center;
            border-bottom: 1px solid rgba(0,0,0,0.03); transition: 0.2s;
        }
        .row-card:hover { background: rgba(0,0,0,0.01); }
        .row-card.selected { background: rgba(202, 138, 4, 0.05); }
        .data-cell { font-weight: 800; font-size: 13px; color: #1e293b; }
      `}</style>

      {/* 🔍 شريط البحث الداخلي */}
      <div style={{ marginBottom: '20px', padding: '0 10px' }}>
        <SmartCombo 
            placeholder="🔍 بحث سريع في المصروفات، المشاريع، أو الموردين..."
            initialDisplay={logic.globalSearch}
            onSelect={(val: any) => logic.setGlobalSearch(typeof val === 'object' ? val.name : val)}
            enableClear={true}
            freeText={true}
          />
      </div>

      <div className="header-grid">
        <input type="checkbox" className="custom-checkbox" onChange={() => { if (logic.selectedIds.length === logic.filteredExpenses.length) logic.setSelectedIds([]); else logic.setSelectedIds(logic.filteredExpenses.map((l:any) => l.id)); }} />
        <div>التاريخ</div><div style={{textAlign:'right'}}>المقاول/المستفيد</div><div>المشروع</div><div style={{textAlign:'right'}}>البيان التفصيلي</div><div>الضريبة</div><div>الخصم</div><div>الإجمالي</div><div>ملاحظات</div><div>الحالة</div>
      </div>

      {logic.isLoading ? (
        <div style={{textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8'}}>⏳ جاري المزامنة...</div>
      ) : (
        <div style={{minHeight: '400px'}}>
          {logic.filteredExpenses.map((exp:any) => (
            <div key={exp.id} className={`row-card ${logic.selectedIds.includes(exp.id) ? 'selected' : ''}`}>
              <input type="checkbox" className="custom-checkbox" checked={logic.selectedIds.includes(exp.id)} onChange={() => { if (logic.selectedIds.includes(exp.id)) logic.setSelectedIds(logic.selectedIds.filter((i:any) => i !== exp.id)); else logic.setSelectedIds([...logic.selectedIds, exp.id]); }} />
              <div className="data-cell" style={{color: '#64748b'}}>{exp.exp_date}</div>
              <div className="data-cell" style={{textAlign:'right', fontWeight: 900}}>{exp.sub_contractor || exp.payee_name || '---'}</div>
              <div className="data-cell"><span className="glass-badge blue" style={{fontSize:'10px'}}>{exp.site_ref || 'عام'}</span></div>
              <div className="data-cell" style={{textAlign:'right', fontSize:'12px'}}>{exp.description}</div>
              <div className="data-cell">{Number(exp.vat_amount || 0).toLocaleString()}</div>
              <div className="data-cell" style={{color: THEME.ruby}}>{Number(exp.discount_amount || 0).toLocaleString()}</div>
              <div className="data-cell" style={{ color: THEME.success, fontWeight: 900 }}>{((Number(exp.quantity) * Number(exp.unit_price)) + Number(exp.vat_amount || 0) - Number(exp.discount_amount || 0)).toLocaleString()}</div>
              <div className="data-cell" style={{ fontSize: '11px', color: '#94a3b8' }}>{exp.notes || '---'}</div>
              <div>
                {exp.is_posted ? <span className="glass-badge green">مُرحل ✅</span> : <span className="glass-badge orange">معلق</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔢 Pagination التحكم في الصفحات */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px', paddingBottom: '20px' }}>
          <button disabled={logic.currentPage === 1} onClick={() => logic.setCurrentPage((p:number) => p - 1)} className="btn-glass-print">السابق</button>
          <div style={{background: THEME.primary, color:'white', padding:'8px 20px', borderRadius:'12px', fontWeight:900}}>صفحة {logic.currentPage} من {logic.totalPages}</div>
          <button disabled={logic.currentPage >= logic.totalPages} onClick={() => logic.setCurrentPage((p:number) => p + 1)} className="btn-glass-print">التالي</button>
      </div>

      {/* 🛠️ مودال التصحيح المجمع (باستخدام SmartCombo) */}
      {logic.isBulkFixModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'white', width: '600px', padding: '35px', borderRadius: '30px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontWeight: 900, textAlign: 'center', marginBottom: '25px' }}>🛠️ تصحيح الحسابات لـ ({logic.selectedIds.length}) سجل</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <SmartCombo 
                label="🧾 حساب المصروف (المدين)" 
                table="accounts" 
                displayCol="name" 
                initialDisplay={logic.bulkFixAccounts.creditor_account} 
                onSelect={(val:any)=>logic.setBulkFixAccounts({...logic.bulkFixAccounts, creditor_account: val.name})} 
                strict={true} 
              />
              <SmartCombo 
                label="🏦 حساب السداد (الدائن)" 
                table="accounts" 
                displayCol="name" 
                initialDisplay={logic.bulkFixAccounts.payment_account} 
                onSelect={(val:any)=>logic.setBulkFixAccounts({...logic.bulkFixAccounts, payment_account: val.name})} 
                strict={true} 
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '35px' }}>
               <button onClick={()=>logic.setIsBulkFixModalOpen(false)} style={{ flex: 1, padding: '15px', borderRadius: '15px', border: '2px solid #eee', fontWeight: 900, cursor: 'pointer' }}>إلغاء</button>
               <button onClick={logic.handleBulkFixSave} disabled={logic.isSaving} style={{ flex: 2, padding: '15px', borderRadius: '15px', background: THEME.info, color: 'white', fontWeight: 900, border: 'none', cursor: 'pointer' }}>✅ تطبيق التعديلات</button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 شاشة معاينة التوزيع النسبي (لم يتم تغيير اللوجيك) */}
      {logic.distributionPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 4000, backdropFilter: 'blur(10px)' }}>
          <div style={{ background: 'white', width: '800px', padding: '35px', borderRadius: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontWeight: 900, color: THEME.purple, textAlign: 'center', marginBottom: '25px' }}>✂️ معاينة توزيع التكلفة الذكي</h2>
            {logic.distributionPreview.map((item:any, index:number) => (
                <div key={index} style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 900 }}>🏢 {item.site_ref}</div>
                    <div style={{ color: THEME.info, fontWeight: 900 }}>👷 {item.workers_count} عامل ({item.ratio_percent}%)</div>
                    <div style={{ color: THEME.success, fontWeight: 900, fontSize: '18px' }}>💰 {formatCurrency(item.unit_price + item.vat_amount - item.discount_amount)}</div>
                </div>
            ))}
            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
               <button onClick={()=>logic.setDistributionPreview(null)} style={{ flex: 1, padding: '15px', borderRadius: '15px', border: '2px solid #eee', fontWeight: 900 }}>إلغاء</button>
               <button onClick={logic.confirmDistribution} disabled={logic.isSaving} style={{ flex: 2, padding: '15px', borderRadius: '15px', background: THEME.purple, color: 'white', fontWeight: 900, border: 'none' }}>✅ تأكيد وحفظ التقسيم</button>
            </div>
          </div>
        </div>
      )}

      {/* 📝 مودال الإضافة والتعديل الأساسي (Apple Style) */}
      {logic.isEditModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(12px)' }} onClick={() => logic.setIsEditModalOpen(false)}>
          <div style={{ background: 'white', width: '950px', padding: '40px', borderRadius: '35px', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 50px 100px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px', borderBottom:'1px solid #f1f5f9', paddingBottom:'20px'}}>
                <h2 style={{ fontWeight: 900, color: THEME.primary, margin:0 }}>📝 {logic.editingId ? 'تعديل بيانات المصروف' : 'تسجيل مصروف جديد'}</h2>
                <div style={{ color: THEME.accent, fontWeight: 900, fontSize: '24px' }}>{formatCurrency(modalTotalAmount)}</div>
            </div>

            {/* زر التوزيع الذكي */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: logic.isDistributionEnabled ? '#f3e8ff' : '#f8fafc', padding: '20px', borderRadius: '20px', border: `2px dashed ${logic.isDistributionEnabled ? THEME.purple : '#cbd5e1'}`, marginBottom: '25px', transition: '0.3s' }}>
              <input type="checkbox" id="distToggle" checked={logic.isDistributionEnabled} onChange={(e) => logic.setIsDistributionEnabled(e.target.checked)} style={{ width: '25px', height: '25px', accentColor: THEME.purple, cursor: 'pointer' }} />
              <label htmlFor="distToggle" style={{ fontWeight: 900, color: logic.isDistributionEnabled ? THEME.purple : '#64748b', cursor: 'pointer', fontSize: '16px' }}>✂️ تفعيل التوزيع التلقائي على مشاريع اليوم (حسب عدد العمال الميدانيين)</label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '20px' }}>
              <div>
                <label className="label-royal">📅 تاريخ المصروف</label>
                <input type="date" className="modal-input" value={logic.currentExpense.exp_date || ''} onChange={e => logic.setCurrentExpense({...logic.currentExpense, exp_date: e.target.value})} />
              </div>
              <SmartCombo 
                label="🏢 المشروع / العقار" 
                table="projects" 
                displayCol="Property" 
                disabled={logic.isDistributionEnabled} 
                initialDisplay={logic.isDistributionEnabled ? "سيتم التوزيع آلياً..." : logic.currentExpense.site_ref} 
                onSelect={(val:any)=>logic.setCurrentExpense({...logic.currentExpense, site_ref: val.Property})} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '20px' }}>
              <SmartCombo label="👷 المقاول / المورد" table="partners" displayCol="name" initialDisplay={logic.currentExpense.sub_contractor} onSelect={(val:any)=>logic.setCurrentExpense({...logic.currentExpense, sub_contractor: val.name})} allowAddNew={true} requiredPermission={{module:'partners', action:'create'}} />
              <SmartCombo label="👤 المستفيد المباشر" table="partners" displayCol="name" initialDisplay={logic.currentExpense.payee_name} onSelect={(val:any)=>logic.setCurrentExpense({...logic.currentExpense, payee_name: val.name})} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', background: '#f8fafc', padding: '20px', borderRadius: '20px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <SmartCombo label="🧾 حساب المصروف" table="accounts" displayCol="name" initialDisplay={logic.currentExpense.creditor_account} onSelect={(val:any)=>logic.setCurrentExpense({...logic.currentExpense, creditor_account: val.name})} strict={true} />
              <SmartCombo label="🏦 حساب السداد" table="accounts" displayCol="name" initialDisplay={logic.currentExpense.payment_account} onSelect={(val:any)=>logic.setCurrentExpense({...logic.currentExpense, payment_account: val.name})} strict={true} />
            </div>
            
            <SmartCombo label="📂 البيان التفصيلي" freeText={true} initialDisplay={logic.currentExpense.description} options={logic.historicalData?.descriptions || []} onSelect={(val:any)=>logic.setCurrentExpense({...logic.currentExpense, description: typeof val === 'object' ? val.name : val})} />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', background: '#f1f5f9', padding: '20px', borderRadius: '20px', marginTop:'20px', marginBottom: '25px' }}>
                <div><label className="label-royal">الكمية</label><input type="number" className="modal-input" value={logic.currentExpense.quantity} onChange={e => logic.setCurrentExpense({...logic.currentExpense, quantity: e.target.value})} /></div>
                <div><label className="label-royal">سعر الوحدة</label><input type="number" className="modal-input" value={logic.currentExpense.unit_price} onChange={e => logic.setCurrentExpense({...logic.currentExpense, unit_price: e.target.value})} /></div>
                <div><label className="label-royal">الضريبة</label><input type="number" className="modal-input" value={logic.currentExpense.vat_amount} onChange={e => logic.setCurrentExpense({...logic.currentExpense, vat_amount: e.target.value})} /></div>
                <div><label className="label-royal" style={{color: THEME.ruby}}>الخصم (-)</label><input type="number" className="modal-input" value={logic.currentExpense.discount_amount} onChange={e => logic.setCurrentExpense({...logic.currentExpense, discount_amount: e.target.value})} /></div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
                <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, padding: '18px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '15px', fontWeight: 900, cursor: 'pointer' }}>📁 إرفاق مستند</button>
                <button onClick={isCameraOpen ? takePhoto : startCamera} style={{ flex: 1, padding: '18px', background: THEME.primary, color: 'white', borderRadius: '15px', border: 'none', fontWeight: 900, cursor: 'pointer' }}>{isCameraOpen ? '📸 التقاط الصورة' : '📷 تصوير الفاتورة'}</button>
            </div>
            {isCameraOpen && <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '20px', marginBottom: '20px', border: `4px solid ${THEME.accent}` }} />}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if(file) { const r = new FileReader(); r.onload = () => setImagePreview(r.result as string); r.readAsDataURL(file); } }} />

            <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
               <button onClick={() => logic.setIsEditModalOpen(false)} style={{ flex: 1, padding: '20px', background: '#f1f5f9', borderRadius: '18px', border: 'none', fontWeight: 900, cursor: 'pointer' }}>إغلاق</button>
               {logic.isDistributionEnabled ? (
                   <button onClick={logic.calculateDistribution} disabled={logic.isSaving} style={{ flex: 2, background: THEME.purple, color: 'white', padding: '20px', borderRadius: '18px', fontWeight: 900, border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px rgba(139, 92, 246, 0.3)' }}>
                     ✂️ معاينة وحفظ التوزيع
                   </button>
               ) : (
                   <button onClick={logic.handleSaveExpense} disabled={logic.isSaving} style={{ flex: 2, background: THEME.success, color: 'white', padding: '20px', borderRadius: '18px', fontWeight: 900, border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px rgba(5, 150, 105, 0.3)' }}>
                     {logic.isSaving ? '⏳ جاري الحفظ...' : '✅ اعتماد وحفظ المصروف'}
                   </button>
               )}
            </div>
          </div>
        </div>
      )}
    </MasterPage>
  );
}