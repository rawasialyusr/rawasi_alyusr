"use client";
import React, { useState, useMemo } from 'react';
import { useMaterialsLogic } from './materials_logic';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import { formatCurrency } from '@/lib/helpers';
import { THEME } from '@/lib/theme';
import MaterialInvoiceModal from './MaterialInvoiceModal';
import MaterialReceiptPrintModal from './MaterialReceiptPrintModal';
import { useConfirm } from '@/components/ConfirmContext'; // 👈 استدعاء خدمة التأكيد الذكية

export default function MaterialsPage() {
    const logic = useMaterialsLogic();
    const { showConfirm } = useConfirm(); // 👈 تفعيل الخدمة

    // =========================================================================
    // 🔢 نظام تقسيم الصفحات (Pagination) حسب ميثاق V11
    // =========================================================================
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);

    // إعادة التوجيه للصفحة الأولى عند تغير الفلاتر
    React.useEffect(() => {
        setCurrentPage(1);
    }, [logic.data?.length]);

    const totalPages = Math.ceil((logic.data?.length || 0) / rowsPerPage);

    // 🚀 الخدعة السحرية: دمج (التشيك بوكس) مع (البيانات المقسمة) لإجبار الجدول على التحديث اللحظي
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const sliced = (logic.data || []).slice(startIndex, startIndex + rowsPerPage);
        
        return sliced.map((row: any) => ({
            ...row,
            // 🛡️ التعديل الجوهري: الربط بـ row.id بدلاً من receipt_id
            _selected: logic.selectedIds?.includes(row.id) 
        }));
    }, [logic.data, currentPage, rowsPerPage, logic.selectedIds]);
    
   const columns = [
        // 1️⃣ عمود التشيك بوكس (مستقل لكل سطر)
        {
            header: (
                <input 
                    type="checkbox" 
                    checked={paginatedData.length > 0 && paginatedData.every(r => r._selected)}
                    onChange={logic.handleSelectAll}
                    style={{ transform: 'scale(1.4)', cursor: 'pointer', accentColor: THEME.goldAccent }}
                />
            ),
            render: (row: any) => row ? (
                <input 
                    type="checkbox" 
                    checked={row._selected}
                    onChange={() => logic.handleSelectRow(row.id)} // الربط بمعرف السطر الفريد
                    style={{ transform: 'scale(1.4)', cursor: 'pointer', accentColor: THEME.goldAccent }}
                />
            ) : null
        },

        // 2️⃣ عمود رقم الفاتورة (المرجع الأساسي)
        { 
            header: 'رقم الفاتورة', 
            render: (row: any) => row ? (
                <div style={{ 
                    fontWeight: 900, 
                    color: THEME.coffeeDark, 
                    background: THEME.sandDark, 
                    padding: '4px 10px', 
                    borderRadius: '8px',
                    fontSize: '12px',
                    textAlign: 'center',
                    border: `1px solid ${THEME.coffeeMain}40`,
                    minWidth: '85px'
                }}>
                    #{row.receipt_no || '---'}
                </div>
            ) : null 
        },

        // 3️⃣ التاريخ ونوع التوريد
        { 
            header: 'التاريخ والنوع', 
            render: (row: any) => row ? (
                <div>
                    <div style={{ fontWeight: 900, color: '#1e293b', marginBottom: '4px', fontSize: '13px' }}>{row.exp_date}</div>
                    <span style={{ 
                        fontSize: '10px', 
                        background: row.receipt_type === 'توريد عميل' ? '#dbeafe' : '#fef3c7', 
                        color: row.receipt_type === 'توريد عميل' ? '#1d4ed8' : '#d97706', 
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        fontWeight: 900,
                        whiteSpace: 'nowrap'
                    }}>
                        {row.receipt_type || 'توريد شركة'}
                    </span>
                </div>
            ) : null 
        },

        // 4️⃣ الخامة والكمية
        { 
            header: 'الخامة والكمية', 
            render: (row: any) => row ? (
                <div style={{ minWidth: '140px' }}>
                    <strong style={{ color: THEME.primary, fontSize: '14px', display: 'block' }}>{row.work_item || row.item_name}</strong>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 900 }}>
                        {row.quantity} {row.unit} | {formatCurrency(row.unit_price)}
                    </span>
                </div>
            ) : null 
        },

        // 5️⃣ المشروع والمورد والبند 🚀 
        { 
            header: 'التوجيه (مشروع / بند / مورد)', 
            render: (row: any) => row ? (
                <div style={{ minWidth: '150px' }}>
                    <div style={{ fontWeight: 800, color: THEME.coffeeDark, fontSize: '13px' }}>🏢 {row.project?.Property || '---'}</div>
                    {row.boq_item && <div style={{ fontSize: '11px', color: THEME.goldAccent, marginTop: '2px', fontWeight: 700 }}>📋 {row.boq_item}</div>}
                    <div style={{ fontSize: '11px', color: THEME.ruby, marginTop: '2px', fontWeight: 700 }}>👤 {row.supplier?.name || '---'}</div>
                </div>
            ) : null 
        },

        // 6️⃣ الحالة المحاسبية
        { 
            header: 'الحالة', 
            render: (row: any) => row ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', color: '#475569' }}>
                        {row.account?.name || '---'}
                    </span>
                    <span style={{ 
                        background: row.is_posted ? '#dcfce7' : '#fef2f2', 
                        color: row.is_posted ? '#166534' : '#dc2626', 
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        fontSize: '10px', 
                        fontWeight: 900 
                    }}>
                        {row.is_posted ? 'مُرحل ✅' : 'مسودة ⏳'}
                    </span>
                </div>
            ) : null 
        },

        // 7️⃣ إجمالي السطر
        { 
            header: 'الإجمالي', 
            render: (row: any) => row ? (
                <span style={{ fontWeight: 900, color: THEME.danger, fontSize: '14px' }}>
                    {formatCurrency(row.total_price)}
                </span>
            ) : null 
        },

        // 8️⃣ إجراءات الإذن (التعديل والطباعة والترحيل)
        { 
            header: 'الإجراءات', 
            render: (row: any) => row ? (
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '160px' }}>
                    
                    {/* زر الطباعة */}
                    <button 
                        onClick={() => { logic.setPrintReceiptId(row.receipt_id); logic.setIsPrintModalOpen(true); }} 
                        style={{ padding: '6px 10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 900, color: THEME.primary, fontSize: '11px' }}
                    >
                        🖨️ طباعة
                    </button>

                    {!row.is_posted ? (
                        <>
                            {/* 🚀 زر التعديل (يسحب تفاصيل الفاتورة من اللوجيك) */}
                            <button 
                                onClick={() => logic.handleEdit(row.receipt_id)} 
                                style={{ padding: '6px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 900, fontSize: '11px' }}
                            >
                                ✏️ تعديل
                            </button>
                            {/* زر الترحيل */}
                            <button 
                                onClick={() => logic.handleAction('post', row.receipt_id)} 
                                disabled={logic.isActionPending}
                                style={{ padding: '6px 10px', background: THEME.success, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 900, fontSize: '11px' }}
                            >
                                🚀 ترحيل
                            </button>
                        </>
                    ) : (
                        /* زر فك الترحيل */
                        <button 
                            onClick={() => logic.handleAction('unpost', row.receipt_id)} 
                            disabled={logic.isActionPending}
                            style={{ padding: '6px 15px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 900, fontSize: '11px' }}
                        >
                            🔓 فك الترحيل
                        </button>
                    )}
                </div>
            ) : null 
        },
    ];

    return (
        <div className="clean-page">
            <MasterPage title="مركز توريد خامات المشاريع" subtitle="إصدار فواتير الخامات، توجيهها للمشاريع، وربطها بحسابات الموردين والعملاء للخصم التلقائي">
                
                <RawasiSidebarManager 
                    actions={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* 1️⃣ زر إضافة فاتورة جديدة */}
                            <button onClick={logic.openAddModal} className="btn-main-glass gold">
                                🛒 إصدار فاتورة توريد جديدة
                            </button>
                            
                            {/* 2️⃣ زر التعديل الذكي (يظهر عند تحديد سطر واحد فقط) */}
                            {logic.selectedIds?.length === 1 && (
                                <button 
                                    onClick={logic.handleEditSelected} // 👈 تم الربط باللوجيك مباشرة وبشكل نظيف
                                    className="btn-main-glass" 
                                    style={{ background: '#3b82f6', color: 'white' }}
                                >
                                    ✏️ تعديل الفاتورة المحددة
                                </button>
                            )}

                            {/* 3️⃣ أزرار التحكم الجماعي (تظهر عند تحديد سطر أو أكثر) */}
                            {logic.selectedIds?.length > 0 && (
                                <>
                                    <button 
                                        onClick={() => logic.handleBulkAction('post')} 
                                        className="btn-main-glass" 
                                        style={{ background: THEME.success, color: 'white' }}
                                    >
                                        🚀 ترحيل المحدد ({logic.selectedIds.length})
                                    </button>
                                    <button 
                                        onClick={() => logic.handleBulkAction('unpost')} 
                                        className="btn-main-glass" 
                                        style={{ background: '#f59e0b', color: 'white' }}
                                    >
                                        🔓 فك ترحيل المحدد ({logic.selectedIds.length})
                                    </button>
                                    
                                    {/* 🚀 زر الحذف مربوط بخدمة التأكيد الزجاجية الفخمة */}
                                    <button 
                                        onClick={() => { 
                                            showConfirm({
                                                title: 'مسح فواتير التوريد',
                                                message: `تحذير: هل أنت متأكد من مسح الفواتير التابعة لـ ${logic.selectedIds.length} سطر محدد بشكل نهائي؟`,
                                                type: 'danger',
                                                onConfirm: () => logic.handleBulkAction('delete')
                                            });
                                        }} 
                                        className="btn-main-glass" 
                                        style={{ background: '#ef4444', color: 'white' }}
                                    >
                                        🗑️ مسح المحدد ({logic.selectedIds.length})
                                    </button>
                                </>
                            )}
                        </div>
                    }
                    summary={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'white' }}>
                            <div className="kpi-box danger">
                                <span>إجمالي قيمة الخامات الموردة</span>
                                <strong>{formatCurrency(logic.kpis.totalCost)}</strong>
                            </div>
                            <div className="kpi-box secondary">
                                <span>عدد بنود التوريد</span>
                                <strong>{logic.kpis.totalTransactions} بند</strong>
                            </div>
                        </div>
                    }
                    customFilters={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input 
                                type="text" 
                                placeholder="🔍 ابحث باسم الخامة أو المورد..." 
                                className="glass-input-field" 
                                value={logic.globalSearch} 
                                onChange={e => logic.setGlobalSearch(e.target.value)} 
                            />
                            
                            <select className="glass-input-field" value={logic.filterProject} onChange={e => logic.setFilterProject(e.target.value)}>
                                <option value="الكل">كل المشاريع 🏢</option>
                                {logic.projects?.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.Property}</option>
                                ))}
                            </select>

                            <select className="glass-input-field" value={logic.sortBy} onChange={e => logic.setSortBy(e.target.value)}>
                                <option value="newest">⏳ الأحدث إضافة</option>
                                <option value="oldest">⌛ الأقدم</option>
                                <option value="highest_price">💰 السعر: الأعلى أولاً</option>
                                <option value="lowest_price">🪙 السعر: الأقل أولاً</option>
                            </select>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                                <input type="date" className="glass-input-field" value={logic.dateFrom} onChange={e => logic.setDateFrom(e.target.value)} />
                                <input type="date" className="glass-input-field" value={logic.dateTo} onChange={e => logic.setDateTo(e.target.value)} />
                            </div>
                        </div>
                    }
                    watchDeps={[logic.kpis, logic.globalSearch, logic.filterProject, logic.dateFrom, logic.dateTo, logic.selectedIds, logic.sortBy, currentPage, rowsPerPage]}
                />

                <style>{`
                    .glass-input-field { width: 100%; padding: 12px; border-radius: 10px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.2); outline: none; font-weight: 700; color: white; transition: 0.3s; }
                    .glass-input-field:focus { border-color: ${THEME.goldAccent}; }
                    .glass-input-field option { color: black; }
                    .btn-main-glass { width: 100%; padding: 12px; border-radius: 12px; border: none; font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; }
                    .btn-main-glass.gold { background: ${THEME.goldAccent}; color: white; }
                    .btn-main-glass:hover { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    .kpi-box { padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); }
                    .kpi-box span { font-size: 11px; opacity: 0.8; }
                    .kpi-box strong { display: block; font-size: 20px; color: white; margin-top: 5px; }
                    .kpi-box.danger { border-right: 4px solid #ef4444; }
                    .kpi-box.danger strong { color: #ef4444; }
                `}</style>

                <RawasiSmartTable 
                    data={paginatedData}
                    columns={columns}
                    isLoading={logic.isLoading}
                    enableExport={true}
                />

                {!logic.isLoading && (logic.data?.length || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', padding: '15px', background: 'white', borderRadius: '12px', border: `1px solid ${THEME.sandDark}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '13px', color: THEME.coffeeMain, fontWeight: 900 }}>
                            إجمالي السجلات المطابقة: <b style={{ color: THEME.danger, fontSize: '16px' }}>{logic.data?.length || 0}</b>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <select 
                                value={rowsPerPage} 
                                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} 
                                style={{ padding: '8px 12px', borderRadius: '8px', border: `2px solid ${THEME.sandDark}`, outline: 'none', fontWeight: 900, color: THEME.coffeeDark, cursor: 'pointer' }}
                            >
                                <option value={50}>عرض 50 سجل</option>
                                <option value={100}>عرض 100 سجل</option>
                                <option value={500}>عرض 500 سجل</option>
                            </select>
                            
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    disabled={currentPage === 1} 
                                    onClick={() => setCurrentPage(p => p - 1)} 
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: currentPage === 1 ? THEME.sandLight : THEME.coffeeMain, color: currentPage === 1 ? '#94a3b8' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 900, transition: '0.2s' }}
                                >
                                    السابق
                                </button>
                                <span style={{ padding: '8px 16px', background: THEME.sandLight, borderRadius: '8px', fontWeight: 900, color: THEME.coffeeDark, border: `1px solid ${THEME.sandDark}` }}>
                                    {currentPage} / {totalPages || 1}
                                </span>
                                <button 
                                    disabled={currentPage >= totalPages} 
                                    onClick={() => setCurrentPage(p => p + 1)} 
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: currentPage >= totalPages ? THEME.sandLight : THEME.coffeeMain, color: currentPage >= totalPages ? '#94a3b8' : 'white', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontWeight: 900, transition: '0.2s' }}
                                >
                                    التالي
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 📝 مودال إضافة وتعديل الفاتورة */}
                <MaterialInvoiceModal 
                    isOpen={logic.isModalOpen} 
                    onClose={() => logic.setIsModalOpen(false)} 
                    logic={logic} 
                />

                <MaterialReceiptPrintModal 
                    isOpen={logic.isPrintModalOpen} 
                    onClose={() => logic.setIsPrintModalOpen(false)} 
                    logic={logic}
                    receiptId={logic.printReceiptId}
                />

            </MasterPage>
        </div>
    );
}