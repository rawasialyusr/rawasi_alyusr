"use client";
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { fetchAllSupabaseData } from '@/lib/helpers';
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

  // 🧠 1. جلب البيانات عبر React Query (Offline-First & Caching)
  const { data: rawAccounts = [], isLoading: isAccLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => fetchAllSupabaseData(supabase, 'accounts')
  });

  const { data: rawHeaders = [], isLoading: isHeadLoading } = useQuery({
    queryKey: ['journal_headers'],
    queryFn: () => fetchAllSupabaseData(supabase, 'journal_headers')
  });

  const { data: rawLines = [], isLoading: isLinesLoading } = useQuery({
    queryKey: ['journal_lines'],
    queryFn: () => fetchAllSupabaseData(supabase, 'journal_lines')
  });

  const isLoading = isAccLoading || isHeadLoading || isLinesLoading;

  // 🧠 2. المحرك الذكي: بناء الشجرة وتطبيق فلاتر التاريخ (Logic Filtering)
  const treeData = useMemo(() => {
    if (!rawAccounts.length) return [];

    const headerMap: Record<string, any> = {};
    rawHeaders.forEach((h: any) => { 
        if (h.status === 'posted') { // الفلترة للحركات المرحلة فقط
            headerMap[h.id] = h; 
        }
    });

    const mapById: Record<string, any> = {};
    const mapByCode: Record<string, any> = {};

    // ترتيب الحسابات تصاعدياً بالكود لضمان شكل شجرة احترافي
    const sortedAccounts = [...rawAccounts].sort((a: any, b: any) => {
         const codeA = a.code ? String(a.code) : '';
         const codeB = b.code ? String(b.code) : '';
         return codeA.localeCompare(codeB);
    });

    sortedAccounts.forEach(acc => {
      const node = { ...acc, children: [], transactions: [], totalDebit: 0, totalCredit: 0, balance: 0 };
      const safeId = String(acc.id).trim();
      mapById[safeId] = node;
      if (acc.code) mapByCode[String(acc.code).trim()] = node;
    });

    rawLines.forEach((line: any) => {
      const header = headerMap[line.header_id];
      if (!header) return; 

      // 📅 تطبيق فلاتر التاريخ المحاسبية
      if (startDate && header.entry_date < startDate) return;
      if (endDate && header.entry_date > endDate) return;

      const lineAccId = String(line.account_id).trim();
      let targetNode = mapById[lineAccId] || mapByCode[lineAccId];

      if (targetNode) {
        targetNode.transactions.push({
          ...line,
          date: header.entry_date || '---',
          description: line.item_name || header.description || 'مصروف مرحل'
        });
      }
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

    const calculateTotals = (node: any) => {
      let d = 0, c = 0;
      node.transactions.forEach((t: any) => {
        d += Number(t.debit || 0);
        c += Number(t.credit || 0);
      });
      node.children.forEach((child: any) => {
        const totals = calculateTotals(child);
        d += totals.debit;
        c += totals.credit;
      });
      node.totalDebit = d;
      node.totalCredit = c;
      node.balance = d - c; 
      return { debit: d, credit: c };
    };

    roots.forEach(root => calculateTotals(root));
    return roots;
  }, [rawAccounts, rawHeaders, rawLines, startDate, endDate]);

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

  // 🚀 4. طابور العمليات (Mutations & Optimistic Updates)
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
        const { error } = await supabase.from('accounts').delete().in('id', ids); 
        if (error) throw error;
    },
    onMutate: async (ids) => {
        await queryClient.cancelQueries({ queryKey: ['accounts'] });
        const previous = queryClient.getQueryData(['accounts']);
        queryClient.setQueryData(['accounts'], (old: any[]) => old?.filter(acc => !ids.includes(acc.id)));
        return { previous };
    },
    onError: (err: any, vars, context) => {
        queryClient.setQueryData(['accounts'], context?.previous);
        showToast(`حدث خطأ أثناء الحذف: ${err.message}`, 'error');
    },
    onSuccess: () => {
        setSelectedIds([]);
        showToast('تم حذف الحسابات بنجاح 🗑️', 'success');
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
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