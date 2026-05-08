"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';

// 🚀 المترجم السيادي - تحويل أكواد النظام لأسماء عربية مفهومة
const translateVType = (type: string) => {
    if (!type) return 'قيد يومية';
    const lowerType = type.toLowerCase();
    switch (lowerType) {
        case 'payment_vouchers': return 'سند صرف';
        case 'receipt_vouchers': return 'سند قبض';
        case 'labor_daily_logs': return 'يومية عمالة';
        case 'violations': return 'قيد غرامة';
        case 'invoices': return 'فاتورة';
        default: return type;
    }
};

export function useStatementLogic() {
    const searchParams = useSearchParams();
    const initialPartnerId = searchParams.get('partner_id') || '';

    // 1️⃣ الحالات المحلية
    const [partnerId, setPartnerId] = useState<string>(initialPartnerId);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // 🚀 جلب اسم الشريك الحقيقي بدلاً من الـ ID
    const { data: partnerInfo } = useQuery({
        queryKey: ['partner_info', partnerId],
        queryFn: async () => {
            if (!partnerId) return null;
            const { data, error } = await supabase
                .from('partners')
                .select('name')
                .eq('id', partnerId)
                .single();
            if (error) return null;
            return data;
        },
        enabled: !!partnerId,
    });

    // 2️⃣ محرك جلب البيانات (البلدوزر لسحب كل السجلات مهما كان عددها)
    const { data: rawLines = [], isLoading } = useQuery({
        queryKey: ['partner_statement_raw', partnerId],
        queryFn: async () => {
            if (!partnerId) return [];

            let allData: any[] = [];
            let from = 0;
            const step = 999;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await supabase
                    .from('partner_statement_view')
                    .select('*')
                    .eq('partner_id', partnerId)
                    .order('entry_date', { ascending: true }) 
                    .order('line_id', { ascending: true })
                    .range(from, from + step);

                if (error) throw error;

                if (data && data.length > 0) {
                    allData = [...allData, ...data];
                    from += step + 1;
                    if (data.length <= step) {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
            }
            return allData;
        },
        enabled: !!partnerId, 
        staleTime: 1000 * 60 * 5, 
    });

    // 3️⃣ معالجة البيانات والحسابات المحاسبية الدقيقة (useMemo)
    const processedData = useMemo(() => {
        if (!rawLines || rawLines.length === 0) return null;

        let cumulativeBalance = 0;
        let openingBalance = 0;
        
        let periodDebit = 0;
        let periodCredit = 0;
        let attendanceCount = 0;
        let totalLaborAmount = 0;
        let totalViolations = 0;
        let totalPayments = 0;
        
        const periodLines: any[] = [];
        const typeSummaries: Record<string, { debit: number, credit: number }> = {};

        // 🚀 دوران واحد (Single Loop) لفرز القديم وتجميع الجديد
        rawLines.forEach((line: any) => {
            const credit = Number(line.credit || 0);
            const debit = Number(line.debit || 0);
            const lineDate = line.entry_date;

            // تحديث الرصيد التراكمي الشامل
            cumulativeBalance += (credit - debit);

            const isBeforeFrom = dateFrom && lineDate < dateFrom;
            const isAfterTo = dateTo && lineDate > dateTo;

            if (isBeforeFrom) {
                // لو القيد قبل تاريخ البداية، نضيفه للرصيد الافتتاحي وميظهرش في الجدول
                openingBalance = cumulativeBalance;
            } 
            else if (!isAfterTo) {
                // لو القيد جوه الفترة المحددة، نحسب مجاميعه ونضيفه للجدول
                periodDebit += debit;
                periodCredit += credit;

                const vType = translateVType(line.v_type);
                const desc = line.description || line.line_notes || '';

                periodLines.push({
                    id: line.line_id,
                    date: lineDate,
                    description: desc,
                    v_type: vType,
                    reference_id: line.reference_id,
                    debit,
                    credit,
                    balance: cumulativeBalance
                });

                // تجميع أنواع القيود للفترة المحددة فقط
                if (!typeSummaries[vType]) typeSummaries[vType] = { debit: 0, credit: 0 };
                typeSummaries[vType].debit += debit;
                typeSummaries[vType].credit += credit;

                if (vType === 'يومية عمالة' || desc.includes('يومية عامل')) {
                    attendanceCount += 1;
                    totalLaborAmount += credit;
                } else if (vType === 'قيد غرامة' || desc.includes('غرامة') || desc.includes('جزاء')) {
                    totalViolations += debit;
                } else if (vType === 'سند صرف') {
                    totalPayments += debit;
                }
            }
        });

        // 🚀 الرصيد النهائي للفترة هو رصيد آخر قيد نزل في المصفوفة، أو الافتتاحي لو مفيش حركات
        const currentBalance = periodLines.length > 0 
            ? periodLines[periodLines.length - 1].balance 
            : openingBalance;

        // د. تطبيق البحث النصي السريع (على العرض فقط)
        let finalLines = [...periodLines].reverse();
        if (globalSearch) {
            const s = globalSearch.toLowerCase();
            finalLines = finalLines.filter(l => 
                l.description.toLowerCase().includes(s) || 
                l.v_type.toLowerCase().includes(s)
            );
        }

        return {
            lines: finalLines, 
            openingBalance,
            currentBalance, // يقف عند تاريخ الـ dateTo
            totalDebit: periodDebit, // مدين الفترة فقط
            totalCredit: periodCredit, // دائن الفترة فقط
            attendanceCount,
            totalLaborAmount,
            totalViolations,
            totalPayments,
            typeSummaries: Object.entries(typeSummaries).map(([name, totals]) => ({ name, ...totals }))
        };

    }, [rawLines, dateFrom, dateTo, globalSearch]);

    // 4️⃣ دالة تصدير Excel
    const exportToExcel = (partnerName: string) => {
        if (!processedData || processedData.lines.length === 0) return;
        
        const actualName = partnerName || partnerInfo?.name || 'شريك';

        const csvRows = [
            ["التاريخ", "النوع", "البيان", "مدين", "دائن", "الرصيد"], 
            [
                dateFrom || "---", 
                "رصيد سابق", 
                "رصيد افتتاحي (ما قبل الفترة المختارة)", 
                processedData.openingBalance < 0 ? Math.abs(processedData.openingBalance).toString() : "0", 
                processedData.openingBalance > 0 ? processedData.openingBalance.toString() : "0", 
                processedData.openingBalance.toString()
            ],
            ...processedData.lines.map((l: any) => [
                l.date, 
                l.v_type, 
                `"${(l.description || '').replace(/"/g, '""')}"`, 
                l.debit.toString(), 
                l.credit.toString(), 
                l.balance.toString()
            ])
        ];
        const csvContent = "\uFEFF" + csvRows.map(e => e.join(",")).join("\n"); 
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `كشف_حساب_${actualName}.csv`;
        link.click();
    };

    // 5️⃣ تجريد المخرجات مع حماية كاملة
    return {
        partnerId,
        partnerName: partnerInfo?.name || '', 
        isLoading,
        dateFrom,
        dateTo,
        globalSearch,
        setPartnerId,
        setDateFrom,
        setDateTo,
        setGlobalSearch,
        exportToExcel,

        statementLines: processedData?.lines ?? [],
        openingBalance: processedData?.openingBalance ?? 0,
        currentBalance: processedData?.currentBalance ?? 0,
        totalDebit: processedData?.totalDebit ?? 0,
        totalCredit: processedData?.totalCredit ?? 0,
        attendanceCount: processedData?.attendanceCount ?? 0,
        totalLaborAmount: processedData?.totalLaborAmount ?? 0,
        totalViolations: processedData?.totalViolations ?? 0,
        totalPayments: processedData?.totalPayments ?? 0,
        typeSummaries: processedData?.typeSummaries ?? [],
    };
}