"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // منطق السحب (Drag Logic)
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

  const menuItems = [
    { title: 'الرئيسية', icon: '🏠', path: '/' },
    { title: 'إضافة حركة', icon: '📝', path: '/add_action' },
    { title: 'كشف اليوميات', icon: '📋', path: '/daily_report' },
    { title: 'المشاريع', icon: '🏗️', path: '/sites' },
    { title: 'الموظفين', icon: '👥', path: '/all_emp' },
    { title: 'مسحوبات', icon: '💸', path: '/emp_adv' },
    { title: 'خصومات', icon: '✂️', path: '/emp_ded' },
    { title: 'سجل الإعاشة', icon: '🍲', path: '/housing' },
    { title: 'المحاسبة', icon: '💰', path: '/accounting' },
  ];

  return (
    <>
      <style>{`
        body { background-color: #fdfbf9; margin: 0; overflow-x: hidden; }
        .floating-action-btn {
          position: fixed; bottom: ${position.y}px; right: ${position.x}px;
          width: 70px; height: 70px; z-index: 9999;
          background: #4e342e; border: 2px solid #c5a059;
          border-radius: 50%; cursor: grab; display: flex;
          align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .circular-overlay {
          position: fixed; inset: 0; z-index: 9000;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.7); backdrop-filter: blur(20px);
          clip-path: circle(${isOpen ? '150%' : '0%'} at calc(100% - ${position.x + 35}px) calc(100% - ${position.y + 35}px));
          transition: clip-path 0.6s ease-in-out;
          pointer-events: ${isOpen ? 'all' : 'none'};
        }
        .grid-menu {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 20px;
        }
        .menu-card {
          background: white; padding: 20px; border-radius: 20px; text-align: center;
          border: 1px solid #e0d5c1; cursor: pointer; transition: 0.3s;
        }
        .menu-card:hover { transform: translateY(-5px); border-color: #c5a059; }
      `}</style>

      <div className="floating-action-btn" onMouseDown={onMouseDown} onClick={() => !isDragging && setIsOpen(!isOpen)}>
        <span style={{ color: '#c5a059', fontSize: '30px' }}>{isOpen ? '✕' : '☰'}</span>
      </div>

      <nav className="circular-overlay">
        <div className="grid-menu">
          {menuItems.map((item, idx) => (
            <div key={idx} className="menu-card" onClick={() => { router.push(item.path); setIsOpen(false); }}>
              <div style={{ fontSize: '30px' }}>{item.icon}</div>
              <div style={{ fontWeight: 'bold', marginTop: '10px' }}>{item.title}</div>
            </div>
          ))}
        </div>
      </nav>

      <main style={{ filter: isOpen ? 'blur(10px)' : 'none', transition: '0.4s' }}>
        {children}
      </main>
    </>
  );
}