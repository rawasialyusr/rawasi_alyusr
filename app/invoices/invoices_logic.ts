"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase'; 

export function useInvoicesLogic() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]); 
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // حالات البحث والفلترة
    const [globalSearch, setGlobalSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // حالات التحديد والصفحات
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    // حالات المودال
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<any>({ lines: [] });

   const fetchFullData = useCallback(async () => {
        setIsLoading(true);
        // 🚀 السر هنا: select('*, partners(*)') عشان نجيب الرقم الضريبي والعنوان
        const { data: inv, error: invError } = await supabase
    .from('invoices')
    .select('*, partners(*)') // 👈 الـ partners(*) دي هي اللي بتجيب الرقم الضريبي والعنوان
    .order('date', { ascending: false });

        const { data: proj } = await supabase.from('projects').select('*');
        
        setInvoices(inv || []);
        setProjects(proj || []);
        setIsLoading(false);
    }, []);

    useEffect(() => { fetchFullData(); }, [fetchFullData]);

    // الفلترة الذكية
    const allFiltered = useMemo(() => {
        return invoices.filter(inv => {
            const matchesSearch = inv.invoice_number?.toLowerCase().includes(globalSearch.toLowerCase()) || 
                                  inv.client_name?.toLowerCase().includes(globalSearch.toLowerCase());
            return matchesSearch;
        });
    }, [invoices, globalSearch]);

    // التقسيم لصفحات (Pagination)
    const paginatedInvoices = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return allFiltered.slice(start, start + rowsPerPage);
    }, [allFiltered, currentPage, rowsPerPage]);

    // الإحصائيات (KPIs)
    const kpis = useMemo(() => ({
        total: allFiltered.length,
        posted: allFiltered.filter(i => i.status === 'مُعتمد').length,
        pending: allFiltered.filter(i => i.status !== 'مُعتمد').length
    }), [allFiltered]);

    // الدوال
    const handleAddNew = () => { setCurrentRecord({ lines: [], date: new Date().toISOString() }); setIsEditModalOpen(true); };
    const handleEdit = (inv: any) => { setCurrentRecord(inv); setIsEditModalOpen(true); };
    
    const handlePostSelected = async () => {
        if(!selectedIds.length) return;
        await supabase.from('invoices').update({ status: 'مُعتمد' }).in('id', selectedIds);
        fetchFullData();
        setSelectedIds([]);
    };

    const handleUnpostSelected = async () => {
        if(!selectedIds.length) return;
        await supabase.from('invoices').update({ status: 'معلق' }).in('id', selectedIds);
        fetchFullData();
        setSelectedIds([]);
    };

    const handleDeleteSelected = async () => {
        if(!selectedIds.length || !confirm("حذف المختار؟")) return;
        await supabase.from('invoices').delete().in('id', selectedIds);
        fetchFullData();
        setSelectedIds([]);
    };

    const handleSave = async (record: any) => {
    setIsSaving(true);
    try {
        // 🚀 دالة مساعدة لتنظيف الـ UUIDs (تحول النص الفاضي لـ null عشان الداتابيز متزعلش وتجيب خطأ 400)
        const cleanId = (id: any) => (id && typeof id === 'string' && id.trim() !== '') ? id : null;

        // تنظيف الداتا وتجهيزها للـ Schema الجديدة
        const payload = {
            invoice_number: record.invoice_number,
            date: record.date,
            partner_id: cleanId(record.partner_id),
            client_name: record.client_name || null,
            project_ids: (record.project_ids && record.project_ids.length > 0) ? record.project_ids : null, // 🚀 مصفوفة العماير (ترسل null إذا كانت فارغة)
            boq_id: cleanId(record.boq_id),
            description: record.description || null,
            quantity: Number(record.quantity) || 0,
            unit: record.unit || 'عدد',
            unit_price: Number(record.unit_price) || 0,
            line_total: Number(record.line_total) || 0,
            materials_discount: Number(record.materials_discount) || 0,
            taxable_amount: Number(record.taxable_amount) || 0,
            tax_amount: Number(record.tax_amount) || 0,
            guarantee_percent: Number(record.guarantee_percent) || 0,
            guarantee_amount: Number(record.guarantee_amount) || 0,
            total_amount: Number(record.total_amount) || 0,
            debit_account_id: cleanId(record.debit_account_id),
            credit_account_id: cleanId(record.credit_account_id),
            materials_acc_id: cleanId(record.materials_acc_id),
            guarantee_acc_id: cleanId(record.guarantee_acc_id),
            tax_acc_id: cleanId(record.tax_acc_id),
            skip_zatca: record.skip_zatca || false,
            status: record.status || 'معلق'
        };

        if (record.id) {
            // Update
            const { error } = await supabase.from('invoices').update(payload).eq('id', record.id);
            if (error) throw error;
        } else {
            // Insert
            const { error } = await supabase.from('invoices').insert([payload]);
            if (error) throw error;
        }

        // نجاح الحفظ
        setIsEditModalOpen(false);
        // 🚀 هنا بتعمل Refresh للبيانات بتاعتك عشان تظهر في الجدول فوراً
        fetchFullData(); 
        
    } catch (error) {
        console.error("Error saving invoice:", error);
        alert("حدث خطأ أثناء الحفظ، راجع الكونسول!");
    } finally {
        setIsSaving(false);
    }
};

    return {
        invoices: paginatedInvoices,
        allFiltered,
        projects,
        isLoading,
        isSaving,
        globalSearch, setGlobalSearch,
        dateFrom, setDateFrom,
        dateTo, setDateTo,
        selectedIds, setSelectedIds,
        currentPage, setCurrentPage,
        rowsPerPage, setRowsPerPage,
        kpis,
        isEditModalOpen, setIsEditModalOpen,
        currentRecord, setCurrentRecord,
        handleAddNew, handleEdit, handleSave,
        handlePostSelected, handleUnpostSelected, handleDeleteSelected
    };
}