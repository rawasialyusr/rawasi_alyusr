"use client";
import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAllSupabaseData } from '@/lib/helpers';
import * as XLSX from 'xlsx';

export function useJournalErrorsLogic() {
    const [isLoading, setIsLoading] = useState(false);
    const [hasScanned, setHasScanned] = useState(false);
    
    // المصفوفات الأساسية
    const [errorLogs, setErrorLogs] = useState<any[]>([]);       
    const [unbalancedLogs, setUnbalancedLogs] = useState<any[]>([]); 
    const [duplicateLogs, setDuplicateLogs] = useState<any[]>([]); 
    const [ghostLogs, setGhostLogs] = useState<any[]>([]);        
    
    // مصفوفة للاحتفاظ بكل السطور لعرض تفاصيل القيد في الواجهة
    const [allJournalLines, setAllJournalLines] = useState<any[]>([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // 🔍 دالة الفحص (الرادار)
    const scanForErrors = useCallback(async () => {
        setIsLoading(true);
        console.log("🔍 بدأ فحص الرادار... جاري البحث عن الشبح المفقود");
        try {
            const headers = await fetchAllSupabaseData(supabase, 'journal_headers', '*', 'created_at', false) || [];
            const lines = await fetchAllSupabaseData(supabase, 'journal_lines', '*', 'id', false) || [];
            
            console.log(`📊 البيانات المسحوبة: ${headers.length} هيدر، ${lines.length} سطر.`);

            // 1. بناء Set من الـ IDs وتحويلها لنصوص نظيفة تماماً
            const headerIdsSet = new Set(
                headers.map(h => String(h.id).trim().toLowerCase())
            );

            // 2. فحص الأشباح (Journal Lines without valid Header)
            const ghostLinesData = lines.filter(l => {
                if (!l.header_id) return true; // لو الـ ID نفسه فاضي يبقى شبح
                const parentId = String(l.header_id).trim().toLowerCase();
                return !headerIdsSet.has(parentId);
            });

            console.log(`👻 الرادار عثر على: ${ghostLinesData.length} سطر شبح.`);

            if (ghostLinesData.length > 0) {
                console.log("📋 تفاصيل السطر الشبح:", ghostLinesData[0]);
            }

            // تجميع الأشباح للعرض في الواجهة
            const ghostGroups: Record<string, any> = {};
            ghostLinesData.forEach(line => {
                const hId = line.header_id ? String(line.header_id) : "N/A";
                if (!ghostGroups[hId]) {
                    ghostGroups[hId] = {
                        id: hId,
                        entry_date: line.created_at?.split('T')[0] || 'تاريخ مفقود',
                        description: `سطور يومية يتيمة (ID: ${hId})`,
                        diagnosis: `يوجد ${ghostLinesData.filter(x => String(x.header_id) === hId).length} سطر في جدول journal_lines بدون مستند أصلي.`,
                        solution: `تطهير الداتابيز بمسح هذه السطور لإصلاح ميزان المراجعة.`,
                        totalAmount: 0,
                        isGhost: true 
                    };
                }
                ghostGroups[hId].totalAmount += Number(line.debit || 0) + Number(line.credit || 0);
            });

            setGhostLogs(Object.values(ghostGroups));

            // باقي الفحوصات (اليتيمة وغير المتزنة) كما هي...
            // 
            
            const receipts = await fetchAllSupabaseData(supabase, 'receipt_vouchers', 'id', 'id', false) || [];
            const invoices = await fetchAllSupabaseData(supabase, 'invoices', 'id', 'id', false) || [];
            const expenses = await fetchAllSupabaseData(supabase, 'expenses', 'id', 'id', false) || [];
            const payments = await fetchAllSupabaseData(supabase, 'payment_vouchers', 'id', 'id', false) || [];
            const empAdv = await fetchAllSupabaseData(supabase, 'emp_adv', 'id', 'id', false) || [];
            const empDed = await fetchAllSupabaseData(supabase, 'emp_ded', 'id', 'id', false) || [];
            const laborLogs = await fetchAllSupabaseData(supabase, 'labor_daily_logs', 'id', 'id', false) || [];

            const validRefIds = new Set([
                ...receipts.map(r => String(r.id)), ...invoices.map(i => String(i.id)),
                ...expenses.map(e => String(e.id)), ...payments.map(p => String(p.id)),
                ...empAdv.map(a => String(a.id)), ...empDed.map(d => String(d.id)),
                ...laborLogs.map(l => String(l.id))
            ]);

            const orphans = headers.filter(h => {
                const refIdStr = h.reference_id ? String(h.reference_id) : null;
                return refIdStr && !validRefIds.has(refIdStr);
            }).map(h => ({
                ...h,
                diagnosis: `مستند أصلي محذوف (ID: ${h.reference_id})`,
                solution: "امسح القيد لتنظيف ميزان المراجعة."
            }));
            setErrorLogs(orphans);

            const unbal = headers.filter(h => {
                const hLines = lines.filter(l => String(l.header_id) === String(h.id));
                const dSum = hLines.reduce((s, l) => s + Number(l.debit), 0);
                const cSum = hLines.reduce((s, l) => s + Number(l.credit), 0);
                return Math.abs(dSum - cSum) > 0.01;
            }).map(h => ({
                ...h,
                diagnosis: `قيد غير متزن محاسبياً`,
                solution: "استخدم زر الموازنة التلقائية."
            }));
            setUnbalancedLogs(unbal);

            setHasScanned(true);

        } catch (err) {
            console.error("❌ خطأ في فحص الرادار:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 🗑️ مسح قيد واحد أو تطهير أشباح
    const deleteHeader = async (id: string, isGhost: boolean = false) => {
        const confirmDelete = confirm("⚠️ هل أنت متأكد من مسح البيانات نهائياً؟");
        if (!confirmDelete) return;
        setIsLoading(true);
        try {
            // مسح السطور دايماً
            await supabase.from('journal_lines').delete().eq('header_id', id);
            
            // لو مش شبح بنمسح الرأس كمان
            if (!isGhost) {
                const { error } = await supabase.from('journal_headers').delete().eq('id', id);
                if (error) throw error;
            }

            setErrorLogs(prev => prev.filter(log => log.id !== id));
            setUnbalancedLogs(prev => prev.filter(log => log.id !== id));
            setGhostLogs(prev => prev.filter(log => log.id !== id));
            alert("✅ تم تطهير البيانات بنجاح!");
        } catch (error: any) { alert(`❌ فشل المسح: ${error.message}`); } 
        finally { setIsLoading(false); }
    };

    // 🗑️ المسح الجماعي
    const deleteSelected = async () => {
        if (selectedIds.length === 0) return;
        const confirmDelete = confirm(`⚠️ هل أنت متأكد من مسح (${selectedIds.length}) سجل نهائياً؟`);
        if (!confirmDelete) return;
        setIsLoading(true);
        try {
            await supabase.from('journal_lines').delete().in('header_id', selectedIds);
            await supabase.from('journal_headers').delete().in('id', selectedIds);
            
            setErrorLogs(prev => prev.filter(log => !selectedIds.includes(log.id)));
            setUnbalancedLogs(prev => prev.filter(log => !selectedIds.includes(log.id)));
            setGhostLogs(prev => prev.filter(log => !selectedIds.includes(log.id)));
            setSelectedIds([]);
            alert("✅ تم المسح الجماعي بنجاح!");
        } catch (error: any) { alert(`❌ فشل المسح الجماعي: ${error.message}`); } 
        finally { setIsLoading(false); }
    };

    // ⚖️ أداة الموازنة التلقائية
    const forceBalanceJournal = async (headerId: string, diffAmount: number) => {
        const confirmFix = confirm(`هل تريد إضافة سطر تسوية بقيمة (${Math.abs(diffAmount).toFixed(2)}) لوزن القيد تلقائياً؟`);
        if (!confirmFix) return;
        setIsLoading(true);
        try {
            const isDebitMissing = diffAmount < 0; 
            const fixLine = {
                header_id: headerId,
                account_id: 'حساب فروق التسويات', 
                description: 'تسوية آلية لوزن القيد بواسطة رادار النظام',
                debit: isDebitMissing ? Math.abs(diffAmount) : 0,
                credit: isDebitMissing ? 0 : Math.abs(diffAmount),
                created_at: new Date().toISOString()
            };

            const { error } = await supabase.from('journal_lines').insert([fixLine]);
            if (error) throw error;

            alert("✅ تم وزن القيد وتصحيحه بنجاح!");
            scanForErrors(); 
        } catch (error: any) {
            alert(`❌ فشل التصحيح: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // 📊 تصدير تقرير الأخطاء
    const exportErrorsToExcel = () => {
        const allErrors = [
            ...errorLogs.map(e => ({ 'النوع': 'قيد يتيم', 'ID': e.id, 'التاريخ': e.entry_date, 'البيان': e.description, 'التشخيص': e.diagnosis })),
            ...unbalancedLogs.map(e => ({ 'النوع': 'غير متزن', 'ID': e.id, 'التاريخ': e.entry_date, 'البيان': e.description, 'التشخيص': e.diagnosis })),
            ...ghostLogs.map(e => ({ 'النوع': 'قيد شبح', 'ID': e.id, 'التاريخ': e.entry_date, 'البيان': e.description, 'التشخيص': e.diagnosis }))
        ];

        if (allErrors.length === 0) return alert("لا يوجد أخطاء لتصديرها.");

        const ws = XLSX.utils.json_to_sheet(allErrors);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "تقرير رادار القيود");
        XLSX.writeFile(wb, `Audit_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredOrphans = useMemo(() => errorLogs.filter(l => String(l.id).includes(searchQuery) || l.description?.includes(searchQuery)), [errorLogs, searchQuery]);
    const filteredUnbalanced = useMemo(() => unbalancedLogs.filter(l => String(l.id).includes(searchQuery) || l.description?.includes(searchQuery)), [unbalancedLogs, searchQuery]);
    const filteredDuplicates = useMemo(() => duplicateLogs || [], [duplicateLogs]);
    const filteredGhosts = useMemo(() => ghostLogs.filter(l => String(l.id).includes(searchQuery) || l.description?.includes(searchQuery)), [ghostLogs, searchQuery]);

    return { 
        isLoading, hasScanned, searchQuery, setSearchQuery, selectedIds,
        filteredOrphans, filteredUnbalanced, filteredDuplicates, filteredGhosts,      
        allJournalLines,
        scanForErrors, 
        deleteHeader, 
        deleteSelected, 
        forceBalanceJournal,
        exportErrorsToExcel,
        toggleSelection: (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),
        setSelectedIds
    };
}