import { Cairo } from "next/font/google";
import LayoutClient from '../components/layout/LayoutClient';
import "./globals.css";
import AutoLogoutWrapper from '../components/AutoLogoutWrapper';
import Providers from './providers'; // 🚀 استدعاء مزود البيانات الذكي (React Query)
import NextTopLoader from 'nextjs-toploader'; // 🚀 استدعاء شريط التحميل العلوي
import GlobalErrorBoundary from '../components/globalerrorboundary'; // 🛡️ استدعاء جدار الحماية

const cairo = Cairo({ 
  subsets: ["arabic"],
  weight: ["400", "700", "900"],
  display: 'swap',
});

// 📱 إعدادات شريط المتصفح في الموبايل بلون قهوة رواسي
export const viewport = {
  themeColor: "#43342E",
};

// 🌐 هوية السيستم وربطه بملف الـ Manifest ليصبح تطبيق PWA
export const metadata = {
  title: "رواسي - نظام الإدارة الموحد",
  description: "نظام إدارة العمالة والمشاريع والمصروفات",
  manifest: "/manifest.json", // 🚀 ربط هوية التطبيق
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className} style={{ position: 'relative', minHeight: '100vh', backgroundColor: '#F4F1EE' }}>
        
        {/* 🚀 شريط التحميل العلوي الفخم بستايل رواسي الذهبي */}
        <NextTopLoader 
            color="#C5A059" 
            initialPosition={0.08} 
            crawlSpeed={200} 
            height={4} 
            crawl={true} 
            showSpinner={false} 
            easing="ease" 
            speed={200} 
            shadow="0 0 15px #C5A059, 0 0 5px #C5A059" 
            zIndex={99999} 
        />

        {/* 🏗️ ستايل العلامة المائية الخلفية */}
        <style dangerouslySetInnerHTML={{__html: `
          .watermark-bg {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60vw; /* حجم كبير متناسب مع الشاشة */
            max-width: 700px;
            opacity: 0.03; /* شفافية خفيفة جداً لتبدو كعلامة مائية حقيقية */
            z-index: 0; /* في الخلفية */
            pointer-events: none; /* السحر هنا: يمنع اللوجو من حجب نقرات الماوس على العناصر التي فوقه */
            user-select: none; /* يمنع تحديد الصورة بالماوس */
            /* filter: grayscale(100%); يمكنك تفعيل هذا السطر إذا أردت العلامة المائية رمادية تماماً */
          }
        `}} />

        {/* العلامة المائية (Watermark) */}
        <img src="/RYC_Logo.png" alt="علامة مائية رواسي" className="watermark-bg no-print" />

        {/* 🛡️ تغليف السيستم بجدار الحماية لمنع الشاشة البيضاء عند حدوث خطأ */}
        <GlobalErrorBoundary>
            {/* 🚀 تغليف السيستم بالـ Providers لتفعيل الكاشينج الذكي في كل الصفحات */}
            <Providers>
                <AutoLogoutWrapper>
                    <LayoutClient>
                      {/* إعطاء المحتوى z-index أعلى ليكون فوق العلامة المائية دائمًا */}
                      <div style={{ position: 'relative', zIndex: 10 }}>
                          {children}
                      </div>
                    </LayoutClient>
                </AutoLogoutWrapper>
            </Providers>
        </GlobalErrorBoundary>
        
      </body>
    </html>
  );
}