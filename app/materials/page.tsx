"use client";
import React from 'react';
import { useMaterialsLogic } from './materials_logic';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import { formatCurrency } from '@/lib/helpers';
import { THEME } from '@/lib/theme';
import MaterialInvoiceModal from './MaterialInvoiceModal';
import MaterialReceiptPrintModal from './MaterialReceiptPrintModal';

export default function MaterialsPage() {
    const logic = useMaterialsLogic();

    const columns = [
        { 
            header: 'التاريخ والنوع', 
            render: (row: any) => row ? (
                <div>
                    <div style={{ fontWeight: 900, color: '#1e293b', marginBottom: '4px' }}>{row.exp_date}</div>
                    <span style={{ 
                        fontSize: '10px', 
                        background: row.receipt_type === 'توريد عميل' ? '#dbeafe' : '#fef3c7', 
                        color: row.receipt_type === 'توريد عميل' ? '#1d4ed8' : '#d97706', 
                        padding: '3px 8px', 
                        borderRadius: '6px', 
                        fontWeight: 900 
                    }}>
                        {row.receipt_type || 'توريد شركة'}
                    </span>
                </div>
            ) : null 
        },
        { 
            header: 'الخامة والكمية', 
            render: (row: any) => row ? (
                <div>
                    <strong style={{ color: THEME.primary, fontSize: '14px' }}>{row.work_item}</strong><br/>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 900 }}>{row.quantity} {row.unit} | السعر: {formatCurrency(row.unit_price)}</span>
                </div>
            ) : null 
        },
        { 
            header: 'التوجيه (مشروع / مورد)', 
            render: (row: any) => row ? (
                <div>
                    <div style={{ fontWeight: 800, color: THEME.coffeeDark }}>🏢 {row.project?.Property || '---'}</div>
                    <div style={{ fontSize: '11px', color: THEME.ruby, marginTop: '2px' }}>👤 المورد/العميل: {row.supplier?.name || '---'}</div>
                </div>
            ) : null 
        },
        { 
            header: 'الحالة المحاسبية', 
            render: (row: any) => row ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', color: '#475569' }}>
                        {row.account?.name || '---'}
                    </span>
                    <span style={{ 
                        background: row.is_posted ? '#dcfce7' : '#fef2f2', 
                        color: row.is_posted ? '#166534' : '#dc2626', 
                        padding: '3px 8px', 
                        borderRadius: '6px', 
                        fontSize: '10px', 
                        fontWeight: 900 
                    }}>
                        {row.is_posted ? 'مرحل ومقيد ✅' : 'مسودة غير مرحلة ⏳'}
                    </span>
                </div>
            ) : null 
        },
        { 
            header: 'الإجمالي للتكلفة', 
            render: (row: any) => row ? <span style={{ fontWeight: 900, color: THEME.danger, fontSize: '15px' }}>{formatCurrency(row.total_price)}</span> : null 
        },
        // 🚀 عمود الإجراءات الشامل (طباعة - ترحيل - مسح)
        { 
            header: 'إجراءات الإذن', 
            render: (row: any) => row ? (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '180px' }}>
                    
                    <button 
                        onClick={() => { logic.setPrintReceiptId(row.receipt_id); logic.setIsPrintModalOpen(true); }} 
                        style={{ flex: '1 1 45%', padding: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 900, color: THEME.primary, fontSize: '11px', transition: '0.2s' }}
                    >
                        🖨️ طباعة
                    </button>

                    {!row.is_posted ? (
                        <button 
                            onClick={() => logic.handleAction('post', row.receipt_id)} 
                            disabled={logic.isActionPending}
                            style={{ flex: '1 1 45%', padding: '6px', background: THEME.success, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 900, fontSize: '11px', opacity: logic.isActionPending ? 0.5 : 1 }}
                        >
                            🚀 ترحيل
                        </button>
                    ) : (
                        <button 
                            onClick={() => logic.handleAction('unpost', row.receipt_id)} 
                            disabled={logic.isActionPending}
                            style={{ flex: '1 1 45%', padding: '6px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 900, fontSize: '11px', opacity: logic.isActionPending ? 0.5 : 1 }}
                        >
                            🔓 فك الترحيل
                        </button>
                    )}

                    <button 
                        onClick={() => { if(confirm('هل أنت متأكد من مسح الفاتورة نهائياً وإلغاء قيودها المحاسبية؟')) logic.handleAction('delete', row.receipt_id); }} 
                        disabled={logic.isActionPending}
                        style={{ flex: '1 1 100%', padding: '6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 900, fontSize: '11px', opacity: logic.isActionPending ? 0.5 : 1 }}
                    >
                        🗑️ مسح الفاتورة بالكامل
                    </button>
                </div>
            ) : null 
        },
    ];

    return (
        <div className="clean-page">
            <MasterPage title="مركز توريد خامات المشاريع" subtitle="إصدار فواتير الخامات، توجيهها للمشاريع، وربطها بحسابات الموردين والعملاء للخصم التلقائي">
                
                <RawasiSidebarManager 
                    actions={
                        <button onClick={logic.openAddModal} className="btn-main-glass gold">
                            🛒 إصدار فاتورة توريد جديدة
                        </button>
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
                            <input type="text" placeholder="🔍 ابحث باسم الخامة أو المورد..." className="glass-input-field" value={logic.globalSearch} onChange={e => logic.setGlobalSearch(e.target.value)} />
                            
                            <select className="glass-input-field" value={logic.filterProject} onChange={e => logic.setFilterProject(e.target.value)}>
                                <option value="الكل">كل المشاريع 🏢</option>
                                {logic.projects.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.Property}</option>
                                ))}
                            </select>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                                <input type="date" className="glass-input-field" value={logic.dateFrom} onChange={e => logic.setDateFrom(e.target.value)} />
                                <input type="date" className="glass-input-field" value={logic.dateTo} onChange={e => logic.setDateTo(e.target.value)} />
                            </div>
                        </div>
                    }
                    watchDeps={[logic.kpis, logic.globalSearch, logic.filterProject, logic.dateFrom, logic.dateTo]}
                />

                <style>{`
                    .glass-input-field { width: 100%; padding: 12px; border-radius: 10px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.2); outline: none; font-weight: 700; color: white; transition: 0.3s; }
                    .glass-input-field:focus { border-color: ${THEME.goldAccent}; }
                    .glass-input-field option { color: black; }
                    .btn-main-glass { width: 100%; padding: 14px; border-radius: 12px; border: none; font-weight: 900; cursor: pointer; transition: 0.2s; }
                    .btn-main-glass.gold { background: ${THEME.goldAccent}; color: white; }
                    .btn-main-glass:hover { transform: translateY(-2px); filter: brightness(1.1); }
                    .kpi-box { padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); }
                    .kpi-box span { font-size: 11px; opacity: 0.8; }
                    .kpi-box strong { display: block; font-size: 20px; color: white; margin-top: 5px; }
                    .kpi-box.danger { border-right: 4px solid #ef4444; }
                    .kpi-box.danger strong { color: #ef4444; }
                `}</style>

                <RawasiSmartTable 
                    data={logic.data}
                    columns={columns}
                    isLoading={logic.isLoading}
                    enableExport={true}
                />

                {/* 🚀 مودال الإضافة */}
                <MaterialInvoiceModal 
                    isOpen={logic.isModalOpen} 
                    onClose={() => logic.setIsModalOpen(false)} 
                    logic={logic} 
                />

                {/* 🖨️ مودال الطباعة */}
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