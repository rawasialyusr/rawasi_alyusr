"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';

export default function ClaimFormModal({ isOpen, onClose, contractor, assignments, onSave, isSaving, fetchExpenses }: any) {
    const [mounted, setMounted] = useState(false);
    const [claimData, setClaimData] = useState<any>({
        date: new Date().toISOString().split('T')[0],
        retention_percent: 5,
        deductions: [],
        total_work: 0
    });

    useEffect(() => { setMounted(true); }, []);

    // 🚀 محرك الحسابات اللحظي (The Calculation Engine)
    useEffect(() => {
        if (!isOpen) return;

        const calculate = async () => {
            // 1. حساب قيمة الأعمال (من البنود المختارة)
            const totalWork = assignments.reduce((sum: number, a: any) => sum + (Number(a.assigned_qty) * Number(a.unit_price)), 0);
            
            // 2. جلب المصاريف المحملة (الأسمنت، المواد، إلخ)
            const projectId = assignments[0]?.projects?.Property;
            const expenses = await fetchExpenses(contractor.name, projectId);

            const totalDeductions = expenses.reduce((sum: number, e: any) => sum + Number(e.total_price || e.unit_price), 0);
            
            // 3. حساب الاستقطاعات (محتجز الضمان)
            const retention = (totalWork * (claimData.retention_percent / 100));
            
            // 4. الصافي النهائي
            const net = totalWork - retention - totalDeductions;

            setClaimData(prev => ({
                ...prev,
                total_work: totalWork,
                deductions: expenses,
                total_deductions: totalDeductions,
                retention_amount: retention,
                net_amount: net,
                project_id: assignments[0]?.project_id
            }));
        };

        calculate();
    }, [isOpen, claimData.retention_percent]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(40, 24, 10, 0.85)', backdropFilter: 'blur(15px)', direction: 'rtl', padding: '20px' }}>
            <div style={{ position: 'fixed', inset: 0 }} onClick={onClose} />
            
            <div className="cinematic-scroll" style={{ background: 'white', borderRadius: '35px', width: '100%', maxWidth: '900px', padding: '40px', position: 'relative', zIndex: 10, boxShadow: '0 50px 100px rgba(0,0,0,0.5)' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px dashed #eee', paddingBottom: '20px', marginBottom: '25px' }}>
                    <h2 style={{ margin: 0, fontWeight: 900, color: THEME.primary }}>📄 إصدار مستخلص لمقاول باطن</h2>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 800 }}>المقاول: {contractor.name}</div>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: THEME.success }}>الصافي: {formatCurrency(claimData.net_amount)}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px' }}>📅 تاريخ المستخلص</label>
                        <input type="date" className="glass-input" value={claimData.date} onChange={e => setClaimData({...claimData, date: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px' }}>🛡️ نسبة محتجز الضمان (%)</label>
                        <input type="number" className="glass-input" value={claimData.retention_percent} onChange={e => setClaimData({...claimData, retention_percent: Number(e.target.value)})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }} />
                    </div>
                </div>

                {/* جدول بنود المستخلص */}
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px', marginBottom: '25px' }}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: 900 }}>🏗️ بنود الأعمال المنفذة:</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #ddd' }}>
                                <th style={{ textAlign: 'right', padding: '10px' }}>البند</th>
                                <th style={{ textAlign: 'center', padding: '10px' }}>الكمية</th>
                                <th style={{ textAlign: 'center', padding: '10px' }}>الفئة</th>
                                <th style={{ textAlign: 'left', padding: '10px' }}>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignments.map((a: any, i: number) => (
                                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px' }}>{a.boq_items.item_name}</td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>{a.assigned_qty}</td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>{formatCurrency(a.unit_price)}</td>
                                    <td style={{ padding: '10px', textAlign: 'left', fontWeight: 700 }}>{formatCurrency(a.assigned_qty * a.unit_price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* جدول المصاريف المحملة (Auto-Deductions) */}
                {claimData.deductions?.length > 0 && (
                    <div style={{ background: '#fff1f2', padding: '20px', borderRadius: '20px', marginBottom: '25px', border: '1px solid #fecaca' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 900, color: '#be123c' }}>🔻 خصم مصاريف محملة (خامات/خدمات مسبقة):</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {claimData.deductions.map((d: any, i: number) => (
                                <div key={i} style={{ background: 'white', padding: '8px 15px', borderRadius: '10px', fontSize: '11px', border: '1px solid #fecaca' }}>
                                    <b>{d.description}</b>: {formatCurrency(d.total_price || d.unit_price)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* الملخص المالي */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', background: THEME.brand.coffee, padding: '20px', borderRadius: '20px', color: 'white', textAlign: 'center' }}>
                    <div><div style={{ fontSize: '10px', opacity: 0.7 }}>إجمالي الأعمال</div><div style={{ fontWeight: 900 }}>{formatCurrency(claimData.total_work)}</div></div>
                    <div><div style={{ fontSize: '10px', opacity: 0.7 }}>محتجز الضمان</div><div style={{ fontWeight: 900 }}>{formatCurrency(claimData.retention_amount)}</div></div>
                    <div><div style={{ fontSize: '10px', opacity: 0.7 }}>إجمالي الخصومات</div><div style={{ fontWeight: 900, color: '#fca5a5' }}>{formatCurrency(claimData.total_deductions)}</div></div>
                    <div style={{ background: THEME.accent, borderRadius: '12px', padding: '5px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 900 }}>الصافي المستحق</div>
                        <div style={{ fontSize: '18px', fontWeight: 900 }}>{formatCurrency(claimData.net_amount)}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                    <button onClick={() => onSave(claimData)} disabled={isSaving} style={{ flex: 2, background: THEME.success, color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 900, cursor: 'pointer' }}>
                        {isSaving ? '⏳ جاري الحفظ...' : '✅ اعتماد المستخلص وترحيل القيود'}
                    </button>
                    <button onClick={onClose} style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 900, cursor: 'pointer' }}>إلغاء</button>
                </div>
            </div>
        </div>,
        document.body
    );
}