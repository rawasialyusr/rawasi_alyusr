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

  // 🛡️ درع حماية الهيدريشن
  const [mounted, setMounted] = useState(false);

  // 🚀 مراقبة السايد بار لعمل الـ Squeeze
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { actions, summary, customFilters } = useSidebar(); 
  const { role, can, loading } = usePermissions();

  useEffect(() => {
    setMounted(true);
  }, []);

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
    { 
        group: "الداشبورد والملخصات", 
        items: [
            { id: 'global_summary', title: 'الملخص العام', icon: '📊', path: '/GlobalSummary' }, 
            { id: 'dashboard', title: 'لوحة القيادة', icon: '🖥️', path: '/Dashboard' },
            { id: 'financial_center', title: 'المركز المالي', icon: '🏦', path: '/financial-center' }
        ] 
    },
    { 
        group: "الحسابات والمالية", 
        items: [
            { id: 'accounts', title: 'دليل الحسابات', icon: '🗂️', path: '/accounts' },
            { id: 'journal', title: 'قيود اليومية', icon: '📝', path: '/journal' }, 
            { id: 'ledger', title: 'دفتر الأستاذ', icon: '📒', path: '/ledger' }, 
            { id: 'journal_errors', title: 'رادار الأخطاء', icon: '🛡️', path: '/journal-errors' }, 
            { id: 'cashflows', title: 'التدفقات النقدية', icon: '🔄', path: '/cashflows' }, 
            { id: 'payments', title: 'سندات الصرف', icon: '🔴', path: '/PaymentVouchers' }, 
            { id: 'receipts', title: 'سندات القبض', icon: '🟢', path: '/ReceiptVouchers' }, 
            { id: 'revenue', title: 'الإيرادات', icon: '📈', path: '/revenue' }, 
            { id: 'expenses', title: 'المصروفات', icon: '📉', path: '/expenses' }, 
            { id: 'invoices', title: 'الفواتير ومطالبات العملاء', icon: '🧾', path: '/invoices' }
        ] 
    },
    { 
        group: "المشاريع والشركاء", 
        items: [
            { id: 'fieldops', title: 'رادار الميدان الحي', icon: '📡', path: '/fieldops' },
            { id: 'projects', title: 'غرفة المشاريع', icon: '🏗️', path: '/projects' }, 
            { id: 'materials', title: 'توريد الخامات', icon: '🧱', path: '/materials' },
            { id: 'subclaims', title: 'مستخلصات مقاولي الباطن', icon: '📑', path: '/subclaims' },
            { id: 'boqcatalog', title: 'الدليل الموحد للبنود (BOQ)', icon: '📚', path: '/boqcatalog' },
            { id: 'partners', title: 'دليل الشركاء', icon: '🤝', path: '/partners' },
            { id: 'partner_balances', title: 'أرصدة الشركاء', icon: '⚖️', path: '/PartnerBalances' },
            // 🚀 تم تعديل التعليق هنا إلى Syntax الجافا سكريبت الصحيح:
            { id: 'project_overhead', title: 'تحميل الأوفر هيد (Overhead)', icon: '🦅', path: '/overhead' },
            { id: 'boq_budget', title: 'ميزانية المقايسات (BOQ Budget)', icon: '💼', path: '/boqbudget' },
            { id: 'cost_allocation', title: 'محرك توزيع التكاليف (Cost Allocation)', icon: '🧮', path: '/costallocation' },
            { id: 'project_ledger', title: 'دفتر  التكاليف', icon: '📋', path: '/project-ledger' }
            
        ] 
    },
    { 
        group: "العمالة والموارد البشرية", 
        items: [
            { id: 'employees', title: 'سجل الموظفين', icon: '👔', path: '/employees' }, 
            { id: 'team', title: 'إدارة فرق العمل', icon: '👥', path: '/team' },
            { id: 'labor_logs', title: 'يوميات الميدان', icon: '👷', path: '/labor_logs' }, 
            { id: 'payroll', title: 'مسيرات الرواتب', icon: '💵', path: '/payroll' }, 
            { id: 'violations', title: 'المخالفات والجزاءات', icon: '⚠️', path: '/violations' }
        ] 
    },
    { 
        group: "النظام والتقارير", 
        items: [
            { id: 'reports', title: 'التقارير الشاملة', icon: '📊', path: '/reports' }, 
            { id: 'import', title: 'استيراد البيانات', icon: '📥', path: '/import' },
            { id: 'settings', title: 'إعدادات النظام', icon: '⚙️', path: '/settings' }, 
            { id: 'profile', title: 'الملف الشخصي', icon: '👤', path: '/profile' }
        ] 
    }
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

  const currentMargin = mounted && isSidebarOpen ? '280px' : '0px';
  let animationDelayCounter = 0;

  if (pathname === '/login') return <>{children}</>;

  if (loading && !isInitialized) {
      return <LoadingScreen message="جاري تهيئة النظام..." subMessage="يتم الآن تجميع صلاحياتك الخاصة وتأمين الواجهة" fullScreen={true} />;
  }

  const currentPageTitle = menuGroups.flatMap(g => g.items).find(i => i.path === pathname)?.title || "إدارة النظام";

  return (
    <div style={{ display: 'block', minHeight: '100vh', direction: 'rtl' }} suppressHydrationWarning>
      <style>{`
        @keyframes floatPulse { 0%, 100% { box-shadow: 0 15px 35px rgba(197, 160, 89, 0.2); transform: scale(1); } 50% { box-shadow: 0 15px 35px rgba(197, 160, 89, 0.4), 0 0 25px 5px rgba(197, 160, 89, 0.3); transform: scale(1.05); } }
        .fab-main { position: fixed; bottom: ${position.y}px; left: ${position.x}px; width: 85px; height: 85px; z-index: 10000; background: linear-gradient(145deg, rgba(67, 52, 46, 0.85), rgba(26, 21, 19, 0.95)); backdrop-filter: blur(15px); border-radius: 50%; cursor: ${isDragging ? 'grabbing' : 'grab'}; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3); transition: all 0.4s; animation: floatPulse 4s infinite ease-in-out; padding: 5px; }
        .fab-logo { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); }
        .overlay-screen { position: fixed; top: 0; bottom: 0; right: ${isOpen ? '0' : '-350px'}; width: 320px; max-width: 85vw; z-index: 9000; background: rgba(15, 12, 10, 0.98); backdrop-filter: blur(30px) saturate(200%); transition: right 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); display: flex; flex-direction: column; padding: 40px 20px; overflow-y: auto; box-shadow: -10px 0 40px rgba(0,0,0,0.7); border-left: 1px solid rgba(255,255,255,0.05); }
        .overlay-backdrop { position: fixed; inset: 0; z-index: 8999; background: rgba(0,0,0,0.5); backdrop-filter: blur(3px); opacity: ${isOpen ? 1 : 0}; pointer-events: ${isOpen ? 'auto' : 'none'}; transition: opacity 0.4s ease; }
        .command-center { width: 100%; display: flex; flex-direction: column; gap: 30px; margin-top: 10px; }
        .group-header { color: #C5A059; font-weight: 900; font-size: 14px; border-bottom: 1px solid rgba(197, 160, 89, 0.2); padding-bottom: 8px; text-align: right; display: block; position: relative; }
        .items-grid { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
        .nav-card { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 15px 20px; border-radius: 12px; display: flex; align-items: center; gap: 15px; color: #fff; cursor: pointer; transition: all 0.3s; opacity: 0; animation: popIn 0.5s forwards; position: relative; text-decoration: none; }
        @keyframes popIn { 0% { opacity: 0; transform: translateX(30px); } 100% { opacity: 1; transform: translateX(0); } }
        .nav-card:hover { background: rgba(197, 160, 89, 0.2); border-color: rgba(197, 160, 89, 0.5); transform: translateX(-5px); }
        .nav-card.active { background: rgba(197, 160, 89, 0.3); border-color: #C5A059; }
        .icon-wrapper { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; background: rgba(255,255,255,0.1); flex-shrink: 0; }
        
        @media (max-width: 768px) {
          main { margin-right: 0px !important; padding-right: 10px !important; padding-left: 10px !important; }
          .fab-main { width: 65px !important; height: 65px !important; bottom: 20px !important; left: 20px !important; }
        }
      `}</style>

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

      <div className="fab-main no-print" 
           onMouseDown={(e) => { if(window.innerWidth > 768) onMouseDown(e); }} 
           onTouchStart={(e) => { if(window.innerWidth <= 768) setIsOpen(!isOpen); }}
           onClick={() => { if(window.innerWidth > 768 && !isDragging) setIsOpen(!isOpen); }}>
        <img src="/RYC_Logo.png" alt="رواسي" className="fab-logo" />
      </div>

      <div className="overlay-backdrop no-print" onClick={() => setIsOpen(false)}></div>
      <nav className="overlay-screen no-print" onClick={(e) => e.stopPropagation()}>
          <div className="command-center">
            <div style={{ background: 'rgba(197, 160, 89, 0.2)', padding: '10px 20px', borderRadius: '15px', fontSize: '14px', textAlign: 'center', color: '#fff', marginBottom: '20px', fontWeight: 900 }}>
               بوابة الإدارة المركزية | {role === 'super_admin' ? '👑 سوبر أدمن' : '👤 مسؤول نظام'}
            </div>

            {menuGroups.map((group, gIdx) => {
              const filteredItems = group.items.filter(item => canView(item.id));
              if (filteredItems.length === 0) return null;

              return (
                <div key={gIdx} className="group-section">
                  <span className="group-header">{group.group}</span>
                  <div className="items-grid">
                    {filteredItems.map((item, iIdx) => {
                      const delay = (animationDelayCounter++) * 0.05;
                      const isActive = pathname === item.path;
                      return (
                        <Link key={iIdx} href={item.path} onClick={() => setIsOpen(false)}>
                            <div className={`nav-card ${isActive ? 'active' : ''}`} style={{ animationDelay: isOpen ? `${delay}s` : '0s' }}>
                              <div className="icon-wrapper">{item.icon}</div>
                              <span style={{ fontWeight: 800, fontSize: '15px', color: 'white' }}>{item.title}</span>
                              {isActive && <div style={{ position: 'absolute', top: '15px', right: '15px', width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 15px #10b981' }}></div>}
                            </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
      </nav>

      <main style={{ 
          flex: 1, 
          boxSizing: 'border-box',
          marginRight: currentMargin, 
          paddingRight: '15px', 
          minHeight: '100vh', 
          position: 'relative', 
          zIndex: 1,
          overflowX: 'hidden',
          transition: 'margin-right 0.5s cubic-bezier(0.165, 0.84, 0.44, 1)' 
      }}>
        {children}
      </main>
    </div>
  );
}