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
    
    const [activeTab, setActiveTab] = useState<'assignments' | 'history'>('assignments');

    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
    const [currentClaim, setCurrentClaim] = useState<any>({
        date: new Date().toISOString().split('T')[0],
        retention_percent: 5,
        tax_percent: 15,
        deductions: []
    });

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignRecord, setAssignRecord] = useState<any>({ assigned_qty: 1, unit_price: 0 });

    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [selectedPrintClaim, setSelectedPrintClaim] = useState<any | null>(null);
    const [printAssignments, setPrintAssignments] = useState<any[]>([]); 
    const [printDeductions, setPrintDeductions] = useState<any[]>([]);

    const [projectBoqItems, setProjectBoqItems] = useState<any[]>([]);
    const fetchProjectBoq = async (projectId: string) => {
        if (!projectId) { setProjectBoqItems([]); return; }
        const { data } = await supabase.from('boq_budget').select('*').eq('project_id', projectId);
        setProjectBoqItems(data || []);
    };

    const { data: contractors = [], isLoading } = useQuery({
        queryKey: ['sub_contractors_list'],
        queryFn: async () => {
            const { data } = await supabase.from('partners').select('*').eq('partner_type', 'مقاول');
            return data || [];
        }
    });

    const filteredContractors = useMemo(() => {
        if (!searchTerm) return contractors || [];
        return (contractors || []).filter((c: any) => 
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
                    boq_budget:boq_budget_id (id, work_item, unit), 
                    boq_items!contractor_assignments_boq_item_id_fkey (id, item_name, unit_of_measure)
                `)
                .eq('contractor_id', selectedContractor.id)
                .eq('status', 'جاري التنفيذ'); 
            
            if (error) throw new Error(error.message);
            return data || [];
        }
    });

    const { data: claimsHistory = [], isLoading: isHistoryLoading } = useQuery({
        queryKey: ['contractor_claims_history', selectedContractor?.id],
        enabled: !!selectedContractor,
        queryFn: async () => {
            const { data, error } = await supabase.from('sub_claims')
                .select('*, projects(Property)')
                .eq('contractor_id', selectedContractor.id)
                .order('created_at', { ascending: false });
            if (error) throw error; 

            return (data || []).map((claim: any) => {
                const net = Number(claim.net_amount || 0);
                const paid = Number(claim.paid_amount || 0);
                
                let pStatus = { label: 'غير مسدد', color: '#ef4444', bg: '#fef2f2' };

                if (paid > 0 && paid < net) {
                    pStatus = { label: 'مسدد جزئي', color: '#f59e0b', bg: '#fffbeb' };
                } else if (paid >= net && net > 0) {
                    pStatus = { label: 'مسدد بالكامل', color: '#16a34a', bg: '#f0fdf4' };
                }

                return { ...claim, pStatus };
            });
        }
    });

    const handleOpenClaimModal = () => {
        if (!selectedAssignments || selectedAssignments.length === 0) {
            showToast("⚠️ يرجى تحديد بند واحد على الأقل من الأعمال المنجزة.", "error");
            return;
        }

        const selectedObjects = (assignments || []).filter((a: any) => selectedAssignments.includes(a.id));
        const projectIds = Array.from(new Set(selectedObjects.map((a: any) => a.project_id)));
        
        if (projectIds.length > 1) {
            showToast("⚠️ لا يمكن عمل مستخلص يجمع بنود من عقارات مختلفة. يرجى تحديد بنود لعقار واحد فقط.", "error");
            return;
        }

        setCurrentClaim({
            date: new Date().toISOString().split('T')[0],
            retention_percent: 5,
            tax_percent: 15,
            project_ids: projectIds, 
            deductions: [],
            materials_deduction: 0,
            other_deductions: 0,
            advance_payment: 0
        });

        setIsClaimModalOpen(true);
    };

    const fetchPendingDeductions = async (contractorId: string, projectId: string) => {
        const { data: expenses, error: expError } = await supabase.from('expenses')
            .select('*')
            .eq('sub_contractor', selectedContractor?.name) 
            .eq('is_posted', true)
            .eq('is_deducted_in_claim', false); 

        if (expError) console.error("Expenses Fetch Error:", expError.message);

        const validExpenses = (expenses || [])
            .filter(e => e.project_id === projectId || !e.project_id) 
            .map(e => ({
                id: e.id,
                type: 'expense',
                date: e.expense_date || e.created_at,
                statement: e.notes || 'مصروف محمل على المقاول',
                amount: e.amount || e.total_price || 0
            }));

        const { data: materials, error: matError } = await supabase.from('material_issues')
            .select('*, lines:material_issue_lines(*)')
            .eq('subcontractor_id', contractorId)
            .eq('project_id', projectId)
            .eq('is_posted', true)
            .is('claim_id', null);

        if (matError) console.error("Materials Fetch Error:", matError.message);

        const validMaterials = (materials || []).map(m => {
            const lines = m.lines || m.material_issue_lines || [];
            const total = lines.reduce((sum: number, l: any) => sum + (Number(l.total_price) || 0), 0) || 0;
            const desc = lines.map((l:any) => `${l.item_name} (${l.quantity} ${l.unit})`).join(' + ');
            return {
                id: m.id,
                type: 'material',
                date: m.issue_date,
                statement: `صرف خامات للموقع: ${desc}`,
                amount: total
            };
        });

        return [...validExpenses, ...validMaterials];
    };

    const saveClaimMutation = useMutation({
        mutationFn: async (claimData: any) => {
            if (!claimData.project_ids || claimData.project_ids.length === 0) {
                throw new Error("يرجى تحديد العقار / المشروع أولاً.");
            }

            const { data: claim, error } = await supabase.from('sub_claims').insert([{
                claim_number: `CLM-${Date.now().toString().slice(-6)}`,
                contractor_id: selectedContractor.id,
                project_id: claimData.project_ids[0], 
                date: claimData.date,
                total_amount: claimData.total_amount, 
                retention_amount: claimData.retention_amount,
                advance_payment: claimData.advance_payment || 0,
                materials_deduction: claimData.materials_deduction || 0,
                other_deductions: claimData.other_deductions || 0,
                net_amount: claimData.net_amount,
                is_posted: false,
                status: 'مسودة',
                paid_amount: 0 
            }]).select().single();

            if (error) throw new Error(error.message);

            if (claimData.deductions?.length > 0) {
                for (const ded of claimData.deductions) {
                    if (ded.type === 'expense') {
                        await supabase.from('expenses')
                            .update({ is_deducted_in_claim: true, claim_id: claim.id })
                            .eq('id', ded.id);
                    } else if (ded.type === 'material') {
                        await supabase.from('material_issues')
                            .update({ claim_id: claim.id })
                            .eq('id', ded.id);
                    }
                }
            }

            if (claimData.assignments?.length > 0) {
                for (const assign of claimData.assignments) {
                    await supabase.from('contractor_assignments')
                        .update({ status: 'مفوتر', assigned_qty: assign.assigned_qty, unit_price: assign.unit_price, claim_id: claim.id })
                        .eq('id', assign.id);
                }
            }

            const { error: rpcError } = await supabase.rpc('rpc_post_claim', { p_id: claim.id });
            if (rpcError) throw new Error(rpcError.message);

            return claim;
        },
        onSuccess: () => {
            showToast("تم اعتماد المستخلص وترحيله بنجاح 🚀", "success");
            setIsClaimModalOpen(false);
            setSelectedAssignments([]);
            queryClient.invalidateQueries({ queryKey: ['contractor_tasks'] });
            queryClient.invalidateQueries({ queryKey: ['contractor_claims_history'] }); 
            setActiveTab('history'); 
        },
        onError: (err: any) => {
            showToast(`خطأ في الحفظ: ${err.message}`, "error");
        }
    });

    const assignWorkMutation = useMutation({
        mutationFn: async (record: any) => {
            const payload = {
                contractor_id: selectedContractor?.id,
                project_id: record.project_id,
                boq_item_id: null, 
                boq_budget_id: record.boq_budget_id, 
                assigned_qty: Number(record.assigned_qty),
                unit_price: Number(record.unit_price),
                status: 'جاري التنفيذ'
            };

            if (record.id) {
                const { error } = await supabase.from('contractor_assignments').update(payload).eq('id', record.id);
                if (error) throw new Error(error.message);
            } else {
                const { error } = await supabase.from('contractor_assignments').insert([payload]);
                if (error) throw new Error(error.message); 
            }
        },
        onSuccess: () => {
            showToast("تم حفظ البند بنجاح 👷✅", "success");
            setIsAssignModalOpen(false);
            setAssignRecord({ assigned_qty: 1, unit_price: 0 });
            queryClient.invalidateQueries({ queryKey: ['contractor_tasks', selectedContractor?.id] });
        }
    });

    const deleteAssignmentMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('contractor_assignments').delete().eq('id', id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            showToast("تم مسح البند بنجاح 🗑️", "success");
            queryClient.invalidateQueries({ queryKey: ['contractor_tasks', selectedContractor?.id] });
        }
    });

    const handleEditAssignment = (assignment: any) => {
        setAssignRecord({
            id: assignment.id,
            project_id: assignment.project_id,
            boq_budget_id: assignment.boq_budget_id,
            assigned_qty: assignment.assigned_qty,
            unit_price: assignment.unit_price
        });
        setIsAssignModalOpen(true);
    };

    const actionMutation = useMutation({
        mutationFn: async ({ action, id }: { action: string, id: string }) => {
            let rpcName = '';
            if (action === 'post') rpcName = 'rpc_post_claim';
            if (action === 'unpost') rpcName = 'rpc_unpost_claim';
            if (action === 'delete') rpcName = 'rpc_delete_claim';

            const { error } = await supabase.rpc(rpcName, { p_id: id });
            if (error) throw new Error(error.message);
        },
        onSuccess: (_, variables) => {
            let msg = "تم الترحيل بنجاح 🚀";
            if (variables.action === 'unpost') msg = "تم فك الترحيل بنجاح 🔓";
            if (variables.action === 'delete') msg = "تم حذف المستخلص نهائياً 🗑️";
            showToast(msg, "success");
            queryClient.invalidateQueries({ queryKey: ['contractor_claims_history'] });
            if (variables.action === 'delete') queryClient.invalidateQueries({ queryKey: ['contractor_tasks'] });
        },
        onError: (err: any) => {
            showToast(`فشلت العملية: ${err.message}`, "error");
        }
    });

    const handlePreparePrint = async (claim: any) => {
        setSelectedPrintClaim(claim);
        
        const { data: assignmentsData } = await supabase
            .from('contractor_assignments')
            .select(`
                *,
                projects!contractor_assignments_project_id_fkey (Property),
                boq_budget:boq_budget_id (work_item, unit),
                boq_items!contractor_assignments_boq_item_id_fkey (item_name, unit_of_measure)
            `)
            .eq('claim_id', claim.id);
        
        if (assignmentsData) setPrintAssignments(assignmentsData);

        const { data: expenses } = await supabase.from('expenses').select('*').eq('claim_id', claim.id);
        const validExpenses = (expenses || []).map(e => ({
            type: 'expense',
            date: e.expense_date || e.created_at,
            statement: e.notes || 'مصروف نقدي مقيد',
            amount: e.amount || e.total_price || 0
        }));

        const { data: materials } = await supabase.from('material_issues').select('*, lines:material_issue_lines(*)').eq('claim_id', claim.id);
        const validMaterials = (materials || []).map(m => {
            const lines = m.lines || m.material_issue_lines || [];
            const total = lines.reduce((sum: number, l: any) => sum + (Number(l.total_price) || 0), 0) || 0;
            const desc = lines.map((l:any) => `${l.item_name} (${l.quantity} ${l.unit})`).join(' + ');
            return {
                type: 'material',
                date: m.issue_date,
                statement: `صرف خامات: ${desc}`,
                amount: total
            };
        });

        setPrintDeductions([...validExpenses, ...validMaterials]);
        setIsPrintModalOpen(true);
    };

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentRecord, setPaymentRecord] = useState<any>(null);
    const [partnerBalance, setPartnerBalance] = useState(0);
    const [isBalanceLoading, setIsBalanceLoading] = useState(false);

    const handleOpenPayment = async (claimRow: any) => {
        setIsBalanceLoading(true);
        const remainingAmount = Number(claimRow.net_amount || 0) - Number(claimRow.paid_amount || 0);
        setPartnerBalance(remainingAmount > 0 ? remainingAmount : 0); 
        
        setPaymentRecord({
            date: new Date().toISOString().split('T')[0],
            amount: remainingAmount > 0 ? remainingAmount : 0,
            payee_id: selectedContractor?.id,
            payee_name: selectedContractor?.name,
            debit_account_name: 'مقاول باطن',
            credit_account_name: 'الخزينة الرئيسية',
            site_ref: claimRow.projects?.Property || 'مجمع مشاريع',
            description: `سداد قيمة مستخلص مقاول باطن رقم ${claimRow.claim_number} - ${selectedContractor?.name}`,
            payment_method: 'نقدي',
            linked_claim_id: claimRow.id 
        });
        
        setIsBalanceLoading(false);
        setIsPaymentModalOpen(true);
    };

    // 🚀 التعديل الأهم: مطابقة هيكل جدول payment_vouchers في قاعدة البيانات بدقة
    const paymentMutation = useMutation({
        mutationFn: async (record: any) => {
            
            // تجهيز البيانات بما يتطابق مع الداتا بيز (بدون أسماء أعمدة غير موجودة)
            const voucherPayload = {
                voucher_number: `PV-${Date.now().toString().slice(-6)}`, // حقل إجباري في الداتا بيز
                date: record.date,
                amount: record.amount,
                partner_id: record.payee_id, // ربط المقاول بشكل صحيح
                payment_method: record.payment_method,
                site_ref: record.site_ref,
                description: record.description,
                status: 'مسودة',
                // وضعنا أسماء الحسابات هنا مؤقتاً لأن المودال يرسل نص وقاعدة البيانات تطلب UUID
                notes: `حساب المدين: ${record.debit_account_name} | حساب الدائن: ${record.credit_account_name}`
            };

            const { error: voucherError } = await supabase.from('payment_vouchers').insert([voucherPayload]);

            if (voucherError) throw new Error(voucherError.message);

            // تحديث المبلغ المدفوع في جدول المستخلصات
            if (record.linked_claim_id) {
                const { data: currentClaim, error: fetchError } = await supabase
                    .from('sub_claims')
                    .select('paid_amount, net_amount')
                    .eq('id', record.linked_claim_id)
                    .single();

                if (fetchError) throw new Error(fetchError.message);

                const newPaidTotal = Number(currentClaim?.paid_amount || 0) + Number(record.amount);
                const isFullyPaid = newPaidTotal >= Number(currentClaim?.net_amount || 0);

                const { error: claimError } = await supabase.from('sub_claims')
                    .update({ 
                        paid_amount: newPaidTotal,
                        status: isFullyPaid ? 'مدفوع' : 'مسدد جزئي' 
                    })
                    .eq('id', record.linked_claim_id);

                if (claimError) throw new Error(claimError.message);
            }
        },
        onSuccess: () => {
            showToast("تم إنشاء السند وتحديث المبلغ المدفوع للمستخلص ✅", "success");
            setIsPaymentModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['contractor_claims_history'] });
        },
        onError: (err: any) => {
            showToast(`حدث خطأ أثناء الصرف: ${err.message}`, "error");
        }
    });

    return {
        contractors: filteredContractors, searchTerm, setSearchTerm,       
        isLoading, selectedContractor, setSelectedContractor,
        activeTab, setActiveTab, 
        assignments, isAssignLoading, selectedAssignments, setSelectedAssignments,
        claimsHistory, isHistoryLoading, actionMutation,
        isClaimModalOpen, setIsClaimModalOpen, currentClaim, setCurrentClaim,
        isPrintModalOpen, setIsPrintModalOpen, 
        selectedPrintClaim, setSelectedPrintClaim,
        printAssignments, 
        printDeductions, 
        handlePreparePrint, 
        
        handleOpenClaimModal, 
        fetchPendingDeductions, 

        handleSaveClaim: (data: any) => saveClaimMutation.mutate(data),
        isClaimSaving: saveClaimMutation.isPending, 
        isAssignModalOpen, setIsAssignModalOpen,
        assignRecord, setAssignRecord,
        handleAssignWork: (data: any) => assignWorkMutation.mutate(data),
        isAssigning: assignWorkMutation.isPending,
        handleEditAssignment, 
        deleteAssignment: (id: string) => deleteAssignmentMutation.mutate(id),
        projectBoqItems, fetchProjectBoq,

        isPaymentModalOpen, setIsPaymentModalOpen,
        paymentRecord, setPaymentRecord,
        partnerBalance, isBalanceLoading,
        handleOpenPayment,
        handleSavePayment: (data: any) => paymentMutation.mutate(data),
        isSavingPayment: paymentMutation.isPending
    };
}