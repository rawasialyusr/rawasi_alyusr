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
    // 🔍 أداة الفحص الشامل للكونسول
    useEffect(() => {
        (window as any).testPosting = async () => {
            console.log("🔍 === بدء اختبار الترحيل من الكونسول ===");
            
            // 1. البحث عن مصروف معلق
            const { data: expData, error: expError } = await supabase
                .from('expenses')
                .select('*')
                .eq('is_posted', false)
                .limit(1)
                .single();
                
            if (expError || !expData) {
                console.error("❌ لم أجد أي مصروف معلق! تأكد إن في مصروف حالته 'معلق'.", expError);
                return;
            }
            
            console.log("1️⃣ تم مسك المصروف بنجاح:", { id: expData.id, وصف: expData.description });
            
            // 2. محاولة الترحيل عبر الـ RPC
            console.log("2️⃣ جاري إرسال أمر الترحيل (RPC) لـ Supabase...");
            const { data: rpcData, error: rpcError } = await supabase.rpc('post_expenses_bulk', { p_ids: [expData.id] });
            
            if (rpcError) {
                console.error("❌ Supabase رفض الترحيل (RPC Error)! التفاصيل:", rpcError);
                return;
            }
            console.log("✅ الدالة اتنفذت في Supabase بدون أخطاء (Status 200).");

            // 3. التأكد من إنشاء القيد المحاسبي
            console.log("3️⃣ جاري البحث عن القيد المحاسبي في الجورنال...");
            const { data: journalData, error: journalError } = await supabase
                .from('journal_headers')
                .select('*, journal_lines(*)')
                .eq('reference_id', expData.id);
                
            if (journalError) {
                console.error("❌ خطأ أثناء البحث في الجورنال:", journalError);
                return;
            }
            
            if (journalData && journalData.length > 0) {
                console.log("🎉 تم الفحص بنجاح! القيد اتعمل والسطور اهي:", journalData);
            } else {
                console.warn("⚠️ الدالة نجحت.. بس مفيش قيد اتعمل في الجورنال!! (المشكلة جوه لوجيك الـ SQL نفسه ملقاش الحسابات غالباً).");
            }
            
            console.log("🔍 === انتهاء الاختبار ===");
        };
        console.log("🛠️ أداة الفحص جاهزة! افتح الـ Console واكتب testPosting() واضغط Enter.");
    }, []);
    
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

    // 🚀 تحديث القيم الافتراضية وإضافة main_category
    const defaultExp = { 
        exp_date: new Date().toISOString().split('T')[0], main_category: '', sub_contractor: '', site_ref: '',       
        creditor_account: '', description: '', payee_name: '', payment_method: 'كاش', payment_account: '', 
        employee_name: '', quantity: 1, unit_price: 0, vat_amount: 0, discount_amount: 0, discount_account: '', 
        notes: '', invoice_image: null,
        is_auto_distributed: false 
    };
    const [currentExpense, setCurrentExpense] = useState<any>(defaultExp);

    // 📥 2. جلب البيانات الأساسية
    const { data: expenses = [], isLoading: isFetching } = useQuery({
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

    // 🚀 3. الفلترة الذكية
    const { filteredData: allFiltered, setFilter, customFilters, globalSearch, setGlobalSearch } = useSmartFilter(
        expenses, 
        ['payee_name', 'sub_contractor', 'description', 'notes', 'site_ref', 'creditor_account', 'main_category'], 
        'exp_date' 
    );

    const totalAmount = useMemo(() => allFiltered.reduce((sum, exp) => sum + ((Number(exp.quantity) * Number(exp.unit_price)) + Number(exp.vat_amount || 0) - Number(exp.discount_amount || 0)), 0), [allFiltered]);
    const totalPages = Math.ceil(allFiltered.length / rowsPerPage) || 1;
    
    // 🕰️ القوائم التاريخية
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

    // 🚀 4. الترحيل المركزي
    const { postRecords, unpostRecords, isProcessing } = useUniversalPosting(
        'expenses',              // Query Key
        'expenses',              // Table name for Unpost
        'post_expenses_bulk'     // The SQL RPC function
    );

    // 💾 5. الحفظ
    const saveMutation = useMutation({
        mutationFn: async (passedRecord: any) => {
            if (!passedRecord || !passedRecord.exp_date) {
                throw new Error("حدث خطأ في استلام البيانات من النافذة، يرجى المحاولة مرة أخرى.");
            }

            let generatedDescription = passedRecord.description;
            
            if ((!generatedDescription || generatedDescription.trim() === '') && passedRecord.lines_data && Array.isArray(passedRecord.lines_data) && passedRecord.lines_data.length > 0) {
                generatedDescription = passedRecord.lines_data
                    .map((line: any) => line.description || line.item_name || line.work_item)
                    .filter(Boolean)
                    .join(' + ');
            }

            const finalDescription = generatedDescription && generatedDescription.trim() !== '' ? generatedDescription : 'مصروف عام';

            const payload = {
                exp_date: passedRecord.exp_date, 
                main_category: passedRecord.main_category, 
                sub_contractor: passedRecord.sub_contractor, 
                site_ref: passedRecord.site_ref,             
                creditor_account: passedRecord.creditor_account, 
                description: finalDescription, 
                payee_name: passedRecord.payee_name, 
                payment_method: passedRecord.payment_method || passedRecord.method || 'كاش', 
                payment_account: passedRecord.payment_account,
                employee_name: passedRecord.employee_name,
                
                quantity: 1,
                unit_price: Number(passedRecord.unit_price) || 0,
                vat_amount: Number(passedRecord.vat_amount) || 0,
                discount_amount: Number(passedRecord.discount_amount) || 0,
                
                discount_account: passedRecord.discount_account || null,
                notes: passedRecord.notes, 
                invoice_image: passedRecord.invoice_image,
                lines_data: passedRecord.lines_data || [],
                is_auto_distributed: passedRecord.is_auto_distributed || false 
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

    // 🔧 التصحيح المجمع (مع حماية ضد خطأ 400 Bad Request بالتقطيع - Chunking)
    const handleBulkFixSave = async () => {
        if (selectedIds.length === 0) return;
        
        if (!bulkFixAccounts.creditor_account && !bulkFixAccounts.payment_account) {
            return alert("يرجى تحديد حساب واحد على الأقل لتصحيحه.");
        }
        
        const updatePayload: any = {};
        
        if (bulkFixAccounts.creditor_account) {
            updatePayload.creditor_account = bulkFixAccounts.creditor_account;
        }
        
        if (bulkFixAccounts.payment_account) {
            updatePayload.payment_account = bulkFixAccounts.payment_account;
        }

        if (Object.keys(updatePayload).length === 0) {
            return alert("عذراً، يجب اختيار الحساب من القائمة المنسدلة لضمان التنسيق الصحيح.");
        }

        const toastId = toast.loading(`⏳ جاري تصحيح ${selectedIds.length} سجل...`);

        try {
            const CHUNK_SIZE = 50; 
            for (let i = 0; i < selectedIds.length; i += CHUNK_SIZE) {
                const chunk = selectedIds.slice(i, i + CHUNK_SIZE);
                
                const { error } = await supabase
                    .from('expenses')
                    .update(updatePayload)
                    .in('id', chunk)
                    .eq('is_posted', false); 
                
                if (error) {
                    console.error("Error in chunk:", error);
                    throw new Error(error.message);
                }
            }

            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            setIsBulkFixModalOpen(false); 
            setBulkFixAccounts({ creditor_account: '', payment_account: '' });
            setSelectedIds([]); 
            toast.success(`✅ تم تصحيح حسابات ${selectedIds.length} مصروف بنجاح!`, { id: toastId });
            
        } catch (error: any) {
            toast.error("خطأ أثناء التحديث: " + error.message, { id: toastId });
        }
    };
    
    const exportToExcel = () => {
        const exportData = allFiltered.map(exp => {
            const total = (Number(exp.quantity) * Number(exp.unit_price)) + Number(exp.vat_amount || 0) - Number(exp.discount_amount || 0);
            return {
                'التاريخ': exp.exp_date, 
                'التصنيف': exp.main_category || '---',
                'المقاول': exp.sub_contractor || '---', 
                'المشروع': exp.site_ref || '---', 
                'المستفيد': exp.payee_name || '---',
                'حساب المصروف': exp.creditor_account, 
                'حساب السداد': exp.payment_account, 
                'البيان': exp.description, 
                'العدد': exp.quantity,
                'السعر': exp.unit_price, 
                'الضريبة': exp.vat_amount || 0, 
                'الخصم': exp.discount_amount || 0, 
                'الصافي': -Math.abs(total), 
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
        
        projects: supportData?.projects || [], contractors: supportData?.contractors || [], 
        payees: supportData?.payees || [], accounts: supportData?.accounts || [], boqItems: supportData?.boqItems || [],
        
        isBulkFixModalOpen, setIsBulkFixModalOpen, bulkFixAccounts, setBulkFixAccounts, handleBulkFixSave,
        
        canAdd, canEdit, canDelete, canPost, canView, canExport, userRole,
        
        setFilterStatus: (val: string) => {
            if (val === 'الكل') setFilter('is_posted', null);
            else setFilter('is_posted', val === 'مرحل');
        },
        setFilterAccount: (val: string) => setFilter('creditor_account', val === 'الكل' ? null : val),
        filterAccount: customFilters['creditor_account'] || 'الكل',
        filterStatus: customFilters['is_posted'] === undefined ? 'الكل' : (customFilters['is_posted'] ? 'مرحل' : 'معلق'),
        
        handleSaveExpense: (data: any) => {
            if (!data) {
                toast.error("لم يتم استلام البيانات من المودال!");
                return;
            }
            saveMutation.mutate(data);
        },
        handleSavePayment, 
        handleAddNew: () => { setCurrentExpense(defaultExp); setEditingId(null); setIsEditModalOpen(true); }, 
        handleEditSelected: () => {
            if (selectedIds.length !== 1) return alert("اختر سجلاً واحداً للتعديل");
            const exp = expenses.find(e => e.id === selectedIds[0]);
            setCurrentExpense({...exp}); setEditingId(exp.id); setIsEditModalOpen(true);
        }, 
        exportToExcel,
        handleDeleteSelected: () => deleteMutation.mutate(),
        
        // 🚀 السحر هنا: استخدام الـ RPC الأصلية عشان تنشئ القيود وتسمع في الجورنال
        handlePostSelected: async () => {
            if (selectedIds.length === 0) return;
            const toastId = toast.loading('جاري الترحيل وإنشاء القيود...');
            
            // 1. التحديث اللحظي للواجهة
            queryClient.setQueryData(['expenses'], (oldData: any[]) => {
                if (!oldData) return [];
                return oldData.map(exp => selectedIds.includes(exp.id) ? { ...exp, is_posted: true } : exp);
            });
            
            try {
                // 2. استخدام دالة الباك إند (RPC) لإنشاء القيود
                const { error } = await supabase.rpc('post_expenses_bulk', { p_ids: selectedIds });
                if (error) throw error;
                
                toast.success('تم الترحيل وتوليد القيود بنجاح ✅', { id: toastId });
                setSelectedIds([]);
                queryClient.invalidateQueries({ queryKey: ['expenses'] });
            } catch (error: any) {
                toast.error(`خطأ الترحيل: ${error.message}`, { id: toastId });
                queryClient.invalidateQueries({ queryKey: ['expenses'] });
            }
        },
        
        handleUnpostSelected: async () => {
            if (selectedIds.length === 0) return;
            const toastId = toast.loading('جاري فك الترحيل وحذف القيود...');
            
            queryClient.setQueryData(['expenses'], (oldData: any[]) => {
                if (!oldData) return [];
                return oldData.map(exp => selectedIds.includes(exp.id) ? { ...exp, is_posted: false } : exp);
            });
            
            try {
                // 👇 التعديل هنا: استخدام الدالة الصحيحة والمتغير الصحيح (record_ids)
                const { error } = await supabase.rpc('unpost_expenses_bulk', { record_ids: selectedIds });
                if (error) throw error;
                
                toast.success('تم فك الترحيل بنجاح ↩️', { id: toastId });
                setSelectedIds([]);
                queryClient.invalidateQueries({ queryKey: ['expenses'] });
            } catch (error: any) {
                toast.error(`خطأ فك الترحيل: ${error.message}`, { id: toastId });
                queryClient.invalidateQueries({ queryKey: ['expenses'] });
            }
        },
        
        handlePostAllUnposted: async () => {
            const unposted = allFiltered.filter(e => !e.is_posted).map(e => e.id);
            if (unposted.length === 0) return toast.success("لا يوجد مصروفات معلقة!");
            
            const toastId = toast.loading('جاري ترحيل الكل...');
            
            // 1. التحديث اللحظي لكل المعلق
            queryClient.setQueryData(['expenses'], (oldData: any[]) => {
                if (!oldData) return [];
                return oldData.map(exp => unposted.includes(exp.id) ? { ...exp, is_posted: true } : exp);
            });
            
            try {
                // 2. إرسال أمر الترحيل الشامل للباك إند
                const { error } = await supabase.rpc('post_expenses_bulk', { p_ids: unposted });
                if (error) throw error;
                
                toast.success('تم الترحيل بالكامل ✅', { id: toastId });
                setSelectedIds([]);
                queryClient.invalidateQueries({ queryKey: ['expenses'] });
            } catch (error: any) {
                toast.error(`خطأ الترحيل: ${error.message}`, { id: toastId });
                queryClient.invalidateQueries({ queryKey: ['expenses'] });
            }
        }
    };
}