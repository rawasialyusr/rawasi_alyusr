"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import SmartCombo from '@/components/SmartCombo';
import { formatCurrency } from '@/lib/helpers';

export default function ClaimFormModal({ isOpen, onClose, logic }: any) {
    const [mounted, setMounted] = useState(false);
    const [localDeductions, setLocalDeductions] = useState<any[]>([]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const loadDeductions = async () => {
            if (isOpen && logic?.selectedContractor?.id && logic?.currentClaim?.project_ids?.length > 0) {
                try {
                    const projectId = logic.currentClaim.project_ids[0];
                    const data = await logic.fetchPendingDeductions(logic.selectedContractor.id, projectId);
                    setLocalDeductions(data);
                    
                    const matTotal = data.filter((d:any) => d.type === 'material').reduce((s:any, d:any) => s + (Number(d.amount) || 0), 0);
                    const expTotal = data.filter((d:any) => d.type === 'expense').reduce((s:any, d:any) => s + (Number(d.amount) || 0), 0);
                    
                    logic.setCurrentClaim((prev: any) => ({
                        ...prev,
                        deductions: data, 
                        materials_deduction: matTotal,
                        other_deductions: expTotal
                    }));
                } catch (error) {
                    console.error("Error loading deductions:", error);
                }
            }
        };
        loadDeductions();
    }, [isOpen, logic?.selectedContractor?.id, logic?.currentClaim?.project_ids]); 

    if (!isOpen || !mounted || !logic) return null;

    // 🚀 التريكاية السحرية: تحويل مصفوفة الـ IDs لبيانات الأعمال الكاملة
    const fullAssignments = logic.assignments?.filter((a: any) => logic.selectedAssignments?.includes(a.id)) || [];

    // 🚀 تجميع (توحيد) الأعمال المنجزة ذات نفس السعر والبند في سطر واحد
    const groupedAssignments = Object.values(fullAssignments.reduce((acc: any, curr: any) => {
        const itemName = curr.boq_budget?.work_item || curr.boq_items?.item_name || 'بند أعمال مجمع';
        const unit = curr.boq_budget?.unit || curr.boq_items?.unit_of_measure || 'وحدة';
        const price = Number(curr.unit_price) || 0;
        const qty = Number(curr.assigned_qty) || 0;
        
        // مفتاح التجميع (الاسم + السعر عشان لو نفس البند بسعرين مختلفين يتفصلوا)
        const key = `${itemName}-${price}`; 
        
        if (!acc[key]) {
            acc[key] = { name: itemName, unit, price, qty: 0, total: 0 };
        }
        
        acc[key].qty += qty;
        acc[key].total += (qty * price);
        return acc;
    }, {}) || {});

    // 🧮 الحسابات المالية اللحظية
    const totalWork = groupedAssignments.reduce((sum: number, a: any) => sum + a.total, 0) || 0;
    const retentionPercent = Number(logic.currentClaim?.retention_percent) || 0;
    const retentionAmount = totalWork * (retentionPercent / 100);
    const materialsDed = Number(logic.currentClaim?.materials_deduction) || 0;
    const expensesDed = Number(logic.currentClaim?.other_deductions) || 0;
    const advanceDed = Number(logic.currentClaim?.advance_payment) || 0;
    
    const totalDeductions = materialsDed + expensesDed + advanceDed;
    const netAmount = totalWork - retentionAmount - totalDeductions;

    const handleSave = () => {
        if (!logic.currentClaim?.project_ids || logic.currentClaim.project_ids.length === 0) {
            alert("⚠️ يرجى اختيار العقار / المشروع أولاً.");
            return;
        }
        if (fullAssignments.length === 0) {
            const confirmEmpty = window.confirm("⚠️ أنت لم تقم بتحديد أي أعمال منجزة لهذا المستخلص (قيمة الأعمال = 0). هل تريد المتابعة وخصم المسحوبات فقط؟");
            if (!confirmEmpty) return;
        }

        logic.handleSaveClaim({
            ...logic.currentClaim,
            total_amount: totalWork,
            retention_amount: retentionAmount,
            net_amount: netAmount,
            assignments: fullAssignments // 👈 بنبعت البيانات الكاملة هنا عشان الداتا بيز تتحدث صح
        });
    };

    return createPortal(
        <div className="warm-portal-overlay-fullscreen" onClick={onClose}>
            <style>{`
                .warm-portal-overlay-fullscreen { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; background: radial-gradient(circle at center, rgba(40, 24, 10, 0.4) 0%, rgba(15, 7, 0, 0.9) 100%) !important; backdrop-filter: blur(20px) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 999999999 !important; }
                .glass-input-field { width: 100%; padding: 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.65); border: 1px solid rgba(255, 255, 255, 0.8); outline: none; transition: 0.2s; font-weight: 700; color: #1e293b; }
                .glass-input-field:focus { background: #fff; border-color: ${THEME.goldAccent || '#d4af37'}; box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.15); }
                .btn-glass-save { background: linear-gradient(135deg, ${THEME.goldAccent || '#d4af37'}, ${THEME.coffeeDark || '#2d1a11'}); color: white; border: none; padding: 16px; border-radius: 16px; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.3s; box-shadow: 0 10px 25px rgba(212, 175, 55, 0.3); }
                .btn-glass-save:hover:not(:disabled) { transform: translateY(-3px); filter: brightness(1.1); }
                .btn-glass-cancel { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255, 255, 255, 0.8); padding: 16px; border-radius: 16px; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.3s; }
            `}</style>

            <div className="cinematic-scroll" onClick={(e) => e.stopPropagation()} style={{ width: '1000px', maxHeight: '95vh', background: 'rgba(248, 250, 252, 0.95)', backdropFilter: 'blur(30px)', borderRadius: '35px', padding: '40px', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', overflowY: 'auto', direction: 'rtl' }}>
                
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px', borderBottom:`2px solid ${THEME.goldAccent || '#d4af37'}50`, paddingBottom:'15px'}}>
                    <div>
                        <h2 style={{ color: THEME.coffeeDark || '#2d1a11', fontWeight: 900, margin: 0, fontSize: '26px' }}>🧾 إصدار مستخلص مقاول باطن</h2>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '5px', fontWeight: 800 }}>المقاول: {logic.selectedContractor?.name}</div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 900 }}>الصافي المستحق للصرف</div>
                        <div style={{ color: THEME.goldAccent || '#d4af37', fontWeight: 900, fontSize: '28px' }}>{formatCurrency(netAmount)}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '25px', background: 'rgba(212, 175, 55, 0.05)', padding: '20px', borderRadius: '20px', border: `1px solid rgba(212, 175, 55, 0.2)` }}>
                    <div style={{ zIndex: 90 }}>
                        <SmartCombo label="🏢 العقار / المشروع *" icon="🏢" table="projects" displayCol="Property" value={logic.currentClaim.project_ids?.[0]} onSelect={(v: any) => logic.setCurrentClaim({ ...logic.currentClaim, project_ids: v ? [v.id] : [] })} />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.coffeeDark, display: 'block', marginBottom: '6px' }}>📅 تاريخ المستخلص</label>
                        <input type="date" className="glass-input-field" value={logic.currentClaim.date} onChange={e => logic.setCurrentClaim({...logic.currentClaim, date: e.target.value})} />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.coffeeDark, display: 'block', marginBottom: '6px' }}>🛡️ نسبة الدفعة المحتجزة (ضمان أعمال) %</label>
                        <input type="number" className="glass-input-field" value={logic.currentClaim.retention_percent} onChange={e => logic.setCurrentClaim({...logic.currentClaim, retention_percent: e.target.value})} />
                    </div>
                </div>

                {/* 🚀 قسم بيان الأعمال المعتمدة (مجمعة) */}
                <div style={{ marginBottom: '25px' }}>
                    <h3 style={{ color: THEME.primary, fontWeight: 900, fontSize: '16px', marginBottom: '10px' }}>🏗️ بيان الأعمال المعتمدة (مجمعة)</h3>
                    {groupedAssignments.length > 0 ? (
                        <div style={{ background: 'white', borderRadius: '15px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px' }}>
                                    <tr>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>بيان الأعمال</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>إجمالي الكمية المنجزة</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>فئة السعر</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedAssignments.map((a: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px', fontSize: '13px', fontWeight: 800, color: THEME.primary }}>{a.name}</td>
                                            <td style={{ padding: '10px', fontSize: '13px', fontWeight: 900 }}>{a.qty} <span style={{fontSize: '11px', color: '#64748b'}}>{a.unit}</span></td>
                                            <td style={{ padding: '10px', fontSize: '13px' }}>{formatCurrency(a.price)}</td>
                                            <td style={{ padding: '10px', fontWeight: 900, color: THEME.success }}>{formatCurrency(a.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '12px', textAlign: 'center', color: '#991b1b', fontWeight: 800, border: '1px dashed #fca5a5' }}>لم يتم تحديد أي أعمال منجزة لهذا المستخلص. سيتم إنشاء مستخلص بالخصومات فقط.</div>
                    )}
                </div>

                <div style={{ marginBottom: '25px' }}>
                    <h3 style={{ color: THEME.coffeeDark, fontWeight: 900, fontSize: '16px', marginBottom: '10px' }}>🔻 المسحوبات والخصومات المرحلة (تُسحب تلقائياً)</h3>
                    {localDeductions.length > 0 ? (
                        <div style={{ background: 'white', borderRadius: '15px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px' }}>
                                    <tr>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>النوع</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>التاريخ</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>البيان</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>المبلغ المخصوم</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {localDeductions.map((d: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px' }}>
                                                <span style={{ background: d.type === 'material' ? '#fef3c7' : '#fee2e2', color: d.type === 'material' ? '#d97706' : '#dc2626', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 900 }}>
                                                    {d.type === 'material' ? '📦 خامات' : '💸 نقدي'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px', fontSize: '12px' }}>{d.date}</td>
                                            <td style={{ padding: '10px', fontSize: '13px', fontWeight: 700 }}>{d.statement}</td>
                                            <td style={{ padding: '10px', fontWeight: 900, color: THEME.danger }}>{formatCurrency(d.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8', fontWeight: 800, border: '1px dashed #cbd5e1' }}>لا توجد مسحوبات معلقة على هذا المشروع.</div>
                    )}
                    
                    <div style={{ marginTop: '10px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.coffeeDark, display: 'block', marginBottom: '6px' }}>💵 خصم دفعة مقدمة سابقة (إن وجدت)</label>
                        <input type="number" placeholder="0.00" className="glass-input-field" value={logic.currentClaim.advance_payment} onChange={e => logic.setCurrentClaim({...logic.currentClaim, advance_payment: e.target.value})} />
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
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>إجمالي الخصومات</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#fca5a5' }}>{formatCurrency(totalDeductions)}</div>
                    </div>
                    <div style={{ background: `linear-gradient(135deg, ${THEME.goldAccent || '#d4af37'}40, transparent)`, padding: '15px', borderRadius: '16px', border: `1px solid ${THEME.goldAccent || '#d4af37'}80`, boxShadow: `0 0 20px ${THEME.goldAccent || '#d4af37'}20` }}>
                        <div style={{ fontSize: '12px', fontWeight: 900, color: THEME.goldAccent || '#d4af37' }}>الصافي المستحق للمقاول</div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{formatCurrency(netAmount)}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', marginTop: '35px' }}>
                    <button onClick={handleSave} disabled={logic.isClaimSaving} className="btn-glass-save" style={{ flex: 2 }}>
                        {logic.isClaimSaving ? '⏳ جاري الحفظ والترحيل...' : '✅ اعتماد المستخلص وخصم المسحوبات'}
                    </button>
                    <button onClick={onClose} className="btn-glass-cancel" style={{ flex: 1 }}>إغلاق</button>
                </div>
            </div>
        </div>,
        document.body
    );
}