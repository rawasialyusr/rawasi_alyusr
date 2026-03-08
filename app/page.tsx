"use client";
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  // بيانات المشاريع الحالية لشركة رواسي اليسر
  const projects = [
    { 
      id: 1, 
      name: 'مشروع برج الجوهرة السكني', 
      progress: 75, 
      costs: 1250000, 
      revenue: 2000000, 
      status: 'نشط',
      color: '#c5a059' // ذهبي RYC المعتمد
    },
    { 
      id: 2, 
      name: 'تطوير طريق الملك سلمان', 
      progress: 40, 
      costs: 850000, 
      revenue: 1500000, 
      status: 'تحت التنفيذ',
      color: '#3b82f6' 
    },
    { 
      id: 3, 
      name: 'مستشفى اليسر التخصصي', 
      progress: 90, 
      costs: 4500000, 
      revenue: 6200000, 
      status: 'أوشك على الانتهاء',
      color: '#10b981' 
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-SA', { 
      style: 'currency', 
      currency: 'SAR', 
      maximumFractionDigits: 0 
    }).format(value);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 20px 100px 20px', position: 'relative' }}>
      
      {/* رأس الصفحة */}
      <div style={{ 
        marginBottom: '40px', 
        borderBottom: '2px solid rgba(197, 160, 89, 0.1)',
        paddingBottom: '20px'
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#1a1410', margin: '0 0 5px 0' }}>متابعة المشاريع</h1>
        <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>نظرة عامة على الأداء الإنشائي والمالي لشركة RYC</p>
      </div>

      {/* شبكة المشاريع */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', 
        gap: '30px' 
      }}>
        {projects.map((project) => (
          <div 
            key={project.id}
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.7)', 
              backdropFilter: 'blur(10px)',
              borderRadius: '28px', 
              padding: '30px', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
              border: '1px solid rgba(255,255,255,0.6)',
              transition: 'all 0.4s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'center' }}>
              <span style={{ 
                backgroundColor: `${project.color}15`, 
                color: project.color, 
                padding: '8px 18px', 
                borderRadius: '12px', 
                fontSize: '13px', 
                fontWeight: '800' 
              }}>
                {project.status}
              </span>
              <span style={{ fontSize: '24px' }}>🏗️</span>
            </div>

            <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#1a1410', marginBottom: '25px', lineHeight: '1.4' }}>
              {project.name}
            </h3>

            <div style={{ marginBottom: '35px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>
                <span style={{ color: '#64748b' }}>نسبة الإنجاز</span>
                <span style={{ color: project.color }}>{project.progress}%</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#eee', borderRadius: '20px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${project.progress}%`, 
                  backgroundColor: project.color, 
                  height: '100%', 
                  borderRadius: '20px'
                }}></div>
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '20px', 
              borderTop: '1px solid #eee', 
              paddingTop: '25px',
              marginBottom: '20px'
            }}>
              <div>
                <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>التكاليف</span>
                <span style={{ fontSize: '16px', fontWeight: '900', color: '#ef4444' }}>{formatCurrency(project.costs)}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>الإيرادات</span>
                <span style={{ fontSize: '16px', fontWeight: '900', color: '#10b981' }}>{formatCurrency(project.revenue)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* زر إضافة مشروع جديد - ثابت في الزاوية السفلى اليسرى (الشمال) */}
      <button 
        onClick={() => router.push('/add-project')}
        style={{ 
          position: 'fixed',
          bottom: '40px',
          left: '40px', // الزاوية الشمال
          backgroundColor: '#1a1410', // لون داكن فخم
          color: '#c5a059', // لون ذهبي RYC
          border: '2px solid #c5a059', 
          padding: '16px 32px', 
          borderRadius: '50px', 
          fontWeight: '900', 
          fontSize: '16px',
          cursor: 'pointer',
          boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px) scale(1.05)';
          e.currentTarget.style.backgroundColor = '#c5a059';
          e.currentTarget.style.color = '#1a1410';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.backgroundColor = '#1a1410';
          e.currentTarget.style.color = '#c5a059';
        }}
      >
        <span style={{ fontSize: '24px' }}>+</span>
        إضافة مشروع جديد
      </button>

    </div>
  );
}