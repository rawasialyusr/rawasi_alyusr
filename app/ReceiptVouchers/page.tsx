"use client";

import React, { useEffect, useState } from 'react'; // 👈 ضفنا useState
import { createPortal } from 'react-dom'; // 👈 الأداة السحرية لفك سجن الـ CSS
import { THEME } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/helpers';
import { PaginationPanel } from '@/components/postingputton';
import { useReceiptVouchersLogic } from './ReceiptVouchers_logic';
import ReceiptVoucherModal from './ReceiptVoucherModal';
import MasterPage from '@/components/MasterPage';
import { useSidebar } from '@/lib/SidebarContext';

export default function ReceiptVouchersPage() {
    const logic = useReceiptVouchersLogic();
    const { setSidebarContent } = useSidebar();
    
    // 👈 State للتأكد من إننا على الكلاينت عشان البورتال يشتغل صح
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // =========================================================================
    // 💾 دالة الحفظ النهائية
    // =========================================================================
    const handleSaveRecord = async (payload: any) => {
        try {
            const dataToSave = {
                date: payload.date,
                amount: Number(payload.amount),
                payment_method: payload.payment_method,
                notes: payload.notes || '',
                partner_id: payload.partner_id,
                invoice_id: payload.invoice_id || null,
                safe_bank_acc_id: payload.safe_bank_acc_id,
                partner_acc_id: payload.partner_acc_id,
                status: payload.status || 'مسودة',
                project_ids: payload.project_ids || [],
                reference_number: payload.reference_number || '',
                attachment_url: payload.attachment_url || ''
            };

            let response;
            if (payload.id) {
                response = await supabase.from('receipt_vouchers').update(dataToSave).eq('id', payload.id);
            } else {
                const autoNumber = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`; 
                response = await supabase.from('receipt_vouchers').insert({ ...dataToSave, receipt_number: autoNumber });
            }
            
            if (response.error) {
                alert(`فشل الحفظ: ${response.error.message}`);
            } else {
                alert("✅ تم الحفظ بنجاح");
                logic.setIsEditModalOpen(false);
                logic.fetchFullData();
            }
        } catch (err) {
            console.error("System Error:", err);
        }
    };

    const toggleSelection = (id: string) => {
        logic.setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    // =========================================================================
    // 🚀 السحر: نقل العمليات للسايد بار المركزي
    // =========================================================================
    useEffect(() => {
        const selectedCount = logic.selectedIds.length;
        const singleSelected = selectedCount === 1;
        const selectedRecord = singleSelected ? logic.allFiltered.find(r => r.id === logic.selectedIds[0]) : null;
        const canEdit = singleSelected && logic.canUserEdit(selectedRecord);

        setSidebarContent({
            actions: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    {/* زرار الإضافة دايماً ظاهر */}
                    <button onClick={logic.handleAddNew} className="btn-main-glass gold" style={{ background: THEME.brand.gold, color: THEME.brand.coffee, border: 'none', padding: '14px', fontWeight: 900 }}>
                        ➕ سند قبض جديد
                    </button>

                    {/* زراير بتظهر وتختفي بناءً على التحديد */}
                    {canEdit && (
                        <button onClick={() => logic.handleEdit(selectedRecord)} className="btn-main-glass white" style={{ padding: '12px' }}>
                            📝 تعديل السند
                        </button>
                    )}

                    {selectedCount > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                            <span style={{ fontSize: '11px', color: THEME.brand.gold, fontWeight: 900, textAlign: 'center' }}>إجراءات جماعية ({selectedCount})</span>
                            <button onClick={logic.handlePostSelected} className="btn-main-glass white" style={{ borderColor: THEME.success, color: THEME.success }}>✅ ترحيل</button>
                            <button onClick={logic.handleUnpostSelected} className="btn-main-glass white" style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>⏳ فك الترحيل</button>
                            <button onClick={logic.handleRefundSelected} className="btn-main-glass white" style={{ borderColor: '#6366f1', color: '#6366f1' }}>↩️ إرجاع</button>
                            <button onClick={logic.handleDeleteSelected} className="btn-main-glass white" style={{ borderColor: '#ef4444', color: '#ef4444', background: '#ef444410' }}>🗑️ حذف</button>
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
    // 🎨 واجهة المستخدم (الجدول النظيف)
    // =========================================================================
    return (
        <MasterPage title="سندات القبض والتحصيلات" subtitle="إدارة السندات، المراجعة، والترحيل المحاسبي">
            <div 
                onKeyDown={logic.handleTableKeyDown}
                tabIndex={0}
                style={{ outline: 'none' }}
            >
                <style>{`
                    .cinematic-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
                    .cinematic-scroll::-webkit-scrollbar-track { background: transparent; }
                    .cinematic-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                    
                    .table-glass-wrapper {
                        background: rgba(255, 255, 255, 0.7);
                        backdrop-filter: blur(20px);
                        border-radius: 24px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.03);
                        border: 1px solid rgba(255, 255, 255, 0.9);
                        overflow: hidden;
                    }
                    .custom-table { width: 100%; border-collapse: collapse; text-align: right; }
                    .custom-table th { 
                        background: ${THEME.brand.coffee}; 
                        color: white; 
                        padding: 18px 15px; 
                        font-weight: 800; 
                        font-size: 13px;
                        white-space: nowrap;
                    }
                    .custom-table td { 
                        padding: 16px 15px; 
                        border-bottom: 1px solid #f1f5f9; 
                        transition: 0.2s; 
                    }
                    .custom-table tr:hover td { background: rgba(0,0,0,0.01); }
                    .focused-row td { background: #f0f9ff !important; border-top: 1px solid ${THEME.primary}30; border-bottom: 1px solid ${THEME.primary}30; }
                `}</style>

                <div className="table-glass-wrapper cinematic-scroll" style={{ overflowX: 'auto', marginBottom: '20px' }}>
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px', textAlign: 'center' }}>
                                    <input 
                                        type="checkbox" 
                                        onChange={(e) => logic.setSelectedIds(e.target.checked ? logic.receipts.map(r => r.id) : [])}
                                        checked={logic.receipts.length > 0 && logic.selectedIds.length === logic.receipts.length}
                                    />
                                </th>
                                <th>رقم السند</th>
                                <th>التاريخ</th>
                                <th>العميل / الجهة</th>
                                <th>المشروع / العقار</th>
                                <th>المبلغ</th>
                                <th style={{ textAlign: 'center' }}>مرفق</th>
                                <th>الحالة</th> 
                            </tr>
                        </thead>
                        <tbody>
                            {logic.receipts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontWeight: 800 }}>
                                        لا توجد سندات لعرضها 📭
                                    </td>
                                </tr>
                            ) : logic.receipts.map((rec, index) => {
                                const isFocused = index === logic.focusedIndex;
                                const isSelected = logic.selectedIds.includes(rec.id);
                                
                                const isPosted = rec.status === 'مُعتمد' || rec.status === 'مرحل';
                                const isRefunded = rec.status === 'مسترجع';

                                return (
                                    <tr 
                                        key={rec.id} 
                                        className={isFocused ? 'focused-row' : ''}
                                        style={{ background: isSelected ? '#f8fafc' : 'transparent', cursor: 'pointer' }}
                                        onClick={() => toggleSelection(rec.id)}
                                    >
                                        <td style={{ textAlign: 'center' }}>
                                            <input type="checkbox" checked={isSelected} readOnly />
                                        </td>
                                        <td style={{ fontWeight: 900, color: THEME.brand.coffee }}>
                                            {rec.receipt_number}
                                            {rec.reference_number && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>مرجع: {rec.reference_number}</div>}
                                        </td>
                                        <td style={{ color: '#64748b', fontSize: '13px', fontWeight: 700 }}>{rec.date}</td>
                                        <td style={{ fontWeight: 800, color: '#1e293b' }}>{rec.partners?.name || '---'}</td>
                                        <td style={{ color: THEME.brand.gold, fontSize: '12px', fontWeight: 800 }}>
                                            <div style={{ maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {rec.project_names || '---'}
                                            </div>
                                        </td>
                                        <td style={{ color: THEME.success, fontWeight: 900, fontSize: '14px' }}>{formatCurrency(rec.amount)}</td>
                                        
                                        <td style={{ textAlign: 'center' }}>
                                            {rec.attachment_url ? (
                                                <a href={rec.attachment_url} target="_blank" rel="noreferrer" title="عرض الإيصال" onClick={(e) => e.stopPropagation()} style={{ fontSize: '18px', textDecoration: 'none', transition: '0.2s' }}>
                                                    🖼️
                                                </a>
                                            ) : (
                                                <span style={{ opacity: 0.2, fontSize: '14px' }}>🚫</span>
                                            )}
                                        </td>

                                        <td>
                                            <div style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 900,
                                                background: isPosted ? '#ecfdf5' : isRefunded ? '#fef2f2' : '#fff7ed',
                                                color: isPosted ? '#059669' : isRefunded ? '#dc2626' : '#d97706',
                                            }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isPosted ? '#10b981' : isRefunded ? '#ef4444' : '#f59e0b' }}></span>
                                                {rec.status || 'مسودة'}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <PaginationPanel totalItems={logic.allFiltered.length} currentPage={logic.currentPage} rowsPerPage={logic.rowsPerPage} onPageChange={logic.setCurrentPage} onRowsChange={logic.setRowsPerPage} />

            </div>

            {/* 🛡️ المودال السحري بالبورتال */}
            {/* 🛡️ المودال السحري بالبورتال (مضبوط 100% + بلور دافي) */}
            {/* 🛡️ المودال الاحترافي (Apple-Style Glass) */}
            {mounted && logic.isEditModalOpen && createPortal(
                <div style={{
                    position: 'fixed', 
                    inset: 0, 
                    zIndex: 999999, 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start', // يبدأ من الأعلى للسماح بالسكرول
                    background: 'rgba(44, 34, 30, 0.5)', // لون قهوة عميق ودافي
                    backdropFilter: 'blur(20px) saturate(180%) brightness(0.8)', // بلور مكثف مع تشبع ألوان دافئ
                    WebkitBackdropFilter: 'blur(20px) saturate(180%) brightness(0.8)',
                    padding: '40px 20px',
                    overflowY: 'auto', // يحل مشكلة القص نهائياً
                    direction: 'rtl'
                }}>
                    {/* طبقة شفافة للإغلاق عند الضغط بعيداً */}
                    <div 
                        style={{ position: 'fixed', inset: 0, zIndex: 0 }} 
                        onClick={() => logic.setIsEditModalOpen(false)} 
                    />

                    {/* جسم المودال (The Glass Container) */}
                    <div className="cinematic-scroll" style={{
                        background: 'rgba(255, 255, 255, 0.95)', 
                        borderRadius: '32px', 
                        width: '100%', 
                        maxWidth: '980px', 
                        position: 'relative', 
                        zIndex: 10,
                        margin: 'auto', // سنترة سحرية تمنع القص من الأعلى
                        boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.5)',
                        animation: 'modalEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    }}>
                        <ReceiptVoucherModal 
                            isOpen={true} 
                            onClose={() => logic.setIsEditModalOpen(false)} 
                            record={logic.currentRecord} 
                            setRecord={logic.setCurrentRecord} 
                            onSave={handleSaveRecord} 
                        />
                    </div>
                    
                    <style>{`
                        @keyframes modalEntrance {
                            from { opacity: 0; transform: translateY(50px) scale(0.95); }
                            to { opacity: 1; transform: translateY(0) scale(1); }
                        }
                        
                        /* منع السكرول في الصفحة الخلفية لما المودال يفتح */
                        body { overflow: hidden; }
                    `}</style>
                </div>,
                document.body
            )}

        </MasterPage>
    );
}