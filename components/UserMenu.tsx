"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/lib/theme';
import { createPortal } from 'react-dom';

export default function UserMenu({ profile }: { profile: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (!profile) return <div className="skeleton-grand"></div>;

    return (
        <div className="imperial-wrapper" ref={menuRef}>
            
            {/* 🟢 الكارت الإمبراطوري العملاق */}
            <div className={`imperial-trigger ${isOpen ? 'active' : ''}`} 
                 ref={triggerRef}
                 onClick={() => setIsOpen(!isOpen)}>
                
                <div className="imperial-info">
                    <span className="u-name-grand">{profile.full_name}</span>
                    <div className="u-badge-grand">
                        <span className="crown">👑</span>
                        {profile.role === 'super_admin' ? 'رئيس مجلس الإدارة' : 'المدير التنفيذي'}
                    </div>
                </div>
                
                <div className="avatar-frame-grand">
                    <div className="magical-glow"></div>
                    <img 
                        src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&background=C5A059&color=fff&bold=true&size=128`} 
                        alt="Grand Master" 
                    />
                    <div className="active-pulse-grand"></div>
                </div>
            </div>

            {/* 🔽 القائمة المنسدلة السينمائية */}
            {isOpen && (
                <div className="imperial-dropdown">
                    <div className="dropdown-title-c">
                        <p>لوحة تحكم القيادة العليا 🕹️</p>
                        <small>{profile.full_name}</small>
                    </div>
                    
                    <div className="dropdown-link-g" onClick={() => { router.push('/profile'); setIsOpen(false); }}>
                        <span className="icon">💎</span> البروفايل الملكي
                    </div>
                    
                    <div className="dropdown-link-g" onClick={() => { router.push('/settings'); setIsOpen(false); }}>
                        <span className="icon">🛡️</span> إعدادات المنصة السيادية
                    </div>

                    <div className="imperial-divider"></div>
                    
                    <div className="dropdown-link-g logout-grand" onClick={handleLogout}>
                        <span className="icon">🚨</span> تسجيل الخروج النهائي
                    </div>
                </div>
            )}

            <style>{`
                /* 🚀 1. التموضع والحركة السينمائية الأسطورية */
                .imperial-wrapper { 
                    position: relative; 
                    margin-right: -50px; 
                    z-index: 99999;
                    animation: grandFloat 5s ease-in-out infinite;
                }

                @keyframes grandFloat {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-15px) rotate(1deg); }
                }

                /* 🟢 2. الزرار العملاق (أكبر حجم في السيستم) */
                .imperial-trigger {
                    display: flex; align-items: center; gap: 35px;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(40px);
                    padding: 20px 50px 20px 25px; 
                    border-radius: 100px;
                    border: 4px solid white;
                    cursor: pointer; 
                    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: 0 30px 100px rgba(0,0,0,0.15), 
                                0 0 50px rgba(197, 160, 89, 0.2);
                }
                .imperial-trigger:hover, .imperial-trigger.active { 
                    transform: scale(1.08) translateX(15px); 
                    border-color: ${THEME.goldAccent};
                    box-shadow: 0 40px 120px rgba(197, 160, 89, 0.35);
                }
                
                /* 👤 3. النصوص الملكية */
                .imperial-info { display: flex; flex-direction: column; text-align: right; }
                .u-name-grand { 
                    font-size: 28px; 
                    font-weight: 1000; 
                    color: #0f172a; 
                    white-space: nowrap; 
                    letter-spacing: -1.5px;
                    line-height: 1;
                }
                .u-badge-grand { 
                    font-size: 15px; font-weight: 900; 
                    color: white; 
                    background: linear-gradient(135deg, #C5A059 0%, #8C6A5D 100%);
                    padding: 8px 20px; border-radius: 15px; 
                    margin-top: 10px; display: flex; align-items: center; gap: 8px;
                    width: fit-content; align-self: flex-end;
                    box-shadow: 0 10px 20px rgba(140, 106, 93, 0.3);
                }

                /* 📸 4. صورة الصقر (120px) */
                .avatar-frame-grand { position: relative; width: 120px; height: 120px; flex-shrink: 0; }
                .avatar-frame-grand img { 
                    width: 100%; height: 100%; 
                    border-radius: 50%; object-fit: cover; 
                    border: 6px solid white; 
                    position: relative; z-index: 2;
                    box-shadow: 0 15px 45px rgba(0,0,0,0.2);
                }
                .magical-glow {
                    position: absolute; inset: -15px;
                    background: conic-gradient(from 0deg, transparent, ${THEME.goldAccent}, transparent);
                    border-radius: 50%;
                    animation: rotateGlow 3s linear infinite;
                    z-index: 1; opacity: 0.6;
                }
                @keyframes rotateGlow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .active-pulse-grand { 
                    position: absolute; bottom: 8px; right: 8px; 
                    width: 28px; height: 28px; 
                    background: #10b981; 
                    border: 6px solid white; border-radius: 50%; 
                    box-shadow: 0 0 30px rgba(16, 185, 129, 0.8);
                    z-index: 3;
                }

                /* 🔽 5. القائمة المنسدلة (Supreme Menu) */
                .imperial-dropdown {
                    position: absolute; top: 110%; left: 0; width: 380px;
                    background: white;
                    border-radius: 50px; padding: 30px;
                    box-shadow: 0 50px 150px rgba(0,0,0,0.4);
                    border: 3px solid rgba(197, 160, 89, 0.2);
                    z-index: 100000; 
                    transform-origin: top left;
                    animation: supremeShow 0.6s cubic-bezier(0.68, -0.6, 0.32, 1.6);
                }
                @keyframes supremeShow {
                    from { opacity: 0; transform: scale(0.4) rotate(-10deg) translateY(-50px); }
                    to { opacity: 1; transform: scale(1) rotate(0) translateY(0); }
                }

                .dropdown-title-c { padding-bottom: 20px; text-align: right; }
                .dropdown-title-c p { margin: 0; font-weight: 1000; font-size: 20px; color: #0f172a; }
                .dropdown-title-c small { color: ${THEME.goldAccent}; font-weight: 800; font-size: 14px; }

                .dropdown-link-g {
                    display: flex; align-items: center; gap: 25px;
                    padding: 22px 30px; border-radius: 30px;
                    font-size: 18px; font-weight: 900; color: #475569;
                    cursor: pointer; transition: 0.3s; direction: rtl;
                }
                .dropdown-link-g:hover { 
                    background: #f8fafc; color: ${THEME.goldAccent}; 
                    transform: translateX(-15px) scale(1.05); 
                }
                .logout-grand { color: #ef4444 !important; background: #fff1f2; margin-top: 20px; }
                .logout-grand:hover { background: #ef4444 !important; color: white !important; }
                
                .imperial-divider { height: 3px; background: #f1f5f9; margin: 20px 0; border-radius: 10px; }
                .skeleton-grand { width: 350px; height: 140px; background: #eee; border-radius: 100px; }
            `}</style>
        </div>
    );
}