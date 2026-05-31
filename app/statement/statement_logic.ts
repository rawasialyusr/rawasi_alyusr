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
        case 'violation': 
        case 'violations': return 'قيد غرامة';
        case 'invoices': return 'فاتورة';
        case 'مستخلص': return 'مستخلص أعمال';
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

    // 2️⃣ محرك جلب البيانات المحدث ليطابق جدولك partner_statement_ledger
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
                    .from('partner_statement_ledger') // 👈 تم التحديث لاسم جدولك الحقيقي
                    .select('*')
                    .eq('partner_id', partnerId)
                    .order('transaction_date', { ascending: true }) // 👈 تم التحديث لعمود التاريخ الخاص بك
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

    // 3️⃣ معالجة البيانات والحسابات المحاسبية الدقيقة (بدون حذف أي ميزة)
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

        rawLines.forEach((line: any, index: number) => {
            const credit = Number(line.credit || 0);
            const debit = Number(line.debit || 0);
            const lineDate = line.transaction_date; // 👈 تحديث لعمود تاريخ جدولك الحالي

            cumulativeBalance += (credit - debit);

            const isBeforeFrom = dateFrom && lineDate < dateFrom;
            const isAfterTo = dateTo && lineDate > dateTo;

            if (isBeforeFrom) {
                openingBalance = cumulativeBalance;
            } 
            else if (!isAfterTo) {
                periodDebit += debit;
                periodCredit += credit;

                // 🧠 محرك استنتاج ذكي لتعويض العواميد المفقودة في الـ View الحالي
                const headerDesc = line.main_description || '';
                const lineDesc = line.line_details || '';
                const fullDesc = `${headerDesc} ${lineDesc}`.toLowerCase();
                
                let inferredVType = line.v_type || '';
                
                // لو عمود النوع مش موجود، بنستنتجه من الكلمات المفتاحية في البيان والشرح
                if (!inferredVType) {
                    if (fullDesc.includes('صرف') || fullDesc.includes('سند صرف')) inferredVType = 'payment_vouchers';
                    else if (fullDesc.includes('قبض') || fullDesc.includes('سند قبض')) inferredVType = 'receipt_vouchers';
                    else if (fullDesc.includes('يومية') || fullDesc.includes('عمالة') || fullDesc.includes('حضور')) inferredVType = 'labor_daily_logs';
                    else if (fullDesc.includes('غرامة') || fullDesc.includes('مخالفة') || fullDesc.includes('جزاء')) inferredVType = 'violations';
                    else if (fullDesc.includes('فاتورة')) inferredVType = 'invoices';
                    else if (fullDesc.includes('مستخلص')) inferredVType = 'مستخلص';
                }

                const vType = translateVType(inferredVType);
                const finalDesc = lineDesc || headerDesc || 'بدون بيان';

                periodLines.push({
                    id: line.line_id || `line-${index}`, // 👈 معرف بديل ذكي طالما الـ line_id مش بالجدول
                    date: lineDate,
                    description: finalDesc,
                    v_type: vType,
                    reference_id: line.reference_id || '',
                    debit,
                    credit,
                    balance: cumulativeBalance
                });

                if (!typeSummaries[vType]) typeSummaries[vType] = { debit: 0, credit: 0 };
                typeSummaries[vType].debit += debit;
                typeSummaries[vType].credit += credit;

                // 🚀 احتساب الإحصائيات الدقيقة بالاعتماد على محرك الاستنتاج + الشرح
                if (vType === 'يومية عمالة' || finalDesc.includes('يومية عامل')) {
                    let qty = 1;
                    if (line.attendance_value !== undefined && line.attendance_value !== null && line.attendance_value !== '') {
                        qty = Number(line.attendance_value);
                    } else if (line.quantity !== null && line.quantity !== undefined && line.quantity !== '') {
                        qty = Number(line.quantity);
                    }
                    
                    attendanceCount += qty; 
                    totalLaborAmount += credit;
                } else if (vType === 'قيد غرامة' || finalDesc.includes('غرامة') || finalDesc.includes('جزاء') || finalDesc.includes('مخالفة')) {
                    totalViolations += debit; 
                } else if (vType === 'سند صرف') {
                    totalPayments += debit;
                }
            }
        });

        const currentBalance = periodLines.length > 0 
            ? periodLines[periodLines.length - 1].balance 
            : openingBalance;

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
            currentBalance,
            totalDebit: periodDebit,
            totalCredit: periodCredit,
            periodNet: periodCredit - periodDebit,
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
        periodNet: processedData?.periodNet ?? 0, 
        attendanceCount: processedData?.attendanceCount ?? 0,
        totalLaborAmount: processedData?.totalLaborAmount ?? 0,
        totalViolations: processedData?.totalViolations ?? 0,
        totalPayments: processedData?.totalPayments ?? 0,
        typeSummaries: processedData?.typeSummaries ?? [],
    };
}