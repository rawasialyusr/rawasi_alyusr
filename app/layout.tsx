import { Cairo } from "next/font/google";
import LayoutClient from '../components/layout/LayoutClient';
import "./globals.css";
import AutoLogoutWrapper from '../components/AutoLogoutWrapper';
import Providers from './providers';
import NextTopLoader from 'nextjs-toploader';
import GlobalErrorBoundary from '../components/globalerrorboundary';
import { THEME } from '@/lib/theme'; 
import { SidebarProvider } from '@/lib/SidebarContext'; // 🚀 1. استدعاء مخزن السايد بار

const cairo = Cairo({ 
  subsets: ["arabic"],
  weight: ["400", "700", "900"],
  display: 'swap',
});

export const viewport = {
  themeColor: THEME.coffeeDark,
};

export const metadata = {
  title: "رواسي - نظام الإدارة الموحد",
  description: "نظام إدارة العمالة والمشاريع والمصروفات",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className} style={{ position: 'relative', minHeight: '100vh', color: THEME.text }}>
        
        {/* 🎨 1. ستايل الخلفية الزجاجية (تظل ثابتة) */}
        <style dangerouslySetInnerHTML={{__html: `
          .bg-master-container {
            position: fixed; inset: 0; z-index: -4; 
            background-color: ${THEME.sandLight}; 
            overflow: hidden;
          }
          .bg-image-base {
            position: absolute; inset: 0;
            background-image: url('/ryc_login.jpeg'); 
            background-size: cover;
            background-position: center;
            filter: blur(50px); 
            transform: scale(1.1); 
            opacity: 0.6; 
          }
          .bg-glass-tint {
            position: absolute; inset: 0; z-index: -3;
            background: linear-gradient(
              135deg, 
              rgba(244, 241, 238, 0.85) 0%, 
              rgba(255, 255, 255, 0.9) 50%,
              rgba(197, 160, 89, 0.15) 100% 
            );
            backdrop-filter: blur(10px) saturate(120%);
          }
          .watermark-bg {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 60vw; max-width: 700px; opacity: 0.03; z-index: -2;
            pointer-events: none; user-select: none;
          }
        `}} />

        <div className="bg-master-container no-print">
            <div className="bg-image-base"></div>
            <div className="bg-glass-tint"></div>
        </div>

        <img src="/RYC_Logo.png" alt="علامة مائية" className="watermark-bg no-print" />

        <NextTopLoader 
            color={THEME.goldAccent} 
            height={4} 
            showSpinner={false} 
            shadow={`0 0 15px ${THEME.goldAccent}`} 
            zIndex={99999} 
        />

        {/* 🛡️ 5. السيستم مغلف بالمخازن المطلوبة */}
        <GlobalErrorBoundary>
            <Providers>
                <AutoLogoutWrapper>
                    {/* 🚀 2. تغليف السايد بار لكل السيستم هنا */}
                    <SidebarProvider> 
                        <LayoutClient>
                            <div style={{ position: 'relative', zIndex: 10 }}>
                                {children}
                            </div>
                        </LayoutClient>
                    </SidebarProvider>
                </AutoLogoutWrapper>
            </Providers>
        </GlobalErrorBoundary>
        
      </body>
    </html>
  );
}