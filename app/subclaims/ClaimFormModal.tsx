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
        total_amount: 0,
        net_amount: 0,
        total_deductions: 0,
        retention_amount: 0,
        advance_payment: 0,
        materials_deduction: 0,
        other_deductions: 0,
        project_ids: [], // 🚀 مصفوفة العقارات المختارة
        project_names: "" // للعرض فقط
    });

    const [localAssignments, setLocalAssignments] = useState<any[]>([]);
    const [localDeductions, setLocalDeductions] = useState<any[]>([]);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!isOpen || !assignments || assignments.length === 0) return;

        const loadData = async () => {
            // 🎯 1. استخراج كل العقارات الفريدة المختارة
            const uniqueProjectIds = Array.from(new Set(assignments.map((a: any) => a.project_id)));
            const uniqueProjectNames = Array.from(new Set(assignments.map((a: any) => a.projects?.Property))).join(' + ');

            // 🎯 2. تجهيز البنود
            const initialAssigns = assignments.map((a:any) => ({
                ...a,
                assigned_qty: Number(a.assigned_qty || 0),
                unit_price: Number(a.unit_price || 0)
            }));
            setLocalAssignments(initialAssigns);

            // 🎯 3. سحب كل المصاريف لكل العقارات المختارة للمقاول ده
            let allExpenses: any[] = [];
            if (contractor?.name) {
                for (const pId of uniqueProjectIds) {
                    const fetched = await fetchExpenses(contractor.name, pId as string);
                    const mapped = fetched.map((e:any) => ({
                        ...e,
                        deduction_amount: Number(e.total_price || e.unit_price || 0)
                    }));
                    allExpenses = [...allExpenses, ...mapped];
                }
            }
            setLocalDeductions(allExpenses);
            
            setClaimData(prev => ({ 
                ...prev, 
                project_ids: uniqueProjectIds, 
                project_display_name: uniqueProjectNames 
            }));
        };
        loadData();
    }, [isOpen, assignments]);

    // 🚀 تحديث الحسابات اللحظية
    useEffect(() => {
        const totalWork = localAssignments.reduce((sum, a) => sum + (Number(a.assigned_qty) * Number(a.unit_price)), 0);
        const expenseDed = localDeductions.reduce((sum, d) => sum + Number(d.deduction_amount), 0);
        const retention = (totalWork * (claimData.retention_percent / 100));

        const advance = Number(claimData.advance_payment || 0);
        const materials = Number(claimData.materials_deduction || 0);
        const others = Number(claimData.other_deductions || 0);

        const manualDeductions = advance + materials + others;
        const allDeductions = expenseDed + manualDeductions;
        
        const net = totalWork - retention - allDeductions;

        setClaimData(prev => ({
            ...prev,
            total_amount: totalWork,
            total_deductions: allDeductions,
            retention_amount: retention,
            net_amount: net,
            assignments: localAssignments, 
            deductions: localDeductions
        }));
    }, [localAssignments, localDeductions, claimData.retention_percent, claimData.advance_payment, claimData.materials_deduction, claimData.other_deductions]);

    const handleAssignmentChange = (index: number, field: string, value: string) => {
        const updated = [...localAssignments];
        updated[index][field] = Number(value);
        setLocalAssignments(updated);
    };

    const handleDeductionChange = (index: number, value: string) => {
        const updated = [...localDeductions];
        updated[index].deduction_amount = Number(value);
        setLocalDeductions(updated);
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(28, 20, 10, 0.9)', backdropFilter: 'blur(15px)', direction: 'rtl', padding: '20px' }}>
            <div style={{ position: 'fixed', inset: 0 }} onClick={onClose} />
            
            <div className="cinematic-scroll" style={{ background: 'white', borderRadius: '35px', width: '100%', maxWidth: '950px', maxHeight: '90vh', overflowY: 'auto', padding: '40px', position: 'relative', zIndex: 10, boxShadow: '0 50px 100px rgba(0,0,0,0.5)', border: `1px solid ${THEME.accent}40` }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px dashed #eee', paddingBottom: '25px', marginBottom: '25px' }}>
                    <div style={{ maxWidth: '60%' }}>
                        <h2 style={{ margin: 0, fontWeight: 900, color: THEME.primary, fontSize: '24px' }}>📄 إصدار مستخلص مجمع (متعدد العقارات)</h2>
                        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            <span style={{ fontSize: '13px', background: '#f1f5f9', padding: '5px 12px', borderRadius: '10px', fontWeight: 800 }}>👤 المقاول: {contractor?.name}</span>
                            <span style={{ fontSize: '13px', background: `${THEME.success}10`, color: THEME.success, padding: '5px 12px', borderRadius: '10px', fontWeight: 800 }}>🏢 العقارات: {claimData.project_display_name}</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 800 }}>الصافي المستحق للصرف</div>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: THEME.success }}>{formatCurrency(claimData.net_amount)}</div>
                    </div>
                </div>

                {/* بقية الفورم (التاريخ، نسب الضمان، الخصومات) تظل كما هي لضمان كفاءة الإدخال */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px', color: '#64748b' }}>📅 تاريخ المستخلص</label>
                        <input type="date" value={claimData.date} onChange={e => setClaimData({...claimData, date: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #f1f5f9', fontWeight: 700, outline: 'none' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px', color: '#64748b' }}>🛡️ نسبة محتجز الضمان (%)</label>
                        <input type="number" value={claimData.retention_percent} onChange={e => setClaimData({...claimData, retention_percent: Number(e.target.value)})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #f1f5f9', fontWeight: 900, textAlign: 'center', outline: 'none' }} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '25px', background: '#fff1f2', padding: '20px', borderRadius: '20px', border: '1px solid #fecaca' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px', color: '#be123c' }}>💸 خصم دفعات سابقة</label>
                        <input type="number" placeholder="0" value={claimData.advance_payment || ''} onChange={e => setClaimData({...claimData, advance_payment: Number(e.target.value)})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #fda4af', fontWeight: 900, textAlign: 'center', outline: 'none' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px', color: '#be123c' }}>🧱 خصم خامات مجمعة</label>
                        <input type="number" placeholder="0" value={claimData.materials_deduction || ''} onChange={e => setClaimData({...claimData, materials_deduction: Number(e.target.value)})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #fda4af', fontWeight: 900, textAlign: 'center', outline: 'none' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px', color: '#be123c' }}>✂️ خصومات أخرى</label>
                        <input type="number" placeholder="0" value={claimData.other_deductions || ''} onChange={e => setClaimData({...claimData, other_deductions: Number(e.target.value)})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #fda4af', fontWeight: 900, textAlign: 'center', outline: 'none' }} />
                    </div>
                </div>

                {/* جدول البنود المستحق صرفها */}
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '25px', marginBottom: '25px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: 900, color: THEME.primary }}>🏗️ بنود الأعمال المختارة (من عقارات مختلفة):</h4>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ color: '#64748b' }}>
                                <th style={{ textAlign: 'right', padding: '10px' }}>البند / العقار</th>
                                <th style={{ textAlign: 'center', padding: '10px', width: '120px' }}>الكمية</th>
                                <th style={{ textAlign: 'center', padding: '10px', width: '150px' }}>الفئة</th>
                                <th style={{ textAlign: 'left', padding: '10px' }}>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {localAssignments.map((a: any, i: number) => (
                                <tr key={i} style={{ background: 'white', borderRadius: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                                    <td style={{ padding: '15px', fontWeight: 800, borderRadius: '0 15px 15px 0' }}>
                                        <span style={{ fontSize: '10px', color: THEME.accent, display: 'block' }}>🏠 {a.projects?.Property}</span>
                                        {a.boq_budget?.work_item || a.boq_items?.item_name || 'بند عمل'} 
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                        <input type="number" value={a.assigned_qty} onChange={(e) => handleAssignmentChange(i, 'assigned_qty', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 900, outline: 'none' }} />
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                        <input type="number" value={a.unit_price} onChange={(e) => handleAssignmentChange(i, 'unit_price', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${THEME.primary}50`, color: THEME.primary, textAlign: 'center', fontWeight: 900, outline: 'none' }} />
                                    </td>
                                    <td style={{ padding: '15px', textAlign: 'left', fontWeight: 900, borderRadius: '15px 0 0 15px' }}>{formatCurrency(a.assigned_qty * a.unit_price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ملخص الأرقام النهائية */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', background: '#1e293b', padding: '25px', borderRadius: '25px', color: 'white', textAlign: 'center' }}>
                    <div><div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '5px' }}>إجمالي الأعمال</div><div style={{ fontSize: '18px', fontWeight: 900 }}>{formatCurrency(claimData.total_amount)}</div></div>
                    <div><div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '5px' }}>محتجز الضمان</div><div style={{ fontSize: '18px', fontWeight: 900, color: '#fbbf24' }}>{formatCurrency(claimData.retention_amount)}</div></div>
                    <div><div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '5px' }}>إجمالي الاستقطاعات</div><div style={{ fontSize: '18px', fontWeight: 900, color: '#fca5a5' }}>{formatCurrency(claimData.total_deductions)}</div></div>
                    <div style={{ background: THEME.success, borderRadius: '18px', padding: '10px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 900 }}>صافي المستحق</div>
                        <div style={{ fontSize: '22px', fontWeight: 900 }}>{formatCurrency(claimData.net_amount)}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                    <button 
                        onClick={() => onSave(claimData)} 
                        disabled={isSaving || claimData.net_amount <= 0} 
                        style={{ flex: 2, background: THEME.success, color: 'white', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: 900, cursor: 'pointer', fontSize: '16px', boxShadow: `0 10px 20px ${THEME.success}40` }}
                    >
                        {isSaving ? '⏳ جاري الحفظ والترحيل...' : '✅ اعتماد المستخلص المجمع'}
                    </button>
                    <button onClick={onClose} style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: 900, cursor: 'pointer', fontSize: '16px' }}>إلغاء</button>
                </div>
            </div>
        </div>,
        document.body
    );
}