export const THEME = {
  // 🎨 الألوان الأساسية
  primary: '#0a1939',     
  secondary: '#38bdf8',   
  success: '#10b981',     
  accent: '#f59e0b',      
  ruby: '#e11d48',        
  text: '#1e293b',        
  textLight: '#64748b',   
  
  // 🔮 الخلفيات العامة (الفاتحة)
  pageBackground: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
  loginBackground: 'linear-gradient(135deg, #e0f2fe 0%, #f1f5f9 100%)', 

  // 🎬 الخلفيات السينمائية (الوضع الليلي الدرامي)
  cinematicBackground: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #020617 80%)', // ضوء خفيف من فوق وينزل لأسود كحلي
  
  // 💎 تأثير الزجاج البلوري الفاتح (Light Glass)
  glass: {
    background: 'rgba(255, 255, 255, 0.7)', 
    backdropFilter: 'blur(12px)',           
    WebkitBackdropFilter: 'blur(12px)',     
    border: '1px solid rgba(255, 255, 255, 0.8)', 
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.05)', 
    borderRadius: '16px',                   
  },

  // 🎬 تأثير الزجاج السينمائي (Cinematic Dark Glass)
  cinematicGlass: {
    background: 'rgba(15, 23, 42, 0.4)', // كحلي غامق جداً وشفاف
    backdropFilter: 'blur(20px)',        // بلور أقوى عشان يدي عمق
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)', // حافة مضيئة خفيفة جداً (Glowing Edge)
    borderTop: '1px solid rgba(255, 255, 255, 0.15)', // إضاءة علوية لتعزيز الواقعية
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', // ظل عميق جداً يعزل الفورم عن الخلفية
    borderRadius: '20px',
  }
};