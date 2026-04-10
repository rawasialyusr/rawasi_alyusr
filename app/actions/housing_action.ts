"use server"
import { supabase } from "@/lib/supabase"

export async function getHousingServices(
  searchName: string = "", 
  serviceType: string = "", 
  month: string = ""
) {
  try {
    // استدعاء الـ RPC اللي عملناها في الخطوة السابقة
    const { data, error } = await supabase.rpc('get_housing_services_v1', {
      p_search_name: searchName || "", 
      p_service_type: serviceType || ""
      // ملاحظة: إذا أردت فلترة الشهر من SQL أضف p_month في الـ RPC
    });

    if (error) throw error;

    const totalSum = data && data.length > 0 ? data[0].total_db_sum : 0;
    
    // فلترة الشهر برمجياً إذا لم تكن موجودة في الـ RPC
    let filteredData = data || [];
    if (month) {
        filteredData = filteredData.filter((item: any) => 
            String(item.deduction_month).includes(month)
        );
    }

    return { 
      data: filteredData, 
      totalSum: parseFloat(totalSum) 
    };
  } catch (err) {
    console.error(err);
    return { data: [], totalSum: 0 };
  }
}