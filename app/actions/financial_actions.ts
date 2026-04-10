"use server";
import { supabase } from "@/lib/supabase";

export async function getMasterFinancialStats() {
  try {
    // دالة مساعدة لجلب المجموع بأمان وتجنب الـ Error لو الجدول مش موجود
    const getSum = async (tableName: string, column: string = 'amount', filter?: { col: string, val: any }) => {
      let query = supabase.from(tableName).select(column);
      if (filter) query = query.eq(filter.col, filter.val);
      
      const { data, error } = await query;
      if (error) {
        console.warn(`⚠️ Table ${tableName} may not exist yet or has an error:`, error.message);
        return 0;
      }
      return data?.reduce((sum, item) => sum + (Number(item[column]) || 0), 0) || 0;
    };

    // تنفيذ الطلبات بالتوازي (Parallel) لسرعة خرافية ⚡
    const [
      totalIn,
      supplierDebts,
      totalAdvances,
      totalDeductions,
      totalOut
    ] = await Promise.all([
      getSum('revenue_table'),                       // 1. الإيرادات
      getSum('supplier_bills', 'amount', { col: 'status', val: 'unpaid' }), // 2. مديونيات الموردين
      getSum('emp_adv'),                             // 3. السُلف
      getSum('emp_ded'),                             // 4. الخصومات
      getSum('expenses_table')                       // 5. المصروفات العامة
    ]);

    // حسابات إضافية "فشخة" للتقارير
    const netCashFlow = totalIn - totalOut; // السيولة الحالية
    const actualLaborCost = totalAdvances - totalDeductions; // التكلفة الصافية للعمالة حالياً
    const plannedBudget = 5000000; // ميزانية المشروع

    return {
      totalIn,
      totalOut,
      netCashFlow,
      supplierDebts,
      totalAdvances,
      totalDeductions,
      actualLaborCost,
      plannedBudget,
      lastUpdate: new Date().toLocaleString('ar-EG', { 
        hour: '2-digit', 
        minute: '2-digit', 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      })
    };
  } catch (error) {
    console.error("❌ Master Stats Critical Error:", error);
    return null;
  }
}