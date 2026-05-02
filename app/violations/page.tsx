"use client";
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useViolationsLogic } from './violations_logic'; 
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { usePermissions } from '@/lib/PermissionsContext'; 
import SecureAction from '@/components/SecureAction';      
import SmartCombo from '@/components/SmartCombo'; 
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';

/**
 * صفحة سجل رصد المخالفات - رواسي اليسر V11
 * تلتزم بمعايير الباب الأول (معمارية الموديولات) والباب الرابع (الهوية البصرية)
 */
export default function ViolationsPage() {
  // استدعاء أحادي للعقل المدبر وفقاً للميثاق
  const logic = useViolationsLogic();
  const [mounted, setMounted] = useState(false);
  const { can, loading: permsLoading } = usePermissions();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // تعريف الأعمدة مع الالتزام بحراس الرندر (Render Guards)
  const columns = useMemo(() => [
    { 
      header: 'التاريخ', 
      accessor: 'date', 
      render: (row: any) => {
        if (!row) return null; // حارس الرندر الإلزامي
        return <span style={{ color: '#64748b', fontWeight: 900 }}>{row.date}</span>;
      }
    },
    { 
      header: 'الموظف / العامل', 
      accessor: 'emp_name', 
      render: (row: any) => {
        if (!row) return null;
        return <b style={{ color: THEME.primary }}>{row.emp_name}</b>;
      }
    },
    { 
      header: 'المهنة', 
      accessor: 'profession', 
      render: (row: any) => {
        if (!row) return null;
        return <span style={{ fontSize: '12px', fontWeight: 700 }}>{row.profession || '---'}</span>;
      }
    },
    { 
      header: 'نوع المخالفة', 
      accessor: 'reason', 
      render: (row: any) => {
        if (!row) return null;
        return <span style={{ color: THEME.ruby, fontWeight: 800 }}>{row.reason}</span>;
      }
    },
    { 
      header: 'الدليل 📸', 
      accessor: 'image_url', 
      render: (row: any) => {
        if (!row) return null;
        return row.image_url ? (
          <img src={row.image_url} alt="دليل" style={{width:'45px', height:'45px', borderRadius:'10px', border:'2px solid #e2e8f0', objectFit: 'cover'}} />
        ) : (
          <span style={{color: '#94a3b8', fontSize: '11px', fontWeight: 800}}>لا يوجد</span>
        );
      } 
    },
    { 
      header: 'الغرامة 💰', 
      accessor: 'amount', 
      render: (row: any) => {
        if (!row) return null;
        return <span style={{ fontWeight: 900, color: THEME.ruby, fontSize: '15px' }}>{formatCurrency(row.amount)}</span>;
      }
    },
    {
      header: 'الحالة',
      accessor: 'is_posted',
      render: (row: any) => {
        if (!row) return null;
        return row.is_posted ? 
          <span className="badge-glass green">مُرحل ✅</span> : 
          <span className="badge-glass yellow">معلق ⏳</span>;
      }
    },
    {
      header: 'تعديل',
      accessor: 'actions',
      render: (row: any) => {
        if (!row) return null;
        return (
          can('violations', 'edit') && !row.is_posted ? (
            <button onClick={(e) => { e.stopPropagation(); logic.actions.handleEdit(row); }} className="btn-glass-print">✏️</button>
          ) : <span style={{color:'#94a3b8', fontSize:'11px', fontWeight: 900}}>مقفل</span>
        );
      }
    }
  ], [can, logic.actions]);

  // جسر الترحيل للأكشنز عبر SidebarManager[cite: 9]
  const sidebarActions = useMemo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <SecureAction module="violations" action="create">
        <button className="btn-main-glass gold" onClick={() => logic.actions.handleEdit()}>📸 تسجيل مخالفة جديدة</button>
      </SecureAction>
      
      {logic.state.selectedIds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '5px', paddingTop: '15px', borderTop: '1px dashed rgba(255,255,255,0.2)' }}>
          <p style={{fontSize:'11px', textAlign:'center', color:'#94a3b8', fontWeight:900, margin:0}}>تم تحديد ({logic.state.selectedIds.length}) سجل</p>
          
          <SecureAction module="violations" action="post">
            <button className="btn-main-glass green" onClick={logic.actions.handlePost}>🚀 ترحيل المخالفات</button>
          </SecureAction>
          
          <SecureAction module="violations" action="post">
            <button className="btn-main-glass yellow" onClick={logic.actions.handleUnpost}>↩️ فك الترحيل</button>
          </SecureAction>
          
          <SecureAction module="violations" action="delete">
            <button className="btn-main-glass red" onClick={logic.actions.handleDelete}>🗑️ حذف نهائي</button>
          </SecureAction>
        </div>
      )}
    </div>
  ), [logic.state.selectedIds, logic.actions]);

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

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const imageDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
      logic.state.setEditingRecord({ ...logic.state.editingRecord, image_url: imageDataUrl });
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) { 
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop()); 
    }
    setIsCameraOpen(false);
  };

  return (
    <>
      <div className="clean-page">
        <MasterPage title="سجل رصد المخالفات 📸" subtitle="رصد وإدارة مخالفات العمالة وتوثيقها بالصور والتوجيه المحاسبي التلقائي.">
            <RawasiSidebarManager 
              summary={
                <div className="summary-glass-card">
                  <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي الخصومات المفلترة ⚠️</span>
                  <div className="val" style={{fontSize:'24px', fontWeight:900, color: THEME.ruby, marginTop:'5px'}}>{formatCurrency(logic.totals.totalSum)}</div>
                  <div style={{fontSize:'11px', color:'#10b981', fontWeight:800, marginTop:'5px'}}>عدد السجلات: {logic.totals.totalCount}</div>
                </div>
              }
              actions={sidebarActions}
              customFilters={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                  <div>
                    <label style={{ color: 'white', fontSize: '11px', fontWeight: 900, display: 'block', marginBottom: '8px' }}>تصفية حسب الحالة:</label>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {['الكل', 'مرحل', 'معلق'].map(type => (
                        <button 
                          key={type} 
                          onClick={() => logic.actions.setFilterStatus(type)} 
                          className={`filter-btn ${logic.state.filterStatus === type ? 'active' : ''}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              }
              onSearch={(val) => logic.actions.setGlobalSearch(val)} 
              watchDeps={[logic.state.selectedIds, logic.totals.totalSum, logic.state.filterStatus]}
            />

            <style>{`
              .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
              .btn-main-glass.gold { background: linear-gradient(135deg, rgba(197, 160, 89, 0.9), rgba(151, 115, 50, 1)); color: white; }
              .btn-main-glass.green { background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(22, 163, 74, 0.9)); color: white; }
              .btn-main-glass.yellow { background: linear-gradient(135deg, rgba(245, 158, 11, 0.8), rgba(217, 119, 6, 0.9)); color: white; }
              .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
              .btn-main-glass:hover { transform: translateY(-3px); filter: brightness(1.1); }
              .summary-glass-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); padding: 20px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 25px; }
              .filter-btn { flex: 1; padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.1); color: white; border: none; font-weight: 900; cursor: pointer; font-size: 11px; transition: 0.3s; }
              .filter-btn.active { background: ${THEME.goldAccent}; color: #1e293b; }
              .badge-glass { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 900; display: inline-block; }
              .badge-glass.green { background: #ecfdf5; color: #059669; }
              .badge-glass.yellow { background: #fff7ed; color: #d97706; }
              .btn-glass-print { background: rgba(0, 0, 0, 0.03); border: 1px solid rgba(0, 0, 0, 0.1); padding: 8px 14px; border-radius: 12px; cursor: pointer; transition: 0.2s; }
              .btn-glass-print:hover { background: rgba(0,0,0,0.08); transform: translateY(-2px); }
            `}</style>

            {(logic.isLoading || permsLoading) ? (
              <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8' }}>⏳ جاري المزامنة...</div>
            ) : (
              <RawasiSmartTable 
                  data={logic.data} 
                  columns={columns} 
                  selectable={true}
                  selectedIds={logic.state.selectedIds}
                  onSelectionChange={logic.actions.setSelectedIds}
                  enablePagination={true}
                  rowsPerPage={50}
              />
            )}
        </MasterPage>
      </div>

      {/* مودال تسجيل المخالفة باستخدام Portal لإدارة الطبقات والبحث الذكي[cite: 9] */}
      {mounted && logic.state.isEditModalOpen && logic.state.editingRecord && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 999999, padding: '5vh 20px', overflowY: 'auto' }}>
          
          <div style={{ background: 'white', padding: '35px', borderRadius: '24px', width: '100%', maxWidth: '650px', direction: 'rtl', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', margin: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '2px dashed #f1f5f9' }}>
                <h3 style={{fontWeight:900, fontSize:'20px', color: THEME.ruby, margin: 0}}>📸 توثيق مخالفة وإصدار غرامة</h3>
                <button onClick={() => { stopCamera(); logic.state.setIsEditModalOpen(false); }} style={{ background: '#f1f5f9', border: 'none', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer', fontWeight: 900, color: '#64748b' }}>✕</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>📅 تاريخ المخالفة</label>
                <input type="date" value={logic.state.editingRecord.date || ''} onChange={(e) => logic.state.setEditingRecord({...logic.state.editingRecord, date: e.target.value})} style={{ padding: '14px', borderRadius: '14px', border: '2px solid #e2e8f0', width: '100%', fontWeight: 800, outline: 'none', background: '#f8fafc' }} />
              </div>
              <div style={{ zIndex: 100 }}>
                <SmartCombo 
                    label="👷 العامل المخالف" 
                    table="partners"
                    displayCol="name"
                    freeText={true} 
                    initialDisplay={logic.state.editingRecord.emp_name} 
                    onSelect={(v:any) => logic.actions.handleEmployeeSelect(v)} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>🛠️ المهنة</label>
                <input type="text" value={logic.state.editingRecord.profession || ''} readOnly style={{ padding: '14px', borderRadius: '14px', border: '2px solid #e2e8f0', width: '100%', fontWeight: 800, outline: 'none', background: '#f8fafc', opacity: 0.7 }} placeholder="تُسحب تلقائياً..." />
              </div>
              <div style={{ zIndex: 90 }}>
                <SmartCombo 
                    label="📍 الموقع (مركز التكلفة)" 
                    table="projects"
                    displayCol="Property"
                    initialDisplay={logic.state.editingRecord.site_name} 
                    onSelect={(v:any) => logic.state.setEditingRecord({...logic.state.editingRecord, site_name: v?.Property, project_id: v?.id})} 
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>📝 نوع / وصف المخالفة</label>
                <input type="text" placeholder="مثال: عدم ارتداء معدات السلامة أثناء العمل" value={logic.state.editingRecord.reason || ''} onChange={(e) => logic.state.setEditingRecord({...logic.state.editingRecord, reason: e.target.value})} style={{ padding: '14px', borderRadius: '14px', border: '2px solid #e2e8f0', width: '100%', fontWeight: 800, outline: 'none', background: '#f8fafc' }} />
            </div>

            <div style={{ marginBottom: '30px' }}>
                <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.ruby, display: 'block', marginBottom: '8px' }}>💰 قيمة الغرامة / الخصم</label>
                <input type="number" value={logic.state.editingRecord.amount || ''} onChange={(e) => logic.state.setEditingRecord({...logic.state.editingRecord, amount: Number(e.target.value)})} style={{ padding: '14px', borderRadius: '14px', border: `2px solid ${THEME.ruby}40`, width: '100%', fontWeight: 900, outline: 'none', background: '#fef2f2', color: THEME.ruby, fontSize: '20px' }} />
            </div>

            <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '20px', border: '2px dashed #cbd5e1', marginBottom: '30px', textAlign: 'center' }}>
                {!isCameraOpen && !logic.state.editingRecord.image_url && (
                    <button onClick={startCamera} style={{ background: THEME.primary, color: 'white', padding: '16px 30px', borderRadius: '14px', fontWeight: 900, border: 'none', cursor: 'pointer' }}>
                        📷 فتح الكاميرا والتقاط الدليل
                    </button>
                )}

                {isCameraOpen && (
                    <div style={{ position: 'relative' }}>
                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '16px', border: `4px solid ${THEME.ruby}` }} />
                        <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                            <button onClick={takePhoto} style={{ flex: 2, background: THEME.ruby, color: 'white', padding: '16px', borderRadius: '14px', fontWeight: 900, border: 'none' }}>📸 التقاط الصورة</button>
                            <button onClick={stopCamera} style={{ flex: 1, background: '#e2e8f0', color: '#475569', padding: '16px', borderRadius: '14px', fontWeight: 900, border: 'none' }}>إلغاء</button>
                        </div>
                    </div>
                )}

                {logic.state.editingRecord.image_url && !isCameraOpen && (
                    <div>
                        <img src={logic.state.editingRecord.image_url} alt="مخالفة" style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: '16px', border: '3px solid #e2e8f0', marginBottom: '20px' }} />
                        <button onClick={() => logic.state.setEditingRecord({...logic.state.editingRecord, image_url: null})} style={{ background: '#fef2f2', color: THEME.ruby, padding: '12px 24px', borderRadius: '12px', fontWeight: 900, border: `1px solid ${THEME.ruby}50` }}>🗑️ إعادة التصوير</button>
                    </div>
                )}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              <button onClick={logic.actions.handleSave} disabled={logic.isLoading} style={{ flex: 2, background: THEME.ruby, color: 'white', padding: '18px', borderRadius: '16px', border: 'none', fontWeight: 900, opacity: logic.isLoading ? 0.7 : 1 }}>
                  {logic.isLoading ? '⏳ جاري الحفظ...' : '💾 حفظ وتوثيق الغرامة'}
              </button>
              <button onClick={() => { stopCamera(); logic.state.setIsEditModalOpen(false); }} style={{ flex: 1, background: '#f1f5f9', color: '#475569', padding: '18px', borderRadius: '16px', border: 'none', fontWeight: 900 }}>
                  إلغاء
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}