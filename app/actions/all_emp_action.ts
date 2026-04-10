"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from 'next/cache'

/**
 * دالة جلب بيانات الموظفين الشاملة
 */
export async function getAllEmployees(name: string = '', start: string = '', end: string = '') {
  try {
    // نجبر سوبابيز والأكشن إنه ميعملش كاش للداتا القديمة
    const { data, error } = await supabase.rpc('get_all_employees_data', {
      p_search_name: name || '',
      p_start_date: start || '',
      p_end_date: end || ''
    });

    if (error) {
      console.error("❌ خطأ في قاعدة البيانات:", error.message);
      return JSON.stringify([]);
    }

    // تحديث مسار الصفحة لضمان ظهور البيانات الجديدة
    revalidatePath('/all_emp');

    // إرجاع البيانات
    return JSON.stringify(data || []);

  } catch (error: any) {
    console.error("❌ عطل مفاجئ في الأكشن:", error.message);
    return JSON.stringify([]);
  }
}

/**
 * دالة لتحديث بيانات موظف
 */
export async function updateEmployeeAction(emp_id: number, updatedData: any) {
  try {
    const { error } = await supabase
      .from('all_emp')
      .update(updatedData)
      .eq('emp_id', emp_id);

    if (error) throw error;
    
    revalidatePath('/all_emp');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}