"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { getHousingServices } from '@/app/actions/housing_action';

export function useHousingLogic() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSumFromDB, setTotalSumFromDB] = useState(0);
  
  // فلاتر البحث
  const [searchName, setSearchName] = useState("");
  const [searchService, setSearchService] = useState("");
  const [searchMonth, setSearchMonth] = useState(""); 

  // الترقيم (Pagination)
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      // 1. جلب البيانات من السيرفر (RPC)
      const result = await getHousingServices(searchName, searchService, searchMonth);
      
      // 2. تنظيف البيانات من الـ NaN وأي نصوص غريبة
      const cleanedData = (result.data || []).map((item: any) => {
        // تحويل آمن للمبلغ
        const rawAmount = item.amount;
        let finalAmount = 0;

        if (rawAmount !== null && rawAmount !== undefined) {
           // لو القيمة جاية "null" كـ نص أو NaN، بنخليها 0
           finalAmount = isNaN(Number(rawAmount)) ? 0 : Number(rawAmount);
        }

        return {
          ...item,
          // توحيد مسميات العرض لسهولة الاستخدام في الـ Table
          display_name: item.emp_name || "غير معروف",
          display_service: item.service_type || "-",
          display_month: item.deduction_month || "-",
          display_amount: finalAmount,
          display_notes: item.notes || "-"
        };
      });

      setRecords(cleanedData);
      setTotalSumFromDB(result.totalSum || 0);
    } catch (error) { 
      console.error("Error fetching housing records:", error); 
    } finally { 
      setLoading(false); 
    }
  }, [searchName, searchService, searchMonth]);

  useEffect(() => { 
    fetchRecords(); 
  }, [fetchRecords]);

  // الإجمالي والعدد (مأخوذ مباشرة من الداتابيز لضمان الدقة)
  const totalAmount = totalSumFromDB; 
  const totalCount = records.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  
  // السجلات التي ستعرض في الصفحة الحالية
  const displayedRecords = useMemo(() => {
    return records.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [records, currentPage, pageSize]);

  // تصدير إكسيل
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(records.map(r => ({
      "اسم الموظف": r.display_name,
      "شهر الاستحقاق": r.display_month,
      "الخدمة": r.display_service,
      "المبلغ": r.display_amount,
      "ملاحظات": r.display_notes
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Housing");
    XLSX.writeFile(wb, "Housing_Report.xlsx");
  };

  const downloadTemplate = () => {
    const template = [{ emp_name: "اسم الموظف", deduction_month: "يناير 2024", service_type: "سكن", amount: 0, notes: "" }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Housing_Template.xlsx");
  };

  return {
    loading, 
    displayedRecords, // دي اللي هتعرضها في الجدول map
    searchName, setSearchName, 
    searchService, setSearchService,
    searchMonth, setSearchMonth,
    totalAmount, 
    totalCount,
    currentPage, setCurrentPage, 
    totalPages, 
    pageSize, setPageSize,
    exportToExcel, 
    downloadTemplate, 
    refresh: fetchRecords
  };
}