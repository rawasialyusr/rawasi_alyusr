"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function DiagnosticLoginPage() {
  const [status, setStatus] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string, type: "info" | "success" | "error" = "info") => {
    setStatus(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  // فحص العوامل الأساسية عند فتح الصفحة
  useEffect(() => {
    addLog("🔍 فحص الفرونت إند: جاري قراءة الإعدادات...");
    if (typeof window !== "undefined") {
      addLog("✅ الفرونت إند: المتصفح جاهز.");
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "غير موجود";
      addLog(`📡 رابط سوبابيس: ${url.substring(0, 20)}...`);
    }
  }, []);

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    addLog(`🚀 محاولة دخول للباك إند بالإيميل: ${email}`);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        addLog(`❌ فشل الباك إند: ${error.message}`, "error");
      } else {
        addLog(`✅ نجاح السوبابيس: تم تسجيل الدخول لليوزر ${data.user?.id}`, "success");
        addLog("⏳ فحص الجلسة (Session)...");
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          addLog("🎫 الجلسة محفوظة بنجاح في الكوكيز.", "success");
          addLog("🔄 سيتم تحويلك للرئيسية بعد 3 ثواني...");
          setTimeout(() => window.location.href = "/", 3000);
        } else {
          addLog("⚠️ تحذير: تم الدخول لكن الجلسة لم تُحفظ!", "error");
        }
      }
    } catch (err: any) {
      addLog(`💥 خطأ تقني غير متوقع: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', direction: 'rtl', fontFamily: 'monospace', backgroundColor: '#1a1a1a', minHeight: '100vh', color: '#fff' }}>
      <h2 style={{ borderBottom: '2px solid #c5a059', paddingBottom: '10px' }}>🛠️ معمل فحص "رواسي" (Diagnostic Tool)</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        {/* نموذج الدخول */}
        <div style={{ background: '#222', padding: '20px', borderRadius: '10px' }}>
          <h3>🔑 تجربة الدخول</h3>
          <form onSubmit={handleTestLogin}>
            <input type="email" placeholder="الايميل" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
            <input type="password" placeholder="الباسوورد" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} required />
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? "جاري الفحص..." : "تشغيل اختبار الدخول 🚀"}
            </button>
          </form>
        </div>

        {/* شاشة اللوج (Logs) */}
        <div style={{ background: '#000', padding: '15px', borderRadius: '10px', height: '400px', overflowY: 'auto' }}>
          <h3 style={{ color: '#c5a059' }}>📟 تقرير الحالة المباشر:</h3>
          {status.map((s, i) => (
            <div key={i} style={{ marginBottom: '8px', color: s.type === 'error' ? '#ff4d4d' : s.type === 'success' ? '#4dff4d' : '#fff' }}>
              <small>[{s.time}]</small> {s.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #444', backgroundColor: '#333', color: '#fff' };
const btnStyle = { width: '100%', padding: '12px', backgroundColor: '#c5a059', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: 'pointer' };