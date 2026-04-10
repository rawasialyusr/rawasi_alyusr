"use server"
import { supabase } from "@/lib/supabase"

/**
 * 1. جلب بيانات التقارير (باستخدام الترقيم لضمان جلب كل شيء)
 * ملاحظة: سوبابيز يرجع 1000 سجل بحد أقصى، لذا نستخدم الحلقة لجلب الكل
 */
export async function getDailyReports() {
  try {
    let allData: any[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('daily_report') 
        .select('*')
        .order('date', { ascending: false })
        .range(from, from + step - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allData = [...allData, ...data];
      if (data.length < step) break;
      from += step;
    }

    return JSON.stringify(allData);
  } catch (error: any) {
    console.error("❌ Error fetching reports:", error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * 2. جلب إحصائيات الموظفين عبر الـ RPC (الحل السحري للسرعة)
 * يتم تنفيذ الحسابات داخل قاعدة البيانات مباشرة
 */
export async function getEmployeesLiveStats(name: string = '', start: string = '', end: string = '') {
  try {
    // تجهيز البارامترات المرسلة للدالة في سوبابيز
    const rpcParams = {
      p_search_name: String(name || '').trim(),
      p_start_date: String(start || '').trim(),
      p_end_date: String(end || '').trim()
    };
console.log("Sending Params:", rpcParams);
    // استدعاء دالة الـ RPC التي قمت بإنشائها في SQL Editor
    const { data, error } = await supabase.rpc('get_employees_with_custom_totals_v2', rpcParams);

    if (error) {
      console.error("❌ RPC Database Error:", error.message);
      // إرجاع أصفار في حالة الخطأ لضمان عدم انهيار الواجهة
      return JSON.stringify([{ 
        total_days_worked: 0, 
        total_production: 0, 
        total_attendance: 0, 
        records_count: 0 
      }]);
    }

    return JSON.stringify(data || []);
  } catch (error: any) {
    console.error("❌ Stats Server Error:", error.message);
    return JSON.stringify([]);
  }
}

/**
 * 3. تحديث سجل (مع تحويل القيم لأرقام لضمان صحة الـ RPC مستقبلاً)
 */
export async function updateDailyReport(id: string, updatedData: any) {
  try {
    const cleanData = {
      emp_name: updatedData.emp_name || updatedData.Emp_Name,
      main_cont: updatedData.main_cont || updatedData.Main_Cont,
      site: updatedData.site || updatedData.Site,
      item: updatedData.item || updatedData.Item,
      d_w: Number(updatedData.d_w || updatedData.D_W || 0),
      prod: Number(updatedData.prod || updatedData.Prod || 0),
      attendance: updatedData.attendance || updatedData.Attendance,
      date: updatedData.date || updatedData.Date,
    };

    const { data, error } = await supabase
      .from('daily_report')
      .update(cleanData)
      .eq('id', id)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error("❌ Update Error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 4. حذف سجلات
 */
export async function deleteDailyReports(ids: string[]) {
  try {
    const { error } = await supabase
      .from('daily_report')
      .delete()
      .in('id', ids);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("❌ Delete Error:", error.message);
    return { success: false, error: error.message };
  }
}