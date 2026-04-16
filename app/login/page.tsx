"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // افترضت أنك تستخدم Supabase بناءً على الملفات السابقة

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
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justifyContent: center;
          direction: rtl;
          font-family: 'Cairo', sans-serif;
          
          /* 🟢 التعديل هنا: استخدام صورتك الخاصة ryc_login.jpeg كخلفية */
          /* قمنا بالإبقاء على طبقة الـ Gradient الداكنة لضمان وضوح النصوص والكارت الزجاجي */
          background-image: linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.95)), url('/ryc_login.jpeg');
          
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
        }

        .glass-card {
          width: 100%;
          max-width: 480px;
          background: rgba(15, 23, 42, 0.4); 
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
          text-align: center;
          margin-bottom: 30px;
        }

        .logo-container img {
          height: 110px;
          filter: drop-shadow(0px 10px 15px rgba(0,0,0,0.5));
          transition: transform 0.3s ease;
        }
        
        .logo-container img:hover {
          transform: scale(1.05);
        }

        .cinematic-title {
          color: ${THEME.white};
          font-weight: 900;
          font-size: 32px;
          text-align: center;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
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
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          color: ${THEME.white};
          font-size: 16px;
          font-weight: 700;
          outline: none;
          transition: all 0.3s ease;
        }

        .cinematic-input::placeholder {
          color: transparent; 
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
          transition: all 0.3s ease;
        }

        .cinematic-input:focus, .cinematic-input:not(:placeholder-shown) {
          border-color: ${THEME.accent};
          background: rgba(255, 255, 255, 0.1);
          box-shadow: 0 0 15px rgba(202, 138, 4, 0.2);
        }

        .cinematic-input:focus + .floating-label, 
        .cinematic-input:not(:placeholder-shown) + .floating-label {
          top: -10px;
          right: 15px;
          font-size: 13px;
          color: ${THEME.accent};
          background: ${THEME.primary};
          padding: 0 8px;
          border-radius: 4px;
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
          justifyContent: center;
          align-items: center;
        }

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 25px rgba(202, 138, 4, 0.4);
          background: linear-gradient(135deg, ${THEME.accentLight}, ${THEME.accent});
        }

        .submit-btn:active {
          transform: translateY(1px);
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid ${THEME.error};
          color: #fca5a5;
          padding: 12px;
          border-radius: 10px;
          text-align: center;
          font-weight: 700;
          font-size: 14px;
          margin-bottom: 20px;
          animation: fadeInUp 0.3s ease;
        }

        .ambient-light {
          position: fixed;
          top: -20%;
          left: -10%;
          width: 50vw;
          height: 50vw;
          background: radial-gradient(circle, rgba(202, 138, 4, 0.15) 0%, rgba(15, 23, 42, 0) 70%);
          border-radius: 50%;
          z-index: 0;
          pointer-events: none;
        }
      `}</style>

      <div className="ambient-light"></div>

      <div className="glass-card">
        <div className="logo-container">
          <img src="/RYC_Logo.png" alt="شعار شركة رواسي اليسر" />
        </div>
        
        <h1 className="cinematic-title">النظام المالي المتكامل</h1>
        <p className="cinematic-subtitle">شركة رواسي اليسر للمقاولات</p>

        {errorMsg && <div className="error-message">⚠️ {errorMsg}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <input 
              type="email" 
              className="cinematic-input" 
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              autoComplete="email"
            />
            <label className="floating-label">✉️ البريد الإلكتروني</label>
          </div>

          <div className="input-group">
            <input 
              type="password" 
              className="cinematic-input" 
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              autoComplete="current-password"
            />
            <label className="floating-label">🔒 كلمة المرور</label>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                ⏳ جاري التحقق...
              </span>
            ) : (
              'تسجيل الدخول 🚀'
            )}
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