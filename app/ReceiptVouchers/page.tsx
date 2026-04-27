"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import PaginationPanel from '@/components/PaginationPanel';
import RawasiSmartTable from '@/components/rawasismarttable'; // 💎 الجدول الذكي السيادي
import SecureAction from '@/components/SecureAction'; // 🛡️ حارس الأزرار
import { useReceiptVouchersLogic } from './ReceiptVouchers_logic';
import ReceiptVoucherModal from './ReceiptVoucherModal';
import MasterPage from '@/components/MasterPage';
import { useSidebar } from '@/lib/SidebarContext';

export default function ReceiptVouchersPage() {
    // 💎 نقطة الاستدعاء الواحدة (Single Source of Truth)
    const logic = useReceiptVouchersLogic(); 
    const { setSidebarContent } = useSidebar();
    
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // =========================================================================
    // 💎 أعمدة الجدول الذكي (معمارية نظيفة وحراس رندر)
    // =========================================================================
    const receiptColumns = [
        {
            header: 'تحديد',
            accessor: 'id',
            render: (row: any) => {
                if (!row) return null; // 🛡️ حارس دفاعي
                return (
                    <input 
                        type="checkbox" 
                        className="custom-checkbox" 
                        checked={logic.selectedIds.includes(row.id)} 
                        onChange={(e) => {
                            e.stopPropagation(); 
                            logic.setSelectedIds(prev => prev.includes(row.id) ? prev.filter(x => x !== row.id) : [...prev, row.id]);
                        }} 
                    />
                );
            }
        },
        {
            header: 'رقم السند',
            accessor: 'receipt_number',
            render: (row: any) => {
                if (!row) return null;
                return (
                    <div style={{ fontWeight: 900, color: THEME.brand.coffee }}>
                        {row.receipt_number}
                        {row.reference_number && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>مرجع: {row.reference_number}</div>}
                    </div>
                );
            }
        },
        {
            header: 'التاريخ',
            accessor: 'date',
            render: (row: any) => {
                if (!row) return null;
                return <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 700 }}>{row.date}</span>;
            }
        },
        {
            header: 'العميل / الجهة',
            accessor: 'partner_name',
            render: (row: any) => {
                if (!row) return null;
                return <span style={{ fontWeight: 800, color: '#1e293b' }}>{row.partners?.name || '---'}</span>;
            }
        },
        {
            header: 'المشروع / العقار',
            accessor: 'project_names',
            render: (row: any) => {
                if (!row) return null;
                return (
                    <div style={{ color: THEME.brand.gold, fontSize: '12px', fontWeight: 800, maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.project_names || '---'}
                    </div>
                );
            }
        },
        {
            header: 'المبلغ',
            accessor: 'amount',
            render: (row: any) => {
                if (!row) return null;
                return <span style={{ color: THEME.success, fontWeight: 900, fontSize: '14px' }}>{formatCurrency(row.amount)}</span>;
            }
        },
        {
            header: 'الحالة',
            accessor: 'status',
            render: (row: any) => {
                if (!row) return null;
                const isPosted = row.status === 'مُعتمد' || row.status === 'مرحل';
                const isRefunded = row.status === 'مسترجع';
                return (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 900,
                        background: isPosted ? '#ecfdf5' : isRefunded ? '#fef2f2' : '#fff7ed',
                        color: isPosted ? '#059669' : isRefunded ? '#dc2626' : '#d97706',
                    }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isPosted ? '#10b981' : isRefunded ? '#ef4444' : '#f59e0b' }}></span>
                        {row.status || 'مسودة'}
                    </div>
                );
            }
        }
    ];

    // =========================================================================
    // 🚀 السحر: نقل العمليات للسايد بار المركزي (مع حراس الأمان)
    // =========================================================================
    useEffect(() => {
        const selectedCount = logic.selectedIds.length;
        const singleSelected = selectedCount === 1;
        const selectedRecord = singleSelected ? logic.allFiltered.find(r => r.id === logic.selectedIds[0]) : null;
        const canEdit = singleSelected && logic.canUserEdit(selectedRecord);

        setSidebarContent({
            actions: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    {/* 🛡️ حماية الإضافة */}
                    <SecureAction module="receipt_vouchers" action="create">
                        <button onClick={logic.handleAddNew} className="btn-main-glass gold" style={{ background: THEME.brand.gold, color: THEME.brand.coffee, border: 'none', padding: '14px', fontWeight: 900 }}>
                            ➕ سند قبض جديد
                        </button>
                    </SecureAction>

                    {/* 🛡️ حماية التعديل */}
                    {canEdit && (
                        <SecureAction module="receipt_vouchers" action="edit">
                            <button onClick={() => logic.handleEdit(selectedRecord)} className="btn-main-glass white" style={{ padding: '12px' }}>
                                📝 تعديل السند
                            </button>
                        </SecureAction>
                    )}

                    {selectedCount > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                            <span style={{ fontSize: '11px', color: THEME.brand.gold, fontWeight: 900, textAlign: 'center' }}>إجراءات جماعية ({selectedCount})</span>
                            
                            {/* 🛡️ حماية الترحيل والإلغاء والحذف */}
                            <SecureAction module="receipt_vouchers" action="post">
                                <button onClick={logic.handlePostSelected} className="btn-main-glass white" style={{ borderColor: THEME.success, color: THEME.success }}>✅ ترحيل</button>
                            </SecureAction>
                            
                            <SecureAction module="receipt_vouchers" action="post">
                                <button onClick={logic.handleUnpostSelected} className="btn-main-glass white" style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>⏳ فك الترحيل</button>
                            </SecureAction>
                            
                            <SecureAction module="receipt_vouchers" action="post">
                                <button onClick={logic.handleRefundSelected} className="btn-main-glass white" style={{ borderColor: '#6366f1', color: '#6366f1' }}>↩️ إرجاع</button>
                            </SecureAction>
                            
                            <SecureAction module="receipt_vouchers" action="delete">
                                <button onClick={logic.handleDeleteSelected} className="btn-main-glass white" style={{ borderColor: '#ef4444', color: '#ef4444', background: '#ef444410' }}>🗑️ حذف</button>
                            </SecureAction>
                        </div>
                    )}
                </div>
            ),
            summary: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="summary-glass-card" style={{ borderColor: THEME.brand.gold, padding: '15px' }}>
                        <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي التحصيلات 💰</span>
                        <div style={{fontSize:'22px', fontWeight:900, color: THEME.brand.gold}}>{formatCurrency(logic.kpis.totalAmount)}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="summary-glass-card" style={{ borderColor: THEME.success, padding: '10px', textAlign: 'center' }}>
                            <span style={{fontSize:'10px', fontWeight:800, color:'#64748b'}}>مُرحّل ✅</span>
                            <div style={{fontSize:'16px', fontWeight:900, color: THEME.success}}>{logic.kpis.posted}</div>
                        </div>
                        <div className="summary-glass-card" style={{ borderColor: '#f59e0b', padding: '10px', textAlign: 'center' }}>
                            <span style={{fontSize:'10px', fontWeight:800, color:'#64748b'}}>معلق ⏳</span>
                            <div style={{fontSize:'16px', fontWeight:900, color: '#f59e0b'}}>{logic.kpis.pending}</div>
                        </div>
                    </div>
                </div>
            ),
            customFilters: (
                <div style={{ marginTop: '10px' }}>
                    <input 
                        type="text"
                        placeholder="بحث برقم السند، العميل..."
                        value={logic.globalSearch}
                        onChange={(e) => logic.setGlobalSearch(e.target.value)}
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, outline: 'none' }}
                        onFocus={(e) => e.target.style.borderColor = THEME.brand.gold}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                    />
                </div>
            )
        });

        return () => setSidebarContent({ actions: null, summary: null, customFilters: null });
    }, [logic.selectedIds, logic.kpis, logic.globalSearch, logic.allFiltered, setSidebarContent]);

    // =========================================================================
    // 🎨 واجهة المستخدم (التغليف السيادي والجدول الذكي)
    // =========================================================================
    return (
        <MasterPage title="سندات القبض والتحصيلات" subtitle="إدارة السندات، المراجعة، والترحيل المحاسبي">
            
            {logic.isLoading ? (
                <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8' }}>⏳ جاري تحميل السندات...</div>
            ) : (
                <div className="clickable-rows" onKeyDown={logic.handleTableKeyDown} tabIndex={0} style={{ outline: 'none' }}>
                    <RawasiSmartTable 
                        data={logic.receipts} 
                        columns={receiptColumns} 
                        title="" 
                        onRowClick={(row) => {
                            if(logic.canUserEdit(row)) {
                                logic.handleEdit(row);
                            }
                        }} 
                    />
                    <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
                        <PaginationPanel totalItems={logic.allFiltered.length} currentPage={logic.currentPage} rowsPerPage={logic.rowsPerPage} onPageChange={logic.setCurrentPage} onRowsChange={logic.setRowsPerPage} />
                    </div>
                </div>
            )}

            {/* 🛡️ المودال السحري بالبورتال (كما تم تصميمه من قبلك) */}
            {mounted && logic.isEditModalOpen && createPortal(
                <div style={{
                    position: 'fixed', 
                    inset: 0, 
                    zIndex: 999999, 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    background: 'rgba(44, 34, 30, 0.5)',
                    backdropFilter: 'blur(20px) saturate(180%) brightness(0.8)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%) brightness(0.8)',
                    padding: '40px 20px',
                    overflowY: 'auto',
                    direction: 'rtl'
                }}>
                    <div 
                        style={{ position: 'fixed', inset: 0, zIndex: 0 }} 
                        onClick={() => logic.setIsEditModalOpen(false)} 
                    />

                    <div className="cinematic-scroll" style={{
                        background: 'rgba(255, 255, 255, 0.95)', 
                        borderRadius: '32px', 
                        width: '100%', 
                        maxWidth: '980px', 
                        position: 'relative', 
                        zIndex: 10,
                        margin: 'auto', 
                        boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.5)',
                        animation: 'modalEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    }}>
                        {/* 💎 ربط الدالة السحرية logic.handleSave بدلاً من الدالة المحلية */}
                        <ReceiptVoucherModal 
                            isOpen={true} 
                            onClose={() => logic.setIsEditModalOpen(false)} 
                            record={logic.currentRecord} 
                            setRecord={logic.setCurrentRecord} 
                            onSave={logic.handleSave} 
                        />
                    </div>
                    
                    <style>{`
                        @keyframes modalEntrance {
                            from { opacity: 0; transform: translateY(50px) scale(0.95); }
                            to { opacity: 1; transform: translateY(0) scale(1); }
                        }
                        
                        body { overflow: hidden; }
                    `}</style>
                </div>,
                document.body
            )}

        </MasterPage>
    );
}