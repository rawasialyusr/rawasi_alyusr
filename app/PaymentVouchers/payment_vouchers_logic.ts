"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

export function usePaymentVouchersLogic() {
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [globalSearch, setGlobalSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    // Modals States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentVoucher, setCurrentVoucher] = useState<any>({});

    // محاكاة جلب البيانات (يتم ربطها بـ Supabase الفعلي)
    useEffect(() => {
        fetchVouchers();
    }, []);

    const fetchVouchers = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('payment_vouchers')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setVouchers(data || []);
        } catch (error) {
            console.error("Error fetching vouchers:", error);
            toast.error("حدث خطأ أثناء جلب سندات الصرف");
        } finally {
            setIsLoading(false);
        }
    };

    // الفلترة الذكية
    const filteredVouchers = useMemo(() => {
        if (!globalSearch) return vouchers;
        const lowerSearch = globalSearch.toLowerCase();
        return vouchers.filter(v => 
            (v.payee_name && v.payee_name.toLowerCase().includes(lowerSearch)) ||
            (v.voucher_number && v.voucher_number.toLowerCase().includes(lowerSearch)) ||
            (v.description && v.description.toLowerCase().includes(lowerSearch))
        );
    }, [vouchers, globalSearch]);

    const totalAmount = useMemo(() => filteredVouchers.reduce((sum, v) => sum + Number(v.amount || 0), 0), [filteredVouchers]);

    // الإجراءات
    const handleAddNew = () => {
        setCurrentVoucher({ 
            date: new Date().toISOString().split('T')[0],
            payment_method: 'تحويل بنكي'
        });
        setIsEditModalOpen(true);
    };

    const handleEditSelected = () => {
        const selected = vouchers.find(v => v.id === selectedIds[0]);
        if (selected) {
            setCurrentVoucher(selected);
            setIsEditModalOpen(true);
        }
    };

    const handleSaveVoucher = async () => {
        setIsSaving(true);
        const toastId = toast.loading('جاري حفظ سند الصرف...');
        try {
            const voucherData = { ...currentVoucher };
            if (!voucherData.voucher_number) {
                voucherData.voucher_number = `PV-${Date.now().toString().slice(-6)}`;
            }

            if (voucherData.id) {
                await supabase.from('payment_vouchers').update(voucherData).eq('id', voucherData.id);
                toast.success('تم التعديل بنجاح', { id: toastId });
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                voucherData.created_by = session?.user?.id;
                await supabase.from('payment_vouchers').insert([voucherData]);
                toast.success('تم إصدار السند بنجاح', { id: toastId });
            }
            setIsEditModalOpen(false);
            fetchVouchers();
            setSelectedIds([]);
        } catch (error) {
            toast.error('خطأ في الحفظ', { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (!confirm('هل أنت متأكد من حذف السندات المحددة؟')) return;
        const toastId = toast.loading('جاري الحذف...');
        try {
            await supabase.from('payment_vouchers').delete().in('id', selectedIds);
            toast.success('تم الحذف بنجاح', { id: toastId });
            setSelectedIds([]);
            fetchVouchers();
        } catch (error) {
            toast.error('حدث خطأ أثناء الحذف', { id: toastId });
        }
    };

    const handlePostSelected = async () => {
        const toastId = toast.loading('جاري الاعتماد والترحيل...');
        try {
            await supabase.from('payment_vouchers').update({ is_posted: true }).in('id', selectedIds);
            toast.success('تم ترحيل السندات المحددة بنجاح', { id: toastId });
            setSelectedIds([]);
            fetchVouchers();
        } catch (error) {
            toast.error('فشل في الترحيل', { id: toastId });
        }
    };

    const handleUnpostSelected = async () => {
        // نفس كود الترحيل ولكن is_posted: false
        const toastId = toast.loading('جاري فك الترحيل...');
        try {
            await supabase.from('payment_vouchers').update({ is_posted: false }).in('id', selectedIds);
            toast.success('تم فك ترحيل السندات', { id: toastId });
            setSelectedIds([]);
            fetchVouchers();
        } catch (error) {
            toast.error('فشل في فك الترحيل', { id: toastId });
        }
    };

    const exportToExcel = () => {
        // اللوجيك هيتباصى للجدول الذكي وهو هيقوم بالباقي
    };

    return {
        isLoading, isSaving, globalSearch, setGlobalSearch,
        filteredVouchers, totalAmount, selectedIds, setSelectedIds,
        currentPage, setCurrentPage, rowsPerPage, setRowsPerPage,
        isEditModalOpen, setIsEditModalOpen, currentVoucher, setCurrentVoucher,
        handleAddNew, handleEditSelected, handleDeleteSelected, handleSaveVoucher,
        handlePostSelected, handleUnpostSelected, exportToExcel
    };
}