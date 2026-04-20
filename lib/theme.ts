// lib/theme.ts

export const THEME = {
  // 1️⃣ الألوان الأساسية (Brand Palette)
  brand: {
    coffee: '#43342E',
    gold: '#C5A059',
    goldLight: '#E5C687',
    white: '#FFFFFF',
    slate: '#64748b',
  },

  // 2️⃣ حالات النظام (Status Colors)
  status: {
    success: '#10b981',
    danger: '#be123c',
    warning: '#f59e0b',
    info: '#3b82f6',
  },

  // 3️⃣ المحرك الزجاجي (Glassmorphism Engine)
  // دي القيم اللي هتغيرها من صفحة الإعدادات عشان تتحكم في "الشفافية"
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
    gradientStart: 'rgba(67, 52, 46, 0.98)', // بداية التدرج
    gradientEnd: 'rgba(140, 106, 93, 0.8)',   // نهاية التدرج
  },

  // 6️⃣ التدرجات الجاهزة (Gradients)
  gradients: {
    primary: 'linear-gradient(135deg, #43342E 0%, #8C6A5D 100%)',
    gold: 'linear-gradient(135deg, #C5A059 0%, #E5C687 100%)',
    glass: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 100%)',
  }
};

// 🚀 دالة مساعدة لتوليد ستايل الزجاج فوراً في أي مكان
export const getGlassStyle = (opacity = THEME.glass.bgOpacity) => ({
  background: `rgba(255, 255, 255, ${opacity})`,
  backdropFilter: `blur(${THEME.glass.blur}) saturate(${THEME.glass.saturate})`,
  WebkitBackdropFilter: `blur(${THEME.glass.blur}) saturate(${THEME.glass.saturate})`,
  border: `${THEME.glass.borderWidth} solid rgba(255, 255, 255, ${THEME.glass.borderOpacity})`,
});