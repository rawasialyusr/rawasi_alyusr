"use client";
import React, { useState, useMemo } from 'react';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import { formatCurrency } from '@/lib/helpers';
import { THEME } from '@/lib/theme';
import { useMaterialIssuesLogic } from './material_issues_logic';
import MaterialIssueModal from './MaterialIssueModal';
import { useConfirm } from '@/components/ConfirmContext';
import * as XLSX from 'xlsx'; // 👈 استدعاء مكتبة الإكسيل للطباعة والتصدير

export default function MaterialIssuesPage() {
    const logic = useMaterialIssuesLogic();
    const { showConfirm } = useConfirm();

    // =========================================================================
    // 🔍 نظام الفلاتر الذكية
    // =========================================================================
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all | posted | draft
    const [filterType, setFilterType] = useState('all'); // all | subcontractor | direct

    // تطبيق الفلاتر على البيانات
    const filteredIssues = useMemo(() => {
        return (logic.issues || []).filter((issue: any) => {
            const searchString = `${issue.item_name || ''} ${issue.issue_number || ''} ${issue.project_name || ''} ${issue.subcontractor_name || ''} ${issue.contractor_text_name || ''}`.toLowerCase();
            const matchesSearch = searchString.includes(searchTerm.toLowerCase());

            const matchesStatus = filterStatus === 'all' 
                ? true 
                : filterStatus === 'posted' ? issue.is_posted 
                : !issue.is_posted;

            const matchesType = filterType === 'all'
                ? true
                : filterType === 'subcontractor' ? issue.issue_type === 'صرف لمقاول'
                : issue.issue_type === 'استهلاك مباشر';

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [logic.issues, searchTerm, filterStatus, filterType]);

    // =========================================================================
    // 🖨️ دالة طباعة التقرير (تصدير لإكسيل)
    // =========================================================================
    const handleExportExcel = () => {
        // تجهيز البيانات بشكل مبسط للإكسيل
        const excelData = filteredIssues.map((issue: any) => ({
            'رقم الإذن': issue.issue_number || '---',
            'التاريخ': issue.issue_date || '---',
            'نوع الصرف': issue.issue_type || '---',
            'المشروع (الفيلا)': issue.project_name || '---',
            'المقاول المستلم': issue.subcontractor_name || issue.contractor_text_name || '---',
            'اسم الخامة': issue.item_name || '---',
            'الكمية': issue.quantity || 0,
            'الوحدة': issue.unit || '---',
            'سعر الوحدة': issue.unit_price || 0,
            'الإجمالي': issue.total_price || 0,
            'مربوط ببند (BOQ)': issue.boq_item || '---',
            'الحالة المحاسبية': issue.is_posted ? 'مرحل ومقيد' : 'مسودة'
        }));

        // إنشاء الشيت وتصديره
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "تقرير منصرف الخامات");
        
        // ضبط عرض الأعمدة التقريبي ليكون شكله احترافي
        const wscols = [
            {wch: 15}, {wch: 15}, {wch: 15}, {wch: 25}, {wch: 30}, 
            {wch: 35}, {wch: 10}, {wch: 10}, {wch: 15}, {wch: 15}, 
            {wch: 30}, {wch: 15}
        ];
        worksheet['!cols'] = wscols;

        XLSX.writeFile(workbook, `تقرير_صرف_خامات_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // =========================================================================
    // 📊 نظام السامري (الملخص المالي الديناميكي)
    // =========================================================================
    const summaryStats = useMemo(() => {
        let total = 0, posted = 0, draft = 0, subcontractor = 0, direct = 0;

        filteredIssues.forEach((issue: any) => {
            const amount = Number(issue.total_price || 0);
            total += amount;
            if (issue.is_posted) posted += amount;
            else draft += amount;

            if (issue.issue_type === 'صرف لمقاول') subcontractor += amount;
            else direct += amount;
        });

        return { total, posted, draft, subcontractor, direct };
    }, [filteredIssues]);

    // =========================================================================
    // 🔢 نظام تقسيم الصفحات (Pagination)
    // =========================================================================
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [filteredIssues.length, searchTerm, filterStatus, filterType]);

    const totalPages = Math.ceil(filteredIssues.length / rowsPerPage);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const sliced = filteredIssues.slice(startIndex, startIndex + rowsPerPage);
        
        return sliced.map((row: any) => ({
            ...row,
            _selected: logic.selectedIds?.includes(row.id) 
        }));
    }, [filteredIssues, currentPage, rowsPerPage, logic.selectedIds]);

    // =========================================================================
    // 🛠️ الأعمدة
    // =========================================================================
    const columns = [
        {
            header: (
                <input 
                    type="checkbox" 
                    checked={paginatedData.length > 0 && paginatedData.every(r => r._selected)}
                    onChange={logic.handleSelectAll}
                    style={{ transform: 'scale(1.4)', cursor: 'pointer', accentColor: THEME.goldAccent || '#ca8a04' }}
                />
            ),
            render: (row: any) => row ? (
                <input 
                    type="checkbox" 
                    checked={row._selected}
                    onChange={() => logic.handleSelectRow(row.id)}
                    style={{ transform: 'scale(1.4)', cursor: 'pointer', accentColor: THEME.goldAccent || '#ca8a04' }}
                />
            ) : null
        },
        { 
            header: 'رقم الإذن', 
            render: (row: any) => (
                <div style={{ fontWeight: 900, color: THEME.coffeeDark || '#2d1a11', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', textAlign: 'center', border: `1px solid #cbd5e1`, minWidth: '85px' }}>
                    #{row.issue_number || '---'}
                </div>
            )
        },
        { 
            header: 'التاريخ ونوع الصرف', 
            render: (row: any) => (
                <div>
                    <div style={{ fontWeight: 900, color: '#1e293b', marginBottom: '4px', fontSize: '13px' }}>{row.issue_date}</div>
                    <span style={{ fontSize: '10px', background: row.issue_type === 'صرف لمقاول' ? '#fee2e2' : '#f0fdf4', color: row.issue_type === 'صرف لمقاول' ? '#dc2626' : '#166534', padding: '2px 8px', borderRadius: '6px', fontWeight: 900, whiteSpace: 'nowrap' }}>
                        {row.issue_type}
                    </span>
                </div>
            )
        },
        { 
            header: 'الخامة المنصرفة', 
            render: (row: any) => (
                <div style={{ minWidth: '140px' }}>
                    <strong style={{ color: '#2563eb', fontSize: '14px', display: 'block' }}>{row.item_name}</strong>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 900 }}>
                        {row.quantity} {row.unit} | {formatCurrency(row.unit_price)}
                    </span>
                </div>
            )
        },
        { 
            header: 'التوجيه (مشروع / مقاول)', 
            render: (row: any) => (
                <div style={{ minWidth: '150px' }}>
                    <div style={{ fontWeight: 800, color: THEME.coffeeDark || '#2d1a11', fontSize: '13px' }}>🏢 {row.project_name || '---'}</div>
                    {row.boq_item && <div style={{ fontSize: '11px', color: THEME.goldAccent || '#ca8a04', marginTop: '2px', fontWeight: 700 }}>📋 {row.boq_item}</div>}
                    {(row.subcontractor_name || row.contractor_text_name) && (
                        <div style={{ fontSize: '11px', color: '#be123c', marginTop: '2px', fontWeight: 700 }}>
                            👷 {row.subcontractor_name || row.contractor_text_name}
                        </div>
                    )}
                </div>
            )
        },
        { 
            header: 'الإجمالي', 
            render: (row: any) => <span style={{ fontWeight: 900, color: '#ef4444', fontSize: '14px' }}>{formatCurrency(row.total_price)}</span>
        },
        { 
            header: 'الحالة المحاسبية', 
            render: (row: any) => (
                 <span style={{ background: row.is_posted ? '#dcfce7' : '#fef2f2', color: row.is_posted ? '#166534' : '#dc2626', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 900 }}>
                    {row.is_posted ? 'مُرحل ومقيد ✅' : 'مسودة ⏳'}
                </span>
            )
        }
    ];

    return (
        <div className="clean-page">
            <MasterPage title="صرف الخامات للمواقع" subtitle="إدارة مسحوبات المقاولين واستهلاك المواد وتوجيه التكاليف للبنود">
                
                <RawasiSidebarManager 
                    actions={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                            {logic.selectedIds.length === 0 ? (
                                <>
                                    <button onClick={logic.openAddModal} className="btn-main-glass">
                                        📤 تسجيل إذن صرف جديد
                                    </button>
                                    {/* 🚀 الزرار الجديد لطباعة التقرير (يظهر في حالة عدم التحديد) */}
                                    <button onClick={handleExportExcel} className="btn-action-glass print" style={{ marginTop: '10px' }}>
                                        🖨️ طباعة تقرير المنصرف (Excel)
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', textAlign: 'center', color: THEME.goldAccent || '#ca8a04', fontWeight: 900, fontSize: '12px', border: `1px solid ${THEME.goldAccent || '#ca8a04'}50` }}>
                                        ✓ تم تحديد ({logic.selectedIds.length}) أسطر خامات
                                    </div>
                                    
                                    <button onClick={logic.handleOpenEdit} className="btn-action-glass edit">
                                        ✏️ تعديل إذن الصرف المحدد
                                    </button>

                                    <button onClick={() => logic.handleBatchAction('post')} disabled={logic.isActionPending} className="btn-action-glass post">
                                        🚀 ترحيل الفواتير المحددة
                                    </button>

                                    <button onClick={() => logic.handleBatchAction('unpost')} disabled={logic.isActionPending} className="btn-action-glass unpost">
                                        🔓 فك ترحيل الفواتير المحددة
                                    </button>

                                    <button 
                                        onClick={() => { 
                                            showConfirm({
                                                title: 'مسح أذونات الصرف',
                                                message: `تحذير: هل أنت متأكد من مسح الفواتير التابعة لـ ${logic.selectedIds.length} سطر محدد بشكل نهائي؟`,
                                                type: 'danger',
                                                onConfirm: () => logic.handleBatchAction('delete')
                                            });
                                        }} 
                                        disabled={logic.isActionPending} 
                                        className="btn-action-glass delete"
                                    >
                                        🗑️ مسح الفواتير المحددة
                                    </button>
                                </>
                            )}
                        </div>
                    }
                    summary={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div className="summary-card total">
                                <span className="label">إجمالي تكلفة الخامات المفلترة</span>
                                <span className="value">{formatCurrency(summaryStats.total)}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div className="summary-card posted">
                                    <span className="label">تم ترحيله ✅</span>
                                    <span className="value-sm">{formatCurrency(summaryStats.posted)}</span>
                                </div>
                                <div className="summary-card draft">
                                    <span className="label">قيد المراجعة ⏳</span>
                                    <span className="value-sm">{formatCurrency(summaryStats.draft)}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div className="summary-card subcontractor">
                                    <span className="label">مسحوبات مقاولين 👷</span>
                                    <span className="value-sm">{formatCurrency(summaryStats.subcontractor)}</span>
                                </div>
                                <div className="summary-card direct">
                                    <span className="label">استهلاك مباشر 🏢</span>
                                    <span className="value-sm">{formatCurrency(summaryStats.direct)}</span>
                                </div>
                            </div>
                        </div>
                    }
                    watchDeps={[logic.selectedIds, logic.isActionPending, logic.issues, currentPage, rowsPerPage, summaryStats]}
                />

                <style>{`
                    .btn-main-glass { background: linear-gradient(135deg, #2563eb, #1e40af); color: white; width: 100%; padding: 14px; border-radius: 12px; border: none; font-weight: 900; cursor: pointer; transition: 0.3s; }
                    .btn-main-glass:hover { filter: brightness(1.2); transform: translateY(-2px); }
                    
                    .btn-action-glass { width: 100%; padding: 12px; border-radius: 10px; border: none; font-weight: 900; cursor: pointer; transition: 0.3s; font-size: 13px; }
                    .btn-action-glass:disabled { opacity: 0.5; cursor: not-allowed; }
                    .btn-action-glass:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.2); }
                    
                    .btn-action-glass.edit { background: linear-gradient(135deg, ${THEME.goldAccent || '#ca8a04'}, #b48a2e); color: white; box-shadow: 0 4px 15px rgba(202, 138, 4, 0.3); }
                    .btn-action-glass.post { background: linear-gradient(135deg, #10b981, #059669); color: white; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); }
                    .btn-action-glass.unpost { background: rgba(245, 158, 11, 0.2); color: #b45309; border: 1px solid rgba(245, 158, 11, 0.5); }
                    .btn-action-glass.delete { background: rgba(239, 68, 68, 0.2); color: #b91c1c; border: 1px dashed rgba(239, 68, 68, 0.5); }
                    /* 🎨 ستايل زر الطباعة الجديد */
                    .btn-action-glass.print { background: linear-gradient(135deg, #475569, #1e293b); color: white; box-shadow: 0 4px 15px rgba(71, 85, 105, 0.3); }

                    /* Summary Cards Styles */
                    .summary-card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; justify-content: center; border: 1px solid rgba(255,255,255,0.1); flex: 1; }
                    .summary-card .label { font-size: 10px; font-weight: 900; opacity: 0.8; margin-bottom: 4px; }
                    .summary-card .value { font-size: 18px; font-weight: 900; }
                    .summary-card .value-sm { font-size: 13px; font-weight: 900; }
                    
                    .summary-card.total { background: linear-gradient(135deg, rgba(37,99,235,0.2), rgba(30,64,175,0.2)); color: #60a5fa; border-color: rgba(59,130,246,0.3); }
                    .summary-card.posted { background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.1)); color: #34d399; border-color: rgba(16,185,129,0.2); }
                    .summary-card.draft { background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(180,83,9,0.1)); color: #fbbf24; border-color: rgba(245,158,11,0.2); }
                    .summary-card.subcontractor { background: linear-gradient(135deg, rgba(225,29,72,0.1), rgba(159,18,57,0.1)); color: #fb7185; border-color: rgba(225,29,72,0.2); }
                    .summary-card.direct { background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(91,33,182,0.1)); color: #a78bfa; border-color: rgba(139,92,246,0.2); }
                `}</style>

                {/* 🔍 شريط الفلاتر */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: `1px solid ${THEME.sandDark || '#e2e8f0'}`, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', minWidth: '250px' }}>
                        <input 
                            type="text" 
                            placeholder="🔍 بحث باسم الخامة، رقم الإذن، المشروع، المقاول..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: `2px solid ${THEME.sandDark || '#e2e8f0'}`, outline: 'none', fontWeight: 700 }}
                        />
                    </div>
                    <div style={{ width: '200px' }}>
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: `2px solid ${THEME.sandDark || '#e2e8f0'}`, outline: 'none', fontWeight: 800, color: THEME.coffeeDark || '#1e293b' }}
                        >
                            <option value="all">كل الحالات المحاسبية</option>
                            <option value="posted">مُرحل ومقيد ✅</option>
                            <option value="draft">مسودة قيد المراجعة ⏳</option>
                        </select>
                    </div>
                    <div style={{ width: '200px' }}>
                        <select 
                            value={filterType} 
                            onChange={(e) => setFilterType(e.target.value)}
                            style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: `2px solid ${THEME.sandDark || '#e2e8f0'}`, outline: 'none', fontWeight: 800, color: THEME.coffeeDark || '#1e293b' }}
                        >
                            <option value="all">كل أنواع التوجيه</option>
                            <option value="subcontractor">مسحوبات مقاولين 👷</option>
                            <option value="direct">استهلاك مباشر 🏢</option>
                        </select>
                    </div>
                </div>

                <RawasiSmartTable 
                    data={paginatedData}
                    columns={columns}
                    isLoading={logic.isLoading}
                />

                {!logic.isLoading && filteredIssues.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', padding: '15px', background: 'white', borderRadius: '12px', border: `1px solid ${THEME.sandDark || '#e2e8f0'}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '13px', color: THEME.coffeeMain || '#334155', fontWeight: 900 }}>
                            إجمالي السجلات المفلترة: <b style={{ color: THEME.danger || '#ef4444', fontSize: '16px' }}>{filteredIssues.length}</b>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <select 
                                value={rowsPerPage} 
                                onChange={(e) => {setRowsPerPage(Number(e.target.value)); setCurrentPage(1);}} 
                                style={{ padding: '8px 12px', borderRadius: '8px', border: `2px solid ${THEME.sandDark || '#e2e8f0'}`, outline: 'none', fontWeight: 900, color: THEME.coffeeDark || '#1e293b', cursor: 'pointer' }}
                            >
                                <option value={50}>عرض 50 سجل</option>
                                <option value={100}>عرض 100 سجل</option>
                                <option value={500}>عرض 500 سجل</option>
                            </select>
                            
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    disabled={currentPage === 1} 
                                    onClick={() => setCurrentPage(p => p - 1)} 
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: currentPage === 1 ? (THEME.sandLight || '#f8fafc') : (THEME.coffeeMain || '#475569'), color: currentPage === 1 ? '#94a3b8' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 900, transition: '0.2s' }}
                                >
                                    السابق
                                </button>
                                <span style={{ padding: '8px 16px', background: THEME.sandLight || '#f8fafc', borderRadius: '8px', fontWeight: 900, color: THEME.coffeeDark || '#1e293b', border: `1px solid ${THEME.sandDark || '#e2e8f0'}` }}>
                                    {currentPage} / {totalPages || 1}
                                </span>
                                <button 
                                    disabled={currentPage >= totalPages} 
                                    onClick={() => setCurrentPage(p => p + 1)} 
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: currentPage >= totalPages ? (THEME.sandLight || '#f8fafc') : (THEME.coffeeMain || '#475569'), color: currentPage >= totalPages ? '#94a3b8' : 'white', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontWeight: 900, transition: '0.2s' }}
                                >
                                    التالي
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <MaterialIssueModal 
                    isOpen={logic.isModalOpen} 
                    onClose={() => logic.setIsModalOpen(false)} 
                    logic={logic} 
                />

            </MasterPage>
        </div>
    );
}