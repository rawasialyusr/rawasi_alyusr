"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';
import RawasiToast, { ToastType } from '@/components/RawasiToast';

// تعريف شكل البيانات
interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <RawasiToast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}
    </ToastContext.Provider>
  );
}

// الهوك اللي هتستخدمه في أي صفحة
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};