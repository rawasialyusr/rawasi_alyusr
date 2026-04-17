"use client";
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function useHierarchicalAccountsLogic() {
  const router = useRouter();

  // 📦 تخزين البيانات الخام (Raw Data) عشان منعملش Fetch مع كل فلترة
  const [rawAccounts, setRawAccounts] = useState<any[]>([]);
  const [rawHeaders, setRawHeaders] = useState<any[]>([]);
  const [rawLines, setRawLines] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 📅 فلاتر التاريخ (تم إضافتها للوجيك للتحكم المركزي)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // 1️⃣ دالة سحب البيانات الخام من قاعدة البيانات (تعمل مرة واحدة فقط)
  const fetchData = async () => {
    setIsLoading(true);
    try {
      console.log("🚀 جاري سحب البيانات المالية الكاملة...");

      const { data: accList } = await supabase.from('accounts').select('*').order('code');

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

      setRawAccounts(accList || []);
      setRawHeaders(allHeaders);
      setRawLines(allLines);
      console.log(`✅ تم تحميل ${allLines.length} حركة مالية بنجاح.`);

    } catch (error: any) {
      console.error('❌ خطأ في سحب البيانات:', error.message);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // 2️⃣ المحرك الذكي: بناء الشجرة وتطبيق فلاتر التاريخ والأرصدة في الذاكرة (سريع جداً)
  const treeData = useMemo(() => {
    if (!rawAccounts.length) return [];

    const headerMap: Record<string, any> = {};
    rawHeaders.forEach(h => { headerMap[h.id] = h; });

    const mapById: Record<string, any> = {};
    const mapByCode: Record<string, any> = {};

    // تهيئة الحسابات
    rawAccounts.forEach(acc => {
      const node = { ...acc, children: [], transactions: [], totalDebit: 0, totalCredit: 0, balance: 0 };
      const safeId = String(acc.id).trim();
      mapById[safeId] = node;
      if (acc.code) mapByCode[String(acc.code).trim()] = node;
    });

    // توزيع القيود مع تطبيق 📅 فلتر التاريخ
    rawLines.forEach((line: any) => {
      const header = headerMap[line.header_id];
      if (!header) return; 

      // 🛑 الفلترة بالتاريخ هنا!
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

    // بناء الشجرة
    const roots: any[] = [];
    rawAccounts.forEach(acc => {
      const safeId = String(acc.id).trim();
      const safeParentId = acc.parent_id ? String(acc.parent_id).trim() : null;
      
      if (safeParentId && mapById[safeParentId]) {
        mapById[safeParentId].children.push(mapById[safeId]);
      } else if (!safeParentId) {
        roots.push(mapById[safeId]);
      }
    });

    // حساب الأرصدة (Roll-up)
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
  }, [rawAccounts, rawHeaders, rawLines, startDate, endDate]); // يعيد الحساب تلقائياً لو اتغير التاريخ

  // 3️⃣ منطق البحث في الشجرة
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

  // منطق الترقيم (Pagination)
  const paginatedTree = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTree.slice(start, start + itemsPerPage);
  }, [filteredTree, currentPage, itemsPerPage]);

  return { 
    accounts: rawAccounts, 
    paginatedTree, 
    totalPages: Math.ceil(filteredTree.length / itemsPerPage),
    currentPage, setCurrentPage, itemsPerPage, setItemsPerPage,
    isLoading, searchTerm, setSearchTerm, 
    startDate, setStartDate, endDate, setEndDate, // 👈 تم التصدير للـ UI
    expandedIds, 
    toggleExpand: (id: string) => setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),
    expandAll: () => {
      const ids: string[] = [];
      const getIds = (nodes: any[]) => nodes.forEach(n => { ids.push(n.id); getIds(n.children); });
      getIds(treeData);
      setExpandedIds(ids);
    }, 
    collapseAll: () => setExpandedIds([]),
    selectedIds, 
    toggleSelection: (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),
    
    // 🚀 زراير الأكشن (الإضافة - التعديل - الحذف)
    handleAdd: () => {
      router.push('/accounts/new'); // توجيه لشاشة إضافة حساب
    },
    handleEdit: (ids: string[]) => {
      if (ids.length === 1) {
        router.push(`/accounts/edit/${ids[0]}`); // توجيه لشاشة التعديل
      }
    },
    handleDelete: async (ids: string[]) => { 
        if(confirm(`هل أنت متأكد من حذف ${ids.length} حساب/حسابات بجميع تفاصيلها؟`)) {
            // استخدام "in" لحذف مجموعة حسابات مرة واحدة
            const { error } = await supabase.from('accounts').delete().in('id', ids); 
            if (error) {
                alert("❌ حدث خطأ أثناء الحذف: " + error.message);
            } else {
                fetchData(); // تحديث الداتا
                setSelectedIds([]); // تفريغ التحديد
                alert("✅ تم الحذف بنجاح!");
            }
        }
    },
    fetchData
  };
}