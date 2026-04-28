"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast'; // 🚀 استدعاء الإشعارات

export function useExpensesLogic() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]); 
    const [contractors, setContractors] = useState<any[]>([]); 
    const [payees, setPayees] = useState<any[]>([]); 
    const [accounts, setAccounts] = useState<any[]>([]); 
    const [boqItems, setBoqItems] = useState<string[]>([]); 
    const [isLoading, setIsLoading] = useState(true);

    const [userRole, setUserRole] = useState<string>('viewer');
    const [userPermissions, setUserPermissions] = useState<any>({});
    
    const [globalSearch, setGlobalSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterAccount, setFilterAccount] = useState('الكل');
    const [filterStatus, setFilterStatus] = useState('الكل');

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    const [isBulkFixModalOpen, setIsBulkFixModalOpen] = useState(false);
    const [bulkFixAccounts, setBulkFixAccounts] = useState({ creditor_account: '', payment_account: '' });

    const [distributionPreview, setDistributionPreview] = useState<any[] | null>(null);
    
    // 🟢 مفتاح التحكم اليدوي في التوزيع الذكي
    const [isDistributionEnabled, setIsDistributionEnabled] = useState(false);

    const defaultExp = { 
        exp_date: new Date().toISOString().split('T')[0], 
        sub_contractor: '', 
        site_ref: '',       
        creditor_account: '', 
        description: '', 
        payee_name: '', 
        payment_method: 'كاش', 
        payment_account: '', 
        employee_name: '', 
        quantity: 1, 
        unit_price: 0, 
        vat_amount: 0,
        discount_amount: 0, 
        discount_account: '', 
        notes: '',           
        invoice_image: null  
    };
    
    const [currentExpense, setCurrentExpense] = useState<any>(defaultExp);
    const [isSaving, setIsSaving] = useState(false);

    const fetchExpenses = async () => {
        setIsLoading(true);
        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('exp_date', { ascending: false })
                .range(from, from + step - 1);
            
            if (error) { console.error(error); break; }
            if (data && data.length > 0) {
                allData = [...allData, ...data];
                from += step;
                if (data.length < step) hasMore = false; 
            } else {
                hasMore = false;
            }
        }
        setExpenses(allData);
        setIsLoading(false);
    };

    const fetchSupportData = async () => {
        const { data: projData } = await supabase.from('projects').select('*');
        if (projData) setProjects(projData);

        const { data: partData } = await supabase.from('partners').select('name, partner_type');
        if (partData) {
            setContractors(partData.filter(p => p.partner_type === 'مقاول'));
            setPayees(partData); 
        }

        const { data: accData } = await supabase.from('accounts').select('code, name');
        if (accData) {
            const formattedAccs = accData.map(a => ({ id: `${a.code} - ${a.name}`, name: `${a.code} - ${a.name}` }));
            setAccounts(formattedAccs);
        }

        const { data: boqData } = await supabase.from('boq_items').select('item_code, item_name').limit(3000);
        if (boqData) {
            const boqFormatted = boqData.map((b: any) => `${b.item_code} - ${b.item_name}`);
            setBoqItems(Array.from(new Set(boqFormatted)));
        }
    };

    const fetchCurrentUserPermissions = async () => {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, permissions')
                .eq('id', authData.user.id)
                .single();
            if (profile) {
                setUserRole(profile.role);
                setUserPermissions(profile.permissions || {});
            }
        }
    };

    useEffect(() => { 
        fetchExpenses(); 
        fetchSupportData();
        fetchCurrentUserPermissions(); 
    }, []);

    const historicalData = useMemo(() => {
        const sites = new Set<string>();
        const contractors = new Set<string>();
        const payees = new Set<string>();
        const descriptions = new Set<string>();
        const notes = new Set<string>();

        expenses.forEach(exp => {
            if (exp.site_ref) sites.add(exp.site_ref);
            if (exp.sub_contractor) contractors.add(exp.sub_contractor);
            if (exp.payee_name) payees.add(exp.payee_name);
            if (exp.description) descriptions.add(exp.description);
            if (exp.notes) notes.add(exp.notes);
        });

        return {
            sites: Array.from(sites),
            contractors: Array.from(contractors),
            payees: Array.from(payees),
            descriptions: Array.from(descriptions),
            notes: Array.from(notes)
        };
    }, [expenses]);

    const allFiltered = useMemo(() => {
        return expenses.filter(exp => {
            const search = globalSearch.toLowerCase().trim();
            const matchesGlobal = (exp.payee_name || '').toLowerCase().includes(search) || 
                                  (exp.notes || '').toLowerCase().includes(search) || 
                                  (exp.description || '').toLowerCase().includes(search) ||
                                  (exp.sub_contractor || '').toLowerCase().includes(search) ||
                                  (exp.site_ref || '').toLowerCase().includes(search);
            const matchesAcc = filterAccount === 'الكل' || exp.creditor_account === filterAccount;
            const matchesStatus = filterStatus === 'الكل' || (filterStatus === 'مرحل' && exp.is_posted) || (filterStatus === 'معلق' && !exp.is_posted);
            const matchesDate = (!dateFrom || exp.exp_date >= dateFrom) && (!dateTo || exp.exp_date <= dateTo);
            return matchesGlobal && matchesAcc && matchesStatus && matchesDate;
        });
    }, [expenses, globalSearch, filterAccount, filterStatus, dateFrom, dateTo]);

    // 🚀 تم الاستغناء عن paginatedExpenses هنا لترك المهمة للجدول الذكي لمنع الـ Double Slicing

    const totalAmount = useMemo(() => allFiltered.reduce((sum, exp) => sum + ((Number(exp.quantity) * Number(exp.unit_price)) + Number(exp.vat_amount || 0) - Number(exp.discount_amount || 0)), 0), [allFiltered]);
    const totalPages = Math.ceil(allFiltered.length / rowsPerPage) || 1;

    const handleSaveExpense = async (passedRecord?: any) => {
        setIsSaving(true);
        
        // 🚀 السحر هنا: الاعتماد على البيانات الموزونة اللي جاية من المودال مباشرة
        const finalRecord = passedRecord || currentExpense;

        const payload = {
            exp_date: finalRecord.exp_date,
            sub_contractor: finalRecord.sub_contractor, 
            site_ref: finalRecord.site_ref,             
            creditor_account: finalRecord.creditor_account,
            description: finalRecord.description,
            payee_name: finalRecord.payee_name, 
            payment_method: finalRecord.payment_method || finalRecord.method || 'كاش',
            payment_account: finalRecord.payment_account,
            employee_name: finalRecord.employee_name,
            
            // 🛡️ تأمين جدار الحماية: الكمية مستحيل تكون صفر أو فاضية عشان Constraint الداتابيز
            quantity: Number(finalRecord.quantity) > 0 ? Number(finalRecord.quantity) : 1,
            unit_price: Number(finalRecord.unit_price) || 0,
            vat_amount: Number(finalRecord.vat_amount || 0),
            discount_amount: Number(finalRecord.discount_amount || 0),
            discount_account: finalRecord.discount_account || null,
            notes: finalRecord.notes,                   
            invoice_image: finalRecord.invoice_image,
            
            // 🚀 حفظ بنود المصروف كـ JSONB
            lines_data: finalRecord.lines_data || []
        };

        let result;
        if (editingId) {
            result = await supabase.from('expenses').update(payload).eq('id', editingId);
        } else {
            result = await supabase.from('expenses').insert([payload]);
        }

        if (!result.error) {
            await fetchExpenses();
            setIsEditModalOpen(false);
            setEditingId(null);
            setCurrentExpense(defaultExp);
        } else {
            alert("خطأ في الحفظ: " + result.error.message);
        }
        setIsSaving(false);
    };

    // =========================================================================
    // 🚀 دالة السداد المباشر من شاشة المصروفات وإصدار سند الصرف
    // =========================================================================
    const handleSavePayment = async (paymentData: any) => {
        setIsSaving(true);
        const toastId = toast.loading('جاري إصدار سند الصرف وتحديث المصروف...');
        try {
            // 1. استخراج بيانات المستخدم الحالي للتوقيع
            const { data: { session } } = await supabase.auth.getSession();

            // 2. تكوين بيانات السند
            const voucherPayload = {
                expense_id: paymentData.id, 
                voucher_number: `PV-${Date.now().toString().slice(-6)}`,
                date: paymentData.payment_date || new Date().toISOString().split('T')[0],
                payee_name: paymentData.payee_name || paymentData.sub_contractor,
                amount: paymentData.amount,
                payment_method: paymentData.payment_method,
                payment_account: paymentData.payment_account,
                site_ref: paymentData.site_ref,
                description: paymentData.payment_notes || `سداد مصروف لـ ${paymentData.description || 'أعمال مقاولات'}`,
                reference_number: paymentData.reference_number || '',
                is_posted: false, 
                created_by: session?.user?.id
            };

            // 3. إدراج السند في الداتابيز
            const { error: voucherErr } = await supabase.from('payment_vouchers').insert([voucherPayload]);
            if (voucherErr) throw voucherErr;

            // 4. تحديث قيمة الدفع في المصروف الأصلي
            const currentPaid = Number(paymentData.paid_amount || 0);
            const newPaidAmount = currentPaid + Number(paymentData.amount);

            const { error: expErr } = await supabase
                .from('expenses')
                .update({ paid_amount: newPaidAmount })
                .eq('id', paymentData.id);
            
            if (expErr) throw expErr;

            toast.success('تم إصدار سند الصرف وتحديث المصروف بنجاح ✅', { id: toastId });
            await fetchExpenses(); 
        } catch (error: any) {
            console.error(error);
            toast.error(`حدث خطأ أثناء السداد: ${error.message}`, { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const calculateDistribution = async () => {
        if (!currentExpense.exp_date || !currentExpense.unit_price || !currentExpense.creditor_account) {
            return alert("يرجى إدخال التاريخ، الحساب المدين، وقيمة المصروف أولاً.");
        }

        setIsSaving(true);
        
        const { data, error } = await supabase
            .from('daily_attendance') 
            .select('site_ref, workers_count')
            .eq('date', currentExpense.exp_date);

        if (error || !data || data.length === 0) {
            setIsSaving(false);
            return alert(`لا يوجد تقرير عمال مسجل ليوم ${currentExpense.exp_date} لتوزيع التكلفة عليه.`);
        }

        const totalWorkers = data.reduce((sum, row) => sum + (Number(row.workers_count) || 0), 0);
        
        if (totalWorkers === 0) {
            setIsSaving(false);
            return alert("إجمالي عدد العمال في هذا اليوم يساوي صفر!");
        }

        const subtotal = Number(currentExpense.quantity) * Number(currentExpense.unit_price);
        const vat = Number(currentExpense.vat_amount || 0);
        const discount = Number(currentExpense.discount_amount || 0);

        const preview = data.map((row: any) => {
            const ratio = Number(row.workers_count) / totalWorkers;
            return {
                ...currentExpense,
                site_ref: row.site_ref,
                quantity: 1, 
                unit_price: Number((subtotal * ratio).toFixed(2)),
                vat_amount: Number((vat * ratio).toFixed(2)),
                discount_amount: Number((discount * ratio).toFixed(2)),
                workers_count: row.workers_count,
                ratio_percent: (ratio * 100).toFixed(1),
                notes: (currentExpense.notes ? currentExpense.notes + ' | ' : '') + `(توزيع تلقائي: ${row.workers_count} عامل من ${totalWorkers})`
            };
        });

        setDistributionPreview(preview);
        setIsSaving(false);
    };

    const confirmDistribution = async () => {
        if (!distributionPreview || distributionPreview.length === 0) return;
        setIsSaving(true);

        const payload = distributionPreview.map(item => {
            const { workers_count, ratio_percent, id, ...cleanItem } = item;
            return cleanItem;
        });

        const { error } = await supabase.from('expenses').insert(payload);

        if (error) {
            alert("خطأ أثناء التوزيع والحفظ: " + error.message);
        } else {
            await fetchExpenses();
            setDistributionPreview(null);
            setIsEditModalOpen(false);
            setCurrentExpense(defaultExp);
            setIsDistributionEnabled(false); 
            alert(`✅ تم توزيع المصروف على ${payload.length} مشروع بنجاح!`);
        }
        setIsSaving(false);
    };

    const handleBulkFixSave = async () => {
        if (selectedIds.length === 0) return;
        if (!bulkFixAccounts.creditor_account && !bulkFixAccounts.payment_account) {
            return alert("يرجى تحديد حساب واحد على الأقل لتصحيحه.");
        }
        setIsSaving(true);
        
        const updatePayload: any = {};
        if (bulkFixAccounts.creditor_account && bulkFixAccounts.creditor_account.includes(' - ')) {
            updatePayload.creditor_account = bulkFixAccounts.creditor_account;
        }
        if (bulkFixAccounts.payment_account && bulkFixAccounts.payment_account.includes(' - ')) {
            updatePayload.payment_account = bulkFixAccounts.payment_account;
        }

        if (Object.keys(updatePayload).length === 0) {
            setIsSaving(false);
            return alert("عذراً، يجب اختيار الحساب من القائمة المنسدلة لضمان التنسيق الصحيح.");
        }

        const { error } = await supabase
            .from('expenses')
            .update(updatePayload)
            .in('id', selectedIds)
            .eq('is_posted', false);

        if (error) {
            alert("خطأ أثناء التحديث: " + error.message);
        } else {
            await fetchExpenses();
            setIsBulkFixModalOpen(false);
            setBulkFixAccounts({ creditor_account: '', payment_account: '' });
            alert(`✅ تم تصحيح وتوجيه الحسابات لعدد ${selectedIds.length} مصروف بنجاح! يمكنك ترحيلهم الآن.`);
        }
        setIsSaving(false);
    };

    const handleAddNew = () => { setCurrentExpense(defaultExp); setEditingId(null); setIsDistributionEnabled(false); setIsEditModalOpen(true); };
    
    const handleEditSelected = () => {
        if (selectedIds.length !== 1) return alert("اختر سجلاً واحداً للتعديل");
        const exp = expenses.find(e => e.id === selectedIds[0]);
        setCurrentExpense({...exp});
        setEditingId(exp.id);
        setIsDistributionEnabled(false);
        setIsEditModalOpen(true);
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        
        if (!confirm('⚠️ تحذير: حذف المصروفات المختارة سيؤدي أيضاً إلى حذف (سندات الصرف) و(القيود المحاسبية) المرتبطة بها نهائياً! هل أنت متأكد؟')) return;
        
        setIsSaving(true);
        const toastId = toast.loading('جاري المسح التسلسلي للمصروفات والسندات...');

        try {
            // 1. البحث عن سندات الصرف المرتبطة بهذه المصروفات
            const { data: linkedVouchers } = await supabase
                .from('payment_vouchers')
                .select('id')
                .in('expense_id', selectedIds);

            const voucherIds = linkedVouchers?.map(v => v.id) || [];

            // 2 & 3. مسح قيود سندات الصرف، ثم مسح سندات الصرف نفسها
            if (voucherIds.length > 0) {
                await supabase.from('journal_headers').delete().in('reference_id', voucherIds);
                await supabase.from('payment_vouchers').delete().in('id', voucherIds);
            }

            // 4. مسح القيود المحاسبية الخاصة بالمصروفات الأساسية (إن كانت مُرحلة)
            await supabase.from('journal_headers').delete().in('reference_id', selectedIds);

            // 5. أخيراً: مسح المصروفات نفسها
            const { error: expError } = await supabase.from('expenses').delete().in('id', selectedIds);
            
            if (expError) throw expError;

            toast.success('تم المسح التسلسلي وتنظيف الدفاتر بنجاح 🗑️✅', { id: toastId });
            await fetchExpenses(); 
            setSelectedIds([]); 

        } catch (error: any) {
            console.error("Cascade Delete Error:", error);
            toast.error(`حدث خطأ أثناء الحذف: ${error.message}`, { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePostSingle = async (id: string, skipFetch: boolean = false) => {
        const exp = expenses.find(e => e.id === id);
        if (!exp) return;

        try {
            const expCode = exp.creditor_account?.split(' - ')[0]?.trim();
            const payCode = exp.payment_account?.split(' - ')[0]?.trim();

            if (!expCode || !payCode) throw new Error("يجب تحديد حساب المصروف وحساب السداد (قم بتصحيحها أولاً)");

            const { data: debitAcc } = await supabase.from('accounts').select('id, name').eq('code', expCode).single();
            const { data: creditAcc } = await supabase.from('accounts').select('id, name').eq('code', payCode).single();

            if (!debitAcc) throw new Error(`حساب المصروف (${expCode}) غير موجود`);
            if (!creditAcc) throw new Error(`حساب السداد (${payCode}) غير موجود`);
            
            let taxAccId = null;
            if (exp.vat_amount > 0) {
                 const { data: taxAcc } = await supabase.from('accounts').select('id').ilike('name', '%215%ضريبة%').limit(1).single();
                 if(taxAcc) taxAccId = taxAcc.id;
                 else {
                     const { data: backupTaxAcc } = await supabase.from('accounts').select('id').ilike('name', '%ضريبة القيمة المضافة%').limit(1).single();
                     if(backupTaxAcc) taxAccId = backupTaxAcc.id;
                 }
            }

            let projectId = null;
            if (exp.site_ref) {
                const { data: proj } = await supabase.from('projects').select('id').eq('Property', exp.site_ref).single();
                if (proj) projectId = proj.id;
            }

            let partnerId = null;
            const targetName = exp.sub_contractor || exp.payee_name;
            if (targetName) {
                const { data: partner } = await supabase.from('partners').select('id').eq('name', targetName).single();
                if (partner) partnerId = partner.id;
            }

            const subtotal = Number(exp.quantity) * Number(exp.unit_price);
            const vat = Number(exp.vat_amount || 0);
            const discount = Number(exp.discount_amount || 0);
            const totalPaid = subtotal + vat - discount;

            const { data: header, error: headerErr } = await supabase.from('journal_headers').insert([{
                entry_date: exp.exp_date,      
                description: `قيد مصروف: ${exp.description}`,
                reference_id: exp.id,
                status: 'posted'               
            }]).select('id').single();

            if (headerErr || !header) throw new Error(`فشل إنشاء رأس القيد`);

            let lines: any[] = [
                {
                    header_id: header.id, account_id: debitAcc.id, partner_id: partnerId, project_id: projectId,
                    item_name: exp.description, quantity: exp.quantity, unit_price: exp.unit_price,
                    debit: subtotal, credit: 0, tax_amount: vat, notes: exp.notes
                }
            ];

            if (vat > 0 && taxAccId) {
                lines.push({
                    header_id: header.id, account_id: taxAccId, partner_id: partnerId, project_id: projectId,
                    item_name: `ضريبة ق.م - ${exp.description}`, quantity: 1, unit_price: vat,
                    debit: vat, credit: 0, tax_amount: 0, notes: exp.notes
                });
            }

            if (discount > 0) {
                if (!exp.discount_account) throw new Error("يوجد خصم ولكن لم يتم تحديد حساب لترحيل الخصم");
                const discCode = exp.discount_account.split(' - ')[0].trim();
                const { data: discAcc } = await supabase.from('accounts').select('id').eq('code', discCode).single();
                if (!discAcc) throw new Error(`حساب الخصم غير موجود`);
                
                lines.push({
                    header_id: header.id, account_id: discAcc.id, partner_id: partnerId, project_id: projectId,
                    item_name: `خصم مكتسب - ${exp.description}`, quantity: 1, unit_price: discount,
                    debit: 0, credit: discount, tax_amount: 0, notes: exp.notes
                });
            }

            lines.push({
                header_id: header.id, account_id: creditAcc.id, partner_id: partnerId, project_id: projectId,
                item_name: exp.description, quantity: 1, unit_price: totalPaid,
                debit: 0, credit: totalPaid, tax_amount: 0, notes: exp.notes
            });

            const { error: linesErr } = await supabase.from('journal_lines').insert(lines);
            if (linesErr) throw new Error(`فشل إنشاء أطراف القيد`);

            await supabase.from('expenses').update({ is_posted: true }).eq('id', id);
            
            if (!skipFetch) await fetchExpenses();

        } catch (error: any) {
            throw error; 
        }
    };

    const handleUnpostSingle = async (id: string, skipFetch: boolean = false) => {
        if(!skipFetch && !confirm("هل تريد إرجاع هذا المصروف لحالة 'غير مرحل' وحذف قيوده المحاسبية؟")) return;
        await supabase.from('journal_headers').delete().eq('reference_id', id);
        await supabase.from('expenses').update({ is_posted: false }).eq('id', id);
        if (!skipFetch) fetchExpenses();
    };

    const handlePostSelected = async () => {
        if (selectedIds.length === 0) return;
        if (confirm(`هل أنت متأكد من ترحيل عدد (${selectedIds.length}) مصروف للدفاتر؟`)) {
            setIsSaving(true);
            let successCount = 0;
            let failCount = 0;

            for (let id of selectedIds) {
                const exp = expenses.find(e => e.id === id);
                if (exp && !exp.is_posted) {
                    try { 
                        await handlePostSingle(id, true); 
                        successCount++;
                    } catch (err) { 
                        console.error(`خطأ في ترحيل ${id}:`, err); 
                        failCount++;
                    }
                }
            }
            await fetchExpenses(); 
            setSelectedIds([]); 
            setIsSaving(false);
            
            if (failCount > 0) {
                alert(`⚠️ الترحيل اكتمل مع وجود أخطاء:\n✅ نجح: ${successCount}\n❌ فشل: ${failCount}\n\n(يوجد مصروفات قديمة ليس لها حسابات مسجلة بشكل صحيح، يرجى استخدام زر "تصحيح حسابات مجمع" لإصلاحها ثم إعادة الترحيل).`);
            } else {
                alert(`✅ تم ترحيل جميع المصروفات المحددة بنجاح (${successCount}).`);
            }
        }
    };

    const handlePostAllUnposted = async () => {
        const unpostedExpenses = allFiltered.filter(exp => !exp.is_posted);
        if (unpostedExpenses.length === 0) return alert("🎉 لا يوجد مصروفات معلقة للترحيل. الدفاتر محدثة!");
        if (!confirm(`⚠️ سيتم ترحيل جميع المصروفات المعلقة (عدد ${unpostedExpenses.length} مصروف). هل أنت متأكد؟`)) return;

        setIsSaving(true);
        let successCount = 0, failCount = 0;
        for (const exp of unpostedExpenses) {
            try { await handlePostSingle(exp.id, true); successCount++; } 
            catch (error) { console.error(error); failCount++; }
        }
        await fetchExpenses();
        setSelectedIds([]);
        setIsSaving(false);
        
        if (failCount > 0) {
            alert(`⚠️ اكتمل الترحيل:\n✅ نجح: ${successCount}\n❌ فشل: ${failCount}\n\n(يوجد مصروفات فشل ترحيلها، يرجى استخدام أداة التصحيح المجمع لضبط حساباتها).`);
        } else {
            alert(`✅ تم ترحيل جميع المصروفات بنجاح.`);
        }
    };

    const handleUnpostSelected = async () => {
        if (selectedIds.length === 0) return;
        if(confirm(`هل أنت متأكد من إلغاء ترحيل (${selectedIds.length}) مصروف وحذف قيودها؟`)) {
            setIsSaving(true);
            for (let id of selectedIds) { await handleUnpostSingle(id, true); }
            await fetchExpenses();
            setSelectedIds([]); 
            setIsSaving(false);
        }
    };

    const exportToExcel = () => {
        const exportData = allFiltered.map(exp => {
            const total = (Number(exp.quantity) * Number(exp.unit_price)) + Number(exp.vat_amount || 0) - Number(exp.discount_amount || 0);
            return {
                'التاريخ': exp.exp_date, 'المقاول': exp.sub_contractor || '---', 'المشروع': exp.site_ref || '---', 'المستفيد': exp.payee_name || '---',
                'حساب المصروف': exp.creditor_account, 'حساب السداد': exp.payment_account, 'البيان': exp.description, 'العدد': exp.quantity,
                'السعر': exp.unit_price, 'الضريبة': exp.vat_amount || 0, 'الخصم': exp.discount_amount || 0, 'الصافي': -Math.abs(total), 
                'الحالة': exp.is_posted ? '✅ مرحل' : '⏳ غير مرحل'
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "سجل_المصروفات");
        XLSX.writeFile(wb, "سجل_المصروفات_المالي.xlsx");
    };

    const canAdd = userRole === 'admin' || userPermissions?.expenses?.add;
    const canEdit = userRole === 'admin' || userPermissions?.expenses?.edit;
    const canDelete = userRole === 'admin' || userPermissions?.expenses?.delete;
    const canPost = userRole === 'admin' || userPermissions?.expenses?.post;
    const canView = userRole === 'admin' || userPermissions?.expenses?.view;
    const canExport = userRole === 'admin' || userPermissions?.expenses?.print;

    return {
        isLoading, globalSearch, setGlobalSearch, dateFrom, setDateFrom, dateTo, setDateTo,
        filterAccount, setFilterAccount, filterStatus, setFilterStatus,
        
        // 🚀 تم استبدال الـ paginated بالفلتر الكامل عشان الـ SmartTable بيعمل القص تلقائي
        filteredExpenses: allFiltered, 
        
        totalAmount, selectedIds, setSelectedIds,
        currentPage, setCurrentPage, rowsPerPage, setRowsPerPage, totalPages, totalResults: allFiltered.length,
        isEditModalOpen, setIsEditModalOpen, currentExpense, setCurrentExpense, isSaving, handleSaveExpense,
        
        handleSavePayment, // 🚀 دالة السداد الجديدة تم إضافتها للاستخدام

        handleAddNew, handleEditSelected, handleDeleteSelected, handlePostSingle, handlePostSelected, exportToExcel, editingId,
        projects, contractors, payees, accounts, boqItems, historicalData, handleUnpostSingle, handleUnpostSelected, handlePostAllUnposted,
        isBulkFixModalOpen, setIsBulkFixModalOpen, bulkFixAccounts, setBulkFixAccounts, handleBulkFixSave,
        distributionPreview, setDistributionPreview, calculateDistribution, confirmDistribution,
        
        isDistributionEnabled, setIsDistributionEnabled, 
        
        canAdd, canEdit, canDelete, canPost, canView, canExport, userRole
    };
}