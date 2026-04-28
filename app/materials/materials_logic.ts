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
    
    // 🖨️ متغيرات التحكم في مودال الطباعة (الجديدة)
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printReceiptId, setPrintReceiptId] = useState<string | null>(null);

    // 🚀 هيكل الفاتورة المتعددة الأصناف للواجهة (لم يتغير لضمان استقرار الـ UI)
    const initialInvoiceState = {
        project_id: '',
        payee_id: '', // سيتم ترجمته لـ supplier_id في الداتابيز
        account_id: '', 
        exp_date: new Date().toISOString().split('T')[0], // سيتم ترجمته لـ receipt_date
        notes: '',
        items: [
            { work_item: '', quantity: 1, unit: 'طن', unit_price: 0, total_price: 0 }
        ]
    };
    const [invoiceData, setInvoiceData] = useState<any>(initialInvoiceState);

    // 📥 سحب الخامات (تم التحديث لجلب الـ id الخاص برأس الفاتورة للطباعة)
    const { data: allMaterials = [], isLoading } = useQuery({
        queryKey: ['materials_logs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('material_receipt_lines')
                .select(`
                    id, item_name, quantity, unit, unit_price, total_price,
                    receipt:material_receipts (
                        id, receipt_date, project_id, notes, status,
                        project:projects(Property), 
                        supplier:partners!supplier_id(name), 
                        account:accounts!account_id(name)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // 🚀 السحر هنا: إعادة تشكيل البيانات (Data Mapping) وإضافة receipt_id
            return (data || []).map((line: any) => ({
                id: line.id,
                receipt_id: line.receipt?.id, // 👈 مهم جداً عشان الطباعة تجمع الفاتورة
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
                status: line.receipt?.status
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
            totalTransactions: acc.totalTransactions + 1 // يمثل عدد الأصناف الموردة
        }), { totalCost: 0, totalTransactions: 0 });
    }, [filteredData]);

    // 🚀 دوال إدارة الفاتورة المتعددة
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
            const qty = Number(newItems[index].quantity) || 0;
            const price = Number(newItems[index].unit_price) || 0;
            newItems[index].total_price = qty * price;
        }
        
        setInvoiceData({ ...invoiceData, items: newItems });
    };

    const grandTotal = useMemo(() => {
        return invoiceData.items.reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0);
    }, [invoiceData.items]);

    // 💾 دالة الحفظ (Master-Detail Insert)
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!invoiceData.project_id || !invoiceData.payee_id || !invoiceData.account_id) {
                throw new Error("يرجى اختيار المشروع، المورد، والحساب المالي.");
            }
            if (!invoiceData.items || invoiceData.items.length === 0) {
                throw new Error("يجب إضافة صنف واحد على الأقل للإذن.");
            }

            // 1️⃣ إنشاء رأس الفاتورة (Master Record)
            const masterPayload = {
                receipt_number: `MAT-${Date.now()}`, // توليد رقم فريد آلياً
                project_id: invoiceData.project_id,
                supplier_id: invoiceData.payee_id, // ربط المورد
                account_id: invoiceData.account_id, // التوجيه المالي
                receipt_date: invoiceData.exp_date,
                total_amount: grandTotal,
                notes: invoiceData.notes || 'فاتورة توريد خامات مباشرة',
                status: 'مُعتمد' // كبسولة مستقبلية لدورة الاعتمادات
            };

            const { data: masterData, error: masterError } = await supabase
                .from('material_receipts')
                .insert([masterPayload])
                .select('id')
                .single();

            if (masterError) throw new Error("فشل إنشاء رأس الفاتورة: " + masterError.message);
            const receiptId = masterData.id;

            // 2️⃣ تجهيز الأصناف وربطها برقم الفاتورة (Detail Records)
            const linesPayload = invoiceData.items.map((item: any) => ({
                receipt_id: receiptId,
                item_name: item.work_item, // ترجمة لاسم العمود الجديد
                quantity: Number(item.quantity) || 1,
                unit: item.unit || 'وحدة',
                unit_price: Number(item.unit_price) || 0,
                total_price: Number(item.total_price) || 0,
                boq_id: null // مجهز للمستقبل لربط الخامة بالـ WBS
            }));

            const { error: linesError } = await supabase
                .from('material_receipt_lines')
                .insert(linesPayload);

            if (linesError) throw new Error("فشل إدراج الأصناف: " + linesError.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['materials_logs'] });
            setIsModalOpen(false);
            setInvoiceData(initialInvoiceState);
            showToast("تم توريد الفاتورة المجمعة بنجاح 🧱✅", "success");
        },
        onError: (err: any) => showToast(`خطأ: ${err.message}`, "error")
    });

    const openAddModal = () => {
        setInvoiceData(initialInvoiceState);
        setIsModalOpen(true);
    };

    return {
        data: filteredData, projects, kpis, isLoading,
        globalSearch, setGlobalSearch, filterProject, setFilterProject, dateFrom, setDateFrom, dateTo, setDateTo,
        
        isModalOpen, setIsModalOpen, openAddModal,
        
        // 🖨️ تصدير متغيرات الطباعة الجديدة للواجهة
        isPrintModalOpen, setIsPrintModalOpen,
        printReceiptId, setPrintReceiptId,

        invoiceData, setInvoiceData, handleAddItem, handleRemoveItem, handleItemChange, grandTotal,
        handleSave: () => saveMutation.mutate(),
        canAdd: can('materials', 'add')
    };
}