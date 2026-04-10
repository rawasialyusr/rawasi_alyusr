"use server"
import { supabase } from "@/lib/supabase"

/**
 * جلب سجلات الخصومات مع دعم البحث المتقدم وحساب الإجمالي من السيرفر
 */
export async function getEmpDeductions(searchName: string = "", searchDate: string = "") {
  try {
    // استدعاء الـ RPC التي تعالج البحث والجمع في خطوة واحدة
    const { data, error } = await supabase.rpc('get_emp_ded_v1', {
      p_search_name: searchName || "", 
      p_search_date: searchDate || ""
    });

    if (error) {
      console.error("Supabase RPC Error (Deductions):", error.message);
      return { data: [], totalSum: 0 };
    }

    // استلام الإجمالي الكلي (total_db_sum) من أول صف في النتيجة
    // هذا الرقم يمثل مجموع كل الصفوف المفلترة حتى لو كانت آلاف الصفوف
    const totalSum = (data && data.length > 0) ? data[0].total_db_sum : 0;

    // تنظيف البيانات وتجهيزها للـ UI
    const sanitizedData = (data || []).map((item: any) => ({
      id: item.generated_id,
      date: item.date || "-",
      emp_name: item.emp_name || "غير معروف",
      // تحويل آمن للرقم لضمان عدم ظهور NaN
      amount: Number(item.amount) || 0,
      reason: item.reason || "-",
      notes: item.notes || "-"
    }));

    return { 
      data: sanitizedData, 
      totalSum: Number(totalSum) 
    };

  } catch (err) {
    console.error("Action Error:", err);
    return { data: [], totalSum: 0 };
  }
}