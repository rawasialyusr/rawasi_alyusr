"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';

export function useBoqCatalogLogic() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [globalSearch, setGlobalSearch] = useState('');
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
    
    // حالات المودال
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<any>({});

    // 📥 جلب الدليل بالكامل
    const { data: catalogItems = [], isLoading } = useQuery({
        queryKey: ['boq_items_catalog'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('boq_items')
                .select('*')
                .order('main_category')
                .order('sub_category')
                .order('item_name');
            if (error) throw error;
            return data || [];
        }
    });

    // 🚀 السحر المعماري: تحويل البيانات المسطحة إلى هيكل شجري (Tree Structure)
    const treeData = useMemo(() => {
        const tree: Record<string, Record<string, any[]>> = {};
        
        catalogItems.forEach(item => {
            // تطبيق البحث لو موجود
            const search = globalSearch.toLowerCase();
            if (search && !item.item_name.toLowerCase().includes(search) && 
                !item.main_category.toLowerCase().includes(search) && 
                !item.sub_category.toLowerCase().includes(search) &&
                !(item.item_code || '').toLowerCase().includes(search)) {
                return;
            }

            if (!tree[item.main_category]) {
                tree[item.main_category] = {};
            }
            if (!tree[item.main_category][item.sub_category]) {
                tree[item.main_category][item.sub_category] = [];
            }
            tree[item.main_category][item.sub_category].push(item);
        });
        
        return tree;
    }, [catalogItems, globalSearch]);

    // تبديل فتح/غلق فروع الشجرة
    const toggleNode = (nodeName: string) => {
        setExpandedNodes(prev => ({ ...prev, [nodeName]: !prev[nodeName] }));
    };

    // 🚀 [خوارزمية التكويد الذكية (Smart Coding Generator)]
    const generateItemCode = async (mainCat: string, subCat: string) => {
        // 1. تحديد الاختصار (Prefix) بناءً على الكلمات المفتاحية
        let prefix = 'GEN'; // عام
        if (mainCat.includes('إنشائ') || mainCat.includes('عظم') || mainCat.includes('حفر')) prefix = 'STR';
        else if (mainCat.includes('تشطيب') || mainCat.includes('معمار')) prefix = 'FIN';
        else if (mainCat.includes('كهروميكانيك') || mainCat.includes('كهرباء') || mainCat.includes('سباكة')) prefix = 'MEP';
        else if (mainCat.includes('إشراف') || mainCat.includes('إدار') || mainCat.includes('تصميم')) prefix = 'MGT';
        else if (mainCat.includes('موقع') || mainCat.includes('تجهيز')) prefix = 'SIT';

        // 2. سحب البنود لنفس القسم الرئيسي لمعرفة التسلسل
        const { data: existingItems } = await supabase
            .from('boq_items')
            .select('item_code, sub_category')
            .eq('main_category', mainCat);

        const items = existingItems || [];
        const itemsInSub = items.filter(i => i.sub_category === subCat);

        // 3. تحديد كود القسم الفرعي (Sub-Category Code)
        let subCodeStr = '';
        const existingSubItem = itemsInSub.find(i => i.item_code && i.item_code.includes('-'));
        
        if (existingSubItem) {
            // لو القسم الفرعي ده موجود قبل كده، اسحب الكود بتاعه
            subCodeStr = existingSubItem.item_code.split('-')[1];
        } else {
            // لو ده قسم فرعي جديد، هات أعلى رقم قسم فرعي وزود 1
            let maxSubNum = 0;
            items.forEach(item => {
                const parts = item.item_code?.split('-');
                if (parts && parts.length >= 2) {
                    const num = parseInt(parts[1], 10);
                    if (!isNaN(num) && num > maxSubNum) maxSubNum = num;
                }
            });
            subCodeStr = (maxSubNum + 1).toString().padStart(2, '0');
        }

        // 4. تحديد كود البند نفسه (Item Code) لتجنب التكرار
        let maxItemNum = 0;
        itemsInSub.forEach(item => {
            const parts = item.item_code?.split('-');
            if (parts && parts.length >= 3) {
                const num = parseInt(parts[2], 10);
                if (!isNaN(num) && num > maxItemNum) maxItemNum = num;
            }
        });
        const itemCodeStr = (maxItemNum + 1).toString().padStart(2, '0');

        return `${prefix}-${subCodeStr}-${itemCodeStr}`; // النتيجة النهائية: FIN-01-02
    };

    // 🚀 دالة الحفظ
    const saveItemMutation = useMutation({
        mutationFn: async (record: any) => {
            const mainCat = record.main_category || 'بند عام';
            const subCat = record.sub_category || 'مرحلة عامة';

            // إذا لم يتم إدخال كود يدوياً، قم بتوليده آلياً
            let finalItemCode = record.item_code;
            if (!finalItemCode || finalItemCode.trim() === '') {
                finalItemCode = await generateItemCode(mainCat, subCat);
            }
            
            const payload = {
                item_code: finalItemCode,
                main_category: mainCat,
                sub_category: subCat,
                item_name: record.item_name,
                unit_of_measure: record.unit_of_measure || 'مقطوعية'
            };

            if (record.id) {
                const { error } = await supabase.from('boq_items').update(payload).eq('id', record.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('boq_items').insert([payload]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            showToast("تم حفظ البند في الدليل الموحد بنجاح 📚✅", "success");
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['boq_items_catalog'] });
        },
        onError: (err: any) => showToast(`خطأ في الحفظ: ${err.message}`, "error")
    });

    const deleteItemMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('boq_items').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            showToast("تم مسح البند بنجاح 🗑️", "success");
            queryClient.invalidateQueries({ queryKey: ['boq_items_catalog'] });
        }
    });

    // استخراج قوائم فريدة لاستخدامها في الاقتراحات داخل المودال
    const uniqueMainCategories = Array.from(new Set(catalogItems.map(i => i.main_category)));
    const uniqueSubCategories = Array.from(new Set(catalogItems.map(i => i.sub_category)));

    return {
        treeData, catalogItems, isLoading, 
        globalSearch, setGlobalSearch,
        expandedNodes, toggleNode,
        isModalOpen, setIsModalOpen, currentRecord, setCurrentRecord,
        handleSaveItem: (data: any) => saveItemMutation.mutate(data),
        handleDeleteItem: (id: string) => { if(confirm("تأكيد الحذف النهائي؟")) deleteItemMutation.mutate(id); },
        isSaving: saveItemMutation.isPending,
        uniqueMainCategories, uniqueSubCategories
    };
}