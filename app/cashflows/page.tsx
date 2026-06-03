"use client";
import React, { useMemo, useState, useRef, useEffect } from 'react';
import MasterPage from '@/components/MasterPage';
import { formatCurrency } from '@/lib/helpers';
import { THEME } from '@/lib/theme';
import { useCashFlowsLogic } from './cash_flows_logic';
import * as XLSX from 'xlsx';

// =========================================================================
// 🧩 مكون ذكي للقائمة المنسدلة متعددة الاختيارات
// =========================================================================
const MultiSelectDropdown = ({ options, selected, onChange, placeholder, title, accentColor }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter((opt: string) => opt.toLowerCase().includes(search.toLowerCase()));

    const handleToggle = (opt: string) => {
        if (selected.includes(opt)) {
            onChange(selected.filter((item: string) => item !== opt));
        } else {
            onChange([...selected, opt]);
        }
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <div style={{ fontSize: '11px', fontWeight: 900, marginBottom: '6px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                <span>{title}</span>
                {selected.length > 0 && (
                    <span 
                        style={{ color: '#ef4444', cursor: 'pointer', fontSize: '10px', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px' }} 
                        onClick={() => onChange([])}
                    >
                        إلغاء ({selected.length})
                    </span>
                )}
            </div>
            
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{ background: 'white', padding: '12px 15px', borderRadius: '10px', border: `2px solid #e2e8f0`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.2s', height: '48px' }}
            >
                <span style={{ fontWeight: 800, color: selected.length ? '#334155' : '#94a3b8', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selected.length > 0 ? selected.join('، ') : placeholder}
                </span>
                <span style={{ color: '#94a3b8', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }}>▼</span>
            </div>
            
            {isOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: `1px solid #e2e8f0`, borderRadius: '12px', marginTop: '8px', zIndex: 50, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <div style={{ padding: '10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <input 
                            type="text" 
                            placeholder="🔍 بحث سريع..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '12px', fontWeight: 700 }}
                        />
                    </div>
                    <div className="custom-scrollbar" style={{ maxHeight: '220px', overflowY: 'auto', padding: '5px' }}>
                        {filteredOptions.length > 0 ? filteredOptions.map((opt: string) => (
                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', cursor: 'pointer', borderRadius: '6px', background: selected.includes(opt) ? `${accentColor}15` : 'transparent', transition: '0.2s' }}>
                                <input 
                                    type="checkbox" 
                                    checked={selected.includes(opt)} 
                                    onChange={() => handleToggle(opt)} 
                                    style={{ accentColor: accentColor, transform: 'scale(1.2)', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '12px', fontWeight: 800, color: selected.includes(opt) ? accentColor : '#334155' }}>{opt}</span>
                            </label>
                        )) : (
                            <div style={{ padding: '15px', textAlign: 'center', fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>لا توجد نتائج مطابقة</div>
                        )}
                    </div>
                </div>
            )}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
};

export default function CashFlowsPage() {
    const logic = useCashFlowsLogic();
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [selectedPartners, setSelectedPartners] = useState<string[]>([]); 

    const toggleGroup = (groupName: string) => {
        if (expandedGroups.includes(groupName)) {
            setExpandedGroups(expandedGroups.filter(g => g !== groupName));
        } else {
            setExpandedGroups([...expandedGroups, groupName]);
        }
    };

    const uniqueProjects = useMemo(() => {
        const projects = logic.cashFlows.map((row: any) => row.project?.Property).filter(Boolean);
        return Array.from(new Set(projects)) as string[];
    }, [logic.cashFlows]);

    const uniquePartners = useMemo(() => {
        const partners = logic.cashFlows.map((row: any) => row.partner?.name).filter(Boolean);
        return Array.from(new Set(partners)) as string[];
    }, [logic.cashFlows]);

    const parseAmount = (val: any) => Math.abs(Number(String(val).replace(/,/g, '')) || 0);
    
    const getFlowDirection = (row: any) => {
        const type = String(row.flow_type || '').toLowerCase().trim();
        const source = String(row.source_type || '').toLowerCase().trim();
        const rawAmount = Number(String(row.amount).replace(/,/g, '')) || 0;

        if (['inflow', 'in', 'وارد', 'مقبوضات', 'قبض'].includes(type) || source === 'receipt_voucher') return 'inflow';
        if (['outflow', 'out', 'منصرف', 'مدفوعات', 'صرف'].includes(type) || source === 'payment_voucher') return 'outflow';
        
        if (rawAmount > 0) return 'inflow';
        if (rawAmount < 0) return 'outflow';

        return 'inflow';
    };

    const filteredData = useMemo(() => {
        return logic.cashFlows.filter((row: any) => {
            const searchString = `${row.description || ''} ${row.reference_number || ''} ${row.project?.Property || ''} ${row.partner?.name || ''} ${row.sub_category || ''}`.toLowerCase();
            const matchesSearch = searchString.includes(logic.searchTerm.toLowerCase());

            const direction = getFlowDirection(row);
            const matchesType = logic.filterType === 'all' ? true : direction === logic.filterType;

            const rowDateStr = row.transaction_date ? String(row.transaction_date).substring(0, 10) : '';
            const matchesDateFrom = logic.dateFrom ? rowDateStr >= logic.dateFrom : true;
            const matchesDateTo = logic.dateTo ? rowDateStr <= logic.dateTo : true;

            const projectName = row.project?.Property;
            const matchesProject = selectedProjects.length === 0 || (projectName && selectedProjects.includes(projectName));

            const partnerName = row.partner?.name;
            const matchesPartner = selectedPartners.length === 0 || (partnerName && selectedPartners.includes(partnerName));

            return matchesSearch && matchesType && matchesDateFrom && matchesDateTo && matchesProject && matchesPartner;
        });
    }, [logic.cashFlows, logic.searchTerm, logic.filterType, logic.dateFrom, logic.dateTo, selectedProjects, selectedPartners]);

    // 🚀 الإحصائيات المحدثة (شاملة تحليل المصادر)
    const summaryStats = useMemo(() => {
        let totalIn = 0;
        let totalOut = 0;
        
        // تفريغ المصادر
        let receiptVouchersTotal = 0;
        let paymentVouchersTotal = 0;
        let otherInflowsTotal = 0;
        let otherOutflowsTotal = 0;

        filteredData.forEach((row: any) => {
            const amount = parseAmount(row.amount);
            const direction = getFlowDirection(row);
            const source = String(row.source_type || '').toLowerCase().trim();

            if (direction === 'inflow') {
                totalIn += amount;
                if (source === 'receipt_voucher') receiptVouchersTotal += amount;
                else otherInflowsTotal += amount;
            } else if (direction === 'outflow') {
                totalOut += amount;
                if (source === 'payment_voucher') paymentVouchersTotal += amount;
                else otherOutflowsTotal += amount;
            }
        });

        return { 
            totalIn, 
            totalOut, 
            netCash: totalIn - totalOut,
            receiptVouchersTotal,
            paymentVouchersTotal,
            otherInflowsTotal,
            otherOutflowsTotal
        };
    }, [filteredData]);

    const treeGroupedData = useMemo(() => {
        const groups: { [key: string]: { name: string, totalIn: number, totalOut: number, items: any[] } } = {};

        filteredData.forEach((row: any) => {
            const groupName = row.partner?.name || '📦 حركات عامة (بدون شريك محدد)';
            if (!groups[groupName]) {
                groups[groupName] = { name: groupName, totalIn: 0, totalOut: 0, items: [] };
            }

            const amount = parseAmount(row.amount);
            const direction = getFlowDirection(row);

            if (direction === 'inflow') groups[groupName].totalIn += amount;
            else if (direction === 'outflow') groups[groupName].totalOut += amount;
            
            groups[groupName].items.push(row);
        });

        return Object.values(groups);
    }, [filteredData]);

    const handleExportExcel = () => {
        if (!filteredData || filteredData.length === 0) return alert("لا توجد بيانات لتصديرها!");

        const excelData = filteredData.map((row: any) => {
            const direction = getFlowDirection(row);
            return {
                'التاريخ': row.transaction_date ? String(row.transaction_date).substring(0, 10) : '---',
                'نوع التدفق': direction === 'inflow' ? 'وارد (+)' : 'منصرف (-)',
                'المبلغ': parseAmount(row.amount),
                'التصنيف': row.category || '---',
                'البيان الفرعي': row.sub_category || '---',
                'طريقة الدفع': row.payment_method || '---',
                'رقم المرجع': row.reference_number || '---',
                'الخزينة/البنك': row.account?.name || '---',
                'المشروع المربوط': row.project?.Property || '---',
                'العميل / المورد': row.partner?.name || '---',
                'ملاحظات': row.description || '---',
                'المصدر': row.source_type === 'receipt_voucher' ? 'سند قبض' : row.source_type === 'payment_voucher' ? 'سند صرف' : 'أخرى'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "التدفقات النقدية");
        
        worksheet['!cols'] = [{wch: 15}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 35}, {wch: 15}, {wch: 15}, {wch: 25}, {wch: 25}, {wch: 25}, {wch: 40}, {wch: 15}];
        worksheet['!dir'] = 'rtl';
        XLSX.writeFile(workbook, `تقرير_التدفقات_النقدية_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil((treeGroupedData.length || 0) / rowsPerPage) || 1;

    useEffect(() => { setCurrentPage(1); }, [filteredData.length, logic.searchTerm, logic.filterType, logic.dateFrom, logic.dateTo, selectedProjects, selectedPartners]);

    const paginatedGroups = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return treeGroupedData.slice(startIndex, startIndex + rowsPerPage);
    }, [treeGroupedData, currentPage, rowsPerPage]);

    return (
        <div className="clean-page">
            <MasterPage title="التدفقات النقدية (Cash Flows)" subtitle="مراقبة حركات السيولة، المقبوضات، والمدفوعات بشكل لحظي وتجميعي">
                
                <style>{`
                    .summary-card { background: rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; flex: 1; border: 1px solid rgba(0,0,0,0.05); position: relative; overflow: hidden; }
                    .summary-card::after { content: ''; position: absolute; top: 0; right: 0; width: 100%; height: 4px; }
                    .summary-card.inflow::after { background: #10b981; }
                    .summary-card.outflow::after { background: #ef4444; }
                    .summary-card.net::after { background: #3b82f6; }
                    
                    .summary-label { font-size: 13px; font-weight: 900; color: #64748b; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
                    .summary-val { font-size: 28px; font-weight: 900; color: #0f172a; }

                    .source-breakdown-card { background: white; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; flex: 1; min-width: 220px; box-shadow: 0 2px 10px rgba(0,0,0,0.01); }
                    .source-breakdown-title { font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 5px; }
                    .source-breakdown-val { font-size: 18px; font-weight: 900; }
                    
                    .filter-input { width: 100%; padding: 12px 15px; border-radius: 10px; border: 2px solid #e2e8f0; outline: none; font-weight: 700; color: #334155; transition: 0.2s; height: 48px; }
                    .filter-input:focus { border-color: ${THEME.goldAccent || '#ca8a04'}; }

                    .tree-table { width: 100%; border-collapse: collapse; text-align: center; background: white; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
                    .tree-thead { background: #1e293b; color: white; }
                    .tree-thead th { padding: 15px; font-size: 13px; font-weight: 900; }
                    
                    .master-group-row { cursor: pointer; border-bottom: 2px solid #f1f5f9; background: #ffffff; transition: 0.2s; }
                    .master-group-row:hover { background: #f8fafc; }
                    .master-group-row td { padding: 16px; font-size: 14px; font-weight: 800; }

                    .child-tree-container { background: #f8fafc; padding: 15px 30px; border-bottom: 2px solid #e2e8f0; }
                    .child-table { width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.9); border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; }
                    .child-table th { background: #475569; color: white; padding: 10px; font-size: 11px; font-weight: 900; }
                    .child-table td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; font-weight: 700; color: #334155; }
                    
                    .arrow-icon { display: inline-block; transition: transform 0.2s; margin-left: 8px; color: ${THEME.goldAccent || '#ca8a04'}; font-size: 14px; }
                    .arrow-expanded { transform: rotate(90deg); }
                `}</style>

                {/* 📊 بطاقات الملخص الرئيسية */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <div className="summary-card inflow" style={{ background: 'white', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.05)' }}>
                        <div className="summary-label"><span>📥</span> إجمالي الوارد (المقبوضات)</div>
                        <div className="summary-val" style={{ color: '#059669' }}>{formatCurrency(summaryStats.totalIn)}</div>
                    </div>
                    
                    <div className="summary-card outflow" style={{ background: 'white', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.05)' }}>
                        <div className="summary-label"><span>📤</span> إجمالي المنصرف (المدفوعات)</div>
                        <div className="summary-val" style={{ color: '#e11d48' }}>{formatCurrency(summaryStats.totalOut)}</div>
                    </div>

                    <div className="summary-card net" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: 'white', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)' }}>
                        <div className="summary-label" style={{ color: '#94a3b8' }}><span>⚖️</span> صافي التدفق النقدي (Net)</div>
                        <div className="summary-val" style={{ color: summaryStats.netCash >= 0 ? '#34d399' : '#f87171' }}>
                            {summaryStats.netCash > 0 ? '+' : ''}{formatCurrency(summaryStats.netCash)}
                        </div>
                    </div>
                </div>

                {/* 🔍 تفاصيل المصادر (Breakdown) */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap', background: '#f8fafc', padding: '15px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <div className="source-breakdown-card" style={{ borderLeft: '4px solid #10b981' }}>
                        <div>
                            <div className="source-breakdown-title">🧾 مقبوضات من (سندات القبض)</div>
                            <div className="source-breakdown-val" style={{ color: '#059669' }}>{formatCurrency(summaryStats.receiptVouchersTotal)}</div>
                        </div>
                    </div>

                    <div className="source-breakdown-card" style={{ borderLeft: '4px solid #ef4444' }}>
                        <div>
                            <div className="source-breakdown-title">💸 مدفوعات من (سندات الصرف)</div>
                            <div className="source-breakdown-val" style={{ color: '#e11d48' }}>{formatCurrency(summaryStats.paymentVouchersTotal)}</div>
                        </div>
                    </div>

                    <div className="source-breakdown-card" style={{ borderLeft: '4px solid #34d399' }}>
                        <div>
                            <div className="source-breakdown-title">📥 إيداعات من (مصادر أخرى)</div>
                            <div className="source-breakdown-val" style={{ color: '#059669' }}>{formatCurrency(summaryStats.otherInflowsTotal)}</div>
                        </div>
                    </div>

                    <div className="source-breakdown-card" style={{ borderLeft: '4px solid #fb7185' }}>
                        <div>
                            <div className="source-breakdown-title">📤 سحوبات من (مصادر أخرى)</div>
                            <div className="source-breakdown-val" style={{ color: '#e11d48' }}>{formatCurrency(summaryStats.otherOutflowsTotal)}</div>
                        </div>
                    </div>
                </div>

                {/* 🔍 شريط الفلاتر */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: `1px solid #e2e8f0`, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    
                    <div style={{ flex: '1', minWidth: '180px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 900, color: '#64748b', marginBottom: '6px', display: 'block' }}>بحث عام</label>
                        <input 
                            type="text" 
                            className="filter-input"
                            placeholder="🔍 بحث بالبيان، المرجع..." 
                            value={logic.searchTerm}
                            onChange={(e) => logic.setSearchTerm(e.target.value)}
                        />
                    </div>

                    <MultiSelectDropdown 
                        title="🏢 التوجيه (الفيلا)"
                        placeholder="كل التوجيهات"
                        options={uniqueProjects}
                        selected={selectedProjects}
                        onChange={setSelectedProjects}
                        accentColor={THEME.primary || '#2563eb'}
                    />

                    <MultiSelectDropdown 
                        title="👤 الشريك (عميل/مورد)"
                        placeholder="كل الشركاء"
                        options={uniquePartners}
                        selected={selectedPartners}
                        onChange={setSelectedPartners}
                        accentColor="#8b5cf6" 
                    />
                    
                    <div style={{ width: '130px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 900, color: '#64748b', marginBottom: '6px', display: 'block' }}>نوع الحركة</label>
                        <select className="filter-input" value={logic.filterType} onChange={(e) => logic.setFilterType(e.target.value)}>
                            <option value="all">كل الحركات</option>
                            <option value="inflow">وارد (مقبوضات)</option>
                            <option value="outflow">منصرف (مدفوعات)</option>
                        </select>
                    </div>

                    <div style={{ width: '130px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 900, color: '#64748b', marginBottom: '6px', display: 'block' }}>من تاريخ</label>
                        <input type="date" className="filter-input" value={logic.dateFrom} onChange={(e) => logic.setDateFrom(e.target.value)} />
                    </div>

                    <div style={{ width: '130px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 900, color: '#64748b', marginBottom: '6px', display: 'block' }}>إلى تاريخ</label>
                        <input type="date" className="filter-input" value={logic.dateTo} onChange={(e) => logic.setDateTo(e.target.value)} />
                    </div>

                    <button 
                        onClick={handleExportExcel}
                        style={{ padding: '0 15px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '10px', color: '#334155', fontWeight: 900, cursor: 'pointer', transition: '0.2s', height: '48px' }}
                    >
                        🖨️ Excel
                    </button>
                </div>

                {/* 🌳 جدول الشجرة التجميعي */}
                {logic.isLoading ? (
                    <div style={{ textAlign: 'center', padding: '5px', fontWeight: 900, color: '#64748b' }}>⏳ جاري تحميل شجرة التدفقات النقدية...</div>
                ) : (
                    <table className="tree-table">
                        <thead className="tree-thead">
                            <tr>
                                <th style={{ textAlign: 'right', width: '35%' }}>👤 الشريك (مقاول / مورد / عميل)</th>
                                <th style={{ width: '15%' }}>📥 المقبوضات</th>
                                <th style={{ width: '15%' }}>📤 المدفوعات</th>
                                <th style={{ width: '20%' }}>⚖️ الصافي</th>
                                <th style={{ width: '15%' }}>الحركات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedGroups.map((group) => {
                                const isExpanded = expandedGroups.includes(group.name);
                                const netGroupAmount = group.totalIn - group.totalOut;

                                return (
                                    <React.Fragment key={group.name}>
                                        <tr className="master-group-row" onClick={() => toggleGroup(group.name)}>
                                            <td style={{ textAlign: 'right', color: THEME.coffeeDark || '#1e293b', paddingRight: '20px' }}>
                                                <span className={`arrow-icon ${isExpanded ? 'arrow-expanded' : ''}`}>◀</span>
                                                {group.name}
                                            </td>
                                            <td style={{ color: '#059669' }}>{formatCurrency(group.totalIn)}</td>
                                            <td style={{ color: '#dc2626' }}>{formatCurrency(group.totalOut)}</td>
                                            <td style={{ color: netGroupAmount >= 0 ? '#10b981' : '#ef4444', fontWeight: 900 }}>
                                                {netGroupAmount > 0 ? '+' : ''}{formatCurrency(netGroupAmount)}
                                            </td>
                                            <td>
                                                <span style={{ background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', color: '#475569' }}>
                                                    {group.items.length} حركة
                                                </span>
                                            </td>
                                        </tr>

                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={5} style={{ padding: 0 }}>
                                                    <div className="child-tree-container">
                                                        <table className="child-table">
                                                            <thead>
                                                                <tr>
                                                                    <th style={{ width: '12%' }}>التاريخ</th>
                                                                    <th style={{ width: '15%' }}>نوع الحركة</th>
                                                                    <th style={{ width: '15%' }}>المبلغ</th>
                                                                    <th style={{ width: '20%', textAlign: 'right' }}>🏢 المشروع / التوجيه</th>
                                                                    <th style={{ width: '23%', textAlign: 'right' }}>📋 البيان المالي والمرجع</th>
                                                                    <th style={{ width: '15%' }}>💳 الخزينة / الحساب البنكي</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {group.items.map((item: any) => {
                                                                    const direction = getFlowDirection(item);
                                                                    const isChildInflow = direction === 'inflow';
                                                                    const itemAmount = parseAmount(item.amount);
                                                                    return (
                                                                        <tr key={item.id}>
                                                                            <td>{item.transaction_date ? String(item.transaction_date).substring(0, 10) : '---'}</td>
                                                                            <td>
                                                                                <span style={{ color: isChildInflow ? '#059669' : '#e11d48', fontSize: '11px', fontWeight: 900 }}>
                                                                                    {isChildInflow ? '📥 إيداع / قبض' : '📤 صرف / مدفوعات'}
                                                                                </span>
                                                                            </td>
                                                                            <td style={{ fontWeight: 900, color: isChildInflow ? '#059669' : '#e11d48' }}>
                                                                                {isChildInflow ? '+' : '-'}{formatCurrency(itemAmount)}
                                                                            </td>
                                                                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>
                                                                                {item.project?.Property ? `🏢 ${item.project.Property}` : '---'}
                                                                            </td>
                                                                            <td style={{ textAlign: 'right' }}>
                                                                                <div style={{ fontWeight: 800, color: '#1e293b' }}>{item.sub_category}</div>
                                                                                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                                                                    {item.payment_method} {item.reference_number ? `| مرجع: ${item.reference_number}` : ''}
                                                                                </div>
                                                                                {item.description && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>📝 {item.description}</div>}
                                                                            </td>
                                                                            <td>
                                                                                <span style={{ fontSize: '11px', fontWeight: 800, color: THEME.goldAccent || '#d97706' }}>
                                                                                    🏦 {item.account?.name || 'حساب عام'}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            
                            {treeGroupedData.length > 0 && (
                                <tr style={{ background: '#fef3c7' }}>
                                    <td style={{ padding: '20px', fontWeight: 900, color: '#b45309', textAlign: 'left' }}>الإجمالي الكلي للصفحة والفلتر:</td>
                                    <td style={{ fontWeight: 900, color: '#059669', fontSize: '16px' }}>{formatCurrency(summaryStats.totalIn)}</td>
                                    <td style={{ fontWeight: 900, color: '#dc2626', fontSize: '16px' }}>{formatCurrency(summaryStats.totalOut)}</td>
                                    <td style={{ fontWeight: 900, color: summaryStats.netCash >= 0 ? '#059669' : '#dc2626', fontSize: '16px' }}>{formatCurrency(summaryStats.netCash)}</td>
                                    <td></td>
                                </tr>
                            )}

                            {treeGroupedData.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '30px', color: '#94a3b8', fontWeight: 900 }}>❌ لا توجد أي تدفقات نقدية مطابقة للفلاتر الحالية</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* 🔢 تقسيم الصفحات */}
                {!logic.isLoading && treeGroupedData.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', padding: '15px', background: 'white', borderRadius: '12px', border: `1px solid #e2e8f0` }}>
                        <div style={{ fontSize: '13px', color: '#334155', fontWeight: 900 }}>
                            إجمالي الشركاء: <b style={{ color: THEME.primary || '#2563eb', fontSize: '16px' }}>{treeGroupedData.length}</b> شريك مالي
                        </div>
                        
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <select 
                                value={rowsPerPage} 
                                onChange={(e) => {setRowsPerPage(Number(e.target.value)); setCurrentPage(1);}} 
                                style={{ padding: '8px 12px', borderRadius: '8px', border: `2px solid #e2e8f0`, outline: 'none', fontWeight: 900, cursor: 'pointer' }}
                            >
                                <option value={10}>عرض 10 شركاء</option>
                                <option value={50}>عرض 50 شريك</option>
                                <option value={100}>عرض 100 شريك</option>
                                <option value={100000}>عرض الكل</option>
                            </select>
                            
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    disabled={currentPage === 1} 
                                    onClick={() => setCurrentPage(p => p - 1)} 
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: currentPage === 1 ? '#f8fafc' : '#475569', color: currentPage === 1 ? '#94a3b8' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 900 }}
                                >
                                    السابق
                                </button>
                                <span style={{ padding: '8px 16px', background: '#f8fafc', borderRadius: '8px', fontWeight: 900, border: `1px solid #e2e8f0` }}>
                                    {currentPage} / {totalPages}
                                </span>
                                <button 
                                    disabled={currentPage >= totalPages} 
                                    onClick={() => setCurrentPage(p => p + 1)} 
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: currentPage >= totalPages ? '#f8fafc' : '#475569', color: currentPage >= totalPages ? '#94a3b8' : 'white', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontWeight: 900 }}
                                >
                                    التالي
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </MasterPage>
        </div>
    );
}