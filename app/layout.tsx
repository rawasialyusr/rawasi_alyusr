import { Cairo } from "next/font/google";
import LayoutClient from '../components/layout/LayoutClient';
import "./globals.css";

// 1. إعداد الخط بشكل صحيح (Server Side)
const cairo = Cairo({ 
  subsets: ["arabic"],
  weight: ["400", "700", "900"],
  display: 'swap',
});

// 2. إعدادات الميتا داتا للموقع
export const metadata = {
  title: "رواسي - نظام الإدارة الموحد",
  description: "نظام إدارة العمالة والمشاريع والمصروفات",
};

// 3. المكون الرئيسي (يجب أن يكون Server Component)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className} style={{ margin: 0, padding: 0 }}>
        {/* LayoutClient هنا هو "المايسترو":
            - بيتعامل مع الـ Auth (لو مش مسجل دخول يحولك للوجين).
            - بيجيب الصلاحيات من الـ JSON.
            - بيعرض المنيو العائمة لكل الصفحات اللي في الصورة (20+ صفحة).
        */}
        <LayoutClient>
          {children}
        </LayoutClient>
      </body>
    </html>
  );
}