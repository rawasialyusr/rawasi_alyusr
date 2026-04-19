"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useRevenueLogic() {
    const [revenues, setRevenues] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [permissions, setPermissions] = useState<any>({}); // 🔐 الصلاحيات

    const [globalSearch, setGlobalSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    // 🚀 جلب الصلاحيات
    const fetchPermissions = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: profile } = await supabase.from('profiles').select('permissions, role').eq('id', session.user.id).single();
            // لو هو أدمن بياخد كل حاجة، لو محاسب بياخد صلاحياته
            setPermissions(profile?.role === 'admin' ? { revenue: { view: true, add: true, edit: true, delete: true, post: true } } : (profile?.permissions || {}));
        }
    };

    // 🚀 جلب البيانات (أكثر من 1000 صف)
    const fetchRevenues = useCallback(async () => {
        setIsLoading(true);
        try {
            let allData: any[] = [];
            let keepFetching = true;
            let start = 0;
            const step = 999;

            // اللوب السحري لكسر حاجز الـ 1000 صف في Supabase
            while (keepFetching) {
                const { data, error } = await supabase
                    .from('invoices') // هنسحب الإيرادات من الفواتير المعتمدة كمثال
                    .select('*, partners(name)')
                    .eq('status', 'مُعتمد') // الإيراد الحقيقي هو المعتمد فقط
                    .range(start, start + step)
                    .order('date', { ascending: false });

                if (error) throw error;

                if (data && data.length > 0) {
                    allData.push(...data);
                    start += step + 1;
                }
                
                // لو الداتا اللي رجعت أقل من 1000، يبقى دي آخر لفة
                if (!data || data.length <= step) {
                    keepFetching = false;
                }
            }
            setRevenues(allData);
        } catch (error) {
            console.error("Error fetching revenues:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPermissions().then(() => fetchRevenues());
    }, [fetchRevenues]);

    // 🔍 الفلترة الذكية (بالتاريخ والبحث)
    const filteredData = useMemo(() => {
        return revenues.filter(rev => {
            const matchesSearch = rev.invoice_number?.toLowerCase().includes(globalSearch.toLowerCase()) || 
                                  rev.partners?.name?.toLowerCase().includes(globalSearch.toLowerCase());
            
            const revDate = new Date(rev.date);
            const matchesFrom = dateFrom ? revDate >= new Date(dateFrom) : true;
            const matchesTo = dateTo ? revDate <= new Date(dateTo) : true;

            return matchesSearch && matchesFrom && matchesTo;
        });
    }, [revenues, globalSearch, dateFrom, dateTo]);

    // 📊 التقسيم لصفحات
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filteredData.slice(start, start + rowsPerPage);
    }, [filteredData, currentPage, rowsPerPage]);

    // 📈 مؤشرات الأداء (KPIs) مفصلة (الخصومات والضريبة والصافي)
    const kpis = useMemo(() => {
        return filteredData.reduce((acc, curr) => ({
            totalGross: acc.totalGross + (Number(curr.line_total) || 0),
            totalDiscounts: acc.totalDiscounts + (Number(curr.materials_discount) || 0) + (Number(curr.guarantee_amount) || 0),
            totalTax: acc.totalTax + (Number(curr.tax_amount) || 0),
            netRevenue: acc.netRevenue + (Number(curr.total_amount) || 0) // الصافي الفعلي للإيراد
        }), { totalGross: 0, totalDiscounts: 0, totalTax: 0, netRevenue: 0 });
    }, [filteredData]);

    return {
        data: paginatedData,
        totalItems: filteredData.length,
        kpis,
        isLoading,
        permissions: permissions?.revenue || {}, // تمرير الصلاحيات للواجهة
        globalSearch, setGlobalSearch,
        dateFrom, setDateFrom,
        dateTo, setDateTo,
        currentPage, setCurrentPage,
        rowsPerPage, setRowsPerPage,
        refresh: fetchRevenues
    };
}