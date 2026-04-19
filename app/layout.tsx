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
      <body className={cairo.className}>
        
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

        {/* 🏗️ ستايل اللوجو العائم (CSS فقط لتجنب أخطاء السيرفر) */}
        <style dangerouslySetInnerHTML={{__html: `
          .rawasi-logo-container {
            position: fixed;
            bottom: 30px;
            left: 30px;
            z-index: 100;
            opacity: 0.8;
            transition: opacity 0.3s ease;
          }
          .rawasi-logo-container:hover {
            opacity: 1;
          }
          .rawasi-logo-img {
            width: 80px;
            height: auto;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
          }
        `}} />

        {/* اللوجو العائم */}
        <div className="rawasi-logo-container no-print">
            <img src="/RYC_Logo.png" alt="رواسي" className="rawasi-logo-img" />
        </div>

        {/* 🛡️ تغليف السيستم بجدار الحماية لمنع الشاشة البيضاء عند حدوث خطأ */}
        <GlobalErrorBoundary>
            {/* 🚀 تغليف السيستم بالـ Providers لتفعيل الكاشينج الذكي في كل الصفحات */}
            <Providers>
                <AutoLogoutWrapper>
                    <LayoutClient>
                      {children}
                    </LayoutClient>
                </AutoLogoutWrapper>
            </Providers>
        </GlobalErrorBoundary>
        
      </body>
    </html>
  );
}