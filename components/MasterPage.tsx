"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom'; 
import { THEME } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

export default function MasterPage({ title, subtitle, children, headerContent }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (pathname && pathname !== '/' && !pathname.includes('login')) {
      localStorage.setItem('last_visited_route', pathname);
    }
  }, [pathname]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setUserProfile(data || { full_name: session.user.email });
      }
    };
    getUser();
  }, []);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + window.scrollY + 8, left: rect.left });
    }
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const close = () => setIsMenuOpen(false);
    if (isMenuOpen) window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [isMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="clean-page">
      <style>{`
        /* 🛠️ منع السكرول العرضي في كل الشاشات */
        html, body { overflow-x: hidden !important; margin: 0; padding: 0; }

        .clean-page { 
            padding: 25px 0px 25px 15px !important; 
            margin-right: 0px !important;           
            direction: rtl; 
            min-height: 100vh; 
        }

        .master-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 30px; 
            padding-right: 0px !important;          
            position: relative; z-index: 1000;
            animation: elegantFloat 4s ease-in-out infinite;
        }
        @keyframes elegantFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }

        .imperial-trigger {
            display: flex; align-items: center; gap: 15px;
            background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(15px);
            padding: 8px 20px 8px 8px; border-radius: 40px;
            border: 1px solid rgba(255,255,255,1); cursor: pointer; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 8px 25px rgba(0,0,0,0.05);
        }
        .imperial-trigger:hover { 
            background: white; 
            transform: translateY(-2px); 
            border-color: ${THEME.goldAccent}; 
            box-shadow: 0 12px 35px rgba(197, 160, 89, 0.15); 
        }

        .u-info-text { display: flex; flex-direction: column; text-align: right; }
        .u-name { font-size: 16px; font-weight: 900; color: #1e293b; letter-spacing: -0.3px; line-height: 1.2; }
        .u-role { font-size: 10px; font-weight: 800; color: ${THEME.goldAccent}; margin-top: 2px; }

        .avatar-frame { position: relative; width: 52px; height: 52px; }
        .avatar-frame img { width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .active-dot { position: absolute; bottom: 2px; right: 2px; width: 12px; height: 12px; background: #10b981; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(16, 185, 129, 0.5); }

        .supreme-dropdown {
            position: fixed; width: 220px; background: white; border-radius: 20px;
            padding: 8px; box-shadow: 0 20px 50px rgba(0,0,0,0.15);
            border: 1px solid rgba(0,0,0,0.05); z-index: 999999;
            transform-origin: top left;
            animation: supremeShow 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes supremeShow { from { opacity: 0; transform: translateY(-10px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

        .drop-item { display: flex; align-items: center; gap: 10px; padding: 10px 15px; border-radius: 12px; font-size: 13px; font-weight: 800; color: #475569; cursor: pointer; transition: 0.2s; direction: rtl; }
        .drop-item:hover { background: #f8fafc; color: ${THEME.goldAccent}; }
        .drop-item.logout { color: #ef4444; border-top: 1px solid #f1f5f9; margin-top: 5px; border-radius: 0 0 12px 12px; }
        .drop-item.logout:hover { background: #fef2f2; }

        .title-area h1 { font-weight: 900; fontSize: 28px; color: #0f172a; margin: 0; letterSpacing: -0.5px; }
        .title-area p { color: #64748b; fontSize: 14px; fontWeight: 600; marginTop: 4px; }

        .glass-container {
            background: rgba(255, 255, 255, 0.5); backdrop-filter: blur(15px);
            border-radius: 0px 0px 0px 32px !important; 
            padding: 20px 15px 20px 20px;           
            border: 1px solid rgba(255,255,255,0.8); border-right: none !important;
            box-shadow: -5px 0 20px rgba(0,0,0,0.02);
        }

        /* 📱 🚀 التعديل السحري للموبايل (Fullscreen Edge-to-Edge) */
        @media (max-width: 768px) {
          .clean-page { 
              padding: 0 !important; /* إلغاء الحواف الخارجية تماماً */
          }
          .master-header { 
              flex-direction: row; 
              align-items: center; 
              padding: 15px 15px 10px 15px !important; 
              margin-bottom: 0 !important; /* إلغاء المسافة بين الهيدر والداشبورد */
              background: rgba(255, 255, 255, 0.85);
              backdrop-filter: blur(10px);
              border-bottom: 1px solid rgba(0,0,0,0.05);
              border-radius: 0 0 15px 15px; /* تدوير خفيف للهيدر من تحت فقط */
              animation: none; /* إيقاف حركة التعويم في الموبايل لثبات الشاشة */
          }
          .title-area h1 { font-size: 18px !important; } /* تصغير العنوان ليناسب الموبايل */
          .title-area p { display: none; } /* إخفاء النص الفرعي لتوفير المساحة */
          
          .glass-container { 
              padding: 15px 10px !important; 
              border-radius: 0 !important; /* إلغاء الزوايا الدائرية لتلتحم بالشاشة */
              border: none !important;
              box-shadow: none !important;
              min-height: calc(100vh - 65px); /* أخذ باقي طول الشاشة بالكامل */
          }
          
          /* تبسيط كارت المستخدم في الموبايل */
          .u-info-text { display: none; }
          .imperial-trigger { padding: 0; background: transparent; border: none; box-shadow: none; }
          .imperial-trigger:hover { transform: none; box-shadow: none; border: none; }
          .avatar-frame { width: 40px; height: 40px; } /* تصغير صورة البروفايل */
        }
      `}</style>

      <header className="master-header">
        <div className="title-area">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {headerContent}
          
          <div className="imperial-trigger" ref={triggerRef} onClick={toggleMenu}>
            <div className="u-info-text">
              <span className="u-name">{userProfile?.full_name || 'جاري التحميل...'}</span>
              <span className="u-role">
                {userProfile?.role === 'super_admin' ? 'مدير عام 👑' : 'مسؤول نظام 🛡️'}
              </span>
            </div>
            <div className="avatar-frame">
              <img src={userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${userProfile?.full_name || 'U'}&background=C5A059&color=fff&bold=true`} alt="Avatar" />
              <div className="active-dot"></div>
            </div>
          </div>
        </div>
      </header>

      {mounted && isMenuOpen && typeof document !== 'undefined' && createPortal(
        <div className="supreme-dropdown" style={{ top: coords.top, left: coords.left }} onClick={(e) => e.stopPropagation()}>
            <div className="drop-item" onClick={() => router.push('/profile')}><span>👤</span> بروفيلي</div>
            <div className="drop-item" onClick={() => router.push('/settings')}><span>⚙️</span> الإعدادات</div>
            <div className="drop-item logout" onClick={handleLogout}><span>🚪</span> خروج</div>
        </div>,
        document.body
      )}

      <main className="glass-container">
        {children}
      </main>
    </div>
  );
}