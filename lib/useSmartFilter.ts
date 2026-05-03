import { useState, useMemo, useEffect, useDeferredValue } from 'react';

export function useSmartFilter(
    rawData: any[], 
    searchKeys: string[], 
    dateKey: string = 'created_at' 
) {
    const [globalSearch, setGlobalSearch] = useState('');
    const deferredSearch = useDeferredValue(globalSearch);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    
    const [customFilters, setCustomFilters] = useState<Record<string, any>>({}); 

    useEffect(() => {
        const handleDate = (e: any) => setDateRange({ start: e.detail.start, end: e.detail.end });
        const handleSearch = (e: any) => setGlobalSearch(e.detail);

        window.addEventListener('globalDateFilter', handleDate);
        window.addEventListener('globalSearch', handleSearch);

        return () => {
            window.removeEventListener('globalDateFilter', handleDate);
            window.removeEventListener('globalSearch', handleSearch);
        };
    }, []);

    const filteredData = useMemo(() => {
        if (!rawData || rawData.length === 0) return [];
        let result = rawData;

        // فلترة التواريخ
        if (dateRange.start) {
            result = result.filter(v => new Date(v[dateKey]) >= new Date(dateRange.start));
        }
        if (dateRange.end) {
            result = result.filter(v => new Date(v[dateKey]) <= new Date(dateRange.end));
        }

        // فلترة الفلاتر الإضافية (زي الحالة)
        Object.keys(customFilters).forEach(key => {
            const filterValue = customFilters[key];
            if (filterValue !== null && filterValue !== undefined && filterValue !== 'الكل') {
                result = result.filter(v => v[key] === filterValue);
            }
        });

        // البحث الشامل
        if (deferredSearch) {
            const lowerSearch = deferredSearch.toLowerCase().trim();
            result = result.filter(item => {
                return searchKeys.some(key => {
                    const keys = key.split('.');
                    let val = item;
                    keys.forEach(k => { val = val ? val[k] : null; });
                    return String(val || '').toLowerCase().includes(lowerSearch);
                });
            });
        }

        return result;
    }, [rawData, dateRange, customFilters, deferredSearch, searchKeys, dateKey]);

    const setFilter = (key: string, value: any) => {
        setCustomFilters(prev => ({ ...prev, [key]: value }));
    };

    return { 
        filteredData, 
        setFilter, 
        customFilters, 
        globalSearch,
        setGlobalSearch
    };
}