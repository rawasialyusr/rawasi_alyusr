"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { THEME } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context'; 
import SmartCombo from '@/components/SmartCombo'; 

interface ProfileEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: any; 
    onSave: () => void;
}

export default function ProfileEditorModal({ isOpen, onClose, record, onSave }: ProfileEditorModalProps) {
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [mounted, setMounted] = useState(false); 

    // 🧠 هيكل الصلاحيات الافتراضي الشامل
    const defaultPermissions = {
        invoices: { view: true, create: false, edit: false, delete: false, post: false },
        expenses: { view: false, create: false, edit: false, delete: false, post: false },
        emp_adv: { view: false, create: false, edit: false, delete: false, post: false },
        projects: { view: true, create: false, edit: false },
        accounts: { view: false, create: false, edit: false, delete: false },
        reports: { view: false, financial: false },
        team: { view: false, create: false, edit: false }
    };

    const [form, setForm] = useState({
        full_name: '',
        role: 'client',
        linked_partner_id: null,
        permissions: defaultPermissions
    });

    useEffect(() => {
        setMounted(true); 
        if (record && isOpen) {
            const mergedPermissions = JSON.parse(JSON.stringify(defaultPermissions)); 
            
            if (record.permissions) {
                Object.keys(defaultPermissions).forEach((moduleKey) => {
                    if (record.permissions[moduleKey]) {
                        mergedPermissions[moduleKey] = {
                            ...mergedPermissions[moduleKey],
                            ...record.permissions[moduleKey]
                        };
                    }
                });
            }

            setForm({
                full_name: record.full_name || '',
                role: record.role || 'client',
                linked_partner_id: record.linked_partner_id || null, // أصبح مطابق للـ DB
                permissions: mergedPermissions
            });
        }
    }, [record, isOpen]);

    if (!isOpen || !mounted) return null;

    const togglePerm = (module: string, action: string) => {
        setForm(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [module]: { ...(prev.permissions as any)[module], [action]: !(prev.permissions as any)[module][action] }
            }
        }));
    };

    const toggleAllInModule = (module: string) => {
        const modulePerms = (form.permissions as any)[module];
        const allActive = Object.values(modulePerms).every(v => v === true);
        const newState = !allActive;

        const updatedModule: any = {};
        Object.keys(modulePerms).forEach(key => updatedModule[key] = newState);

        setForm(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [module]: updatedModule }
        }));
    };

    // 💾 دالة الحفظ المحمية والذكية
    const handleSave = async () => {
        if (!record?.id) {
            alert("⚠️ تنبيه هندسي:\nلا يمكن إضافة مستخدم جديد يدوياً.\nاستخدم 'نسخ رابط الدعوة' ليقوم المستخدم بالتسجيل أولاً.");
            onClose(); 
            return;
        }

        setIsSaving(true);
        try {
            // 📦 تجهيز الـ Payload بدقة لمنع أخطاء 400
            const payload = {
                role: form.role,
                linked_partner_id: form.linked_partner_id,
                permissions: form.permissions,
                is_admin: form.role === 'admin',
                full_name: form.full_name
            };

            console.log("🚀 جاري إرسال البيانات (Payload):", payload);

            const { error } = await supabase
                .from('profiles')
                .update(payload)
                .eq('id', record.id);

            if (error) throw error;
            
            // نجاح العملية
            showToast(`✅ تم تحديث صلاحيات "${form.full_name}" بنجاح!`, "success");
            onSave(); 
            
        } catch (error: any) {
            // 🔍 تشريح الخطأ وطباعته لمعرفة السبب الحقيقي
            console.error("❌ Detailed Supabase Error:", {
                message: error?.message,
                details: error?.details,
                hint: error?.hint,
                code: error?.code
            });
            const errorMsg = error?.message || error?.details || "تأكد من الصلاحيات واتصال الإنترنت.";
            alert(`❌ عذراً، تعذر الحفظ!\nالسبب: ${errorMsg}`);
        } finally {
            setIsSaving(false);
        }
    };

    const moduleNames: any = {
        invoices: '📦 الفواتير والمبيعات',
        expenses: '📉 سجل المصروفات',
        emp_adv: '💸 عهد وسلف العمالة',
        projects: '🏗️ المشاريع والعقارات',
        accounts: '📒 شجرة الحسابات',
        reports: '📑 التقارير المالية',
        team: '👥 إدارة الفريق'
    };

    const modalContent = (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            
            <div 
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(10px)' }} 
                onClick={onClose} 
            />

            <style>{`
                @keyframes scaleUp {
                    0% { opacity: 0; transform: scale(0.95) translateY(10px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }

                .profile-modal-box {
                    background: #ffffff;
                    border-radius: 32px;
                    width: 900px;
                    max-width: 95vw;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 40px 80px rgba(0,0,0,0.5);
                    direction: rtl;
                    position: relative;
                    z-index: 10;
                    animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    border: 1px solid rgba(255,255,255,0.2);
                }
                
                .module-card {
                    background: #f8fafc;
                    border-radius: 20px;
                    padding: 22px;
                    margin-bottom: 15px;
                    border: 1px solid #e2e8f0;
                    transition: 0.3s;
                }
                .module-card:hover { border-color: ${THEME.primary}; background: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.03); }
                
                .perm-btn {
                    padding: 10px 18px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                    border: 2px solid #e2e8f0;
                    background: white;
                    color: #64748b;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .perm-btn:hover { border-color: #cbd5e1; color: #1e293b; }
                .perm-btn.active {
                    background: ${THEME.primary};
                    color: white;
                    border-color: ${THEME.primary};
                    box-shadow: 0 8px 20px ${THEME.primary}40;
                }
                .perm-btn:active { transform: scale(0.95); }
                
                .btn-all {
                    font-size: 11px;
                    background: #f1f5f9;
                    color: #475569;
                    border: 1px solid #e2e8f0;
                    padding: 8px 14px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: 900;
                    transition: 0.2s;
                }
                .btn-all:hover { background: #e2e8f0; color: #0f172a; border-color: #cbd5e1; }

                .modal-input {
                    width: 100%; padding: 15px 20px; border-radius: 16px; 
                    border: 2px solid #e2e8f0; font-weight: 800; font-size: 14px;
                    outline: none; transition: 0.3s; color: #1e293b; background: #f8fafc;
                }
                .modal-input:focus { border-color: ${THEME.primary}; background: white; box-shadow: 0 0 0 4px ${THEME.primary}15; }
                
                .cinematic-scroll::-webkit-scrollbar { width: 8px; }
                .cinematic-scroll::-webkit-scrollbar-track { background: transparent; }
                .cinematic-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid white; }
                .cinematic-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>

            <div className="profile-modal-box">
                
                {/* 1️⃣ الهيدر (ثابت) */}
                <div style={{ padding: '30px 40px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', flexShrink: 0 }}>
                    <div>
                        <h2 style={{ margin: 0, fontWeight: 900, color: THEME.primary, fontSize: '24px', letterSpacing: '-0.5px' }}>🛡️ مركز التحكم في الصلاحيات</h2>
                        <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>إدارة وصول المستخدم: <b style={{color: '#1e293b', fontSize: '14px'}}>{form.full_name || 'مستخدم جديد'}</b></p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', width: '38px', height: '38px', borderRadius: '50%', cursor: 'pointer', fontWeight: 900, transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>

                {/* 2️⃣ المحتوى (قابل للتمرير) */}
                <div className="cinematic-scroll" style={{ overflowY: 'auto', padding: '30px 40px', flex: 1, background: '#ffffff' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 900, color: '#475569', display: 'block', marginBottom: '10px' }}>الاسم الكامل بالمنصة</label>
                            <input 
                                type="text" 
                                className="modal-input" 
                                value={form.full_name} 
                                placeholder="اسم المستخدم..."
                                onChange={e => setForm({...form, full_name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 900, color: '#475569', display: 'block', marginBottom: '10px' }}>الرتبة (System Role)</label>
                            <select 
                                className="modal-input"
                                style={{ cursor: 'pointer' }}
                                value={form.role} 
                                onChange={e => setForm({...form, role: e.target.value})}
                            >
                                <option value="admin">👑 مدير نظام (Admin)</option>
                                <option value="staff">💼 فريق العمل (Staff)</option>
                                <option value="contractor">👷 مقاول (Contractor)</option>
                                <option value="client">👤 عميل (Client)</option>
                            </select>
                        </div>
                        <div style={{ position: 'relative', zIndex: 50 }}> 
                            <SmartCombo 
                                label="الربط المحاسبي (شريك/عميل)"
                                table="partners"
                                displayCol="name"
                                initialDisplay={record?.partners?.name}
                                placeholder="ابحث عن الشريك لربطه..."
                                onSelect={(p: any) => setForm({...form, linked_partner_id: p?.id || null})}
                                enableClear={true}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px', borderBottom: '2px dashed #f1f5f9', paddingBottom: '15px' }}>
                        <span style={{ fontSize: '20px' }}>🔐</span>
                        <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>مصفوفة الوصول المتقدمة</h3>
                    </div>
                    
                    <div style={{ display: 'grid', gap: '15px' }}>
                        {Object.keys(form.permissions).map((module) => (
                            <div key={module} className="module-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                                    <span style={{ fontWeight: 900, fontSize: '15px', color: '#1e293b' }}>{moduleNames[module] || module}</span>
                                    <button className="btn-all" onClick={() => toggleAllInModule(module)}>تحديد / إلغاء الكل</button>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {Object.keys((form.permissions as any)[module]).map((action) => (
                                        <button
                                            key={action}
                                            onClick={() => togglePerm(module, action)}
                                            className={`perm-btn ${(form.permissions as any)[module][action] ? 'active' : ''}`}
                                        >
                                            {action === 'view' ? '👁️ عرض' : 
                                             action === 'create' ? '➕ إضافة' : 
                                             action === 'edit' ? '📝 تعديل' : 
                                             action === 'delete' ? '🗑️ حذف' : 
                                             action === 'post' ? '🚀 ترحيل' : 
                                             action === 'financial' ? '💰 مالي' : action}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3️⃣ الفوتر (ثابت) */}
                <div style={{ padding: '25px 40px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '15px', background: 'white', flexShrink: 0 }}>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{ 
                            flex: 2, padding: '18px', borderRadius: '18px', border: 'none',
                            background: THEME.primary,
                            color: 'white', fontWeight: 900, fontSize: '16px', cursor: 'pointer',
                            boxShadow: `0 15px 30px ${THEME.primary}40`, transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onMouseEnter={(e) => { if(!isSaving) e.currentTarget.style.transform = 'translateY(-2px)' }}
                        onMouseLeave={(e) => { if(!isSaving) e.currentTarget.style.transform = 'translateY(0)' }}
                    >
                        {isSaving ? '⏳ جاري تحديث الصلاحيات...' : '✅ اعتماد وحفظ التغييرات'}
                    </button>
                    <button 
                        onClick={onClose} 
                        style={{ flex: 1, padding: '18px', borderRadius: '18px', border: '2px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 900, cursor: 'pointer', fontSize: '16px', transition: '0.3s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'white' }}
                    >
                        إلغاء
                    </button>
                </div>

            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}