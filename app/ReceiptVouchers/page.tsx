"use client";

import React from 'react';
import { THEME } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/helpers';
import { OperationsCenter, PaginationPanel } from '@/components/postingputton';
import { useReceiptVouchersLogic } from './ReceiptVouchers_logic';
import ReceiptVoucherModal from './ReceiptVoucherModal';

export default function ReceiptVouchersPage() {
    const logic = useReceiptVouchersLogic();

    // =========================================================================
    // 💾 دالة الحفظ النهائية (شاملة رقم المرجع والمرفق والمشاريع المتعددة)
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
                // 💡 الحقول الجديدة للمرفقات والمرجع
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

    return (
        <div 
            style={{ padding: '20px', direction: 'rtl', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f8fafc', outline: 'none' }}
            onKeyDown={logic.handleTableKeyDown}
            tabIndex={0}
        >
            <style>{`
                .cinematic-scroll::-webkit-scrollbar { width: 6px; }
                .cinematic-scroll::-webkit-scrollbar-track { background: transparent; }
                .cinematic-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .ops-container { position: relative !important; background: white; border-radius: 20px; margin-bottom: 30px; overflow: hidden !important; z-index: 10; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1); }
                .ops-container img { width: 200px !important; position: absolute !important; left: 40px !important; bottom: -10px !important; opacity: 0.8 !important; pointer-events: none !important; z-index: 0 !important; }
                .focused-row { background: #f0f9ff !important; border-right: 5px solid ${THEME.primary} !important; transform: scale(1.002); }
            `}</style>

            <div className="ops-container">
                <OperationsCenter 
                    title="سندات القبض والتحصيلات"
                    kpis={[
                        { title: 'إجمالي السندات', value: logic.kpis.total, color: THEME.primary, icon: '🧾' },
                        { title: 'إجمالي التحصيلات', value: formatCurrency(logic.kpis.totalAmount), color: THEME.success, icon: '💰' },
                        { title: 'سندات مُرحلة', value: logic.kpis.posted, color: THEME.secondary, icon: '✅' },
                        { title: 'سندات معلقة/مسترجعة', value: logic.kpis.pending, color: THEME.accent, icon: '⏳' }
                    ]}
                    searchQuery={logic.globalSearch}
                    onSearchChange={logic.setGlobalSearch}
                    selectedCount={logic.selectedIds.length}
                    
                    onAdd={logic.handleAddNew}
                    // التعديل مسموح فقط بناءً على الصلاحيات وحالة السند
                    onEdit={logic.selectedIds.length === 1 && logic.canUserEdit(logic.allFiltered.find(r => r.id === logic.selectedIds[0])) 
                        ? () => logic.handleEdit(logic.allFiltered.find(r => r.id === logic.selectedIds[0])) 
                        : undefined}
                        
                    onDeleteSelected={logic.handleDeleteSelected}
                    onPostSelected={logic.handlePostSelected}
                    onUnpostSelected={logic.handleUnpostSelected}
                    
                    // 🚀 ربط دالة الإرجاع الجديدة بمركز العمليات
                    onRefundSelected={logic.handleRefundSelected} 
                />
            </div>

            <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative', zIndex: 5 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                    <thead style={{ background: THEME.primary, color: 'white' }}>
                        <tr>
                            <th style={{ padding: '18px', width: '50px' }}><input type="checkbox" onChange={(e) => logic.setSelectedIds(e.target.checked ? logic.receipts.map(r => r.id) : [])} /></th>
                            <th style={{ padding: '18px' }}>رقم السند</th>
                            <th style={{ padding: '18px' }}>التاريخ</th>
                            <th style={{ padding: '18px' }}>العميل</th>
                            <th style={{ padding: '18px' }}>المشروع/العقار</th>
                            <th style={{ padding: '18px' }}>المبلغ</th>
                            <th style={{ padding: '18px', textAlign: 'center' }}>مرفق</th>
                            <th style={{ padding: '18px' }}>حالة الترحيل</th> 
                        </tr>
                    </thead>
                    <tbody>
                        {logic.receipts.map((rec, index) => {
                            const isFocused = index === logic.focusedIndex;
                            const isSelected = logic.selectedIds.includes(rec.id);
                            
                            // 💡 تحديد الألوان بناءً على حالة السند (مُعتمد، مسترجع، مسودة)
                            const isPosted = rec.status === 'مُعتمد';
                            const isRefunded = rec.status === 'مسترجع';

                            return (
                                <tr 
                                    key={rec.id} 
                                    className={isFocused ? 'focused-row' : ''}
                                    style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? '#f0f9ff' : 'white', transition: '0.2s', cursor: 'pointer' }}
                                    onClick={() => toggleSelection(rec.id)}
                                >
                                    <td style={{ padding: '15px' }}><input type="checkbox" checked={isSelected} readOnly /></td>
                                    <td style={{ padding: '15px', fontWeight: 'bold', color: THEME.primary }}>
                                        {rec.receipt_number}
                                        {rec.reference_number && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>مرجع: {rec.reference_number}</div>}
                                    </td>
                                    <td style={{ padding: '15px', color: '#64748b' }}>{rec.date}</td>
                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{rec.partners?.name || '---'}</td>
                                    <td style={{ padding: '15px', color: THEME.secondary, fontSize: '13px' }}>
                                        <div style={{ maxWidth: '200px', fontWeight: 'bold' }}>
                                            {rec.project_names || '---'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '15px', color: THEME.success, fontWeight: 900 }}>{formatCurrency(rec.amount)}</td>
                                    
                                    {/* 🖼️ عرض أيقونة المرفق لو السند فيه إيصال مصور */}
                                    <td style={{ padding: '15px', textAlign: 'center' }}>
                                        {rec.attachment_url ? (
                                            <a href={rec.attachment_url} target="_blank" rel="noreferrer" title="عرض الإيصال" onClick={(e) => e.stopPropagation()} style={{ fontSize: '18px', textDecoration: 'none' }}>
                                                🖼️
                                            </a>
                                        ) : (
                                            <span style={{ opacity: 0.3, fontSize: '14px' }}>🚫</span>
                                        )}
                                    </td>

                                    {/* 🎨 Badge الحالة الثلاثي (أخضر / أحمر / برتقالي) */}
                                    <td style={{ padding: '15px' }}>
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
                                            background: isPosted ? '#ecfdf5' : isRefunded ? '#fef2f2' : '#fff7ed',
                                            color: isPosted ? '#059669' : isRefunded ? '#dc2626' : '#d97706',
                                            border: `1px solid ${isPosted ? '#10b98130' : isRefunded ? '#ef444430' : '#f59e0b30'}`
                                        }}>
                                            <span style={{ 
                                                width: '8px', height: '8px', borderRadius: '50%', 
                                                background: isPosted ? '#10b981' : isRefunded ? '#ef4444' : '#f59e0b', display: 'inline-block' 
                                            }}></span>
                                            {isPosted ? 'مُرحّل محاسبياً' : isRefunded ? 'سند مسترجع' : 'قيد الانتظار'}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <PaginationPanel totalItems={logic.allFiltered.length} currentPage={logic.currentPage} rowsPerPage={logic.rowsPerPage} onPageChange={logic.setCurrentPage} onRowsChange={logic.setRowsPerPage} />

            {logic.isEditModalOpen && (
                <div className="custom-modal-overlay cinematic-scroll">
                    <div className="modal-content-wrapper">
                        <ReceiptVoucherModal 
                            isOpen={true} 
                            onClose={() => logic.setIsEditModalOpen(false)} 
                            record={logic.currentRecord} 
                            setRecord={logic.setCurrentRecord} 
                            onSave={handleSaveRecord} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}