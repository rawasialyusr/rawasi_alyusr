"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("بيانات الدخول غير صحيحة، حاول مرة أخرى.");
      setLoading(false);
    } else {
      router.push("/"); // التوجيه للصفحة الرئيسية بعد النجاح
      router.refresh();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>تسجيل الدخول</h2>
        <p style={styles.subtitle}>نظام الإدارة المالية للمشاريع</p>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>البريد الإلكتروني</label>
            <input
              type="email"
              placeholder="example@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>كلمة المرور</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "جاري التحقق..." : "دخول النظام"}
          </button>
        </form>
      </div>
    </div>
  );
}

// تنسيقات سريعة وجميلة
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#f4f7f6",
    fontFamily: "inherit",
  },
  card: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center" as const,
  },
  title: {
    color: "#2c3e50",
    marginBottom: "10px",
    fontSize: "24px",
    fontWeight: "bold",
  },
  subtitle: {
    color: "#7f8c8d",
    marginBottom: "30px",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
  },
  inputGroup: {
    textAlign: "right" as const,
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    color: "#34495e",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #dcdde1",
    fontSize: "16px",
    textAlign: "left" as const, // الإيميل والباسورد يفضل يسار
  },
  button: {
    backgroundColor: "#27ae60",
    color: "#fff",
    padding: "14px",
    borderRadius: "6px",
    border: "none",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background 0.3s",
  },
  error: {
    color: "#e74c3c",
    fontSize: "14px",
    marginTop: "-10px",
  },
};