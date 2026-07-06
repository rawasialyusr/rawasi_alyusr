"use client";
import React, { useState, useEffect } from 'react';
import { useSidebar } from '@/lib/SidebarContext';

interface RawasiSidebarProps {
  onSearch?: (term: string) => void;
  onDateChange?: (start: string, end: string) => void;
  title?: string;
  extraFilters?: React.ReactNode;
  extraActions?: React.ReactNode;
  summarySlot?: React.ReactNode;
  accentColor?: string;
  textColor?: string;
  logoPath?: string;
  isOpenStatus?: boolean; 
  setIsOpenStatus?: (val: boolean) => void; 
  customFilters?: React.ReactNode;
}

export default function RawasiFilterSidebar({ 
  onSearch, 
  onDateChange, 
  title = "لوحة التحكم", 
  extraFilters,
  extraActions,
  summarySlot,
  accentColor = '#C5A059',
  textColor = '#FFFFFF',
  logoPath = '/RYC_Logo.png',
  isOpenStatus,
  setIsOpenStatus
}: RawasiSidebarProps) {
  
  const [isPinned, setIsPinned] = useState(false);
  const [dates, setDates] = useState({ start: '', end: '' });
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { summary, actions, customFilters } = useSidebar();

  const isOpen = isPinned;

  // 🚀 إبلاغ الـ Layout بحالة السايد بار عشان يزق المحتوى
  useEffect(() => {
    if (setIsOpenStatus) {
      setIsOpenStatus(isOpen);
    }
  }, [isOpen, setIsOpenStatus]);

  const handleSearch = (val: string) => {
    if (onSearch) onSearch(val);
    window.dispatchEvent(new CustomEvent('globalSearch', { detail: val }));
  };

  const handleDateChange = (start: string, end: string) => {
    if (onDateChange) onDateChange(start, end);
    window.dispatchEvent(new CustomEvent('globalDateFilter', { detail: { start, end } }));
  };

  return (
    <>
      <style>{`
        .filter-sidebar {
          position: fixed; top: 0; right: ${isOpen ? '0' : '-350px'}; bottom: 0; height: 100vh;
          width: 280px;
          background: rgba(15, 12, 10, 0.95);
          border-radius: 0;
          box-shadow: -5px 10px 30px rgba(0,0,0,0.4);
          z-index: 1000; transition: right 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
          backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08);
          border-right: none; overflow: hidden;
          color: ${textColor};
          display: flex;
          flex-direction: column;
        }

        .filter-toggle-tab {
          position: fixed; top: 120px; right: 0;
          background: rgba(15, 12, 10, 0.98); backdrop-filter: blur(20px);
          color: #fff; padding: 25px 8px; border-radius: 16px 0 0 16px;
          cursor: pointer; z-index: 998; display: flex; align-items: center; justify-content: center;
          box-shadow: -5px 0 15px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);
          border-right: none; transition: all 0.3s ease; opacity: ${isOpen ? 0 : 1}; pointer-events: ${isOpen ? 'none' : 'auto'};
        }
        .filter-toggle-tab:hover { background: ${accentColor}; padding-right: 12px; }

        .vertical-text {
          writing-mode: vertical-rl; transform: rotate(180deg); font-weight: 900;
          font-size: 20px; letter-spacing: 6px; color: ${accentColor}; opacity: 0.6;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3); white-space: nowrap;
        }

        .filter-content {
          width: 280px; padding: 25px 20px; opacity: 1;
          display: flex; flex-direction: column; height: 100%; overflow-y: auto; overflow-x: hidden;
        }

        .filter-content::-webkit-scrollbar { width: 4px; }
        .filter-content::-webkit-scrollbar-track { background: transparent; }
        .filter-content::-webkit-scrollbar-thumb { background: ${accentColor}44; border-radius: 10px; }
        .filter-content::-webkit-scrollbar-thumb:hover { background: ${accentColor}88; }

        .sidebar-logo-container {
          text-align: center; margin-bottom: 30px; padding-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;
        }
        
        .sidebar-logo-img { width: 100px; height: auto; filter: drop-shadow(0 0 10px rgba(0,0,0,0.2)); }

        .action-grid {
          display: flex; flex-direction: column; gap: 8px; margin-bottom: 25px; flex-shrink: 0;
        }

        .filter-section-title {
          font-size: 10px; font-weight: 900; color: ${accentColor};
          margin-bottom: 12px; letter-spacing: 1px; text-transform: uppercase; flex-shrink: 0;
        }

        .filter-input {
          width: 100%; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px; padding: 10px; color: white; margin-bottom: 15px; outline: none;
          font-size: 13px; transition: 0.3s;
        }
        .filter-input:focus { border-color: ${accentColor}; background: rgba(255,255,255,0.15); box-shadow: 0 0 15px rgba(197, 160, 89, 0.2); }

        .pin-btn-sidebar {
          position: absolute; left: 15px; top: 15px; background: ${isPinned ? accentColor : 'rgba(255,255,255,0.1)'};
          border: 1px solid rgba(255,255,255,0.1); width: 32px; height: 32px; border-radius: 8px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: 0.3s; z-index: 1001; backdrop-filter: blur(5px);
        }
        
        /* 🚀 تنسيق التاريخ */
        .date-label { font-size: 10px; color: #94a3b8; display: block; margin-bottom: 5px; }

        @media (max-width: 768px) {
          .filter-sidebar {
            width: 280px !important;
            right: ${isOpen ? '0' : '-350px'} !important;
            border-left: none !important;
            top: 0 !important;
            height: 100vh !important;
          }
          /* removed filter-toggle-tab hiding */
          .filter-content {
            width: 100% !important;
          }
          .filter-toggle-tab {
            padding: 12px 6px !important;
            top: 20% !important;
            border-radius: 12px 0 0 12px !important;
          }
          .tab-text { display: none !important; }
          .tab-icon { display: block !important; font-size: 16px; transform: none !important; writing-mode: horizontal-tb !important; }
        }
      `}</style>

      {isMobile && isOpen && (
        <div onClick={() => setIsPinned(false)} className="no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, backdropFilter: 'blur(3px)' }}></div>
      )}
      
      <aside className="filter-sidebar no-print">
        <button className="pin-btn-sidebar" onClick={(e) => { e.stopPropagation(); setIsPinned(false); }}>
          <span style={{ fontSize: '16px', color: '#fff' }}>✕</span>
        </button>

        <div className="filter-content">
          <div className="sidebar-logo-container">
            <img src={logoPath} alt="Logo" className="sidebar-logo-img" />
            <h2 style={{ fontSize: '16px', fontWeight: 900, marginTop: '10px', color: accentColor }}>{title}</h2>
          </div>
          
          {(summarySlot || summary) && (
            <div style={{ marginBottom: '25px' }}>
              {summary || summarySlot}
            </div>
          )}
          
          {(extraActions || actions) && (
            <>
              <div className="filter-section-title">⚡ عمليات الصفحة</div>
              <div className="action-grid">
                {actions || extraActions}
              </div>
            </>
          )}

          <div className="filter-section-title">🔍 البحث والفلترة</div>
          <div style={{ flex: 1 }}>
            
            <input 
              type="text" 
              className="filter-input" 
              placeholder="ابحث هنا..." 
              onChange={(e) => handleSearch(e.target.value)} 
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ position: 'relative' }}>
                <label className="date-label">من تاريخ</label>
                <input 
                  type="date" 
                  className="filter-input" 
                  style={{ marginBottom: 0 }}
                  onChange={(e) => {
                    const d = { ...dates, start: e.target.value };
                    setDates(d);
                    handleDateChange(d.start, d.end);
                  }} 
                />
              </div>

              <div style={{ position: 'relative' }}>
                <label className="date-label">إلى تاريخ</label>
                <input 
                  type="date" 
                  className="filter-input" 
                  style={{ marginBottom: 0 }}
                  onChange={(e) => {
                    const d = { ...dates, end: e.target.value };
                    setDates(d);
                    handleDateChange(d.start, d.end);
                  }} 
                />
              </div>
            </div>

            {(extraFilters || customFilters) && (
              <div className="animate-fade-in" style={{ 
                marginTop: '20px', padding: '15px', background: 'rgba(0,0,0,0.2)', 
                borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' 
              }}>
                  <div className="filter-section-title" style={{ marginBottom: '10px', color: '#94a3b8', fontSize: '9px' }}>فلاتر إضافية</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {customFilters || extraFilters}
                  </div>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', opacity: 0.4, fontSize: '10px', marginTop: '20px', paddingBottom: '20px' }}>
            نظام رواسي الموحد v2.0
          </div>
        </div>
      </aside>

      <div className="filter-toggle-tab no-print" onClick={() => setIsPinned(true)}>
          <span className="tab-text" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 800, letterSpacing: '2px', fontSize: '12px' }}>
            ◀ الفلاتر والملخص
          </span>
          <span className="tab-icon" style={{ display: 'none' }}>
            ⚙️
          </span>
      </div>
    </>
  );
}