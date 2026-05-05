// app/reports/reports_logic.ts
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';

export function useReportsLogic() {
  const { showToast } = useToast();
  
  // فلتر التاريخ (الافتراضي: الشهر الحالي)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });

  // 🚀 جلب البيانات باستخدام محرك React Query (يتوافق مع معيار Offline-First)
  const { data: reportData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard_reports', dateRange.start, dateRange.end],
    queryFn: async () => {
      // استدعاء دالة Edge Function (RPC) من السيرفر لتخفيف العبء عن المتصفح
      const { data, error } = await supabase.rpc('get_comprehensive_dashboard', {
        start_date: dateRange.start,
        end_date: dateRange.end
      });

      if (error) {
        console.error("Dashboard Fetch Error:", error);
        showToast('فشل في جلب التقارير المالية', 'error');
        throw error;
      }
      return data;
    },
    staleTime: 5 * 60 * 1000, // الاحتفاظ بالبيانات لمدة 5 دقائق لتقليل الطلبات
  });

  // دالة لتحديث النطاق الزمني
  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  // دالة التحديث اليدوي
  const handleRefresh = () => {
    refetch();
    showToast('تم تحديث البيانات بنجاح', 'success');
  };

  return {
    reportData,
    isLoading: isLoading || isRefetching,
    dateRange,
    handleDateChange,
    handleRefresh
  };
}