"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';

export default function ClaimFormModal({ isOpen, onClose, logic }: any) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!isOpen || !mounted || !logic?.currentClaim) return null;

    // الحسابات المجمعة من الفيو الجاهز
    const totalWork = logic.currentClaim.total_amount || 0;
    const retentionPercent = Number(logic.currentClaim.retention_percent) || 0;
    const retentionAmount = totalWork * (retentionPercent / 100);
    const materialsDed = Number(logic.currentClaim.materials_deduction) || 0;
    const expensesDed = Number(logic.currentClaim.other_deductions) || 0;
    const advanceDed = Number(logic.currentClaim.advance_payment) || 0;
    
    const totalDeductions = materialsDed + expensesDed + advanceDed;
    const netAmount = totalWork - retentionAmount - totalDeductions;

    const handleSave = () => {
        if (!logic.currentClaim?.project_ids || logic.currentClaim.project_ids.length === 0) {
            alert("⚠️ يرجى اختيار العقار / المشروع أولاً.");
            return;
        }

        logic.handleSaveClaim({
            ...logic.currentClaim,
            retention_amount: retentionAmount,
            net_amount: netAmount
        });
    };

    return createPortal(
        <div className="warm-portal-overlay-fullscreen" onClick={onClose}>
            <style>{`
                .warm-portal-overlay-fullscreen { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; background: radial-gradient(circle at center, rgba(40, 24, 10, 0.4) 0%, rgba(15, 7, 0, 0.9) 100%) !important; backdrop-filter: blur(20px) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 999999999 !important; }
                .glass-input-field { width: 100%; padding: 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.65); border: 1px solid rgba(255, 255, 255, 0.8); outline: none; transition: 0.2s; font-weight: 700; color: #1e293b; text-align: center; }
                .glass-input-field:focus { background: #fff; border-color: ${THEME.goldAccent || '#d4af37'}; box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.15); }
                .btn-glass-save { background: linear-gradient(135deg, ${THEME.goldAccent || '#d4af37'}, ${THEME.coffeeDark || '#2d1a11'}); color: white; border: none; padding: 16px; border-radius: 16px; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.3s; box-shadow: 0 10px 25px rgba(212, 175, 55, 0.3); }
                .btn-glass-save:hover:not(:disabled) { transform: translateY(-3px); filter: brightness(1.1); }
                .btn-glass-cancel { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255, 255, 255, 0.8); padding: 16px; border-radius: 16px; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.3s; }
            `}</style>

            <div className="cinematic-scroll" onClick={(e) => e.stopPropagation()} style={{ width: '1100px', maxHeight: '95vh', background: 'rgba(248, 250, 252, 0.95)', backdropFilter: 'blur(30px)', borderRadius: '35px', padding: '40px', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', overflowY: 'auto', direction: 'rtl' }}>
                
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px', borderBottom:`2px solid ${THEME.goldAccent || '#d4af37'}50`, paddingBottom:'15px'}}>
                    <div>
                        <h2 style={{ color: THEME.coffeeDark || '#2d1a11', fontWeight: 900, margin: 0, fontSize: '26px' }}>🧾 إصدار مستخلص مقاول باطن</h2>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '5px', fontWeight: 800 }}>المقاول: {logic.selectedContractor?.name}</div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 900 }}>الصافي النهائي للصرف</div>
                        <div style={{ color: THEME.goldAccent || '#d4af37', fontWeight: 900, fontSize: '28px' }}>{formatCurrency(netAmount)}</div>
                    </div>
                </div>

                {/* 🚀 قسم بيانات المستخلص وتواريخ السداد */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '20px', marginBottom: '25px', background: 'rgba(212, 175, 55, 0.05)', padding: '20px', borderRadius: '20px', border: `1px solid rgba(212, 175, 55, 0.2)` }}>
                    
                    <div style={{ zIndex: 90 }}>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.coffeeDark, display: 'block', marginBottom: '6px' }}>🏢 المشاريع المشمولة</label>
                        <div className="glass-input-field" style={{ background: '#f8fafc', color: THEME.coffeeDark, minHeight: '43px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px 15px', border: `1px solid ${THEME.goldAccent}50` }}>
                            {logic.currentClaim.project_ids?.length > 1 ? (
                                <span style={{ color: THEME.coffeeDark, fontWeight: 900 }}>🚀 مستخلص مجمع لـ ({logic.currentClaim.project_ids.length}) مواقع</span>
                            ) : (
                                <span style={{ fontWeight: 800 }}>{logic.currentClaim.assignments_data?.[0]?.projects?.Property || 'عقار واحد'}</span>
                            )}
                        </div>
                    </div>
                    
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.coffeeDark, display: 'block', marginBottom: '6px' }}>📅 تاريخ المستخلص</label>
                        <input type="date" className="glass-input-field" value={logic.currentClaim.date} onChange={e => logic.setCurrentClaim({...logic.currentClaim, date: e.target.value})} />
                    </div>

                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.coffeeDark, display: 'block', marginBottom: '6px' }}>⏳ فترة السداد (يوم)</label>
                        <input type="number" min="0" className="glass-input-field" value={logic.currentClaim.payment_period_days || ''} onChange={e => logic.setCurrentClaim({...logic.currentClaim, payment_period_days: Number(e.target.value)})} />
                    </div>

                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.coffeeDark, display: 'block', marginBottom: '6px' }}>🛡️ نسبة احتجاز الضمان %</label>
                        <input type="number" className="glass-input-field" value={logic.currentClaim.retention_percent} onChange={e => logic.setCurrentClaim({...logic.currentClaim, retention_percent: e.target.value})} />
                    </div>
                </div>

                {/* 🚀 قسم بيان الأعمال المعتمدة والخصومات (من الفيو الذكي) */}
                <div style={{ marginBottom: '25px' }}>
                    <h3 style={{ color: THEME.primary, fontWeight: 900, fontSize: '16px', marginBottom: '10px' }}>📋 أوامر التشغيل المعتمدة في هذا المستخلص</h3>
                    {logic.currentClaim.assignments_data?.length > 0 ? (
                        <div style={{ background: 'white', borderRadius: '15px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px' }}>
                                    <tr>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>أمر التشغيل</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>البند / الموقع</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>قيمة الأعمال</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>خصم الخامات</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>خصم नثريات</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>الصافي المبدئي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logic.currentClaim.assignments_data.map((a: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px', fontSize: '12px', fontWeight: 800, color: THEME.accent }}>{a.order_number}</td>
                                            <td style={{ padding: '10px', fontSize: '13px', fontWeight: 800, color: THEME.primary }}>
                                                {a.boq_item_name}
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontWeight: 700 }}>📍 {a.projects?.Property}</div>
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'center', fontWeight: 900, color: THEME.success }}>{formatCurrency(a.gross_total_amount)}</td>
                                            <td style={{ padding: '10px', textAlign: 'center', fontWeight: 900, color: THEME.danger }}>{formatCurrency(a.materials_deduction)}</td>
                                            <td style={{ padding: '10px', textAlign: 'center', fontWeight: 900, color: THEME.danger }}>{formatCurrency(a.expenses_deduction)}</td>
                                            <td style={{ padding: '10px', textAlign: 'center', fontWeight: 900, color: THEME.primary }}>{formatCurrency(a.net_before_financial_deductions)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '12px', textAlign: 'center', color: '#991b1b', fontWeight: 800, border: '1px dashed #fca5a5' }}>لم يتم تحديد أي أعمال منجزة لهذا المستخلص.</div>
                    )}
                </div>

                {/* 🚀 قسم تفصيل الخصومات والدفعة المقدمة */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '15px' }}>
                    
                    <div style={{ background: 'rgba(255, 107, 107, 0.05)', padding: '15px', borderRadius: '12px', border: '1px dashed #fca5a5' }}>
                        <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 800, textAlign: 'center' }}>🧱 إجمالي خصم الخامات (مسحوب آلياً)</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#dc2626', textAlign: 'center', marginTop: '10px' }}>{formatCurrency(materialsDed)}</div>
                    </div>

                    <div style={{ background: 'rgba(255, 159, 67, 0.05)', padding: '15px', borderRadius: '12px', border: '1px dashed #fcd34d' }}>
                        <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 800, textAlign: 'center' }}>💸 نقدية ومصروفات (مسحوب آلياً)</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#b45309', textAlign: 'center', marginTop: '10px' }}>{formatCurrency(expensesDed)}</div>
                    </div>

                    <div style={{ background: 'rgba(0, 210, 211, 0.05)', padding: '15px', borderRadius: '12px', border: '1px dashed #67e8f9' }}>
                        <div style={{ fontSize: '11px', color: '#0891b2', fontWeight: 800, textAlign: 'center' }}>💰 خصم سلفة / دفعة مقدمة (يدوي)</div>
                        <input 
                            type="number" 
                            className="glass-input-field" 
                            style={{ height: '35px', marginTop: '8px', fontSize: '16px', fontWeight: 900, color: '#0891b2', background: 'white', border: '1px solid #67e8f9' }}
                            value={logic.currentClaim.advance_payment || 0}
                            onChange={e => logic.setCurrentClaim({...logic.currentClaim, advance_payment: Number(e.target.value)})} 
                        />
                    </div>
                </div>

                <div style={{ marginTop: '30px', padding: '25px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: '24px', color: 'white', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>إجمالي الأعمال المنجزة</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#60a5fa' }}>{formatCurrency(totalWork)}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>محتجز ضمان أعمال ({retentionPercent}%)</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#fca5a5' }}>{formatCurrency(retentionAmount)}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>إجمالي الاستقطاعات والخصومات</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#fca5a5' }}>{formatCurrency(totalDeductions)}</div>
                    </div>
                    <div style={{ background: `linear-gradient(135deg, ${THEME.goldAccent || '#d4af37'}40, transparent)`, padding: '15px', borderRadius: '16px', border: `1px solid ${THEME.goldAccent || '#d4af37'}80`, boxShadow: `0 0 20px ${THEME.goldAccent || '#d4af37'}20` }}>
                        <div style={{ fontSize: '12px', fontWeight: 900, color: THEME.goldAccent || '#d4af37' }}>الصافي المستحق للصرف</div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{formatCurrency(netAmount)}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', marginTop: '35px' }}>
                    <button onClick={handleSave} disabled={logic.isClaimSaving} className="btn-glass-save" style={{ flex: 2 }}>
                        {logic.isClaimSaving ? '⏳ جاري الاعتماد والترحيل...' : '✅ اعتماد المستخلص'}
                    </button>
                    <button onClick={onClose} className="btn-glass-cancel" style={{ flex: 1 }}>إغلاق</button>
                </div>
            </div>
        </div>,
        document.body
    );
}