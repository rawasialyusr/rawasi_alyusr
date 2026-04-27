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
  
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [dates, setDates] = useState({ start: '', end: '' });

  const { summary, actions, customFilters } = useSidebar();

  const isOpen = isHovered || isPinned;

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
        /* 🚀 عرض السايد بار */
        .filter-sidebar {
          width: ${isOpen ? '280px' : '65px'};
          background: linear-gradient(180deg, rgba(67, 52, 46, 0.98) 0%, rgba(140, 106, 93, 0.4) 100%);
          backdrop-filter: blur(25px) saturate(180%);
          -webkit-backdrop-filter: blur(25px) saturate(180%);
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          height: 100vh;
          position: fixed;
          right: 0;
          top: 0;
          z-index: 1000;
          transition: width 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
          overflow: hidden;
          box-shadow: -10px 0 30px rgba(0,0,0,0.2);
          color: ${textColor};
          display: flex;
          flex-direction: column;
        }

        .vertical-label-container {
          position: absolute; right: 0; top: 0; bottom: 0; width: 65px;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none; opacity: ${isOpen ? 0 : 1}; transition: opacity 0.3s ease;
        }

        .vertical-text {
          writing-mode: vertical-rl; transform: rotate(180deg); font-weight: 900;
          font-size: 20px; letter-spacing: 6px; color: ${accentColor}; opacity: 0.6;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3); white-space: nowrap;
        }

        .filter-content {
          width: 280px; padding: 25px 20px; opacity: ${isOpen ? 1 : 0};
          transform: translateX(${isOpen ? '0' : '40px'}); transition: all 0.4s ease;
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
      `}</style>

      <aside className="filter-sidebar" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <button className="pin-btn-sidebar" onClick={() => setIsPinned(!isPinned)}>
          <span style={{ fontSize: '16px', color: isPinned ? '#fff' : accentColor }}>📌</span>
        </button>

        <div className="vertical-label-container">
          <div className="vertical-text">رواسـي - الـتـحـكـم</div>
        </div>

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
    </>
  );
}