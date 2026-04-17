"use client";
import React from 'react';
import { useAutoLogout } from '@/hooks/useAutoLogout'; // مسار الـ Hook اللي عملناه

export default function AutoLogoutWrapper({ children }: { children: React.ReactNode }) {
  // تفعيل العداد هنا (15 دقيقة)
  useAutoLogout(15);

  // المكون ده مش بيرسم أي حاجة في الشاشة، هو بس بيشغل الـ Hook ويرجع الـ children
  return <>{children}</>;
}