"use server"
import { supabase } from "@/lib/supabase"

export async function getAdvances(searchName: string = "", startDate: string = "", endDate: string = "") {
  try {
    const { data, error } = await supabase.rpc('get_all_advances_v3', {
      p_search_name: searchName || "", 
      p_start_date: startDate || "",
      p_end_date: endDate || ""
    });

    if (error) {
      console.error("Supabase Error:", error.message);
      return { data: [], totalSum: 0 };
    }

    if (!data || data.length === 0) {
      return { data: [], totalSum: 0 };
    }

    // 1. استخراج الإجمالي الكلي من أول سجل (لأنه محسوب في الباك أند لكل الصفوف)
    // الحقل total_db_sum هو اللي ضفناه في الـ RPC
    const totalSumFromDB = data[0].total_db_sum || 0;

    // 2. تنظيف البيانات وتجهيزها للعرض
    const sanitizedData = data.map((item: any) => ({
      ...item,
      // نضمن إن الحقل اسمه advance_val عشان الصفحة
      advance_val: parseFloat(item.advance_val || item.Advance_Val || 0)
    }));

    // 3. نرجع كائن يحتوي على الداتا + الإجمالي العام
    return { 
      data: sanitizedData, 
      totalSum: parseFloat(totalSumFromDB) 
    };

  } catch (err) {
    console.error("Action Crash:", err);
    return { data: [], totalSum: 0 };
  }
}