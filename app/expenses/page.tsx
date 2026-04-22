"use client";
import React, { useState, useRef, useEffect } from 'react'; 
import { createPortal } from 'react-dom'; 
import { useExpensesLogic } from './expenses_logic';
import { THEME } from '@/lib/theme';
import SmartCombo from '@/components/SmartCombo'; 
import RawasiSidebarManager from '@/components/RawasiSidebarManager'; // 🛡️ المكون القياسي الجديد
import { usePermissions } from '@/lib/PermissionsContext'; // 🛡️ نظام الصلاحيات المركزي
import SecureAction from '@/components/SecureAction';      // 🛡️ مغلف الأزرار
import { formatCurrency } from '@/lib/helpers';

export default function ExpensesPage() {
  const logic = useExpensesLogic();
  const [mounted, setMounted] = useState(false); 
  
  // 🛡️ سحب دالة فحص الصلاحيات وحالة التحميل بأمان
  const { can, loading: permsLoading } = usePermissions();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
      setMounted(true);
  }, []);

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

  // =========================================================================
  // 🎛️ أزرار السايد بار (مؤمنة بالصلاحيات 🛡️)
  // =========================================================================
  const sidebarActions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      {/* 🛡️ إنشاء مصروف جديد */}
      <SecureAction module="expenses" action="create">
        <button className="btn-main-glass gold" onClick={logic.handleAddNew}>
          ➕ إضافة مصروف جديد
        </button>
      </SecureAction>

      {logic.selectedIds.length > 0 && (
        <>
          <p style={{fontSize:'10px', textAlign:'center', color:'#94a3b8', fontWeight:900, marginBottom:'-5px'}}>الإجراءات على ({logic.selectedIds.length})</p>
          
          <SecureAction module="expenses" action="edit">
            <button className="btn-main-glass blue" onClick={() => logic.setIsBulkFixModalOpen(true)}>
              🛠️ تصحيح مجمع
            </button>
          </SecureAction>

          {logic.selectedIds.length === 1 && (
            <SecureAction module="expenses" action="edit">
              <button className="btn-main-glass white" onClick={logic.handleEditSelected}>
                ✏️ تعديل السجل
              </button>
            </SecureAction>
          )}

          <SecureAction module="expenses" action="post">
            <button className="btn-main-glass green" onClick={logic.handlePostSelected}>🚀 اعتماد وترحيل</button>
          </SecureAction>

          <SecureAction module="expenses" action="post">
            <button className="btn-main-glass yellow" onClick={logic.handleUnpostSelected}>↩️ فك الترحيل</button>
          </SecureAction>

          <SecureAction module="expenses" action="delete">
            <button className="btn-main-glass red" onClick={logic.handleDeleteSelected}>🗑️ حذف نهائي</button>
          </SecureAction>
        </>
      )}

      {/* زر التصدير متاح دائماً لمن لديه حق العرض */}
      <button className="btn-main-glass white" onClick={logic.exportToExcel}>
        📊 تصدير Excel
      </button>
    </div>
  );

  return (
    <div className="clean-page">
      <RawasiSidebarManager 
        summary={
          <div className="summary-glass-card">
            <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي مصروفات الفترة 📉</span>
            <div className="val" style={{fontSize:'24px', fontWeight:900, color: THEME.primary, marginTop:'5px'}}>{formatCurrency(logic.totalAmount)}</div>
            <div style={{fontSize:'11px', color:'#10b981', fontWeight:800, marginTop:'5px'}}>إجمالي القيود: {logic.filteredExpenses.length}</div>
          </div>
        }
        actions={sidebarActions}
        customFilters={
          <div style={{marginTop: '10px'}}>
             <label style={{color: 'white', fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px'}}>عرض السجلات</label>
             <select 
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, outline: 'none', cursor: 'pointer' }} 
                value={logic.rowsPerPage} 
                onChange={e => { logic.setRowsPerPage(Number(e.target.value)); logic.setCurrentPage(1); }}
             >
               <option value="50" style={{color:'#000'}}>50 سجل</option>
               <option value="100" style={{color:'#000'}}>100 سجل</option>
               <option value="500" style={{color:'#000'}}>500 سجل</option>
             </select>
          </div>
        }
        onSearch={logic.setGlobalSearch}
        watchDeps={[logic.selectedIds, logic.totalAmount, logic.rowsPerPage, logic.filteredExpenses.length]}
      />

      <style>{`
        /* 🚀 سحر المسافات والهوامش السلبية الموحد */
        .clean-page { 
            padding: 30px 20px 30px 0px !important; 
            margin-right: -25px !important; 
            direction: rtl; 
            background: transparent; 
            min-height: 100vh; 
        }

        .table-glass-wrapper {
            background: rgba(255,255,255,0.5);
            backdrop-filter: blur(10px);
            border-radius: 24px 0 0 24px !important; 
            padding: 10px;
            border: 1px solid rgba(255,255,255,0.7);
            border-right: none !important; 
            transition: all 0.3s ease;
        }

        @media (max-width: 768px) {
            .clean-page { padding: 15px !important; margin-right: -10px !important; }
            .table-glass-wrapper { border-radius: 24px !important; border-right: 1px solid rgba(255,255,255,0.7) !important; }
        }

        .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-main-glass.gold { background: linear-gradient(135deg, rgba(197, 160, 89, 0.9), rgba(151, 115, 50, 1)); color: white; }
        .btn-main-glass.blue { background: linear-gradient(135deg, rgba(14, 165, 233, 0.8), rgba(2, 132, 199, 0.9)); color: white; }
        .btn-main-glass.green { background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(22, 163, 74, 0.9)); color: white; }
        .btn-main-glass.yellow { background: linear-gradient(135deg, rgba(245, 158, 11, 0.8), rgba(217, 119, 6, 0.9)); color: white; }
        .btn-main-glass.white { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255,255,255,0.8); }
        .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .btn-main-glass:hover { transform: translateY(-3px); filter: brightness(1.1); }
        
        .summary-glass-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); padding: 20px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 25px; }
        
        .rawasi-table th { padding: 15px; border-bottom: 2px solid rgba(0,0,0,0.05); color: #64748b; font-weight: 900; font-size: 12px; }
        .rawasi-table td { padding: 15px; border-bottom: 1px solid rgba(0,0,0,0.02); font-size: 13px; font-weight: 700; color: #1e293b; }
        .rawasi-table tbody tr { transition: 0.2s; }
        .rawasi-table tbody tr:hover { background: rgba(197, 160, 89, 0.08) !important; }
        
        .custom-checkbox { width: 20px; height: 20px; accent-color: ${THEME.goldAccent}; cursor: pointer; transition: 0.1s; }
        @keyframes modalEntrance { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>

      <div style={{ marginBottom: '30px', paddingRight: '15px' }}>
          <h1 style={{ fontWeight: 900, fontSize: '34px', color: '#0f172a', margin: 0, letterSpacing: '-1px' }}>سجل المصروفات الموحد</h1>
          <p style={{ color: '#64748b', fontSize: '15px', fontWeight: 600 }}>إدارة التكاليف والمشتريات وتوزيع بنود العمل</p>
      </div>

      <div style={{ marginBottom: '20px', paddingRight: '15px', zIndex: 100, position: 'relative' }}>
        <SmartCombo 
            placeholder="🔍 بحث سريع في المصروفات، المشاريع، أو الموردين..."
            initialDisplay={logic.globalSearch}
            onSelect={(val: any) => logic.setGlobalSearch(typeof val === 'object' ? val.name : val)}
            enableClear={true}
            freeText={true}
          />
      </div>

      {(logic.isLoading || permsLoading) ? (
        <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8' }}>⏳ جاري المزامنة...</div>
      ) : (
        <div className="table-glass-wrapper cinematic-scroll" style={{ overflowX: 'auto' }}>
          <table className="rawasi-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                  <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                          <input 
                              type="checkbox" 
                              className="custom-checkbox"
                              onChange={() => { if (logic.selectedIds.length === logic.filteredExpenses.length && logic.filteredExpenses.length > 0) logic.setSelectedIds([]); else logic.setSelectedIds(logic.filteredExpenses.map((l:any) => l.id)); }} 
                              checked={logic.filteredExpenses.length > 0 && logic.selectedIds.length === logic.filteredExpenses.length}
                          />
                      </th>
                      <th>التاريخ</th>
                      <th>المقاول/المستفيد</th>
                      <th>المشروع</th>
                      <th>البيان التفصيلي</th>
                      <th>الضريبة</th>
                      <th>الخصم</th>
                      <th>الإجمالي</th>
                      <th>ملاحظات</th>
                      <th style={{ textAlign: 'center' }}>الحالة</th>
                  </tr>
              </thead>
              <tbody>
                  {logic.filteredExpenses.length === 0 ? (
                      <tr>
                          <td colSpan={10} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontWeight: 800 }}>لا توجد مصروفات مطابقة للبحث 📭</td>
                      </tr>
                  ) : (
                      logic.filteredExpenses.map((exp:any) => {
                          const isSelected = logic.selectedIds.includes(exp.id);
                          return (
                              <tr 
                                  key={exp.id} 
                                  style={{ cursor: 'pointer', background: isSelected ? 'rgba(202, 138, 4, 0.05)' : '' }} 
                                  onClick={() => { 
                                      if (isSelected) logic.setSelectedIds(logic.selectedIds.filter((i:any) => i !== exp.id)); 
                                      else logic.setSelectedIds([...logic.selectedIds, exp.id]); 
                                  }}
                              >
                                  <td style={{ textAlign: 'center' }}>
                                      <input type="checkbox" className="custom-checkbox" checked={isSelected} readOnly />
                                  </td>
                                  <td style={{ color: '#64748b', fontSize: '13px' }}>{exp.exp_date}</td>
                                  <td style={{ fontWeight: 900 }}>{exp.sub_contractor || exp.payee_name || '---'}</td>
                                  <td>
                                      <span style={{ fontSize:'10px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '8px', color: THEME.brand.coffee, fontWeight: 900 }}>
                                          {exp.site_ref || 'عام'}
                                      </span>
                                  </td>
                                  <td style={{ fontSize:'12px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={exp.description}>
                                      {exp.description}
                                  </td>
                                  <td>{Number(exp.vat_amount || 0).toLocaleString()}</td>
                                  <td style={{ color: THEME.ruby }}>{Number(exp.discount_amount || 0).toLocaleString()}</td>
                                  <td style={{ color: THEME.success, fontWeight: 900, fontSize: '14px' }}>
                                      {((Number(exp.quantity) * Number(exp.unit_price)) + Number(exp.vat_amount || 0) - Number(exp.discount_amount || 0)).toLocaleString()}
                                  </td>
                                  <td style={{ fontSize: '11px', color: '#94a3b8', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {exp.notes || '---'}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                      {exp.is_posted ? 
                                          <span style={{ display: 'inline-block', background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 900 }}>مُرحل ✅</span> : 
                                          <span style={{ display: 'inline-block', background: '#fff7ed', color: '#d97706', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 900 }}>معلق ⏳</span>
                                      }
                                  </td>
                              </tr>
                          );
                      })
                  )}
              </tbody>
          </table>
          
          {/* 🔢 Pagination */}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', paddingBottom: '20px' }}>
              <button disabled={logic.currentPage === 1} onClick={() => logic.setCurrentPage((p:number) => p - 1)} style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 900, cursor: logic.currentPage === 1 ? 'not-allowed' : 'pointer', opacity: logic.currentPage === 1 ? 0.5 : 1 }}>السابق</button>
              <div style={{background: THEME.primary, color:'white', padding:'10px 25px', borderRadius:'12px', fontWeight:900, boxShadow: `0 5px 15px ${THEME.primary}40`}}>صفحة {logic.currentPage} من {logic.totalPages}</div>
              <button disabled={logic.currentPage >= logic.totalPages} onClick={() => logic.setCurrentPage((p:number) => p + 1)} style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 900, cursor: logic.currentPage >= logic.totalPages ? 'not-allowed' : 'pointer', opacity: logic.currentPage >= logic.totalPages ? 0.5 : 1 }}>التالي</button>
          </div>
        </div>
      )}

      {/* 🛠️ مودال التصحيح المجمع */}
      {mounted && logic.isBulkFixModalOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(44, 34, 30, 0.5)', backdropFilter: 'blur(20px) saturate(180%) brightness(0.8)', direction: 'rtl', padding: '20px', overflowY: 'auto' }}>
          <div style={{ position: 'fixed', inset: 0 }} onClick={() => logic.setIsBulkFixModalOpen(false)} />
          <div className="cinematic-scroll" style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '32px', width: '100%', maxWidth: '600px', padding: '40px', position: 'relative', zIndex: 10, margin: 'auto', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)', animation: 'modalEntrance 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <h2 style={{ fontWeight: 900, textAlign: 'center', marginBottom: '30px', color: THEME.brand.coffee, fontSize: '24px' }}>🛠️ تصحيح الحسابات لـ ({logic.selectedIds.length}) سجل</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', zIndex: 50, position: 'relative' }}>
              <div style={{ zIndex: 60, position: 'relative' }}>
                <SmartCombo label="🧾 حساب المصروف (المدين)" table="accounts" displayCol="name" initialDisplay={logic.bulkFixAccounts.creditor_account} onSelect={(val:any)=>logic.setBulkFixAccounts({...logic.bulkFixAccounts, creditor_account: val.name})} strict={true} />
              </div>
              <div style={{ zIndex: 50, position: 'relative' }}>
                <SmartCombo label="🏦 حساب السداد (الدائن)" table="accounts" displayCol="name" initialDisplay={logic.bulkFixAccounts.payment_account} onSelect={(val:any)=>logic.setBulkFixAccounts({...logic.bulkFixAccounts, payment_account: val.name})} strict={true} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '15px', marginTop: '40px' }}>
               <button onClick={logic.handleBulkFixSave} disabled={logic.isSaving} style={{ flex: 2, padding: '18px', borderRadius: '16px', background: THEME.info, color: 'white', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '16px', boxShadow: `0 10px 25px ${THEME.info}40` }}>{logic.isSaving ? '⏳ جاري الحفظ...' : '✅ تطبيق التعديلات'}</button>
               <button onClick={()=>logic.setIsBulkFixModalOpen(false)} style={{ flex: 1, padding: '18px', borderRadius: '16px', border: '2px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 900, cursor: 'pointer', fontSize: '16px' }}>إلغاء</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 🌟 مودال التوزيع النسبي */}
      {mounted && logic.distributionPreview && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(44, 34, 30, 0.5)', backdropFilter: 'blur(20px) saturate(180%) brightness(0.8)', direction: 'rtl', padding: '20px', overflowY: 'auto' }}>
          <div style={{ position: 'fixed', inset: 0 }} onClick={() => logic.setDistributionPreview(null)} />
          <div className="cinematic-scroll" style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '32px', width: '100%', maxWidth: '800px', padding: '40px', position: 'relative', zIndex: 10, margin: 'auto', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)', animation: 'modalEntrance 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <h2 style={{ fontWeight: 900, color: THEME.purple, textAlign: 'center', marginBottom: '30px', fontSize: '24px' }}>✂️ معاينة توزيع التكلفة الذكي</h2>
            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }} className="cinematic-scroll">
                {logic.distributionPreview.map((item:any, index:number) => (
                    <div key={index} style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontWeight: 900, color: THEME.brand.coffee, fontSize: '15px' }}>🏢 {item.site_ref}</div>
                        <div style={{ background: `${THEME.info}15`, color: THEME.info, padding: '8px 15px', borderRadius: '10px', fontWeight: 900, fontSize: '13px' }}>👷 {item.workers_count} عامل ({item.ratio_percent}%)</div>
                        <div style={{ color: THEME.success, fontWeight: 900, fontSize: '20px' }}>💰 {formatCurrency(item.unit_price + item.vat_amount - item.discount_amount)}</div>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '15px', marginTop: '35px', borderTop: '1px solid #f1f5f9', paddingTop: '25px' }}>
               <button onClick={logic.confirmDistribution} disabled={logic.isSaving} style={{ flex: 2, padding: '18px', borderRadius: '16px', background: THEME.purple, color: 'white', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '16px', boxShadow: `0 10px 25px ${THEME.purple}40` }}>{logic.isSaving ? '⏳ جاري الحفظ...' : '✅ تأكيد وحفظ التقسيم'}</button>
               <button onClick={()=>logic.setDistributionPreview(null)} style={{ flex: 1, padding: '18px', borderRadius: '16px', border: '2px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 900, cursor: 'pointer', fontSize: '16px' }}>إلغاء</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 📝 مودال الإضافة والتعديل */}
      {mounted && logic.isEditModalOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'rgba(44, 34, 30, 0.5)', backdropFilter: 'blur(20px) saturate(180%) brightness(0.8)', direction: 'rtl', padding: '40px 20px', overflowY: 'auto' }}>
          <div style={{ position: 'fixed', inset: 0, zIndex: 0 }} onClick={() => logic.setIsEditModalOpen(false)} />
          <div className="cinematic-scroll" style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '32px', width: '100%', maxWidth: '980px', padding: '45px', position: 'relative', zIndex: 10, margin: 'auto', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.5)', animation: 'modalEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'35px', borderBottom:'2px dashed #f1f5f9', paddingBottom:'20px'}}>
                <h2 style={{ fontWeight: 900, color: THEME.brand.coffee, margin:0, fontSize: '28px' }}>📝 {logic.editingId ? 'تعديل بيانات المصروف' : 'تسجيل مصروف جديد'}</h2>
                <div style={{ color: THEME.accent, fontWeight: 900, fontSize: '28px' }}>{formatCurrency(modalTotalAmount)}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: logic.isDistributionEnabled ? '#f3e8ff' : '#f8fafc', padding: '20px', borderRadius: '20px', border: `2px dashed ${logic.isDistributionEnabled ? THEME.purple : '#cbd5e1'}`, marginBottom: '30px', transition: '0.3s' }}>
              <input type="checkbox" id="distToggle" checked={logic.isDistributionEnabled} onChange={(e) => logic.setIsDistributionEnabled(e.target.checked)} style={{ width: '25px', height: '25px', accentColor: THEME.purple, cursor: 'pointer' }} />
              <label htmlFor="distToggle" style={{ fontWeight: 900, color: logic.isDistributionEnabled ? THEME.purple : '#64748b', cursor: 'pointer', fontSize: '16px' }}>✂️ تفعيل التوزيع التلقائي على مشاريع اليوم (حسب العمالة)</label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.brand.coffee, display: 'block', marginBottom: '8px' }}>📅 تاريخ المصروف *</label>
                <input type="date" style={{ width: '100%', padding: '15px', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, color: '#1e293b', outline: 'none' }} value={logic.currentExpense.exp_date || ''} onChange={e => logic.setCurrentExpense({...logic.currentExpense, exp_date: e.target.value})} />
              </div>
              <div style={{ zIndex: 90, position: 'relative' }}>
                <SmartCombo 
                    label="🏢 المشروع / العقار" 
                    table="projects" 
                    displayCol="Property" 
                    disabled={logic.isDistributionEnabled} 
                    initialDisplay={logic.isDistributionEnabled ? "سيتم التوزيع آلياً..." : logic.currentExpense.site_ref} 
                    onSelect={(val:any)=>logic.setCurrentExpense({...logic.currentExpense, site_ref: val.Property})} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' }}>
              <div style={{ zIndex: 80, position: 'relative' }}>
                  <SmartCombo label="👷 المقاول / المورد" table="partners" displayCol="name" initialDisplay={logic.currentExpense.sub_contractor} onSelect={(val:any)=>logic.setCurrentExpense({...logic.currentExpense, sub_contractor: val.name})} allowAddNew={true} requiredPermission={{module:'partners', action:'create'}} />
              </div>
              <div style={{ zIndex: 70, position: 'relative' }}>
                  <SmartCombo label="👤 المستفيد المباشر" table="partners" displayCol="name" initialDisplay={logic.currentExpense.payee_name} onSelect={(val:any)=>logic.setCurrentExpense({...logic.currentExpense, payee_name: val.name})} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', background: '#f8fafc', padding: '25px', borderRadius: '20px', marginBottom: '25px', border: '1px solid #e2e8f0' }}>
              <div style={{ zIndex: 60, position: 'relative' }}>
                  <SmartCombo label="🧾 حساب المصروف" table="accounts" displayCol="name" initialDisplay={logic.currentExpense.creditor_account} onSelect={(val:any)=>logic.setCurrentExpense({...logic.currentExpense, creditor_account: val.name})} strict={true} />
              </div>
              <div style={{ zIndex: 50, position: 'relative' }}>
                  <SmartCombo label="🏦 حساب السداد" table="accounts" displayCol="name" initialDisplay={logic.currentExpense.payment_account} onSelect={(val:any)=>logic.setCurrentExpense({...logic.currentExpense, payment_account: val.name})} strict={true} />
              </div>
            </div>
            
            <div style={{ zIndex: 40, position: 'relative', marginBottom: '25px' }}>
                <SmartCombo label="📂 البيان التفصيلي" freeText={true} initialDisplay={logic.currentExpense.description} options={logic.historicalData?.descriptions || []} onSelect={(val:any)=>logic.setCurrentExpense({...logic.currentExpense, description: typeof val === 'object' ? val.name : val})} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', background: '#f1f5f9', padding: '20px', borderRadius: '20px', marginBottom: '30px' }}>
                <div><label style={{ fontSize: '12px', fontWeight: 900, color: THEME.brand.coffee, display: 'block', marginBottom: '8px' }}>الكمية</label><input type="number" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontWeight: 700 }} value={logic.currentExpense.quantity} onChange={e => logic.setCurrentExpense({...logic.currentExpense, quantity: e.target.value})} /></div>
                <div><label style={{ fontSize: '12px', fontWeight: 900, color: THEME.brand.coffee, display: 'block', marginBottom: '8px' }}>سعر الوحدة</label><input type="number" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontWeight: 700 }} value={logic.currentExpense.unit_price} onChange={e => logic.setCurrentExpense({...logic.currentExpense, unit_price: e.target.value})} /></div>
                <div><label style={{ fontSize: '12px', fontWeight: 900, color: THEME.brand.coffee, display: 'block', marginBottom: '8px' }}>الضريبة</label><input type="number" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontWeight: 700 }} value={logic.currentExpense.vat_amount} onChange={e => logic.setCurrentExpense({...logic.currentExpense, vat_amount: e.target.value})} /></div>
                <div><label style={{ fontSize: '12px', fontWeight: 900, color: THEME.ruby, display: 'block', marginBottom: '8px' }}>الخصم (-)</label><input type="number" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${THEME.ruby}50`, outline: 'none', fontWeight: 700, color: THEME.ruby }} value={logic.currentExpense.discount_amount} onChange={e => logic.setCurrentExpense({...logic.currentExpense, discount_amount: e.target.value})} /></div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, padding: '18px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', color: '#475569', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = THEME.brand.gold} onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}>📁 إرفاق مستند (صورة / PDF)</button>
                <button onClick={isCameraOpen ? takePhoto : startCamera} style={{ flex: 1, padding: '18px', background: '#1e293b', color: 'white', borderRadius: '16px', border: 'none', fontWeight: 900, cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>{isCameraOpen ? '📸 التقاط الفاتورة' : '📷 مسح بالكاميرا'}</button>
            </div>
            {isCameraOpen && <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '20px', marginBottom: '20px', border: `4px solid ${THEME.accent}` }} />}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <input type="file" ref={fileInputRef} hidden accept="image/*,.pdf" onChange={(e) => { const file = e.target.files?.[0]; if(file) { const r = new FileReader(); r.onload = () => setImagePreview(r.result as string); r.readAsDataURL(file); } }} />

            <div style={{ display: 'flex', gap: '20px', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '30px' }}>
               <button onClick={() => logic.setIsEditModalOpen(false)} style={{ flex: 1, padding: '20px', background: 'white', borderRadius: '18px', border: '2px solid #e2e8f0', fontWeight: 900, color: '#64748b', cursor: 'pointer', fontSize: '16px' }}>إغلاق وإلغاء</button>
               {logic.isDistributionEnabled ? (
                   <button onClick={logic.calculateDistribution} disabled={logic.isSaving} style={{ flex: 2, background: THEME.purple, color: 'white', padding: '20px', borderRadius: '18px', fontWeight: 900, border: 'none', cursor: 'pointer', boxShadow: `0 15px 30px ${THEME.purple}40`, fontSize: '16px' }}>
                     ✂️ معاينة التوزيع قبل الحفظ
                   </button>
               ) : (
                   <button onClick={logic.handleSaveExpense} disabled={logic.isSaving} style={{ flex: 2, background: THEME.brand.gold, color: THEME.brand.coffee, padding: '20px', borderRadius: '18px', fontWeight: 900, border: 'none', cursor: 'pointer', boxShadow: `0 15px 30px ${THEME.brand.gold}40`, fontSize: '16px' }}>
                     {logic.isSaving ? '⏳ جاري التسجيل...' : '💾 اعتماد وتوثيق المصروف'}
                   </button>
               )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}