"use client";
import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';

interface SidebarContextType {
  actions: ReactNode;
  summary: ReactNode;
  setSidebarContent: (content: { actions: ReactNode; summary: ReactNode }) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<{ actions: ReactNode; summary: ReactNode }>({
    actions: null,
    summary: null,
  });

  // 🚀 1. الحل السحري: useCallback بتثبت الدالة في الذاكرة عشان متتغيرش مع كل Render
  const setSidebarContent = useCallback((newContent: { actions: ReactNode; summary: ReactNode }) => {
    setContent(newContent);
  }, []); // مصفوفة فارغة تعني إن الدالة دي هتتخلق مرة واحدة بس في حياة السيستم

  // 🚀 2. useMemo بتمنع الـ Components اللي بتستخدم الـ Context إنها تعيد رسم نفسها عمال على بطال
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