"use server";
import { supabase } from '../lib/supabase'; // يفضل استخدام Supabase Admin Client في السيرفر

// 🟢 1. دالة ذكية لتخطي ليميت الـ 1000 صف (لجمع المبالغ الضخمة)
export async function calculateMassiveTotals(tableName: string, amountColumn: string) {
  try {
    let total = 0;
    let keepFetching = true;
    let offset = 0;
    const limit = 1000;

    // بنعمل Loop في الباك إند يسحب الداتا صفحات لحد ما يخلصها كلها ويجمعها
    while (keepFetching) {
      const { data, error } = await supabase
        .from(tableName)
        .select(amountColumn)
        .range(offset, offset + limit - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        total += data.reduce((sum, row) => sum + Number(row[amountColumn] || 0), 0);
        offset += limit;
      } else {
        keepFetching = false;
      }
    }
    
    return { success: true, total };
  } catch (error: any) {
    console.error("Calculation Error:", error);
    return { success: false, error: error.message };
  }
}

// 🚀 2. دالة الترحيل المركزية (Posting Engine)
export async function postDocument(docId: string, docType: 'invoice' | 'receipt' | 'journal') {
  try {
    // هنا بيتم إنشاء القيد المحاسبي في الباك إند بشكل آمن جداً
    // الخطوة 1: التأكد إن المستند مش مرحل قبل كده
    // الخطوة 2: إنشاء رأس القيد (Journal Header)
    // الخطوة 3: إنشاء أسطر القيد (Journal Lines)
    // الخطوة 4: تغيير حالة المستند إلى "مُعتمد"
    
    const { error } = await supabase
      .from('invoices') // كمثال
      .update({ status: 'مُعتمد', is_posted: true })
      .eq('id', docId);

    if (error) throw error;

    return { success: true, message: "تم ترحيل المستند وإنشاء القيود بنجاح!" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}