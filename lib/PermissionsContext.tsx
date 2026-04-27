"use client";
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from './supabase';

const PermissionsContext = createContext<any>(null);

export const PermissionsProvider = ({ children }: { children: React.ReactNode }) => {
    const [permissions, setPermissions] = useState<any>(null); // 👈 غيرناها لـ null للتمييز بين أول مرة والتحديث
    const [role, setRole] = useState<string>('client');
    const [loading, setLoading] = useState(true);

    const fetchPerms = async () => {
        // 🛡️ الدرع الماسي: لا تفعل حالة التحميل (Loading) إلا لو كانت البيانات فارغة تماماً (أول مرة فقط)
        if (!permissions) setLoading(true); 
        
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
                    const userRole = data.is_admin ? 'super_admin' : (data.role || 'client');
                    setRole(userRole);
                    setPermissions(data.permissions || {});

                    console.log(`🔐 تم تحديث الصلاحيات بصمت: [${userRole}]`);
                }
            }
        } catch (err) {
            console.error("❌ خطأ في تحميل الصلاحيات:", err);
        } finally {
            setLoading(false); // 👈 بيقفل التحميل بس المرة دي مش هيأثر على الواجهة لو الداتا موجودة
        }
    };

    useEffect(() => {
        fetchPerms();

        const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
            // 🛡️ فحص ذكي: لو التغيير مجرد "فوكس" أو تحديث جلسة، حدث في الخلفية بدون Loading
            fetchPerms();
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const can = (moduleName: string, actionName: string) => {
        if (role === 'super_admin' || role === 'admin') return true;
        const hasPermission = permissions?.[moduleName]?.[actionName] === true;
        return hasPermission;
    };

    const value = useMemo(() => ({
        can,
        role,
        permissions,
        loading,
        refreshPermissions: fetchPerms 
    }), [permissions, role, loading]);

    // 🚨 السطر السحري: لا تعرض شاشة سوداء أو تمسح الـ children طالما الـ permissions موجودة
    if (loading && !permissions) {
        return (
            <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F1EE" }}>
                <div className="loader">⏳ جاري فحص الصلاحيات السيادية...</div>
            </div>
        );
    }

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