"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';

/**
 * 💎 العقل المدبر لكشف الحساب - النسخة الماسية V9
 * المسار: /app/PaymentVouchers/statement/statement_logic.ts
 */
export function useStatementLogic() {
    // 1️⃣ استخراج المعايير الأولية (SearchParams)
    const searchParams = useSearchParams();
    const initialPartnerId = searchParams.get('partner_id') || '';

    // 2️⃣ الحالات المحلية (Local States)
    const [partnerId, setPartnerId] = useState<string>(initialPartnerId);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // 📥 3️⃣ محرك البيانات (React Query): جلب الداتا الخام من الباك اند
    // نستخدم الـ View الذي قمنا بإنشائه لضمان سرعة الاستجابة
    const { data: rawLines = [], isLoading } = useQuery({
        queryKey: ['partner_statement_raw', partnerId],
        queryFn: async () => {
            if (!partnerId) return [];

            const { data, error } = await supabase
                .from('partner_statement_view')
                .select('*')
                .eq('partner_id', partnerId)
                .order('entry_date', { ascending: true }) // الترتيب الزمني أساسي لحساب الرصيد
                .order('line_id', { ascending: true });

            if (error) throw error;
            return data || [];
        },
        enabled: !!partnerId, // تفعيل البحث فقط عند اختيار شريك
        staleTime: 1000 * 60 * 5, // كاش لمدة 5 دقائق
    });

    // ⚖️ 4️⃣ التصفية والحسابات (Logic Filtering): إلزامي داخل useMemo حسب الميثاق
    const processedData = useMemo(() => {
        let runningBalance = 0;
        let openingBalance = 0;

        // أ. معالجة كافة الحركات لحساب الرصيد التراكمي (Running Balance)
        const allProcessed = rawLines.map((line: any) => {
            const credit = Number(line.credit || 0);
            const debit = Number(line.debit || 0);
            
            // في محاسبة الشركاء (طبيعة دائنة): الدائن (+) يزود الرصيد، والمدين (-) ينقص الرصيد
            runningBalance += (credit - debit);

            return {
                id: line.line_id,
                date: line.entry_date,
                description: line.description || line.line_notes,
                v_type: line.v_type,
                reference_id: line.reference_id,
                debit,
                credit,
                balance: runningBalance
            };
        });

        // ب. تطبيق فلاتر التاريخ واستخراج الرصيد الافتتاحي (Opening Balance)
        const filtered = allProcessed.filter((line: any) => {
            const lineDate = new Date(line.date);
            let isWithinRange = true;

            // إذا كانت الحركة قبل تاريخ البداية، تضاف للرصيد الافتتاحي ولا تظهر في الجدول
            if (dateFrom && lineDate < new Date(dateFrom)) {
                openingBalance = line.balance;
                isWithinRange = false;
            }
            // إذا كانت الحركة بعد تاريخ النهاية لا تظهر
            if (dateTo && lineDate > new Date(dateTo)) {
                isWithinRange = false;
            }
            
            return isWithinRange;
        });

        // ج. حساب إجماليات الفترة المختارة فقط
        const totalDebit = filtered.reduce((sum, line) => sum + line.debit, 0);
        const totalCredit = filtered.reduce((sum, line) => sum + line.credit, 0);

        return {
            lines: filtered.reverse(), // عرض الأحدث أولاً في واجهة المستخدم
            openingBalance,
            currentBalance: runningBalance,
            totalDebit,
            totalCredit
        };

    }, [rawLines, dateFrom, dateTo]);

    // 🚀 5️⃣ تجريد المخرجات (Pure Return)
    // الهوك يرجع البيانات والعمليات فقط بدون أي JSX
    return {
        // الـ Data
        partnerId,
        isLoading,
        statementLines: processedData.lines,
        openingBalance: processedData.openingBalance,
        currentBalance: processedData.currentBalance,
        totalDebit: processedData.totalDebit,
        totalCredit: processedData.totalCredit,
        dateFrom,
        dateTo,

        // الـ Actions
        setPartnerId,
        setDateFrom,
        setDateTo
    };
}