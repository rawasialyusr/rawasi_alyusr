"use client";
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { useToast } from '@/lib/toast-context'; 

export function useBackupLogic() {
  const { showToast } = useToast();

  const backupToExcel = async (selectedTables: string[]) => {
    try {
      showToast('⏳ جاري تجميع البيانات وتحضير ملف الإكسل...', 'loading');
      const workbook = XLSX.utils.book_new();

      // جلب البيانات لكل جدول محدد
      for (const table of selectedTables) {
        let allData: any[] = [];
        let from = 0;
        const limit = 1000; // 🛡️ الباب الثالث: التجزئة لمنع انهيار الذاكرة

        while (true) {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .range(from, from + limit - 1);

          if (error) {
            console.error(`Error fetching table ${table}:`, error);
            showToast(`فشل في جلب بيانات جدول ${table}`, 'error');
            return;
          }

          if (data && data.length > 0) {
            allData = [...allData, ...data];
          }

          if (!data || data.length < limit) break;
          from += limit;
        }

        if (allData.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(allData);
          XLSX.utils.book_append_sheet(workbook, worksheet, table);
        } else {
            // إنشاء شيت فارغ لو الجدول معلهوش داتا عشان يفضل الهيكل موجود
            const emptyWorksheet = XLSX.utils.json_to_sheet([{}]);
            XLSX.utils.book_append_sheet(workbook, emptyWorksheet, table);
        }
      }

      XLSX.writeFile(workbook, `Rawasi_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('✅ تم تصدير نسخة الإكسل بنجاح', 'success');

    } catch (error: any) {
      showToast(`❌ فشل التصدير: ${error.message}`, 'error');
    }
  };

  const backupToJSON = async (selectedTables: string[]) => {
    try {
      showToast('⏳ جاري تحضير ملف JSON...', 'loading');
      const backupData: any = {};

      for (const table of selectedTables) {
         let allData: any[] = [];
         let from = 0;
         const limit = 1000;

         while (true) {
             const { data, error } = await supabase.from(table).select('*').range(from, from + limit - 1);
             if (error) throw error;
             
             if (data && data.length > 0) allData = [...allData, ...data];
             if (!data || data.length < limit) break;
             from += limit;
         }
         backupData[table] = allData;
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `Rawasi_System_Snapshot_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();

      showToast('✅ تم تصدير نسخة JSON بنجاح', 'success');

    } catch (error: any) {
      showToast(`❌ فشل التصدير: ${error.message}`, 'error');
    }
  };

  // 📥 دالة تحميل قالب فارغ للجدول المحدد (تدعم القوالب المعربة)
  const downloadTemplate = async (tableName: string, displayName: string) => {
    try {
        showToast('⏳ جاري تحضير القالب...', 'loading');
        let templateData: any[] = [{}];
        let wscols: any[] = [];

        // 🌟 قوالب مخصصة ومعربة لتسهيل الإدخال على المستخدم
        if (tableName === 'payment_vouchers') {
            templateData = [{
                'التاريخ': '2024-05-01',
                'اسم المستفيد': 'اكتب اسم العامل أو المورد هنا',
                'المبلغ': '5000',
                'البيان': 'وصف السند أو الدفعة',
                'طريقة الدفع': 'تحويل بنكي',
                'الحساب المدين': 'ذمم عمال (اختياري)',
                'الحساب الدائن': 'البنك الأهلي (اختياري)'
            }];
            wscols = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 25 }, { wch: 25 }];
        } 
        else if (tableName === 'labor_daily_logs') {
             templateData = [{
                'تاريخ': '2024-05-01',
                'اسم العامل': 'اكتب اسم العامل هنا',
                'المشروع': 'اسم الموقع أو العقار',
                'البند': 'اسم بند الأعمال',
                'يومية': '100',
                'حضور': '1',
                'نسبة الإنجاز': '100',
                'البيان': 'ملاحظات'
             }];
        }
        else {
            // القالب الافتراضي: يجلب الحقول الإنجليزية من الداتابيز
            const { data, error } = await supabase.from(tableName).select('*').limit(1);
            if (error) throw error;
            if (data && data.length > 0) {
                const emptyObj: any = {};
                Object.keys(data[0]).forEach(key => emptyObj[key] = '');
                templateData = [emptyObj];
            }
        }

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        if (wscols.length > 0) worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, tableName); // الاسم الانجليزي مهم هنا للربط في السيرفر
        XLSX.writeFile(workbook, `Template_${tableName}.xlsx`);
        
        showToast('✅ تم تحميل القالب', 'success');
    } catch (error: any) {
        showToast('❌ فشل تحميل القالب', 'error');
    }
  };

  return { backupToExcel, backupToJSON, downloadTemplate };
}