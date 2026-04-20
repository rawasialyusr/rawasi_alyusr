"use client";
import { useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

// 1. إنشاء "Context" عشان الصلاحيات تكون متاحة في أي صفحة أو زرار
const AuthContext = createContext<{
  user: any;
  profile: any;
  loading: boolean;
  can: (module: string, action: string) => boolean;
} | null>(null);

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      setLoading(true);
      
      // جلب بيانات الجلسة الحالية
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // لو مش مسجل دخول، ارجع لصفحة اللوجن (إلا لو إنت فيها أصلاً)
        if (pathname !== "/login") router.replace("/login");
        setLoading(false);
        return;
      }

      setUser(session.user);

      // 🛡️ جلب البروفايل مع مصفوفة الصلاحيات (الـ JSONB)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);
      setLoading(false);
    };

    checkUser();

    // الاستماع لتغييرات حالة الدخول (لو عمل Logout مثلاً)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        router.replace("/login");
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [router, pathname]);

  // 🚀 دالة الفحص السحرية "can"
  // بنمرر لها اسم الموديول (مثلاً invoices) والأكشن (مثلاً stamp)
  const can = (module: string, action: string) => {
    if (profile?.is_admin) return true; // المدير معاه كل الصلاحيات
    
    const perms = profile?.permissions || {};
    // التأكد إن الموديول موجود جواه الأكشن المطلوب
    return Array.isArray(perms[module]) && perms[module].includes(action);
  };

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F1EE" }}>
        <div className="loader">⏳ جاري تأمين الاتصال برواسي...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, can }}>
      {children}
    </AuthContext.Provider>
  );
}

// هوك (Hook) مخصص عشان تستخدم الصلاحيات في أي مكان بسهولة
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthGuard");
  return context;
};