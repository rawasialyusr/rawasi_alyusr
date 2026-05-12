"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';
import { usePermissions } from '@/lib/PermissionsContext';

export function useMaterialsLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { can } = usePermissions();

    const [globalSearch, setGlobalSearch] = useState('');
    const [filterProject, setFilterProject] = useState('الكل');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // 🖨️ متغيرات التحكم في مودال الطباعة
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printReceiptId, setPrintReceiptId] = useState<string | null>(null);

    // 🚀 هيكل الفاتورة المحدث ليشمل "نوع التوريد"
    const initialInvoiceState = {
        project_id: '',
        payee_id: '', // المورد أو العميل
        account_id: '', 
        receipt_type: 'توريد شركة', // 👈 'توريد شركة' أو 'توريد عميل'
        exp_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [
            { work_item: '', quantity: 1, unit: 'طن', unit_price: 0, total_price: 0 }
        ]
    };
    const [invoiceData, setInvoiceData] = useState<any>(initialInvoiceState);

    // 📥 سحب الخامات مع بيانات الترحيل ونوع التوريد
    const { data: allMaterials = [], isLoading } = useQuery({
        queryKey: ['materials_logs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('material_receipt_lines')
                .select(`
                    id, item_name, quantity, unit, unit_price, total_price,
                    receipt:material_receipts (
                        id, receipt_date, project_id, notes, status, receipt_type, is_posted, jv_id,
                        project:projects(Property), 
                        supplier:partners!supplier_id(name), 
                        account:accounts!account_id(name)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map((line: any) => ({
                id: line.id,
                receipt_id: line.receipt?.id,
                work_item: line.item_name,
                quantity: line.quantity,
                unit: line.unit,
                unit_price: line.unit_price,
                total_price: line.total_price,
                exp_date: line.receipt?.receipt_date,
                project_id: line.receipt?.project_id,
                project: line.receipt?.project,
                supplier: line.receipt?.supplier,
                account: line.receipt?.account,
                status: line.receipt?.status,
                receipt_type: line.receipt?.receipt_type, // 👈
                is_posted: line.receipt?.is_posted, // 👈
                jv_id: line.receipt?.jv_id // 👈
            }));
        }
    });

    const { data: projects = [] } = useQuery({
        queryKey: ['active_projects_materials'],
        queryFn: async () => {
            const { data } = await supabase.from('projects').select('id, Property, project_code').neq('status', 'منتهي');
            return data || [];
        }
    });

    const filteredData = useMemo(() => {
        return allMaterials.filter(mat => {
            const matchSearch = !globalSearch || 
                mat.work_item?.toLowerCase().includes(globalSearch.toLowerCase()) || 
                mat.supplier?.name?.toLowerCase().includes(globalSearch.toLowerCase());
            const matchProject = filterProject === 'الكل' || mat.project_id === filterProject;
            const matchDate = (!dateFrom || mat.exp_date >= dateFrom) && (!dateTo || mat.exp_date <= dateTo);
            return matchSearch && matchProject && matchDate;
        });
    }, [allMaterials, globalSearch, filterProject, dateFrom, dateTo]);

    const kpis = useMemo(() => {
        return filteredData.reduce((acc, curr) => ({
            totalCost: acc.totalCost + (Number(curr.total_price) || 0),
            totalTransactions: acc.totalTransactions + 1 
        }), { totalCost: 0, totalTransactions: 0 });
    }, [filteredData]);

    // 🚀 إدارة أصناف الفاتورة
    const handleAddItem = () => {
        setInvoiceData({
            ...invoiceData,
            items: [...invoiceData.items, { work_item: '', quantity: 1, unit: 'متر', unit_price: 0, total_price: 0 }]
        });
    };

    const handleRemoveItem = (index: number) => {
        const newItems = invoiceData.items.filter((_:any, i:number) => i !== index);
        setInvoiceData({ ...invoiceData, items: newItems });
    };

    const handleItemChange = (index: number, field: string, value: string | number) => {
        const newItems = [...invoiceData.items];
        newItems[index][field] = value;
        if (field === 'quantity' || field === 'unit_price') {
            newItems[index].total_price = (Number(newItems[index].quantity) || 0) * (Number(newItems[index].unit_price) || 0);
        }
        setInvoiceData({ ...invoiceData, items: newItems });
    };

    const grandTotal = useMemo(() => {
        return invoiceData.items.reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0);
    }, [invoiceData.items]);

    // 💾 دالة الحفظ + الترحيل الفوري
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!invoiceData.project_id || !invoiceData.payee_id || !invoiceData.account_id) {
                throw new Error("يرجى اختيار المشروع، المورد، والحساب المالي.");
            }

            // 1️⃣ رأس الفاتورة
            const { data: masterData, error: masterError } = await supabase
                .from('material_receipts')
                .insert([{
                    receipt_number: `MAT-${Date.now().toString().slice(-6)}`,
                    project_id: invoiceData.project_id,
                    supplier_id: invoiceData.payee_id,
                    account_id: invoiceData.account_id,
                    receipt_date: invoiceData.exp_date,
                    receipt_type: invoiceData.receipt_type, // 👈 توريد شركة أو عميل
                    total_amount: grandTotal,
                    notes: invoiceData.notes || 'توريد خامات',
                    status: 'مُعتمد',
                    is_posted: false
                }])
                .select('id').single();

            if (masterError) throw masterError;
            const receiptId = masterData.id;

            // 2️⃣ الأصناف
            const linesPayload = invoiceData.items.map((item: any) => ({
                receipt_id: receiptId,
                item_name: item.work_item,
                quantity: Number(item.quantity) || 1,
                unit: item.unit || 'وحدة',
                unit_price: Number(item.unit_price) || 0,
                total_price: Number(item.total_price) || 0
            }));

            const { error: linesError } = await supabase.from('material_receipt_lines').insert(linesPayload);
            if (linesError) throw linesError;

            // 3️⃣ 🚀 ترحيل محاسبي فوري عبر الـ RPC
            const { error: rpcError } = await supabase.rpc('rpc_post_material', { p_id: receiptId });
            if (rpcError) throw new Error("تم الحفظ ولكن فشل الترحيل: " + rpcError.message);

            return receiptId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['materials_logs'] });
            setIsModalOpen(false);
            setInvoiceData(initialInvoiceState);
            showToast("تم الحفظ والترحيل المحاسبي بنجاح 🧱🚀", "success");
        },
        onError: (err: any) => showToast(`خطأ: ${err.message}`, "error")
    });

    // ⚙️ دالة الأكشن (ترحيل / تعليق / مسح متسلسل)
    const actionMutation = useMutation({
        mutationFn: async ({ action, id }: { action: string, id: string }) => {
            let rpcName = '';
            if (action === 'post') rpcName = 'rpc_post_material';
            if (action === 'unpost') rpcName = 'rpc_unpost_material';
            if (action === 'delete') rpcName = 'rpc_delete_material_receipt'; // 👈 المسح المتسلسل

            const { error } = await supabase.rpc(rpcName, { p_id: id });
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            const msg = variables.action === 'delete' ? "تم حذف الإذن والقيود المربوطة 🗑️" : "تمت العملية بنجاح ✅";
            showToast(msg, "success");
            queryClient.invalidateQueries({ queryKey: ['materials_logs'] });
        },
        onError: (err: any) => showToast(`فشلت العملية: ${err.message}`, "error")
    });

    return {
        data: filteredData, projects, kpis, isLoading,
        globalSearch, setGlobalSearch, filterProject, setFilterProject, dateFrom, setDateFrom, dateTo, setDateTo,
        isModalOpen, setIsModalOpen, openAddModal: () => { setInvoiceData(initialInvoiceState); setIsModalOpen(true); },
        isPrintModalOpen, setIsPrintModalOpen, printReceiptId, setPrintReceiptId,
        invoiceData, setInvoiceData, handleAddItem, handleRemoveItem, handleItemChange, grandTotal,
        handleSave: () => saveMutation.mutate(),
        // ⚙️ تصدير الأكشن للواجهة
        handleAction: (action: string, id: string) => actionMutation.mutate({ action, id }),
        isActionPending: actionMutation.isPending,
        canAdd: can('materials', 'add')
    };
}