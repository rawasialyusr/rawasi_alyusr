// lib/theme.ts

export const THEME = {
  // 🌟 [المتغيرات السريعة المضافة للتوافق مع الشاشات الجديدة (Apple Style)]
  primary: '#C5A059',      // الذهبي الأساسي
  accent: '#977332',       // الذهبي الداكن / النحاسي
  background: '#0f172a',   // خلفية الشاشات الداكنة (مثل Sign Up)
  logo: '/RYC_Logo.png',   // مسار اللوجو
  success: '#10b981',      // الأخضر للنجاح
  danger: '#be123c',       // الأحمر للأخطاء
  ruby: '#e11d48',         // الأحمر الوردي للمهام والتنبيهات
  coffeeDark: '#43342E',   // البني الغامق للنصوص
  goldAccent: '#C5A059',   // نفس الذهبي للتوحيد

  // 1️⃣ الألوان الأساسية (Brand Palette)
  brand: {
    coffee: '#43342E',
    gold: '#C5A059',
    goldLight: '#E5C687',
    white: '#FFFFFF',
    slate: '#64748b',
    appleGray: '#f5f5f7',  // رمادي أبل الفاتح جداً للخلفيات
  },

  // 2️⃣ حالات النظام (Status Colors)
  status: {
    success: '#10b981',
    danger: '#be123c',
    warning: '#f59e0b',
    info: '#3b82f6',
  },

  // 3️⃣ المحرك الزجاجي (Glassmorphism Engine)
  glass: {
    bgOpacity: 0.7,          // درجة شفافية الخلفية
    blur: '15px',           // قوة التغبيش (Blur)
    borderOpacity: 0.4,      // شفافية الحدود
    saturate: '180%',        // تشبع الألوان خلف الزجاج
    borderWidth: '1px',
  },

  // 4️⃣ الجداول الذكية (Smart Tables)
  table: {
    headerBg: 'rgba(67, 52, 46, 0.05)',
    headerText: '#43342E',
    rowBg: 'rgba(255, 255, 255, 0.4)',
    rowHover: 'rgba(197, 160, 89, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // 5️⃣ السايد بار (Sidebar & Navigation)
  sidebar: {
    widthOpen: '320px',
    widthClosed: '65px',
    gradientStart: 'rgba(67, 52, 46, 0.98)', 
    gradientEnd: 'rgba(140, 106, 93, 0.8)',   
  },

  // 6️⃣ التدرجات الجاهزة (Gradients)
  gradients: {
    primary: 'linear-gradient(135deg, #43342E 0%, #8C6A5D 100%)',
    gold: 'linear-gradient(135deg, #C5A059 0%, #E5C687 100%)',
    glass: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 100%)',
    deepOcean: 'linear-gradient(145deg, #0f172a 0%, #020617 100%)', // للداشبورد المالي
    premiumSatin: 'linear-gradient(135deg, #f5f5f7 0%, #e2e8f0 100%)', // خلفية أبل فاتحة
  },

  // 🚀 7️⃣ الظلال الاحترافية (Apple-Style Shadows)
  shadows: {
    soft: '0 8px 30px rgba(0, 0, 0, 0.04)',
    medium: '0 20px 40px rgba(0, 0, 0, 0.08)',
    deep: '0 30px 60px rgba(0, 0, 0, 0.12)',
    goldGlow: '0 10px 30px rgba(197, 160, 89, 0.2)', // توهج ذهبي للأزرار
  },

  // 🚀 8️⃣ الانحناءات القياسية (Border Radius)
  radius: {
    small: '12px',
    medium: '20px',
    large: '32px',
    full: '100px',
  },

  // 🚀 9️⃣ نسخة التصميم الداكن (Dark Mode Specs)
  dark: {
    card: 'rgba(15, 23, 42, 0.6)', // كروت زجاجية غامقة
    border: 'rgba(255, 255, 255, 0.05)',
    textMain: '#f8fafc',
    textMuted: '#94a3b8',
  },

  // 🚀 10️⃣ الخطوط والأوزان (Typography)
  typography: {
    family: "'Cairo', sans-serif",
    weights: {
      regular: 400,
      semiBold: 600,
      bold: 700,
      black: 900,
    }
  }
};

// 🚀 دالة مساعدة لتوليد ستايل الزجاج فوراً
export const getGlassStyle = (opacity = THEME.glass.bgOpacity) => ({
  background: `rgba(255, 255, 255, ${opacity})`,
  backdropFilter: `blur(${THEME.glass.blur}) saturate(${THEME.glass.saturate})`,
  WebkitBackdropFilter: `blur(${THEME.glass.blur}) saturate(${THEME.glass.saturate})`,
  border: `${THEME.glass.borderWidth} solid rgba(255, 255, 255, ${THEME.glass.borderOpacity})`,
  borderRadius: THEME.radius.medium,
  boxShadow: THEME.shadows.soft,
});

// 🚀 دالة توليد الزجاج الداكن (للداشبورد المالي)
export const getDarkGlassStyle = (opacity = 0.6) => ({
    background: `rgba(15, 23, 42, ${opacity})`,
    backdropFilter: `blur(25px) saturate(180%)`,
    WebkitBackdropFilter: `blur(25px) saturate(180%)`,
    border: `1px solid rgba(255, 255, 255, 0.05)`,
    borderRadius: THEME.radius.medium,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
});