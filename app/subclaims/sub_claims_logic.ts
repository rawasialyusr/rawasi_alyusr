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
        payment_period_days: 14,
        deductions: []
    });

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignRecord, setAssignRecord] = useState<any>({ assigned_qty: 1, unit_price: 0 });

    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [selectedPrintClaim, setSelectedPrintClaim] = useState<any | null>(null);
    const [printAssignments, setPrintAssignments] = useState<any[]>([]); 
    const [printDeductions, setPrintDeductions] = useState<any[]>([]);

    // 🚀 1. جلب أوامر التشغيل المتاحة للمشروع (بدلاً من البنود الخام)
    const [projectJobOrders, setProjectJobOrders] = useState<any[]>([]);
    const fetchProjectJobOrders = async (projectId: string) => {
        if (!projectId) { setProjectJobOrders([]); return; }
        const { data } = await supabase.from('job_orders')
            .select('*, boq_budget(unit)')
            .eq('project_id', projectId)
            .is('contractor_id', null); // نجيب اللي لسه متأسندوش
        setProjectJobOrders(data || []);
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

    // 🚀 2. جلب الأعمال من الفيو المجمع اللي بيحسب الخصومات أوتوماتيك
    const { data: assignments = [], isLoading: isAssignLoading } = useQuery({
        queryKey: ['contractor_tasks', selectedContractor?.id],
        enabled: !!selectedContractor,
        queryFn: async () => {
            const { data, error } = await supabase.from('subcontractor_claim_engine_view')
                .select('*, projects:project_id(Property)')
                .eq('contractor_id', selectedContractor.id)
                .is('claim_id', null)
                .eq('assignment_status', 'جاري التنفيذ'); 
            
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

    // 🚀 3. تجهيز بيانات المستخلص من الفيو مباشرة 
    const handleOpenClaimModal = () => {
        if (!selectedAssignments || selectedAssignments.length === 0) {
            showToast("⚠️ يرجى تحديد أمر تشغيل واحد على الأقل.", "error");
            return;
        }

        // هنا بنطابق بالـ assignment_id لأننا بنقرأ من الفيو
        const selectedObjects = (assignments || []).filter((a: any) => selectedAssignments.includes(a.assignment_id));
        const projectIds = Array.from(new Set(selectedObjects.map((a: any) => a.project_id)));
        const jobOrderIds = selectedObjects.map((a: any) => a.job_order_id);
        
        // تجميع القيم الجاهزة من الفيو
        const totalGross = selectedObjects.reduce((sum, a) => sum + Number(a.gross_total_amount || 0), 0);
        const totalMatDed = selectedObjects.reduce((sum, a) => sum + Number(a.materials_deduction || 0), 0);
        const totalExpDed = selectedObjects.reduce((sum, a) => sum + Number(a.expenses_deduction || 0), 0);

        setCurrentClaim({
            date: new Date().toISOString().split('T')[0],
            retention_percent: 5,
            tax_percent: 15,
            payment_period_days: 14,
            project_ids: projectIds, 
            job_order_ids: jobOrderIds, // 👈 مهم لربط الخصومات بالمستخلص لاحقاً
            
            total_amount: totalGross,
            materials_deduction: totalMatDed,
            other_deductions: totalExpDed,
            advance_payment: 0,
            
            assignments_data: selectedObjects 
        });

        setIsClaimModalOpen(true);
    };

    // 🚀 4. حفظ المستخلص وربط الخصومات أوتوماتيك
    const saveClaimMutation = useMutation({
        mutationFn: async (claimData: any) => {
            if (!claimData.project_ids || claimData.project_ids.length === 0) {
                throw new Error("يرجى تحديد العقار / المشروع أولاً.");
            }

            // أ. إنشاء المستخلص
            const { data: claim, error } = await supabase.from('sub_claims').insert([{
                claim_number: `CLM-${Date.now().toString().slice(-6)}`,
                contractor_id: selectedContractor.id,
                project_id: claimData.project_ids[0], 
                date: claimData.date,
                payment_period_days: claimData.payment_period_days || 14,
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

            // ب. تحديث حالة الإسنادات
            const assignmentIds = claimData.assignments_data?.map((a:any) => a.assignment_id) || [];
            if (assignmentIds.length > 0) {
                await supabase.from('contractor_assignments')
                    .update({ status: 'مفوتر', claim_id: claim.id })
                    .in('id', assignmentIds);
            }

            // ج. ربط الخامات المخصومة بهذا المستخلص عشان متتخصمش تاني
            if (claimData.job_order_ids?.length > 0) {
                await supabase.from('material_issue_lines')
                    .update({ claim_id: claim.id })
                    .in('job_order_id', claimData.job_order_ids)
                    .eq('is_deducted_from_contractor', true)
                    .is('claim_id', null);

                // د. ربط النثريات المخصومة
                await supabase.from('expenses')
                    .update({ claim_id: claim.id })
                    .in('job_order_id', claimData.job_order_ids)
                    .eq('is_deducted_from_contractor', true)
                    .is('claim_id', null);
            }

            // هـ. استدعاء دالة الترحيل المحاسبي
            const { error: rpcError } = await supabase.rpc('post_sub_claim', { p_id: claim.id });
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

    // 🚀 5. الإسناد وتحديث أمر التشغيل
    const assignWorkMutation = useMutation({
        mutationFn: async (record: any) => {
            const payload = {
                contractor_id: selectedContractor?.id,
                project_id: record.project_id,
                job_order_id: record.job_order_id, 
                boq_budget_id: record.boq_budget_id, 
                assigned_qty: Number(record.assigned_qty),
                unit_price: Number(record.unit_price),
                status: 'جاري التنفيذ'
            };

            // تحديث أمر التشغيل بالمقاول
            await supabase.from('job_orders')
                .update({ executor_type: 'مقاول باطن', contractor_id: selectedContractor?.id })
                .eq('id', record.job_order_id);

            if (record.id) {
                const { error } = await supabase.from('contractor_assignments').update(payload).eq('id', record.id);
                if (error) throw new Error(error.message);
            } else {
                const { error } = await supabase.from('contractor_assignments').insert([payload]);
                if (error) throw new Error(error.message); 
            }
        },
        onSuccess: () => {
            showToast("تم إسناد أمر التشغيل للمقاول بنجاح 👷✅", "success");
            setIsAssignModalOpen(false);
            setAssignRecord({ assigned_qty: 1, unit_price: 0 });
            queryClient.invalidateQueries({ queryKey: ['contractor_tasks', selectedContractor?.id] });
        }
    });

    // 🚀 6. فك الإسناد وإرجاع أمر التشغيل
    const deleteAssignmentMutation = useMutation({
        mutationFn: async (id: string) => {
            // جلب الـ job_order_id قبل المسح
            const { data: assignment } = await supabase.from('contractor_assignments').select('job_order_id').eq('id', id).single();
            
            // مسح التكليف من عند المقاول
            const { error } = await supabase.from('contractor_assignments').delete().eq('id', id);
            if (error) throw new Error(error.message);

            // إرجاع أمر التشغيل لـ "تنفيذ ذاتي"
            if(assignment?.job_order_id) {
                 await supabase.from('job_orders')
                    .update({ executor_type: 'تنفيذ ذاتي', contractor_id: null })
                    .eq('id', assignment.job_order_id);
            }
        },
        onSuccess: () => {
            showToast("تم إلغاء التكليف وإرجاع أمر التشغيل بنجاح 🗑️", "success");
            queryClient.invalidateQueries({ queryKey: ['contractor_tasks', selectedContractor?.id] });
        }
    });

    const handleEditAssignment = (assignmentRow: any) => {
        setAssignRecord({
            id: assignmentRow.assignment_id,
            project_id: assignmentRow.project_id,
            job_order_id: assignmentRow.job_order_id,
            boq_budget_id: assignmentRow.boq_budget_id,
            assigned_qty: assignmentRow.executed_qty,
            unit_price: assignmentRow.contract_unit_price
        });
        setIsAssignModalOpen(true);
    };

    // --- (باقي الدوال كما هي الخاصة بفك الترحيل والصرف) ---
    const actionMutation = useMutation({
        mutationFn: async ({ action, id, claimNumber }: { action: string, id: string, claimNumber?: string }) => {
            let rpcName = '';
            if (action === 'post') rpcName = 'post_sub_claim';
            if (action === 'unpost') rpcName = 'rpc_unpost_claim';
            if (action === 'delete') rpcName = 'rpc_delete_claim';

            if (action === 'unpost') {
                const { error: updateError } = await supabase.from('sub_claims')
                    .update({ paid_amount: 0, status: 'مسودة', is_posted: false })
                    .eq('id', id);
                if (updateError) throw new Error(updateError.message);

                if (claimNumber) {
                    await supabase.from('payment_vouchers')
                        .delete()
                        .ilike('description', `%${claimNumber}%`);
                }
            }

            const { error } = await supabase.rpc(rpcName, { p_id: id });
            if (error) throw new Error(error.message);
        },
        onSuccess: (_, variables) => {
            let msg = "تم الترحيل بنجاح 🚀";
            if (variables.action === 'unpost') msg = "تم فك الترحيل ومسح سندات الصرف بنجاح 🔓";
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
            .select(`*, projects!contractor_assignments_project_id_fkey (Property), boq_budget:boq_budget_id (work_item, unit)`)
            .eq('claim_id', claim.id);
        
        if (assignmentsData) setPrintAssignments(assignmentsData);

        const { data: expenses } = await supabase.from('expenses').select('*').eq('claim_id', claim.id);
        const validExpenses = (expenses || []).map(e => ({
            type: 'expense', date: e.expense_date || e.created_at, statement: e.notes || 'مصروف محمل', amount: e.amount || e.total_price || 0
        }));

        const { data: materials } = await supabase.from('material_issue_lines').select('*, material_issues(issue_date)').eq('claim_id', claim.id);
        const validMaterials = (materials || []).map(m => ({
            type: 'material', date: m.material_issues?.issue_date, statement: `خامة: ${m.item_name} (${m.quantity} ${m.unit})`, amount: m.total_price || 0
        }));

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
            debit_account_id: '27f37adf-c0ec-4b40-80d0-2b36b853fd4b', 
            debit_account_name: 'التزام مقاولي الباطن',
            credit_account_id: '21b8a1db-bc9f-4cf8-b741-1efeded0963c', 
            credit_account_name: 'الخزينة الرئيسية',
            site_ref: claimRow.projects?.Property || 'مجمع مشاريع',
            description: `سداد قيمة مستخلص مقاول باطن رقم ${claimRow.claim_number} - ${selectedContractor?.name}`,
            payment_method: 'نقدي',
            linked_claim_id: claimRow.id 
        });
        
        setIsBalanceLoading(false);
        setIsPaymentModalOpen(true);
    };

    const paymentMutation = useMutation({
        mutationFn: async (record: any) => {
            const voucherPayload = {
                voucher_number: `PV-${Date.now().toString().slice(-6)}`, 
                date: record.date,
                amount: record.amount,
                partner_id: record.payee_id, 
                payment_method: record.payment_method,
                site_ref: record.site_ref,
                description: record.description,
                status: 'مسودة',
                debit_account_id: record.debit_account_id,
                credit_account_id: record.credit_account_id,
                notes: `حساب المدين: ${record.debit_account_name} | حساب الدائن: ${record.credit_account_name}`
            };

            const { error: voucherError } = await supabase.from('payment_vouchers').insert([voucherPayload]);
            if (voucherError) throw new Error(voucherError.message);

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

        handleSaveClaim: (data: any) => saveClaimMutation.mutate(data),
        isClaimSaving: saveClaimMutation.isPending, 
        isAssignModalOpen, setIsAssignModalOpen,
        assignRecord, setAssignRecord,
        handleAssignWork: (data: any) => assignWorkMutation.mutate(data),
        isAssigning: assignWorkMutation.isPending,
        handleEditAssignment, 
        deleteAssignment: (id: string) => deleteAssignmentMutation.mutate(id),
        
        projectJobOrders, fetchProjectJobOrders, // 👈 دي اللي اتغيرت عشان نقرأ أوامر التشغيل

        isPaymentModalOpen, setIsPaymentModalOpen,
        paymentRecord, setPaymentRecord,
        partnerBalance, isBalanceLoading,
        handleOpenPayment,
        handleSavePayment: (data: any) => paymentMutation.mutate(data),
        isSavingPayment: paymentMutation.isPending
    };
}