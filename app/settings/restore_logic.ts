import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export function useRestoreLogic() {
  
  // 1️⃣ دالة تنظيف وتوحيد النصوص للبحث الدقيق (بتشيل المسافات الزايدة والهمزات)
  const normalizeStr = (str: any) => {
    if (!str) return '';
    return String(str).trim().toLowerCase().replace(/أ|إ|آ/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  };

  // 2️⃣ دالة تحويل تواريخ الإكسيل
  const formatExcelDate = (excelSerialNumber: number) => {
    const date = new Date(Math.round((excelSerialNumber - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  };

  // 3️⃣ قاموس ترجمة أسماء الأعمدة (عربي/عشوائي ⬅️ أسماء الإسكيما الصحيحة)
  const mapHeaderToSchema = (sheetName: string, header: string) => {
    const h = normalizeStr(header);
    
    // التواريخ
    if (h.includes('تاريخ') || h.includes('date')) {
      if (sheetName === 'labor_daily_logs') return 'work_date';
      return 'date';
    }
    // الموظفين والعمال
    if (h.includes('موظف') || h.includes('عامل') || h.includes('اسم') || h.includes('emp') || h.includes('worker')) {
      if (sheetName === 'labor_daily_logs') return 'worker_name';
      return 'emp_name';
    }
    // المبالغ
    if (h.includes('مبلغ') || h.includes('قيمه') || h.includes('amount')) return 'amount';
    if (h.includes('يوميه') || h.includes('اجر')) return 'daily_wage';
    // العقارات والمشاريع والمواقع
    if (h.includes('عقار') || h.includes('مشروع') || h.includes('property') || h.includes('project')) return 'Property';
    if (h.includes('موقع') || h.includes('site')) return 'site_ref';
    // البنود
    if (h.includes('بند') || h.includes('عمل') || h.includes('item')) return 'work_item';
    // المقاولين
    if (h.includes('مقاول') || h.includes('contractor')) return 'sub_contractor';
    // الملاحظات والبيان
    if (h.includes('ملاحظات') || h.includes('notes')) return 'notes';
    if (h.includes('بيان') || h.includes('وصف') || h.includes('desc')) {
      if (sheetName === 'emp_adv') return 'Desc';
      if (sheetName === 'labor_daily_logs') return 'production_desc';
      return 'reason'; // for emp_ded
    }
    
    return header; // لو معرفش يترجمه، يرجعه زي ما هو
  };

  const processExcelRestore = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });

          // 🚀 الخطوة الأهم: جلب كل البيانات المرجعية (القواميس) من الداتابيز لمرة واحدة
          const [
            { data: projects }, 
            { data: partners }, 
            { data: accounts }, 
            { data: boqItems }
          ] = await Promise.all([
            supabase.from('projects').select('id, Property, project_name'),
            supabase.from('partners').select('id, name'),
            supabase.from('accounts').select('id, name'),
            supabase.from('boq_items').select('id, item_name')
          ]);

          // بناء Maps سريعة للبحث
          const projectMap = new Map();
          projects?.forEach(p => {
            if (p.Property) projectMap.set(normalizeStr(p.Property), p.id);
            if (p.project_name) projectMap.set(normalizeStr(p.project_name), p.id);
          });

          const partnerMap = new Map();
          partners?.forEach(p => partnerMap.set(normalizeStr(p.name), p.id));

          const accountMap = new Map();
          accounts?.forEach(a => accountMap.set(normalizeStr(a.name), a.id));

          const boqMap = new Map();
          boqItems?.forEach(b => boqMap.set(normalizeStr(b.item_name), b.id));

          let totalUploaded = 0;

          // اللف على شيتات الإكسيل
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) continue;

            // 🧹 تنظيف وترجمة كل سطر
            const cleanData = jsonData.map((row: any) => {
              const newRow: any = {};
              
              for (const excelHeader in row) {
                if (excelHeader.includes('__EMPTY')) continue;
                
                let val = row[excelHeader];
                if (val === '' || val === ' ') val = null;

                // 1. ترجمة اسم العمود من الإكسيل للإسكيما
                const dbColumnName = mapHeaderToSchema(sheetName, excelHeader);

                // 2. تجاهل الـ ID لو فاضي
                if (dbColumnName.toLowerCase() === 'id' && !val) continue;

                // 3. تحويل التواريخ
                if ((dbColumnName.includes('date') || dbColumnName.includes('التاريخ')) && typeof val === 'number') {
                  val = formatExcelDate(val);
                }

                newRow[dbColumnName] = val;

                // 🚀 4. الذكاء الاصطناعي للربط (Smart Foreign Key Injection)
                if (val && typeof val === 'string') {
                  const searchVal = normalizeStr(val);

                  // ربط العقار/المشروع
                  if (dbColumnName === 'Property' || dbColumnName === 'site_ref') {
                    const matchedId = projectMap.get(searchVal);
                    if (matchedId) newRow['project_id'] = matchedId;
                  }

                  // ربط الموظف/الشريك/العامل
                  if (dbColumnName === 'emp_name' || dbColumnName === 'worker_name') {
                    const matchedId = partnerMap.get(searchVal);
                    if (matchedId) {
                      if (sheetName === 'labor_daily_logs') newRow['worker_partner_id'] = matchedId;
                      else if (sheetName === 'payroll_slips') newRow['emp_id'] = matchedId;
                      else newRow['partner_id'] = matchedId; // emp_adv, emp_ded
                    }
                  }

                  // ربط المقاول الباطن
                  if (dbColumnName === 'sub_contractor') {
                    const matchedId = partnerMap.get(searchVal);
                    if (matchedId) newRow['sub_contractor_id'] = matchedId;
                  }

                  // ربط الحسابات
                  if (dbColumnName === 'account_id' || excelHeader.includes('حساب')) {
                    const matchedId = accountMap.get(searchVal);
                    if (matchedId) newRow['account_id'] = matchedId; // هيبدلها بـ UUID بدل النص
                  }

                  // ربط بنود الأعمال
                  if (dbColumnName === 'work_item') {
                    // ملحوظة: في إسكيما العمالة work_item نص، بس لو قررت تضيف work_item_id كـ FK ده الكود بتاعه جاهز:
                    const matchedId = boqMap.get(searchVal);
                    if (matchedId) newRow['work_item_id'] = matchedId; 
                  }
                }
              }
              
              return newRow;
            });

            // الرفع النهائي لسوبابيز
            const { error } = await supabase
              .from(sheetName)
              .upsert(cleanData, { onConflict: 'id', ignoreDuplicates: false });

            if (error) {
              console.error(`❌ تفاصيل خطأ جدول ${sheetName}:`, JSON.stringify(error, null, 2));
              throw new Error(`مشكلة في جدول ${sheetName}: ${error.message || error.details}`);
            }

            totalUploaded += cleanData.length;
          }

          if (totalUploaded === 0) throw new Error("الملف فارغ أو لا يحتوي على بيانات.");
          
          resolve();

        } catch (error: any) {
          console.error("❌ فشل الاستيراد:", error);
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error("حدث خطأ أثناء قراءة الملف."));
      reader.readAsBinaryString(file);
    });
  };

  return { processExcelRestore };
}