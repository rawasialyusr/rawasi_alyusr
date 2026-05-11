"use client";
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSmartFilter } from '@/lib/useSmartFilter'; 
import { useUniversalPosting } from '@/lib/accounting_engine'; 

export function useExpensesLogic() {
    const queryClient = useQueryClient();

    // 🎯 دالة سحرية مساعدة: لتحديث سطر في الكاش بدقة شديدة
    const updateRowsInCache = (targetIds: any[], updatedFields: any) => {
        queryClient.setQueryData(['expenses'], (oldData: any[]) => {
            if (!oldData) return [];
            const stringIds = targetIds.map(String);
            return oldData.map(row => 
                stringIds.includes(String(row.id)) 
                    ? { ...row, ...updatedFields } 
                    : row 
            );
        });
    };

    // 1. إدارة الحالة الأساسية
    const [userRole, setUserRole] = useState<string>('viewer');
    const [userPermissions, setUserPermissions] = useState<any>({});
    
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    
    const [paymentFilter, setPaymentFilter] = useState<string>('الكل');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isBulkFixModalOpen, setIsBulkFixModalOpen] = useState(false);
    const [bulkFixAccounts, setBulkFixAccounts] = useState({ creditor_account: '', payment_account: '' });

    const [disburseProgress, setDisburseProgress] = useState({ current: 0, total: 0, isActive: false });

    const defaultExp = { 
        exp_date: new Date().toISOString().split('T')[0], main_category: '', sub_contractor: '', site_ref: '',       
        creditor_account: '', description: '', payee_name: '', payment_method: 'كاش', payment_account: '', 
        employee_name: '', quantity: 1, unit_price: 0, vat_amount: 0, discount_amount: 0, discount_account: '', 
        notes: '', invoice_image: null, is_auto_distributed: false 
    };
    const [currentExpense, setCurrentExpense] = useState<any>(defaultExp);

    // 📥 2. جلب البيانات الأساسية
    const expensesQuery = useQuery({
        queryKey: ['expenses'],
        queryFn: async () => {
            let allData: any[] = [];
            let from = 0; const step = 1000; let hasMore = true;
            while (hasMore) {
                const { data, error } = await supabase.from('expenses').select('*').order('exp_date', { ascending: false }).range(from, from + step - 1);
                if (error) throw error;
                if (data && data.length > 0) { 
                    allData = [...allData, ...data]; 
                    from += step; 
                    if (data.length < step) hasMore = false; 
                } else hasMore = false;
            }

            return allData.map(exp => {
                let parsedLines = [];
                if (typeof exp.lines_data === 'string') {
                    try { parsedLines = JSON.parse(exp.lines_data); } catch (e) {}
                } else if (Array.isArray(exp.lines_data)) {
                    parsedLines = exp.lines_data;
                }
                return { ...exp, lines_data: parsedLines };
            });
        },
        staleTime: 1000 * 60 * 5,
        retry: 1
    });
    const expenses = expensesQuery.data || [];

    // 📥 جلب البيانات المساعدة
    const supportDataQuery = useQuery({
        queryKey: ['expenses_support_data'],
        queryFn: async () => {
            const [proj, part, acc, boq] = await Promise.all([
                supabase.from('projects').select('*'),
                supabase.from('partners').select('name, partner_type'),
                supabase.from('accounts').select('id, code, name'), 
                supabase.from('boq_items').select('item_code, item_name').limit(3000)
            ]);
            const partnersData = part.data || [];
            return {
                projects: proj.data || [],
                contractors: partnersData.filter(p => p.partner_type === 'مقاول'),
                payees: partnersData,
                accounts_raw: acc.data || [], 
                accounts: (acc.data || []).map(a => ({ id: `${a.code} - ${a.name}`, name: `${a.code} - ${a.name}` })),
                boqItems: Array.from(new Set((boq.data || []).map((b: any) => `${b.item_code} - ${b.item_name}`)))
            };
        },
        staleTime: 1000 * 60 * 5,
        retry: 1
    });
    const supportData = supportDataQuery.data;

    useEffect(() => {
        const fetchPerms = async () => {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user) {
                const { data: profile } = await supabase.from('profiles').select('role, permissions').eq('id', authData.user.id).single();
                if (profile) { setUserRole(profile.role); setUserPermissions(profile.permissions || {}); }
            }
        };
        fetchPerms();
    }, []);

    // 🚀 3. الفلترة الذكية
    const { filteredData: allFiltered, setFilter, customFilters, globalSearch, setGlobalSearch } = useSmartFilter(
        expenses, 
        ['payee_name', 'sub_contractor', 'description', 'notes', 'site_ref', 'creditor_account', 'main_category'], 
        'exp_date' 
    );

    const finalFilteredExpenses = useMemo(() => {
        if (paymentFilter === 'الكل') return allFiltered;
        
        return allFiltered.filter((exp: any) => {
            let baseAmount = 0;
            if (exp.lines_data && Array.isArray(exp.lines_data) && exp.lines_data.length > 0) {
                baseAmount = exp.lines_data.reduce((sum: number, line: any) => sum + (Number(line.total_price) || (Number(line.quantity || 1) * Number(line.unit_price || 0))), 0);
            } else {
                baseAmount = Number(exp.total_price) || (Number(exp.quantity || 1) * Number(exp.unit_price || 0));
            }
            const total = baseAmount + Number(exp.vat_amount || 0) - Number(exp.discount_amount || 0);
            const paid = Number(exp.paid_amount || 0);
            
            if (paymentFilter === 'غير مسدد') return paid <= 0;
            if (paymentFilter === 'مسدد جزئي') return paid > 0 && paid < total;
            if (paymentFilter === 'مسدد') return paid >= total && total > 0;
            return true;
        });
    }, [allFiltered, paymentFilter]);

    const totalAmount = useMemo(() => finalFilteredExpenses.reduce((sum, exp) => sum + ((Number(exp.quantity) * Number(exp.unit_price)) + Number(exp.vat_amount || 0) - Number(exp.discount_amount || 0)), 0), [finalFilteredExpenses]);
    const totalPages = Math.ceil(finalFilteredExpenses.length / rowsPerPage) || 1;
    
    const historicalData = useMemo(() => {
        const sites = new Set<string>(), contractors = new Set<string>(), payees = new Set<string>(), descriptions = new Set<string>(), notes = new Set<string>();
        expenses.forEach(exp => {
            if (exp.site_ref) sites.add(exp.site_ref);
            if (exp.sub_contractor) contractors.add(exp.sub_contractor);
            if (exp.payee_name) payees.add(exp.payee_name);
            if (exp.description) descriptions.add(exp.description);
            if (exp.notes) notes.add(exp.notes);
        });
        return { sites: Array.from(sites), contractors: Array.from(contractors), payees: Array.from(payees), descriptions: Array.from(descriptions), notes: Array.from(notes) };
    }, [expenses]);

    const { isProcessing } = useUniversalPosting('expenses', 'expenses', 'post_expenses_bulk');

    // 💾 5. الحفظ
    const saveMutation = useMutation({
        mutationFn: async (passedRecord: any) => {
            if (!passedRecord || !passedRecord.exp_date) throw new Error("حدث خطأ في استلام البيانات من النافذة، يرجى المحاولة مرة أخرى.");
            let generatedDescription = passedRecord.description;
            if ((!generatedDescription || generatedDescription.trim() === '') && passedRecord.lines_data && Array.isArray(passedRecord.lines_data) && passedRecord.lines_data.length > 0) {
                generatedDescription = passedRecord.lines_data.map((line: any) => line.description || line.item_name || line.work_item).filter(Boolean).join(' + ');
            }
            const finalDescription = generatedDescription && generatedDescription.trim() !== '' ? generatedDescription : 'مصروف عام';
            const payload = {
                exp_date: passedRecord.exp_date, main_category: passedRecord.main_category, sub_contractor: passedRecord.sub_contractor, site_ref: passedRecord.site_ref, creditor_account: passedRecord.creditor_account, description: finalDescription, payee_name: passedRecord.payee_name, payment_method: passedRecord.payment_method || passedRecord.method || 'كاش', payment_account: passedRecord.payment_account, employee_name: passedRecord.employee_name, quantity: 1, unit_price: Number(passedRecord.unit_price) || 0, vat_amount: Number(passedRecord.vat_amount) || 0, discount_amount: Number(passedRecord.discount_amount) || 0, discount_account: passedRecord.discount_account || null, notes: passedRecord.notes, invoice_image: passedRecord.invoice_image, lines_data: passedRecord.lines_data || [], is_auto_distributed: passedRecord.is_auto_distributed || false 
            };

            if (editingId) {
                const { data, error } = await supabase.from('expenses').update(payload).eq('id', editingId).select().single();
                if (error) throw error;
                return { type: 'update', data };
            } else {
                const { data, error } = await supabase.from('expenses').insert([payload]).select().single();
                if (error) throw error;
                return { type: 'insert', data };
            }
        },
        onSuccess: (res) => {
            toast.success('تم حفظ المصروف بنجاح 💾');
            setIsEditModalOpen(false);
            setEditingId(null);
            setCurrentExpense(defaultExp);
            
            if (res && res.data) {
                queryClient.setQueryData(['expenses'], (oldData: any[]) => {
                    if (!oldData) return [res.data];
                    let parsedData = { ...res.data };
                    if (typeof parsedData.lines_data === 'string') {
                        try { parsedData.lines_data = JSON.parse(parsedData.lines_data); } catch(e){}
                    }
                    if (res.type === 'update') {
                        return oldData.map(exp => String(exp.id) === String(parsedData.id) ? { ...exp, ...parsedData } : exp);
                    } else {
                        return [parsedData, ...oldData];
                    }
                });
            }
        },
        onError: (err: any) => toast.error(err.message)
    });

    // 🗑️ الحذف المتسلسل (الاعتماد على الداتا بيز للسرعة)
    const deleteMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('delete_expenses_bulk', { record_ids: selectedIds });
            if (error) throw error;
            return selectedIds; 
        },
        onSuccess: (deletedIds) => {
            toast.success('تم المسح التسلسلي بنجاح 🗑️✅');
            const stringDeletedIds = deletedIds.map(String);
            queryClient.setQueryData(['expenses'], (oldData: any[]) => {
                if (!oldData) return [];
                return oldData.filter(exp => !stringDeletedIds.includes(String(exp.id)));
            });
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
        },
        onError: (err: any) => toast.error(`حدث خطأ أثناء الحذف: ${err.message}`)
    });

    // 💸 السداد المباشر للسطر الواحد
    const handleSavePayment = async (paymentData: any) => {
        const toastId = toast.loading('جاري الفحص والصرف...');
        try {
            const targetId = paymentData.id || paymentData.related_expense_id || paymentData.expense_id;
            if (!targetId) throw new Error("لا يوجد ID للفاتورة مبعوث من المودال!");

            const currentCache = queryClient.getQueryData(['expenses']) as any[];
            const targetExpense = currentCache?.find(exp => String(exp.id) === String(targetId));

            const oldPaidAmount = Number(targetExpense?.paid_amount || 0);
            const addedAmount = Number(paymentData.amount || 0);
            const newPaidAmount = oldPaidAmount + addedAmount;

            await queryClient.cancelQueries({ queryKey: ['expenses'] });

            queryClient.setQueryData(['expenses'], (oldData: any[]) => {
                if (!oldData) return [];
                return oldData.map(exp => 
                    String(exp.id) === String(targetId) ? { ...exp, paid_amount: newPaidAmount } : exp
                );
            });

            const { data: { session } } = await supabase.auth.getSession();
            
            let resolvedDebitId = null, resolvedCreditId = null;
            if (supportData?.accounts_raw) {
                const foundDebit = supportData.accounts_raw.find((a: any) => `${a.code} - ${a.name}` === paymentData.payment_account || a.name === paymentData.payment_account);
                if (foundDebit) resolvedDebitId = foundDebit.id;
                
                const targetCreditName = paymentData.creditor_account || paymentData.payment_account; 
                const foundCredit = supportData.accounts_raw.find((a: any) => `${a.code} - ${a.name}` === targetCreditName || a.name === targetCreditName);
                if (foundCredit) resolvedCreditId = foundCredit.id;
            }

            const voucherPayload = {
                related_expense_id: targetId, 
                voucher_number: `PV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`, 
                date: paymentData.payment_date || new Date().toISOString().split('T')[0], 
                amount: addedAmount, 
                payment_method: paymentData.payment_method || 'كاش', 
                debit_account_id: resolvedDebitId, 
                credit_account_id: resolvedCreditId, 
                site_ref: paymentData.site_ref || targetExpense?.site_ref, 
                description: paymentData.payment_notes || `سداد مصروف لـ ${targetExpense?.description || 'أعمال مقاولات'}`, 
                reference_no: paymentData.reference_number || paymentData.reference_no || '', 
                is_posted: false, 
                created_by: session?.user?.id
            };
            
            const { error: voucherErr } = await supabase.from('payment_vouchers').insert([voucherPayload]);
            if (voucherErr) throw voucherErr;

            const { error: expErr } = await supabase.from('expenses').update({ paid_amount: newPaidAmount }).eq('id', targetId);
            if (expErr) throw expErr;

            toast.success('تم الصرف بنجاح ✅', { id: toastId });
        } catch (error: any) {
            toast.error(`خطأ: ${error.message}`, { id: toastId });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        }
    };

    // 🔧 التصحيح المجمع
    const handleBulkFixSave = async () => {
        if (selectedIds.length === 0 || (!bulkFixAccounts.creditor_account && !bulkFixAccounts.payment_account)) return;
        const updatePayload: any = {};
        if (bulkFixAccounts.creditor_account) updatePayload.creditor_account = bulkFixAccounts.creditor_account;
        if (bulkFixAccounts.payment_account) updatePayload.payment_account = bulkFixAccounts.payment_account;

        const toastId = toast.loading(`⏳ جاري التصحيح...`);
        
        await queryClient.cancelQueries({ queryKey: ['expenses'] });
        const previousData = queryClient.getQueryData(['expenses']);
        
        updateRowsInCache(selectedIds, updatePayload);

        try {
            const CHUNK_SIZE = 20; 
            for (let i = 0; i < selectedIds.length; i += CHUNK_SIZE) {
                const chunk = selectedIds.slice(i, i + CHUNK_SIZE);
                const { error } = await supabase.from('expenses').update(updatePayload).in('id', chunk).eq('is_posted', false); 
                if (error) throw new Error(error.message);
            }
            setIsBulkFixModalOpen(false); 
            setBulkFixAccounts({ creditor_account: '', payment_account: '' });
            setSelectedIds([]); 
            toast.success(`✅ تم التصحيح بنجاح!`, { id: toastId });
        } catch (error: any) {
            queryClient.setQueryData(['expenses'], previousData); 
            toast.error("خطأ أثناء التحديث: " + error.message, { id: toastId });
        }
    };
    
    // =========================================================================
    // 🚀 الصرف الجماعي (عداد ذكي وتحديث سلس)
    // =========================================================================
    const bulkDisburseMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) throw new Error("يجب تسجيل الدخول أولاً");

            const CHUNK_SIZE = 20; // 🚀 حجم الدفعة للعداد
            let totalProcessedCount = 0;
            let totalDisbursedSum = 0;

            // 1. بدء تشغيل شريط التحميل
            setDisburseProgress({ current: 0, total: ids.length, isActive: true });

            // 2. تقسيم العمل لـ Chunks عشان العداد يشتغل قدام المستخدم
            for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
                const chunk = ids.slice(i, i + CHUNK_SIZE);
                
                // 🚀 استدعاء المحرك المجمع في السيرفر (طلقة واحدة لكل 20 سجل)
                const { data, error } = await supabase.rpc('bulk_disburse_v2', { 
                    p_ids: chunk, 
                    p_user_id: session.user.id 
                });

                if (error) {
                    // 🚀 كود استخراج الخطأ الحقيقي بدلاً من {}
                    const errorDetails = error.message || error.details || error.hint || JSON.stringify(error);
                    console.error("🔥 الخلل في قاعدة البيانات:", errorDetails, "كامل الخطأ:", error);
                    
                    // إيقاف العملية وإظهار الخطأ للمستخدم
                    if (i === 0) throw new Error(`فشل الاتصال: ${errorDetails}`);
                    continue;
                }

                // 3. تحديث الإحصائيات من رد السيرفر
                if (data && data[0]) {
                    totalProcessedCount += data[0].processed_count;
                    totalDisbursedSum += Number(data[0].total_amount);
                }

                // 4. تحديث العداد اللحظي في الواجهة
                const currentProgress = Math.min(i + CHUNK_SIZE, ids.length);
                setDisburseProgress(prev => ({ ...prev, current: currentProgress }));
            }

            return { processed_count: totalProcessedCount, total_amount: totalDisbursedSum };
        },
        onSuccess: (res) => {
            // إخفاء أي توست قديم وإظهار نتيجة النجاح النهائية
            toast.dismiss('bulk-disburse');
            if (res.processed_count > 0) {
                toast.success(
                    `تم إنشاء ${res.processed_count} سند صرف بإجمالي ${Number(res.total_amount).toLocaleString()} ريال 💰✅`, 
                    { duration: 6000 }
                );
            } else {
                toast.error("لم يتم إنشاء أي سندات، قد تكون السجلات مسددة بالفعل!");
            }
            
            setSelectedIds([]); 
            // تحديث الكاش لضمان ظهور البيانات الجديدة فوراً
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
        },
        onError: (err: any) => {
            toast.dismiss('bulk-disburse');
            toast.error(`فشلت العملية: ${err.message}`);
        },
        onSettled: () => {
            // إغلاق شريط التحميل بعد الانتهاء بثانيتين
            setTimeout(() => setDisburseProgress({ current: 0, total: 0, isActive: false }), 2000);
        }
    });

    const canAdd = userRole === 'admin' || userPermissions?.expenses?.add;
    const canEdit = userRole === 'admin' || userPermissions?.expenses?.edit;
    const canDelete = userRole === 'admin' || userPermissions?.expenses?.delete;
    const canPost = userRole === 'admin' || userPermissions?.expenses?.post;
    const canView = userRole === 'admin' || userPermissions?.expenses?.view;
    const canExport = userRole === 'admin' || userPermissions?.expenses?.print;

    return {
        isLoading: expensesQuery.isLoading || supportDataQuery.isLoading || isProcessing || saveMutation.isPending || deleteMutation.isPending,
        refreshData: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        
        filteredExpenses: finalFilteredExpenses, totalAmount, totalPages, totalResults: finalFilteredExpenses.length,
        paymentFilter, setPaymentFilter,
        disburseProgress,
        
        selectedIds, setSelectedIds, currentPage, setCurrentPage, rowsPerPage, setRowsPerPage, isEditModalOpen, setIsEditModalOpen, currentExpense, setCurrentExpense, editingId, projects: supportData?.projects || [], contractors: supportData?.contractors || [], payees: supportData?.payees || [], accounts: supportData?.accounts || [], boqItems: supportData?.boqItems || [], accounts_raw: supportData?.accounts_raw || [], isBulkFixModalOpen, setIsBulkFixModalOpen, bulkFixAccounts, setBulkFixAccounts, handleBulkFixSave, canAdd, canEdit, canDelete, canPost, canView, canExport, userRole,
        
        setFilterStatus: (val: string) => setFilter('is_posted', val === 'الكل' ? null : val === 'مرحل'),
        setFilterAccount: (val: string) => setFilter('creditor_account', val === 'الكل' ? null : val),
        filterAccount: customFilters['creditor_account'] || 'الكل',
        filterStatus: customFilters['is_posted'] === undefined ? 'الكل' : (customFilters['is_posted'] ? 'مرحل' : 'معلق'),
        
        handleSaveExpense: (data: any) => {
            if (!data) return toast.error("لم يتم استلام البيانات!");
            saveMutation.mutate(data);
        },
        handleSavePayment, 
        handleAddNew: () => { setCurrentExpense(defaultExp); setEditingId(null); setIsEditModalOpen(true); }, 
        handleEditSelected: () => {
            if (selectedIds.length !== 1) return alert("اختر سجلاً واحداً للتعديل");
            const exp = expenses.find(e => e.id === selectedIds[0]);
            setCurrentExpense({...exp}); setEditingId(exp.id); setIsEditModalOpen(true);
        }, 
        exportToExcel: () => {},
        handleDeleteSelected: () => deleteMutation.mutate(),
        
        handlePostSelected: async () => {
            if (selectedIds.length === 0) return;
            const toastId = toast.loading('جاري الترحيل...');
            const idsToProcess = [...selectedIds];

            await queryClient.cancelQueries({ queryKey: ['expenses'] });
            const previousData = queryClient.getQueryData(['expenses']);

            updateRowsInCache(idsToProcess, { is_posted: true });
            setSelectedIds([]);

            try {
                const { error } = await supabase.rpc('post_expenses_bulk', { p_ids: idsToProcess });
                if (error) throw error;
                toast.success('تم الترحيل بنجاح ✅', { id: toastId });
            } catch (error: any) {
                queryClient.setQueryData(['expenses'], previousData);
                toast.error(`خطأ: ${error.message}`, { id: toastId });
            }
        },
        
        // 🚀 6. فك الترحيل المبسط جداً والاعتماد كلياً على الداتا بيز
        handleUnpostSelected: async () => {
            if (selectedIds.length === 0) return;
            const toastId = toast.loading('جاري فك الترحيل ومسح السندات...');
            const idsToProcess = [...selectedIds];

            await queryClient.cancelQueries({ queryKey: ['expenses'] });
            const previousData = queryClient.getQueryData(['expenses']);

            // تحديث الشاشة بسرعة
            updateRowsInCache(idsToProcess, { is_posted: false, paid_amount: 0 });
            setSelectedIds([]);

            try {
                // إرسال الطلب للسيرفر لتنفيذ SQL Transaction
                const { error } = await supabase.rpc('unpost_expenses_bulk', { record_ids: idsToProcess });
                if (error) throw error;
                
                toast.success('تم فك الترحيل وحذف السندات المرتبطة بنجاح ↩️', { id: toastId });
                queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
            } catch (error: any) {
                queryClient.setQueryData(['expenses'], previousData);
                toast.error(`خطأ: ${error.message}`, { id: toastId });
            }
        },
        
        handlePostAllUnposted: async () => {
            const unposted = allFiltered.filter((e:any) => !e.is_posted).map((e:any) => e.id);
            if (unposted.length === 0) return toast.success("لا يوجد مصروفات معلقة!");
            const toastId = toast.loading('جاري الترحيل...');
            const idsToProcess = [...unposted];
            
            await queryClient.cancelQueries({ queryKey: ['expenses'] });
            const previousData = queryClient.getQueryData(['expenses']);
            
            updateRowsInCache(idsToProcess, { is_posted: true });
            
            try {
                const { error } = await supabase.rpc('post_expenses_bulk', { p_ids: idsToProcess });
                if (error) throw error;
                toast.success('تم الترحيل بالكامل ✅', { id: toastId });
                setSelectedIds([]);
            } catch (error: any) {
                queryClient.setQueryData(['expenses'], previousData);
                toast.error(`خطأ الترحيل: ${error.message}`, { id: toastId });
            }
        },

        handleBulkDisburse: () => {
            if (selectedIds.length === 0) return;
            if (confirm(`هل أنت متأكد من إنشاء سندات صرف لـ ${selectedIds.length} سجل؟`)) {
                toast.loading(`⏳ جاري إنشاء السندات لـ ${selectedIds.length} مصروف...`, { id: 'bulk-disburse' });
                bulkDisburseMutation.mutate(selectedIds);
            }
        },
        isDisbursing: bulkDisburseMutation.isPending
    };
}   