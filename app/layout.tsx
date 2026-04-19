import { Cairo } from "next/font/google";
import LayoutClient from '../components/layout/LayoutClient';
import "./globals.css";
import AutoLogoutWrapper from '../components/AutoLogoutWrapper';

const cairo = Cairo({ 
  subsets: ["arabic"],
  weight: ["400", "700", "900"],
  display: 'swap',
});

export const metadata = {
  title: "رواسي - نظام الإدارة الموحد",
  description: "نظام إدارة العمالة والمشاريع والمصروفات",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>
        
        {/* 🏗️ اللوجو العائم - الكلاسات موجودة في globals.css دلوقتي */}
        <div className="app-branding no-print">
            <img src="/logo.png" alt="رواسي" />
        </div>

        <AutoLogoutWrapper>
            <LayoutClient>
              {children}
            </LayoutClient>
        </AutoLogoutWrapper>
        
      </body>
    </html>
  );
}