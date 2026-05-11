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
    const [searchTerm, setSearchTerm] = useState('');

    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
    const [currentClaim, setCurrentClaim] = useState<any>({
        date: new Date().toISOString().split('T')[0],
        retention_percent: 5,
        tax_percent: 15,
        deductions: []
    });

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignRecord, setAssignRecord] = useState<any>({ assigned_qty: 1, unit_price: 0 });

    const { data: contractors = [], isLoading } = useQuery({
        queryKey: ['sub_contractors_list'],
        queryFn: async () => {
            const { data } = await supabase.from('partners').select('*').eq('partner_type', 'مقاول');
            return data || [];
        }
    });

    const filteredContractors = useMemo(() => {
        if (!searchTerm) return contractors;
        return contractors.filter((c: any) => 
            c.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [contractors, searchTerm]);

    const { data: assignments = [], isLoading: isAssignLoading } = useQuery({
        queryKey: ['contractor_tasks', selectedContractor?.id],
        enabled: !!selectedContractor,
        queryFn: async () => {
            const { data, error } = await supabase.from('contractor_assignments')
                .select(`
                    *,
                    projects!contractor_assignments_project_id_fkey (id, Property),
                    boq_items!contractor_assignments_boq_item_id_fkey (id, item_name, unit_of_measure)
                `)
                .eq('contractor_id', selectedContractor.id)
                .eq('status', 'جاري التنفيذ'); 
            
            if (error) throw error;
            return data || [];
        }
    });

    const fetchContractorExpenses = async (contractorName: string, projectId: string) => {
        const { data } = await supabase.from('expenses')
            .select('*')
            .eq('sub_contractor', contractorName)
            .eq('project_id', projectId)
            .eq('is_deducted_in_claim', false)
            .eq('is_posted', true);
        return data || [];
    };

    const saveClaimMutation = useMutation({
        mutationFn: async (claimData: any) => {
            const { data: jvHeader, error: jvHeaderError } = await supabase.from('journal_headers').insert([{
                entry_date: claimData.date,
                description: `إثبات مستخلص أعمال رقم CLM - للمقاول: ${selectedContractor.name}`,
                status: 'posted',
                v_type: 'invoices'
            }]).select().single();

            if (jvHeaderError) throw jvHeaderError;

            const { data: claim, error } = await supabase.from('sub_claims').insert([{
                claim_number: `CLM-${Date.now().toString().slice(-6)}`,
                contractor_id: selectedContractor.id,
                project_id: claimData.project_id,
                date: claimData.date,
                total_amount: claimData.total_amount, 
                retention_amount: claimData.retention_amount,
                net_amount: claimData.net_amount,
                is_posted: true, 
                status: 'مُعتمد ومُرحل'
            }]).select().single();

            if (error) throw error;

            const journalLines = [
                {
                    header_id: jvHeader.id,
                    account_id: '70d181ba-6385-4c1e-b0fc-d5b1f800dd2c', 
                    partner_id: selectedContractor.id,
                    project_id: claimData.project_id,
                    debit: claimData.total_amount,
                    credit: 0,
                    notes: 'قيمة الأعمال المنفذة'
                },
                {
                    header_id: jvHeader.id,
                    account_id: '39f878cd-dc58-4a2a-a199-50f6fca983d4', 
                    partner_id: selectedContractor.id,
                    project_id: claimData.project_id,
                    debit: 0,
                    credit: claimData.net_amount,
                    notes: 'الصافي المستحق للمقاول'
                }
            ];

            if (claimData.retention_amount > 0) {
                journalLines.push({
                    header_id: jvHeader.id,
                    account_id: '1e370e5b-4357-41a4-9271-7c98f9864205', 
                    partner_id: selectedContractor.id,
                    project_id: claimData.project_id,
                    debit: 0,
                    credit: claimData.retention_amount,
                    notes: 'حجز ضمان أعمال 5%'
                });
            }

            const { error: linesError } = await supabase.from('journal_lines').insert(journalLines);
            if (linesError) throw linesError;

            if (claimData.deductions?.length > 0) {
                await supabase.from('expenses')
                    .update({ is_deducted_in_claim: true, claim_id: claim.id })
                    .in('id', claimData.deductions.map((d: any) => d.id));
            }

            if (claimData.assignment_ids?.length > 0) {
                await supabase.from('contractor_assignments')
                    .update({ status: 'مفوتر' })
                    .in('id', claimData.assignment_ids);
            }

            return claim;
        },
        onSuccess: () => {
            showToast("تم اعتماد المستخلص وترحيل القيود للحسابات بنجاح ✅", "success");
            setIsClaimModalOpen(false);
            setSelectedAssignments([]);
            queryClient.invalidateQueries({ queryKey: ['sub_contractors_list'] });
            queryClient.invalidateQueries({ queryKey: ['contractor_tasks'] });
        }
    });

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
            setAssignRecord({ assigned_qty: 1, unit_price: 0 });
            queryClient.invalidateQueries({ queryKey: ['contractor_tasks', selectedContractor?.id] });
        }
    });

    return {
        contractors: filteredContractors, 
        searchTerm, setSearchTerm,       
        isLoading, selectedContractor, setSelectedContractor,
        assignments, isAssignLoading, selectedAssignments, setSelectedAssignments,
        isClaimModalOpen, setIsClaimModalOpen, currentClaim, setCurrentClaim,
        fetchContractorExpenses,
        handleSaveClaim: (data: any) => saveClaimMutation.mutate(data),
        isClaimSaving: saveClaimMutation.isPending, // 🎯 تم التصحيح
        isAssignModalOpen, setIsAssignModalOpen,
        assignRecord, setAssignRecord,
        handleAssignWork: (data: any) => assignWorkMutation.mutate(data),
        isAssigning: assignWorkMutation.isPending
    };
}