"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export function usePayrollLogic() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // فلاتر الشهر والسنة
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [globalSearch, setGlobalSearch] = useState('');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<any>(null);

    // 1. جلب بيانات العمال والموظفين
    const fetchEmployees = async () => {
        setIsLoading(true);
        const { data } = await supabase
            .from('partners')
            .select('id, name, partner_type, job_role, identity_number')
            .in('partner_type', ['موظف', 'عامل', 'عامل يومية'])
            .order('name');
            
        if (data) {
            setEmployees(data);
            // بناء مسير رواتب مبدئي في الذاكرة (أو جلبه من الداتا بيز لو محفوظ)
            const initialPayroll = data.map(emp => ({
                id: emp.id, // نستخدم id الموظف كمرجع مؤقت
                emp_id: emp.id,
                name: emp.name,
                type: emp.partner_type,
                job_role: emp.job_role,
                identity_number: emp.identity_number,
                base_rate: 0,      // الراتب الأساسي أو يومية العامل
                days_worked: 0,    // أيام العمل
                allowances: 0,     // بدلات / إضافي
                deductions: 0,     // خصومات / غياب
                advances: 0,       // سلف مسحوبة
                net_salary: 0,
                status: 'غير مدفوع',
                notes: ''
            }));
            setPayrollRecords(initialPayroll);
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchEmployees(); }, [selectedMonth, selectedYear]);

    // 2. تحديث خلية معينة في مسير الرواتب وحساب الصافي آلياً
    const updateRecord = (id: string, field: string, value: string | number) => {
        setPayrollRecords(prev => prev.map(rec => {
            if (rec.id === id) {
                const updated = { ...rec, [field]: value };
                // المعادلة: (الفئة * الأيام) + البدلات - الخصومات - السلف
                const baseTotal = (Number(updated.base_rate) || 0) * (updated.type === 'عامل يومية' ? (Number(updated.days_worked) || 0) : 1);
                // لو راتب شهري، الأساسي هو الراتب نفسه. لو يومية، الأساسي * الأيام
                const actualBase = updated.type === 'عامل يومية' ? baseTotal : (Number(updated.base_rate) || 0);
                
                updated.net_salary = actualBase 
                                   + (Number(updated.allowances) || 0) 
                                   - (Number(updated.deductions) || 0) 
                                   - (Number(updated.advances) || 0);
                return updated;
            }
            return rec;
        }));
    };

    // 3. تحديث المودال المفتوح (مفردات الراتب لعامل واحد)
    useEffect(() => {
        if (currentRecord) {
            const actualBase = currentRecord.type === 'عامل يومية' ? ((Number(currentRecord.base_rate) || 0) * (Number(currentRecord.days_worked) || 0)) : (Number(currentRecord.base_rate) || 0);
            const net = actualBase + (Number(currentRecord.allowances) || 0) - (Number(currentRecord.deductions) || 0) - (Number(currentRecord.advances) || 0);
            if (net !== currentRecord.net_salary) setCurrentRecord({ ...currentRecord, net_salary: net });
        }
    }, [currentRecord?.base_rate, currentRecord?.days_worked, currentRecord?.allowances, currentRecord?.deductions, currentRecord?.advances]);

    const saveModalRecord = () => {
        updateRecord(currentRecord.id, 'net_salary', currentRecord.net_salary); // Trigger update
        setPayrollRecords(prev => prev.map(r => r.id === currentRecord.id ? currentRecord : r));
        setIsEditModalOpen(false);
    };

    // 4. فلاتر ومجاميع
    const filteredRecords = useMemo(() => {
        const s = globalSearch.toLowerCase();
        return payrollRecords.filter(r => r.name.toLowerCase().includes(s) || (r.job_role || '').toLowerCase().includes(s));
    }, [payrollRecords, globalSearch]);

    const totals = useMemo(() => {
        return filteredRecords.reduce((acc, curr) => ({
            allowances: acc.allowances + (Number(curr.allowances) || 0),
            deductions: acc.deductions + (Number(curr.deductions) || 0),
            advances: acc.advances + (Number(curr.advances) || 0),
            net: acc.net + (Number(curr.net_salary) || 0),
        }), { allowances: 0, deductions: 0, advances: 0, net: 0 });
    }, [filteredRecords]);

    // 5. التصدير
    const exportToExcel = () => {
        const dataToExport = filteredRecords.map(r => ({
            "الاسم": r.name,
            "التصنيف": r.type,
            "المهنة": r.job_role,
            "الفئة / الأساسي": r.base_rate,
            "أيام العمل": r.days_worked,
            "البدلات": r.allowances,
            "الخصومات": r.deductions,
            "السلف": r.advances,
            "الصافي المستحق": r.net_salary,
            "الحالة": r.status
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const csv = XLSX.utils.sheet_to_csv(ws, { FS: "," });
        const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `مسير_رواتب_${selectedMonth}_${selectedYear}.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    return {
        isLoading, filteredRecords, globalSearch, setGlobalSearch,
        selectedMonth, setSelectedMonth, selectedYear, setSelectedYear,
        updateRecord, totals, exportToExcel,
        isEditModalOpen, setIsEditModalOpen, currentRecord, setCurrentRecord, saveModalRecord
    };
}