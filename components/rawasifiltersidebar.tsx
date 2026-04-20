"use client";
import React, { useState } from 'react';

// 🎨 واجهة تعريف المتغيرات (Colors & Logo)
interface RawasiSidebarProps {
  onSearch: (term: string) => void;
  onDateChange: (start: string, end: string) => void;
  title?: string;
  extraFilters?: React.ReactNode;
  accentColor?: string;    // لون التميز (الذهبي)
  textColor?: string;      // لون النصوص
  logoPath?: string;       // مسار الشعار
}

export default function RawasiFilterSidebar({ 
  onSearch, 
  onDateChange, 
  title = "لوحة التحكم", 
  extraFilters,
  accentColor = '#C5A059',
  textColor = '#FFFFFF',
  logoPath = '/RYC_Logo.png'
}: RawasiSidebarProps) {
  
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [dates, setDates] = useState({ start: '', end: '' });

  const isOpen = isHovered || isPinned;

  // 📡 دالة إرسال الأوامر للصفحة الحالية
  const dispatchAction = (actionType: string) => {
    window.dispatchEvent(new CustomEvent('rawasi-action', { detail: actionType }));
  };

  return (
    <>
      <style>{`
        .filter-sidebar {
          width: ${isOpen ? '320px' : '65px'};
          /* 🌟 تأثير الزجاج والتدرج اللوني (Glassmorphism & Gradient) */
          background: linear-gradient(180deg, rgba(67, 52, 46, 0.98) 0%, rgba(140, 106, 93, 0.4) 100%);
          backdrop-filter: blur(25px) saturate(180%);
          -webkit-backdrop-filter: blur(25px) saturate(180%);
          border-left: 1px solid rgba(255, 255, 255, 0.08); /* حافة زجاجية خفيفة */
          
          height: 100vh;
          position: fixed;
          right: 0;
          top: 0;
          z-index: 1000;
          transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
          box-shadow: -10px 0 30px rgba(0,0,0,0.2);
          color: ${textColor};
          display: flex;
          flex-direction: column;
        }

        .vertical-label-container {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 65px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          opacity: ${isOpen ? 0 : 1};
          transition: opacity 0.3s ease;
        }

        .vertical-text {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-weight: 900;
          font-size: 20px;
          letter-spacing: 6px;
          color: ${accentColor};
          opacity: 0.6;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3); /* ظل خفيف عشان الكلمة تبرز فوق الزجاج */
          white-space: nowrap;
        }

        /* 🚀 تم إضافة Scroll أنيق عشان الشاشات الصغيرة */
        .filter-content {
          width: 320px;
          padding: 25px;
          opacity: ${isOpen ? 1 : 0};
          transform: translateX(${isOpen ? '0' : '40px'});
          transition: all 0.4s ease;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow-y: auto; 
          overflow-x: hidden;
        }

        /* ستايل السكرول بار */
        .filter-content::-webkit-scrollbar { width: 4px; }
        .filter-content::-webkit-scrollbar-track { background: transparent; }
        .filter-content::-webkit-scrollbar-thumb { background: ${accentColor}44; border-radius: 10px; }
        .filter-content::-webkit-scrollbar-thumb:hover { background: ${accentColor}88; }

        .sidebar-logo-container {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          flex-shrink: 0;
        }
        
        .sidebar-logo-img {
          width: 120px;
          height: auto;
          filter: drop-shadow(0 0 10px rgba(0,0,0,0.2));
        }

        .action-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 25px;
          flex-shrink: 0;
        }

        .action-btn {
          background: rgba(255,255,255,0.05); /* زيادة الشفافية عشان تليق مع الزجاج */
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 12px 5px;
          color: ${textColor};
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          transition: 0.3s;
          font-family: 'Cairo';
          backdrop-filter: blur(5px);
        }

        .action-btn:hover {
          background: rgba(255,255,255,0.15);
          border-color: ${accentColor};
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .filter-section-title {
          font-size: 10px;
          font-weight: 900;
          color: ${accentColor};
          margin-bottom: 12px;
          letter-spacing: 1px;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .filter-input {
          width: 100%;
          background: rgba(255,255,255,0.08); /* شفافية أعلى لتأثير زجاجي */
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          padding: 10px;
          color: white;
          margin-bottom: 15px;
          outline: none;
          font-size: 13px;
          transition: 0.3s;
        }

        .filter-input:focus {
          border-color: ${accentColor};
          background: rgba(255,255,255,0.15);
          box-shadow: 0 0 15px rgba(197, 160, 89, 0.2);
        }

        .pin-btn-sidebar {
          position: absolute;
          left: 15px;
          top: 15px;
          background: ${isPinned ? accentColor : 'rgba(255,255,255,0.1)'};
          border: 1px solid rgba(255,255,255,0.1);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: 0.3s;
          z-index: 1001;
          backdrop-filter: blur(5px);
        }
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
            <h2 style={{ fontSize: '18px', fontWeight: 900, marginTop: '10px', color: accentColor }}>{title}</h2>
          </div>
          
          <div className="filter-section-title">⚡ العمليات الأساسية</div>
          <div className="action-grid">
            <button className="action-btn" style={{ gridColumn: 'span 2', border: `1px solid ${accentColor}55`, background: `${accentColor}22` }} onClick={() => dispatchAction('add')}>
              <span style={{ fontSize: '20px' }}>➕</span>
              <span style={{ fontSize: '12px', fontWeight: 900 }}>إضافة جديد</span>
            </button>
            <button className="action-btn" onClick={() => dispatchAction('edit')}><span>✏️</span><span style={{ fontSize: '11px' }}>تحرير</span></button>
            <button className="action-btn" onClick={() => dispatchAction('delete')}><span>🗑️</span><span style={{ fontSize: '11px' }}>حذف</span></button>
            <button className="action-btn" onClick={() => dispatchAction('post')}><span>📤</span><span style={{ fontSize: '11px' }}>ترحيل</span></button>
            <button className="action-btn" onClick={() => dispatchAction('unpost')}><span>🔓</span><span style={{ fontSize: '11px' }}>فك ترحيل</span></button>
          </div>

          <div className="filter-section-title">🔍 البحث والفلترة</div>
          <div style={{ flex: 1 }}>
            <input type="text" className="filter-input" placeholder="ابحث هنا..." onChange={(e) => onSearch(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input type="date" className="filter-input" onChange={(e) => {
                const d = { ...dates, start: e.target.value };
                setDates(d);
                onDateChange(d.start, d.end);
              }} />
              <input type="date" className="filter-input" onChange={(e) => {
                const d = { ...dates, end: e.target.value };
                setDates(d);
                onDateChange(d.start, d.end);
              }} />
            </div>
            {extraFilters}
          </div>

          <div style={{ textAlign: 'center', opacity: 0.4, fontSize: '10px', marginTop: '20px', paddingBottom: '20px' }}>
            نظام رواسي الموحد v2.0
          </div>
        </div>
      </aside>
    </>
  );
}