"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useBackupLogic } from './backup/backup_logic'; 
import { useRestoreLogic } from './restore/restore_logic'; 
import RawasiSidebarManager from '@/components/RawasiSidebarManager'; 

const THEME = { 
  sandLight: '#F4F1EE', sandDark: '#E6D5C3', 
  coffeeMain: '#8C6A5D', coffeeDark: '#43342E', goldAccent: '#C5A059',
  success: '#10b981', danger: '#ef4444', warning: '#f59e0b',
  primary: '#0f172a', secondary: '#64748b'
};

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
  
  // 🚀 جلب بيانات المستخدم للكارت
  const [currentUser, setCurrentUser] = useState<any>(null);

  // States الخاصة بالملف وعملية الرفع
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState({ text: '', type: '' }); 

  const { backupToExcel, backupToJSON, downloadTemplate } = useBackupLogic();
  const { processExcelRestore } = useRestoreLogic();

  // 🚀 دالة جلب بيانات المستخدم للوحة الإعدادات
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setCurrentUser({ ...profile, email: session.user.email });
      }
    };
    fetchUser();
  }, []);

  // دوال تحديد الجداول
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

  // دالة الرفع التفاعلية
  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setUploadMsg({ text: '⏳ جاري فحص الملف ومطابقة البيانات...', type: 'loading' });

    try {
      await processExcelRestore(selectedFile);
      setUploadMsg({ text: '✅ تم استيراد البيانات وتحديث النظام بنجاح!', type: 'success' });
      setSelectedFile(null); 
      setTimeout(() => setUploadMsg({ text: '', type: '' }), 5000);
    } catch (err: any) {
      setUploadMsg({ text: '❌ فشل الاستيراد: ' + (err.message || 'تأكد من مطابقة أعمدة القالب'), type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const selectedCount = selectedTables.length;

  // بناء محتوى السايد بار
  const sidebarContent = useMemo(() => {
      let summary = null;
      let actions = null;

      if (activeTab === 'backup') {
          summary = (
              <div className="sidebar-summary-glass">
                  <div className="icon-pulse">📦</div>
                  <p className="summary-title">الجداول المحددة للتصدير</p>
                  <h3 className="summary-value">{selectedCount}</h3>
              </div>
          );
          actions = (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <button 
                      onClick={() => backupToExcel(selectedTables)} 
                      disabled={selectedCount === 0}
                      className={`btn-premium-glass excel ${selectedCount === 0 ? 'disabled' : ''}`}
                  >
                      <span className="btn-icon">📊</span> تصدير Excel
                  </button>
                  <button 
                      onClick={() => backupToJSON(selectedTables)} 
                      disabled={selectedCount === 0}
                      className={`btn-premium-glass json ${selectedCount === 0 ? 'disabled' : ''}`}
                  >
                      <span className="btn-icon">🛠️</span> تصدير JSON
                  </button>
              </div>
          );
      } else if (activeTab === 'permissions') {
          summary = (
              <div className="sidebar-summary-glass success">
                  <div className="icon-pulse">🔐</div>
                  <p className="summary-title" style={{color: THEME.success}}>إدارة الصلاحيات</p>
              </div>
          );
          actions = <button className="btn-premium-glass default"><span className="btn-icon">🖨️</span> طباعة الصلاحيات</button>;
      } else {
          summary = (
              <div className="sidebar-summary-glass info">
                  <div className="icon-pulse">🛡️</div>
                  <p className="summary-title" style={{color: '#3b82f6'}}>الرادار الأمني</p>
              </div>
          );
          actions = <button className="btn-premium-glass default"><span className="btn-icon">📑</span> طباعة التقرير</button>;
      }

      return { summary, actions };
  }, [activeTab, selectedCount, selectedTables, backupToExcel, backupToJSON]);

  return (
    <div style={{ direction: 'rtl', padding: '30px', fontFamily: 'Cairo, sans-serif' }}>
      
      <RawasiSidebarManager 
          summary={sidebarContent.summary}
          actions={sidebarContent.actions}
          watchDeps={[activeTab, selectedCount]} 
      />

      {/* 🎨 التنسيقات السينمائية والزجاجية */}
      <style>{`
        /* 🚀 ستايل كارت المستخدم الفخم */
        .user-profile-card {
            background: linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%);
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.9); border-radius: 24px;
            padding: 25px 35px; margin-bottom: 35px;
            display: flex; align-items: center; justify-content: space-between;
            box-shadow: 0 15px 35px rgba(0,0,0,0.05);
            animation: fadeDown 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .user-avatar {
            width: 70px; height: 70px; border-radius: 20px;
            background: linear-gradient(135deg, ${THEME.goldAccent}, ${THEME.coffeeMain});
            display: flex; align-items: center; justify-content: center;
            font-size: 28px; color: white; font-weight: 900;
            box-shadow: 0 10px 20px rgba(197, 160, 89, 0.3);
        }
        .user-role-badge {
            background: ${THEME.coffeeDark}; color: ${THEME.goldAccent};
            padding: 6px 14px; border-radius: 12px; font-size: 12px; font-weight: 900;
            display: inline-block; margin-top: 5px;
        }

        /* تبويبات التنقل العلوية */
        .tab-btn {
          padding: 14px 28px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05);
          font-weight: 900; font-size: 15px; cursor: pointer; transition: 0.3s;
          background: rgba(255,255,255,0.6); color: ${THEME.secondary};
          backdrop-filter: blur(10px); box-shadow: 0 4px 15px rgba(0,0,0,0.02);
        }
        .tab-btn:hover { background: rgba(255,255,255,0.9); transform: translateY(-2px); }
        .tab-btn.active {
          background: ${THEME.coffeeDark}; color: ${THEME.goldAccent};
          border-color: ${THEME.coffeeDark}; box-shadow: 0 8px 25px rgba(67, 52, 46, 0.3);
        }

        /* لوحات المحتوى الزجاجية */
        .glass-panel {
          background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px);
          border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.05); padding: 30px;
          animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* تنسيق الجداول */
        .group-card {
          background: rgba(255,255,255,0.5); padding: 20px; border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.03); transition: 0.3s;
        }
        .group-card:hover { background: white; box-shadow: 0 10px 20px rgba(0,0,0,0.03); }
        .table-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 15px; background: white; border-radius: 12px; margin-top: 8px;
          border: 1px solid #f1f5f9; transition: 0.2s;
        }
        .table-row.selected { border-color: ${THEME.goldAccent}; background: rgba(197, 160, 89, 0.05); }
        .table-row:hover { border-color: #cbd5e1; }
        
        .custom-checkbox { width: 18px; height: 18px; accent-color: ${THEME.goldAccent}; cursor: pointer; }
        .template-btn { background: none; border: none; cursor: pointer; font-size: 16px; transition: 0.2s; filter: grayscale(100%); opacity: 0.6; }
        .template-btn:hover { filter: grayscale(0%); opacity: 1; transform: scale(1.1); }

        /* منطقة الإسقاط (Dropzone) الفخمة */
        .premium-dropzone {
          background: rgba(248, 250, 252, 0.5); border: 2px dashed #cbd5e1;
          border-radius: 20px; padding: 40px 20px; text-align: center; cursor: pointer;
          transition: all 0.3s ease; display: flex; flex-direction: column; gap: 15px;
        }
        .premium-dropzone:hover { background: white; border-color: ${THEME.goldAccent}; box-shadow: 0 10px 30px rgba(197, 160, 89, 0.1); }
        .premium-dropzone.has-file { background: rgba(16, 185, 129, 0.05); border-color: ${THEME.success}; border-style: solid; }
        .premium-dropzone.uploading { pointer-events: none; opacity: 0.7; animation: pulseBorder 1.5s infinite; }

        /* أزرار الإجراءات */
        .btn-premium-upload {
          background: linear-gradient(135deg, ${THEME.coffeeDark}, #291f1a); color: ${THEME.goldAccent};
          padding: 16px; border-radius: 16px; border: none; font-weight: 900; font-size: 16px;
          cursor: pointer; box-shadow: 0 10px 25px rgba(67, 52, 46, 0.3); transition: 0.3s; width: 100%; margin-top: 15px;
        }
        .btn-premium-upload:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(67, 52, 46, 0.4); }

        /* أزرار السايد بار */
        .sidebar-summary-glass { background: rgba(255,255,255,0.1); padding: 25px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.2); text-align: center; }
        .sidebar-summary-glass .icon-pulse { font-size: 35px; margin-bottom: 10px; animation: gentleBounce 2s infinite; }
        .summary-title { margin: 0; font-size: 13px; color: ${THEME.goldAccent}; font-weight: 900; }
        .summary-value { margin: 5px 0 0 0; font-weight: 900; font-size: 32px; color: white; }

        .btn-premium-glass {
          width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);
          color: white; display: flex; align-items: center; justify-content: center; gap: 10px;
          cursor: pointer; font-weight: 900; font-size: 14px; transition: 0.3s;
        }
        .btn-premium-glass.excel { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 10px 20px rgba(16,185,129,0.3); }
        .btn-premium-glass.json { background: linear-gradient(135deg, ${THEME.coffeeDark}, #291f1a); box-shadow: 0 10px 20px rgba(67,52,46,0.3); }
        .btn-premium-glass.default { background: rgba(255,255,255,0.1); }
        .btn-premium-glass:hover:not(.disabled) { transform: translateY(-2px); filter: brightness(1.1); }
        .btn-premium-glass.disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; filter: grayscale(100%); }

        /* رسائل النظام */
        .status-alert { padding: 16px; border-radius: 12px; font-size: 13px; font-weight: 900; text-align: center; margin-top: 15px; animation: fadeUp 0.3s; }
        .status-alert.loading { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
        .status-alert.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .status-alert.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

        /* سكرول داخلي ناعم */
        .cinematic-scroll::-webkit-scrollbar { width: 6px; }
        .cinematic-scroll::-webkit-scrollbar-track { background: transparent; }
        .cinematic-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gentleBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes pulseBorder { 0% { border-color: #cbd5e1; } 50% { border-color: ${THEME.goldAccent}; } 100% { border-color: #cbd5e1; } }
      `}</style>

      {/* 🚀 كارت بيانات المستخدم الفخم */}
      <div className="user-profile-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="user-avatar">
                {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : '👤'}
            </div>
            <div>
                <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', color: THEME.primary, fontWeight: 900 }}>
                    مرحباً بك، {currentUser?.full_name || currentUser?.username || 'جاري التحميل...'} 👋
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ color: THEME.secondary, fontSize: '13px', fontWeight: 700 }}>
                        {currentUser?.email || ''}
                    </span>
                    <span className="user-role-badge">
                        {currentUser?.role === 'admin' ? '👑 مدير مسؤول' : '💼 مستخدم نظام'}
                    </span>
                </div>
            </div>
        </div>
        <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, marginBottom: '5px' }}>حالة الاتصال</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end', color: THEME.success, fontWeight: 900, fontSize: '13px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', background: THEME.success, borderRadius: '50%', boxShadow: `0 0 10px ${THEME.success}` }}></span>
                متصل ومصرح
            </div>
        </div>
      </div>

      {/* 🟢 التبويبات العلوية */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '35px', overflowX: 'auto', paddingBottom: '10px' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
          
          {/* 1. خريطة الجداول للتصدير (اليسار) */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
              <div>
                <h2 style={{ fontSize: '20px', color: THEME.primary, margin: '0 0 5px 0', fontWeight: 900 }}>📦 بنية النظام والجداول</h2>
                <p style={{ margin: 0, fontSize: '12px', color: THEME.secondary, fontWeight: 700 }}>حدد الجداول لتحميل نسخة احتياطية أو قوالب فارغة للاستيراد.</p>
              </div>
              <button onClick={selectAllTables} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900, color: THEME.primary, transition: '0.2s' }}>
                {selectedCount === TABLE_GROUPS.flatMap(g => g.tables).length ? 'إلغاء التحديد' : 'تحديد الكل'}
              </button>
            </div>

            <div className="cinematic-scroll" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxHeight: '550px', overflowY: 'auto', paddingRight: '5px' }}>
              {TABLE_GROUPS.map((group, gIdx) => (
                <div key={gIdx} className="group-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: THEME.coffeeMain, fontWeight: 900 }}>{group.name}</h3>
                    <button onClick={() => selectGroup(group.tables.map(t => t.id))} style={{ background: 'none', border: 'none', color: THEME.goldAccent, cursor: 'pointer', fontWeight: 900, fontSize: '11px' }}>تحديد المجموعة</button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {group.tables.map(table => (
                      <div key={table.id} className={`table-row ${selectedTables.includes(table.id) ? 'selected' : ''}`}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: THEME.primary, width: '100%' }}>
                          <input type="checkbox" className="custom-checkbox" checked={selectedTables.includes(table.id)} onChange={() => toggleTable(table.id)} />
                          {table.name}
                        </label>
                        
                        <button onClick={() => downloadTemplate(table.id, table.name)} className="template-btn" title="تحميل قالب إكسيل فارغ">
                          📥
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. منطقة الاستيراد (اليمين) */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignSelf: 'flex-start' }}>
            <h3 style={{ margin: '0 0 5px 0', color: THEME.primary, fontWeight: 900, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🔄</span> استيراد وتحديث
            </h3>
            <p style={{ fontSize: '12px', color: THEME.secondary, margin: '0 0 25px 0', fontWeight: 700, lineHeight: 1.6 }}>
              قم برفع القوالب المعبأة مسبقاً لإضافة البيانات دفعة واحدة للنظام.
            </p>
            
            {/* منطقة اختيار الملف التفاعلية */}
            <label className={`premium-dropzone ${selectedFile ? 'has-file' : ''} ${isUploading ? 'uploading' : ''}`}>
              <div style={{ fontSize: '40px' }}>
                {selectedFile ? '📑' : '📂'}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: selectedFile ? THEME.success : THEME.primary, marginBottom: '5px' }}>
                  {selectedFile ? selectedFile.name : 'اسحب الملف هنا أو اضغط للاختيار'}
                </div>
                {!selectedFile && <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>يدعم صيغ Excel (.xlsx)</div>}
              </div>
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

            {/* رسائل النظام التفاعلية */}
            {uploadMsg.text && (
              <div className={`status-alert ${uploadMsg.type}`}>
                {uploadMsg.text}
              </div>
            )}

            {/* زر الرفع */}
            {selectedFile && !isUploading && (
              <button onClick={handleConfirmUpload} className="btn-premium-upload">
                🚀 معالجة وترحيل البيانات
              </button>
            )}

            {/* تحذير أمني */}
            <div style={{ background: 'rgba(220, 38, 38, 0.05)', border: `1px dashed ${THEME.danger}40`, padding: '15px', borderRadius: '16px', marginTop: '25px' }}>
              <div style={{ color: THEME.danger, fontWeight: 900, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span> تنبيه أمني وإرشادات
              </div>
              <ul style={{ fontSize: '11px', color: THEME.secondary, margin: '10px 0 0 0', paddingRight: '20px', lineHeight: 1.6, fontWeight: 700 }}>
                <li>استخدم القوالب المخصصة من النظام لتجنب الأخطاء.</li>
                <li>تأكد من عدم تعديل أسماء الأعمدة في ملف الإكسيل.</li>
                <li>النظام يقوم بربط الأسماء (كالعمال والمشاريع) تلقائياً بالذكاء.</li>
              </ul>
            </div>

          </div>
        </div>
      )}

      {/* باقي التبويبات تضاف هنا */}
      {activeTab === 'permissions' && (<div>{/* كود الصلاحيات */}</div>)}
      {activeTab === 'health' && (<div>{/* كود الرادار */}</div>)}

    </div>
  );
}