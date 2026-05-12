"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';

export function useMaterialIssuesLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printReceiptId, setPrintReceiptId] = useState<string | null>(null);
    
    // 🚀 حالة تحديد السطور في الجدول
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // ✏️ حالة التعديل
    const [editingIssueId, setEditingIssueId] = useState<string | null>(null);

    const initialIssueState = {
        project_id: '',
        subcontractor_id: '',
        issue_type: 'صرف لمقاول',
        issue_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [{ item_name: '', quantity: 1, unit: 'وحدة', unit_price: 0, total_price: 0 }]
    };

    const [issueData, setIssueData] = useState<any>(initialIssueState);

    // سحب بيانات أذون الصرف
    const { data: issues = [], isLoading } = useQuery({
        queryKey: ['material_issues_list'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('material_issue_lines')
                .select(`
                    id, item_name, quantity, unit, unit_price, total_price,
                    issue:material_issues (
                        id, issue_number, issue_date, issue_type, is_posted, notes, project_id, subcontractor_id,
                        project:projects(Property),
                        subcontractor:partners!subcontractor_id(name)
                    )
                `).order('id', { ascending: false });
            if (error) throw error;
            return data.map((line: any) => ({
                ...line,
                ...line.issue,
                issue_id: line.issue?.id, 
                project_name: line.issue?.project?.Property,
                subcontractor_name: line.issue?.subcontractor?.name
            }));
        }
    });

    // 🚀 دالة فتح المودال ببيانات الإذن للتعديل
    const handleOpenEdit = () => {
        const idToEdit = selectedIds[0];
        const linesToEdit = issues.filter((i: any) => i.issue_id === idToEdit);
        if (linesToEdit.length > 0) {
            const master = linesToEdit[0];
            setIssueData({
                project_id: master.project_id,
                subcontractor_id: master.subcontractor_id,
                issue_type: master.issue_type,
                issue_date: master.issue_date,
                notes: master.notes || '',
                items: linesToEdit.map((l: any) => ({
                    item_name: l.item_name,
                    quantity: l.quantity,
                    unit: l.unit,
                    unit_price: l.unit_price,
                    total_price: l.total_price
                }))
            });
            setEditingIssueId(idToEdit);
            setIsModalOpen(true);
        }
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...issueData.items];
        newItems[index][field] = value;
        if (field === 'quantity' || field === 'unit_price') {
            newItems[index].total_price = (Number(newItems[index].quantity) || 0) * (Number(newItems[index].unit_price) || 0);
        }
        setIssueData({ ...issueData, items: newItems });
    };

    const handleRemoveItem = (index: number) => {
        const newItems = issueData.items.filter((_: any, i: number) => i !== index);
        setIssueData({ ...issueData, items: newItems });
    };

    // 💾 دالة الحفظ (تدعم الإضافة والتعديل)
    const saveIssueMutation = useMutation({
        mutationFn: async () => {
            if (!issueData.project_id) throw new Error("يرجى اختيار المشروع الصارف");
            if (issueData.issue_type === 'صرف لمقاول' && !issueData.subcontractor_id) throw new Error("يرجى اختيار المقاول المستلم");

            const total = issueData.items.reduce((sum: number, i: any) => sum + i.total_price, 0);
            
            if (editingIssueId) {
                // 📝 وضع التعديل (مسح السطور القديمة، تحديث الرأس، وإضافة السطور الجديدة)
                await supabase.from('material_issue_lines').delete().eq('issue_id', editingIssueId);
                
                const { error: hErr } = await supabase.from('material_issues').update({
                    project_id: issueData.project_id,
                    subcontractor_id: issueData.issue_type === 'صرف لمقاول' ? issueData.subcontractor_id : null,
                    issue_date: issueData.issue_date,
                    issue_type: issueData.issue_type,
                    total_amount: total,
                    notes: issueData.notes
                }).eq('id', editingIssueId);
                if (hErr) throw hErr;

                const lines = issueData.items.map((i: any) => ({ 
                    issue_id: editingIssueId,
                    item_name: i.item_name,
                    quantity: Number(i.quantity) || 0,
                    unit: i.unit || 'وحدة',
                    unit_price: Number(i.unit_price) || 0,
                    total_price: Number(i.total_price) || 0
                }));
                const { error: lErr } = await supabase.from('material_issue_lines').insert(lines);
                if (lErr) throw lErr;

            } else {
                // ✨ وضع الإضافة الجديد
                const { data: head, error: hErr } = await supabase.from('material_issues').insert([{
                    issue_number: `ISS-${Date.now().toString().slice(-6)}`,
                    project_id: issueData.project_id,
                    subcontractor_id: issueData.issue_type === 'صرف لمقاول' ? issueData.subcontractor_id : null,
                    issue_date: issueData.issue_date,
                    issue_type: issueData.issue_type,
                    total_amount: total,
                    notes: issueData.notes
                }]).select().single();

                if (hErr) throw hErr;

                const lines = issueData.items.map((i: any) => ({ 
                    issue_id: head.id,
                    item_name: i.item_name,
                    quantity: Number(i.quantity) || 0,
                    unit: i.unit || 'وحدة',
                    unit_price: Number(i.unit_price) || 0,
                    total_price: Number(i.total_price) || 0
                }));
                const { error: lErr } = await supabase.from('material_issue_lines').insert(lines);
                if (lErr) throw lErr;
            }
        },
        onSuccess: () => {
            showToast(editingIssueId ? "تم تحديث الإذن بنجاح ✨" : "تم حفظ إذن الصرف كمسودة ⏳", "success");
            setIsModalOpen(false);
            setEditingIssueId(null);
            setIssueData(initialIssueState);
            setSelectedIds([]); // تفريغ التحديد بعد الحفظ
            queryClient.invalidateQueries({ queryKey: ['material_issues_list'] });
        },
        onError: (err: any) => showToast(`خطأ: ${err.message}`, "error")
    });

    // ⚙️ دالة الأكشنز الجماعية (Batch Actions)
    const actionMutation = useMutation({
        mutationFn: async ({ action, ids }: { action: string, ids: string[] }) => {
            let rpcName = '';
            if (action === 'post') rpcName = 'rpc_post_material_issue';
            if (action === 'unpost') rpcName = 'rpc_unpost_material_issue';
            if (action === 'delete') rpcName = 'rpc_delete_material_issue';

            // تنفيذ الـ RPC لكل الـ IDs المحددة في نفس الوقت
            const promises = ids.map(id => supabase.rpc(rpcName, { p_id: id }));
            const results = await Promise.all(promises);
            
            // فحص الأخطاء
            const firstError = results.find(r => r.error);
            if (firstError) throw firstError.error;
        },
        onSuccess: (_, variables) => {
            const msg = variables.action === 'delete' ? "تم الحذف النهائي 🗑️" : "تمت العملية بنجاح ✅";
            showToast(msg, "success");
            setSelectedIds([]); // تفريغ التحديد بعد العملية
            queryClient.invalidateQueries({ queryKey: ['material_issues_list'] });
        },
        onError: (err: any) => showToast(`فشلت العملية: ${err.message}`, "error")
    });

    return {
        issues, isLoading, 
        isModalOpen, setIsModalOpen, 
        isPrintModalOpen, setIsPrintModalOpen,
        printReceiptId, setPrintReceiptId,
        issueData, setIssueData,
        selectedIds, setSelectedIds, 
        editingIssueId, // 👈 تم التصدير للواجهة والمودال
        handleOpenEdit, // 👈 تم التصدير للواجهة للفتح ببيانات التعديل
        handleItemChange, handleRemoveItem,
        handleSave: () => saveIssueMutation.mutate(),
        
        handleBatchAction: (action: string) => actionMutation.mutate({ action, ids: selectedIds }), 
        isActionPending: actionMutation.isPending,
        
        addItem: () => setIssueData({...issueData, items: [...issueData.items, {item_name:'', quantity:1, unit:'وحدة', unit_price:0, total_price:0}]})
    };
}