"use client";
import React from 'react';
import { THEME } from '@/lib/theme';

interface BlurModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BlurModal({ isOpen, onClose, title, children }: BlurModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      // 🔮 الطبقة الخلفية اللي بتعمل بلور للشاشة كلها
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      background: 'rgba(0, 0, 0, 0.4)',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      
      {/* 🎬 جسم المودال السينمائي */}
      <div style={{
        ...THEME.cinematicGlass, // سحبنا الثيم السينمائي
        width: '100%', maxWidth: '550px',
        maxHeight: '90vh', overflowY: 'auto',
        position: 'relative', padding: '30px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
      }}>
        
        {/* العلوية (الهيدر) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '20px', fontWeight: 900 }}>{title}</h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* محتوى الفورم */}
        {children}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}