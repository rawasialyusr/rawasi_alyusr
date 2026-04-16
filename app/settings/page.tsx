"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const THEME = { 
  sandLight: '#F4F1EE', sandDark: '#E6D5C3', 
  coffeeMain: '#8C6A5D', coffeeDark: '#43342E', goldAccent: '#C5A059' 
};

// 📌 تعريف كل شاشات النظام بناءً على بنية المجلدات (تم إضافة المستخلصات هنا)
const MODULES = [
  { 
    group: 'المالية والحسابات',
    items: [
      { id: 'accounts', name: 'دليل الحسابات', actions: ['view', 'add', 'edit', 'delete'] },
      { id: 'journal', name: 'قيود اليومية والترحيل', actions: ['view', 'add', 'post'] },
      { id: 'expenses', name: 'سجل المصروفات', actions: ['view', 'add', 'edit', 'delete', 'post'] },
      // 🟢 تم إضافة شاشة المستخلصات هنا للتحكم بأزرارها
      { id: 'invoices', name: 'سجل المستخلصات المالي', actions: ['view', 'add', 'edit', 'delete', 'post'] },
      { id: 'revenue', name: 'الإيرادات والمقبوضات', actions: ['view', 'add'] },
      { id: 'financial_center', name: 'المركز المالي', actions: ['view', 'print'] },
    ]
  },
  {
    group: 'إدارة المشاريع الميدانية',
    items: [
      { id: 'projects', name: 'إدارة المشاريع', actions: ['view', 'add', 'edit', 'delete'] },
      { id: 'sites', name: 'المواقع (Sites)', actions: ['view', 'add', 'edit'] },
      { id: 'boq', name: 'المقايسات وBOQ', actions: ['view', 'edit'] },
      { id: 'project_stages', name: 'مراحل التنفيذ', actions: ['view', 'edit'] },
      { id: 'daily_report', name: 'التقارير اليومية', actions: ['view', 'print'] },
    ]
  },
  {
    group: 'شؤون الموظفين والعمالة',
    items: [
      { id: 'all_emp', name: 'بيانات الموظفين', actions: ['view', 'add', 'edit'] },
      { id: 'labor', name: 'يوميات العمالة', actions: ['view', 'add', 'edit', 'post'] },
      { id: 'payroll', name: 'مسيرات الرواتب', actions: ['view', 'post', 'print'] },
      { id: 'emp_adv', name: 'السلف والعهد', actions: ['view', 'add', 'post'] },
      { id: 'emp_ded', name: 'الخصومات والجزاءات', actions: ['view', 'add', 'post'] },
      { id: 'housing', name: 'السكن والإعاشة', actions: ['view', 'edit'] },
    ]
  },
  {
    group: 'النظام والشركاء',
    items: [
      { id: 'partners', name: 'دليل الشركاء والمقاولين', actions: ['view', 'add', 'edit'] },
      { id: 'settings', name: 'إعدادات الصلاحيات', actions: ['view', 'manage_users'] },
    ]
  }
];

