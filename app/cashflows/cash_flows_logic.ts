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
            const { data, error } = await supabase
                .from('cash_flows')
                .select(`
                    *,
                    project:projects(Property),
                    partner:partners(name),
                    account:accounts(name)
                `)
                .order('transaction_date', { ascending: false })
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
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