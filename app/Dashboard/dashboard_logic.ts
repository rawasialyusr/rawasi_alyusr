import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/helpers';

// 🚀 دالة البلدوزر السريعة لسحب البيانات الضخمة
const fetchAllForDashboard = async (
  tableName: string, 
  columns: string, 
  filters?: { col: string, val: any, op?: 'eq' | 'neq' }[]
) => {
  let allData: any[] = [];
  let currentOffset = 0;
  const limit = 1000;
  while (true) {
    let query = supabase.from(tableName).select(columns).range(currentOffset, currentOffset + limit - 1);
    if (filters) {
      filters.forEach(f => {
        if (f.op === 'neq') query = query.neq(f.col, f.val);
        else query = query.eq(f.col, f.val);
      });
    }
    const { data, error } = await query;
    if (error) break;
    if (data && data.length > 0) {
      allData = [...allData, ...data];
      if (data.length < limit) break;
      currentOffset += limit;
    } else break;
  }
  return allData;
};

export const useDashboardLogic = () => {
  const query = useQuery({
    queryKey: ['dashboard_stats_comprehensive'],
    queryFn: async () => {
      // 1. 📡 سحب كافة البيانات المطلوبة للرادار والماليات
      const [
        expenses, invoices, labor, payments, receipts, advances, deductions, projects,
        journalLines, accounts // 👈 الجديد لحساب الأصول والخصوم
      ] = await Promise.all([
        fetchAllForDashboard('expenses', 'total_price, is_posted, main_category'),
        fetchAllForDashboard('invoices', 'total_amount, status'), 
        fetchAllForDashboard('labor_daily_logs', 'daily_wage, is_posted'),
        fetchAllForDashboard('payment_vouchers', 'amount, is_posted, voucher_number'),
        fetchAllForDashboard('receipt_vouchers', 'amount, status'), 
        fetchAllForDashboard('emp_adv', 'amount, is_posted'),
        fetchAllForDashboard('emp_ded', 'amount, is_posted'),
        fetchAllForDashboard('projects', 'id', [{ col: 'status', val: 'مكتمل', op: 'neq' }]),
        fetchAllForDashboard('journal_lines', 'debit, credit, account_id'),
        fetchAllForDashboard('accounts', 'id, account_type')
      ]);

      // --- 🏛️ حساب المركز المالي (الأصول والالتزامات) ---
      let totalAssets = 0;
      let totalLiabilities = 0;

      // إنشاء قاموس لأنواع الحسابات لتسريع البحث
      const accountTypesMap: Record<string, string> = {};
      accounts.forEach(acc => { accountTypesMap[acc.id] = acc.account_type; });

      journalLines.forEach(line => {
        const type = accountTypesMap[line.account_id] || '';
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);

        // طبيعة الأصول (مدينة) -> تزيد بالمدين وتقل بالدائن
        if (type.includes('أصول') || type.includes('Asset')) {
          totalAssets += (debit - credit);
        } 
        // طبيعة الخصوم والالتزامات (دائنة) -> تزيد بالدائن وتقل بالمدين
        else if (type.includes('خصوم') || type.includes('التزام') || type.includes('Liability')) {
          totalLiabilities += (credit - debit);
        }
      });

      // --- 🧮 إحصائيات الترحيل الشاملة ---
      const getPostingStats = (data: any[], postedKey: string = 'is_posted', postedVal: any = true) => {
        const posted = data.filter(item => item[postedKey] === postedVal).length;
        const pending = data.length - posted;
        return [ { name: 'مرحل', value: posted }, { name: 'معلق', value: pending } ];
      };

      const postingCharts = {
        expenses: getPostingStats(expenses),
        invoices: getPostingStats(invoices, 'status', 'مرحل'),
        labor: getPostingStats(labor),
        payments: getPostingStats(payments),
        receipts: getPostingStats(receipts, 'status', 'مرحل'),
        advances: getPostingStats(advances),
        deductions: getPostingStats(deductions)
      };

      // --- 🚨 الرادار الأمني الموجه (تنبيهات قابلة للضغط) ---
      const alerts: any[] = [];
      
      const checkPending = (data: any[], label: string, route: string, postedKey: string = 'is_posted', postedVal: any = true) => {
        const count = data.filter(item => item[postedKey] !== postedVal).length;
        if (count > 0) {
          alerts.push({ 
            title: `يوجد (${count}) ${label} غير مرحل يحتاج مراجعة`, 
            type: count > 10 ? 'danger' : 'warning',
            route: route // 👈 المسار الذي سيتم التوجيه إليه
          });
        }
      };

      // ⚠️ تأكد من أن هذه المسارات تتطابق مع أسماء المجلدات في مجلد `app` لديك
      checkPending(expenses, 'مصروفات عامة', '/expenses');
      checkPending(invoices, 'مستخلصات عملاء', '/invoices', 'status', 'مرحل');
      checkPending(labor, 'يوميات عمالة', '/labor_logs');
      checkPending(payments, 'سندات صرف', '/payment_vouchers');
      checkPending(receipts, 'سندات قبض', '/receipt_vouchers', 'status', 'مرحل');
      checkPending(advances, 'سلف موظفين', '/emp_adv');
      checkPending(deductions, 'جزاءات ومخالفات', '/emp_ded');

      // --- 💰 الحسابات التشغيلية ---
      const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
      const totalInvoices = invoices.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
      const totalWages = labor.reduce((sum, item) => sum + Number(item.daily_wage || 0), 0);

      // --- 🍩 تجميع المصروفات للرسم البياني ---
      const categoryMap: Record<string, number> = {};
      expenses.forEach(exp => {
        const cat = exp.main_category || 'غير مصنف';
        categoryMap[cat] = (categoryMap[cat] || 0) + Number(exp.total_price || 0);
      });
      const expensesByCategory = Object.entries(categoryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

      return {
        totals: {
          totalExpenses, totalInvoices, totalWages, activeProjects: projects.length,
          totalAssets, // 👈 الأصول
          totalLiabilities // 👈 الالتزامات
        },
        postingCharts,
        expensesByCategory,
        alerts,
        cashFlowData: [
            { name: 'الشهر الحالي', income: totalInvoices * 0.4, expense: totalExpenses * 0.3 } // أمثلة للرسم
        ]
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
    error: query.error,
    formatCurrency
  };
};