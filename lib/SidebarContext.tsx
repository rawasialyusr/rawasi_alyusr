"use client";
import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';

// 🚀 1. تحديث الـ Interface عشان يقبل الفلاتر المخصصة (customFilters)
interface SidebarContextType {
  actions: ReactNode;
  summary: ReactNode;
  customFilters?: ReactNode; // 👈 ضفنا دي كقيمة اختيارية
  setSidebarContent: (content: { actions: ReactNode; summary: ReactNode; customFilters?: ReactNode }) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // 🚀 2. تحديث الحالة المبدئية عشان تشمل الفلاتر
  const [content, setContent] = useState<{ actions: ReactNode; summary: ReactNode; customFilters?: ReactNode }>({
    actions: null,
    summary: null,
    customFilters: null, // 👈 القيمة المبدئية فاضية
  });

  // 🚀 3. الحل السحري: useCallback بتثبت الدالة في الذاكرة عشان متتغيرش مع كل Render
  // وتم تحديثها عشان تستقبل الفلاتر
  const setSidebarContent = useCallback((newContent: { actions: ReactNode; summary: ReactNode; customFilters?: ReactNode }) => {
    setContent(newContent);
  }, []); // مصفوفة فارغة تعني إن الدالة دي هتتخلق مرة واحدة بس في حياة السيستم

  // 🚀 4. useMemo بتمنع الـ Components اللي بتستخدم الـ Context إنها تعيد رسم نفسها عمال على بطال
  const value = useMemo(() => ({
    ...content,
    setSidebarContent
  }), [content, setSidebarContent]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within SidebarProvider");
  return context;
};