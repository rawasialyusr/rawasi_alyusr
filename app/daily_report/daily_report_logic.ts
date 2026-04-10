"use client";
import { 
  getDailyReports, 
  updateDailyReport, 
  deleteDailyReports,
  getEmployeesLiveStats 
} from '../actions/daily_report_action'; 
import { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';

export function useDailyReportLogic() {
  const [allReports, setAllReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(100);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  // --- الإحصائيات القادمة من السيرفر (RPC) ---
  const [serverStats, setServerStats] = useState({
    totalDW: 0,
    totalProd: 0,
    totalAttendance: 0,
    totalCount: 0
  });

  // حالات البحث والفلاتر
  const [searchName, setSearchName] = useState('');
  const [searchCont, setSearchCont] = useState('');
  const [searchSite, setSearchSite] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchItem, setSearchItem] = useState('');
  
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 1. جلب بيانات الجدول (يدعم الآن أكثر من 1000 سجل بفضل التعديل في الأكشن)
  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await getDailyReports(); 
      const parsedResponse = JSON.parse(response);

      if (parsedResponse.error) {
        setAllReports([]);
        return;
      }

      const data = Array.isArray(parsedResponse) ? parsedResponse : [];
      
      const normalizedData = data.map((item, index) => {
          // تطهير القيم الرقمية لمنع الـ NaN في العرض
          const rawProd = item.Prod || item.prod;
          const cleanProd = typeof rawProd === 'number' ? rawProd : parseFloat(String(rawProd).replace(/[^0-9.]/g, '')) || 0;
          
          const rawDW = item.D_W || item.d_w;
          const cleanDW = typeof rawDW === 'number' ? rawDW : parseFloat(String(rawDW).replace(/[^0-9.]/g, '')) || 0;

          return {
            ...item,
            id: item.id || item._id,
            tempId: String(item.id || item._id?.$oid || item._id || `id-${index}`),
            Date: item.Date || item.date,
            Emp_Name: item.Emp_Name || item.emp_name,
            Main_Cont: item.Main_Cont || item.main_cont,
            Site: item.Site || item.site,
            Item: item.Item || item.item,
            D_W: cleanDW,
            Prod: cleanProd,
            Attendance: item.Attendance || item.attendance
          };
      });

      setAllReports(normalizedData);
    } catch (err) {
      console.error("خطأ في جلب البيانات:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. جلب الإحصائيات "اللحظية" من السيرفر باستخدام الـ RPC
  const fetchServerStats = async () => {
    try {
      const response = await getEmployeesLiveStats(
        searchName.trim(), 
        startDate || '', 
        endDate || ''
      ); 
      
      const data = JSON.parse(response);

      if (Array.isArray(data) && data.length > 0) {
        const result = data[0]; 
        setServerStats({
          totalDW: Number(result.total_days_worked || 0),
          totalProd: Number(result.total_production || 0),
          totalAttendance: Number(result.total_attendance || 0),
          totalCount: Number(result.records_count || 0)
        });
      } else {
        setServerStats({ totalDW: 0, totalProd: 0, totalAttendance: 0, totalCount: 0 });
      }
    } catch (err) {
      console.error("خطأ في تحديث الإحصائيات عبر RPC:", err);
    }
  };

  // 3. الفلترة المحلية (للجدول المعروض أمامك فقط)
  const filteredReports = useMemo(() => {
    return allReports.filter(r => {
      const matchName = !searchName || (r.Emp_Name || '').toString().toLowerCase().includes(searchName.toLowerCase());
      const matchCont = !searchCont || (r.Main_Cont || '').toString().toLowerCase().includes(searchCont.toLowerCase());
      const matchSite = !searchSite || (r.Site || '').toString().toLowerCase().includes(searchSite.toLowerCase());
      const matchItem = !searchItem || (r.Item || '').toString().toLowerCase().includes(searchItem.toLowerCase());
      const matchStart = !startDate || (r.Date || '') >= startDate;
      const matchEnd = !endDate || (r.Date || '') <= endDate;
      return matchName && matchCont && matchSite && matchItem && matchStart && matchEnd;
    });
  }, [allReports, searchName, searchCont, searchSite, searchItem, startDate, endDate]);

  // 4. الترقيم للعرض في الجدول
  const displayedReports = useMemo(() => {
    const startIndex = currentPage * pageSize;
    return filteredReports.slice(startIndex, startIndex + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  useEffect(() => {
    fetchReports();
    fetchServerStats();
  }, []);

  // تحديث الإحصائيات (RPC) عند تغيير الفلاتر الأساسية
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchServerStats();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchName, startDate, endDate]);

  // --- دوال الأكشن ---
  const toggleSelectAll = () => {
    if (selectedIds.length === displayedReports.length && displayedReports.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedReports.map(r => r.tempId));
    }
  };

  const toggleSelectRow = (id: string) => {
    const stringId = String(id);
    setSelectedIds(prev => 
      prev.includes(stringId) ? prev.filter(item => item !== stringId) : [...prev, stringId]
    );
  };

  const handleEdit = useCallback(() => {
    if (selectedIds.length !== 1) return;
    const selectedId = String(selectedIds[0]);
    const record = allReports.find(r => r.tempId === selectedId);
    if (record) {
      setEditingRecord(JSON.parse(JSON.stringify(record)));
      setIsEditModalOpen(true);
    }
  }, [selectedIds, allReports]);

  const handleSaveUpdate = async () => {
    if (!editingRecord) return;
    try {
      const res = await updateDailyReport(editingRecord.id, editingRecord);
      if (res.success) {
        setIsEditModalOpen(false);
        fetchReports();
        fetchServerStats();
      }
    } catch (err) { console.error("فشل التحديث"); }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0 || !confirm(`حذف ${selectedIds.length} سجل؟`)) return;
    try {
      const res = await deleteDailyReports(selectedIds);
      if (res.success) {
        setSelectedIds([]);
        fetchReports();
        fetchServerStats();
      }
    } catch (err) { console.error("فشل الحذف"); }
  };

  return {
    loading, 
    displayedReports,
    searchName, setSearchName,
    searchCont, setSearchCont,
    searchSite, setSearchSite,
    searchItem, setSearchItem,
    startDate, setStartDate,
    endDate, setEndDate,
    currentPage, setCurrentPage,
    totalCount: filteredReports.length,
    totalPages: Math.max(1, Math.ceil(filteredReports.length / pageSize)),

    // القيم النهائية المستخرجة مباشرة من السيرفر (RPC) لكامل قاعدة البيانات
    totalDWVal: serverStats.totalDW, 
    totalProd: serverStats.totalProd,
    totalAttendance: serverStats.totalAttendance,
    totalDaysCount: serverStats.totalCount, 

    exportToExcel: () => {},
    pageSize, setPageSize,
    selectedIds, toggleSelectAll, toggleSelectRow,
    handleDelete, 
    handleEdit, isEditModalOpen, setIsEditModalOpen,
    editingRecord, setEditingRecord,
    handleSaveUpdate,
    downloadTemplate: () => {}, 
    handleImportExcel: () => {} 
  };
}