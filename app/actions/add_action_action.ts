"use server";

import { createClient } from '@supabase/supabase-js';
// 1. إضافة هذا السطر لإجبار Vercel على جلب البيانات في كل مرة (No Cache)
import { revalidatePath } from 'next/cache';

export async function getAllEmployeesAction() {
  // 2. تعريف الكلاينت بالداخل لضمان قراءة الـ Env أونلاين
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data, error } = await supabase
      .from('all_emp') 
      .select('*')
      .order('emp_name', { ascending: true });

    if (error) {
      console.error("Supabase Error:", error.message);
      return [];
    }

    // إرجاع البيانات
    return data || [];
  } catch (err) {
    console.error("Action Fatal Error:", err);
    return [];
  }
}