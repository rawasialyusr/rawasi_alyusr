"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context'; // 🚀 استدعاء نظام التنبيهات السيادي

export function useLoginLogic() {
  const router = useRouter();
  const { showToast } = useToast();
  
  // 🎛️ حالات الفورم
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 🧹 1. تنظيف الجلسات الشبح (Ghost Sessions)
  useEffect(() => {
    const clearGhostSession = async () => {
      await supabase.auth.signOut();
    };
    clearGhostSession();
  }, []);

  // 2. مزامنة قيم المتصفح (Autofill)
  useEffect(() => {
    const syncFields = () => {
      const emailField = document.querySelector('input[type="email"]') as HTMLInputElement;
      const passField = document.querySelector('input[type="password"]') as HTMLInputElement;
      if (emailField?.value && !email) setEmail(emailField.value);
      if (passField?.value && !password) setPassword(passField.value);
    };
    
    const intervals = [100, 500, 1000, 2000].map(t => setTimeout(syncFields, t));
    return () => intervals.forEach(t => clearTimeout(t));
  }, [email, password]);

  const handleAutoFill = (e: React.AnimationEvent<HTMLInputElement>) => {
    if (e.animationName === 'onAutoFillStart') {
      const target = e.target as HTMLInputElement;
      if (target.type === 'email') setEmail(target.value);
      if (target.type === 'password') setPassword(target.value);
    }
  };

  const toggleSignUp = () => {
    setIsSignUp(!isSignUp);
    setFullName('');
    setPassword('');
  };

  // 🚀 3. دالة التنفيذ (تسجيل دخول أو حساب جديد)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // 🆕 إنشاء حساب جديد
        if (!fullName.trim()) throw new Error('يرجى إدخال الاسم الكامل');
        if (password.length < 6) throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: 'client' 
            }
          }
        });

        if (error) throw error;
        
        showToast('✅ تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.', 'success');
        setIsSignUp(false);
        setPassword(''); 
        
      } else {
        // 🔑 تسجيل الدخول
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw new Error('بيانات الدخول غير صحيحة، يرجى المحاولة مرة أخرى.');
        
        showToast('تم تسجيل الدخول بنجاح! 🚀', 'success');
        router.push('/invoices'); // توجيه للداشبورد
      }
    } catch (error: any) {
      showToast(error.message, 'error'); // 👈 الاعتماد على التنبيهات السيادية بدل الـ HTML
    } finally {
      setIsLoading(false);
    }
  };

  // 🎯 تجريد المخرجات (Pure Return)
  return {
    isSignUp, toggleSignUp,
    fullName, setFullName,
    email, setEmail,
    password, setPassword,
    isLoading,
    handleAutoFill,
    handleSubmit
  };
}