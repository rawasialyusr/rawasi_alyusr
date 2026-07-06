"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx-js-style';
import { fetchAllSupabaseData } from '@/lib/helpers';

export function usePayrollLogic() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // فلاتر الشهر والسنة وتاريخ القطع
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [cutoffDate, setCutoffDate] = useState<string>(new Date().toISOString().split('T')[0]); 
    
    const [globalSearch, setGlobalSearch] = useState('');
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]); 
    const [filterActiveOnly, setFilterActiveOnly] = useState(false); 

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<any>(null);

    const isFetchingRef = useRef(false);

    // 🚀 الكاميرا الحية: عشان نمنع الأزرار الجانبية من إرسال الأصفار القديمة (Stale Closures)
    const latestRecordsRef = useRef(payrollRecords);
    const latestFilteredRef = useRef<any[]>([]);

    useEffect(() => {
        latestRecordsRef.current = payrollRecords;
    }, [payrollRecords]);

    // 1. جلب البيانات (محصنة ضد تغير الرصيد السابق)
    const fetchPayrollData = async () => {
        if (isFetchingRef.current) return; 
        isFetchingRef.current = true;
        setIsLoading(true);
        
        const targetMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        try {
            const empData = await fetchAllSupabaseData(supabase, 'partners', 'id, name, partner_type, job_role, identity_number', 'name');
            // We need to filter empData in memory since fetchAllSupabaseData currently doesn't accept complex filters
            const filteredEmpData = empData.filter((p: any) => ['موظف', 'عامل', 'عامل يومية'].includes(p.partner_type));

            const { data: balData, error: balError } = await supabase.rpc('get_payroll_balances_with_cutoff', {
                p_month: selectedMonth, p_year: selectedYear, p_cutoff_date: cutoffDate
            });
            if (balError) throw balError;

            const { data: syncData, error: syncError } = await supabase.rpc('pull_payroll_module_data', {
                p_month: selectedMonth, p_year: selectedYear, p_cutoff_date: cutoffDate
            });
            if (syncError) throw syncError;

            const savedSlips = await fetchAllSupabaseData(supabase, 'payroll_slips');
            const targetMonthSlips = savedSlips.filter((s: any) => s.month === targetMonthStr);

            setEmployees(filteredEmpData || []);

            const initialPayroll = (filteredEmpData || []).map(emp => {
                const balanceObj = (balData || []).find((b: any) => b.partner_id === emp.id);
                // الرصيد الحي من قاعدة البيانات
                const livePrevUnpaid = balanceObj ? Number(balanceObj.previous_unpaid_balance) : 0;

                const moduleData = (syncData || []).find((d: any) => d.partner_id === emp.id);
                const savedSlipObj = (targetMonthSlips || []).find((s: any) => s.emp_id === emp.id);
                
                let baseRate = 0;
                let daysWorked = moduleData ? Number(moduleData.days_worked || 0) : 0;
                let deductions = 0;
                let extendedAdvances = 0;
                let allowances = 0;
                let amountToPay = 0;
                let status = 'غير مدفوع';
                let prevUnpaid = 0;

                if (savedSlipObj) {
                    // 🛡️ لو المسير محفوظ قبل كده، نقرأ البيانات المحفوظة بالكامل عشان الرصيد ما يضربش
                    baseRate = Number(savedSlipObj.basic_salary || 0);
                    allowances = Number(savedSlipObj.allowances || 0);
                    deductions = Number(savedSlipObj.total_deductions || 0);
                    extendedAdvances = Number(savedSlipObj.total_advances || 0);
                    amountToPay = Number(savedSlipObj.amount_to_pay || 0);
                    status = savedSlipObj.status || 'غير مدفوع';
                    
                    // 💡 المعادلة العكسية: استنتاج الرصيد السابق اللي كان محفوظ وقتها 
                    const savedCurrentNet = baseRate + allowances - deductions - extendedAdvances;
                    prevUnpaid = Number(savedSlipObj.net_salary || 0) - savedCurrentNet;
                } else {
                    // 🔄 لو مسير جديد، نجلب البيانات الحية (Live)
                    if (emp.partner_type === 'عامل يومية') {
                        baseRate = moduleData ? Number(moduleData.total_earned_wage || 0) : 0;
                    } else {
                        baseRate = 0; 
                    }
                    deductions = moduleData ? Number(moduleData.total_violations || 0) : 0;
                    extendedAdvances = moduleData ? Number(moduleData.total_payments || 0) : 0;
                    prevUnpaid = livePrevUnpaid; // الرصيد الحي
                }

                const currentNet = baseRate + allowances - deductions - extendedAdvances;
                const finalNet = currentNet + prevUnpaid;

                return {
                    id: emp.id, 
                    emp_id: emp.id,
                    name: emp.name,
                    type: emp.partner_type,
                    job_role: emp.job_role,
                    identity_number: emp.identity_number,
                    base_rate: baseRate,               
                    days_worked: daysWorked,            
                    allowances: allowances,    
                    deductions: deductions,            
                    advances: 0,        
                    previous_balance: prevUnpaid,      
                    extended_advances: extendedAdvances, 
                    current_month_net: currentNet,     
                    net_salary: finalNet, 
                    amount_to_pay: amountToPay, 
                    status: status,             
                    notes: ''
                };
            });
            setPayrollRecords(initialPayroll);
        } catch (error: any) {
            console.error("Error fetching payroll data:", error.message);
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    };

    useEffect(() => { fetchPayrollData(); }, [selectedMonth, selectedYear, cutoffDate]);

    // 2. تحديث الخانات
    const updateRecord = (id: string, field: string, value: string | number) => {
        setPayrollRecords(prev => prev.map(rec => {
            if (rec.id === id) {
                const numericValue = value === '' ? '' : Number(value);
                const updated = { ...rec, [field]: numericValue };
                
                if (field !== 'amount_to_pay') {
                    const actualBase = Number(updated.base_rate) || 0;
                    updated.current_month_net = actualBase 
                                              + (Number(updated.allowances) || 0) 
                                              - (Number(updated.deductions) || 0) 
                                              - (Number(updated.advances) || 0)
                                              - (Number(updated.extended_advances) || 0); 
                    
                    updated.net_salary = updated.current_month_net + (Number(updated.previous_balance) || 0);
                }
                return updated;
            }
            return rec;
        }));
    };

    const filteredRecords = useMemo(() => {
        let result = payrollRecords;
        if (globalSearch) {
            const s = globalSearch.toLowerCase();
            result = result.filter(r => r.name.toLowerCase().includes(s) || (r.job_role || '').toLowerCase().includes(s));
        }
        if (filterActiveOnly) {
            result = result.filter(r => r.days_worked > 0 || r.type === 'موظف');
        }
        if (selectedEmployeeIds.length > 0) {
            result = result.filter(r => selectedEmployeeIds.includes(r.id));
        }
        
        latestFilteredRef.current = result;
        return result;
    }, [payrollRecords, globalSearch, selectedEmployeeIds, filterActiveOnly]);

    const totals = useMemo(() => {
        return filteredRecords.reduce((acc, curr) => ({
            allowances: acc.allowances + (Number(curr.allowances) || 0),
            deductions: acc.deductions + (Number(curr.deductions) || 0),
            advances: acc.advances + (Number(curr.advances) || 0),
            extended_advances: acc.extended_advances + (Number(curr.extended_advances) || 0), 
            previous_balances: acc.previous_balances + (Number(curr.previous_balance) || 0),  
            current_net: acc.current_net + (Number(curr.current_month_net) || 0),             
            net: acc.net + (Number(curr.net_salary) || 0),
            amount_to_pay: acc.amount_to_pay + (Number(curr.amount_to_pay) || 0),
        }), { allowances: 0, deductions: 0, advances: 0, extended_advances: 0, previous_balances: 0, current_net: 0, net: 0, amount_to_pay: 0 });
    }, [filteredRecords]);

    const exportToExcel = () => {
        const liveData = latestFilteredRef.current;
        if (liveData.length === 0) return alert("لا يوجد بيانات لتصديرها!");
        
        // 1. مصفوفة أسماء الأشهر باللغة العربية ليعطى مظهر ملوكي للعنوان 📑
        const arabicMonths = [
            "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
            "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
        ];
        const monthNameArabic = arabicMonths[selectedMonth - 1] || `شهر ${selectedMonth}`;

        // 2. تجهيز سطور البيانات
        const dataToExport = liveData.map((r, i) => {
            return {
                "م": i + 1,
                "الاسم": r.name || "غير محدد",
                "التصنيف": r.type || "---",
                "المهنة": r.job_role || "---", 
                "الأساسي": Number(r.base_rate) || 0,
                "أيام العمل": Number(r.days_worked) || 0,
                "البدلات": Number(r.allowances) || 0,
                "الغرامات": Number(r.deductions) || 0,
                "المسحوبات": Number(r.extended_advances) || 0,
                "رصيد سابق": Number(r.previous_balance) || 0,
                "الصافي الإجمالي": 0, // معادلة حية
                "المبلغ للصرف": Number(r.amount_to_pay) || 0,
                "المتبقي": 0,        // معادلة حية
                "حالة الدفع": r.status || 'غير مدفوع'
            };
        });

        // 3. إضافة سطر الإجماليات
        dataToExport.push({
            "م": "---",
            "الاسم": "الإجمـــالي الكـــلي",
            "التصنيف": "---",
            "المهنة": "---",
            "الأساسي": 0, "أيام العمل": "---", "البدلات": 0, "الغرامات": 0, "المسحوبات": 0, "رصيد سابق": 0, "الصافي الإجمالي": 0, "المبلغ للصرف": 0, "المتبقي": 0, "حالة الدفع": "---"
        });

        // 4. تحويل البيانات لشيت (البيانات تبدأ من الصف الثالث A3)
        const ws = XLSX.utils.json_to_sheet(dataToExport, { origin: 'A3' });

        // 5. دمج خلايا العنوان الرئيسي (من أول عمود لآخر عمود)
        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } });

        // 👑 6. السحر هنا: صياغة عنوان المسير الديناميكي الاحترافي
        const dynamicTitle = `كشف مسير رواتب وأجور الكوادر والموظفين - لشهـر: ${monthNameArabic} / لسنة ${selectedYear}`;
        XLSX.utils.sheet_add_aoa(ws, [[dynamicTitle]], { origin: 'A1' });

        // 7. تطبيق التنسيقات والألوان ومعادلات الـ SUBTOTAL
        const range = XLSX.utils.decode_range(ws['!ref'] || "A1:N1");
        
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = { c: C, r: R };
                const cellRef = XLSX.utils.encode_cell(cellAddress);
                
                if (!ws[cellRef]) {
                    ws[cellRef] = { t: 's', v: '' }; 
                }

                let cellValue = ws[cellRef].v;
                const excelRow = R + 1;

                let cellStyle: any = {
                    alignment: { vertical: "center", horizontal: "center" },
                    font: { name: "Arial", sz: 11, color: { rgb: "FF334155" }, bold: false },
                    fill: { fgColor: { rgb: "FFFFFFFF" } } 
                };

                // 🎛️ أ- تنسيق صف العنوان الملوكـي (الصف الأول)
                if (R === 0) {
                    cellStyle.font = { name: "Arial", sz: 15, bold: true, color: { rgb: "FFFFFFFF" } };
                    cellStyle.fill = { fgColor: { rgb: "FF0F172A" } }; // لون كحلي فخم
                } 
                // 🔹 ب- تنسيق هيدر الجدول (الصف الثالث)
                else if (R === 2) {
                    cellStyle.font = { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFFFF" } };
                    cellStyle.fill = { fgColor: { rgb: "FF3B82F6" } }; // أزرق سماوي
                } 
                // 📊 ج- سطر الإجماليات الديناميكي (SUBTOTAL)
                else if (R === range.e.r) {
                    cellStyle.font = { name: "Arial", sz: 11, bold: true, color: { rgb: "FF0F172A" } };
                    cellStyle.fill = { fgColor: { rgb: "FFFEF08A" } }; // أصفر فخم

                    if ([4, 6, 7, 8, 9, 10, 11, 12].includes(C)) {
                        const excelEndRow = range.e.r; 
                        const colLetter = String.fromCharCode(65 + C);
                        
                        ws[cellRef].t = 'n';
                        ws[cellRef].f = `SUBTOTAL(9, ${colLetter}4:${colLetter}${excelEndRow})`; 
                        delete ws[cellRef].v;
                    }
                } 
                // 👷 د- صفوف العمال وحقن المعادلات الحية
                else if (R > 2 && R < range.e.r) {
                    if (R % 2 === 0) {
                        cellStyle.fill = { fgColor: { rgb: "FFF8FAFC" } }; 
                    }

                    if (C === 10) { 
                        ws[cellRef].t = 'n';
                        ws[cellRef].f = `E${excelRow}+G${excelRow}-H${excelRow}-I${excelRow}+J${excelRow}`;
                        delete ws[cellRef].v;
                    } 
                    else if (C === 12) { 
                        ws[cellRef].t = 'n';
                        ws[cellRef].f = `K${excelRow}-L${excelRow}`;
                        delete ws[cellRef].v;
                    }

                    // التلوين الشرطي للأعمدة
                    if ([4, 6, 10, 11].includes(C)) {
                        cellStyle.font = { name: "Arial", sz: 11, color: { rgb: "FF16A34A" }, bold: true }; 
                    } 
                    else if ([7, 8, 9].includes(C)) {
                        cellStyle.font = { name: "Arial", sz: 11, color: { rgb: "FFDC2626" }, bold: true }; 
                    }
                    else if (C === 12) {
                        cellStyle.font = { name: "Arial", sz: 11, color: { rgb: "FFEA580C" }, bold: true }; 
                    }

                    if (cellValue === 0 && [4, 6, 7, 8, 9, 11].includes(C)) {
                        cellStyle.font = { name: "Arial", sz: 11, color: { rgb: "FFCBD5E1" }, bold: false }; 
                    }
                }

                ws[cellRef].s = cellStyle;
            }
        }

        // 8. ضبط اتجاه الشيت عربي وتحديد ارتفاع صف العنوان
        ws['!dir'] = 'rtl';
        ws['!rows'] = [{ hpt: 35 }]; // إعطاء ارتفاع ممتاز ومريح لصف العنوان الرئيسي 📏

        // 9. ضبط عرض الأعمدة
        ws['!cols'] = [
            { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, 
            { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, 
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }  
        ];
        
        // 10. إنشاء وتنزيل الملف باسم ديناميكي واضح
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `مسير_${monthNameArabic}`);
        XLSX.writeFile(wb, `مسير_رواتب_شهر_${monthNameArabic}_لسنة_${selectedYear}.xlsx`);
    };

    const importLaborLogs = async () => {
        await fetchPayrollData();
        alert("✅ تم تحديث وإعادة تصفية بيانات المسير لحظياً من قاعدة البيانات!");
    };

    const savePayrollToDB = async () => {
        const liveRecords = latestRecordsRef.current;
        
        if (liveRecords.length === 0) return;
        const confirmSave = confirm(`هل أنت متأكد من حفظ رواتب ومبالغ صرف شهر ${selectedMonth}/${selectedYear}؟`);
        if (!confirmSave) return;

        setIsSaving(true);
        const targetMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        
        try {
            const recordsToSave = liveRecords.map(r => {
                const bSalary = Number(r.base_rate) || 0;
                const tAdvances = (Number(r.advances) || 0) + (Number(r.extended_advances) || 0);
                const tDeductions = Number(r.deductions) || 0;
                const allowancesNum = Number(r.allowances) || 0;
                const amtToPay = Number(r.amount_to_pay) || 0;
                
                let nSalary = Number(r.net_salary) || 0;
                if (isNaN(nSalary) || nSalary === 0) {
                    nSalary = bSalary + allowancesNum - tDeductions - tAdvances + Number(r.previous_balance || 0);
                }

                return {
                    emp_id: r.id,
                    month: targetMonthStr,
                    basic_salary: bSalary,
                    total_advances: tAdvances,
                    total_deductions: tDeductions,
                    net_salary: nSalary, 
                    allowances: allowancesNum,       
                    amount_to_pay: amtToPay, 
                    status: r.status || 'غير مدفوع',                            
                    is_posted: false
                };
            });

            const empIds = liveRecords.map(r => r.id);
            const { error: deleteError } = await supabase
                .from('payroll_slips')
                .delete()
                .eq('month', targetMonthStr)
                .in('emp_id', empIds);

            if (deleteError) throw deleteError;

            const { error: insertError } = await supabase
                .from('payroll_slips')
                .insert(recordsToSave);

            if (insertError) throw insertError;
            
            alert("✅ تم إثبات وحفظ مبالغ الصرف والتعديلات بنجاح تام!");
            
            isFetchingRef.current = false;
            await fetchPayrollData();

        } catch (err: any) {
            alert(`❌ خطأ في الحفظ: ${err.message}`);
            console.error("Full Error Details:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const postToJournal = async () => {
        const confirmPost = confirm("⚠️ سيتم إنشاء قيد محاسبي باستحقاق الرواتب. هل تريد الاستمرار؟");
        if (!confirmPost) return;

        setIsSaving(true);
        try {
            const { data: header, error: headerError } = await supabase.from('journal_headers').insert({
                entry_date: cutoffDate, 
                description: `إثبات مسير رواتب وأجور شهر ${selectedMonth}/${selectedYear}`,
                v_type: 'مسير رواتب',
                status: 'posted'
            }).select().single();

            if (headerError) throw headerError;

            const SALARIES_EXPENSE_ACC = '23623b40-72f8-460b-92f6-984457003a34'; 
            const ADVANCES_ACC = '39f878cd-dc58-4a2a-a199-50f6fca983d4'; 
            const ACCRUED_SALARIES_ACC = '70d181ba-6385-4c1e-b0fc-d5b1f800dd2c'; 

            const totalAllAdvances = totals.advances + totals.extended_advances;

            const lines = [
                { header_id: header.id, account_id: SALARIES_EXPENSE_ACC, debit: totals.current_net + totals.deductions + totalAllAdvances, credit: 0, notes: 'إجمالي استحقاق الرواتب للشهر' },
                { header_id: header.id, account_id: ADVANCES_ACC, debit: 0, credit: totalAllAdvances, notes: 'استقطاع المسحوبات من المسير' },
                { header_id: header.id, account_id: ACCRUED_SALARIES_ACC, debit: 0, credit: totals.current_net + totals.deductions, notes: 'الصافي المستحق الدفع والخصومات' }
            ];

            const { error: linesError } = await supabase.from('journal_lines').insert(lines);
            if (linesError) throw linesError;

            const targetMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
            await supabase.from('payroll_slips').update({ is_posted: true }).eq('month', targetMonthStr);

            alert("✅ تم ترحيل القيد المحاسبي بنجاح!");
        } catch (err: any) {
            alert(`❌ فشل الترحيل: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return {
        isLoading, filteredRecords, globalSearch, setGlobalSearch,
        selectedMonth, setSelectedMonth, selectedYear, setSelectedYear,
        cutoffDate, setCutoffDate, 
        employees, selectedEmployeeIds, setSelectedEmployeeIds,
        filterActiveOnly, setFilterActiveOnly,
        updateRecord, totals, exportToExcel,
        isEditModalOpen, setIsEditModalOpen, currentRecord, setCurrentRecord, 
        importLaborLogs, savePayrollToDB, postToJournal, isSaving
    };
}