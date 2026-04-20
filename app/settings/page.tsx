"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import GlassContainer from '@/components/GlassContainer';
import { useBackupLogic } from './backup/backup_logic'; 
import { useRestoreLogic } from './restore/restore_logic'; 
import RawasiSidebarManager from '@/components/RawasiSidebarManager'; // 🚀 استدعاء مدير السايد بار

const THEME = { 
  sandLight: '#F4F1EE', sandDark: '#E6D5C3', 
  coffeeMain: '#8C6A5D', coffeeDark: '#43342E', goldAccent: '#C5A059',
  success: '#16a34a', danger: '#dc2626', warning: '#f59e0b'
};

// 💡 تجميع الجداول في فئات لتسهيل التحديد على المستخدم
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
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [tempPermissions, setTempPermissions] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [healthStats, setHealthStats] = useState({ orphans: 0, lastBackup: '2024-05-18' });

  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  
  // 👈 States الخاصة بالملف وعملية الرفع
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState({ text: '', type: '' }); 

  // استدعاء دوال اللوجيك
  const { backupToExcel, backupToJSON, downloadTemplate } = useBackupLogic();
  const { processExcelRestore } = useRestoreLogic();

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('username');
    if (data) setProfiles(data);
    setHealthStats(prev => ({ ...prev, orphans: 3 })); 
  };

  useEffect(() => { fetchProfiles(); }, []);

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

  // 👈 دالة الرفع التفاعلية
  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setUploadMsg({ text: '⏳ جاري فحص الملف ومطابقة الأعمدة...', type: 'loading' });

    try {
      await processExcelRestore(selectedFile);
      
      setUploadMsg({ text: '✅ تم مطابقة الأعمدة وحفظ البيانات في النظام بنجاح!', type: 'success' });
      setSelectedFile(null); 
      
      setTimeout(() => setUploadMsg({ text: '', type: '' }), 5000);
      
    } catch (err: any) {
      setUploadMsg({ text: '❌ فشل الاستيراد: ' + (err.message || 'حدث خطأ أثناء معالجة الملف'), type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  // 🚀 استخراج القيم الأساسية (Primitives) لمنع اللوب
  const selectedCount = selectedTables.length;

  // 🚀 بناء محتوى السايد بار (مركز العمليات)
  const sidebarContent = useMemo(() => {
      let summary = null;
      let actions = null;

      const actionBtnStyle: React.CSSProperties = {
          width: '100%', padding: '12px', borderRadius: '12px', 
          borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.05)', color: 'white', display: 'flex', alignItems: 'center',
          gap: '10px', cursor: 'pointer', fontWeight: 900, fontSize: '13px', transition: '0.3s', marginBottom: '8px'
      };

      if (activeTab === 'backup') {
          summary = (
              <div style={{ background: 'rgba(197, 160, 89, 0.1)', padding: '20px', borderRadius: '20px', border: `1px solid rgba(197, 160, 89, 0.3)`, textAlign: 'center' }}>
                  <div style={{ fontSize: '30px', marginBottom: '10px' }}>📦</div>
                  <p style={{ margin: 0, fontSize: '13px', color: THEME.goldAccent, fontWeight: 900 }}>الجداول المحددة</p>
                  <h3 style={{ margin: '5px 0 0 0', fontWeight: 900, fontSize: '28px', color: 'white' }}>{selectedCount}</h3>
              </div>
          );
          // 🚀 نقلنا زراير التصدير هنا عشان الصفحة تنضف
          actions = (
              <>
                  <button 
                      onClick={() => backupToExcel(selectedTables)} 
                      disabled={selectedCount === 0}
                      style={{...actionBtnStyle, background: selectedCount ? THEME.success : 'rgba(255,255,255,0.05)', opacity: selectedCount ? 1 : 0.4}}
                  >
                      <span style={{fontSize:'18px'}}>📊</span> تصدير Excel
                  </button>
                  <button 
                      onClick={() => backupToJSON(selectedTables)} 
                      disabled={selectedCount === 0}
                      style={{...actionBtnStyle, background: selectedCount ? THEME.coffeeDark : 'rgba(255,255,255,0.05)', opacity: selectedCount ? 1 : 0.4}}
                  >
                      <span style={{fontSize:'18px'}}>🛠️</span> تصدير JSON
                  </button>
              </>
          );
      } else if (activeTab === 'permissions') {
          summary = (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '20px', borderRadius: '20px', border: `1px solid rgba(16, 185, 129, 0.3)`, textAlign: 'center' }}>
                  <div style={{ fontSize: '30px', marginBottom: '10px' }}>🔐</div>
                  <p style={{ margin: 0, fontSize: '13px', color: THEME.success, fontWeight: 900 }}>إدارة الصلاحيات</p>
              </div>
          );
          actions = <button style={actionBtnStyle} onClick={() => window.print()}><span style={{fontSize:'18px'}}>🖨️</span> طباعة الصلاحيات</button>;
      } else {
          summary = (
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '20px', border: `1px solid rgba(59, 130, 246, 0.3)`, textAlign: 'center' }}>
                  <div style={{ fontSize: '30px', marginBottom: '10px' }}>🛡️</div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#3b82f6', fontWeight: 900 }}>الرادار الأمني</p>
              </div>
          );
          actions = <button style={actionBtnStyle} onClick={() => window.print()}><span style={{fontSize:'18px'}}>📑</span> طباعة التقرير</button>;
      }

      return { summary, actions };
  }, [activeTab, selectedCount]); // 🚀 الاعتماد على الأرقام والنصوص فقط

  return (
    <div style={{ direction: 'rtl', padding: '30px', fontFamily: 'Cairo, sans-serif' }}>
      
      {/* 🚀 إدراج مدير السايد بار المخفي هنا */}
      <RawasiSidebarManager 
          summary={sidebarContent.summary}
          actions={sidebarContent.actions}
          watchDeps={[activeTab, selectedCount]} 
      />

      <style>{`
        .tab-btn {
          padding: 12px 25px;
          border-radius: 12px;
          border: none;
          font-weight: 900;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          background: white;
          color: ${THEME.coffeeDark};
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .tab-btn.active {
          background: ${THEME.coffeeDark};
          color: ${THEME.goldAccent};
          border-color: ${THEME.coffeeDark};
          box-shadow: 0 4px 12px rgba(67, 52, 46, 0.2);
        }
        .action-card {
          background: white;
          padding: 25px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          transition: 0.3s;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .action-card:hover {
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
          border-color: ${THEME.goldAccent};
        }
        .custom-checkbox {
          width: 18px; height: 18px; accent-color: ${THEME.goldAccent}; cursor: pointer;
        }
      `}</style>

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

      {/* 🚀 قسم إدارة البيانات (الباك أب) */}
      {activeTab === 'backup' && (
        <div className="fade-in-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <div>
              <h1 style={{ fontWeight: 900, color: THEME.coffeeDark, margin: '0 0 5px 0' }}>مركز قواعد البيانات</h1>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>حدد الجداول التي تريد تصديرها من القائمة أدناه.</p>
            </div>
            
            {/* إحصائية سريعة */}
            <div style={{ background: THEME.sandDark, padding: '10px 20px', borderRadius: '12px', fontWeight: 900, color: THEME.coffeeDark }}>
              الجداول المحددة: <span style={{ color: THEME.danger, fontSize: '18px' }}>{selectedCount}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
            
            {/* 1. خريطة الجداول (اليسار) */}
            <GlassContainer style={{ padding: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
                <h2 style={{ fontSize: '18px', color: THEME.coffeeDark, margin: 0, fontWeight: 900 }}>📦 هيكل النظام</h2>
                <button onClick={selectAllTables} style={{ background: '#f1f5f9', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 900, color: THEME.coffeeDark }}>
                  {selectedCount === TABLE_GROUPS.flatMap(g => g.tables).length ? 'إلغاء التحديد' : 'تحديد الكل'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
                {TABLE_GROUPS.map((group, gIdx) => (
                  <div key={gIdx} style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h3 style={{ margin: 0, fontSize: '14px', color: THEME.coffeeMain, fontWeight: 900 }}>{group.name}</h3>
                      <button onClick={() => selectGroup(group.tables.map(t => t.id))} style={{ background: 'none', border: 'none', color: THEME.goldAccent, cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>تحديد</button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {group.tables.map(table => (
                        <div key={table.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'white', borderRadius: '8px', border: selectedTables.includes(table.id) ? `1px solid ${THEME.goldAccent}` : '1px solid #f1f5f9' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: THEME.coffeeDark }}>
                            <input type="checkbox" className="custom-checkbox" checked={selectedTables.includes(table.id)} onChange={() => toggleTable(table.id)} />
                            {table.name}
                          </label>
                          
                          <button onClick={() => downloadTemplate(table.id, table.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} title="تحميل قالب فارغ">
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* 👈 الاستيراد المطور بالرسائل والحالات (تم نقل التصدير للسايد بار) */}
              <div className="action-card" style={{ border: `2px dashed ${THEME.coffeeMain}` }}>
                <h3 style={{ margin: 0, color: THEME.coffeeDark, fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>📥</span> استيراد وتحديث النظام
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>ارفع ملفات (Excel/JSON) ممتلئة بالبيانات لتحديث السيستم.</p>
                
                {/* منطقة اختيار الملف */}
                <label style={{ 
                  background: selectedFile ? 'rgba(197, 160, 89, 0.1)' : '#f8fafc', 
                  padding: '20px', borderRadius: '10px', textAlign: 'center', cursor: isUploading ? 'not-allowed' : 'pointer', 
                  border: selectedFile ? `1px solid ${THEME.goldAccent}` : '1px solid #e2e8f0', 
                  transition: '0.3s', opacity: isUploading ? 0.5 : 1 
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>
                    {selectedFile ? '✅' : '📂'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: selectedFile ? THEME.coffeeDark : '#64748b' }}>
                    {selectedFile ? selectedFile.name : 'اضغط هنا لاختيار ملف'}
                  </div>
                  <input 
                    type="file" 
                    accept=".xlsx, .json" 
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

                {/* 🚀 رسائل النظام التفاعلية */}
                {uploadMsg.text && (
                  <div style={{ 
                    padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 900, textAlign: 'center', marginTop: '5px',
                    background: uploadMsg.type === 'loading' ? '#fef3c7' : uploadMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: uploadMsg.type === 'loading' ? '#b45309' : uploadMsg.type === 'success' ? '#166534' : '#991b1b',
                    border: `1px solid ${uploadMsg.type === 'loading' ? '#fcd34d' : uploadMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`
                  }}>
                    {uploadMsg.text}
                  </div>
                )}

                {/* زر الرفع يظهر فقط بعد اختيار الملف ومش أثناء الرفع */}
                {selectedFile && !isUploading && (
                  <button 
                    onClick={handleConfirmUpload}
                    style={{ 
                      background: THEME.coffeeDark, 
                      color: THEME.goldAccent, 
                      padding: '12px', 
                      borderRadius: '10px', 
                      border: 'none', 
                      fontWeight: 900, 
                      cursor: 'pointer', 
                      marginTop: '5px',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                      transition: '0.3s'
                    }}
                  >
                    🚀 تأكيد الرفع والاستعادة
                  </button>
                )}
              </div>

              {/* تحذير أمني */}
              <div style={{ background: 'rgba(220, 38, 38, 0.05)', border: `1px solid ${THEME.danger}40`, padding: '15px', borderRadius: '12px' }}>
                <div style={{ color: THEME.danger, fontWeight: 900, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚠️</span> تنبيه أمني
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '5px 0 0 0', lineHeight: 1.6 }}>
                  الاستيراد الخاطئ قد يسبب تعديل البيانات الحالية. تأكد دائماً من تطابق رؤوس الأعمدة مع القوالب المعتمدة.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* باقي التبويبات (الصلاحيات والرادار) توضع هنا */}
      {activeTab === 'permissions' && (<div>{/* كود الصلاحيات */}</div>)}
      {activeTab === 'health' && (<div>{/* كود الرادار */}</div>)}

    </div>
  );
}