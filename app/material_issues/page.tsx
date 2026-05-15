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
            // 🚀 عمود الاختيار المستقل
            header: (
                <input 
                    type="checkbox" 
                    checked={logic.issues?.length > 0 && logic.issues.every((r:any) => logic.selectedIds.includes(r.id))}
                    onChange={logic.handleSelectAll}
                    style={{ transform: 'scale(1.4)', cursor: 'pointer', accentColor: THEME.goldAccent || '#ca8a04' }}
                />
            ),
            render: (row: any) => row ? (
                <input 
                    type="checkbox" 
                    checked={logic.selectedIds.includes(row.id)}
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
            header: 'التوجيه (مشروع / بند)', 
            render: (row: any) => (
                <div style={{ minWidth: '150px' }}>
                    <div style={{ fontWeight: 800, color: THEME.coffeeDark || '#2d1a11', fontSize: '13px' }}>🏢 {row.project_name || '---'}</div>
                    {row.boq_item && <div style={{ fontSize: '11px', color: THEME.goldAccent || '#ca8a04', marginTop: '2px', fontWeight: 700 }}>📋 {row.boq_item}</div>}
                    {row.subcontractor_name && <div style={{ fontSize: '11px', color: '#be123c', marginTop: '2px', fontWeight: 700 }}>👷 {row.subcontractor_name}</div>}
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
                                // 🟢 الحالة الافتراضية: لا يوجد تحديد
                                <button onClick={logic.openAddModal} className="btn-main-glass">
                                    📤 تسجيل إذن صرف جديد
                                </button>
                            ) : (
                                // 🔴 حالة التحديد: تفعيل أزرار الإجراءات
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

                                    <button onClick={() => { if(confirm('هل أنت متأكد من مسح أذونات الصرف المحددة نهائياً؟')) logic.handleBatchAction('delete'); }} disabled={logic.isActionPending} className="btn-action-glass delete">
                                        🗑️ مسح الفواتير المحددة
                                    </button>
                                </>
                            )}
                        </div>
                    }
                    summary={<div />}
                    watchDeps={[logic.selectedIds, logic.isActionPending, logic.issues]}
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
                `}</style>

                <RawasiSmartTable 
                    data={logic.issues}
                    columns={columns}
                    isLoading={logic.isLoading}
                />

                <MaterialIssueModal 
                    isOpen={logic.isModalOpen} 
                    onClose={() => logic.setIsModalOpen(false)} 
                    logic={logic} 
                />

            </MasterPage>
        </div>
    );
}