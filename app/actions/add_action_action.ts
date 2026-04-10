"use server"
import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

// دالة عامة لإضافة بيانات لأي جدول (موظف جديد، سلفة، يومية...)
export async function addRecord(tableName: string, recordData: any) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .insert([recordData])
      .select();

    if (error) throw error;

    // تحديث الكاش لكي تظهر البيانات الجديدة فوراً في الصفحة
    revalidatePath(`/${tableName}`); 
    
    return { success: true, data };
  } catch (error: any) {
    console.error(`Error adding to ${tableName}:`, error.message);
    return { success: false, error: error.message };
  }
}