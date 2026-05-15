"use client";
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/toast-context';

export function useHierarchicalAccountsLogic() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // 🧠 1. جلب البيانات "المطبوخة" من الباك إند (الأرصدة + القيود معاً)
  const { data: accountsReport = [], isLoading } = useQuery({
    queryKey: ['accounts_report_with_lines', startDate, endDate], // 🚀 تم تحديث مفتاح الكاش
    queryFn: async () => {
      // 🚀 تم تغيير الدالة هنا لاستدعاء الـ RPC المطور اللي بيجيب القيود
      const { data, error } = await supabase.rpc('get_accounts_report_with_lines', {
        p_date_from: startDate || '1900-01-01',
        p_date_to: endDate || '2099-12-31'
      });
      
      if (error) {
        console.error("❌ خطأ في جلب تقرير الحسابات والقيود:", error);
        throw error;
      }
      return data || [];
    }
  });

  // 🧠 2. بناء الشجرة (عملية خفيفة جداً للفرونت إند فقط لترتيب العرض)
  const treeData = useMemo(() => {
    if (!accountsReport.length) return [];

    const mapById: Record<string, any> = {};

    // ترتيب الحسابات تصاعدياً بالكود لضمان شكل شجرة احترافي
    const sortedAccounts = [...accountsReport].sort((a: any, b: any) => {
         const codeA = a.code ? String(a.code) : '';
         const codeB = b.code ? String(b.code) : '';
         return codeA.localeCompare(codeB);
    });

    // تجهيز العقد (Nodes) وربط الأرقام والقيود القادمة من الداتابيز
    sortedAccounts.forEach(acc => {
      const safeId = String(acc.id).trim();
      mapById[safeId] = { 
        ...acc, 
        children: [], 
        // 🚀 التعديل الجوهري: سحب القيود الفعلية من الداتابيز وتمريرها للعرض بدل تفريغها
        transactions: acc.transactions || [], 
        totalDebit: Number(acc.total_debit || 0),
        totalCredit: Number(acc.total_credit || 0),
        balance: Number(acc.balance || 0)
      };
    });

    const roots: any[] = [];
    sortedAccounts.forEach(acc => {
      const safeId = String(acc.id).trim();
      const safeParentId = acc.parent_id ? String(acc.parent_id).trim() : null;
      
      if (safeParentId && mapById[safeParentId]) {
        mapById[safeParentId].children.push(mapById[safeId]);
      } else if (!safeParentId) {
        roots.push(mapById[safeId]);
      }
    });

    return roots;
  }, [accountsReport]);

  // 🧠 3. منطق البحث السريع
  const filteredTree = useMemo(() => {
    if (!searchTerm) return treeData;
    const searchLower = searchTerm.toLowerCase();
    const searchRecursive = (nodes: any[]): any[] => {
      return nodes.map(node => {
        const matchingChildren = searchRecursive(node.children);
        const isMatch = (node.name || '').toLowerCase().includes(searchLower) || (node.code && String(node.code).includes(searchLower));
        if (isMatch || matchingChildren.length > 0) return { ...node, children: matchingChildren };
        return null;
      }).filter(Boolean) as any[];
    };
    return searchRecursive(treeData);
  }, [treeData, searchTerm]);

  const paginatedTree = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTree.slice(start, start + itemsPerPage);
  }, [filteredTree, currentPage, itemsPerPage]);

  // 🚀 4. طابور العمليات (حذف الحسابات)
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
        const { error } = await supabase.from('accounts').delete().in('id', ids); 
        if (error) throw error;
    },
    onMutate: async (ids) => {
        // 🚀 تم تحديث مفاتيح الكاش لتتطابق مع الـ Query الجديد
        await queryClient.cancelQueries({ queryKey: ['accounts_report_with_lines'] });
        const previous = queryClient.getQueryData(['accounts_report_with_lines']);
        queryClient.setQueryData(['accounts_report_with_lines'], (old: any[]) => old?.filter(acc => !ids.includes(acc.id)));
        return { previous };
    },
    onError: (err: any, vars, context) => {
        queryClient.setQueryData(['accounts_report_with_lines'], context?.previous);
        showToast(`حدث خطأ أثناء الحذف: ${err.message}`, 'error');
    },
    onSuccess: () => {
        setSelectedIds([]);
        showToast('تم حذف الحسابات بنجاح 🗑️', 'success');
    },
    onSettled: () => {
        // تحديث الـ Cache لتقرير الحسابات
        queryClient.invalidateQueries({ queryKey: ['accounts_report_with_lines'] });
    }
  });

  return { 
    paginatedTree, 
    totalPages: Math.ceil(filteredTree.length / itemsPerPage) || 1,
    currentPage, setCurrentPage, itemsPerPage, setItemsPerPage,
    isLoading, searchTerm, setSearchTerm, 
    startDate, setStartDate, endDate, setEndDate,
    expandedIds, 
    toggleExpand: (id: string) => setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),
    expandAll: () => {
      const ids: string[] = [];
      const getIds = (nodes: any[]) => nodes.forEach(n => { ids.push(n.id); getIds(n.children); });
      getIds(treeData);
      setExpandedIds(ids);
    }, 
    collapseAll: () => setExpandedIds([]),
    selectedIds, setSelectedIds,
    toggleSelection: (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),
    
    handleAdd: () => router.push('/accounts/new'),
    handleEdit: (ids: string[]) => {
      if (ids.length === 1) router.push(`/accounts/edit/${ids[0]}`);
    },
    handleDelete: (ids: string[]) => { 
        if(confirm(`هل أنت متأكد من حذف ${ids.length} حساب/حسابات بجميع تفاصيلها؟`)) {
            deleteMutation.mutate(ids);
        }
    },
    isDeleting: deleteMutation.isPending
  };
}