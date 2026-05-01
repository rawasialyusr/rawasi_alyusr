"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useBackupLogic } from './backup/backup_logic'; 
import { useRestoreLogic } from './restore_logic'; 

// 🛡️ المكونات السيادية - الباب الرابع[cite: 14]
import RawasiSidebarManager from '@/components/RawasiSidebarManager'; 
import MasterPage from '@/components/MasterPage';
import GlassContainer from '@/components/GlassContainer';
import { THEME } from '@/lib/theme'; 

// 🗺️ خريطة الجداول لتسهيل التحديد
const TABLE_GROUPS = [
  {
    name: "👥 الموارد البشرية والشركاء",
    tables: [
      { id: 'partners', name: 'دليل الشركاء والموظفين' },
      { id: 'all_emp', name: 'سجل الموظفين الشامل' },
      { id: 'emp_adv', name: 'سلف الموظفين' },
      { id: 'emp_ded', name: 'خصومات الموظفين' },
      { id: 'housing_services', name: 'خدمات الإعاشة والسكن' },
      { id: 'payroll_slips', name: 'مسيرات الرواتب' },
    ]
  },
  {
    name: "🏗️ المشاريع والعمليات الميدانية",
    tables: [
      { id: 'projects', name: 'بيانات المشاريع والمواقع' },
      { id: 'project_stages', name: 'مراحل إنجاز المشاريع' },
      { id: 'project_work_structure', name: 'هيكل أعمال المشاريع' },
      { id: 'boq_items', name: 'بنود المقايسات (BOQ)' },
      { id: 'boq_budget', name: 'ميزانية المقايسات' },
      { id: 'labor_daily_logs', name: 'يوميات العمالة الميدانية' },
    ]
  },
  {
    name: "🧾 المالية والمحاسبة",
    tables: [
      { id: 'accounts', name: 'دليل شجرة الحسابات' },
      { id: 'expenses', name: 'المصروفات العامة' },
      { id: 'invoices', name: 'المستخلصات والفواتير' },
      { id: 'invoice_lines', name: 'تفاصيل الفواتير' },
      { id: 'payment_vouchers', name: 'سندات الصرف' },
      { id: 'receipt_vouchers', name: 'سندات القبض' },
      { id: 'journal_headers', name: 'رؤوس القيود المحاسبية' },
      { id: 'journal_lines', name: 'تفاصيل الحركة المالية' },
    ]
  },
  {
    name: "🧱 المخازن والإمداد",
    tables: [
      { id: 'inventory', name: 'مخازن المواد والخامات' },
    ]
  }
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('backup'); 
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  
  // States الخاصة بالملف وعملية الرفع (محمية لتفادي الانهيار)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState({ text: '', type: '' }); 

  // ربط العقل المدبر (Logic Files)
  const { backupToExcel, backupToJSON, downloadTemplate } = useBackupLogic();
  const { processExcelRestore } = useRestoreLogic();

  // دوال تحديد الجداول (تصفية آمنة)
  const toggleTable = (id: string) => {
      setSelectedTables(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const selectGroup = (tableIds: string[]) => {
      const allSelected = tableIds.every(id => selectedTables.includes(id));
      if (allSelected) {
          setSelectedTables(prev => prev.filter(id => !tableIds.includes(id))); 
      } else {
          setSelectedTables(prev => Array.from(new Set([...prev, ...tableIds]))); 
      }
  };

  const selectAllTables = () => {
      const allIds = TABLE_GROUPS.flatMap(g => g.tables.map(t => t.id));
      setSelectedTables(selectedTables.length === allIds.length ? [] : allIds);
  };

  // 🚀 دالة الرفع التفاعلية المجهزة للتجزئة (Atomic Chunking)
  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setUploadMsg({ text: '⏳ جاري تحليل الملف وربط المعرفات الذكية...', type: 'loading' });

    try {
      await processExcelRestore(selectedFile);
      setUploadMsg({ text: '✅ تم الاستيراد بنجاح! تم تطبيق الحماية ضد التكرار.', type: 'success' });
      setSelectedFile(null); 
      // تفريغ الرسالة بعد 5 ثوانٍ
      setTimeout(() => setUploadMsg({ text: '', type: '' }), 5000);
    } catch (err: any) {
      setUploadMsg({ text: `❌ فشل: ${err.message || 'تأكد من استخدام النماذج المعتمدة.'}`, type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const selectedCount = selectedTables.length;

  // 🚀 بناء محتوى السايد بار (RawasiSidebarManager) - الباب الثاني[cite: 14]
  const sidebarContent = useMemo(() => {
      let summary = null;
      let actions = null;

      if (activeTab === 'backup') {
          summary = (
              <div className="sidebar-summary-glass">
                  <div className="icon-pulse">📦</div>
                  <p className="summary-title">الجداول المحددة</p>
                  <h3 className="summary-value">{selectedCount}</h3>
              </div>
          );
          actions = (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <button 
                      onClick={() => backupToExcel(selectedTables)} 
                      disabled={selectedCount === 0 || isUploading}
                      className={`btn-premium-glass excel ${selectedCount === 0 ? 'disabled' : ''}`}
                  >
                      <span className="btn-icon">📊</span> تصدير Excel
                  </button>
                  <button 
                      onClick={() => backupToJSON(selectedTables)} 
                      disabled={selectedCount === 0 || isUploading}
                      className={`btn-premium-glass json ${selectedCount === 0 ? 'disabled' : ''}`}
                  >
                      <span className="btn-icon">🛠️</span> تصدير JSON
                  </button>
              </div>
          );
      } else {
          // تفاصيل باقي التبويبات (الصلاحيات/الرادار) يمكن وضعها هنا
          summary = (
              <div className="sidebar-summary-glass info">
                  <div className="icon-pulse">🛡️</div>
                  <p className="summary-title" style={{color: '#3b82f6'}}>النظام محمي</p>
              </div>
          );
      }

      return { summary, actions };
  }, [activeTab, selectedCount, selectedTables, backupToExcel, backupToJSON, isUploading]);

  return (
    // 🛡️ التغليف السيادي بـ MasterPage
    <MasterPage title="إعدادات النظام والنسخ الاحتياطي" hideTitleOnMobile={true}>
      
      {/* جسر نقل الأزرار */}
      <RawasiSidebarManager 
          summary={sidebarContent.summary}
          actions={sidebarContent.actions}
          watchDeps={[activeTab, selectedCount, isUploading]} 
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeUp 0.5s ease-out' }}>
        
        {/* 🟢 التبويبات العلوية */}
        <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
          <button className={`tab-btn ${activeTab === 'permissions' ? 'active' : ''}`} onClick={() => setActiveTab('permissions')}>
            🔐 مصفوفة الصلاحيات
          </button>
          <button className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`} onClick={() => setActiveTab('backup')}>
            💾 إدارة البيانات والنماذج
          </button>
          <button className={`tab-btn ${activeTab === 'health' ? 'active' : ''}`} onClick={() => setActiveTab('health')}>
            🛡️ سلامة النظام (الرادار)
          </button>
        </div>

        {/* 🚀 قسم إدارة البيانات (الباك أب والاستور) */}
        {activeTab === 'backup' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 2fr) minmax(250px, 1fr)', gap: '30px', alignItems: 'start' }}>
            
            {/* 1. خريطة الجداول للتصدير (اليسار) */}
            <GlassContainer>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', color: THEME.primary, margin: '0 0 5px 0', fontWeight: 900 }}>📦 بنية النظام والجداول</h2>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 700 }}>حدد الجداول لتصديرها أو تحميل قوالب الإدخال.</p>
                </div>
                <button onClick={selectAllTables} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: 900, color: THEME.primary, transition: '0.2s', fontSize: '12px' }}>
                  {selectedCount === TABLE_GROUPS.flatMap(g => g.tables).length ? 'إلغاء الكل' : 'تحديد الكل'}
                </button>
              </div>

              <div className="cinematic-scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', maxHeight: '600px', overflowY: 'auto', paddingRight: '5px' }}>
                {TABLE_GROUPS.map((group, gIdx) => (
                  <div key={gIdx} className="group-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h3 style={{ margin: 0, fontSize: '13px', color: THEME.primary, fontWeight: 900 }}>{group.name}</h3>
                      <button onClick={() => selectGroup(group.tables.map(t => t.id))} style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontWeight: 900, fontSize: '11px' }}>تحديد</button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {group.tables.map(table => (
                        <div key={table.id} className={`table-row ${selectedTables.includes(table.id) ? 'selected' : ''}`}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#334155', flex: 1 }}>
                            <input type="checkbox" className="custom-checkbox" checked={selectedTables.includes(table.id)} onChange={() => toggleTable(table.id)} />
                            {table.name}
                          </label>
                          <button onClick={() => downloadTemplate(table.id, table.name)} className="template-btn" title="تحميل قالب إدخال فارغ">
                            📥
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </GlassContainer>

            {/* 2. منطقة الاستيراد (اليمين) */}
            <GlassContainer>
              <h3 style={{ margin: '0 0 5px 0', color: THEME.primary, fontWeight: 900, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>🔄</span> استيراد البيانات
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 25px 0', fontWeight: 700, lineHeight: 1.6 }}>
                ارفع القوالب المعبأة (Excel) لإضافتها للنظام.
              </p>
              
              {/* Dropzone Area */}
              <label className={`premium-dropzone ${selectedFile ? 'has-file' : ''} ${isUploading ? 'uploading' : ''}`}>
                {isUploading ? (
                    <div style={{ width: '100%', padding: '20px 0' }}>
                        <div className="loading-spinner">⚙️</div>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginTop: '10px' }}>
                            جاري القراءة والمعالجة...
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ fontSize: '40px' }}>{selectedFile ? '📑' : '📂'}</div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 900, color: selectedFile ? '#059669' : THEME.primary, marginBottom: '5px' }}>
                            {selectedFile ? selectedFile.name : 'اختر ملف الإكسل للرفع'}
                            </div>
                            {!selectedFile && <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>.xlsx فقط</div>}
                        </div>
                    </>
                )}
                <input 
                  type="file" 
                  accept=".xlsx" 
                  disabled={isUploading}
                  onChange={(e) => { 
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                      setUploadMsg({ text: '', type: '' }); 
                    } 
                  }} 
                  style={{ display: 'none' }} 
                />
              </label>

              {/* Status Alert */}
              {uploadMsg.text && (
                <div className={`status-alert ${uploadMsg.type}`}>
                  {uploadMsg.text}
                </div>
              )}

              {/* Upload Button */}
              {selectedFile && !isUploading && (
                <button onClick={handleConfirmUpload} className="btn-premium-upload">
                  🚀 بدء الترحيل والاستيراد
                </button>
              )}

              {/* Security Warning */}
              <div style={{ background: '#fef2f2', border: `1px dashed #fca5a5`, padding: '15px', borderRadius: '12px', marginTop: '25px' }}>
                <div style={{ color: '#dc2626', fontWeight: 900, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>⚠️</span> تعليمات الاستيراد
                </div>
                <ul style={{ fontSize: '11px', color: '#7f1d1d', margin: '8px 0 0 0', paddingRight: '20px', lineHeight: 1.6, fontWeight: 700 }}>
                  <li>استخدم النماذج المحملة من النظام حصراً.</li>
                  <li>تجنب تعديل عناوين الأعمدة في الملف.</li>
                  <li>يتم تطبيق الحماية ضد التكرار (Upsert) آلياً.</li>
                </ul>
              </div>
            </GlassContainer>

          </div>
        )}

      </div>

      {/* 🎨 CSS Styles (Scoped) */}
      <style>{`
        /* Tab Buttons */
        .tab-btn {
          padding: 12px 24px; border-radius: 12px; border: 1px solid #e2e8f0;
          font-weight: 900; font-size: 13px; cursor: pointer; transition: 0.3s;
          background: white; color: #64748b; white-space: nowrap;
        }
        .tab-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
        .tab-btn.active {
          background: #0f172a; color: white; border-color: #0f172a;
          box-shadow: 0 4px 15px rgba(15, 23, 42, 0.2);
        }

        /* Group Cards */
        .group-card {
          background: #f8fafc; padding: 15px; border-radius: 12px;
          border: 1px solid #f1f5f9; transition: 0.2s;
        }
        .table-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 12px; background: white; border-radius: 8px; margin-top: 5px;
          border: 1px solid #e2e8f0; transition: 0.2s;
        }
        .table-row.selected { border-color: #0ea5e9; background: #f0f9ff; }
        .table-row:hover { border-color: #cbd5e1; }
        
        .custom-checkbox { width: 16px; height: 16px; cursor: pointer; }
        .template-btn { background: none; border: none; cursor: pointer; font-size: 14px; opacity: 0.5; transition: 0.2s; }
        .template-btn:hover { opacity: 1; transform: scale(1.1); }

        /* Dropzone */
        .premium-dropzone {
          background: #f8fafc; border: 2px dashed #cbd5e1;
          border-radius: 16px; padding: 30px 20px; text-align: center; cursor: pointer;
          transition: all 0.3s ease; display: flex; flex-direction: column; gap: 10px;
          justify-content: center; align-items: center;
        }
        .premium-dropzone:hover { background: white; border-color: #94a3b8; }
        .premium-dropzone.has-file { background: #f0fdf4; border-color: #10b981; border-style: solid; }
        .premium-dropzone.uploading { pointer-events: none; opacity: 0.8; border-color: #3b82f6; }

        .loading-spinner { font-size: 24px; animation: spin 2s linear infinite; }

        /* Buttons */
        .btn-premium-upload {
          background: #0f172a; color: white;
          padding: 14px; border-radius: 12px; border: none; font-weight: 900; font-size: 14px;
          cursor: pointer; transition: 0.2s; width: 100%; margin-top: 15px;
        }
        .btn-premium-upload:hover { background: #1e293b; transform: translateY(-2px); }

        /* Sidebar Glass Buttons */
        .sidebar-summary-glass { background: rgba(255,255,255,0.8); padding: 20px; border-radius: 16px; text-align: center; border: 1px solid #e2e8f0; }
        .sidebar-summary-glass .icon-pulse { font-size: 30px; margin-bottom: 5px; }
        .summary-title { margin: 0; font-size: 12px; color: #64748b; font-weight: 900; }
        .summary-value { margin: 5px 0 0 0; font-weight: 900; font-size: 28px; color: #0f172a; }

        .btn-premium-glass {
          width: 100%; padding: 12px; border-radius: 12px; border: none;
          color: white; display: flex; align-items: center; justify-content: center; gap: 8px;
          cursor: pointer; font-weight: 900; font-size: 13px; transition: 0.2s;
        }
        .btn-premium-glass.excel { background: #10b981; }
        .btn-premium-glass.json { background: #3b82f6; }
        .btn-premium-glass:hover:not(.disabled) { filter: brightness(1.1); transform: translateY(-2px); }
        .btn-premium-glass.disabled { opacity: 0.5; cursor: not-allowed; }

        /* Status Alerts */
        .status-alert { padding: 12px; border-radius: 10px; font-size: 12px; font-weight: 900; text-align: center; margin-top: 15px; animation: fadeUp 0.3s; }
        .status-alert.loading { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .status-alert.success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
        .status-alert.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

        /* Animations */
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .cinematic-scroll::-webkit-scrollbar { width: 5px; }
        .cinematic-scroll::-webkit-scrollbar-track { background: transparent; }
        .cinematic-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </MasterPage>
  );
}