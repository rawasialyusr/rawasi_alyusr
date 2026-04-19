"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

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
      group: "الداشبورد والملخصات",
      items: [
        { id: 'global_summary', title: 'الملخص العام', icon: '📊', path: '/GlobalSummary' },
        { id: 'financial_center', title: 'المركز المالي', icon: '🏦', path: '/financial-center' },
      ]
    },
    {
      group: "الحسابات والمالية",
      items: [
        { id: 'journal', title: 'قيود اليومية', icon: '📝', path: '/journal' },
        { id: 'ledger', title: 'دفتر الأستاذ', icon: '📒', path: '/ledger' },
        { id: 'journal_errors', title: 'رادار الأخطاء', icon: '🛡️', path: '/journal-errors' },
        { id: 'payment_vouchers', title: 'سندات الصرف', icon: '🔴', path: '/finance/vouchers' },
        { id: 'receipt_vouchers', title: 'سندات القبض', icon: '🟢', path: '/ReceiptVouchers' },
        { id: 'revenue', title: 'الإيرادات', icon: '📈', path: '/revenue' },
        { id: 'expenses', title: 'المصروفات', icon: '📉', path: '/expenses' },
        { id: 'invoices', title: 'الفواتير والمستخلصات', icon: '🧾', path: '/invoices' },
      ]
    },
    {
      group: "العمالة والموارد البشرية",
      items: [
        { id: 'employees', title: 'سجل الموظفين', icon: '👔', path: '/employees' },
        { id: 'labor_logs', title: 'يوميات الميدان', icon: '👷', path: '/labor_logs' },
        { id: 'payroll', title: 'مسيرات الرواتب', icon: '💵', path: '/payroll' },
        { id: 'emp_adv', title: 'سلف الموظفين', icon: '💸', path: '/emp_adv' },
        { id: 'emp_ded', title: 'خصومات الموظفين', icon: '✂️', path: '/emp_ded' },
        { id: 'housing', title: 'الإعاشة والسكن', icon: '🏠', path: '/housing' },
      ]
    },
    {
      group: "المشاريع والشركاء",
      items: [
        { id: 'projects', title: 'المشاريع والمواقع', icon: '🏗️', path: '/projects' },
        { id: 'partners', title: 'دليل الشركاء', icon: '🤝', path: '/partners' },
      ]
    },
    {
      group: "النظام والتقارير",
      items: [
        { id: 'reports', title: 'التقارير الشاملة', icon: '📑', path: '/reports' },
        { id: 'settings', title: 'إعدادات النظام', icon: '⚙️', path: '/settings' },
        { id: 'profile', title: 'الملف الشخصي', icon: '👤', path: '/profile' },
      ]
    }
  ];

  const canView = (moduleId: string) => {
    if (userRole === 'admin' || moduleId === 'home') return true;
    return permissions?.[moduleId]?.view === true;
  };

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

  let animationDelayCounter = 0;

  if (pathname === '/login') return <>{children}</>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        
        @keyframes floatPulse {
          0%, 100% { box-shadow: 0 15px 35px rgba(197, 160, 89, 0.2); transform: scale(1); }
          50% { box-shadow: 0 15px 35px rgba(197, 160, 89, 0.4), 0 0 20px 2px rgba(197, 160, 89, 0.2); transform: scale(1.05); }
        }
        
        .fab-main {
          position: fixed; bottom: ${position.y}px; left: ${position.x}px; width: 85px; height: 85px; z-index: 10000;
          background: linear-gradient(145deg, #1A1513, #2a221d);
          border: 2px solid ${isOpen ? '#C5A059' : 'rgba(197, 160, 89, 0.4)'}; 
          border-radius: 50%;
          cursor: ${isDragging ? 'grabbing' : 'grab'};
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 15px 35px rgba(0,0,0,0.4);
          transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
          animation: floatPulse 4s infinite ease-in-out;
          overflow: hidden;
          padding: 5px;
        }

        .fab-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: all 0.5s ease;
          filter: ${isOpen ? 'drop-shadow(0 0 8px #C5A059)' : 'none'};
          transform: ${isOpen ? 'scale(1.1)' : 'scale(1)'};
        }

        .overlay-screen {
          position: fixed; inset: 0; z-index: 9000;
          background: radial-gradient(circle at center, rgba(20, 20, 25, 0.85) 0%, rgba(5, 5, 10, 0.95) 100%);
          backdrop-filter: blur(25px) saturate(150%);
          clip-path: circle(${isOpen ? '150%' : '0%'} at calc(${position.x + 42.5}px) calc(100% - ${position.y + 42.5}px));
          transition: clip-path 0.8s cubic-bezier(0.77, 0, 0.175, 1);
          display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
          padding: 60px 20px; overflow-y: auto;
        }

        .command-center { width: 100%; max-width: 1200px; display: flex; flex-direction: column; gap: 40px; margin-top: 20px; }
        .group-header { color: #C5A059; font-weight: 900; font-size: 16px; border-bottom: 1px solid rgba(197, 160, 89, 0.2); padding-bottom: 12px; margin-bottom: 20px; text-align: right; display: block; position: relative; }
        .group-header::after { content: ''; position: absolute; right: 0; bottom: -1px; width: 50px; height: 3px; background: #C5A059; border-radius: 5px; }
        .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; }
        a { text-decoration: none; outline: none; }
        
        .nav-card {
          background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 20px; border-radius: 20px; text-align: center; color: #fff; cursor: pointer;
          position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 15px;
          transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); opacity: 0;
          animation: popIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes popIn { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }

        .nav-card:hover { background: rgba(197, 160, 89, 0.08); border-color: rgba(197, 160, 89, 0.4); transform: translateY(-8px); }
        .icon-wrapper { background: rgba(255,255,255,0.04); width: 65px; height: 65px; margin: 0 auto; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; transition: 0.4s; }
        .nav-card.active { background: rgba(197, 160, 89, 0.15); border-color: #C5A059; }
        .nav-card.active .icon-wrapper { background: #C5A059; }
      `}</style>

      {/* 🚀 الزر العائم الآن يحمل لوجو رواسي */}
      <div 
        className="fab-main" 
        onMouseDown={onMouseDown} 
        onClick={() => !isDragging && setIsOpen(!isOpen)}
        title={isOpen ? "إغلاق القائمة" : "فتح قائمة رواسي"}
      >
        <img 
          src="/RYC_Logo.png" 
          alt="رواسي" 
          className="fab-logo"
        />
      </div>

      <nav className="overlay-screen" onClick={() => setIsOpen(false)} style={{ pointerEvents: isOpen ? 'auto' : 'none' }}>
        <div className="command-center" onClick={(e) => e.stopPropagation()}>
          <div style={{ textAlign: 'center', marginBottom: '10px', opacity: isOpen ? 1 : 0, transition: '1s 0.3s' }}>
             <h2 style={{ color: 'white', fontWeight: 900, margin: 0, fontSize: '28px' }}>نظام إدارة <span style={{ color: '#C5A059' }}>رواسي اليسر</span></h2>
             <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '5px' }}>تحكم كامل في كافة وحدات النظام</p>
          </div>

          {menuGroups.map((group, gIdx) => (
            <div key={gIdx} className="group-section">
              <span className="group-header">{group.group}</span>
              <div className="items-grid">
                {group.items.filter(item => canView(item.id)).map((item, iIdx) => {
                  const delay = (animationDelayCounter++) * 0.05;
                  const isActive = pathname === item.path;

                  return (
                    <Link 
                      key={iIdx} 
                      href={item.path}
                      onClick={() => setIsOpen(false)}
                    >
                        <div 
                          className={`nav-card ${isActive ? 'active' : ''}`} 
                          style={{ animationDelay: isOpen ? `${delay}s` : '0s' }}
                        >
                          <div className="icon-wrapper">
                            {item.icon}
                          </div>
                          <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.5px', color: 'white' }}>{item.title}</span>
                          {isActive && <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }}></div>}
                        </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          
          {/* زر تسجيل الخروج الإضافي أسفل القائمة */}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
             <button 
               onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
               style={{ background: 'transparent', border: '1px solid #be123c', color: '#be123c', padding: '10px 30px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}
             >
               تسجيل الخروج من النظام
             </button>
          </div>
        </div>
      </nav>

      {/* تأثير الضباب على المحتوى */}
      <div style={{ filter: isOpen ? 'blur(15px) grayscale(50%)' : 'none', transform: isOpen ? 'scale(0.98)' : 'scale(1)', transition: 'all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1)' }}>
        {children}
      </div>
    </>
  );
}