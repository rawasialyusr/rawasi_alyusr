"use server";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getAllEmployeesAction() {
  try {
    const { data, error } = await supabase
      .from('all_emp')
      .select('*') // بنجيب كل البيانات عشان الـ Auto-fill يشتغل صح
      .order('emp_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching employees:", error);
    return [];
  }
}