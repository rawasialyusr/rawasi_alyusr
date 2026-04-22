"use client";
import React from 'react';
import { usePermissions } from '@/lib/PermissionsContext'; // 👈 ده السطر اللي كان ناقص وعمل المشكلة

interface SecureActionProps {
    module: string;
    action: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export default function SecureAction({ module, action, children, fallback = null }: SecureActionProps) {
    const { can, loading, role } = usePermissions();

    // 1. وقت التحميل منظهرش حاجة عشان الزرار ميرعش
    if (loading) return null; 

    // 2. الإدارة العليا بتشوف كل حاجة
    if (role === 'super_admin' || role === 'admin') {
        return <>{children}</>;
    }
    
    // 3. لو الموظف عنده الصلاحية، نعرض الزرار
    if (can(module, action)) {
        return <>{children}</>;
    }
    
    // 4. لو معندوش الصلاحية، نعرض الفولباك (أو نلغيه تماماً لو مفيش فولباك)
    return <>{fallback}</>;
}