"use client";
import { useState, useMemo, useDeferredValue } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useQuery } from '@tanstack/react-query'; 

export function useAllocationViewLogic() {
    const [globalSearch, setGlobalSearch] = useState('');
    const deferredSearch = useDeferredValue(globalSearch);
    const [selectedMonth, setSelectedMonth] = useState(''); 
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    // 📡 جلب البيانات لا نهائياً على موجات مع منع تكرار السطور
    const { data: allocationData = [], isLoading } = useQuery({
        queryKey: ['advanced_cost_allocation_view'],
        queryFn: async () => {
            const uniqueMap = new Map();
            let from = 0;
            let to = 999;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await supabase
                    .from('advanced_cost_allocation_view')
                    .select('*')
                    .range(from, to); 
                
                if (error) throw error;
                
                if (data && data.length > 0) {
                    data.forEach((item: any) => {
                        // 🎯 تم إضافة البند المحمل عليه للـ Unique Key عشان ميحذفش بنود نفس الفيلا
                        const uniqueKey = item.id || `${item["شهر التحميل المالي"]}-${item["اسم الفيلا المحمل عليها"]}-${item["البند المحمل عليه"]}-${item["التصنيف الرئيسي"]}-${item["وصف المصروف التلقائي"]}-${item["المبلغ المحمل (جنيه)"]}`;
                        if (!uniqueMap.has(uniqueKey)) {
                            uniqueMap.set(uniqueKey, item);
                        }
                    });
                    
                    if (data.length < 1000) {
                        hasMore = false;
                    } else {
                        from += 1000;
                        to += 1000;
                    }
                } else {
                    hasMore = false;
                }
            }
            return Array.from(uniqueMap.values());
        }
    });

    // 🔍 استخراج قائمة الشهور المتاحة
    const uniqueMonths = useMemo(() => {
        const months = allocationData.map((item: any) => item["شهر التحميل المالي"]);
        return [...new Set(months)].sort().reverse();
    }, [allocationData]);

    // 📊 التصفية والبحث النصي
    const filteredData = useMemo(() => {
        let result = allocationData;

        if (selectedMonth) {
            result = result.filter((item: any) => item["شهر التحميل المالي"] === selectedMonth);
        }

        if (deferredSearch) {
            const searchLower = deferredSearch.toLowerCase();
            result = result.filter((item: any) => 
                item["اسم الفيلا المحمل عليها"]?.toLowerCase().includes(searchLower) ||
                item["البند المحمل عليه"]?.toLowerCase().includes(searchLower) || // 🎯 البحث باسم البند
                item["التصنيف الرئيسي"]?.toLowerCase().includes(searchLower) ||
                item["وصف المصروف التلقائي"]?.toLowerCase().includes(searchLower) ||
                item["آلية التوزيع"]?.toLowerCase().includes(searchLower) // 🎯 البحث بآلية التوزيع
            );
        }

        return result;
    }, [allocationData, selectedMonth, deferredSearch]);

    // 📄 تقسيم البيانات لصفحات
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filteredData.slice(start, start + rowsPerPage);
    }, [filteredData, currentPage, rowsPerPage]);

    // 💰 حساب إجمالي المصروفات
    const totalAllocatedAmount = useMemo(() => {
        return filteredData.reduce((sum: number, item: any) => sum + Number(item["المبلغ المحمل (جنيه)"] || 0), 0);
    }, [filteredData]);

    return {
        filteredData, paginatedItems, uniqueMonths,
        isLoading, totalAllocatedAmount, 
        globalSearch, setGlobalSearch: (v: string) => { setGlobalSearch(v); setCurrentPage(1); },
        selectedMonth, setSelectedMonth: (v: string) => { setSelectedMonth(v); setCurrentPage(1); },
        currentPage, setCurrentPage,
        rowsPerPage, setRowsPerPage: (v: number) => { setRowsPerPage(v); setCurrentPage(1); }
    };
}