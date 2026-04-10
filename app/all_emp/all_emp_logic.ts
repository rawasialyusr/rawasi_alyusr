"use client";
import { getAllEmployees } from '../actions/all_emp_action';
import { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';

export function useEmpLogic() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchName, setSearchName] = useState(""); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);

  const fetchData = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true);
    try {
      const response = await getAllEmployees(searchName, startDate, endDate); 
      
      let rawData = [];
      if (typeof response === 'string') {
        try {
          rawData = JSON.parse(response);
        } catch (e) {
          console.error("خطأ في معالجة البيانات القادمة:", e);
          rawData = [];
        }
      } else {
        rawData = response || [];
      }

      if (!Array.isArray(rawData)) {
        setEmployees([]);
        return;
      }

      // تنظيف ومعالجة البيانات بالحسابات الدقيقة
      const cleanedData = rawData.map((item: any) => {
        // تحويل كل القيم لأرقام لضمان سلامة العمليات الحسابية
        const mustahaq = parseFloat(item.total_production) || 0; // d_w
        const received = parseFloat(item.total_advances) || 0;   // السلف (amount)
        const housing = parseFloat(item.total_housing) || 0;     // السكن (amount)
        const deductions = parseFloat(item.total_deductions) || 0; // الخصومات (amount)
        const workDays = parseFloat(item.work_days) || 0;        // الحضور (0.5, 1)

        return {
          ...item,
          id: String(item.emp_id || Math.random()),
          emp_id: String(item.emp_id || ""),
          emp_name: item.emp_name || "بدون اسم",
          earnings: mustahaq,
          work_days: workDays,
          received: received,
          deductions: deductions,
          housing: housing,
          // المعادلة الذهبية للصافي
          net_earnings: mustahaq - (received + housing + deductions)
        };
      });

      setEmployees(cleanedData);
    } catch (error) {
      console.error("Critical Fetch Error:", error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [searchName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // الفلترة السريعة
  const filteredEmployees = useMemo(() => {
    const query = searchName.toLowerCase().trim();
    if (!query) return employees;
    return employees.filter(emp => 
      String(emp.emp_name).toLowerCase().includes(query) || 
      String(emp.emp_id).includes(query)
    );
  }, [employees, searchName]);

  const displayedEmployees = useMemo(() => {
    return filteredEmployees.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  // وظائف الجدول
  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (displayedEmployees.length > 0 && selectedIds.length === displayedEmployees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedEmployees.map(e => String(e.emp_id)));
    }
  };

  const exportToExcel = () => {
    // تصدير البيانات اللي ظاهرة قدام المستخدم فقط بالفلتر
    const dataToExport = filteredEmployees.map(emp => ({
      "كود الموظف": emp.emp_id,
      "الاسم": emp.emp_name,
      "أيام الدوام": emp.work_days,
      "المستحق": emp.earnings,
      "المستلم": emp.received,
      "السكن": emp.housing,
      "الخصم": emp.deductions,
      "الصافي": emp.net_earnings
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التقرير المالي");
    XLSX.writeFile(wb, `Financial_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return {
    loading,
    displayedEmployees,
    fetchData,
    searchName,
    setSearchName,
    selectedIds,
    toggleSelectAll,
    toggleSelectRow,
    isModalOpen,
    setIsModalOpen,
    editingRecord,
    setEditingRecord,
    exportToExcel,
    totalCount: filteredEmployees.length,
    // إجماليات للفوتر (Footer) لو محتاجها
    totals: {
      production: filteredEmployees.reduce((sum, e) => sum + e.earnings, 0),
      net: filteredEmployees.reduce((sum, e) => sum + e.net_earnings, 0),
      workDays: filteredEmployees.reduce((sum, e) => sum + e.work_days, 0)
    }
  };
}