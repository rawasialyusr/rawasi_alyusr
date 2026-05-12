"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import { formatCurrency } from '@/lib/helpers';
import { THEME } from '@/lib/theme';
import { useMaterialIssuesLogic } from './material_issues_logic';
import MaterialIssueModal from './MaterialIssueModal';

export default function MaterialIssuesPage() {
    const logic = useMaterialIssuesLogic();

    const columns = [
        { 
            header: 'رقم الإذن / التاريخ', 
            render: (row: any) => (
                <div>
                    <strong style={{ color: THEME.primary }}>{row.issue_number}</strong>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>📅 {row.issue_date}</div>
                </div>
            )
        },
        { 
            header: 'نوع الصرف والجهة', 
            render: (row: any) => (
                <div>
                    <span style={{ 
                        fontSize: '10px', 
                        background: row.issue_type === 'صرف لمقاول' ? '#fee2e2' : '#f0fdf4', 
                        color: row.issue_type === 'صرف لمقاول' ? '#991b1b' : '#166534', 
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        fontWeight: 900
                    }}>
                        {row.issue_type}
                    </span>
                    <div style={{ fontWeight: 800, marginTop: '4px' }}>
                        {row.issue_type === 'صرف لمقاول' ? `👷 ${row.subcontractor_name}` : '🏗️ استهلاك مباشر'}
                    </div>
                </div>
            )
        },
        { 
            header: 'الخامة المنصرفة', 
            render: (row: any) => (
                <div>
                    <div style={{ fontWeight: 700 }}>{row.item_name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{row.quantity} {row.unit} × {formatCurrency(row.unit_price)}</div>
                </div>
            )
        },
        { 
            header: 'المشروع', 
            render: (row: any) => <span style={{ fontWeight: 800 }}>🏢 {row.project_name}</span>
        },
        { 
            header: 'قيمة الصرف', 
            render: (row: any) => <strong style={{ color: THEME.danger, fontSize: '15px' }}>{formatCurrency(row.total_price)}</strong>
        },
        { 
            header: 'الحالة', 
            render: (row: any) => (
                <span style={{ 
                    background: row.is_posted ? '#dcfce7' : '#fef2f2', 
                    color: row.is_posted ? '#166534' : '#dc2626', 
                    padding: '4px 10px', 
                    borderRadius: '20px', 
                    fontSize: '11px', 
                    fontWeight: 900 
                }}>
                    {row.is_posted ? 'تم الخصم والترحيل ✅' : 'مسودة ⏳'}
                </span>
            )
        }
    ];

    return (
        <div className="clean-page">
            <MasterPage title="مركز صرف خامات المواقع" subtitle="إدارة مسحوبات المقاولين واستهلاك المواد المباشر وتحميلها على التكاليف">
                
                <RawasiSidebarManager 
                    actions={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                            {logic.selectedIds.length === 0 ? (
                                // 🟢 الحالة العادية (مفيش تحديد)
                                <button onClick={() => logic.setIsModalOpen(true)} className="btn-main-glass red">
                                    📤 تسجيل إذن صرف جديد
                                </button>
                            ) : (
                                // 🔴 حالة التحديد (ظهور أزرار الأكشن السريعة)
                                <>
                                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', textAlign: 'center', color: THEME.goldAccent || '#d4af37', fontWeight: 900, fontSize: '12px', border: `1px solid ${THEME.goldAccent || '#d4af37'}50` }}>
                                        ✓ تم تحديد ({logic.selectedIds.length}) إذن
                                    </div>
                                    
                                    {logic.selectedIds.length === 1 && (
                                        <>
                                            {/* ✨ زر التعديل الجديد */}
                                            <button 
                                                onClick={logic.handleOpenEdit} 
                                                className="btn-action-glass edit"
                                            >
                                                ✏️ تعديل بيانات الإذن
                                            </button>
                                            
                                            <button 
                                                onClick={() => { logic.setPrintReceiptId(logic.selectedIds[0]); logic.setIsPrintModalOpen(true); }} 
                                                className="btn-action-glass print"
                                            >
                                                🖨️ طباعة الإذن المحدد
                                            </button>
                                        </>
                                    )}

                                    <button 
                                        onClick={() => logic.handleBatchAction('post')} 
                                        disabled={logic.isActionPending}
                                        className="btn-action-glass post"
                                    >
                                        🚀 ترحيل وتقييد المحدد
                                    </button>

                                    <button 
                                        onClick={() => logic.handleBatchAction('unpost')} 
                                        disabled={logic.isActionPending}
                                        className="btn-action-glass unpost"
                                    >
                                        🔓 فك ترحيل المحدد
                                    </button>

                                    <button 
                                        onClick={() => { if(confirm('هل أنت متأكد من مسح الأذون المحددة نهائياً؟')) logic.handleBatchAction('delete'); }} 
                                        disabled={logic.isActionPending}
                                        className="btn-action-glass delete"
                                    >
                                        🗑️ مسح الأذون المحددة
                                    </button>
                                </>
                            )}
                        </div>
                    }
                    summary={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="kpi-box issue">
                                <span>إجمالي المسحوبات (فترة)</span>
                                <strong>{formatCurrency(logic.issues.reduce((s:any,c:any)=>s+c.total_price, 0))}</strong>
                            </div>
                        </div>
                    }
                    watchDeps={[logic.selectedIds, logic.isActionPending, logic.issues]}
                />

                <style>{`
                    .btn-main-glass.red { background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; width: 100%; padding: 14px; border-radius: 12px; border: none; font-weight: 900; cursor: pointer; transition: 0.3s; }
                    .btn-main-glass.red:hover { filter: brightness(1.2); transform: translateY(-2px); }
                    
                    /* ستايلات أزرار الأكشن في السايد بار */
                    .btn-action-glass { width: 100%; padding: 12px; border-radius: 10px; border: none; font-weight: 900; cursor: pointer; transition: 0.3s; font-size: 13px; }
                    .btn-action-glass:disabled { opacity: 0.5; cursor: not-allowed; }
                    .btn-action-glass:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.2); }
                    
                    /* ✏️ ستايل زر التعديل (ذهبي فخم) */
                    .btn-action-glass.edit { background: linear-gradient(135deg, ${THEME.goldAccent || '#d4af37'}, #b48a2e); color: white; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3); }
                    
                    .btn-action-glass.print { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.5); }
                    .btn-action-glass.post { background: linear-gradient(135deg, #10b981, #059669); color: white; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); }
                    .btn-action-glass.unpost { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.5); }
                    .btn-action-glass.delete { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px dashed rgba(239, 68, 68, 0.5); }

                    .kpi-box.issue { padding: 15px; border-radius: 12px; border-right: 4px solid #ef4444; background: rgba(255,255,255,0.05); color: white; }
                    .kpi-box.issue strong { display: block; font-size: 22px; margin-top: 5px; color: #ef4444; }
                `}</style>

                <RawasiSmartTable 
                    data={logic.issues}
                    columns={columns}
                    isLoading={logic.isLoading}
                    selectable={true}
                    selectedIds={logic.selectedIds}
                    onSelectionChange={logic.setSelectedIds}
                />

                {/* المودال الخاص بالإدخال */}
                <MaterialIssueModal 
                    isOpen={logic.isModalOpen} 
                    onClose={() => logic.setIsModalOpen(false)} 
                    logic={logic} 
                />

            </MasterPage>
        </div>
    );
}