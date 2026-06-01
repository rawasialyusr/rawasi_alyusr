"use client";
import { useState, useMemo, useDeferredValue } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useOverheadAllocationsLogic() {
    const [globalSearch, setGlobalSearch] = useState('');
    const deferredSearch = useDeferredValue(globalSearch);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedProject, setSelectedProject] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(20);

    // 📡 سحب البيانات على دفعات (Pagination Loop) مع منع التكرار والانحراف
    const { data: allocationsData = [], isLoading } = useQuery({
        queryKey: ['vw_project_overhead_allocations'],
        queryFn: async () => {
            let allFetchedData: any[] = [];
            let from = 0;
            const step = 1000;
            let hasMoreData = true;

            // 1. السحب المتتالي لحد ما السيرفر يرجع داتا أقل من 1000
            while (hasMoreData) {
                const { data, error } = await supabase
                    .from('vw_project_overhead_allocations')
                    .select('*')
                    .order('تاريخ المصروف', { ascending: false }) // الترتيب الأساسي
                    .order('id', { ascending: true }) // 🚀 الترتيب المزدوج (Stable Sort) لمنع انحراف الترقيم نهائياً
                    .range(from, from + step - 1);
                
                if (error) throw error;

                if (data && data.length > 0) {
                    allFetchedData = [...allFetchedData, ...data];
                    from += step; // الاستعداد لسحب الـ 1000 اللي بعدهم
                    
                    // لو الداتا اللي راجعة أقل من الليميت، يبقى دي آخر دفعة
                    if (data.length < step) {
                        hasMoreData = false;
                    }
                } else {
                    hasMoreData = false;
                }
            }

            // 2. تنقية الداتا (Deduplication) لضمان عدم وجود أي ID متكرر نهائياً
            const uniqueDataMap = new Map();
            allFetchedData.forEach((item) => {
                // بنستخدم الـ id كـ Key، فاللو اتكرر بالغلط هيعمل Overwrite ومش هيتكرر في الـ Array
                if (item.id) {
                    uniqueDataMap.set(item.id, item);
                }
            });

            // تحويل الـ Map لمصفوفة نهائية نظيفة
            const finalCleanData = Array.from(uniqueDataMap.values());
            
            // ترتيب نهائي للمصفوفة بالكامل حسب الشهر
            return finalCleanData.sort((a, b) => 
                (b["شهر التحميل المالي"] || "").localeCompare(a["شهر التحميل المالي"] || "")
            );
        }
    });

    // 🔍 استخراج قوائم الفلترة
    const uniqueMonths = useMemo(() => {
        const months = allocationsData.map((item: any) => item["شهر التحميل المالي"]).filter(Boolean);
        return [...new Set(months)].sort().reverse();
    }, [allocationsData]);

    const uniqueProjects = useMemo(() => {
        const projects = allocationsData.map((item: any) => item["اسم المشروع"]).filter(Boolean);
        return [...new Set(projects)].sort();
    }, [allocationsData]);

    // 📊 التصفية المتعددة
    const filteredData = useMemo(() => {
        return allocationsData.filter((item: any) => {
            const searchLower = deferredSearch.toLowerCase();
            const matchSearch = deferredSearch ? (
                item["اسم المشروع"]?.toLowerCase().includes(searchLower) ||
                item["البيان والوصف"]?.toLowerCase().includes(searchLower) ||
                item["التصنيف"]?.toLowerCase().includes(searchLower)
            ) : true;
            
            const matchMonth = selectedMonth ? item["شهر التحميل المالي"] === selectedMonth : true;
            const matchProject = selectedProject ? item["اسم المشروع"] === selectedProject : true;

            return matchSearch && matchMonth && matchProject;
        });
    }, [allocationsData, deferredSearch, selectedMonth, selectedProject]);

    // 🏗️ التجميع الهرمي (Grouping by Project)
    const groupedProjects = useMemo(() => {
        const groups: Record<string, { projectName: string, totalAmount: number, items: any[] }> = {};
        
        filteredData.forEach((item: any) => {
            const pName = item["اسم المشروع"] || 'عام / غير موزع';
            if (!groups[pName]) {
                groups[pName] = { projectName: pName, totalAmount: 0, items: [] };
            }
            groups[pName].items.push(item);
            groups[pName].totalAmount += Number(item["نصيب المشروع (المبلغ المحمل)"] || 0);
        });
        
        // ترتيب المشاريع من الأعلى تحميلاً للأقل
        return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
    }, [filteredData]);

    // 📄 تقسيم المشاريع لصفحات
    const paginatedGroups = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return groupedProjects.slice(start, start + rowsPerPage);
    }, [groupedProjects, currentPage, rowsPerPage]);

    // 💰 حساب الإجمالي العام
    const totalAllocatedOverhead = useMemo(() => {
        return groupedProjects.reduce((sum, group) => sum + group.totalAmount, 0);
    }, [groupedProjects]);

    return {
        filteredData, groupedProjects, paginatedGroups, uniqueMonths, uniqueProjects,
        isLoading, totalAllocatedOverhead,
        globalSearch, setGlobalSearch: (v: string) => { setGlobalSearch(v); setCurrentPage(1); },
        selectedMonth, setSelectedMonth: (v: string) => { setSelectedMonth(v); setCurrentPage(1); },
        selectedProject, setSelectedProject: (v: string) => { setSelectedProject(v); setCurrentPage(1); },
        currentPage, setCurrentPage,
        rowsPerPage, setRowsPerPage: (v: number) => { setRowsPerPage(v); setCurrentPage(1); }
    };
}