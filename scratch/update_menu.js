const fs = require('fs');
let c = fs.readFileSync('components/layout/LayoutClient.tsx', 'utf8');

const newMenu = `const menuGroups = [
    { 
        group: "الداشبورد والملخصات", 
        items: [
            { id: 'global_summary', title: 'الملخص العام', icon: '📊', path: '/GlobalSummary' }, 
            { id: 'dashboard', title: 'لوحة القيادة', icon: '🖥️', path: '/Dashboard' },
            { id: 'financial_center', title: 'المركز المالي', icon: '🏦', path: '/financial-center' }
        ] 
    },
    { 
        group: "الحسابات والمالية", 
        items: [
            { id: 'accounts', title: 'دليل الحسابات', icon: '🗂️', path: '/accounts' },
            { id: 'journal', title: 'قيود اليومية', icon: '📝', path: '/journal' }, 
            { id: 'ledger', title: 'دفتر الأستاذ', icon: '📒', path: '/ledger' }, 
            { id: 'trialbalance', title: 'ميزان المراجعة', icon: '⚖️', path: '/trialbalance' },
            { id: 'journal_errors', title: 'رادار الأخطاء', icon: '🛡️', path: '/journal-errors' }, 
            { id: 'cashflows', title: 'التدفقات النقدية', icon: '🔄', path: '/cashflows' }, 
            { id: 'payments', title: 'سندات الصرف', icon: '🔴', path: '/PaymentVouchers' }, 
            { id: 'receipts', title: 'سندات القبض', icon: '🟢', path: '/ReceiptVouchers' }, 
            { id: 'revenue', title: 'الإيرادات', icon: '📈', path: '/revenue' }, 
            { id: 'expenses', title: 'المصروفات', icon: '📉', path: '/expenses' }, 
            { id: 'invoices', title: 'الفواتير ومطالبات العملاء', icon: '🧾', path: '/invoices' }
        ] 
    },
    { 
        group: "المشاريع والشركاء", 
        items: [
            { id: 'fieldops', title: 'رادار الميدان الحي', icon: '📡', path: '/fieldops' },
            { id: 'projects', title: 'غرفة المشاريع', icon: '🏗️', path: '/projects' }, 
            { id: 'materials', title: 'توريد الخامات', icon: '🧱', path: '/materials' },
            { id: 'materialitems', title: 'أصناف الخامات', icon: '📦', path: '/materialitems' },
            { id: 'material_issues', title: 'صرف الخامات للمواقع', icon: '🚚', path: '/material_issues' },
            { id: 'subclaims', title: 'مستخلصات مقاولي الباطن', icon: '📑', path: '/subclaims' },
            { id: 'subcontractor_costs', title: 'تكاليف مقاولي الباطن', icon: '💵', path: '/subcontractor-costs' },
            { id: 'boqcatalog', title: 'الدليل الموحد للبنود (BOQ)', icon: '📚', path: '/boqcatalog' },
            { id: 'partners', title: 'دليل الشركاء', icon: '🤝', path: '/partners' },
            { id: 'partner_balances', title: 'أرصدة الشركاء', icon: '⚖️', path: '/PartnerBalances' },
            { id: 'statement', title: 'كشف حساب الشركاء', icon: '📑', path: '/statement' },
            { id: 'project_overhead', title: 'تحميل الأوفر هيد (Overhead)', icon: '🦅', path: '/overhead' },
            { id: 'boq_budget', title: 'ميزانية المقايسات (BOQ Budget)', icon: '💼', path: '/boqbudget' },
            { id: 'cost_allocation', title: 'محرك توزيع التكاليف (Cost Allocation)', icon: '🧮', path: '/costallocation' },
            { id: 'project_ledger', title: 'دفتر  التكاليف', icon: '📋', path: '/project-ledger' }
        ] 
    },
    { 
        group: "العمالة والموارد البشرية", 
        items: [
            { id: 'employees', title: 'سجل الموظفين', icon: '👔', path: '/employees' }, 
            { id: 'team', title: 'إدارة فرق العمل', icon: '👥', path: '/team' },
            { id: 'labor_logs', title: 'يوميات الميدان', icon: '👷', path: '/labor_logs' }, 
            { id: 'laborcost', title: 'تكاليف العمالة الميدانية', icon: '💰', path: '/laborcost' },
            { id: 'payroll', title: 'مسيرات الرواتب', icon: '💵', path: '/payroll' }, 
            { id: 'violations', title: 'المخالفات والجزاءات', icon: '⚠️', path: '/violations' }
        ] 
    },
    { 
        group: "النظام والتقارير", 
        items: [
            { id: 'reports', title: 'التقارير الشاملة', icon: '📊', path: '/reports' }, 
            { id: 'import', title: 'استيراد البيانات', icon: '📥', path: '/import' },
            { id: 'settings', title: 'إعدادات النظام', icon: '⚙️', path: '/settings' }, 
            { id: 'profile', title: 'الملف الشخصي', icon: '👤', path: '/profile' }
        ] 
    }
  ];`;

c = c.replace(/const menuGroups = \[([\s\S]*?)\];/, newMenu);
fs.writeFileSync('components/layout/LayoutClient.tsx', c);
console.log('Replaced menu groups successfully');
