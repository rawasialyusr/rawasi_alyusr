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

  if (pathname === '/login') return <>{children}</>;

  // 2. مصفوفة المنيو الكاملة (بناءً على الصورة المرسلة)
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

  // دالة الفلترة: تظهر العنصر فقط إذا كان المستخدم آدمن أو لديه صلاحية view
  const canView = (moduleId: string) => {
    if (userRole === 'admin' || moduleId === 'home') return true;
    return permissions?.[moduleId]?.view === true;
  };

  // --- كود الـ Dragging (نفسه بدون تغيير) ---
  const onMouseDown = (e: React.MouseEvent) => { if (isOpen) return; setIsDragging(true); dragStartPos.current = { x: e.clientX - position.x, y: e.clientY + position.y }; };
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => { if (!isDragging) return; setPosition({ x: e.clientX - dragStartPos.current.x, y: dragStartPos.current.y - e.clientY }); };
    const onMouseUp = () => setIsDragging(false);
    if (isDragging) { window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp); }
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [isDragging]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        .fab-main { position: fixed; bottom: ${position.y}px; left: ${position.x}px; width: 70px; height: 70px; z-index: 10000; background: #1A1513; border: 1px solid rgba(197, 160, 89, 0.5); border-radius: 22px; cursor: ${isDragging ? 'grabbing' : 'grab'}; display: flex; align-items: center; justify-content: center; box-shadow: 0 15px 35px rgba(0,0,0,0.3); transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); }
        .overlay-screen { position: fixed; inset: 0; z-index: 9000; background: rgba(10, 10, 10, 0.85); backdrop-filter: blur(20px); clip-path: circle(${isOpen ? '150%' : '0%'} at calc(${position.x + 35}px) calc(100% - ${position.y + 35}px)); transition: clip-path 0.8s ease-in-out; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; overflow-y: auto; }
        .command-center { width: 100%; max-width: 1100px; display: flex; flex-direction: column; gap: 30px; }
        .group-header { color: #C5A059; font-weight: 900; font-size: 14px; border-bottom: 1px solid rgba(197, 160, 89, 0.2); padding-bottom: 8px; text-align: right; }
        .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px; }
        .nav-card { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 15px; text-align: center; color: #fff; cursor: pointer; transition: 0.3s; display: flex; flex-direction: column; gap: 8px; }
        .nav-card:hover { background: rgba(197, 160, 89, 0.2); transform: translateY(-5px); border-color: #C5A059; }
      `}</style>

      <div className="fab-main" onMouseDown={onMouseDown} onClick={() => !isDragging && setIsOpen(!isOpen)}>
        <div style={{ transform: isOpen ? 'rotate(135deg)' : 'rotate(0)', transition: '0.5s', fontSize: '28px', color: '#C5A059' }}>{isOpen ? '✕' : '⊞'}</div>
      </div>

      <nav className="overlay-screen" onClick={() => setIsOpen(false)}>
        <div className="command-center" onClick={(e) => e.stopPropagation()}>
          {menuGroups.map((group, gIdx) => (
            <div key={gIdx} className="group-section">
              <span className="group-header">{group.group}</span>
              <div className="items-grid">
                {group.items.filter(item => canView(item.id)).map((item, iIdx) => (
                  <div key={iIdx} className="nav-card" onClick={() => { router.push(item.path); setIsOpen(false); }}>
                    <span style={{ fontSize: '24px' }}>{item.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div style={{ filter: isOpen ? 'blur(10px)' : 'none', transition: '0.5s' }}>{children}</div>
    </>
  );
}