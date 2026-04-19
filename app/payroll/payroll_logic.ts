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
            // بناء مسير رواتب مبدئي في الذاكرة
            const initialPayroll = data.map(emp => ({
                id: emp.id, 
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
        updateRecord(currentRecord.id, 'net_salary', currentRecord.net_salary);
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

    // ==========================================
    // 🚀 الإضافات الجديدة (بدون حذف أي شيء)
    // ==========================================

    // 6. دالة استيراد وتجميع أيام عمل عمال المياومة من جدول اليوميات
    const importLaborLogs = async () => {
        const confirmImport = confirm(`هل تريد سحب أيام العمل لعمال اليومية لشهر ${selectedMonth}/${selectedYear}؟\n(سيتم استبدال الأرقام الحالية في الجدول)`);
        if (!confirmImport) return;

        setIsLoading(true);
        try {
            const targetMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

            const { data: logs, error } = await supabase
                .from('labor_daily_logs')
                .select('partner_id, date, status')
                .like('date', `${targetMonthStr}%`);

            if (error) throw error;

            if (!logs || logs.length === 0) {
                alert("⚠️ لم يتم العثور على أي يوميات مسجلة للعمال في هذا الشهر.");
                setIsLoading(false);
                return;
            }

            const daysWorkedMap: Record<string, number> = {};
            logs.forEach(log => {
                if (log.status === 'حاضر' || log.status === 'نصف يوم') {
                    const value = log.status === 'نصف يوم' ? 0.5 : 1;
                    daysWorkedMap[log.partner_id] = (daysWorkedMap[log.partner_id] || 0) + value;
                }
            });

            setPayrollRecords(prevRecords => prevRecords.map(r => {
                if (r.type === 'عامل يومية' && daysWorkedMap[r.id] !== undefined) {
                    const newDaysWorked = daysWorkedMap[r.id];
                    const newBaseAmount = Number(r.base_rate || 0) * newDaysWorked;
                    const newNet = newBaseAmount + Number(r.allowances || 0) - Number(r.advances || 0) - Number(r.deductions || 0);

                    return { 
                        ...r, 
                        days_worked: newDaysWorked,
                        net_salary: newNet 
                    };
                }
                return r;
            }));

            alert("✅ تمت مزامنة يوميات العمالة بنجاح، وتم تحديث الصافي المستحق!");
        } catch (error: any) {
            alert(`❌ فشل استيراد اليوميات: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // 7. دالة حفظ المسير في الداتابيز
    const savePayrollToDB = async () => {
        if (payrollRecords.length === 0) return;
        const confirmSave = confirm(`هل أنت متأكد من حفظ رواتب شهر ${selectedMonth}/${selectedYear}؟`);
        if (!confirmSave) return;

        setIsSaving(true);
        try {
            // نستخدم payrollRecords بدل filteredRecords عشان يحفظ كل الداتا مش بس نتائج البحث
            const recordsToSave = payrollRecords.map(r => ({
                emp_id: r.id,
                month: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
                basic_salary: Number(r.base_rate),
                total_advances: Number(r.advances),
                total_deductions: Number(r.deductions),
                net_salary: Number(r.net_salary),
                is_posted: false
            }));

            const { error } = await supabase.from('payroll_slips').upsert(recordsToSave);
            
            if (error) throw error;
            alert("✅ تم حفظ المسير بنجاح في قاعدة البيانات!");
        } catch (err: any) {
            alert(`❌ خطأ في الحفظ: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // 8. دالة الترحيل المحاسبي (إنشاء قيد آلي)
    const postToJournal = async () => {
        const confirmPost = confirm("⚠️ تنبيه: سيتم إنشاء قيد محاسبي بمسير الرواتب. هل تريد الاستمرار؟");
        if (!confirmPost) return;

        setIsSaving(true);
        try {
            const { data: header, error: headerError } = await supabase.from('journal_headers').insert({
                date: new Date().toISOString().split('T')[0],
                description: `إثبات رواتب وأجور شهر ${selectedMonth}/${selectedYear}`,
                reference: `PR-${selectedYear}-${selectedMonth}`,
                total_amount: totals.net
            }).select().single();

            if (headerError) throw headerError;

            const lines = [
                { journal_id: header.id, account_id: 'مصروفات الرواتب والأجور', debit: totals.net + totals.deductions + totals.advances, credit: 0, description: 'إجمالي رواتب الشهر' },
                { journal_id: header.id, account_id: 'عهد وسلف الموظفين', debit: 0, credit: totals.advances, description: 'استقطاع السلف من الراتب' },
                { journal_id: header.id, account_id: 'الرواتب المستحقة', debit: 0, credit: totals.net + totals.deductions, description: 'الصافي المستحق الدفع' }
            ];

            const { error: linesError } = await supabase.from('journal_lines').insert(lines);
            if (linesError) throw linesError;

            alert("✅ تم ترحيل القيد المحاسبي بنجاح برقم: " + header.id);
            
        } catch (err: any) {
            alert(`❌ فشل الترحيل: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return {
        isLoading, filteredRecords, globalSearch, setGlobalSearch,
        selectedMonth, setSelectedMonth, selectedYear, setSelectedYear,
        updateRecord, totals, exportToExcel,
        isEditModalOpen, setIsEditModalOpen, currentRecord, setCurrentRecord, saveModalRecord,
        // تم إضافة الدوال الجديدة للـ return هنا
        importLaborLogs, savePayrollToDB, postToJournal, isSaving
    };
}