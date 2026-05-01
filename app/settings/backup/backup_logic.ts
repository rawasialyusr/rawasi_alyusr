"use client";
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { fetchAllSupabaseData } from '@/lib/helpers';
import { useToast } from '@/lib/toast-context'; // 🛡️ نظام التنبيهات السيادي

// 🗺️ خريطة حقول الجداول (عشان لو الجدول فاضي، السيستم يعرف يبني النموذج)
export const TABLE_SCHEMAS: Record<string, string[]> = {
  "partners": ["id", "code", "name", "partner_type", "identity_number", "identity_expiry_date", "identity_image_url", "phone", "address", "vat_number", "created_at", "job_role"],
  "projects": ["id", "project_code", "Property", "client_name", "contract_value", "estimated_budget", "down_payment", "start_date", "end_date", "actual_completion_date", "location_address", "location_url", "project_manager", "status", "notes", "created_at", "project_name", "client_id"],
  "labor_daily_logs": ["id", "work_date", "worker_name", "site_ref", "work_item", "production_desc", "unit", "skill_level", "daily_wage", "attendance_value", "sub_contractor", "notes", "project_id", "created_at", "worker_partner_id", "sub_contractor_id", "is_posted"],
  "emp_adv": ["id", "date", "emp_name", "amount", "Desc", "notes", "partner_id", "is_posted", "created_by", "target_month", "account_id", "is_deleted"],
  "emp_ded": ["id", "date", "emp_name", "amount", "reason", "notes", "partner_id", "is_posted", "created_by", "target_month", "is_deleted"],
  "payroll_slips": ["id", "emp_id", "month", "basic_salary", "total_advances", "total_deductions", "net_salary", "is_posted", "created_at"],
  "all_emp": ["emp_id", "emp_name", "job_title", "iqama_num", "Salary", "phone_number", "work_days", "housing", "deductions", "expire_date", "earnings", "net_earnings", "received"],
  "housing_services": ["id", "date", "emp_name", "amount", "reason", "description", "notes", "created_at"],
  "accounts": ["id", "code", "name", "account_type", "parent_id", "is_transactional"],
  "expenses": ["id", "exp_date", "sub_contractor", "payee_id", "creditor_account", "description", "quantity", "unit_price", "total_price", "vat_amount", "payment_method", "notes", "is_posted", "created_at", "payment_account", "site_ref", "payee_name", "project_id", "discount_account", "discount_amount", "employee_name", "invoice_image"],
  "invoices": ["id", "invoice_number", "date", "partner_id", "client_name", "project_ids", "boq_id", "description", "quantity", "unit", "unit_price", "line_total", "materials_discount", "taxable_amount", "tax_amount", "guarantee_percent", "guarantee_amount", "total_amount", "debit_account_id", "credit_account_id", "materials_acc_id", "guarantee_acc_id", "tax_acc_id", "skip_zatca", "status", "created_at", "due_in_days", "due_date", "paid_amount"],
  "invoice_lines": ["id", "invoice_id", "item_id", "description", "unit", "quantity", "unit_price", "total_price", "created_at"],
  "payment_vouchers": ["id", "voucher_number", "date", "amount", "partner_id", "account_id", "payment_method", "reference_no", "description", "notes", "status", "is_posted", "created_at", "updated_at", "created_by"],
  "receipt_vouchers": ["id", "date", "amount", "payment_method", "notes", "partner_id", "invoice_id", "created_at", "updated_at", "receipt_number", "status", "safe_bank_acc_id", "partner_acc_id", "project_ids", "reference_number", "attachment_url"],
  "journal_headers": ["id", "entry_date", "description", "created_at", "status", "reference_id"],
  "journal_lines": ["id", "header_id", "account_id", "partner_id", "item_name", "quantity", "unit_price", "debit", "credit", "notes", "project_id", "debit_account_id", "tax_amount", "tax_rate", "created_at"],
  "boq_items": ["id", "item_code", "main_category", "sub_category", "item_name", "unit_of_measure", "created_at"],
  "boq_budget": ["id", "work_item", "contract_quantity", "unit", "unit_contract_price", "estimated_labor_cost", "project_id"],
  "project_stages": ["id", "project_id", "stage_name", "progress_percentage", "status", "created_at"],
  "project_work_structure": ["id", "project_id", "technical_item", "stage_name", "status", "created_at"],
  "inventory": ["id", "item_name", "unit", "current_stock", "avg_price"]
};

