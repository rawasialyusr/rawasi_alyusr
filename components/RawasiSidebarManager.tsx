"use client";
import React, { useEffect, useRef } from 'react';
import { useSidebar } from '@/lib/SidebarContext';

interface SidebarProps {
    summary?: React.ReactNode;
    actions?: React.ReactNode;
    customFilters?: React.ReactNode; 
    onSearch?: (term: string) => void;
    onDateFilter?: (start: string, end: string) => void;
    watchDeps?: any[]; 
}

export default function RawasiSidebarManager({ 
    summary, 
    actions, 
    customFilters, 
    onSearch, 
    onDateFilter, 
    watchDeps = [] 
}: SidebarProps) {
    const { setSidebarContent } = useSidebar();

    // 🚀 1. الحارس الذكي: هنراقب التغيرات يدوياً عشان نتجنب مشاكل JSON.stringify ومشاكل React
    const prevDeps = useRef<any[]>(watchDeps);
    const trigger = useRef(0);

    // فحص هل القيم اتغيرت فعلياً مقارنة بالمرة اللي فاتت؟
    const isChanged = watchDeps.length !== prevDeps.current.length || 
                      watchDeps.some((dep, i) => dep !== prevDeps.current[i]);

    if (isChanged) {
        trigger.current += 1; // بنزود العداد بس عشان نقول للـ useEffect يشتغل
        prevDeps.current = watchDeps;
    }

    // 🚀 2. إرسال المحتوى للسايد بار (يعتمد على العداد فقط عشان يكون مستقر 100%)
    useEffect(() => {
        setSidebarContent({ summary, actions, customFilters });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trigger.current, setSidebarContent]); 

    // 🚀 3. تنظيف السايد بار عند مغادرة الصفحة
    useEffect(() => {
        return () => {
            setSidebarContent({ actions: null, summary: null, customFilters: null });
        };
    }, [setSidebarContent]);

    // 🚀 4. ربط البحث والفلاتر العامة
    useEffect(() => {
        const hSearch = (e: any) => onSearch?.(e.detail);
        const hDate = (e: any) => onDateFilter?.(e.detail.start, e.detail.end);

        window.addEventListener('globalSearch', hSearch);
        window.addEventListener('globalDateFilter', hDate);

        return () => {
            window.removeEventListener('globalSearch', hSearch);
            window.removeEventListener('globalDateFilter', hDate);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onSearch, onDateFilter]);

    return null; 
}