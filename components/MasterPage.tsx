"use client";
import React from 'react';
import { THEME } from '@/lib/theme';

interface MasterPageProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerContent?: React.ReactNode; // لو عايز تحط زراير جنب العنوان
}

export default function MasterPage({ title, subtitle, children, headerContent }: MasterPageProps) {
  return (
    <div className="clean-page">
      <style>{`
        /* 🚀 سحر المسافات والهوامش السلبية المركزي */
        .clean-page { 
            padding: 30px 20px 30px 0px !important; 
            margin-right: -25px !important; /* تخطي الـ Wrapper للالتصاق بالسايد بار */
            direction: rtl; 
            background: transparent; 
            min-height: 100vh; 
        }

        .glass-container {
            background: rgba(255, 255, 255, 0.5);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 0px 0px 0px 24px !important; /* الالتصاق من اليمين */
            padding: 15px;
            border: 1px solid rgba(255,255,255,0.7);
            border-right: none !important;
            transition: all 0.3s ease;
            box-shadow: -5px 0 15px rgba(0,0,0,0.02);
        }

        /* 📱 تظبيط الموبايل */
        @media (max-width: 768px) {
            .clean-page { padding: 15px !important; margin-right: -10px !important; }
            .glass-container { border-radius: 24px !important; border-right: 1px solid rgba(255,255,255,0.7) !important; }
        }

        /* 🎨 ستايلات الزراير والبادجات العالمية الموحدة للسيستم كله */
        .btn-glass-pay { background: linear-gradient(135deg, #22c55e, #10b981); color: white; padding: 6px 14px; border-radius: 10px; font-weight: 800; cursor: pointer; transition: 0.2s; font-size: 11px; border: none; }
        .btn-glass-pay:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(34, 197, 94, 0.4); }
        
        .btn-glass-print { background: rgba(255, 255, 255, 0.6); padding: 7px; border-radius: 10px; cursor: pointer; transition: 0.2s; border: 1px solid rgba(255,255,255,0.8); }
        .btn-glass-print:hover { background: #fff; transform: scale(1.1); }
        
        .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-main-glass.gold { background: linear-gradient(135deg, rgba(197, 160, 89, 0.9), rgba(151, 115, 50, 1)); color: white; }
        .btn-main-glass.blue { background: linear-gradient(135deg, rgba(14, 165, 233, 0.8), rgba(2, 132, 199, 0.9)); color: white; }
        .btn-main-glass.yellow { background: linear-gradient(135deg, rgba(245, 158, 11, 0.8), rgba(217, 119, 6, 0.9)); color: white; }
        .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .btn-main-glass:hover { transform: translateY(-3px); filter: brightness(1.1); }

        .glass-badge { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(5px); border: 1px solid rgba(255, 255, 255, 0.6); }
        .glass-badge.green { color: #059669; }
        .glass-badge.red { color: #dc2626; }
        .glass-badge.orange { color: #d97706; }
        
        .deadline-badge { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 900; display: inline-flex; align-items: center; gap: 5px; backdrop-filter: blur(5px); }
        .deadline-badge.paid { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
        .deadline-badge.overdue { background: rgba(239, 68, 68, 0.1); color: #dc2626; animation: shake-alert 0.8s infinite alternate; }
        @keyframes shake-alert { 0% { transform: translateX(0); } 100% { transform: translateX(3px); } }

        /* ستايل صفوف الجدول لتكون قابلة للضغط */
        .clickable-rows tbody tr { cursor: pointer !important; transition: 0.2s; }
        .clickable-rows tbody tr:hover { background: rgba(197, 160, 89, 0.08) !important; }
      `}</style>

      {/* 🏷️ الهيدر الموحد لأي صفحة */}
      <div style={{ marginBottom: '30px', paddingRight: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
            <h1 style={{ fontWeight: 900, fontSize: '34px', color: '#0f172a', margin: 0, letterSpacing: '-1px' }}>{title}</h1>
            {subtitle && <p style={{ color: '#64748b', fontSize: '15px', fontWeight: 600, margin: '5px 0 0 0' }}>{subtitle}</p>}
        </div>
        {headerContent && <div>{headerContent}</div>}
      </div>

      {/* 📦 المحتوى المتغير (الجدول أو غيره) */}
      <div className="glass-container clickable-rows">
        {children}
      </div>
    </div>
  );
}