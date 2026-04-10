"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 40, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

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
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        
        body { background-color: #fcfaf7; margin: 0; font-family: 'Cairo', sans-serif; overflow-x: hidden; }

        .fab-main {
          position: fixed; bottom: ${position.y}px; right: ${position.x}px;
          width: 75px; height: 75px; z-index: 10000;
          background: linear-gradient(135deg, #2d2421 0%, #1a1513 100%);
          border: 2px solid #c5a059; border-radius: 24px; 
          cursor: ${isDragging ? 'grabbing' : 'grab'};
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4), inset 0 0 15px rgba(197, 160, 89, 0.2);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          animation: pulse-gold 3s infinite;
        }

        @keyframes pulse-gold {
          0% { box-shadow: 0 0 0 0 rgba(197, 160, 89, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(197, 160, 89, 0); }
          100% { box-shadow: 0 0 0 0 rgba(197, 160, 89, 0); }
        }

        .fab-main:hover { transform: scale(1.1) rotate(10deg); border-color: #e6c27a; }

        .overlay-screen {
          position: fixed; inset: 0; z-index: 9000;
          background: rgba(15, 12, 11, 0.92);
          backdrop-filter: blur(25px) saturate(180%);
          clip-path: circle(${isOpen ? '150%' : '0%'} at calc(100% - ${position.x + 37}px) calc(100% - ${position.y + 37}px));
          transition: clip-path 0.9s cubic-bezier(0.77, 0, 0.175, 1);
          pointer-events: ${isOpen ? 'all' : 'none'};
          display: flex; align-items: center; justify-content: center;
        }

        .premium-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px;
          max-width: 600px; width: 90%;
          perspective: 1000px;
        }

        .premium-card {
          background: linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01));
          border: 1px solid rgba(197, 160, 89, 0.15);
          padding: 30px 20px; border-radius: 30px; text-align: center;
          color: #fff; cursor: pointer; position: relative;
          transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
          overflow: hidden;
          opacity: ${isOpen ? '1' : '0'};
          transform: translateY(${isOpen ? '0' : '60px'}) rotateX(${isOpen ? '0' : '-20deg'});
        }

        .premium-card::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(600px circle at var(--x) var(--y), rgba(197, 160, 89, 0.2), transparent 40%);
          opacity: 0; transition: opacity 0.5s;
        }

        .premium-card:hover {
          background: rgba(197, 160, 89, 0.1);
          border-color: #c5a059;
          transform: translateY(-15px) scale(1.08);
          box-shadow: 0 25px 50px rgba(0,0,0,0.5), 0 0 20px rgba(197, 160, 89, 0.2);
        }

        .premium-card:hover .card-icon {
          transform: scale(1.3) rotate(-10deg);
          filter: drop-shadow(0 0 10px #c5a059);
        }

        .card-icon {
          font-size: 45px; margin-bottom: 15px; display: block;
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .card-label {
          font-weight: 900; font-size: 15px; color: #e6d5c3;
          letter-spacing: 1px; text-transform: uppercase;
        }

        /* Staggered Entrance */
        ${menuItems.map((_, i) => `
          .premium-card:nth-child(${i + 1}) { transition-delay: ${isOpen ? 0.1 + i * 0.07 : 0}s; }
        `).join('')}

        .content-wrap {
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          transform: ${isOpen ? 'scale(0.92) translateY(20px)' : 'scale(1)'};
          filter: ${isOpen ? 'blur(10px) brightness(0.5)' : 'none'};
          pointer-events: ${isOpen ? 'none' : 'all'};
        }
      `}</style>

      {/* الزر الرئيسي */}
      <div 
        className="fab-main" 
        onMouseDown={onMouseDown}
        onClick={() => !isDragging && setIsOpen(!isOpen)}
      >
        <div style={{ 
          transform: isOpen ? 'rotate(135deg)' : 'rotate(0)', 
          transition: 'all 0.5s ease',
          fontSize: '32px', color: '#c5a059'
        }}>
          {isOpen ? '✕' : '☰'}
        </div>
      </div>

      {/* المنيو البريميوم */}
      <nav className="overlay-screen">
        <div className="premium-grid">
          {menuItems.map((item, idx) => (
            <div 
              key={idx} 
              className="premium-card" 
              onClick={() => { router.push(item.path); setIsOpen(false); }}
            >
              <span className="card-icon">{item.icon}</span>
              <div className="card-label">{item.title}</div>
            </div>
          ))}
        </div>
      </nav>

      {/* محتوى الصفحة */}
      <div className="content-wrap">
        {children}
      </div>
    </>
  );
}