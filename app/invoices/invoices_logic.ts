"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase'; 

export function useInvoicesLogic() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]); 
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // 🔐 State الصلاحيات الخاصة بالأدمن
    const [permissions, setPermissions] = useState<any>({ isAdmin: false });
    
    const [globalSearch, setGlobalSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<any>({ lines: [] });

    // 🚀 جلب صلاحيات المستخدم الحالي (هل هو أدمن؟)
    useEffect(() => {
        const fetchAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, permissions')
                    .eq('id', session.user.id)
                    .single();
                setPermissions({ 
                    isAdmin: profile?.role === 'admin', 
                    ...profile?.permissions 
                });
            }
        };
        fetchAuth();
    }, []);

    const fetchFullData = useCallback(async () => {
        setIsLoading(true);
        const { data: inv, error: invError } = await supabase
            .from('invoices')
            .select('*, partners(*)')
            .order('date', { ascending: false });

        const { data: proj } = await supabase.from('projects').select('*');
        
        setInvoices(inv || []);
        setProjects(proj || []);
        setIsLoading(false);
    }, []);

    useEffect(() => { fetchFullData(); }, [fetchFullData]);

    const allFiltered = useMemo(() => {
        return invoices.filter(inv => {
            const matchesSearch = inv.invoice_number?.toLowerCase().includes(globalSearch.toLowerCase()) || 
                                  inv.client_name?.toLowerCase().includes(globalSearch.toLowerCase());
            return matchesSearch;
        });
    }, [invoices, globalSearch]);

    const paginatedInvoices = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return allFiltered.slice(start, start + rowsPerPage);
    }, [allFiltered, currentPage, rowsPerPage]);

    const kpis = useMemo(() => ({
        total: allFiltered.length,
        posted: allFiltered.filter(i => i.status === 'مُعتمد').length,
        pending: allFiltered.filter(i => i.status !== 'مُعتمد').length
    }), [allFiltered]);

    const handleAddNew = () => { setCurrentRecord({ lines: [], date: new Date().toISOString() }); setIsEditModalOpen(true); };
    const handleEdit = (inv: any) => { setCurrentRecord(inv); setIsEditModalOpen(true); };

    // =========================================================================
    // 🔏 0. ختم الفاتورة (صلاحية للأدمن فقط)
    // =========================================================================
    const handleToggleStamp = async (id: string, currentStatus: boolean) => {
        if (!permissions.isAdmin) {
            alert("🚫 عذراً، هذه الصلاحية مخصصة للمدير العام فقط!");
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('invoices')
                .update({ is_stamped: !currentStatus }) // نعكس الحالة الحالية (ختم/إلغاء ختم)
                .eq('id', id);

            if (error) throw error;
            
            // تحديث البيانات في الشاشة فوراً
            fetchFullData(); 
        } catch (error) {
            console.error("Stamp Error:", error);
            alert("حدث خطأ أثناء محاولة ختم الفاتورة!");
        } finally {
            setIsLoading(false);
        }
    };

    // =========================================================================
    // 🚀 1. الترحيل: إنشاء الهيدر ثم السطور (مطابق تماماً لجدول journal_lines)
    // =========================================================================
    const handlePostSelected = async () => {
        if (!selectedIds.length) return;
        
        setIsLoading(true);
        try {
            const toPost = invoices.filter(inv => selectedIds.includes(inv.id) && inv.status !== 'مُعتمد');
            
            if (toPost.length === 0) {
                alert("الفواتير المختارة مُرحلة بالفعل!");
                return;
            }

            for (const inv of toPost) {
                const invDate = inv.date || new Date().toISOString().split('T')[0];
                const unifiedNotes = `فاتورة #${inv.invoice_number} | ${inv.client_name}`;
                const unifiedProjectId = (inv.project_ids && inv.project_ids.length > 0) ? inv.project_ids[0] : null;

                // 1- حفظ رأس القيد في journal_headers
                const { data: newHeader, error: headerErr } = await supabase
                    .from('journal_headers')
                    .insert({
                        entry_date: invDate,
                        description: unifiedNotes,
                        status: 'posted',
                        reference_id: inv.id
                    })
                    .select('id')
                    .single();

                if (headerErr) throw headerErr;
                const headerId = newHeader.id;

                const linesToInsert: any[] = [];

                // 🛠️ دالة مساعدة لإنشاء السطر بناءً على أعمدة جدولك الفعلية
                const addJLine = (accId: string, debit: number, credit: number, label: string) => {
                    if (accId && (debit > 0 || credit > 0)) {
                        linesToInsert.push({
                            header_id: headerId,           // ✅ المسمى الصحيح في جدولك
                            account_id: accId,             // الحساب
                            partner_id: inv.partner_id,    // العميل
                            project_id: unifiedProjectId,  // المشروع
                            item_name: inv.description || label, // البند
                            quantity: Number(inv.quantity) || 1, 
                            unit_price: Number(inv.unit_price) || 0,
                            debit: debit,                  // مدين
                            credit: credit,                // دائن
                            notes: `${label}: ${inv.invoice_number}` // الملاحظات
                        });
                    }
                };

                // --- توزيع أطراف القيد المحاسبي ---
                // أ- الإيرادات (دائن بالإجمالي)
                addJLine(inv.credit_account_id, 0, Number(inv.line_total), "إيراد مبيعات");
                
                // ب- ضريبة القيمة المضافة (دائن)
                if (!inv.skip_zatca && Number(inv.tax_amount) > 0) {
                    addJLine(inv.tax_acc_id, 0, Number(inv.tax_amount), "ضريبة قيمة مضافة");
                }

                // ج- ذمة العميل (مدين بالصافي)
                addJLine(inv.debit_account_id, Number(inv.total_amount), 0, "مستحق على العميل");
                
                // د- خصم خامات (مدين)
                if (Number(inv.materials_discount) > 0) {
                    addJLine(inv.materials_acc_id, Number(inv.materials_discount), 0, "خصم خامات");
                }
                
                // هـ- محتجز ضمان (مدين)
                if (Number(inv.guarantee_amount) > 0) {
                    addJLine(inv.guarantee_acc_id, Number(inv.guarantee_amount), 0, "محتجز ضمان أعمال");
                }

                // 2- حفظ السطور في جدول journal_lines
                const { error: jErr } = await supabase.from('journal_lines').insert(linesToInsert);
                if (jErr) throw jErr;
            }

            // 3- تحديث حالة الفواتير في جدول invoices
            const { error: upErr } = await supabase
                .from('invoices')
                .update({ status: 'مُعتمد' })
                .in('id', selectedIds);
            
            if (upErr) throw upErr;

            alert(`✅ تم ترحيل ${toPost.length} فاتورة بنجاح ومزامنة القيود!`);
            fetchFullData();
            setSelectedIds([]);

        } catch (error: any) {
            console.error("💥 خطأ في الترحيل:", error.message);
            alert("حدث خطأ أثناء الترحيل، راجع كونسول المتصفح.");
        } finally {
            setIsLoading(false);
        }
    };

    // =========================================================================
    // 🔙 2. فك الترحيل: مسح السطور ثم الهيدر (باستخدام header_id)
    // =========================================================================
    const handleUnpostSelected = async () => {
        if(!selectedIds.length) return;
        setIsLoading(true);
        try {
            const { data: headers } = await supabase
                .from('journal_headers')
                .select('id')
                .in('reference_id', selectedIds);

            if (headers && headers.length > 0) {
                const headerIds = headers.map(h => h.id);
                await supabase.from('journal_lines').delete().in('header_id', headerIds);
                await supabase.from('journal_headers').delete().in('id', headerIds);
            }
            
            await supabase.from('invoices').update({ status: 'معلق' }).in('id', selectedIds);
            fetchFullData();
            setSelectedIds([]);
            alert("✅ تم فك الترحيل وحذف القيود المحاسبية.");
        } catch (error: any) {
            console.error("💥 خطأ فك الترحيل:", error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // =========================================================================
    // 🗑️ 3. الحذف: تنظيف محاسبي كامل قبل حذف الفاتورة
    // =========================================================================
    const handleDeleteSelected = async () => {
        if(!selectedIds.length || !confirm("حذف المختار؟")) return;
        setIsLoading(true);
        try {
            const { data: headers } = await supabase
                .from('journal_headers')
                .select('id')
                .in('reference_id', selectedIds);

            if (headers && headers.length > 0) {
                const headerIds = headers.map(h => h.id);
                await supabase.from('journal_lines').delete().in('journal_header_id', headerIds);
                await supabase.from('journal_headers').delete().in('id', headerIds);
            }

            await supabase.from('invoices').delete().in('id', selectedIds);
            
            fetchFullData();
            setSelectedIds([]);
        } catch (error) {
            console.error("Delete Error:", error);
            alert("حدث خطأ أثناء الحذف!");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (record: any) => {
        setIsSaving(true);
        try {
            const cleanId = (id: any) => (id && typeof id === 'string' && id.trim() !== '') ? id : null;

            const invoiceHeader = {
                invoice_number: record.invoice_number,
                date: record.date,
                partner_id: cleanId(record.partner_id),
                client_name: record.client_name,
                project_ids: record.project_ids || null,
                boq_id: cleanId(record.boq_id),
                description: record.description,
                quantity: Number(record.quantity) || 0,
                unit: record.unit || 'عدد',
                unit_price: Number(record.unit_price) || 0,
                line_total: Number(record.line_total) || 0,
                materials_discount: Number(record.materials_discount) || 0,
                taxable_amount: Number(record.taxable_amount) || 0,
                tax_amount: Number(record.tax_amount) || 0,
                guarantee_percent: Number(record.guarantee_percent) || 0,
                guarantee_amount: Number(record.guarantee_amount) || 0,
                total_amount: Number(record.total_amount) || 0,
                debit_account_id: cleanId(record.debit_account_id),
                credit_account_id: cleanId(record.credit_account_id),
                materials_acc_id: cleanId(record.materials_acc_id),
                guarantee_acc_id: cleanId(record.guarantee_acc_id),
                tax_acc_id: cleanId(record.tax_acc_id),
                status: record.status || 'معلق',
                due_in_days: Number(record.due_in_days) || 0,
                due_date: record.due_date,
                paid_amount: Number(record.paid_amount) || 0,
                skip_zatca: record.skip_zatca || false
            };

            let savedInvoiceId = record.id;

            if (record.id) {
                const { error: headErr } = await supabase.from('invoices').update(invoiceHeader).eq('id', record.id);
                if (headErr) throw headErr;
            } else {
                const { data: newHead, error: headErr } = await supabase
                    .from('invoices')
                    .insert([invoiceHeader])
                    .select('id')
                    .single();
                
                if (headErr) throw headErr;
                savedInvoiceId = newHead.id;
            }

            const linesToSave = record.lines || record.items || [];
            if (savedInvoiceId && linesToSave.length > 0) {
                if (record.id) {
                    await supabase.from('invoice_lines').delete().eq('invoice_id', savedInvoiceId);
                }

                const preparedLines = linesToSave.map((line: any) => ({
                    invoice_id: savedInvoiceId,
                    item_id: cleanId(line.item_id),
                    description: line.description || '',
                    unit: line.unit || 'عدد',
                    quantity: Number(line.quantity) || 0,
                    unit_price: Number(line.unit_price) || 0,
                    total_price: Number(line.total_price) || (Number(line.quantity) * Number(line.unit_price)) || 0
                }));

                const { error: linesErr } = await supabase.from('invoice_lines').insert(preparedLines);
                if (linesErr) throw linesErr;
            }

            setIsEditModalOpen(false);
            fetchFullData(); 
            
        } catch (error: any) {
            console.error("Save Error:", error);
            alert("حدث خطأ أثناء الحفظ!");
        } finally {
            setIsSaving(false);
        }
    };

    return {
        invoices: paginatedInvoices,
        allFiltered,
        projects,
        isLoading,
        isSaving,
        
        // 👈 تصدير الصلاحيات ودالة الختم عشان تستخدمهم في الـ page.tsx
        permissions,
        handleToggleStamp,
        
        globalSearch, setGlobalSearch,
        dateFrom, setDateFrom,
        dateTo, setDateTo,
        selectedIds, setSelectedIds,
        currentPage, setCurrentPage,
        rowsPerPage, setRowsPerPage,
        kpis,
        isEditModalOpen, setIsEditModalOpen,
        currentRecord, setCurrentRecord,
        handleAddNew, handleEdit, handleSave,
        handlePostSelected, handleUnpostSelected, handleDeleteSelected
    };
}