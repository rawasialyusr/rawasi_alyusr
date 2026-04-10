"use server";
import { createClient } from '@supabase/supabase-js';

export async function getAllEmployeesAction() {
  // إضافة تسجيل للخطأ عشان نعرف إيه اللي ناقص لوكال
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("❌ خطأ: مفاتيح الاتصال غير مكتملة في ملف .env");
    return [];
  }

  const supabase = createClient(url, key);

  try {
    const { data, error } = await supabase
      .from('all_emp')
      .select('*')
      .order('emp_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Server Action Error:", error);
    return [];
  }
}