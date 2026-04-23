"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';

// تحديد أنواع الألرت المتاحة
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// تعريف شكل البيانات
interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // دمج حالة الظهور والرسالة والنوع في State واحد
  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false
  });

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    // 1. إظهار الألرت
    setToast({ message, type, visible: true });

    // 2. إخفاء الألرت أوتوماتيك بعد 4 ثواني (عشان اليوزر ميقفلش بنفسه)
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* 🍏 واجهة الألرت الزجاجي (Apple Dynamic Toast) */}
      {toast.visible && (
        <div className={`apple-global-toast ${toast.type}`}>
          {/* إضافة أيقونات تفاعلية بناءً على النوع */}
          {toast.type === 'success' && '✅ '}
          {toast.type === 'error' && '⚠️ '}
          {toast.type === 'warning' && '⏸️ '}
          {toast.type === 'info' && 'ℹ️ '}
          {toast.message}
        </div>
      )}

      {/* ستايل الألرت المدمج لضمان ظهوره في كل صفحات السيستم */}
      <style>{`
        .apple-global-toast {
          position: fixed; 
          top: 30px; 
          left: 50%; 
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(25px) saturate(200%);
          -webkit-backdrop-filter: blur(25px) saturate(200%);
          padding: 14px 28px; 
          border-radius: 100px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,1);
          font-size: 14px; 
          font-weight: 900; 
          color: #1d1d1f;
          z-index: 9999999999;
          display: flex; 
          align-items: center; 
          gap: 10px;
          animation: dynamicDrop 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          direction: rtl;
        }
        
        .apple-global-toast.success { border-bottom: 3px solid #34c759; }
        .apple-global-toast.error { border-bottom: 3px solid #ff3b30; color: #ff3b30; }
        .apple-global-toast.warning { border-bottom: 3px solid #ff9500; }
        .apple-global-toast.info { border-bottom: 3px solid #007aff; }

        @keyframes dynamicDrop {
          0% { top: -20px; opacity: 0; transform: translate(-50%, -20px) scale(0.9); }
          50% { transform: translate(-50%, 0) scale(1.05); }
          100% { top: 30px; opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

// الهوك اللي هتستخدمه في أي صفحة
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};