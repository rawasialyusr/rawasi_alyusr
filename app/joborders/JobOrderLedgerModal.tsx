"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';

export default function JobOrderLedgerModal({ isOpen, onClose, jobOrder }: any) {
    const [activeTab, setActiveTab] = useState('يوميات عمالة');
    const [loading, setLoading] = useState(true);
    const [ledgerData, setLedgerData] = useState<any[]>([]);

    useEffect(() => {
        if (!isOpen || !jobOrder?.job_order_id) return;

        const fetchLedger = async () => {
            setLoading(true);
            // جلب البيانات من الفيو التحليلي
            const { data, error } = await supabase
                .from('job_order_ledger_view')
                .select('*')
                .eq('job_order_id', jobOrder.job_order_id)
                .order('trans_date', { ascending: false });

            if (!error && data) {
                setLedgerData(data);
            }
            setLoading(false);
        };

        fetchLedger();
    }, [isOpen, jobOrder?.job_order_id]);

    if (!isOpen) return null;

    // تقسيم البيانات للتابات
    const tabs = [
        { id: 'يوميات عمالة', label: '👷‍♂️ العمالة' },
        { id: 'خامات مصروفة', label: '🧱 الخامات' },
        { id: 'مصروفات نثرية', label: '💸 مصروفات' },
        { id: 'دفعات مقاولين', label: '🤝 المقاولين' },
    ];

    const currentData = ledgerData.filter(d => d.trans_type === activeTab);
    const tabTotal = currentData.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const modalContent = (
        <div className="modal-overlay" onClick={onClose}>
            <style>{`
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 999999; }
                .modal-content { width: 950px; max-height: 90vh; background: #ffffff; border-radius: 30px; display: flex; flex-direction: column; overflow: hidden; animation: slideUp 0.3s ease; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .tab-btn { padding: 12px 20px; border: none; background: transparent; font-weight: 900; cursor: pointer; border-bottom: 3px solid transparent; color: #64748b; }
                .tab-btn.active { border-bottom-color: ${THEME.accent}; color: ${THEME.primary}; }
            `}</style>

            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header: الملخص الهرمي */}
                <div style={{ background: '#1e293b', padding: '30px', color: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900 }}>دفتر أستاذ: #{jobOrder?.order_number}</h2>
                            <p style={{ margin: '5px 0 0 0', opacity: 0.7, fontSize: '12px' }}>{jobOrder?.job_order_name}</p>
                        </div>
                        <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #475569', color: 'white', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer' }}>إغلاق</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '25px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px' }}>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>الميزانية المعتمدة</div>
                            <div style={{ fontSize: '18px', fontWeight: 900 }}>{formatCurrency(jobOrder?.boq_total_budget || 0)}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px' }}>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>إجمالي التكلفة الفعالة</div>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: '#f87171' }}>{formatCurrency(jobOrder?.effective_cost || 0)}</div>
                        </div>
                        <div style={{ background: `${THEME.accent}30`, padding: '15px', borderRadius: '15px' }}>
                            <div style={{ fontSize: '10px', color: '#cbd5e1' }}>صافي الربح</div>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: '#34d399' }}>{formatCurrency(jobOrder?.total_profit_or_loss || 0)}</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', background: '#f8fafc', padding: '0 10px', borderBottom: '1px solid #e2e8f0' }}>
                    {tabs.map(tab => (
                        <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Table Data */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', fontWeight: 800 }}>جاري التحليل...</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ color: '#64748b', fontSize: '11px', textAlign: 'right' }}>
                                <tr>
                                    <th style={{ padding: '10px' }}>التاريخ</th>
                                    <th style={{ padding: '10px' }}>البيان التحليلي</th>
                                    <th style={{ padding: '10px' }}>الكمية</th>
                                    <th style={{ padding: '10px' }}>القيمة (ر.س)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.length > 0 ? currentData.map((row: any, i: number) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px', fontWeight: 700 }}>
                                        <td style={{ padding: '12px' }}>{new Date(row.trans_date).toLocaleDateString('ar-EG')}</td>
                                        <td style={{ padding: '12px' }}>{row.trans_desc}</td>
                                        <td style={{ padding: '12px' }}>{row.qty}</td>
                                        <td style={{ padding: '12px', color: THEME.primary }}>{formatCurrency(row.amount)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>لا توجد بيانات لهذا البند.</td></tr>
                                )}
                            </tbody>
                            <tfoot style={{ background: '#f8fafc', fontWeight: 900 }}>
                                <tr>
                                    <td colSpan={3} style={{ padding: '15px', textAlign: 'left' }}>الإجمالي</td>
                                    <td style={{ padding: '15px', color: THEME.primary }}>{formatCurrency(tabTotal)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}