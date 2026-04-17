"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/lib/theme';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // مثال: ['admin', 'accountant']
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkPermissions = async () => {
      setIsLoading(true);
      
      // 1. التأكد إن فيه مستخدم مسجل دخول أصلاً
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // 2. لو الصفحة محتاجة صلاحيات معينة، هنشيك على دور المستخدم
      if (allowedRoles && allowedRoles.length > 0) {
        const { data: profile } = await supabase
          .from('profiles') // اسم جدول المستخدمين عندك
          .select('role')
          .eq('id', session.user.id)
          .single();

        const userRole = profile?.role || 'viewer';

        // لو دوره مش موجود في المسموح ليهم
        if (!allowedRoles.includes(userRole) && userRole !== 'admin') {
          router.push('/unauthorized'); // وديه لصفحة "غير مصرح لك"
          return;
        }
      }

      setIsAuthorized(true);
      setIsLoading(false);
    };

    checkPermissions();
  }, [allowedRoles, router]);

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: THEME.slate }}>
        <h2 style={{ color: THEME.primary, fontWeight: 900 }}>🔐 جاري التحقق من صلاحيات الوصول...</h2>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return <>{children}</>;
}