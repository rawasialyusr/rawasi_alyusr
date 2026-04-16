"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase'; 
import * as XLSX from 'xlsx';

export function useInvoicesLogic() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]); 
    const [partners, setPartners] = useState<any[]>([]);
    const [boqItems, setBoqItems] = useState<any[]>([]); 
    const [items, setItems] = useState<any[]>([]); 
    const [accounts, setAccounts] = useState<any[]>([]); 
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [globalSearch, setGlobalSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterStatus, setFilterStatus] = useState('الكل');

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    const defaultInv = { 
        date: new Date().toISOString().split('T')[0], 
        type: 'مستخلص مالك', 
        invoice_number: '', 
        client_name: '', 
        project_id: '', 
        property_name: '',
        material_discount: 0, 
        discount_account_id: null, 
        retention_percentage: 5, 
        retention_amount: 0,
        tax_amount: 0, 
        total_amount: 0, 
        net_amount: 0, 
        note: '',
        creditor_account_id: null, 
        debtor_account_id: null, 
        status: 'معلق',
        is_internal: false,
        lines: [{ 
            id: Date.now().toString(), 
            item_id: '', 
            description: '', 
            unit: 'مقطوعية', 
            quantity: 1, 
            unit_price: 0, 
            total_price: 0 
        }]
    };

    const [currentRecord, setCurrentRecord] = useState<any>(defaultInv);

    const generateAutoNumber = useCallback((data: any[]) => {
        if (!data || data.length === 0) return "INV-1001";
        const numericParts = data.map(i => {
            const match = (i.invoice_number || "").match(/\d+/);
            return match ? parseInt(match[0]) : 1000;
        });
        const max = Math.max(...numericParts, 1000);
        return `INV-${max + 1}`;
    }, []);

    const fetchFullData = async () => {
        setIsLoading(true);
        try {
            let allResults: any[] = [];
            let from = 0;
            let hasMore = true;
            
            while (hasMore) {
                const { data } = await supabase.from('invoices').select('*, invoice_lines(*)').order('date', { ascending: false }).range(from, from + 999);
                if (data && data.length > 0) {
                    allResults = [...allResults, ...data];
                    from += 1000;
                    if (data.length < 1000) hasMore = false;
                } else {
                    hasMore = false;
                }
            }
            setInvoices(allResults || []);

            const [p, pr, boq, it, ac] = await Promise.all([
                supabase.from('partners').select('id, name'),
                supabase.from('projects').select('id, "Property", project_code'), 
                supabase.from('boq_items').select('id, item_code, item_name, unit_of_measure'), // 🟢 جدول المقايسة الصحيح
                supabase.from('items').select('*'),
                supabase.from('accounts').select('id, name, code')
            ]);

            setPartners(p.data || []);
            setAccounts(ac.data || []);
            
            setProjects((pr.data || []).map((x:any) => ({
                ...x, id: x.id, display: x.project_code ? `${x.project_code} - ${x["Property"]}` : x["Property"]
            })));

            setBoqItems((boq.data || []).map((x:any) => ({
                ...x, id: x.id, display: `${x.item_code} - ${x.item_name}`
            })));

            const formattedItems = (it.data || []).map((x:any) => ({
                ...x, display: x.item_code ? `${x.item_code} - ${x.name || x.item_name}` : (x.name || x.item_name)
            }));
            setItems(formattedItems);

        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchFullData(); }, []);

    const historicalDescriptions = useMemo(() => {
        const texts = new Set<string>();
        invoices.forEach(inv => (inv.invoice_lines || []).forEach((l:any) => { if(l.description) texts.add(l.description); }));
        return Array.from(texts).map(t => ({ id: t, display: t }));
    }, [invoices]);

    useEffect(() => {
        if (!currentRecord.lines) return;
        
        const linesTotal = currentRecord.lines.reduce((sum: number, l: any) => sum + (Number(l.total_price) || 0), 0);
        const materialDiscount = Number(currentRecord.material_discount || 0);
        const retentionPct = Number(currentRecord.retention_percentage || 0);
        
        const retentionAmt = linesTotal * (retentionPct / 100);
        const taxableAmount = linesTotal - retentionAmt - materialDiscount;
        const taxAmt = taxableAmount * 0.15; 
        const netAmt = taxableAmount + taxAmt;

        if (Math.abs(netAmt - (currentRecord.net_amount || 0)) > 0.01 || Math.abs(linesTotal - (currentRecord.total_amount || 0)) > 0.01) {
            setCurrentRecord((prev: any) => ({
                ...prev,
                total_amount: Number(linesTotal.toFixed(2)),
                retention_amount: Number(retentionAmt.toFixed(2)),
                tax_amount: Number(taxAmt.toFixed(2)),
                net_amount: Number(netAmt.toFixed(2)),
                discount_account_id: materialDiscount > 0 ? prev.discount_account_id : null 
            }));
        }
    }, [currentRecord.lines, currentRecord.material_discount, currentRecord.retention_percentage]);

    const allFiltered = useMemo(() => {
        return (invoices || []).filter(inv => {
            const search = (globalSearch || '').toLowerCase().trim();
            const matchesSearch = !search || 
                (inv.invoice_number || '').toLowerCase().includes(search) || 
                (inv.client_name || '').toLowerCase().includes(search) ||
                (inv.property_name || '').toLowerCase().includes(search);

            const matchesStatus = filterStatus === 'الكل' || 
                (filterStatus === 'مرحل' && inv.status === 'مُعتمد') || 
                (filterStatus === 'معلق' && inv.status !== 'مُعتمد');

            const matchesDate = (!dateFrom || inv.date >= dateFrom) && (!dateTo || inv.date <= dateTo);

            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [invoices, globalSearch, filterStatus, dateFrom, dateTo]);

    const paginatedInvoices = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return (allFiltered || []).slice(start, start + rowsPerPage);
    }, [allFiltered, currentPage, rowsPerPage]);

    const handleSaveInvoice = async () => {
        if (!currentRecord.client_name) return alert("يرجى اختيار العميل");
        if (Number(currentRecord.material_discount) > 0 && !currentRecord.discount_account_id) {
            return alert("يرجى اختيار حساب لتوجيه خصم خامات العميل");
        }
        setIsSaving(true);
        try {
            const { lines, invoice_lines, projects, ...headerPayload } = currentRecord;
            let finalId = editingId;

            if (editingId) {
                const { error: hErr } = await supabase.from('invoices').update(headerPayload).eq('id', editingId);
                if (hErr) throw hErr;
                await supabase.from('invoice_lines').delete().eq('invoice_id', editingId);
            } else {
                const { data, error: iErr } = await supabase.from('invoices').insert([headerPayload]).select('id').single();
                if (iErr) throw iErr;
                finalId = data.id;
            }

            const linesPayload = (lines || []).map((l:any) => ({
                invoice_id: finalId, 
                item_id: l.item_id || null, 
                description: l.description,
                unit: l.unit, 
                quantity: Number(l.quantity) || 0, 
                unit_price: Number(l.unit_price) || 0, 
                total_price: Number(l.total_price) || 0
            }));
            
            if (linesPayload.length > 0) {
                const { error: lErr } = await supabase.from('invoice_lines').insert(linesPayload);
                if (lErr) throw lErr;
            }

            await fetchFullData(); 
            setIsEditModalOpen(false); 
            setSelectedIds([]);
        } catch(err: any) {
            alert("فشل الحفظ: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLineChange = (index: number, field: string, value: any) => {
        const newLines = [...(currentRecord.lines || [])];
        if (!newLines[index]) return;

        newLines[index][field] = value;
        
        // 🟢 زيتونة الربط: سحب الوصف والوحدة فور اختيار البند
        if (field === 'item_id') {
            const boqItem = boqItems.find(it => String(it.id) === String(value));
            const standardItem = items.find(it => String(it.id) === String(value));
            const foundItem = boqItem || standardItem;

            if (foundItem) { 
                newLines[index].description = foundItem.item_name || foundItem.name; 
                newLines[index].unit = foundItem.unit_of_measure || foundItem.unit || foundItem.default_unit || 'مقطوعية'; 
            }
        }
        
        if (field === 'quantity' || field === 'unit_price') {
            const q = Number(newLines[index].quantity || 0);
            const p = Number(newLines[index].unit_price || 0);
            newLines[index].total_price = Number((q * p).toFixed(2));
        }
        setCurrentRecord({...currentRecord, lines: newLines});
    };

    const exportToExcel = () => {
        const reportData = (allFiltered || []).map(i => ({
            "التاريخ": i.date,
            "رقم المستند": i.invoice_number,
            "العميل": i.client_name,
            "المشروع": i.property_name,
            "الإجمالي": i.total_amount,
            "الصافي": i.net_amount,
            "الحالة": i.status
        }));
        const ws = XLSX.utils.json_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "المستخلصات");
        XLSX.writeFile(wb, `Invoices_Export_${new Date().toLocaleDateString()}.xlsx`);
    };

    return {
        isLoading, isSaving, invoices: invoices || [], paginatedInvoices: paginatedInvoices || [], 
        projects: projects || [], partners: partners || [], 
        boqItems: boqItems || [], items: items || [], accounts: accounts || [], historicalDescriptions,
        globalSearch, setGlobalSearch, dateFrom, setDateFrom, dateTo, setDateTo, filterStatus, setFilterStatus,
        selectedIds: selectedIds || [], setSelectedIds, currentPage, setCurrentPage, rowsPerPage, setRowsPerPage,
        totalPages: Math.ceil((allFiltered?.length || 0) / rowsPerPage) || 1, totalResults: allFiltered?.length || 0,
        isEditModalOpen, setIsEditModalOpen, editingId, setEditingId, currentRecord, setCurrentRecord, 
        handleAddNew: () => { setEditingId(null); setCurrentRecord({ ...defaultInv, invoice_number: generateAutoNumber(invoices) }); setIsEditModalOpen(true); },
        handleSaveInvoice, exportToExcel,
        handleEditSelected: () => {
            if (selectedIds.length !== 1) return;
            const inv = invoices.find(i => i.id === selectedIds[0]);
            if (inv) { setEditingId(inv.id); setCurrentRecord({...inv, lines: inv.invoice_lines && inv.invoice_lines.length > 0 ? inv.invoice_lines : defaultInv.lines}); setIsEditModalOpen(true); }
        },
        handleDeleteSelected: async () => { if(selectedIds.length && confirm("حذف المختار نهائياً؟")) { await supabase.from('invoices').delete().in('id', selectedIds); await fetchFullData(); setSelectedIds([]); } },
        handlePostSelected: async () => { if(selectedIds.length) { await supabase.from('invoices').update({ status: 'مُعتمد' }).in('id', selectedIds); await fetchFullData(); setSelectedIds([]); } },
        handleUnpostSelected: async () => { if(selectedIds.length) { await supabase.from('invoices').update({ status: 'معلق' }).in('id', selectedIds); await fetchFullData(); setSelectedIds([]); } },
        handlePostSingle: async (id: string) => { await supabase.from('invoices').update({ status: 'مُعتمد' }).eq('id', id); await fetchFullData(); },
        handleLineChange,
        handleAddLine: () => setCurrentRecord((p:any)=>({...p, lines: [...(p.lines || []), { id: Date.now().toString(), item_id: '', description: '', unit: 'مقطوعية', quantity: 1, unit_price: 0, total_price: 0 }]})),
        handleRemoveLine: (index: number) => setCurrentRecord((p:any)=>({...p, lines: (p.lines || []).filter((_:any, i:number)=>i!==index)})),
        kpis: {
            total: allFiltered?.length || 0,
            posted: allFiltered?.filter(i => i.status === 'مُعتمد').length || 0,
            pending: allFiltered?.filter(i => i.status !== 'مُعتمد').length || 0,
            totalNet: allFiltered?.reduce((sum, i) => sum + (Number(i.net_amount) || 0), 0) || 0
        }
    };
}