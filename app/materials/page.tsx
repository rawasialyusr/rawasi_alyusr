"use client";
import React from 'react';
import { useMaterialsLogic } from './materials_logic';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import { formatCurrency } from '@/lib/helpers';
import { THEME } from '@/lib/theme';
import MaterialInvoiceModal from './MaterialInvoiceModal';
import MaterialReceiptPrintModal from './MaterialReceiptPrintModal'; // 🖨️ استدعاء مودال الطباعة

export default function MaterialsPage() {
    const logic = useMaterialsLogic();

    const columns = [
        { header: 'التاريخ', render: (row: any) => row ? row.exp_date : null },
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
                    <div style={{ fontSize: '11px', color: THEME.ruby }}>👤 المورد: {row.supplier?.name || '---'}</div>
                </div>
            ) : null 
        },
        { 
            header: 'حساب الخصم (الأستاذ)', 
            render: (row: any) => row ? <span style={{ fontSize: '12px', fontWeight: 800, background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>{row.account?.name || '---'}</span> : null 
        },
        { 
            header: 'الإجمالي للتكلفة', 
            render: (row: any) => row ? <span style={{ fontWeight: 900, color: THEME.danger, fontSize: '15px' }}>{formatCurrency(row.total_price)}</span> : null 
        },
        // 🖨️ عمود الطباعة الجديد
        { 
            header: 'إجراءات', 
            render: (row: any) => row ? (
                <button 
                    onClick={() => {
                        logic.setPrintReceiptId(row.receipt_id);
                        logic.setIsPrintModalOpen(true);
                    }} 
                    style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 900, color: THEME.primary, transition: '0.2s' }}
                    onMouseOver={(e:any) => e.target.style.background = '#e2e8f0'}
                    onMouseOut={(e:any) => e.target.style.background = '#f8fafc'}
                >
                    🖨️ طباعة الإذن
                </button>
            ) : null 
        },
    ];

    return (
        <div className="clean-page">
            <MasterPage title="مركز توريد خامات المشاريع" subtitle="إصدار فواتير الخامات، توجيهها للمشاريع، وربطها بحسابات العملاء للخصم التلقائي">
                
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