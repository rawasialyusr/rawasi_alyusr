"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useViolationsLogic } from './violations_logic'; 
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { usePermissions } from '@/lib/PermissionsContext'; 
import SecureAction from '@/components/SecureAction';      
import SmartCombo from '@/components/SmartCombo'; 
import { useSidebar } from '@/lib/SidebarContext'; 

export default function ViolationsPage() {
  const logic = useViolationsLogic();
  const [mounted, setMounted] = useState(false);
  const { can, loading: permsLoading } = usePermissions();
  const { setSidebarContent } = useSidebar(); 

  // 📷 إعدادات الكاميرا
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // 🛡️ إعداد السايد بار (مؤمن ومستقر)
  useEffect(() => {
    const sidebarActions = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <SecureAction module="violations" action="create">
          <button className="btn-main-glass gold" onClick={() => logic.handleEdit()}>
              📸 تسجيل مخالفة جديدة
          </button>
        </SecureAction>
        
        {logic.selectedIds.length > 0 && (
          <>
            <p style={{fontSize:'10px', textAlign:'center', color:'#94a3b8', fontWeight:900, marginBottom:'-5px'}}>الإجراءات على ({logic.selectedIds.length})</p>
            <SecureAction module="violations" action="post">
              <button className="btn-main-glass blue" onClick={logic.handlePostSelected}>🚀 ترحيل المخالفات</button>
            </SecureAction>
            <SecureAction module="violations" action="delete">
              <button className="btn-main-glass red" onClick={logic.handleDelete}>🗑️ حذف نهائي</button>
            </SecureAction>
          </>
        )}
      </div>
    );

    const summary = (
        <div className="summary-glass-card">
            <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي قيمة المخالفات ⚠️</span>
            <div className="val" style={{fontSize:'24px', fontWeight:900, color: THEME.ruby, marginTop:'5px'}}>{formatCurrency(logic.totalSumFromDB)}</div>
            <div style={{fontSize:'11px', color:'#10b981', fontWeight:800, marginTop:'5px'}}>عدد المخالفات: {logic.totalCount}</div>
        </div>
    );

    setSidebarContent({ actions: sidebarActions, summary, customFilters: null });
    return () => setSidebarContent({ actions: null, summary: null, customFilters: null });
  }, [logic.selectedIds.join(','), logic.totalSumFromDB, logic.totalCount, can]);

  // 📷 فتح الكاميرا (يفضل الكاميرا الخلفية للموبايل)
  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { 
      alert("❌ الكاميرا غير متاحة أو تحتاج إذن."); 
      setIsCameraOpen(false); 
    }
  };

  // 📸 التقاط الصورة
  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      
      const imageDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8); // ضغط الصورة 80%
      logic.setEditingRecord({ ...logic.editingRecord, image_url: imageDataUrl });
      stopCamera();
    }
  };

  // 🛑 إغلاق الكاميرا
  const stopCamera = () => {
    if (videoRef.current?.srcObject) { 
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop()); 
    }
    setIsCameraOpen(false);
  };

  return (
    <div className="clean-page">
      <style>{`
        .clean-page { padding: 30px 20px 30px 0px !important; margin-right: -25px !important; direction: rtl; background: transparent; min-height: 100vh; }
        .table-glass-wrapper { background: rgba(255,255,255,0.5); backdrop-filter: blur(10px); border-radius: 24px 0 0 24px !important; padding: 10px; border: 1px solid rgba(255,255,255,0.7); border-right: none !important; transition: all 0.3s ease; }
        @media (max-width: 768px) { .clean-page { padding: 15px !important; margin-right: -10px !important; } .table-glass-wrapper { border-radius: 24px !important; border-right: 1px solid rgba(255,255,255,0.7) !important; } }
        .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-main-glass.gold { background: linear-gradient(135deg, rgba(197, 160, 89, 0.9), rgba(151, 115, 50, 1)); color: white; }
        .btn-main-glass.blue { background: linear-gradient(135deg, rgba(14, 165, 233, 0.8), rgba(2, 132, 199, 0.9)); color: white; }
        .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .btn-main-glass:hover { transform: translateY(-3px); filter: brightness(1.1); }
        .btn-glass-print { background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.5); padding: 7px 12px; border-radius: 10px; cursor: pointer; font-weight: 800; color: #475569;}
        .summary-glass-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); padding: 20px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 25px; }
        .rawasi-table th { padding: 15px; border-bottom: 2px solid rgba(0,0,0,0.05); color: #64748b; font-weight: 900; font-size: 13px; }
        .rawasi-table td { padding: 15px; border-bottom: 1px solid rgba(0,0,0,0.02); font-size: 13px; font-weight: 700; color: #1e293b; }
        .custom-checkbox { width: 20px; height: 20px; accent-color: ${THEME.ruby}; cursor: pointer; transition: 0.1s; }
      `}</style>

      {/* العناوين */}
      <div style={{ marginBottom: '30px', paddingRight: '15px' }}>
          <h1 style={{ fontWeight: 900, fontSize: '34px', color: '#0f172a', margin: 0 }}>سجل رصد المخالفات 📸</h1>
          <p style={{ color: '#64748b', fontSize: '15px', fontWeight: 600 }}>رصد وإدارة مخالفات العمالة وتوثيقها بالصور من الموقع</p>
      </div>

      {(logic.loading || permsLoading) ? (
        <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8' }}>⏳ جاري تحميل البيانات...</div>
      ) : (
        <div className="table-glass-wrapper cinematic-scroll" style={{ overflowX: 'auto' }}>
          <table className="rawasi-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>تحديد</th>
                <th>التاريخ</th>
                <th>الموظف / العامل</th>
                <th>المهنة</th>
                <th>الموقع</th>
                <th>نوع المخالفة</th>
                <th>الدليل 📸</th>
                <th>الغرامة 💰</th>
                <th style={{ textAlign: 'center' }}>تعديل</th>
              </tr>
            </thead>
            <tbody>
              {logic.displayedViolations.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 900 }}>🔍 لا توجد مخالفات مسجلة</td></tr>
              ) : logic.displayedViolations.map((v:any) => (
                    <tr key={v.id}>
                      <td style={{ textAlign: 'center' }}><input type="checkbox" className="custom-checkbox" checked={logic.selectedIds.includes(String(v.id))} onChange={() => logic.setSelectedIds(prev => prev.includes(String(v.id)) ? prev.filter(i => i !== String(v.id)) : [...prev, String(v.id)])} /></td>
                      <td style={{ color: '#64748b' }}>{v.date}</td>
                      <td style={{ fontWeight: 900, color: THEME.primary }}>{v.emp_name}</td>
                      <td style={{ color: '#64748b', fontSize: '12px' }}>{v.profession || '---'}</td>
                      <td style={{ color: '#64748b', fontSize: '12px' }}>{v.site_name || '---'}</td>
                      <td style={{ color: THEME.ruby, fontWeight: 800 }}>{v.reason}</td>
                      <td>{v.image_url ? <img src={v.image_url} alt="دليل" style={{width:'40px', height:'40px', borderRadius:'8px', border:'1px solid #ccc', objectFit: 'cover'}} /> : 'لا يوجد'}</td>
                      <td style={{ fontWeight: 900, color: THEME.ruby, fontSize: '15px' }}>{formatCurrency(v.amount)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {can('violations', 'edit') && (
                            <button onClick={() => logic.handleEdit(v)} className="btn-glass-print">✏️</button>
                        )}
                      </td>
                    </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 📸 مودال تسجيل وتصوير المخالفة */}
      {mounted && logic.isEditModalOpen && logic.editingRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 99999, overflowY: 'auto', padding: '40px 20px' }}>
          <div style={{ background: 'white', padding: '35px', borderRadius: '30px', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', animation: 'modalEntrance 0.3s ease-out' }}>
            <h3 style={{fontWeight:900, marginBottom:'25px', fontSize:'22px', borderBottom:'2px dashed #f1f5f9', paddingBottom:'15px', color: THEME.ruby}}>
                📸 توثيق مخالفة جديدة
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{fontSize:'12px', fontWeight:900, color:THEME.primary, display:'block', marginBottom:'8px'}}>📅 تاريخ المخالفة</label>
                <input type="date" value={logic.editingRecord.date || ''} onChange={(e) => logic.setEditingRecord({...logic.editingRecord, date: e.target.value})} style={{padding:'14px', borderRadius:'12px', border:'2px solid #e2e8f0', width:'100%', fontWeight:800, outline: 'none'}} />
              </div>
              <div style={{ zIndex: 100 }}>
                {/* 🛡️ الربط مع الدالة السحرية لسحب المهنة والموقع */}
                <SmartCombo 
                    label="👷 العامل المخالف" 
                    table="partners" // غيرها لـ employees لو جدولك اسمه كده
                    displayCol="name"
                    freeText={true} 
                    initialDisplay={logic.editingRecord.emp_name} 
                    onSelect={(v:any) => logic.handleEmployeeSelect(v)} 
                />
              </div>
            </div>

            {/* ✨ الحقول الجديدة اللي بتتملى أوتوماتيك (المهنة والموقع) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{fontSize:'12px', fontWeight:900, color:'#64748b', display:'block', marginBottom:'8px'}}>🛠️ المهنة</label>
                <input type="text" value={logic.editingRecord.profession || ''} readOnly style={{padding:'14px', borderRadius:'12px', width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0', fontWeight: 800, color: '#1e293b'}} placeholder="تُسحب تلقائياً..." />
              </div>
              <div>
                <label style={{fontSize:'12px', fontWeight:900, color:'#64748b', display:'block', marginBottom:'8px'}}>📍 الموقع الحالي (من اليومية)</label>
                <input type="text" value={logic.editingRecord.site_name || ''} readOnly style={{padding:'14px', borderRadius:'12px', width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0', fontWeight: 800, color: '#1e293b'}} placeholder="يُسحب تلقائياً..." />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{fontSize:'12px', fontWeight:900, color:THEME.primary, display:'block', marginBottom:'8px'}}>📝 نوع / وصف المخالفة</label>
                <input type="text" placeholder="مثال: عدم ارتداء معدات السلامة" value={logic.editingRecord.reason || ''} onChange={(e) => logic.setEditingRecord({...logic.editingRecord, reason: e.target.value})} style={{padding:'14px', borderRadius:'12px', border:'2px solid #e2e8f0', width:'100%', fontWeight:800, outline: 'none'}} />
            </div>

            <div style={{ marginBottom: '30px' }}>
                <label style={{fontSize:'12px', fontWeight:900, color:THEME.ruby, display:'block', marginBottom:'8px'}}>💰 قيمة الغرامة / الخصم</label>
                <input type="number" value={logic.editingRecord.amount} onChange={(e) => logic.setEditingRecord({...logic.editingRecord, amount: Number(e.target.value)})} style={{padding:'14px', borderRadius:'12px', border:`2px solid ${THEME.ruby}40`, width:'100%', fontWeight:900, fontSize:'18px', color:THEME.ruby, outline: 'none', background: '#fef2f2'}} />
            </div>

            {/* 📷 منطقة الكاميرا والصورة */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '2px dashed #cbd5e1', marginBottom: '30px', textAlign: 'center' }}>
                {!isCameraOpen && !logic.editingRecord.image_url && (
                    <button onClick={startCamera} style={{ background: '#1e293b', color: 'white', padding: '15px 30px', borderRadius: '15px', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '15px' }}>
                        📷 فتح الكاميرا وتصوير المخالفة
                    </button>
                )}

                {isCameraOpen && (
                    <div style={{ position: 'relative' }}>
                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '15px', border: `4px solid ${THEME.ruby}` }} />
                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                            <button onClick={takePhoto} style={{ flex: 2, background: THEME.ruby, color: 'white', padding: '15px', borderRadius: '12px', fontWeight: 900, border: 'none', cursor: 'pointer' }}>📸 التقط الصورة الآن</button>
                            <button onClick={stopCamera} style={{ flex: 1, background: '#cbd5e1', color: '#1e293b', padding: '15px', borderRadius: '12px', fontWeight: 900, border: 'none', cursor: 'pointer' }}>إلغاء</button>
                        </div>
                    </div>
                )}

                {logic.editingRecord.image_url && !isCameraOpen && (
                    <div>
                        <img src={logic.editingRecord.image_url} alt="مخالفة" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '15px', border: '2px solid #e2e8f0', marginBottom: '15px' }} />
                        <button onClick={() => logic.setEditingRecord({...logic.editingRecord, image_url: null})} style={{ background: '#fef2f2', color: THEME.ruby, padding: '10px 20px', borderRadius: '10px', fontWeight: 900, border: `1px solid ${THEME.ruby}50`, cursor: 'pointer' }}>🗑️ حذف الصورة وإعادة الالتقاط</button>
                    </div>
                )}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={logic.handleSaveUpdate} style={{ flex: 2, background: THEME.ruby, color: 'white', padding: '18px', borderRadius: '15px', border: 'none', fontWeight: 900, cursor: 'pointer', fontSize: '16px', boxShadow:`0 10px 15px ${THEME.ruby}30` }}>💾 حفظ وتوثيق المخالفة</button>
              <button onClick={() => { stopCamera(); logic.setIsEditModalOpen(false); }} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', padding: '18px', borderRadius: '15px', border: 'none', fontWeight: 900, cursor: 'pointer', fontSize: '16px' }}>إلغاء</button>
            </div>
          </div>
          <style>{`@keyframes modalEntrance { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
      )}
    </div>
  );
}