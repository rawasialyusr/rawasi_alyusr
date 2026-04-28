"use client";
import { useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useFieldOpsLogic() {
    const today = new Date().toISOString().split('T')[0];

    // 📥 سحب البيانات الجاهزة من الـ View الذكي (طلقة واحدة للداتابيز)
    const { data: radarData = [], isLoading } = useQuery({
        queryKey: ['field_live_radar', today],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('field_live_radar') // 🚀 مناداة الـ View مباشرة
                .select('*');
            
            if (error) throw error;
            return data || [];
        },
        // ⏱️ جعل الصفحة "بث مباشر" فعلياً بتحديث الداتا كل 30 ثانية أوتوماتيكياً
        refetchInterval: 30000, 
        refetchOnWindowFocus: true
    });

    // 🚀 إعادة صياغة البيانات لتتوافق مع تسميات الـ UI (Mapping)
    const projectStats = useMemo(() => {
        return radarData.map(row => ({
            id: row.project_id,
            Property: row.site_name,
            status: row.status,
            estimated_budget: Number(row.estimated_budget || 0),
            client: { name: row.client_name },
            todayWorkers: Number(row.today_workers_count || 0),
            todayLaborCost: Number(row.today_labor_cost || 0),
            todayExpenses: Number(row.today_expenses_cost || 0),
            totalTodayCost: Number(row.today_labor_cost || 0) + Number(row.today_expenses_cost || 0),
            // تحويل المهام من نص مفصول بفواصل إلى مصفوفة للـ UI
            activeTasks: row.active_tasks ? row.active_tasks.split(', ') : []
        }));
    }, [radarData]);

    // 📊 حساب إجماليات الشركة (النبض العام)
    const companyTotals = useMemo(() => {
        return {
            totalWorkers: projectStats.reduce((sum, p) => sum + p.todayWorkers, 0),
            totalCost: projectStats.reduce((sum, p) => sum + p.totalTodayCost, 0)
        };
    }, [projectStats]);

    return {
        projectStats,
        companyTotals,
        isLoading,
        today
    };
}