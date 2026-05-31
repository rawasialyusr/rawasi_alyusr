"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useCashFlowsLogic() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, inflow, outflow
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const { data: cashFlows = [], isLoading } = useQuery({
        queryKey: ['cash_flows_list'],
        queryFn: async () => {
            let allData: any[] = [];
            let hasMore = true;
            let step = 0;
            const pageSize = 1000;

            // 🚀 محرك السحب العميق: بيلف يسحب الداتا ألف بألف عشان يتخطى حاجز الـ 1000 سطر بتاع Supabase
            while (hasMore) {
                const { data, error } = await supabase
                    .from('cash_flows')
                    .select(`
                        *,
                        project:projects(Property),
                        partner:partners(name),
                        account:accounts(name)
                    `)
                    .order('transaction_date', { ascending: false })
                    .order('created_at', { ascending: false })
                    .range(step * pageSize, (step + 1) * pageSize - 1);
                
                if (error) {
                    console.error("Error fetching cash flows:", error);
                    throw error;
                }
                
                if (data && data.length > 0) {
                    allData = [...allData, ...data];
                    // لو الداتا اللي رجعت أقل من 1000، معناه إننا وصلنا لآخر الداتابيز
                    if (data.length < pageSize) {
                        hasMore = false;
                    } else {
                        step++; // كمل سحب الألف اللي بعدهم
                    }
                } else {
                    hasMore = false; // مفيش داتا تانية
                }
            }
            
            return allData;
        }
    });

    return {
        cashFlows,
        isLoading,
        searchTerm, setSearchTerm,
        filterType, setFilterType,
        dateFrom, setDateFrom,
        dateTo, setDateTo
    };
}