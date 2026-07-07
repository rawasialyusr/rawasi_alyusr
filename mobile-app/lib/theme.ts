// الهوية البصرية المطابقة لتطبيق الويب مع لمسات سينيمائية ذهبية (Cinematic Gold Glassmorphism)

export const COLORS = {
  primary: '#1d1d1f',      // أسود أبل (النصوص الرئيسية والأيقونات القوية)
  primaryLight: '#434344',
  
  accent: '#ca8a04',       // الذهبي الخاص برواسي اليسر
  accentLight: '#eab308',
  
  // تدرجات ذهبية سينيمائية (Cinematic Gold Gradients)
  cinematicGold: ['#bf953f', '#fcf6ba', '#b38728', '#fbf5b7', '#aa771c'], // تدرج ذهبي لامع
  cinematicDarkGold: ['#8b5a2b', '#ca8a04', '#d97706'], 
  
  background: '#f5f5f7',   // رمادي فاتح جداً (نفس خلفية الويب)
  surface: 'rgba(255, 255, 255, 0.9)', // أبيض شفاف (تأثير الزجاج المضيء)
  surfaceSolid: '#ffffff',
  
  text: '#1d1d1f',         // نصوص سوداء
  textLight: '#64748b',    // نصوص رمادية
  
  success: '#16a34a',      // أخضر داكن
  danger: '#ff3b30',       // أحمر أبل
  warning: '#f59e0b',      // برتقالي
  
  border: 'rgba(255, 255, 255, 0.8)',
  cardShadow: 'rgba(0, 0, 0, 0.05)',
};

export const SIZES = {
  padding: 16,
  radius: 24,     // حواف Apple Card
  radiusSm: 12,
  borderWidth: 1.5, // عرض الحد الذهبي
};

export const SHADOWS = {
  card: {
    shadowColor: '#ca8a04',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
  glow: {
    shadowColor: '#ca8a04',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  }
};
