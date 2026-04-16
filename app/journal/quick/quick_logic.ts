"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// 🚀 اسم الدالة الصحيح اللي الصفحة بتدور عليه
export function useQuickEntryLogic() {
  const [treasuries, setTreasuries] = useState<any[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
  const [revenueAccounts, setRevenueAccounts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // 1. جلب الدليل المحاسبي وتقسيمه (خزائن، مصروفات، إيرادات)
        const { data: accData } = await supabase
          .from('accounts')
          .select('id, name, code, account_type')
          .eq('is_transactional', true);

        if (accData) {
          // الخزائن والبنوك (غالباً الأصول المتداولة)
          setTreasuries(accData.filter(a => a.name.includes('خزينة') || a.name.includes('بنك') || a.account_type === 'asset'));
          // حسابات المصروفات
          setExpenseAccounts(accData.filter(a => a.account_type === 'expense' || a.name.includes('مصروف')));
          // حسابات الإيرادات
          setRevenueAccounts(accData.filter(a => a.account_type === 'revenue' || a.name.includes('إيراد')));
        }

        // 2. جلب المشاريع 
        const { data: projData } = await supabase.from('projects').select('id, name, project_code');
        setProjects(projData || []);

        // 3. جلب الموظفين (الموردين/الجهات)
        const { data: empData } = await supabase.from('all_emp').select('id, emp_name');
        setEmployees(empData || []);

        // 4. جلب مراحل المشاريع (إن وجدت)
        // لو الجدول ده مش موجود عندك، ممكن تمسح السطرين دول، بس أنا حطيتهم عشان الواجهة بتطلبهم
        const { data: stagesData } = await supabase.from('project_stages').select('*');
        setStages(stagesData || []);

      } catch (error) {
        console.error("❌ Error fetching quick entry data:", error);
      }
    };

    fetchAllData();
  }, []);

  // ⚙️ وظيفة الترحيل الذكي للقيد المزدوج
  const submitQuickEntry = async (type: 'expense' | 'revenue', formData: any) => {
    setIsSaving(true);
    try {
      // 1. إنشاء رأس القيد
      const { data: header, error: hErr } = await supabase
        .from('journal_headers')
        .insert([{
          entry_date: formData.date,
          description: formData.description || `قيد ${type} سريع`,
          status: 'posted' // ترحيل مباشر
        }])
        .select()
        .single();

      if (hErr) throw hErr;

      // 2. تحديد الطرف المدين والدائن بناءً على نوع العملية
      // في المصروفات: المصروف (مدين) والخزنة (دائن)
      // في الإيرادات: الخزنة (مدين) والإيراد (دائن)
      const debitAccount = type === 'expense' ? formData.debitAccount : formData.creditAccount;
      const creditAccount = type === 'expense' ? formData.creditAccount : formData.debitAccount;

      // 3. إنشاء أسطر القيد (Lines)
      const lines = [
        {
          header_id: header.id,
          account_id: debitAccount,
          debit: formData.amount,
          credit: 0,
          notes: formData.notes || formData.description,
          project_id: formData.projectId || null,
          partner_id: formData.partnerId || null,
        },
        {
          header_id: header.id,
          account_id: creditAccount,
          debit: 0,
          credit: formData.amount,
          notes: formData.notes || formData.description,
          project_id: formData.projectId || null,
          partner_id: formData.partnerId || null,
        }
      ];

      const { error: lErr } = await supabase.from('journal_lines').insert(lines);
      if (lErr) throw lErr;

      alert("تم اعتماد القيد المزدوج وترحيله بنجاح ✅");
      return true; // نجاح العملية لإغلاق النافذة
      
    } catch (error: any) {
      alert("❌ خطأ أثناء ترحيل القيد: " + error.message);
      return false; // فشل العملية
    } finally {
      setIsSaving(false);
    }
  };

  return {
    treasuries,
    expenseAccounts,
    revenueAccounts,
    projects,
    employees,
    stages,
    isSaving,
    submitQuickEntry
  };
}