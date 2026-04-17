"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const THEME = {
  primary: '#0f172a',
  accent: '#ca8a04',
  accentLight: '#eab308',
  white: '#ffffff',
  slate: '#94a3b8',
  error: '#ef4444'
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. مزامنة قيم المتصفح (Autofill) لضمان طيران العنوان فوراً
  useEffect(() => {
    const syncFields = () => {
      const emailField = document.querySelector('input[type="email"]') as HTMLInputElement;
      const passField = document.querySelector('input[type="password"]') as HTMLInputElement;
      if (emailField?.value && !email) setEmail(emailField.value);
      if (passField?.value && !password) setPassword(passField.value);
    };
    
    // فحص دوري في الثواني الأولى للتأكد من التقاط بيانات المتصفح
    const intervals = [100, 500, 1000, 2000].map(t => setTimeout(syncFields, t));
    return () => intervals.forEach(t => clearTimeout(t));
  }, [email, password]);

  // 2. اكتشاف الـ Autofill عبر الأنيميشن (حل تقني متقدم)
  const handleAutoFill = (e: React.AnimationEvent<HTMLInputElement>) => {
    if (e.animationName === 'onAutoFillStart') {
      const target = e.target as HTMLInputElement;
      if (target.type === 'email') setEmail(target.value);
      if (target.type === 'password') setPassword(target.value);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      router.push('/invoices'); 
    } catch (error: any) {
      setErrorMsg('بيانات الدخول غير صحيحة، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        @keyframes onAutoFillStart { from {} to {} }

        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          direction: rtl;
          font-family: 'Cairo', sans-serif;
          background-image: linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.95)), url('/ryc_login.jpeg');
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
        }

        .glass-card {
          width: 100%;
          max-width: 480px;
          background: rgba(15, 23, 42, 0.6); 
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(202, 138, 4, 0.3); 
          border-radius: 24px;
          padding: 50px 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(202, 138, 4, 0.15); 
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          margin: 20px;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .logo-container {
  text-align: right; /* 👈 يخلي اللوجو يروح أقصى اليمين */
  margin-bottom: 25px;
}

        .logo-container img {
          height: 110px;
          filter: drop-shadow(0px 10px 15px rgba(0,0,0,0.5));
          transition: transform 0.3s ease;
        }
        
        .logo-container img:hover { transform: scale(1.05); }

        .cinematic-title {
          color: ${THEME.white};
          font-weight: 900;
          font-size: 32px;
          text-align: center;
          margin-bottom: 8px;
        }

        .cinematic-subtitle {
          color: ${THEME.slate};
          text-align: center;
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 40px;
        }

        .input-group {
          position: relative;
          margin-bottom: 25px;
        }

        .cinematic-input {
          width: 100%;
          padding: 18px 20px;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          color: ${THEME.white} !important;
          font-size: 16px;
          font-weight: 700;
          outline: none;
          transition: all 0.3s ease;
          text-align: right;
        }

        /* تنسيق الـ Autofill لمنع تغير الخلفية وتداخل النصوص */
        .cinematic-input:-webkit-autofill {
          animation-name: onAutoFillStart;
          -webkit-text-fill-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0px 1000px #151c2c inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .floating-label {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          color: ${THEME.slate};
          font-size: 16px;
          font-weight: 700;
          pointer-events: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10;
        }

        /* 🚀 الحل المعياري: رفع العنوان "بره الصندوق" تماماً بخلفية صلبة */
        .cinematic-input:focus ~ .floating-label, 
        .cinematic-input:not(:placeholder-shown) ~ .floating-label,
        .cinematic-input:-webkit-autofill ~ .floating-label,
        .forced-float {
          top: -12px !important;
          right: 15px !important;
          font-size: 13px !important;
          color: ${THEME.accent} !important;
          background: #151c2c !important; /* لون خلفية الكارت لقطع خط الحدود */
          padding: 0 10px !important;
          border-radius: 4px !important;
          transform: translateY(0) !important;
          opacity: 1 !important;
          font-weight: 900 !important;
        }

        .submit-btn {
          width: 100%;
          padding: 18px;
          margin-top: 10px;
          background: linear-gradient(135deg, ${THEME.accent}, ${THEME.accentLight});
          color: ${THEME.primary};
          border: none;
          border-radius: 14px;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 20px rgba(202, 138, 4, 0.3);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 25px rgba(202, 138, 4, 0.4);
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid ${THEME.error};
          color: #fca5a5;
          padding: 12px;
          border-radius: 10px;
          text-align: center;
          font-weight: 700;
          margin-bottom: 20px;
        }
      `}</style>

      <div className="glass-card">
        <div className="logo-container">
          <img src="/RYC_Logo.png" alt="شعار شركة رواسي اليسر" />
        </div>
        
        <h1 className="cinematic-title">رواسي اليسر</h1>
        <p className="cinematic-subtitle">النظام المالي المتكامل</p>

        {errorMsg && <div className="error-message">⚠️ {errorMsg}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <input 
              type="email" 
              className="cinematic-input" 
              placeholder=" " 
              value={email}
              onAnimationStart={handleAutoFill}
              onChange={(e) => setEmail(e.target.value)}
              required 
              autoComplete="email"
            />
            <label className={`floating-label ${email ? 'forced-float' : ''}`}>✉️ البريد الإلكتروني</label>
          </div>

          <div className="input-group">
            <input 
              type="password" 
              className="cinematic-input" 
              placeholder=" " 
              value={password}
              onAnimationStart={handleAutoFill}
              onChange={(e) => setPassword(e.target.value)}
              required 
              autoComplete="current-password"
            />
            <label className={`floating-label ${password ? 'forced-float' : ''}`}>🔒 كلمة المرور</label>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? '⏳ جاري التحقق...' : 'تسجيل الدخول 🚀'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '25px' }}>
          <p style={{ color: THEME.slate, fontSize: '13px', fontWeight: 600 }}>
            جميع الحقوق محفوظة © {new Date().getFullYear()} <br/> إدارة تقنية المعلومات - رواسي اليسر
          </p>
        </div>
      </div>
    </div>
  );
}