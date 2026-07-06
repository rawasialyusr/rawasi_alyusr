"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/toast-context';

export default function GlobalNavigationShortcuts() {
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // فقط لو ضغط Alt بدون أي مفاتيح مساعدة تانية
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        let path = '';
        let name = '';
        
        switch (e.code) {
          case 'Digit1':
          case 'Numpad1': path = '/Dashboard'; name = 'الداشبورد'; break;
          case 'Digit2':
          case 'Numpad2': path = '/labor_logs'; name = 'يومية العمالة'; break;
          case 'Digit3':
          case 'Numpad3': path = '/expenses'; name = 'المصروفات'; break;
          case 'Digit4':
          case 'Numpad4': path = '/PaymentVouchers'; name = 'سندات الصرف'; break;
          case 'Digit5':
          case 'Numpad5': path = '/ReceiptVouchers'; name = 'سندات القبض'; break;
          case 'Digit6':
          case 'Numpad6': path = '/invoices'; name = 'الفواتير'; break;
          case 'Digit7':
          case 'Numpad7': path = '/audit'; name = 'الأودت'; break;
          case 'Digit8':
          case 'Numpad8': path = '/violations'; name = 'المخالفات'; break;
          case 'Digit9':
          case 'Numpad9': path = '/statement'; name = 'كشف الحساب العام'; break;
          case 'Digit0':
          case 'Numpad0': path = '/PartnerBalances'; name = 'أرصدة الجهات'; break;
        }

        if (path) {
          e.preventDefault();
          showToast(`🚀 جاري الانتقال إلى: ${name}...`, 'info');
          router.push(path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, showToast]);

  return null;
}