const ACTION_LABELS: Record<string, string> = {
  'view': '👀 عرض الشاشة',
  'add': '➕ إضافة',
  'edit': '✏️ تعديل',
  'delete': '🗑️ حذف',
  'post': '✅ ترحيل للقيود',
  'print': '🖨️ طباعة وتصدير',
  'manage_users': '👥 إدارة المستخدمين'
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('permissions');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [tempPermissions, setTempPermissions] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('username');
    if (data) setProfiles(data);
  };

  useEffect(() => { fetchProfiles(); }, []);

  // عند اختيار مستخدم، نقوم بتحميل صلاحياته الحالية أو إنشاء كائن فارغ
  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setTempPermissions(user.permissions || {});
  };

  // تغيير حالة الـ Checkbox (صح أو غلط)
  const togglePermission = (moduleId: string, action: string) => {
    setTempPermissions(prev => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || {}),
        [action]: !(prev[moduleId]?.[action] || false)
      }
    }));
  };

  // حفظ الصلاحيات في الداتابيز
  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({ permissions: tempPermissions })
      .eq('id', selectedUser.id);
      
    if (error) {
      alert("❌ حدث خطأ أثناء الحفظ. تأكد من صلاحياتك.");
    } else {
      alert("✅ تم حفظ وتحديث الصلاحيات بنجاح!");
      fetchProfiles();
    }
    setIsSaving(false);
  };

  return (
    <div className="app-container" style={{ direction: 'rtl', backgroundColor: THEME.sandLight, display: 'flex', height: '100vh', fontFamily: 'Cairo, sans-serif' }}>
      
      {/* 🟢 القائمة الجانبية */}
      <aside style={{ width: '280px', backgroundColor: THEME.coffeeDark, borderLeft: `3px solid ${THEME.goldAccent}`, padding: '30px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h2 style={{ color: THEME.goldAccent, fontWeight: 900, textAlign: 'center', marginBottom: '30px', borderBottom: `1px solid ${THEME.coffeeMain}`, paddingBottom: '15px' }}>
          ⚙️ إعدادات النظام
        </h2>
        <button onClick={() => setActiveTab('permissions')} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: 'none', fontWeight: 900, cursor: 'pointer', textAlign: 'right', backgroundColor: activeTab === 'permissions' ? THEME.goldAccent : 'rgba(255,255,255,0.05)', color: activeTab === 'permissions' ? THEME.coffeeDark : 'white' }}>
          🔐 مصفوفة الصلاحيات المتقدمة
        </button>
      </aside>

      {/* 🟢 المحتوى الرئيسي */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <header style={{ marginBottom: '30px', backgroundColor: '#fff', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: THEME.coffeeDark, margin: 0 }}>مصفوفة الصلاحيات (Access Control)</h1>
          <p style={{ color: THEME.coffeeMain, margin: '5px 0 0 0', fontWeight: 700 }}>تحكم دقيق في الأزرار والشاشات لكل مستخدم على حدة.</p>
        </header>

        {activeTab === 'permissions' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '25px' }}>
            
            {/* 1. قائمة المستخدمين */}
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)', height: 'fit-content' }}>
              <h3 style={{ color: THEME.coffeeDark, marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>اختر المستخدم</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {profiles.map(user => (
                  <button 
                    key={user.id} 
                    onClick={() => handleSelectUser(user)}
                    style={{ 
                      padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer', textAlign: 'right', fontWeight: 700, transition: '0.2s',
                      backgroundColor: selectedUser?.id === user.id ? THEME.sandDark : '#fafafa',
                      color: selectedUser?.id === user.id ? THEME.coffeeDark : '#555',
                      borderRight: selectedUser?.id === user.id ? `4px solid ${THEME.goldAccent}` : '4px solid transparent'
                    }}
                  >
                    👤 {user.username || 'مستخدم بدون اسم'}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. جدول الصلاحيات */}
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '30px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
              {!selectedUser ? (
                <div style={{ textAlign: 'center', color: '#888', padding: '50px', fontWeight: 700 }}>
                  👈 يرجى اختيار مستخدم من القائمة الجانبية لتعديل صلاحياته.
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ color: THEME.coffeeDark, margin: 0 }}>صلاحيات: <span style={{ color: THEME.goldAccent }}>{selectedUser.username}</span></h3>
                    <button onClick={handleSavePermissions} disabled={isSaving} style={{ padding: '12px 25px', backgroundColor: THEME.coffeeDark, color: 'white', borderRadius: '10px', border: 'none', fontWeight: 900, cursor: 'pointer' }}>
                      {isSaving ? 'جاري الحفظ...' : '💾 حفظ التعديلات'}
                    </button>
                  </div>

                  {/* 🟢 دمج التصحيح المعماري هنا */}
                  <div>
                    {MODULES.map((group) => (
                      <div key={group.group} style={{ marginBottom: '25px' }}>
                        <h4 style={{ color: THEME.goldAccent, borderBottom: `2px solid ${THEME.goldAccent}`, paddingBottom: '8px', margin: '0 0 15px 0' }}>
                          {group.group}
                        </h4>
                        <div style={{ border: `1px solid ${THEME.sandDark}`, borderRadius: '15px', overflow: 'hidden' }}>
                          {group.items.map((item, idx) => (
                            <div key={item.id} style={{ display: 'flex', borderBottom: idx === group.items.length - 1 ? 'none' : `1px solid ${THEME.sandDark}` }}>
                              
                              {/* اسم الشاشة الفرعية */}
                              <div style={{ width: '220px', backgroundColor: THEME.sandLight, padding: '15px', fontWeight: 900, color: THEME.coffeeDark, display: 'flex', alignItems: 'center', borderLeft: `1px solid ${THEME.sandDark}` }}>
                                {item.name}
                              </div>
                              
                              {/* الإجراءات المتاحة لهذه الشاشة */}
                              <div style={{ flex: 1, padding: '15px', display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                                {item.actions.map(action => {
                                  const isGranted = tempPermissions[item.id]?.[action] || false;
                                  return (
                                    <label key={action} style={{ 
                                      display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', transition: '0.2s',
                                      backgroundColor: isGranted ? '#DCFCE7' : '#F3F4F6',
                                      color: isGranted ? '#166534' : '#4B5563',
                                      border: `1px solid ${isGranted ? '#86EFAC' : '#E5E7EB'}`
                                    }}>
                                      <input 
                                        type="checkbox" 
                                        checked={isGranted}
                                        onChange={() => togglePermission(item.id, action)} 
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                      />
                                      <span style={{ fontSize: '13px', fontWeight: 800 }}>{ACTION_LABELS[action]}</span>
                                    </label>
                                  );
                                })}
                              </div>

                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* نهاية الدمج */}

                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}