export const useBackupLogic = () => {
    const { showToast } = useToast();
    
    // 🟢 تصدير لإكسيل (بيانات حقيقية)
    const backupToExcel = async (selectedTables: string[]) => {
        try {
            showToast('⏳ جاري تجميع البيانات وتحضير ملف الإكسل...', 'loading');
            const workbook = XLSX.utils.book_new();
            
            for (const table of selectedTables) {
                // استخدام دالة الجلب الضخمة لحماية المتصفح من الانهيار
                const data = await fetchAllSupabaseData(supabase, table);
                
                if (data && data.length > 0) {
                    const worksheet = XLSX.utils.json_to_sheet(data);
                    XLSX.utils.book_append_sheet(workbook, worksheet, table);
                } else {
                    // لو الجدول فاضي، نزل النموذج بتاعه عشان الشيت متبقاش فاضية تماماً
                    const headers = TABLE_SCHEMAS[table] || ['id'];
                    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
                    XLSX.utils.book_append_sheet(workbook, worksheet, table);
                }
            }
            
            XLSX.writeFile(workbook, `Rawasi_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
            showToast('✅ تم تصدير نسخة الإكسل بنجاح', 'success');
            return { success: true };
        } catch (error: any) {
            console.error("Excel Backup Error:", error);
            showToast(`❌ فشل تصدير الإكسل: ${error.message}`, 'error');
            return { success: false };
        }
    };

    // 🔵 تصدير لـ JSON
    const backupToJSON = async (selectedTables: string[]) => {
        try {
            showToast('⏳ جاري تحضير ملف JSON...', 'loading');
            const fullSnapshot: any = { metadata: { date: new Date().toISOString() }, data: {} };
            
            for (const table of selectedTables) {
                const data = await fetchAllSupabaseData(supabase, table);
                fullSnapshot.data[table] = data;
            }
            
            const blob = new Blob([JSON.stringify(fullSnapshot, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Rawasi_Snapshot_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            
            showToast('✅ تم تصدير نسخة JSON بنجاح', 'success');
            return { success: true };
        } catch (error: any) {
            console.error("JSON Backup Error:", error);
            showToast(`❌ فشل تصدير JSON: ${error.message}`, 'error');
            return { success: false };
        }
    };

    // 📄 تحميل نموذج فارغ (Template) لجدول معين - يدعم القوالب الذكية
    const downloadTemplate = (tableName: string, displayName: string) => {
        try {
            showToast(`⏳ جاري تحضير قالب ${displayName}...`, 'loading');
            let templateData: any[] = [];
            let wscols: any[] = [];

            // 🌟 1. القوالب المخصصة والمعربة لتسهيل الإدخال
            if (tableName === 'payment_vouchers') {
                templateData = [{
                    'التاريخ': new Date().toISOString().split('T')[0],
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
                    'تاريخ': new Date().toISOString().split('T')[0],
                    'اسم العامل': 'اكتب اسم العامل هنا',
                    'المشروع': 'اسم الموقع أو العقار',
                    'البند': 'اسم بند الأعمال',
                    'يومية': '100',
                    'حضور': '1',
                    'نسبة الإنجاز': '100',
                    'البيان': 'ملاحظات'
                 }];
                 wscols = [{ wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 40 }];
            } 
            // 🌟 2. القوالب الافتراضية لباقي الجداول
            else {
                const headers = TABLE_SCHEMAS[tableName];
                if (!headers) throw new Error("لم يتم العثور على خريطة حقول لهذا الجدول.");
                
                // تفريغ البيانات مع الاحتفاظ بالهيكل
                const emptyObj: any = {};
                headers.forEach(key => emptyObj[key] = '');
                templateData = [emptyObj];
            }

            // إنشاء ملف الإكسل وتصديره
            const worksheet = XLSX.utils.json_to_sheet(templateData);
            if (wscols.length > 0) worksheet['!cols'] = wscols;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, tableName); // الاسم الانجليزي ضروري للـ Restore
            XLSX.writeFile(workbook, `Template_${tableName}.xlsx`);
            
            showToast(`✅ تم تحميل قالب ${displayName}`, 'success');
        } catch (error: any) {
            showToast(`❌ فشل تحميل القالب: ${error.message}`, 'error');
        }
    };

    return { backupToExcel, backupToJSON, downloadTemplate };
};