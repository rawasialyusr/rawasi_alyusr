"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 

export function useInvoicesLogic() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]); 
    const [partners, setPartners] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]); 
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [globalSearch, setGlobalSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    const defaultInv = { 
        date: new Date().toISOString().split('T')[0], 
        type: 'مستخلص مالك', 
        invoice_number: '', client_name: '', project_id: '', property_name: '',
        material_discount: 0, 
        retention_percentage: 5, 
        retention_amount: 0,
        tax_amount: 0, total_amount: 0, net_amount: 0, note: '',
        creditor_account_id: null, debtor_account_id: null, status: 'معلق',
        is_internal: false,
        lines: [{ id: Date.now().toString(), item_id: '', description: '', unit: 'مقطوعية', quantity: 1, unit_price: 0, total_price: 0 }]
    };

    const [currentRecord, setCurrentRecord] = useState<any>(defaultInv);

    // 🟢 معادلة الحسابات التلقائية (ضمان أعمال + ضريبة + خصم مواد)
    useEffect(() => {
        const lines = currentRecord.lines || [];
        const linesTotal = lines.reduce((sum: number, line: any) => sum + (Number(line.total_price) || 0), 0);
        const materialDiscount = Number(currentRecord.material_discount || 0);
        const retentionPct = Number(currentRecord.retention_percentage || 0);
        const retentionAmt = linesTotal * (retentionPct / 100);
        const taxAmt = linesTotal * 0.15; 
        const netAmt = linesTotal - retentionAmt - materialDiscount + taxAmt;

        if (netAmt !== currentRecord.net_amount || currentRecord.total_amount !== linesTotal) {
            setCurrentRecord((prev: any) => ({
                ...prev,
                total_amount: linesTotal,
                retention_amount: retentionAmt,
                tax_amount: taxAmt,
                net_amount: netAmt
            }));
        }
    }, [currentRecord.lines, currentRecord.material_discount, currentRecord.retention_percentage]);

    const fetchSupportData = async () => {
        setIsLoading(true);
        try {
            const [p, pr, it, ac, inv] = await Promise.all([
                supabase.from('partners').select('id, name'),
                supabase.from('projects').select('id, Property'),
                supabase.from('items').select('id, name, default_unit'),
                supabase.from('accounts').select('id, name, code'),
                supabase.from('invoices').select('*, invoice_lines(*)').order('date', { ascending: false })
            ]);
            if (p.data) setPartners(p.data);
            if (pr.data) setProjects(pr.data);
            if (it.data) setItems(it.data);
            if (ac.data) setAccounts(ac.data);
            if (inv.data) setInvoices(inv.data);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchSupportData(); }, []);

    // 🟢 1. الفلترة والبحث الذكي (هذا الجزء كان مفقوداً)
    const filteredInvoices = useMemo(() => {
        const search = globalSearch.toLowerCase().trim();
        if (!search) return invoices;
        return invoices.filter(inv => 
            (inv.invoice_number || '').toLowerCase().includes(search) || 
            (inv.client_name || '').toLowerCase().includes(search) ||
            (inv.property_name || '').toLowerCase().includes(search)
        );
    }, [invoices, globalSearch]);

    // 🟢 2. الترقيم (Pagination) (هذا المتغير الذي يسبب الخطأ لعدم وجوده)
    const paginatedInvoices = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filteredInvoices.slice(start, start + rowsPerPage);
    }, [filteredInvoices, currentPage, rowsPerPage]);

    // 🟢 3. حساب إجمالي الصفحات
    const totalPages = Math.ceil(filteredInvoices.length / rowsPerPage) || 1;

    // 🟢 إدارة العمليات
    const handleAddNew = () => { 
        setEditingId(null); 
        setCurrentRecord(defaultInv); 
        setIsEditModalOpen(true); 
    };

    const handleEditSelected = () => {
        if (selectedIds.length !== 1) return;
        const inv = invoices.find(i => i.id === selectedIds[0]);
        if (inv) { 
            const recordToEdit = { 
                ...inv, 
                lines: inv.invoice_lines && inv.invoice_lines.length > 0 ? inv.invoice_lines : defaultInv.lines 
            };
            setEditingId(inv.id); 
            setCurrentRecord(recordToEdit); 
            setIsEditModalOpen(true); 
        }
    };

    const handleSaveInvoice = async () => {
        setIsSaving(true);
        try {
            const { lines, invoice_lines, ...headerPayload } = currentRecord;
            let finalInvoiceId = editingId;
            if (editingId) {
                await supabase.from('invoices').update(headerPayload).eq('id', editingId);
                await supabase.from('invoice_lines').delete().eq('invoice_id', editingId);
            } else {
                const { data, error } = await supabase.from('invoices').insert([headerPayload]).select('id').single();
                if (error) throw error;
                finalInvoiceId = data.id;
            }
            if (lines) {
                const linesPayload = lines.map((l:any) => ({
                    invoice_id: finalInvoiceId,
                    item_id: l.item_id || null,
                    description: l.description,
                    unit: l.unit,
                    quantity: Number(l.quantity) || 0,
                    unit_price: Number(l.unit_price) || 0,
                    total_price: Number(l.total_price) || 0
                }));
                await supabase.from('invoice_lines').insert(linesPayload);
            }
            await fetchSupportData(); 
            setIsEditModalOpen(false); 
            setSelectedIds([]);
        } catch(err: any) { 
            alert("خطأ أثناء الحفظ: " + err.message); 
        } finally { 
            setIsSaving(false); 
        }
    };

    const handleDeleteSelected = async () => {
        if (!confirm("هل أنت متأكد من حذف المستندات المختارة نهائياً؟")) return;
        await supabase.from('invoices').delete().in('id', selectedIds);
        await fetchSupportData(); 
        setSelectedIds([]);
    };

    const handlePostSingle = async (id: string) => {
        await supabase.from('invoices').update({ status: 'مُعتمد' }).eq('id', id);
        await fetchSupportData();
    };

    const handlePostSelected = async () => {
        await supabase.from('invoices').update({ status: 'مُعتمد' }).in('id', selectedIds);
        await fetchSupportData(); 
        setSelectedIds([]);
    };

    const handleUnpostSelected = async () => {
        await supabase.from('invoices').update({ status: 'معلق' }).in('id', selectedIds);
        await fetchSupportData(); 
        setSelectedIds([]);
    };

    return {
        projects, partners, items, accounts, invoices, paginatedInvoices,
        isEditModalOpen, setIsEditModalOpen, currentRecord, setCurrentRecord, 
        isSaving, handleAddNew, handleSaveInvoice, 
        globalSearch, setGlobalSearch, selectedIds, setSelectedIds,
        currentPage, setCurrentPage, rowsPerPage, setRowsPerPage,
        totalPages,
        handleEditSelected, handleDeleteSelected, handlePostSelected, handleUnpostSelected, handlePostSingle,
        handleLineChange: (index: number, field: string, value: any) => {
            const newLines = [...currentRecord.lines];
            newLines[index][field] = value;
            if (field === 'item_id') {
                const item = items.find(it => it.id === value);
                if (item) { 
                    newLines[index].description = item.name; 
                    newLines[index].unit = item.default_unit || 'مقطوعية'; 
                }
            }
            if (field === 'quantity' || field === 'unit_price') {
                newLines[index].total_price = Number(newLines[index].quantity || 0) * Number(newLines[index].unit_price || 0);
            }
            setCurrentRecord({...currentRecord, lines: newLines});
        },
        handleAddLine: () => {
            setCurrentRecord((prev:any) => ({
                ...prev,
                lines: [...(prev.lines || []), { id: Date.now().toString(), item_id: '', description: '', unit: 'مقطوعية', quantity: 1, unit_price: 0, total_price: 0 }]
            }));
        },
        handleRemoveLine: (index: number) => {
            setCurrentRecord((prev:any) => ({ ...prev, lines: prev.lines.filter((_:any, i:number) => i !== index) }));
        },
        isLoading, editingId,
        kpis: {
            total: invoices.length,
            posted: invoices.filter(i => i.status === 'مُعتمد').length,
            pending: invoices.filter(i => i.status !== 'مُعتمد').length,
            totalNet: invoices.filter(i => i.status === 'مُعتمد').reduce((sum, i) => sum + (Number(i.net_amount) || 0), 0)
        }
    };
}