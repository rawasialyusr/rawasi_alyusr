"use client";
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from './supabase';

const PermissionsContext = createContext<any>(null);

export const PermissionsProvider = ({ children }: { children: React.ReactNode }) => {
    const [permissions, setPermissions] = useState<any>({});
    const [role, setRole] = useState<string>('client');
    const [loading, setLoading] = useState(true);

    const fetchPerms = async () => {
        setLoading(true);
        try {
            // 1. نجيب اليوزر الحالي
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
                // 2. نجيب بيانات البروفايل والصلاحيات
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role, permissions, is_admin')
                    .eq('id', user.id)
                    .single();
                    
                if (data) {
                    // 🛡️ تحديد الدور: لو is_admin هو الملك (super_admin)
                    const userRole = data.is_admin ? 'super_admin' : (data.role || 'client');
                    
                    setRole(userRole);
                    setPermissions(data.permissions || {});

                    // 🚩 رادار للمبرمج (تقدر تمسحه بعد التأكد)
                    console.log(`🔐 تم تحميل صلاحيات: [${userRole}]`, data.permissions);
                }
            }
        } catch (err) {
            console.error("❌ خطأ في تحميل الصلاحيات:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPerms();

        // 🔄 تحديث تلقائي لو حصل تغيير في حالة تسجيل الدخول
        const { data: authListener } = supabase.auth.onAuthStateChange(() => {
            fetchPerms();
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // 🧠 الدالة السحرية - تم تحسينها لتكون أكثر مرونة
    const can = (moduleName: string, actionName: string) => {
        // 1. الإدارة العليا لها "مفتاح ماستر" لكل شيء
        if (role === 'super_admin' || role === 'admin') return true;

        // 2. فحص الصلاحية في الكائن (Object)
        // بنتأكد إن الموديول موجود، والأكشن جواه موجود وقيمته true بالظبط
        const hasPermission = permissions?.[moduleName]?.[actionName] === true;
        
        return hasPermission;
    };

    // 📦 تجميع القيم في useMemo عشان الأداء يكون أسرع والزراير متتهزش
    const value = useMemo(() => ({
        can,
        role,
        permissions, // ضفناها هنا عشان تقدر تشوفها في الـ SecureAction لو حبيت
        loading,
        refreshPermissions: fetchPerms // دالة لو حبيت تحدث الصلاحيات يدوي
    }), [permissions, role, loading]);

    return (
        <PermissionsContext.Provider value={value}>
            {children}
        </PermissionsContext.Provider>
    );
};

export const usePermissions = () => {
    const context = useContext(PermissionsContext);
    if (!context) {
        throw new Error("usePermissions must be used within a PermissionsProvider");
    }
    return context;
};