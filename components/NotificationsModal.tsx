"use client";
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNotificationsLogic } from '@/app/notifications/NotificationsLogic';
import { THEME } from '@/lib/theme';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationsModal({ isOpen, onClose }: Props) {
    const { notifications, isLoading, markAsRead, markAllAsRead } = useNotificationsLogic();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div 
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 999999,
                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px', animation: 'fadeIn 0.2s ease-out'
            }}
        >
            <div 
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.95), rgba(255, 255, 255, 0.9))',
                    width: '100%', maxWidth: '700px', maxHeight: '85vh',
                    borderRadius: '24px', border: '1px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden', animation: 'scaleUp 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '25px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <div>
                        <h2 style={{ fontSize: '22px', color: THEME.primary, margin: '0 0 5px 0', fontWeight: 900 }}>🔔 مركز الإشعارات</h2>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 700 }}>
                            متابعة التنبيهات والأحداث الخاصة بك
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {notifications.some(n => !n.is_read) && (
                            <button 
                                onClick={markAllAsRead}
                                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 15px', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, transition: '0.3s', fontSize: '12px' }}
                            >
                                ✓ تحديد الكل كمقروء
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            style={{ background: '#fef2f2', color: '#ef4444', border: 'none', width: '35px', height: '35px', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div style={{ padding: '25px', overflowY: 'auto', flex: 1 }} className="cinematic-scroll">
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '50px' }}>
                            <div style={{ fontSize: '30px', animation: 'spin 1s linear infinite', marginBottom: '15px' }}>⏳</div>
                            <div style={{ fontWeight: 800, color: THEME.primary }}>جاري جلب الإشعارات...</div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px', background: 'rgba(255,255,255,0.5)', borderRadius: '20px', border: '2px dashed #cbd5e1' }}>
                            <div style={{ fontSize: '50px', marginBottom: '15px', opacity: 0.5 }}>📭</div>
                            <div style={{ fontWeight: 900, color: '#475569', fontSize: '18px' }}>لا توجد إشعارات حالياً</div>
                            <p style={{ color: '#94a3b8', margin: '5px 0 0 0', fontWeight: 700 }}>سيتم إعلامك هنا عند وجود أي تحديثات مهمة</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {notifications.map(notif => (
                                <div key={notif.id} 
                                     style={{ 
                                         background: notif.is_read ? 'white' : '#f0f9ff',
                                         padding: '20px', 
                                         borderRadius: '16px',
                                         border: `1px solid ${notif.is_read ? '#e2e8f0' : '#bae6fd'}`,
                                         boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                                         display: 'flex',
                                         alignItems: 'flex-start',
                                         gap: '15px',
                                         transition: 'all 0.3s ease'
                                     }}>
                                    <div style={{ fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>
                                        {notif.type === 'alert' ? '🚨' : notif.type === 'success' ? '✅' : notif.type === 'task' ? '📋' : '🔔'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: notif.is_read ? '#475569' : '#0f172a' }}>
                                                {notif.message || notif.content}
                                            </h4>
                                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                {new Date(notif.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                        {!notif.is_read && (
                                            <button 
                                                onClick={() => markAsRead(notif.id)}
                                                style={{ background: 'transparent', border: 'none', color: THEME.primary, fontWeight: 800, fontSize: '12px', cursor: 'pointer', padding: 0, marginTop: '5px' }}
                                            >
                                                علامة كمقروء
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <style dangerouslySetInnerHTML={{__html: `
                    @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    .cinematic-scroll::-webkit-scrollbar { width: 6px; }
                    .cinematic-scroll::-webkit-scrollbar-track { background: transparent; }
                    .cinematic-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                    .cinematic-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                `}} />
            </div>
        </div>,
        document.body
    );
}
