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
    
    // 1. إدارة الحالة الأساسية
    const [userRole, setUserRole] = useState<string>('viewer');
    const [userPermissions, setUserPermissions] = useState<any>({});
    
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    
    // حالات النوافذ المنبثقة
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isBulkFixModalOpen, setIsBulkFixModalOpen] = useState(false);
    const [bulkFixAccounts, setBulkFixAccounts] = useState({ creditor_account: '', payment_account: '' });
    
    const [distributionPreview, setDistributionPreview] = useState<any[] | null>(null);
    const [isDistributionEnabled, setIsDistributionEnabled] = useState(false);

    const defaultExp = { 
        exp_date: new Date().toISOString().split('T')[0], sub_contractor: '', site_ref: '',       
        creditor_account: '', description: '', payee_name: '', payment_method: 'كاش', payment_account: '', 
        employee_name: '', quantity: 1, unit_price: 0, vat_amount: 0, discount_amount: 0, discount_account: '', 
        notes: '', invoice_image: null  
    };
    const [currentExpense, setCurrentExpense] = useState<any>(defaultExp);

    // 📥 2. جلب البيانات الأساسية (البلدوزر)
    const { data: expenses = [], isLoading: isFetching } = useQuery({
        queryKey: ['expenses'],
        queryFn: async () => {
            let allData: any[] = [];
            let from = 0; const step = 1000; let hasMore = true;
            while (hasMore) {
                const { data, error } = await supabase.from('expenses').select('*').order('exp_date', { ascending: false }).range(from, from + step - 1);
                if (error) throw error;
                if (data && data.length > 0) { allData = [...allData, ...data]; from += step; if (data.length < step) hasMore = false; } else hasMore = false;
            }
            return allData;
        }
    });

    // 📥 جلب البيانات المساعدة (Dropdowns)
    const { data: supportData } = useQuery({
        queryKey: ['expenses_support_data'],
        queryFn: async () => {
            const [proj, part, acc, boq] = await Promise.all([
                supabase.from('projects').select('*'),
                supabase.from('partners').select('name, partner_type'),
                supabase.from('accounts').select('code, name'),
                supabase.from('boq_items').select('item_code, item_name').limit(3000)
            ]);
            
            const partnersData = part.data || [];
            return {
                projects: proj.data || [],
                contractors: partnersData.filter(p => p.partner_type === 'مقاول'),
                payees: partnersData,
                accounts: (acc.data || []).map(a => ({ id: `${a.code} - ${a.name}`, name: `${a.code} - ${a.name}` })),
                boqItems: Array.from(new Set((boq.data || []).map((b: any) => `${b.item_code} - ${b.item_name}`)))
            };
        },
        staleTime: 1000 * 60 * 5 // كاش لمدة 5 دقائق
    });

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

    // 🚀 3. الفلترة الذكية المركزية (المحرك الجديد)
    const { filteredData: allFiltered, setFilter, customFilters, globalSearch, setGlobalSearch } = useSmartFilter(
        expenses, 
        ['payee_name', 'sub_contractor', 'description', 'notes', 'site_ref', 'creditor_account'], 
        'exp_date' 
    );

    const totalAmount = useMemo(() => allFiltered.reduce((sum, exp) => sum + ((Number(exp.quantity) * Number(exp.unit_price)) + Number(exp.vat_amount || 0) - Number(exp.discount_amount || 0)), 0), [allFiltered]);
    const totalPages = Math.ceil(allFiltered.length / rowsPerPage) || 1;
    // 🕰️ القوائم التاريخية الذكية (تم إعادتها)
    const historicalData = useMemo(() => {
        const sites = new Set<string>();
        const contractors = new Set<string>();
        const payees = new Set<string>();
        const descriptions = new Set<string>();
        const notes = new Set<string>();

        expenses.forEach(exp => {
            if (exp.site_ref) sites.add(exp.site_ref);
            if (exp.sub_contractor) contractors.add(exp.sub_contractor);
            if (exp.payee_name) payees.add(exp.payee_name);
            if (exp.description) descriptions.add(exp.description);
            if (exp.notes) notes.add(exp.notes);
        });

        return {
            sites: Array.from(sites),
            contractors: Array.from(contractors),
            payees: Array.from(payees),
            descriptions: Array.from(descriptions),
            notes: Array.from(notes)
        };
    }, [expenses]);

    // 🚀 4. الترحيل المركزي (الباب العاشر)
    const { postRecords, unpostRecords, isProcessing } = useUniversalPosting(
        'expenses',              // Query Key
        'expenses',              // Table name for Unpost
        'post_expenses_bulk'     // The SQL RPC function
    );

    // 💾 5. الحفظ باستخدام Mutations
    const saveMutation = useMutation({
        mutationFn: async (passedRecord?: any) => {
            const finalRecord = passedRecord || currentExpense;
            const payload = {
                exp_date: finalRecord.exp_date, sub_contractor: finalRecord.sub_contractor, site_ref: finalRecord.site_ref,             
                creditor_account: finalRecord.creditor_account, description: finalRecord.description, payee_name: finalRecord.payee_name, 
                payment_method: finalRecord.payment_method || finalRecord.method || 'كاش', payment_account: finalRecord.payment_account,
                employee_name: finalRecord.employee_name,
                quantity: Number(finalRecord.quantity) > 0 ? Number(finalRecord.quantity) : 1,
                unit_price: Number(finalRecord.unit_price) || 0,
                vat_amount: Number(finalRecord.vat_amount || 0),
                discount_amount: Number(finalRecord.discount_amount || 0),
                discount_account: finalRecord.discount_account || null,
                notes: finalRecord.notes, invoice_image: finalRecord.invoice_image,
                lines_data: finalRecord.lines_data || []
            };

            if (editingId) {
                const { error } = await supabase.from('expenses').update(payload).eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('expenses').insert([payload]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success('تم حفظ المصروف بنجاح 💾');
            setIsEditModalOpen(false);
            setEditingId(null);
            setCurrentExpense(defaultExp);
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
        onError: (err: any) => toast.error(err.message)
    });

    // 🗑️ الحذف المتسلسل
    const deleteMutation = useMutation({
        mutationFn: async () => {
            const { data: linkedVouchers } = await supabase.from('payment_vouchers').select('id').in('expense_id', selectedIds);
            const voucherIds = linkedVouchers?.map(v => v.id) || [];

            if (voucherIds.length > 0) {
                await supabase.from('journal_headers').delete().in('reference_id', voucherIds);
                await supabase.from('payment_vouchers').delete().in('id', voucherIds);
            }
            await supabase.from('journal_headers').delete().in('reference_id', selectedIds);
            const { error } = await supabase.from('expenses').delete().in('id', selectedIds);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('تم المسح التسلسلي وتنظيف الدفاتر بنجاح 🗑️✅');
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
        onError: (err: any) => toast.error(`حدث خطأ أثناء الحذف: ${err.message}`)
    });

    // 💸 السداد المباشر
    const handleSavePayment = async (paymentData: any) => {
        const toastId = toast.loading('جاري إصدار سند الصرف وتحديث المصروف...');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const voucherPayload = {
                expense_id: paymentData.id, 
                voucher_number: `PV-${Date.now().toString().slice(-6)}`,
                date: paymentData.payment_date || new Date().toISOString().split('T')[0],
                payee_name: paymentData.payee_name || paymentData.sub_contractor,
                amount: paymentData.amount,
                payment_method: paymentData.payment_method,
                payment_account: paymentData.payment_account,
                site_ref: paymentData.site_ref,
                description: paymentData.payment_notes || `سداد مصروف لـ ${paymentData.description || 'أعمال مقاولات'}`,
                reference_number: paymentData.reference_number || '',
                is_posted: false, 
                created_by: session?.user?.id
            };

            const { error: voucherErr } = await supabase.from('payment_vouchers').insert([voucherPayload]);
            if (voucherErr) throw voucherErr;

            const newPaidAmount = Number(paymentData.paid_amount || 0) + Number(paymentData.amount);
            const { error: expErr } = await supabase.from('expenses').update({ paid_amount: newPaidAmount }).eq('id', paymentData.id);
            if (expErr) throw expErr;

            toast.success('تم إصدار سند الصرف وتحديث المصروف بنجاح ✅', { id: toastId });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        } catch (error: any) {
            toast.error(`حدث خطأ أثناء السداد: ${error.message}`, { id: toastId });
        }
    };

    // 🧠 توزيع التكلفة الذكي
    const calculateDistribution = async () => {
        if (!currentExpense.exp_date || !currentExpense.unit_price || !currentExpense.creditor_account) {
            return alert("يرجى إدخال التاريخ، الحساب المدين، وقيمة المصروف أولاً.");
        }
        const { data, error } = await supabase.from('daily_attendance').select('site_ref, workers_count').eq('date', currentExpense.exp_date);
        if (error || !data || data.length === 0) return alert(`لا يوجد تقرير عمال مسجل ليوم ${currentExpense.exp_date} لتوزيع التكلفة عليه.`);

        const totalWorkers = data.reduce((sum, row) => sum + (Number(row.workers_count) || 0), 0);
        if (totalWorkers === 0) return alert("إجمالي عدد العمال في هذا اليوم يساوي صفر!");

        const subtotal = Number(currentExpense.quantity) * Number(currentExpense.unit_price);
        const vat = Number(currentExpense.vat_amount || 0);
        const discount = Number(currentExpense.discount_amount || 0);

        const preview = data.map((row: any) => {
            const ratio = Number(row.workers_count) / totalWorkers;
            return {
                ...currentExpense, site_ref: row.site_ref, quantity: 1, 
                unit_price: Number((subtotal * ratio).toFixed(2)),
                vat_amount: Number((vat * ratio).toFixed(2)),
                discount_amount: Number((discount * ratio).toFixed(2)),
                workers_count: row.workers_count, ratio_percent: (ratio * 100).toFixed(1),
                notes: (currentExpense.notes ? currentExpense.notes + ' | ' : '') + `(توزيع تلقائي: ${row.workers_count} من ${totalWorkers})`
            };
        });
        setDistributionPreview(preview);
    };

    const confirmDistribution = async () => {
        if (!distributionPreview || distributionPreview.length === 0) return;
        const payload = distributionPreview.map(item => {
            const { workers_count, ratio_percent, id, ...cleanItem } = item;
            return cleanItem;
        });
        const { error } = await supabase.from('expenses').insert(payload);
        if (error) alert("خطأ أثناء التوزيع والحفظ: " + error.message);
        else {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            setDistributionPreview(null); setIsEditModalOpen(false);
            setCurrentExpense(defaultExp); setIsDistributionEnabled(false); 
            toast.success(`✅ تم توزيع المصروف على ${payload.length} مشروع بنجاح!`);
        }
    };

    // 🔧 التصحيح المجمع
    const handleBulkFixSave = async () => {
        if (selectedIds.length === 0) return;
        if (!bulkFixAccounts.creditor_account && !bulkFixAccounts.payment_account) return alert("يرجى تحديد حساب واحد على الأقل لتصحيحه.");
        
        const updatePayload: any = {};
        if (bulkFixAccounts.creditor_account && bulkFixAccounts.creditor_account.includes(' - ')) updatePayload.creditor_account = bulkFixAccounts.creditor_account;
        if (bulkFixAccounts.payment_account && bulkFixAccounts.payment_account.includes(' - ')) updatePayload.payment_account = bulkFixAccounts.payment_account;

        if (Object.keys(updatePayload).length === 0) return alert("عذراً، يجب اختيار الحساب من القائمة المنسدلة لضمان التنسيق الصحيح.");

        const { error } = await supabase.from('expenses').update(updatePayload).in('id', selectedIds).eq('is_posted', false);
        if (error) alert("خطأ أثناء التحديث: " + error.message);
        else {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            setIsBulkFixModalOpen(false); setBulkFixAccounts({ creditor_account: '', payment_account: '' });
            toast.success(`✅ تم تصحيح حسابات ${selectedIds.length} مصروف بنجاح!`);
        }
    };

    // 📝 الإجراءات البسيطة
    const handleAddNew = () => { setCurrentExpense(defaultExp); setEditingId(null); setIsDistributionEnabled(false); setIsEditModalOpen(true); };
    const handleEditSelected = () => {
        if (selectedIds.length !== 1) return alert("اختر سجلاً واحداً للتعديل");
        const exp = expenses.find(e => e.id === selectedIds[0]);
        setCurrentExpense({...exp}); setEditingId(exp.id); setIsDistributionEnabled(false); setIsEditModalOpen(true);
    };

    const exportToExcel = () => {
        const exportData = allFiltered.map(exp => {
            const total = (Number(exp.quantity) * Number(exp.unit_price)) + Number(exp.vat_amount || 0) - Number(exp.discount_amount || 0);
            return {
                'التاريخ': exp.exp_date, 'المقاول': exp.sub_contractor || '---', 'المشروع': exp.site_ref || '---', 'المستفيد': exp.payee_name || '---',
                'حساب المصروف': exp.creditor_account, 'حساب السداد': exp.payment_account, 'البيان': exp.description, 'العدد': exp.quantity,
                'السعر': exp.unit_price, 'الضريبة': exp.vat_amount || 0, 'الخصم': exp.discount_amount || 0, 'الصافي': -Math.abs(total), 
                'الحالة': exp.is_posted ? '✅ مرحل' : '⏳ غير مرحل'
            };
        });
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "سجل_المصروفات");
        XLSX.writeFile(wb, "سجل_المصروفات_المالي.xlsx");
    };

    const canAdd = userRole === 'admin' || userPermissions?.expenses?.add;
    const canEdit = userRole === 'admin' || userPermissions?.expenses?.edit;
    const canDelete = userRole === 'admin' || userPermissions?.expenses?.delete;
    const canPost = userRole === 'admin' || userPermissions?.expenses?.post;
    const canView = userRole === 'admin' || userPermissions?.expenses?.view;
    const canExport = userRole === 'admin' || userPermissions?.expenses?.print;

    return {
        isLoading: isFetching || isProcessing || saveMutation.isPending || deleteMutation.isPending,
        filteredExpenses: allFiltered, totalAmount, selectedIds, setSelectedIds,
        currentPage, setCurrentPage, rowsPerPage, setRowsPerPage, totalPages, totalResults: allFiltered.length,
        isEditModalOpen, setIsEditModalOpen, currentExpense, setCurrentExpense, editingId,
        
        // Custom Data
        projects: supportData?.projects || [], contractors: supportData?.contractors || [], 
        payees: supportData?.payees || [], accounts: supportData?.accounts || [], boqItems: supportData?.boqItems || [],
        
        // Distribution & Bulk Fix
        isBulkFixModalOpen, setIsBulkFixModalOpen, bulkFixAccounts, setBulkFixAccounts, handleBulkFixSave,
        distributionPreview, setDistributionPreview, calculateDistribution, confirmDistribution,
        isDistributionEnabled, setIsDistributionEnabled, 
        
        // Permissions
        canAdd, canEdit, canDelete, canPost, canView, canExport, userRole,
        
        // Filter actions
        setFilterStatus: (val: string) => {
            if (val === 'الكل') setFilter('is_posted', null);
            else setFilter('is_posted', val === 'مرحل');
        },
        setFilterAccount: (val: string) => setFilter('creditor_account', val === 'الكل' ? null : val),
        filterAccount: customFilters['creditor_account'] || 'الكل',
        filterStatus: customFilters['is_posted'] === undefined ? 'الكل' : (customFilters['is_posted'] ? 'مرحل' : 'معلق'),
        
        // CRUD Actions
        handleSaveExpense: () => saveMutation.mutate(),
        handleSavePayment, handleAddNew, handleEditSelected, exportToExcel,
        handleDeleteSelected: () => deleteMutation.mutate(),
        handlePostSelected: () => postRecords(selectedIds),
        handleUnpostSelected: () => unpostRecords(selectedIds),
        handlePostAllUnposted: () => {
            const unposted = allFiltered.filter(e => !e.is_posted).map(e => e.id);
            if (unposted.length > 0) postRecords(unposted);
            else toast.success("لا يوجد مصروفات معلقة!");
        }
    };
}