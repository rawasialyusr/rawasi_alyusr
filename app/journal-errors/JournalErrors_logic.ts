"use client";
import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAllSupabaseData } from '@/lib/helpers';
import * as XLSX from 'xlsx';
import { useToast } from '@/lib/toast-context'; 

export function useJournalErrorsLogic() {
    const { showToast } = useToast(); 
    const [isLoading, setIsLoading] = useState(false);
    const [hasScanned, setHasScanned] = useState(false);
    
    const [errorLogs, setErrorLogs] = useState<any[]>([]);       
    const [unbalancedLogs, setUnbalancedLogs] = useState<any[]>([]); 
    const [duplicateLogs, setDuplicateLogs] = useState<any[]>([]); 
    const [ghostLogs, setGhostLogs] = useState<any[]>([]);        
    const [emptyLogs, setEmptyLogs] = useState<any[]>([]); 
    
    const [allJournalLines, setAllJournalLines] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // 🔍 1. محرك الفحص (الرادار المطور)
    const scanForErrors = useCallback(async () => {
        setIsLoading(true);
        try {
            // جلب البيانات الأساسية (تخطي حد الـ 1000 سطر - الباب الثالث)
            const headers = await fetchAllSupabaseData(supabase, 'journal_headers', 'id, reference_id, entry_date, description', 'created_at', false) || [];
            const lines = await fetchAllSupabaseData(supabase, 'journal_lines', '*', 'id', false) || [];
            
            const laborLogs = await fetchAllSupabaseData(supabase, 'labor_daily_logs', 'id, is_posted') || [];
            const receipts = await fetchAllSupabaseData(supabase, 'receipt_vouchers', 'id') || [];
            const invoices = await fetchAllSupabaseData(supabase, 'invoices', 'id') || [];
            const expenses = await fetchAllSupabaseData(supabase, 'expenses', 'id') || [];
            const payments = await fetchAllSupabaseData(supabase, 'payment_vouchers', 'id') || [];

            // 🛡️ الباب التاسع: صرامة الأنواع (Strict Casting)
            const headerIdsSet = new Set(headers.map(h => String(h.id).trim().toLowerCase()));

            // 👻 فحص الأشباح
            const ghostLinesData = lines.filter(l => {
                if (!l.header_id) return true; 
                return !headerIdsSet.has(String(l.header_id).trim().toLowerCase());
            });

            const ghostGroups: Record<string, any> = {};
            ghostLinesData.forEach(line => {
                const hId = line.header_id ? String(line.header_id) : "N/A";
                if (!ghostGroups[hId]) {
                    ghostGroups[hId] = {
                        id: hId,
                        entry_date: line.created_at?.split('T')[0] || 'تاريخ مفقود',
                        description: `سطور يومية يتيمة (ID: ${hId})`,
                        diagnosis: `يوجد سجلات في الأستاذ المساعد بدون رأس قيد أصلي.`,
                        solution: `تطهير الداتابيز بمسح السطور لإصلاح ميزان المراجعة.`,
                        totalAmount: 0,
                        isGhost: true 
                    };
                }
                ghostGroups[hId].totalAmount += Number(line.debit || 0) + Number(line.credit || 0);
            });
            setGhostLogs(Object.values(ghostGroups));

            const validRefIds = new Set([
                ...receipts.map(r => String(r.id).trim().toLowerCase()), 
                ...invoices.map(i => String(i.id).trim().toLowerCase()),
                ...expenses.map(e => String(e.id).trim().toLowerCase()), 
                ...payments.map(p => String(p.id).trim().toLowerCase()),
                ...laborLogs.map(l => String(l.id).trim().toLowerCase())
            ]);

            const actualPostedIds = new Set(
                laborLogs.filter(l => l.is_posted === true).map(l => String(l.id).trim().toLowerCase())
            );

            // 🗑️ فحص القيود اليتيمة وتناقضات الحالة
            const orphans = headers.filter(h => {
                if (!h.reference_id) return false;
                const refIdStr = String(h.reference_id).trim().toLowerCase();
                const isOrphan = !validRefIds.has(refIdStr);
                const isLaborLog = h.description?.includes('يومية') || h.description?.includes('عامل');
                const isStatusMismatched = isLaborLog && validRefIds.has(refIdStr) && !actualPostedIds.has(refIdStr);
                return isOrphan || isStatusMismatched;
            }).map(h => {
                const refIdStr = String(h.reference_id).trim().toLowerCase();
                const isMismatched = validRefIds.has(refIdStr) && !actualPostedIds.has(refIdStr);
                return {
                    ...h,
                    diagnosis: isMismatched 
                        ? `⚠️ تناقض: القيد موجود والسجل الأصلي "معلق".` 
                        : `⚠️ قيد يتيم: المستند الأصلي (ID: ${h.reference_id}) غير موجود.`,
                    solution: "يجب مسح هذا القيد لإعادة التوازن المحاسبي."
                };
            });
            setErrorLogs(orphans);

            // ⚖️ فحص الاتزان
            const unbal = headers.filter(h => {
                const hLines = lines.filter(l => String(l.header_id).trim().toLowerCase() === String(h.id).trim().toLowerCase());
                const dSum = hLines.reduce((s, l) => s + Number(l.debit), 0);
                const cSum = hLines.reduce((s, l) => s + Number(l.credit), 0);
                if (dSum === 0 && cSum === 0 && hLines.length === 0) return false; 
                return Math.abs(dSum - cSum) > 0.01;
            }).map(h => ({
                ...h,
                diagnosis: `قيد غير متزن محاسبياً`,
                solution: "استخدم زر الموازنة التلقائية."
            }));
            setUnbalancedLogs(unbal);

            setHasScanned(true);
            showToast('تم اكتمال الفحص الشامل للرادار 🕵️‍♂️', 'success');

        } catch (err: any) {
            showToast(`خطأ أثناء الفحص: ${err.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    // 🛡️ 2. محرك الحذف العميق (Deep Cascade Delete)
    const deleteHeader = async (id: string, isGhost: boolean = false) => {
        const confirmDelete = confirm("⚠️ سيتم مسح القيد وجميع السطور المرتبطة به نهائياً. هل تريد المتابعة؟");
        if (!confirmDelete) return;
        setIsLoading(true);
        try {
            // الباب الثاني: الإلغاء المتسلسل وقنص القيود
            if (isGhost && id === "N/A") {
                await supabase.from('journal_lines').delete().is('header_id', null);
            } else {
                // 1. قنص السطور أولاً لضمان عدم وجود أخطاء FK
                const { error: linesErr } = await supabase.from('journal_lines').delete().eq('header_id', id);
                if (linesErr) throw linesErr;
                
                // 2. محاولة جلب الـ reference_id قبل مسح الرأس لتصفير العدادات (الباب الثاني)
                const { data: headData } = await supabase.from('journal_headers').select('reference_id, description').eq('id', id).single();

                // 3. مسح الرأس
                const { error: headErr } = await supabase.from('journal_headers').delete().eq('id', id);
                if (headErr) throw headErr;

                // 4. تصفير العدادات في الجوال (يومية العمال مثلاً) إذا كان القيد يخصها
                if (headData?.reference_id && (headData.description?.includes('يومية') || headData.description?.includes('عامل'))) {
                    await supabase.from('labor_daily_logs').update({ is_posted: false }).eq('id', headData.reference_id);
                }
            }

            // تحديث الواجهة فوراً
            setErrorLogs(prev => prev.filter(log => log.id !== id));
            setUnbalancedLogs(prev => prev.filter(log => log.id !== id));
            setGhostLogs(prev => prev.filter(log => log.id !== id));
            setDuplicateLogs(prev => prev.filter(log => log.id !== id));
            setEmptyLogs(prev => prev.filter(log => log.id !== id));
            
            showToast("تم تطهير القيد وارتباطاته بنجاح 🗑️", 'success');
        } catch (error: any) { 
            showToast(`فشل المسح: ${error.message}`, 'error'); 
        } finally { 
            setIsLoading(false); 
        }
    };

    // 🛡️ 3. المسح الجماعي المحسن (Atomic Chunking)
    const deleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`⚠️ سيتم تطهير (${selectedIds.length}) قيود تماماً. هل أنت متأكد؟`)) return;
        setIsLoading(true);
        try {
            // الباب الثالث: التجزئة (Chunking) لمنع الـ Timeout
            const CHUNK_SIZE = 20; 
            const allIds = selectedIds.map(id => String(id));

            for (let i = 0; i < allIds.length; i += CHUNK_SIZE) {
                const chunk = allIds.slice(i, i + CHUNK_SIZE);
                const realIds = chunk.filter(id => id !== "N/A");

                if (chunk.includes("N/A")) {
                    await supabase.from('journal_lines').delete().is('header_id', null);
                }

                if (realIds.length > 0) {
                    // مسح متسلسل لضمان النزاهة
                    await supabase.from('journal_lines').delete().in('header_id', realIds);
                    await supabase.from('journal_headers').delete().in('id', realIds);
                }
            }
            
            // تحديث الحالة لجميع المصفوفات
            const filterOut = (prev: any[]) => prev.filter(log => !selectedIds.includes(String(log.id)));
            setErrorLogs(filterOut);
            setUnbalancedLogs(filterOut);
            setGhostLogs(filterOut);
            setDuplicateLogs(filterOut);
            setEmptyLogs(filterOut);

            setSelectedIds([]);
            showToast("تم التطهير الجماعي بنجاح 🧹", 'success');
        } catch (error: any) { 
            showToast(`فشل المسح الجماعي: ${error.message}`, 'error'); 
        } finally { 
            setIsLoading(false); 
        }
    };

    // ⚖️ 4. محرك الموازنة التلقائية (Idempotency Shield)
    const forceBalanceJournal = async (headerId: string, diffAmount: number) => {
        const confirmFix = confirm(`إضافة سطر تسوية بـ (${Math.abs(diffAmount).toFixed(2)})؟`);
        if (!confirmFix) return;
        setIsLoading(true);
        try {
            const isDebitMissing = diffAmount < 0; 
            const fixLine = {
                header_id: String(headerId),
                account_id: '23623b40-72f8-460b-92f6-984457003a34', 
                description: 'تسوية آلية - رادار الميثاق V11',
                debit: isDebitMissing ? Math.abs(diffAmount) : 0,
                credit: isDebitMissing ? 0 : Math.abs(diffAmount),
                partner_id: null // الباب الثامن: حسابات التسوية العامة = null
            };

            const { error } = await supabase.from('journal_lines').insert([fixLine]);
            if (error) throw error;

            showToast("تم وزن القيد بنجاح ⚖️", 'success');
            scanForErrors(); 
        } catch (error: any) {
            showToast(`فشل التصحيح: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // 📊 5. التصدير (Pure Logic)
    const exportErrorsToExcel = () => {
        const allErrors = [
            ...errorLogs.map(e => ({ 'النوع': 'قيد يتيم/متناقض', 'ID': e.id, 'التشخيص': e.diagnosis })),
            ...unbalancedLogs.map(e => ({ 'النوع': 'غير متزن', 'ID': e.id, 'التشخيص': e.diagnosis })),
            ...ghostLogs.map(e => ({ 'النوع': 'سطور شبح', 'ID': e.id, 'التشخيص': e.diagnosis }))
        ];
        if (allErrors.length === 0) return showToast("لا يوجد أخطاء ✨", 'info');

        const ws = XLSX.utils.json_to_sheet(allErrors);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Audit_Report");
        XLSX.writeFile(wb, `Journal_Audit_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filterBySearch = (logs: any[]) => logs.filter(l => String(l.id).includes(searchQuery) || l.description?.includes(searchQuery));

    return { 
        isLoading, hasScanned, searchQuery, setSearchQuery, selectedIds,
        filteredOrphans: useMemo(() => filterBySearch(errorLogs), [errorLogs, searchQuery]),
        filteredUnbalanced: useMemo(() => filterBySearch(unbalancedLogs), [unbalancedLogs, searchQuery]),
        filteredGhosts: useMemo(() => filterBySearch(ghostLogs), [ghostLogs, searchQuery]),
        filteredDuplicates: useMemo(() => filterBySearch(duplicateLogs), [duplicateLogs, searchQuery]),
        filteredEmpty: useMemo(() => filterBySearch(emptyLogs), [emptyLogs, searchQuery]),
        scanForErrors, deleteHeader, deleteSelected, forceBalanceJournal, exportErrorsToExcel,
        setSelectedIds, toggleSelection: (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    };
}