"use server";

import { supabase } from '@/lib/supabase';

// دالة البحث عن الموظفين (Live Search)
export async function searchEmployees(term: string) {
  try {
    const { data, error } = await supabase
      .from('all_emp') // بناءً على اسم الجدول في الصورة بتاعتك
      .select('*')
      .ilike('emp_name', `%${term}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("❌ خطأ في البحث عن الموظفين:", error);
    return [];
  }
}
// دالة جلب كل الموظفين (لصفحة عرض الموظفين)
export async function getAllEmployees() {
  try {
    const { data, error } = await supabase
      .from('all_emp') // تأكد إن ده اسم جدول الموظفين عندك
      .select('*')
      .order('id', { ascending: true }); // ممكن ترتبهم بالـ id أو الاسم

    if (error) {
      console.error("❌ خطأ من قاعدة البيانات:", error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("❌ خطأ في جلب كل الموظفين:", error);
    return [];
  }
}