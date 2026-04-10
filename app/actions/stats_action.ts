"use server"
import { supabase } from "@/lib/supabase"

export async function getDashboardStats() {
  try {
    // 1. جلب إجمالي الخصومات
    const { data: dedData } = await supabase.from('emp_ded').select('amount');
    const totalDeductions = dedData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

    // 2. جلب عدد الموظفين (مثال من جدول الموظفين)
    const { count: empCount } = await supabase.from('employees').select('*', { count: 'exact', head: true });

    // 3. جلب عدد المشاريع النشطة
    const { count: siteCount } = await supabase.from('sites').select('*', { count: 'exact', head: true });

    return {
      totalDeductions,
      empCount: empCount || 0,
      siteCount: siteCount || 0,
      lastUpdate: new Date().toLocaleDateString('ar-EG')
    };
  } catch (error) {
    return { totalDeductions: 0, empCount: 0, siteCount: 0, lastUpdate: "-" };
  }
}