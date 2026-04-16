"use client";
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useHierarchicalAccountsLogic() {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      console.log("🚀 جاري سحب البيانات المالية الكاملة (بدون حد الـ 1000 سطر)...");

      // 1. جلب كل الحسابات
      const { data: accList } = await supabase.from('accounts').select('*').order('code');

      // 2. جلب كل رؤوس القيود المرحلة (باستخدام Pagination لتخطي حد الـ 1000)
      let allHeaders: any[] = [];
      let headerFrom = 0;
      const step = 1000;
      let hasMoreHeaders = true;

      while (hasMoreHeaders) {
        const { data: headerChunk } = await supabase
          .from('journal_headers')
          .select('*')
          .eq('status', 'posted')
          .range(headerFrom, headerFrom + step - 1);
        
        if (headerChunk && headerChunk.length > 0) {
          allHeaders = [...allHeaders, ...headerChunk];
          headerFrom += step;
        } else {
          hasMoreHeaders = false;
        }
      }

      // 3. جلب كل أطراف القيود (Lines) بنفس الطريقة
      let allLines: any[] = [];
      let lineFrom = 0;
      let hasMoreLines = true;

      while (hasMoreLines) {
        const { data: lineChunk } = await supabase
          .from('journal_lines')
          .select('*')
          .range(lineFrom, lineFrom + step - 1);
        
        if (lineChunk && lineChunk.length > 0) {
          allLines = [...allLines, ...lineChunk];
          lineFrom += step;
        } else {
          hasMoreLines = false;
        }
      }

      // 4. بناء خريطة الرؤوس للربط السريع
      const headerMap: Record<string, any> = {};
      allHeaders.forEach(h => { headerMap[h.id] = h; });

      // 5. بناء خريطة الحسابات (دعم الربط بالـ ID والـ Code معاً)
      const mapById: Record<string, any> = {};
      const mapByCode: Record<string, any> = {};

      accList?.forEach(acc => {
        const node = { ...acc, children: [], transactions: [], totalDebit: 0, totalCredit: 0, balance: 0 };
        const safeId = String(acc.id).trim();
        mapById[safeId] = node;
        if (acc.code) {
          mapByCode[String(acc.code).trim()] = node;
        }
      });

      // 6. توزيع العمليات على الحسابات (مطابقة ذكية)
      allLines.forEach((line: any) => {
        const header = headerMap[line.header_id];
        if (!header) return; 

        // محاولة الربط بالـ ID أولاً، ثم بالكود كخطة بديلة
        const lineAccId = String(line.account_id).trim();
        let targetNode = mapById[lineAccId];

        // ملاحظة: إذا كان الترحيل القديم يستخدم الأكواد في خانة الـ account_id
        if (!targetNode) {
            targetNode = mapByCode[lineAccId];
        }

        if (targetNode) {
          targetNode.transactions.push({
            ...line,
            date: header.entry_date || '---',
            description: line.item_name || header.description || 'مصروف مرحل'
          });
        }
      });

      // 7. بناء الشجرة الهرمية
      const roots: any[] = [];
      accList?.forEach(acc => {
        const safeId = String(acc.id).trim();
        const safeParentId = acc.parent_id ? String(acc.parent_id).trim() : null;
        
        if (safeParentId && mapById[safeParentId]) {
          mapById[safeParentId].children.push(mapById[safeId]);
        } else if (!safeParentId) {
          roots.push(mapById[safeId]);
        }
      });

      // 8. المحرك المحاسبي: تجميع الأرصدة من الفروع للأصول (Roll-up)
      const calculateTotals = (node: any) => {
        let d = 0, c = 0;
        
        // حساب حركات الحساب نفسه
        node.transactions.forEach((t: any) => {
          d += Number(t.debit || 0);
          c += Number(t.credit || 0);
        });

        // إضافة حركات الأبناء (الحسابات الفرعية)
        node.children.forEach((child: any) => {
          const totals = calculateTotals(child);
          d += totals.debit;
          c += totals.credit;
        });

        node.totalDebit = d;
        node.totalCredit = c;
        node.balance = d - c; // (مدين - دائن)
        return { debit: d, credit: c };
      };

      roots.forEach(root => calculateTotals(root));

      setAccounts(accList || []);
      setTreeData([...roots]);
      console.log(`✅ تم تحميل ${allLines.length} حركة مالية بنجاح.`);

    } catch (error: any) {
      console.error('❌ خطأ في سحب البيانات:', error.message);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // منطق البحث
  const filteredTree = useMemo(() => {
    if (!searchTerm) return treeData;
    const searchRecursive = (nodes: any[]): any[] => {
      return nodes.map(node => {
        const matchingChildren = searchRecursive(node.children);
        const isMatch = node.name.includes(searchTerm) || (node.code && node.code.toString().includes(searchTerm));
        if (isMatch || matchingChildren.length > 0) return { ...node, children: matchingChildren };
        return null;
      }).filter(Boolean) as any[];
    };
    return searchRecursive(treeData);
  }, [treeData, searchTerm]);

  // منطق الترقيم
  const paginatedTree = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTree.slice(start, start + itemsPerPage);
  }, [filteredTree, currentPage, itemsPerPage]);

  return { 
    accounts, paginatedTree, totalPages: Math.ceil(filteredTree.length / itemsPerPage),
    currentPage, setCurrentPage, itemsPerPage, setItemsPerPage,
    isLoading, searchTerm, setSearchTerm, expandedIds, 
    toggleExpand: (id: string) => setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),
    expandAll: () => {
      const ids: string[] = [];
      const getIds = (nodes: any[]) => nodes.forEach(n => { ids.push(n.id); getIds(n.children); });
      getIds(treeData);
      setExpandedIds(ids);
    }, 
    collapseAll: () => setExpandedIds([]),
    selectedIds, toggleSelection: (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),
    handleDelete: async (id: string) => { 
        if(confirm("هل أنت متأكد من حذف هذا الحساب؟")) {
            await supabase.from('accounts').delete().eq('id', id); 
            fetchData(); 
        }
    },
    fetchData
  };
}