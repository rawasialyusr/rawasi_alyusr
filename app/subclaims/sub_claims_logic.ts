"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';

export function useSubClaimsLogic() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [selectedContractor, setSelectedContractor] = useState<any | null>(null);
    const [selectedAssignments, setSelectedAssignments] = useState<any[]>([]);
    
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
    const [currentClaim, setCurrentClaim] = useState<any>({
        date: new Date().toISOString().split('T')[0],
        retention_percent: 5,
        tax_percent: 15,
        deductions: []
    });

    // 🚀 [الجديد]: حالات مودال إسناد الأعمال
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignRecord, setAssignRecord] = useState<any>({ assigned_qty: 1, unit_price: 0 });

    // 📥 1. جلب المقاولين
    const { data: contractors = [], isLoading } = useQuery({
        queryKey: ['sub_contractors_list'],
        queryFn: async () => {
            const { data } = await supabase.from('partners').select('*').eq('partner_type', 'مقاول');
            return data || [];
        }
    });

    // 📥 2. جلب الأعمال المسندة
    const { data: assignments = [], isLoading: isAssignLoading } = useQuery({
        queryKey: ['contractor_tasks', selectedContractor?.id],
        enabled: !!selectedContractor,
        queryFn: async () => {
            const { data } = await supabase.from('contractor_assignments')
                .select('*, projects(id, Property), boq_items(id, item_name, unit_of_measure)')
                .eq('contractor_id', selectedContractor.id);
            return data || [];
        }
    });

    // 📥 3. جلب المصاريف المحملة على المقاول (التي لم تُخصم بعد)
    const fetchContractorExpenses = async (contractorName: string, projectId: string) => {
        const { data } = await supabase.from('expenses')
            .select('*')
            .eq('sub_contractor', contractorName)
            .eq('site_ref', projectId)
            .eq('is_deducted_in_claim', false)
            .eq('is_posted', true);
        return data || [];
    };

    // 🚀 4. دالة حفظ المستخلص (Mutation)
    const saveClaimMutation = useMutation({
        mutationFn: async (claimData: any) => {
            const { data: claim, error } = await supabase.from('sub_claims').insert([{
                claim_number: `CLM-${Date.now().toString().slice(-6)}`,
                contractor_id: selectedContractor.id,
                project_id: claimData.project_id,
                date: claimData.date,
                total_amount: claimData.total_amount,
                retention_amount: claimData.retention_amount,
                net_amount: claimData.net_amount,
                status: 'مُعتمد'
            }]).select().single();

            if (error) throw error;

            if (claimData.deductions?.length > 0) {
                await supabase.from('expenses')
                    .update({ is_deducted_in_claim: true, claim_id: claim.id })
                    .in('id', claimData.deductions.map((d: any) => d.id));
            }

            return claim;
        },
        onSuccess: () => {
            showToast("تم اعتماد المستخلص وتصفية المصاريف بنجاح ✅", "success");
            setIsClaimModalOpen(false);
            setSelectedAssignments([]);
            queryClient.invalidateQueries({ queryKey: ['sub_contractors_list'] });
        }
    });

    // 🚀 5. [الجديد]: دالة حفظ إسناد الأعمال (إضافة مشروع وبند للمقاول)
    const assignWorkMutation = useMutation({
        mutationFn: async (record: any) => {
            const payload = {
                contractor_id: selectedContractor?.id,
                project_id: record.project_id,
                boq_item_id: record.boq_id,
                assigned_qty: Number(record.assigned_qty),
                unit_price: Number(record.unit_price),
                status: 'جاري التنفيذ'
            };
            const { error } = await supabase.from('contractor_assignments').insert([payload]);
            if (error) throw error;
        },
        onSuccess: () => {
            showToast("تم إسناد الأعمال للمقاول بنجاح 👷✅", "success");
            setIsAssignModalOpen(false);
            setAssignRecord({ assigned_qty: 1, unit_price: 0 }); // تصفير المودال
            queryClient.invalidateQueries({ queryKey: ['contractor_tasks', selectedContractor?.id] });
            queryClient.invalidateQueries({ queryKey: ['sub_contractors_list'] });
        },
        onError: (err: any) => showToast(`خطأ في الإسناد: ${err.message}`, "error")
    });

    return {
        contractors, isLoading, selectedContractor, setSelectedContractor,
        assignments, isAssignLoading, selectedAssignments, setSelectedAssignments,
        isClaimModalOpen, setIsClaimModalOpen, currentClaim, setCurrentClaim,
        fetchContractorExpenses,
        handleSaveClaim: (data: any) => saveClaimMutation.mutate(data),

        // 🚀 [الجديد]: تصدير متغيرات الإسناد للواجهة
        isAssignModalOpen, setIsAssignModalOpen,
        assignRecord, setAssignRecord,
        handleAssignWork: (data: any) => assignWorkMutation.mutate(data),
        isAssigning: assignWorkMutation.isPending
    };
}