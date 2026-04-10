import { Cairo } from "next/font/google";
import LayoutClient from "./LayoutClient"; 
import "./globals.css";

const cairo = Cairo({ 
  subsets: ["arabic"],
  weight: ["400", "700", "900"] 
});

export const metadata = {
  title: "رواسي - نظام الإدارة",
  description: "نظام إدارة العمالة والمشاريع",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>
        {/* LayoutClient هنا يقوم بدورين:
            1. حماية المسارات: لو المستخدم مش مسجل دخول يحوله لصفحة /login.
            2. عرض القائمة العائمة: تظهر فقط بعد تسجيل الدخول الناجح.
        */}
        <LayoutClient>
          {children}
        </LayoutClient>
      </body>
    </html>
  );
}