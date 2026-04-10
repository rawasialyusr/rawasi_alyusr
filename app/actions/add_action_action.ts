"use server"; // تأكد إن دي مكتوبة في أول سطر

import { createClient } from '@supabase/supabase-js'; // أو حسب إعدادات السوبابيز عندك
import { revalidatePath } from 'next/cache';

export async function getAllEmployeesAction() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // استخدم Service Role للأمان والسرعة أونلاين
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase
      .from('all_emp') // تأكد من اسم الجدول
      .select('*')
      .order('emp_name', { ascending: true });

    if (error) throw error;
    
    // إجبار Vercel على تحديث البيانات وعدم استخدام كاش قديم
    revalidatePath('/dynamic_action'); 
    
    return data;
  } catch (error) {
    console.error("Server Action Error:", error);
    return [];
  }
}