"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 
import { useToast } from '@/lib/toast-context'; 
import { resolvePartnerId } from '@/lib/accounting'; // 🛡️ الباب الثامن: التوجيه الذكي

export function usePaymentVouchersLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const [globalSearch, setGlobalSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    // Modals States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentVoucher, setCurrentVoucher] = useState<any>({});

    // 📥 1. جلب السندات عبر React Query
    const { data: vouchers = [], isLoading } = useQuery({
        queryKey: ['payment_vouchers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('payment_vouchers')
                .select(`
                    *,
                    payee:partners!partner_id(name),
                    credit_account:accounts!credit_account_id(name),
                    debit_account:accounts!debit_account_id(name)
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // 🟢 ربط الاسم القادم من الداتابيز بالاسم المستخدم في الواجهة
            return (data || []).map(v => ({
                ...v,
                payee_id: v.partner_id // 👈 تحويل partner_id إلى payee_id ليعمل بسلاسة مع الواجهة
            }));
        }
    });

    // 📊 2. جلب رصيد العامل/المستفيد اللحظي (Defensive Call)
    const { data: partnerBalance = 0, isLoading: isBalanceLoading } = useQuery({
        queryKey: ['partner_balance', currentVoucher.payee_id],
        queryFn: async () => {
            if (!currentVoucher.payee_id) return 0;
            try {
                const { data, error } = await supabase.rpc('get_partner_balance', { p_id: currentVoucher.payee_id });
                if (error) {
                    console.warn("⚠️ RPC 'get_partner_balance' failed or not found. Defaulting to 0.", error.message);
                    return 0; // Fallback to 0 if RPC is missing
                }
                return data || 0;
            } catch (err) {
                console.warn("⚠️ Exception calling 'get_partner_balance'. Defaulting to 0.", err);
                return 0;
            }
        },
        enabled: !!currentVoucher.payee_id 
    });

    // 🔍 الفلترة الذكية
    const filteredVouchers = useMemo(() => {
        if (!globalSearch) return vouchers;
        const lowerSearch = globalSearch.toLowerCase();
        return vouchers.filter(v => 
            (v.payee?.name && v.payee.name.toLowerCase().includes(lowerSearch)) ||
            (v.voucher_number && v.voucher_number.toLowerCase().includes(lowerSearch)) ||
            (v.description && v.description.toLowerCase().includes(lowerSearch))
        );
    }, [vouchers, globalSearch]);

    const totalAmount = useMemo(() => filteredVouchers.reduce((sum, v) => sum + Number(v.amount || 0), 0), [filteredVouchers]);

    // 🛠️ الإجراءات الأساسية
    const handleAddNew = () => {
        setCurrentVoucher({ 
            date: new Date().toISOString().split('T')[0],
            payment_method: 'تحويل بنكي',
            amount: 0,
            debit_account_id: '',
            debit_account_name: '',
            credit_account_id: '',
            credit_account_name: '',
            payee_id: '',
            payee_name: ''
        });
        setIsEditModalOpen(true);
    };

    const handleEditSelected = () => {
        const selected = vouchers.find(v => v.id === selectedIds[0]);
        if (selected) {
            setCurrentVoucher({ ...selected });
            setIsEditModalOpen(true);
        }
    };

    // 💾 3. حفظ السند والترحيل المحاسبي اللحظي (القيد المزدوج الماسي)
    const saveMutation = useMutation({
        mutationFn: async (voucherData: any) => {
            // 🛑 حماية محاسبية: التأكد من وجود أطراف القيد الثلاثة
            if (!voucherData.debit_account_id) throw new Error("يرجى تحديد الحساب المدين (مثال: التزام عمال).");
            if (!voucherData.credit_account_id) throw new Error("يرجى تحديد الحساب الدائن (مثال: الخزينة/البنك).");
            if (!voucherData.payee_id) throw new Error("يرجى تحديد المستفيد المباشر لتحديث كشف حسابه.");
            if (!voucherData.amount || voucherData.amount <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر.");

            let payload = { ...voucherData };
            
            // 🟢 تحويل payee_id إلى الاسم الصحيح في الداتابيز partner_id قبل الحفظ
            if (payload.payee_id) {
                payload.partner_id = payload.payee_id;
            }
            
            // تنظيف الكائن من الحقول الوهمية لكي يقبله Supabase
            delete payload.payee_id;
            delete payload.payee_name;
            delete payload.debit_account_name;
            delete payload.credit_account_name;
            delete payload.payee;
            delete payload.credit_account;
            delete payload.debit_account;

            if (!payload.voucher_number) {
                payload.voucher_number = `PV-${Date.now().toString().slice(-6)}`;
            }

            let currentVoucherId = payload.id;

            // 1️⃣ إدراج أو تحديث سند الصرف في قاعدة البيانات
            if (payload.id) {
                const { error } = await supabase.from('payment_vouchers').update(payload).eq('id', payload.id);
                if (error) throw new Error("خطأ في تحديث السند: " + error.message);
                
                // مسح القيد القديم (إن وُجد) لإعادة إنشائه بالبيانات الجديدة
                await supabase.from('journal_headers').delete().eq('reference_id', String(payload.id));
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                payload.created_by = session?.user?.id;
                payload.is_posted = true; // نعتبره مرحل تلقائياً
                
                const { data: newVoucher, error } = await supabase.from('payment_vouchers').insert([payload]).select('id').single();
                if (error) throw new Error("خطأ في إنشاء السند: " + error.message);
                currentVoucherId = newVoucher.id;
            }

            // 🛡️ الباب التاسع: الفحص الاستباقي لمنع التكرار (Idempotency Check)
            const { data: existingHeader } = await supabase
                .from('journal_headers')
                .select('id')
                .eq('reference_id', String(currentVoucherId))
                .maybeSingle();

            if (existingHeader) {
                // التعافي الذاتي: القيد موجود مسبقاً، لا داعي لإنشائه مرة أخرى
                return currentVoucherId;
            }

            // ⚖️ 2️⃣ إنشاء القيد المزدوج ⚖️
            const { data: header, error: hError } = await supabase.from('journal_headers').insert([{
                entry_date: payload.date,
                description: `سداد منصرف للمستفيد: ${voucherData.payee_name || voucherData.payee?.name || ''} - ${payload.description || ''}`,
                reference_id: String(currentVoucherId), // صرامة الأنواع
                v_type: 'سند صرف',
                status: 'posted'
            }]).select('id').single();

            if (hError) throw new Error("خطأ في إنشاء رأس القيد: " + hError.message);

            // 🛡️ الباب الثامن: التوجيه الذكي للذمم الفرعية
            const safeDebitPartnerId = resolvePartnerId(payload.debit_account_id, payload.partner_id);
            const safeCreditPartnerId = resolvePartnerId(payload.credit_account_id, payload.partner_id);

            const lines = [
                {   
                    // 🔴 الطرف المدين (Debit): حساب الأستاذ (يقلل الالتزام على الشركة)
                    header_id: header.id,
                    account_id: payload.debit_account_id, 
                    partner_id: safeDebitPartnerId, // توجيه ذكي
                    debit: payload.amount, 
                    credit: 0, 
                    notes: `سداد مستحقات للمستفيد: ${voucherData.payee_name || voucherData.payee?.name || ''}`
                },
                {   
                    // 🟢 الطرف الدائن (Credit): حساب الخزينة/البنك (الفلوس خرجت)
                    header_id: header.id,
                    account_id: payload.credit_account_id, 
                    partner_id: safeCreditPartnerId, // توجيه ذكي (غالباً null للبنك)
                    debit: 0, 
                    credit: payload.amount, 
                    notes: `سحب من حساب: ${voucherData.credit_account_name || voucherData.credit_account?.name || ''}`
                }
            ];

            const { error: lError } = await supabase.from('journal_lines').insert(lines);
            if (lError) throw new Error("خطأ في إنشاء أطراف القيد: " + lError.message);
            
            return currentVoucherId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
            queryClient.invalidateQueries({ queryKey: ['partner_balance'] });
            setIsEditModalOpen(false);
            setSelectedIds([]);
            showToast('تم حفظ السند وإنشاء القيد المزدوج بنجاح ⚖️✅', 'success');
        },
        onError: (error: any) => showToast(error.message, 'error')
    });

    const handleDeleteSelected = async () => {
        if (!confirm('هل أنت متأكد من حذف السندات المحددة؟ (لا يمكن التراجع)')) return;
        
        try {
            const postedVouchers = vouchers.filter(v => selectedIds.includes(v.id) && v.is_posted);
            if (postedVouchers.length > 0) {
                return showToast('لا يمكن حذف سندات مُرحلة. يرجى فك الترحيل أولاً ⚠️', 'warning');
            }

            const { error } = await supabase.from('payment_vouchers').delete().in('id', selectedIds);
            if (error) throw error;
            
            showToast('تم الحذف بنجاح 🗑️', 'success');
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
        } catch (error: any) {
            showToast('حدث خطأ أثناء الحذف', 'error');
        }
    };

    // 🏦 4. محرك الاعتماد والترحيل (للسندات المعلقة)
    const handlePostSelected = async () => {
        if (!confirm('هل أنت متأكد من اعتماد وترحيل السندات المحددة؟')) return;
        
        try {
            const vouchersToPost = vouchers.filter(v => selectedIds.includes(v.id) && !v.is_posted);
            
            for (const v of vouchersToPost) {
                // 🟢 قراءة الهوية الموحدة للمستفيد بعد توحيدها في الـ Query
                const currentPartnerId = v.partner_id || v.payee_id;

                if (!v.debit_account_id || !v.credit_account_id || !currentPartnerId) {
                    throw new Error(`السند رقم ${v.voucher_number} ينقصه بعض حسابات التوجيه المالي.`);
                }

                // 🛡️ الباب التاسع: الفحص الاستباقي
                const { data: existingHeader } = await supabase
                    .from('journal_headers')
                    .select('id')
                    .eq('reference_id', String(v.id))
                    .maybeSingle();

                if (existingHeader) {
                    // القيد موجود، فقط نحدث حالة المستند
                    await supabase.from('payment_vouchers').update({ is_posted: true }).eq('id', v.id);
                    continue;
                }

                const { data: header, error: hError } = await supabase.from('journal_headers').insert([{
                    entry_date: v.date,
                    description: `سداد منصرف للمستفيد: ${v.payee?.name || ''} - ${v.description || ''}`,
                    reference_id: String(v.id), // صرامة الأنواع
                    status: 'posted'
                }]).select('id').single();

                if (hError) throw hError;

                // 🛡️ الباب الثامن: التوجيه الذكي
                const safeDebitPartnerId = resolvePartnerId(v.debit_account_id, currentPartnerId);
                const safeCreditPartnerId = resolvePartnerId(v.credit_account_id, currentPartnerId);

                const lines = [
                    { header_id: header.id, account_id: v.debit_account_id, partner_id: safeDebitPartnerId, debit: v.amount, credit: 0, notes: v.description },
                    { header_id: header.id, account_id: v.credit_account_id, partner_id: safeCreditPartnerId, debit: 0, credit: v.amount, notes: v.description }
                ];

                const { error: lError } = await supabase.from('journal_lines').insert(lines);
                if (lError) throw lError;

                await supabase.from('payment_vouchers').update({ is_posted: true }).eq('id', v.id);
            }

            showToast('تم ترحيل السندات المعلقة وإنشاء القيود بنجاح 🚀', 'success');
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
            queryClient.invalidateQueries({ queryKey: ['partner_balance'] }); 
        } catch (error: any) {
            showToast(`فشل في الترحيل: ${error.message}`, 'error');
        }
    };

    // ⏪ 5. الإلغاء المتسلسل
    const handleUnpostSelected = async () => {
        if (!confirm('فك الترحيل سيقوم بمسح القيود المحاسبية المتعلقة ورفع مديونية المستفيد مجدداً. هل أنت متأكد؟')) return;
        
        try {
            const vouchersToUnpost = vouchers.filter(v => selectedIds.includes(v.id) && v.is_posted);
            
            for (const v of vouchersToUnpost) {
                // استخدام String() للصرامة
                await supabase.from('journal_headers').delete().eq('reference_id', String(v.id));
                await supabase.from('payment_vouchers').update({ is_posted: false }).eq('id', v.id);
            }

            showToast('تم فك الترحيل ومسح القيود بنجاح ⏪', 'success');
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
            queryClient.invalidateQueries({ queryKey: ['partner_balance'] });
        } catch (error: any) {
            showToast('فشل في فك الترحيل', 'error');
        }
    };

    const exportToExcel = () => {
        // اللوجيك للجدول الذكي
    };

    return {
        isLoading, isSaving: saveMutation.isPending, 
        globalSearch, setGlobalSearch,
        filteredVouchers, totalAmount, selectedIds, setSelectedIds,
        currentPage, setCurrentPage, rowsPerPage, setRowsPerPage,
        isEditModalOpen, setIsEditModalOpen, currentVoucher, setCurrentVoucher,
        partnerBalance, isBalanceLoading,
        handleAddNew, handleEditSelected, handleDeleteSelected, 
        handleSaveVoucher: () => saveMutation.mutate(currentVoucher),
        handlePostSelected, handleUnpostSelected, exportToExcel
    };
}