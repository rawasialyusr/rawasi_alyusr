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
    
    // 🚀 حالات التشيك بوكس والترتيب
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState('newest');

    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // 🖨️ متغيرات التحكم في مودال الطباعة
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printReceiptId, setPrintReceiptId] = useState<string | null>(null);

    // 📦 متغيرات مودال الصرف المباشر للموقع/المقاول
    const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
    const [selectedInvoiceItem, setSelectedInvoiceItem] = useState<any>(null);

    // 🚀 هيكل الفاتورة
    const initialInvoiceState = {
        id: null, 
        project_id: '', project_name: '',
        payee_id: '', payee_name: '',
        account_id: '', account_name: '',
        receipt_type: 'توريد شركة',
        exp_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [
            { item_id: null, item_name: '', work_item: '', quantity: 1, unit: 'وحدة', unit_price: 0, total_price: 0, boq_id: null, boq_item: '' }
        ]
    };
    const [invoiceData, setInvoiceData] = useState<any>(initialInvoiceState);

    // 📥 سحب الخامات مع بيانات الترحيل
    const { data: allMaterials = [], isLoading } = useQuery({
        queryKey: ['materials_logs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('material_receipt_lines')
                .select(`
                    id, 
                    item_id, 
                    item_name, 
                    quantity, 
                    unit, 
                    unit_price, 
                    total_price,
                    boq_item_id, 
                    boq:boq_budget(work_item), 
                    receipt:material_receipts (
                        id, 
                        receipt_number,
                        receipt_date, 
                        project_id, 
                        notes, 
                        status, 
                        receipt_type, 
                        is_posted, 
                        jv_id, 
                        created_at,
                        project:projects(Property), 
                        supplier:partners!supplier_id(id, name), 
                        account:accounts!account_id(id, name)
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(100000); // 🚀 كسر حاجز الـ 1000 سطر لسحب كل الفواتير

            if (error) throw error;

            return (data || []).map((line: any) => ({
                id: line.id,
                receipt_id: line.receipt?.id,
                receipt_no: line.receipt?.receipt_number, 
                item_id: line.item_id,
                work_item: line.item_name,
                item_name: line.item_name,
                quantity: line.quantity,
                // 💡 نعتبر الكمية المتاحة حالياً هي الكمية الكلية (يمكنك تعديلها لاحقاً لربطها بجدول الأرصدة)
                available_qty: line.quantity, 
                unit: line.unit,
                unit_price: line.unit_price,
                total_price: line.total_price,
                boq_id: line.boq_item_id,            // 🚀 تصحيح المسمى حسب الداتابيز
                boq_item: line.boq?.work_item,   
                exp_date: line.receipt?.receipt_date,
                created_at: line.receipt?.created_at,
                project_id: line.receipt?.project_id,
                project: line.receipt?.project,
                supplier: line.receipt?.supplier,
                account: line.receipt?.account,
                status: line.receipt?.status,
                notes: line.receipt?.notes,
                receipt_type: line.receipt?.receipt_type, 
                is_posted: line.receipt?.is_posted,
                jv_id: line.receipt?.jv_id 
            }));
        }
    });

    // 📥 سحب المشاريع النشطة للفلترة
    const { data: projects = [] } = useQuery({
        queryKey: ['active_projects_materials'],
        queryFn: async () => {
            const { data } = await supabase
                .from('projects')
                .select('id, Property, project_code')
                .neq('status', 'منتهي');
            return data || [];
        }
    });

    const filteredData = useMemo(() => {
        let result = allMaterials.filter(mat => {
            const matchSearch = !globalSearch || 
                mat.work_item?.toLowerCase().includes(globalSearch.toLowerCase()) || 
                mat.supplier?.name?.toLowerCase().includes(globalSearch.toLowerCase()) ||
                mat.receipt_no?.toLowerCase().includes(globalSearch.toLowerCase());
            const matchProject = filterProject === 'الكل' || mat.project_id === filterProject;
            const matchDate = (!dateFrom || mat.exp_date >= dateFrom) && (!dateTo || mat.exp_date <= dateTo);
            return matchSearch && matchProject && matchDate;
        });

        // 🚀 الفلترة والترتيب
        result.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.created_at || b.exp_date).getTime() - new Date(a.created_at || a.exp_date).getTime();
            if (sortBy === 'oldest') return new Date(a.created_at || a.exp_date).getTime() - new Date(b.created_at || b.exp_date).getTime();
            if (sortBy === 'highest_price') return (b.total_price || 0) - (a.total_price || 0);
            if (sortBy === 'lowest_price') return (a.total_price || 0) - (b.total_price || 0);
            return 0;
        });

        return result;
    }, [allMaterials, globalSearch, filterProject, dateFrom, dateTo, sortBy]);

    const kpis = useMemo(() => {
        return filteredData.reduce((acc, curr) => ({
            totalCost: acc.totalCost + (Number(curr.total_price) || 0),
            totalTransactions: acc.totalTransactions + 1 
        }), { totalCost: 0, totalTransactions: 0 });
    }, [filteredData]);

    const handleAddItem = () => {
        setInvoiceData({
            ...invoiceData,
            items: [...invoiceData.items, { item_id: null, item_name: '', work_item: '', quantity: 1, unit: 'وحدة', unit_price: 0, total_price: 0, boq_id: null, boq_item: '' }]
        });
    };

    const handleRemoveItem = (index: number) => {
        const newItems = invoiceData.items.filter((_:any, i:number) => i !== index);
        setInvoiceData({ ...invoiceData, items: newItems });
    };

    const handleItemChange = (index: number, field: string, value: string | number | null) => {
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

    // 💾 دالة الحفظ
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!invoiceData.project_id || !invoiceData.payee_id || !invoiceData.account_id) {
                throw new Error("يرجى اختيار المشروع، المورد، والحساب المالي.");
            }

            let receiptId = invoiceData.id;

            if (receiptId) {
                await supabase.rpc('rpc_unpost_material', { p_id: receiptId });

                const { error: masterError } = await supabase
                    .from('material_receipts')
                    .update({
                        project_id: invoiceData.project_id,
                        supplier_id: invoiceData.payee_id,
                        account_id: invoiceData.account_id,
                        receipt_date: invoiceData.exp_date,
                        receipt_type: invoiceData.receipt_type,
                        total_amount: grandTotal,
                        notes: invoiceData.notes || 'توريد خامات',
                        status: 'مُعتمد',
                        is_posted: false 
                    })
                    .eq('id', receiptId);
                if (masterError) throw masterError;

                await supabase.from('material_receipt_lines').delete().eq('receipt_id', receiptId);

            } else {
                const { data: masterData, error: masterError } = await supabase
                    .from('material_receipts')
                    .insert([{
                        receipt_number: `MAT-${Date.now().toString().slice(-6)}`,
                        project_id: invoiceData.project_id,
                        supplier_id: invoiceData.payee_id,
                        account_id: invoiceData.account_id,
                        receipt_date: invoiceData.exp_date,
                        receipt_type: invoiceData.receipt_type,
                        total_amount: grandTotal,
                        notes: invoiceData.notes || 'توريد خامات',
                        status: 'مُعتمد',
                        is_posted: false 
                    }])
                    .select('id').single();

                if (masterError) throw masterError;
                receiptId = masterData.id;
            }

            const linesPayload = invoiceData.items.map((item: any) => ({
                receipt_id: receiptId,
                item_id: item.item_id || null, 
                item_name: item.work_item || item.item_name,
                quantity: Number(item.quantity) || 1,
                unit: item.unit || 'وحدة',
                unit_price: Number(item.unit_price) || 0,
                total_price: Number(item.total_price) || 0,
                boq_item_id: item.boq_id || null  // 🚀 تصحيح المسمى حسب الداتابيز
            }));

            const { error: linesError } = await supabase.from('material_receipt_lines').insert(linesPayload);
            if (linesError) throw linesError;

            return receiptId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['materials_logs'] });
            setIsModalOpen(false);
            setInvoiceData(initialInvoiceState);
            setSelectedIds([]); 
            showToast("تم حفظ الفاتورة بنجاح (معلقة في انتظار الترحيل) ⏳", "success");
        },
        onError: (err: any) => showToast(`خطأ: ${err.message}`, "error")
    });

    const actionMutation = useMutation({
        mutationFn: async ({ action, id }: { action: string, id: string }) => {
            let rpcName = '';
            if (action === 'post') rpcName = 'rpc_post_material';
            if (action === 'unpost') rpcName = 'rpc_unpost_material';
            if (action === 'delete') rpcName = 'rpc_delete_material_receipt';

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

    // 🚀 دالة الصرف من الفاتورة مباشرة
    const dispenseMaterialMutation = useMutation({
        mutationFn: async (data: any) => {
            // 1. إنشاء رأس إذن الصرف 
            const issuePayload = {
                issue_number: `ISS-${Date.now().toString().slice(-6)}`,
                project_id: data.project_id,
                subcontractor_id: data.issue_type === 'صرف لمقاول' ? data.subcontractor_id : null,
                issue_date: data.issue_date,
                issue_type: data.issue_type,
                total_amount: data.quantity * data.item.unit_price,
                notes: data.issue_type === 'صرف لمقاول' ? `منصرف ومحمل على المقاول مباشر من المشتريات` : `استهلاك مباشر من المشتريات`,
                is_posted: true // 🚀 يتم ترحيله مباشرة ليظهر في المستخلصات
            };
    
            const { data: issueRecord, error: issueError } = await supabase
                .from('material_issues')
                .insert([issuePayload])
                .select().single();
    
            if (issueError) throw new Error(issueError.message);
    
            // 2. إنشاء تفاصيل الإذن (ربط الخامة)
            const linePayload = {
                issue_id: issueRecord.id,
                item_id: data.item.item_id || null, 
                item_name: data.item.item_name,
                quantity: data.quantity,
                unit: data.item.unit,
                unit_price: data.item.unit_price,
                total_price: data.quantity * data.item.unit_price,
                boq_id: data.boq_id || null,
                boq_item_id: data.boq_item_id || null
            };
    
            const { error: lineError } = await supabase.from('material_issue_lines').insert([linePayload]);
            if (lineError) throw new Error(lineError.message);
    
            // 3. الترحيل المحاسبي للإذن من الداتابيز
            const { error: rpcError } = await supabase.rpc('rpc_post_material_issue', { p_id: issueRecord.id });
            if (rpcError) throw new Error(rpcError.message);
        },
        onSuccess: () => {
            showToast("تم صرف الخامة للموقع بنجاح 🚀", "success");
            setIsDispenseModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['materials_logs'] }); // تحديث الشاشة
        },
        onError: (err: any) => showToast(`خطأ في الصرف: ${err.message}`, "error")
    });

    const handleOpenDispense = (item: any) => {
        setSelectedInvoiceItem(item);
        setIsDispenseModalOpen(true);
    };

    // 🚀 دالة سحب بيانات الفاتورة المحددة وعرضها
    const populateEditModal = (receipt_id: string) => {
        const lines = allMaterials.filter((d: any) => d.receipt_id === receipt_id);
        if (lines.length > 0) {
            const first = lines[0];
            setInvoiceData({
                id: receipt_id, 
                project_id: first.project_id || '',
                project_name: first.project?.Property || '', 
                payee_id: first.supplier?.id || '',
                payee_name: first.supplier?.name || '',      
                account_id: first.account?.id || '',
                account_name: first.account?.name || '',     
                receipt_type: first.receipt_type || 'توريد شركة',
                exp_date: first.exp_date || new Date().toISOString().split('T')[0],
                notes: first.notes || '',
                items: lines.map((l: any) => ({
                    item_id: l.item_id || null,
                    item_name: l.item_name || '',
                    work_item: l.work_item || '',
                    quantity: l.quantity || 1,
                    unit: l.unit || 'وحدة',
                    unit_price: l.unit_price || 0,
                    total_price: l.total_price || 0,
                    boq_id: l.boq_id || null, // 🚀 مسحوبة صح من فوق
                    boq_item: l.boq_item || '' 
                }))
            });
            setIsModalOpen(true);
        }
    };

    return {
        data: filteredData, projects, kpis, isLoading,
        globalSearch, setGlobalSearch, filterProject, setFilterProject, dateFrom, setDateFrom, dateTo, setDateTo,
        isModalOpen, setIsModalOpen, openAddModal: () => { setInvoiceData(initialInvoiceState); setIsModalOpen(true); },
        isPrintModalOpen, setIsPrintModalOpen, printReceiptId, setPrintReceiptId,
        invoiceData, setInvoiceData, handleAddItem, handleRemoveItem, handleItemChange, grandTotal,
        handleSave: () => saveMutation.mutate(),
        
        sortBy, setSortBy, selectedIds, setSelectedIds,
        
        // 🚀 متوافقة مع الشجرة (تعمل بالفاتورة وليس السطر)
        handleSelectAll: (e: any) => {
            if (e.target.checked) {
                const allReceiptIds = Array.from(new Set(filteredData.map((d: any) => d.receipt_id).filter(Boolean)));
                setSelectedIds(allReceiptIds as string[]);
            } else {
                setSelectedIds([]);
            }
        },

        handleSelectRow: (id: string) => {
            setSelectedIds(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
        },

        handleEdit: populateEditModal, 
        
        handleEditSelected: () => {
            if (selectedIds.length !== 1) {
                showToast("الرجاء تحديد فاتورة واحدة لتعديلها.", "warning");
                return;
            }
            populateEditModal(selectedIds[0]); // 🚀 سحب مباشر برقم الفاتورة
        },

        handleBulkAction: async (action: 'post' | 'unpost' | 'delete') => {
            try {
                if (selectedIds.length === 0) return;

                const rpcMap: any = { 
                    post: 'rpc_post_material', 
                    unpost: 'rpc_unpost_material', 
                    delete: 'rpc_delete_material_receipt' 
                };

                for (const rId of selectedIds) {
                    const { error } = await supabase.rpc(rpcMap[action], { p_id: rId });
                    if (error) throw error;
                }

                showToast("تم تنفيذ العملية بنجاح على الفواتير المحددة ✅", "success");
                setSelectedIds([]); 
                queryClient.invalidateQueries({ queryKey: ['materials_logs'] });
            } catch (err: any) {
                showToast(`خطأ في التنفيذ الجماعي: ${err.message}`, "error");
            }
        },

        handleAction: (action: string, id: string) => actionMutation.mutate({ action, id }),
        isActionPending: actionMutation.isPending,
        canAdd: can('materials', 'add'),

        // 📤 إضافات الصرف للموقع / المقاول
        isDispenseModalOpen, setIsDispenseModalOpen,
        selectedInvoiceItem, setSelectedInvoiceItem,
        handleOpenDispense,
        dispenseMaterialMutation
    };
}