"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import * as XLSX from 'xlsx';

export function useEmployeesLogic() {
    const [records, setRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [globalSearch, setGlobalSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // للتحكم في التبويبات داخل ملف العامل (بيانات / كشف حساب)
    const [activeTab, setActiveTab] = useState<'info' | 'ledger'>('info');
    const [employeeLedger, setEmployeeLedger] = useState<any[]>([]);

    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    const defaultRecord = {
        code: '', name: '', partner_type: 'موظف', nationality: '', identity_number: '',
        iqama_expiry: '', job_role: '', phone: '', address: '', status: 'نشط',
        basic_salary: 0, bank_iban: '', notes: ''
    };

    const [currentRecord, setCurrentRecord] = useState<any>(defaultRecord);

    const fetchRecords = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('partners')
            .select('*')
            .in('partner_type', ['موظف', 'عامل', 'عامل يومية'])
            .order('created_at', { ascending: false });
            
        if (!error && data) setRecords(data);
        setIsLoading(false);
    };

    useEffect(() => { fetchRecords(); }, []);

    const kpis = useMemo(() => {
        const total = records.length;
        const active = records.filter(r => r.status === 'نشط').length;
        const totalBasicSalaries = records.filter(r => r.status === 'نشط').reduce((sum, r) => sum + (Number(r.basic_salary) || 0), 0);
        return { total, active, totalBasicSalaries };
    }, [records]);

    const filteredRecords = useMemo(() => {
        const s = globalSearch.toLowerCase();
        return records.filter(r => 
            (r.name || '').toLowerCase().includes(s) || 
            (r.identity_number || '').toLowerCase().includes(s) ||
            (r.job_role || '').toLowerCase().includes(s)
        );
    }, [records, globalSearch]);

    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filteredRecords.slice(start, start + rowsPerPage);
    }, [filteredRecords, currentPage, rowsPerPage]);

    // 🟢 دالة جلب كشف حساب العامل (اليوميات والسلف)
    const fetchEmployeeLedger = async (empName: string, empSalary: number) => {
        // هنا يمكنك لاحقاً ربطها بجدول daily_reports أو journal_lines
        // حالياً سنقوم بإنشاء كشف حساب وهمي (Mock) لتوضيح الفكرة والشكل الاحترافي
        const mockLedger = [
            { id: 1, date: '2026-04-01', description: 'رصيد افتتاحي مرحل', credit: 0, debit: 0, balance: 0 },
            { id: 2, date: '2026-04-05', description: 'يومية عمل - مشروع النرجس', credit: empSalary > 0 ? empSalary : 150, debit: 0, balance: empSalary > 0 ? empSalary : 150 },
            { id: 3, date: '2026-04-10', description: 'سلفة نقدية', credit: 0, debit: 50, balance: (empSalary > 0 ? empSalary : 150) - 50 },
            { id: 4, date: '2026-04-12', description: 'يومية عمل - مشروع الياسمين', credit: empSalary > 0 ? empSalary : 150, debit: 0, balance: ((empSalary > 0 ? empSalary : 150) * 2) - 50 }
        ];
        setEmployeeLedger(mockLedger);
    };

    const openEmployeeProfile = (id: string) => {
        const r = records.find(x => x.id === id);
        if (r) {
            setEditingId(r.id);
            setCurrentRecord(r);
            setActiveTab('info');
            fetchEmployeeLedger(r.name, Number(r.basic_salary));
            setIsEditModalOpen(true);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (editingId) {
                await supabase.from('partners').update(currentRecord).eq('id', editingId);
            } else {
                await supabase.from('partners').insert([currentRecord]);
            }
            await fetchRecords();
            setIsEditModalOpen(false);
            setSelectedIds([]);
        } catch (err: any) { alert("❌ خطأ: " + err.message); }
        finally { setIsSaving(false); }
    };

    return {
        isLoading, paginatedRecords, filteredRecords, globalSearch, setGlobalSearch, kpis,
        selectedIds, setSelectedIds, isEditModalOpen, setIsEditModalOpen,
        currentRecord, setCurrentRecord, isSaving, handleSave, editingId, 
        activeTab, setActiveTab, employeeLedger, openEmployeeProfile,
        currentPage, setCurrentPage, rowsPerPage, setRowsPerPage, totalPages: Math.ceil(filteredRecords.length / rowsPerPage) || 1,
        handleAddNew: () => { setEditingId(null); setCurrentRecord(defaultRecord); setActiveTab('info'); setIsEditModalOpen(true); }
    };
}