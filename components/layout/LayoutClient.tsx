"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 40, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const [permissions, setPermissions] = useState<any>(null);
  const [userRole, setUserRole] = useState('');
  const dragStartPos = useRef({ x: 0, y: 0 });

  // 1. جلب الصلاحيات والتحقق من المستخدم
  useEffect(() => {
    const fetchAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (pathname !== '/login') router.replace('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, permissions')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        setUserRole(profile.role);
        setPermissions(profile.permissions || {});
      }
    };
    fetchAuth();
  }, [pathname, router]);

  // 2. مصفوفة المنيو الكاملة
  const menuGroups = [
    {
      group: "القيادة والمالية",
      items: [
        { id: 'home', title: 'الرئيسية', icon: '🏠', path: '/' },
        { id: 'financial-center', title: 'المركز المالي', icon: '🏦', path: '/financial-center' },
        { id: 'journal', title: 'قيود اليومية', icon: '📝', path: '/journal' },
        { id: 'accounts', title: 'دليل الحسابات', icon: '📒', path: '/accounts' },
      ]
    },
    {
      group: "المصاريف والإيرادات",
      items: [
        { id: 'expenses', title: 'المصروفات', icon: '💸', path: '/expenses' },
        { id: 'revenue', title: 'الإيرادات', icon: '💰', path: '/invoices' },
      ]
    },
    {
      group: "المشاريع والميدان",
      items: [
        { id: 'projects', title: 'المشاريع', icon: '🏗️', path: '/projects' },
        { id: 'sites', title: 'المواقع', icon: '📍', path: '/sites' },
        { id: 'boq_budget', title: 'المقايسات', icon: '📏', path: '/boq_budget' },
        { id: 'daily_report', title: 'التقرير اليومي', icon: '📄', path: '/labor_logs' },
      ]
    },
    {
      group: "الموظفين والعمالة",
      items: [
        { id: 'all_emp', title: 'الموظفين', icon: '👥', path: '/employees' },
        { id: 'labor_daily_logs', title: 'يوميات العمالة', icon: '👷', path: '/labor_daily_logs' },
        { id: 'payroll', title: 'الرواتب', icon: '💳', path: '/payroll' },
        { id: 'emp_adv', title: 'السلف', icon: '📉', path: '/emp_adv' },
        { id: 'emp_ded', title: 'الخصومات', icon: '🚫', path: '/emp_ded' },
      ]
    },
    {
      group: "النظام",
      items: [
        { id: 'partners', title: 'الشركاء', icon: '🤝', path: '/partners' },
        { id: 'settings', title: 'الصلاحيات', icon: '⚙️', path: '/settings' },
      ]
    }
  ];

  const canView = (moduleId: string) => {
    if (userRole === 'admin' || moduleId === 'home') return true;
    return permissions?.[moduleId]?.view === true;
  };

  // --- كود الـ Dragging ---
  const onMouseDown = (e: React.MouseEvent) => { 
    if (isOpen) return; 
    setIsDragging(true); 
    dragStartPos.current = { x: e.clientX - position.x, y: e.clientY + position.y }; 
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => { 
      if (!isDragging) return; 
      setPosition({ x: e.clientX - dragStartPos.current.x, y: dragStartPos.current.y - e.clientY }); 
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

  // عداد عشان نعمل أنيميشن متدرج للعناصر
  let animationDelayCounter = 0;

  if (pathname === '/login') return <>{children}</>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        
        /* 1. تأثير الزر العائم (FAB) النبض اللامع */
        @keyframes floatPulse {
          0%, 100% { box-shadow: 0 15px 35px rgba(197, 160, 89, 0.2), 0 0 0 0 rgba(197, 160, 89, 0.2); }
          50% { box-shadow: 0 15px 35px rgba(197, 160, 89, 0.4), 0 0 20px 2px rgba(197, 160, 89, 0.15); }
        }
        .fab-main {
          position: fixed; bottom: ${position.y}px; left: ${position.x}px; width: 75px; height: 75px; z-index: 10000;
          background: linear-gradient(145deg, #1A1513, #2a221d);
          border: 1px solid rgba(197, 160, 89, 0.4); border-radius: 24px;
          cursor: ${isDragging ? 'grabbing' : 'grab'};
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 15px 35px rgba(0,0,0,0.4), inset 0 2px 5px rgba(255,255,255,0.05);
          transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
          animation: floatPulse 4s infinite ease-in-out;
        }
        .fab-main::before {
          content: ''; position: absolute; inset: -2px; border-radius: 26px;
          background: linear-gradient(45deg, #C5A059, transparent, #C5A059);
          z-index: -1; opacity: 0; transition: 0.5s;
        }
        .fab-main:hover::before { opacity: 0.5; }
        .fab-main:hover { transform: scale(1.05); }

        /* 2. الشاشة الزجاجية الخلفية (Glassmorphism Overlay) */
        .overlay-screen {
          position: fixed; inset: 0; z-index: 9000;
          background: radial-gradient(circle at center, rgba(20, 20, 25, 0.85) 0%, rgba(5, 5, 10, 0.95) 100%);
          backdrop-filter: blur(25px) saturate(150%);
          clip-path: circle(${isOpen ? '150%' : '0%'} at calc(${position.x + 37.5}px) calc(100% - ${position.y + 37.5}px));
          transition: clip-path 0.8s cubic-bezier(0.77, 0, 0.175, 1);
          display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
          padding: 60px 20px; overflow-y: auto;
        }
        .command-center { width: 100%; max-width: 1200px; display: flex; flex-direction: column; gap: 40px; margin-top: 20px; }
        
        /* 3. العناوين الأنيقة */
        .group-header {
          color: #C5A059; font-weight: 900; font-size: 16px;
          border-bottom: 1px solid rgba(197, 160, 89, 0.2); padding-bottom: 12px; margin-bottom: 20px;
          text-align: right; display: block; position: relative; letter-spacing: 0.5px;
        }
        .group-header::after {
          content: ''; position: absolute; right: 0; bottom: -1px; width: 50px; height: 3px;
          background: #C5A059; border-radius: 5px;
        }

        /* 4. كروت المنيو الاحترافية مع الأنيميشن */
        @keyframes popIn {
          0% { opacity: 0; transform: translateY(30px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; }
        
        .nav-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 20px; border-radius: 20px; text-align: center; color: #fff;
          cursor: pointer; position: relative; overflow: hidden;
          display: flex; flex-direction: column; gap: 15px;
          transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          opacity: 0; /* للأنيميشن */
          animation: popIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .nav-card::before {
          content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 2px;
          background: linear-gradient(90deg, transparent, #C5A059, transparent);
          transform: translateX(-100%); transition: 0.6s ease;
        }
        .nav-card:hover::before { transform: translateX(100%); }
        
        .nav-card:hover {
          background: rgba(197, 160, 89, 0.08);
          border-color: rgba(197, 160, 89, 0.4);
          transform: translateY(-8px);
          box-shadow: 0 15px 30px rgba(197, 160, 89, 0.15);
        }

        /* الأيقونة الدائرية جوا الكارت */
        .icon-wrapper {
          background: rgba(255,255,255,0.04);
          width: 65px; height: 65px; margin: 0 auto;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 30px; transition: 0.4s;
          box-shadow: inset 0 2px 10px rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .nav-card:hover .icon-wrapper {
          background: rgba(197, 160, 89, 0.2);
          transform: scale(1.15) rotate(5deg);
          border-color: rgba(197, 160, 89, 0.4);
          box-shadow: 0 0 20px rgba(197, 160, 89, 0.3);
        }

        /* تمييز الصفحة الحالية (Active State) */
        .nav-card.active {
          background: rgba(197, 160, 89, 0.15);
          border-color: #C5A059;
          box-shadow: 0 0 20px rgba(197, 160, 89, 0.2);
        }
        .nav-card.active .icon-wrapper {
          background: #C5A059;
        }

        /* إخفاء السكرول بار لجمالية الشاشة */
        .overlay-screen::-webkit-scrollbar { width: 8px; }
        .overlay-screen::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .overlay-screen::-webkit-scrollbar-thumb { background: rgba(197, 160, 89, 0.5); border-radius: 10px; }
      `}</style>

      <div className="fab-main" onMouseDown={onMouseDown} onClick={() => !isDragging && setIsOpen(!isOpen)}>
        <div style={{ transform: isOpen ? 'rotate(135deg)' : 'rotate(0)', transition: '0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)', fontSize: '32px', color: '#C5A059' }}>
          {isOpen ? '✕' : '⊞'}
        </div>
      </div>

      <nav className="overlay-screen" onClick={() => setIsOpen(false)} style={{ pointerEvents: isOpen ? 'auto' : 'none' }}>
        <div className="command-center" onClick={(e) => e.stopPropagation()}>
          {/* لوجو الشركة أو ترحيب أعلى القائمة */}
          <div style={{ textAlign: 'center', marginBottom: '10px', opacity: isOpen ? 1 : 0, transition: '1s 0.3s' }}>
             <h2 style={{ color: 'white', fontWeight: 900, margin: 0, fontSize: '28px' }}>نظام إدارة <span style={{ color: '#C5A059' }}>رواسي اليسر</span></h2>
             <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '5px' }}>اختر الوحدة التي تريد الانتقال إليها</p>
          </div>

          {menuGroups.map((group, gIdx) => (
            <div key={gIdx} className="group-section">
              <span className="group-header">{group.group}</span>
              <div className="items-grid">
                {group.items.filter(item => canView(item.id)).map((item, iIdx) => {
                  // حساب التأخير الزمني لكل كارت عشان يدخلوا ورا بعض بشكل سينمائي
                  const delay = (animationDelayCounter++) * 0.05;
                  const isActive = pathname === item.path;

                  return (
                    <div 
                      key={iIdx} 
                      className={`nav-card ${isActive ? 'active' : ''}`} 
                      onClick={() => { router.push(item.path); setIsOpen(false); }}
                      style={{ animationDelay: isOpen ? `${delay}s` : '0s' }} // تشغيل الأنيميشن فقط لما القائمة تفتح
                    >
                      <div className="icon-wrapper">
                        {item.icon}
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.5px' }}>{item.title}</span>
                      {isActive && <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }}></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* تأثير ضبابي على محتوى الموقع لما القائمة تفتح */}
      <div style={{ filter: isOpen ? 'blur(15px) grayscale(50%)' : 'none', transform: isOpen ? 'scale(0.98)' : 'scale(1)', transition: 'all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1)' }}>
        {children}
      </div>
    </>
  );
}