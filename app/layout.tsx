"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    async function fetchLogo() {
      const { data } = supabase.storage.from('public0').getPublicUrl('RYC_Logo.png');
      if (data?.publicUrl) setLogoUrl(data.publicUrl);
    }
    fetchLogo();
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    if (isOpen) return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX + position.x, y: e.clientY + position.y };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: dragStartPos.current.x - e.clientX,
        y: dragStartPos.current.y - e.clientY
      });
    };
    const onMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  // القائمة المحدثة شاملة "سجل الإعاشة"
  const menuItems = [
    { title: 'الرئيسية', icon: '🏠', path: '/' },
    { title: 'إضافة يومية', icon: '📝', path: '/add-daily-report' },
    { title: 'كشف اليوميات', icon: '📋', path: '/daily_reports' },
    { title: 'المشاريع', icon: '🏗️', path: '/sites' },
    { title: 'الموظفين', icon: '👥', path: '/employees' },
    { title: 'مسحوبات', icon: '💸', path: '/labor-advance' },
    { title: 'خصومات', icon: '✂️', path: '/labor_deductions' },
    { title: 'سجل الإعاشة', icon: '🍲', path: '/housing' }, // العنصر الجديد
    { title: 'المحاسبة', icon: '💰', path: '/accounting' },
  ];

  return (
    <html lang="ar" dir="rtl">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet" />
        <style>{`
          body, html { margin: 0; padding: 0; background-color: #fdfbf9; width: 100vw; height: 100vh; overflow-x: hidden; }
          ::-webkit-scrollbar { width: 0px; background: transparent; }

          .circular-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: 9000; display: flex; align-items: center; justify-content: center;
            background: rgba(253, 251, 249, 0.4);
            backdrop-filter: blur(50px); -webkit-backdrop-filter: blur(50px);
            clip-path: circle(${isOpen ? '150%' : '0%'} at calc(100% - ${position.x + 40}px) calc(100% - ${position.y + 40}px));
            transition: clip-path 0.8s cubic-bezier(0.7, 0, 0.2, 1);
            pointer-events: ${isOpen ? 'all' : 'none'};
          }

          .grid-container {
            display: grid; 
            /* تحديث التوزيعه لتدعم 3 أعمدة في الشاشات الصغيرة و 4 أو أكثر في الكبيرة */
            grid-template-columns: repeat(3, 1fr); 
            gap: 15px; width: 95%; max-width: 900px;
            transform: scale(${isOpen ? '1' : '0.8'});
            opacity: ${isOpen ? 1 : 0};
            transition: 0.6s 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            padding: 20px;
          }

          @media (min-width: 768px) {
            .grid-container {
              grid-template-columns: repeat(4, 1fr);
              gap: 25px;
            }
          }

          .glass-menu-item {
            background: rgba(255, 255, 255, 0.7);
            border: 1px solid #d7ccc8;
            padding: 20px 10px; border-radius: 30px;
            text-align: center; cursor: pointer; transition: 0.3s;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
          }
          .glass-menu-item:hover {
            background: #fff; transform: translateY(-8px);
            box-shadow: 0 15px 30px rgba(161, 136, 127, 0.2);
            border-color: #c5a059;
          }

          .floating-action-btn {
            position: fixed; bottom: ${position.y}px; right: ${position.x}px;
            width: 80px; height: 80px; z-index: 9999;
            background: #4e342e; border: 2px solid #c5a059;
            border-radius: 50%; cursor: ${isDragging ? 'grabbing' : 'grab'};
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 15px 35px rgba(0,0,0,0.2);
            user-select: none;
            transition: transform 0.2s;
          }
          .floating-action-btn:active { transform: scale(0.9); }
        `}</style>
      </head>
      <body style={{ fontFamily: "'Cairo', sans-serif" }}>

        {logoUrl && (
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '60vw', height: '60vh', zIndex: 0, pointerEvents: 'none',
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
            <img 
              src={logoUrl} 
              alt="Background Logo" 
              style={{
                width: '100%', height: '100%', objectFit: 'contain',
                filter: 'blur(100px) opacity(0.08)',
                WebkitFilter: 'blur(100px) opacity(0.08)'
              }} 
            />
          </div>
        )}

        <div 
          className="floating-action-btn"
          onMouseDown={onMouseDown}
          onClick={() => !isDragging && setIsOpen(!isOpen)}
        >
          <span style={{ color: '#c5a059', fontSize: '35px', transition: '0.4s', transform: isOpen ? 'rotate(135deg)' : 'none' }}>
            {isOpen ? '✕' : '☰'}
          </span>
        </div>

        <nav className="circular-overlay">
          <div className="grid-container">
            {menuItems.map((item, index) => (
              <div 
                key={index}
                onClick={() => { router.push(item.path); setIsOpen(false); }}
                className="glass-menu-item"
              >
                <div style={{ fontSize: '35px', marginBottom: '8px' }}>{item.icon}</div>
                <div style={{ fontWeight: '900', fontSize: '14px', color: '#4e342e', whiteSpace: 'nowrap' }}>{item.title}</div>
              </div>
            ))}
          </div>
        </nav>

        <main style={{ 
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          filter: isOpen ? 'blur(15px)' : 'none',
          transition: 'filter 0.5s ease'
        }}>
          {children}
        </main>

      </body>
    </html>
  );
}