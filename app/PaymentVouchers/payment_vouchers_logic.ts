"use client";
import { useState, useMemo, useDeferredValue } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';
import { useUniversalPosting } from '@/lib/accounting_engine'; // 🚀 استدعاء المحرك الموحد (الباب العاشر)

export function usePaymentVouchersLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // 1. إدارة الحالة (State) - الباب الأول
    const [globalSearch, setGlobalSearch] = useState('');
    const deferredSearch = useDeferredValue(globalSearch);
    const [filterStatus, setFilterStatus] = useState('الكل'); 
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentVoucher, setCurrentVoucher] = useState<any>({});

    // 📥 2. جلب البيانات (الباب الثالث: دالة البلدوزر)
    const { data: vouchers = [], isLoading: isFetching } = useQuery({
        queryKey: ['payment_vouchers'],
        queryFn: async () => {
            let allData: any[] = [];
            let step = 1000;
            let from = 0;
            let to = step - 1;
            let hasMore = true;

            // هذه حلقة تكرارية مشروعة (للقراءة فقط) لتخطي حاجز الـ 1000 سطر الخاص بـ Supabase
            while (hasMore) {
                const { data, error } = await supabase
                    .from('payment_vouchers')
                    .select(`
                        *,
                        payee:partners!partner_id(name),
                        credit_account:accounts!credit_account_id(name),
                        debit_account:accounts!debit_account_id(name)
                    `)
                    .order('created_at', { ascending: false })
                    .range(from, to);
                
                if (error) throw error;
                
                if (data && data.length > 0) {
                    allData = [...allData, ...data];
                    from += step;
                    to += step;
                    if (data.length < step) hasMore = false; 
                } else {
                    hasMore = false;
                }
            }
            
            return allData.map(v => ({ ...v, payee_id: v.partner_id }));
        }
    });

    // 📊 3. جلب رصيد المستفيد (يعمل فقط عند تحديد مستفيد)
    const { data: partnerBalance = 0, isLoading: isBalanceLoading } = useQuery({
        queryKey: ['partner_balance', currentVoucher.payee_id],
        queryFn: async () => {
            if (!currentVoucher.payee_id) return 0;
            const { data, error } = await supabase.rpc('get_partner_balance', { p_id: currentVoucher.payee_id });
            if (error) return 0;
            return data || 0;
        },
        enabled: !!currentVoucher.payee_id 
    });

    // 🔍 4. التصفية المتقدمة (Logic Filtering) - إلزامي داخل useMemo
    const displayedVouchers = useMemo(() => {
        let result = vouchers;

        if (filterStatus !== 'الكل') {
            const isPostedTarget = filterStatus === 'مرحل';
            result = result.filter(v => v.is_posted === isPostedTarget);
        }

        if (deferredSearch) {
            const lower = deferredSearch.toLowerCase();
            result = result.filter(v => 
                (v.payee?.name && v.payee.name.toLowerCase().includes(lower)) ||
                (v.voucher_number && String(v.voucher_number).toLowerCase().includes(lower)) ||
                (v.description && v.description.toLowerCase().includes(lower))
            );
        }

        return result;
    }, [vouchers, deferredSearch, filterStatus]); 

    // 🧮 5. الحسابات الإجمالية
    const totals = useMemo(() => {
        const totalAmount = displayedVouchers.reduce((sum, v) => sum + Number(v.amount || 0), 0);
        return { totalAmount, count: displayedVouchers.length };
    }, [displayedVouchers]);

    // 🚀 6. الترحيل المركزي والعمليات الديناميكية (الباب العاشر)
    // لا يوجد أي Loop هنا. نستدعي المحرك الموحد الذي يتخاطب مباشرة مع RPC
    const { postRecords, unpostRecords, isProcessing } = useUniversalPosting(
        'payment_vouchers',              // مفتاح التحديث لـ React Query
        'payment_vouchers',              // اسم الجدول لعملية الإلغاء המوحد (Universal Unpost)
        'post_payment_vouchers_bulk'     // دالة الـ SQL المخصصة لترحيل السندات
    );

    // 📝 7. عمليات الحفظ والحذف الأساسية (CRUD)
    const saveMutation = useMutation({
        mutationFn: async (voucherData: any) => {
            if (!voucherData.debit_account_id) throw new Error("يرجى تحديد الحساب المدين.");
            if (!voucherData.credit_account_id) throw new Error("يرجى تحديد الحساب الدائن.");
            if (!voucherData.payee_id) throw new Error("يرجى تحديد المستفيد المباشر.");
            if (!voucherData.amount || voucherData.amount <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر.");

            let payload = { ...voucherData };
            payload.partner_id = payload.payee_id;
            
            // تنظيف الحقول غير الموجودة في الداتابيز
            delete payload.payee_id; delete payload.payee_name; delete payload.debit_account_name;
            delete payload.credit_account_name; delete payload.payee; delete payload.credit_account; delete payload.debit_account;

            if (!payload.voucher_number) payload.voucher_number = `PV-${Date.now().toString().slice(-6)}`;
            payload.is_posted = false;
            payload.status = 'مسودة';

            if (payload.id) {
                const { error } = await supabase.from('payment_vouchers').update(payload).eq('id', payload.id);
                if (error) throw error;
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                payload.created_by = session?.user?.id;
                const { error } = await supabase.from('payment_vouchers').insert([payload]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            showToast('تم حفظ السند وهو الآن (معلق) ⏳', 'success');
            setIsEditModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
        },
        onError: (error: any) => showToast(error.message, 'error')
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const postedVouchers = vouchers.filter(v => selectedIds.includes(v.id) && v.is_posted);
            if (postedVouchers.length > 0) throw new Error('لا يمكن حذف سندات مُرحلة. قم بفك الترحيل أولاً.');

            const { error } = await supabase.from('payment_vouchers').delete().in('id', selectedIds);
            if (error) throw error;
        },
        onSuccess: () => {
            showToast('تم الحذف بنجاح 🗑️', 'success');
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
        },
        onError: (err: any) => showToast(err.message, 'error')
    });

    // 💎 8. تجريد المخرجات (Pure Return - الباب الأول)
    return {
        data: displayedVouchers,
        isLoading: isFetching || isProcessing || saveMutation.isPending, 
        totals,
        state: {
            globalSearch,
            filterStatus,
            selectedIds,
            currentPage,
            rowsPerPage,
            isEditModalOpen,
            currentVoucher,
            partnerBalance,
            isBalanceLoading
        },
        actions: {
            setGlobalSearch,
            setFilterStatus,
            setSelectedIds,
            setCurrentPage,
            setRowsPerPage,
            setIsEditModalOpen,
            setCurrentVoucher,
            handleAddNew: () => {
                setCurrentVoucher({ 
                    date: new Date().toISOString().split('T')[0], payment_method: 'تحويل بنكي', amount: 0,
                    debit_account_id: '', debit_account_name: '', credit_account_id: '', credit_account_name: '',
                    payee_id: '', payee_name: ''
                });
                setIsEditModalOpen(true);
            },
            handleEditSelected: () => {
                const selected = vouchers.find(v => v.id === selectedIds[0]);
                if (selected) {
                    setCurrentVoucher({ ...selected });
                    setIsEditModalOpen(true);
                }
            },
            handleDeleteSelected: () => {
                if (confirm('تأكيد الحذف النهائي للسندات المحددة؟')) deleteMutation.mutate();
            },
            handleSaveVoucher: () => saveMutation.mutate(currentVoucher),
            
            // ⚡ تنفيذ الترحيل السريع عبر المحرك المركزي (يُمرر المصفوفة مباشرة)
            handlePostSelected: () => postRecords(selectedIds),
            handleUnpostSelected: () => unpostRecords(selectedIds),
            exportToExcel: () => {}
        }
    };
}