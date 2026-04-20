"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/lib/theme';
import { useRouter } from 'next/navigation';

// 🚀 تعريف هيكل الصلاحيات المتاح في السيستم
const MODULES = [
    { id: 'invoices', name: 'الفواتير والمستخلصات', actions: ['view', 'create', 'edit', 'delete', 'post', 'stamp'] },
    { id: 'projects', name: 'إدارة المشاريع', actions: ['view', 'create', 'edit', 'delete'] },
    { id: 'partners', name: 'الشركاء والموظفين', actions: ['view', 'create', 'edit', 'delete'] },
    { id: 'accounts', name: 'الحسابات والقيود', actions: ['view', 'create', 'edit', 'post'] },
    { id: 'settings', name: 'إعدادات النظام', actions: ['view', 'restore', 'backup'] },
];

const ACTION_LABELS: Record<string, string> = {
    view: '👁️ عرض', create: '➕ إضافة', edit: '📝 تعديل', 
    delete: '🗑️ حذف', post: '🚀 ترحيل', stamp: '🔏 ختم'
};

export default function PermissionsPage() {
    const router = useRouter();
    const [profiles, setProfiles] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [userPerms, setUserPerms] = useState<Record<string, string[]>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfiles();
    }, []);

    async function fetchProfiles() {
        setLoading(true);
        const { data } = await supabase.from('profiles').select('*').order('username');
        if (data) setProfiles(data);
        setLoading(false);
    }

    // 🛡️ تحديث الصلاحيات عند اختيار مستخدم جديد مع ضمان تحويلها لمصفوفة
    useEffect(() => {
        if (selectedUser) {
            // نضمن إن الـ permissions دائماً عبارة عن Object، ولو null نخليه فاضي
            setUserPerms(selectedUser.permissions || {});
        }
    }, [selectedUser]);

    const togglePermission = (moduleId: string, action: string) => {
        // 🔒 الحماية هنا: نضمن إن currentActions مصفوفة دائماً
        const currentActions = Array.isArray(userPerms[moduleId]) ? userPerms[moduleId] : [];
        
        const newActions = currentActions.includes(action)
            ? currentActions.filter(a => a !== action)
            : [...currentActions, action];
        
        setUserPerms({ ...userPerms, [moduleId]: newActions });
    };

    const handleSave = async () => {
        if (!selectedUser) return;
        setIsSaving(true);
        const { error } = await supabase
            .from('profiles')
            .update({ permissions: userPerms })
            .eq('id', selectedUser.id);
        
        if (!error) {
            alert('✅ تم تحديث مصفوفة الصلاحيات بنجاح');
            // تحديث الداتا محلياً عشان الـ UI يتزامن
            setProfiles(prev => prev.map(p => p.id === selectedUser.id ? { ...p, permissions: userPerms } : p));
        } else {
            alert('❌ فشل الحفظ، يرجى المحاولة لاحقاً');
        }
        setIsSaving(false);
    };

    return (
        <div style={{ padding: '30px', direction: 'rtl', minHeight: '100vh' }}>
            {/* الهيدر */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: THEME.accent, marginBottom: '10px' }}>
                       🔙 عودة للإعدادات
                    </button>
                    <h1 style={{ fontWeight: 900, margin: 0, color: THEME.primary }}>🛡️ مركز التحكم في الصلاحيات</h1>
                </div>
                {selectedUser && (
                    <button className="btn btn-primary" onClick={handleSave} disabled={isSaving} style={{ padding: '12px 30px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        {isSaving ? '⌛ جاري المزامنة...' : '💾 حفظ المصفوفة النهائية'}
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px', fontWeight: 800 }}>⏳ جاري تحميل الطاقم...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '25px' }}>
                    
                    {/* القائمة اليمنى: الموظفين */}
                    <div className="table-container" style={{ padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '15px', textTransform: 'uppercase' }}>أعضاء المؤسسة</div>
                        {profiles.map(user => (
                            <div 
                                key={user.id} 
                                onClick={() => setSelectedUser(user)} 
                                style={{ 
                                    padding: '12px', borderRadius: '15px', cursor: 'pointer', marginBottom: '8px',
                                    background: selectedUser?.id === user.id ? 'rgba(197, 160, 89, 0.15)' : 'rgba(255,255,255,0.3)',
                                    border: `1px solid ${selectedUser?.id === user.id ? THEME.goldAccent : 'rgba(0,0,0,0.05)'}`,
                                    transition: '0.3s', display: 'flex', alignItems: 'center', gap: '10px'
                                }}
                            >
                                <div style={{ width: '35px', height: '35px', borderRadius: '10px', background: '#e5e5e7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                                    {user.is_admin ? '👑' : '👤'}
                                </div>
                                <div style={{ fontWeight: 800, fontSize: '13px', color: THEME.primary }}>{user.username || 'موظف جديد'}</div>
                            </div>
                        ))}
                    </div>

                    {/* القائمة اليسرى: المصفوفة */}
                    <div className="table-container" style={{ padding: '30px' }}>
                        {selectedUser ? (
                            <div className="fade-in-up">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '35px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '20px' }}>
                                    <div style={{ fontSize: '40px' }}>📑</div>
                                    <div>
                                        <h2 style={{ margin: 0, fontWeight: 900, color: THEME.primary }}>تعديل صلاحيات {selectedUser.username}</h2>
                                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>حدد الأفعال المسموح بها لكل قسم من أقسام النظام.</p>
                                    </div>
                                </div>

                                {MODULES.map(module => {
                                    // 🚀 التأمين ضد الـ TypeError
                                    const modulePermissions = Array.isArray(userPerms[module.id]) ? userPerms[module.id] : [];

                                    return (
                                        <div key={module.id} style={{ marginBottom: '25px', padding: '20px', background: 'rgba(255,255,255,0.4)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.8)' }}>
                                            <h3 style={{ fontSize: '15px', fontWeight: 900, marginBottom: '15px', color: THEME.primary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ color: THEME.goldAccent }}>●</span> {module.name}
                                            </h3>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                                {module.actions.map(action => {
                                                    // ✅ فحص آمن 100%
                                                    const isChecked = modulePermissions.includes(action);
                                                    
                                                    return (
                                                        <label key={action} style={{ 
                                                            display: 'flex', alignItems: 'center', gap: '8px', 
                                                            padding: '10px 18px', 
                                                            background: isChecked ? THEME.goldAccent : '#fff',
                                                            color: isChecked ? '#fff' : THEME.primary, 
                                                            borderRadius: '12px', 
                                                            cursor: 'pointer', transition: '0.3s', fontSize: '12px', fontWeight: 800,
                                                            border: `1px solid ${isChecked ? THEME.goldAccent : 'rgba(0,0,0,0.1)'}`,
                                                            boxShadow: isChecked ? '0 4px 12px rgba(197,160,89,0.3)' : 'none'
                                                        }}>
                                                            <input type="checkbox" style={{ display: 'none' }}
                                                                   checked={isChecked}
                                                                   onChange={() => togglePermission(module.id, action)} />
                                                            {ACTION_LABELS[action]}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎭</div>
                                <h3 style={{ fontWeight: 900 }}>الرجاء اختيار أحد الموظفين من القائمة الجانبية لعرض مصفوفة صلاحياته</h3>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}