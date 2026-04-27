"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import RawasiFilterSidebar from '@/components/rawasifiltersidebar';
import { useSidebar } from '@/lib/SidebarContext'; 
import { usePermissions } from '@/lib/PermissionsContext'; 

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 40, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); 
  const dragStartPos = useRef({ x: 0, y: 0 });

  // 🚀 1. إضافة الحالة لمراقبة السايد بار (هذه كانت مفقودة في كودك)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { actions, summary, customFilters } = useSidebar(); 
  const { role, can, loading } = usePermissions();

  useEffect(() => {
    const verifyRealUser = async () => {
      if (pathname === '/login') return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      const { data, error } = await supabase.from('profiles').select('id').eq('id', session.user.id).single();
      if (error || !data) {
        await supabase.auth.signOut();
        window.location.href = '/login'; 
      } else {
        setIsInitialized(true); 
      }
    };
    verifyRealUser();
  }, [pathname, router]);

  const menuGroups = [
    { group: "الداشبورد والملخصات", items: [{ id: 'global_summary', title: 'الملخص العام', icon: '📊', path: '/GlobalSummary' }, { id: 'financial_center', title: 'المركز المالي', icon: '🏦', path: '/financial-center' }] },
    { group: "الحسابات والمالية", items: [{ id: 'journal', title: 'قيود اليومية', icon: '📝', path: '/journal' }, { id: 'ledger', title: 'دفتر الأستاذ', icon: '📒', path: '/ledger' }, { id: 'journal_errors', title: 'رادار الأخطاء', icon: '🛡️', path: '/journal-errors' }, { id: 'payments', title: 'سندات الصرف', icon: '🔴', path: '/finance/vouchers' }, { id: 'receipts', title: 'سندات القبض', icon: '🟢', path: '/ReceiptVouchers' }, { id: 'revenue', title: 'الإيرادات', icon: '📈', path: '/revenue' }, { id: 'expenses', title: 'المصروفات', icon: '📉', path: '/expenses' }, { id: 'invoices', title: 'الفواتير والمستخلصات', icon: '🧾', path: '/invoices' }] },
    { group: "العمالة والموارد البشرية", items: [{ id: 'employees', title: 'سجل الموظفين', icon: '👔', path: '/employees' }, { id: 'labor_logs', title: 'يوميات الميدان', icon: '👷', path: '/labor_logs' }, { id: 'payroll', title: 'مسيرات الرواتب', icon: '💵', path: '/payroll' }, { id: 'emp_adv', title: 'سلف الموظفين', icon: '💸', path: '/emp_adv' }, { id: 'emp_ded', title: 'خصومات الموظفين', icon: '✂️', path: '/emp_ded' }, { id: 'housing', title: 'الإعاشة والسكن', icon: '🏠', path: '/housing' }] },
    { group: "المشاريع والشركاء", items: [{ id: 'projects', title: 'المشاريع والمواقع', icon: '🏗️', path: '/projects' }, { id: 'partners', title: 'دليل الشركاء', icon: '🤝', path: '/partners' }] },
    { group: "النظام والتقارير", items: [{ id: 'reports', title: 'التقارير الشاملة', icon: '📑', path: '/reports' }, { id: 'settings', title: 'إعدادات النظام', icon: '⚙️', path: '/settings' }, { id: 'profile', title: 'الملف الشخصي', icon: '👤', path: '/profile' }] }
  ];

  const canView = (menuId: string) => {
    if (role === 'super_admin' || role === 'admin') return true;
    if (menuId === 'profile') return true;
    return can(menuId, 'view');
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

  if (pathname === '/login') return <>{children}</>;

  if (loading && !isInitialized) {
      return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl', fontWeight: 900 }}>⏳ جاري تحميل الصلاحيات...</div>;
  }

  const currentPageTitle = menuGroups.flatMap(g => g.items).find(i => i.path === pathname)?.title || "إدارة النظام";

  return (
    <div style={{ display: 'block', minHeight: '100vh', direction: 'rtl' }}>
      <style>{`
        @keyframes floatPulse { 0%, 100% { box-shadow: 0 15px 35px rgba(197, 160, 89, 0.2); transform: scale(1); } 50% { box-shadow: 0 15px 35px rgba(197, 160, 89, 0.4), 0 0 25px 5px rgba(197, 160, 89, 0.3); transform: scale(1.05); } }
        .fab-main { position: fixed; bottom: ${position.y}px; left: ${position.x}px; width: 85px; height: 85px; z-index: 10000; background: linear-gradient(145deg, rgba(67, 52, 46, 0.85), rgba(26, 21, 19, 0.95)); backdrop-filter: blur(15px); border-radius: 50%; cursor: ${isDragging ? 'grabbing' : 'grab'}; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3); transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); animation: floatPulse 4s infinite ease-in-out; overflow: hidden; padding: 5px; }
        .fab-logo { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); }
        .overlay-screen { position: fixed; inset: 0; z-index: 9000; background: radial-gradient(circle at center, rgba(40, 30, 25, 0.6) 0%, rgba(15, 12, 10, 0.9) 100%); backdrop-filter: blur(30px) saturate(200%); clip-path: circle(${isOpen ? '150%' : '0%'} at calc(${position.x + 42.5}px) calc(100% - ${position.y + 42.5}px)); transition: clip-path 0.8s; display: flex; flex-direction: column; align-items: center; padding: 60px 20px; overflow-y: auto; }
      `}</style>

      {/* 🚀 2. ربط السايد بار بالحالة (isOpenStatus) */}
      <RawasiFilterSidebar 
        title={currentPageTitle}
        extraActions={actions}
        summarySlot={summary}
        customFilters={customFilters}
        isOpenStatus={isSidebarOpen}
        setIsOpenStatus={setIsSidebarOpen}
        onSearch={(term) => window.dispatchEvent(new CustomEvent('globalSearch', { detail: term }))}
        onDateChange={(start, end) => window.dispatchEvent(new CustomEvent('globalDateFilter', { detail: { start, end } }))}
      />

      <div className="fab-main no-print" onMouseDown={onMouseDown} onClick={() => !isDragging && setIsOpen(!isOpen)}>
        <img src="/RYC_Logo.png" alt="رواسي" className="fab-logo" />
      </div>

      <nav className="overlay-screen no-print" onClick={() => setIsOpen(false)} style={{ pointerEvents: isOpen ? 'auto' : 'none' }}>
          {/* محتوى الـ Overlay... */}
      </nav>

      {/* 🚀 3. السحر النهائي هنا للـ Squeeze:
          - حذفنا width: 100% تماماً.
          - marginRight يتغير ديناميكياً.
          - paddingRight بمسافة الأمان 15px.
      */}
      <main style={{ 
          flex: 1, 
          boxSizing: 'border-box',
          marginRight: isSidebarOpen ? '280px' : '65px', 
          paddingRight: '15px', 
          minHeight: '100vh', 
          position: 'relative', 
          zIndex: 1,
          overflowX: 'hidden',
          filter: isOpen ? 'blur(20px) grayscale(30%)' : 'none', 
          transform: isOpen ? 'scale(0.97)' : 'scale(1)', 
          transition: 'margin-right 0.5s cubic-bezier(0.165, 0.84, 0.44, 1)' 
      }}>
        {children}
      </main>
    </div>
  );
}