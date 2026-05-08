"use client";
import { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';
import { useUniversalPosting } from '@/lib/accounting_engine'; 

export function usePaymentVouchersLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // 🎯 دالة سحرية لتحديث الكاش لحظياً
    const updateRowsInCache = (targetIds: any[], updatedFields: any) => {
        queryClient.setQueryData(['payment_vouchers'], (oldData: any[]) => {
            if (!oldData) return [];
            const stringIds = targetIds.map(String);
            return oldData.map(row => 
                stringIds.includes(String(row.id)) ? { ...row, ...updatedFields } : row 
            );
        });
    };

    // 1. إدارة الحالة (State)
    const [globalSearch, setGlobalSearch] = useState('');
    const deferredSearch = useDeferredValue(globalSearch);
    const [filterStatus, setFilterStatus] = useState('الكل'); 
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentVoucher, setCurrentVoucher] = useState<any>({});

    // 🚀 State الخاصة بالتصحيح المجمع لسندات الصرف
    const [isBulkFixModalOpen, setIsBulkFixModalOpen] = useState(false);
    const [bulkFixAccounts, setBulkFixAccounts] = useState({ credit_account_name: '', credit_account_id: null, debit_account_name: '', debit_account_id: null });

    // 🌟 2. استماع دائم لحدث التواريخ والبحث
    useEffect(() => {
        const handleDateChange = (e: any) => {
            setDateRange({ start: e.detail.start, end: e.detail.end });
            setCurrentPage(1); 
        };

        const handleSearchChange = (e: any) => {
            setGlobalSearch(e.detail || '');
            setCurrentPage(1);
        };
        
        window.addEventListener('globalDateFilter', handleDateChange as EventListener);
        window.addEventListener('globalSearch', handleSearchChange as EventListener);

        return () => {
            window.removeEventListener('globalDateFilter', handleDateChange as EventListener);
            window.removeEventListener('globalSearch', handleSearchChange as EventListener);
        };
    }, []);

    // 📥 3. جلب البيانات
    const { data: vouchers = [], isLoading: isFetching } = useQuery({
        queryKey: ['payment_vouchers'],
        queryFn: async () => {
            let allData: any[] = [];
            let step = 1000;
            let from = 0;
            let to = step - 1;
            let hasMore = true;

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

    // 📊 4. جلب رصيد المستفيد
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

    // 🔍 5. التصفية المتقدمة (Logic Filtering)
    const displayedVouchers = useMemo(() => {
        let result = vouchers;

        if (dateRange.start) result = result.filter(v => new Date(v.date) >= new Date(dateRange.start));
        if (dateRange.end) result = result.filter(v => new Date(v.date) <= new Date(dateRange.end));

        if (filterStatus !== 'الكل') {
            const isPostedTarget = filterStatus === 'مرحل';
            result = result.filter(v => v.is_posted === isPostedTarget);
        }

        if (deferredSearch) {
            const lower = deferredSearch.toLowerCase().trim();
            result = result.filter(v => 
                (v.voucher_number && String(v.voucher_number).toLowerCase().includes(lower)) ||
                (v.description && String(v.description).toLowerCase().includes(lower)) ||
                (v.payee?.name && String(v.payee.name).toLowerCase().includes(lower)) ||
                (v.credit_account?.name && String(v.credit_account.name).toLowerCase().includes(lower)) ||
                (v.debit_account?.name && String(v.debit_account.name).toLowerCase().includes(lower)) ||
                (v.amount && String(v.amount).includes(lower))
            );
        }

        return result;
    }, [vouchers, deferredSearch, filterStatus, dateRange]);

    // 🧮 6. الحسابات الإجمالية
    const totals = useMemo(() => {
        const totalAmount = displayedVouchers.reduce((sum, v) => sum + Number(v.amount || 0), 0);
        return { totalAmount, count: displayedVouchers.length };
    }, [displayedVouchers]);

    // 🚀 7. الترحيل المركزي
    const { postRecords, unpostRecords, isProcessing } = useUniversalPosting(
        'payment_vouchers',
        'payment_vouchers',
        'post_payment_vouchers_bulk'
    );

    // 📝 8. عمليات الحفظ والحذف
    const saveMutation = useMutation({
        mutationFn: async (voucherData: any) => {
            if (!voucherData.debit_account_id) throw new Error("يرجى تحديد الحساب المدين.");
            if (!voucherData.credit_account_id) throw new Error("يرجى تحديد الحساب الدائن.");
            if (!voucherData.amount || Number(voucherData.amount) <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر.");

            let payload = { ...voucherData };
            payload.partner_id = payload.payee_id;
            
            // 🚀 الحل المحاسبي القاطع: نأخذ الرقم كـ Float ونثبته على منزلتين عشريتين (هللات) عشان مايطيرش
            payload.amount = parseFloat(Number(payload.amount).toFixed(2));
            
            delete payload.payee_id; delete payload.payee_name; delete payload.debit_account_name;
            delete payload.credit_account_name; delete payload.payee; delete payload.credit_account; delete payload.debit_account;

            if (!payload.voucher_number) payload.voucher_number = `PV-${Date.now().toString().slice(-6)}`;
            
            if (!payload.id) {
                payload.is_posted = false;
                payload.status = 'مسودة';
            }

            if (payload.id) {
                const { error } = await supabase.from('payment_vouchers').update(payload).eq('id', payload.id);
                if (error) throw error;
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                payload.created_by = session?.user?.id;
                payload.is_posted = false;
                payload.status = 'مسودة';

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

    // 🚀 دالة التصحيح المجمع لسندات الصرف
    const handleBulkFixSave = async () => {
        if (selectedIds.length === 0 || (!bulkFixAccounts.credit_account_id && !bulkFixAccounts.debit_account_id)) return;
        
        const updatePayload: any = {};
        if (bulkFixAccounts.credit_account_id) updatePayload.credit_account_id = bulkFixAccounts.credit_account_id;
        if (bulkFixAccounts.debit_account_id) updatePayload.debit_account_id = bulkFixAccounts.debit_account_id;

        const cacheUpdateFields: any = { ...updatePayload };
        if (bulkFixAccounts.credit_account_id) cacheUpdateFields.credit_account = { name: bulkFixAccounts.credit_account_name };
        if (bulkFixAccounts.debit_account_id) cacheUpdateFields.debit_account = { name: bulkFixAccounts.debit_account_name };

        showToast(`⏳ جاري تصحيح وتوجيه ${selectedIds.length} سند...`, 'warning');
        
        const previousData = queryClient.getQueryData(['payment_vouchers']);
        updateRowsInCache(selectedIds, cacheUpdateFields);

        try {
            const CHUNK_SIZE = 50; 
            for (let i = 0; i < selectedIds.length; i += CHUNK_SIZE) {
                const chunk = selectedIds.slice(i, i + CHUNK_SIZE);
                const { error } = await supabase.from('payment_vouchers').update(updatePayload).in('id', chunk).eq('is_posted', false); 
                if (error) throw new Error(error.message);
            }
            setIsBulkFixModalOpen(false); 
            setBulkFixAccounts({ credit_account_name: '', credit_account_id: null, debit_account_name: '', debit_account_id: null });
            setSelectedIds([]); 
            showToast(`✅ تم تصحيح الحسابات بنجاح!`, 'success');
        } catch (error: any) {
            queryClient.setQueryData(['payment_vouchers'], previousData); 
            showToast("خطأ أثناء التحديث: " + error.message, 'error');
        }
    };

    // 💎 9. المخرجات
    return {
        data: displayedVouchers,
        isLoading: isFetching || isProcessing || saveMutation.isPending, 
        totals,
        state: {
            globalSearch, filterStatus, dateRange, selectedIds, currentPage, rowsPerPage,
            isEditModalOpen, currentVoucher, partnerBalance, isBalanceLoading,
            isBulkFixModalOpen, bulkFixAccounts
        },
        actions: {
            setGlobalSearch, setFilterStatus, setSelectedIds, setCurrentPage, setRowsPerPage,
            setIsEditModalOpen, setCurrentVoucher, setIsBulkFixModalOpen, setBulkFixAccounts,
            handleAddNew: () => {
                setCurrentVoucher({ 
                    date: new Date().toISOString().split('T')[0], 
                    payment_method: 'نقدي', 
                    amount: '', // 🚀 السر هنا: خلينها string فاضي عشان المتصفح يسمحلك تكتب الكسور براحتك من غير ما يمسح النقطة (.)
                    debit_account_id: '', debit_account_name: '', credit_account_id: '', credit_account_name: '',
                    payee_id: '', payee_name: '', is_posted: false, status: 'مسودة'
                });
                setIsEditModalOpen(true);
            },
            handleEditSelected: () => {
                if (selectedIds.length !== 1) return showToast("برجاء تحديد سند واحد فقط للتعديل", "error");
                
                const selected = vouchers.find(v => v.id === selectedIds[0]);
                if (selected) {
                    const voucherForEdit = {
                        ...selected,
                        payee_name: selected.payee?.name || '',
                        debit_account_name: selected.debit_account?.name || '',
                        credit_account_name: selected.credit_account?.name || ''
                    };
                    setCurrentVoucher(voucherForEdit);
                    setIsEditModalOpen(true);
                }
            },
            handleDeleteSelected: () => {
                if (confirm('تأكيد الحذف النهائي للسندات المحددة؟')) deleteMutation.mutate();
            },
            handleSaveVoucher: async (dataFromOutside?: any) => {
                const dataToSave = (dataFromOutside && Object.keys(dataFromOutside).length > 0) ? dataFromOutside : currentVoucher;
                return await saveMutation.mutateAsync(dataToSave);
            },
            handlePostSelected: () => postRecords(selectedIds),
            handleUnpostSelected: () => unpostRecords(selectedIds),
            handleBulkFixSave,
            exportToExcel: () => {}
        }
    };
}