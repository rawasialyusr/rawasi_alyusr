"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';

export default function ClaimFormModal({ isOpen, onClose, contractor, assignments, onSave, isSaving, fetchExpenses }: any) {
    const [mounted, setMounted] = useState(false);
    
    // 🚀 إضافة حالة للبحث داخل بنود المستخلص
    const [itemSearch, setItemSearch] = useState('');

    const [claimData, setClaimData] = useState<any>({
        date: new Date().toISOString().split('T')[0],
        retention_percent: 5,
        deductions: [],
        total_work: 0,
        net_amount: 0,
        total_deductions: 0,
        retention_amount: 0
    });

    useEffect(() => { setMounted(true); }, []);

    // 🔍 فلترة البنود المعروضة بناءً على البحث اللحظي
    const filteredAssignments = useMemo(() => {
        if (!itemSearch) return assignments;
        return assignments.filter((a: any) => 
            a.boq_items?.item_name?.toLowerCase().includes(itemSearch.toLowerCase()) ||
            a.projects?.Property?.toLowerCase().includes(itemSearch.toLowerCase())
        );
    }, [assignments, itemSearch]);

    // 🚀 محرك الحسابات اللحظي (The Calculation Engine)
    useEffect(() => {
        if (!isOpen || !assignments || assignments.length === 0) return;

        const calculate = async () => {
            // 1. حساب قيمة الأعمال (من البنود المسندة المختارة)
            const totalWork = assignments.reduce((sum: number, a: any) => sum + (Number(a.assigned_qty || 0) * Number(a.unit_price || 0)), 0);
            
            // 2. جلب المصاريف المحملة (استخدام الـ UUID الصحيح للمشروع)
            // 🎯 تم التعديل هنا لسحب الـ id الحقيقي لضمان عمل الفلترة في الداتا بيز
            const projectUUID = assignments[0]?.project_id; 
            const projectName = assignments[0]?.projects?.Property || 'مشروع غير معرف';

            let expenses: any[] = [];
            if (contractor?.name && projectUUID) {
                expenses = await fetchExpenses(contractor.name, projectUUID);
            }

            const totalDeductions = expenses.reduce((sum: number, e: any) => sum + Number(e.total_price || e.unit_price || 0), 0);
            
            // 3. حساب محتجز الضمان (النسبة المئوية)
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
                project_id: projectUUID,
                project_display_name: projectName
            }));
        };

        calculate();
    }, [isOpen, claimData.retention_percent, assignments]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(28, 20, 10, 0.9)', backdropFilter: 'blur(15px)', direction: 'rtl', padding: '20px' }}>
            <div style={{ position: 'fixed', inset: 0 }} onClick={onClose} />
            
            <div className="cinematic-scroll" style={{ background: 'white', borderRadius: '35px', width: '100%', maxWidth: '950px', maxHeight: '90vh', overflowY: 'auto', padding: '40px', position: 'relative', zIndex: 10, boxShadow: '0 50px 100px rgba(0,0,0,0.5)', border: `1px solid ${THEME.accent}40` }}>
                
                {/* الرأس: معلومات المقاول والمشروع */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px dashed #eee', paddingBottom: '25px', marginBottom: '25px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontWeight: 900, color: THEME.primary, fontSize: '24px' }}>📄 إصدار مستخلص لمقاول باطن</h2>
                        <div style={{ marginTop: '8px', display: 'flex', gap: '15px' }}>
                            <span style={{ fontSize: '13px', background: '#f1f5f9', padding: '5px 12px', borderRadius: '10px', fontWeight: 800 }}>👤 المقاول: {contractor?.name}</span>
                            <span style={{ fontSize: '13px', background: `${THEME.success}10`, color: THEME.success, padding: '5px 12px', borderRadius: '10px', fontWeight: 800 }}>🏗️ المشروع: {claimData.project_display_name}</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 800 }}>الصافي المستحق حالياً</div>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: THEME.success }}>{formatCurrency(claimData.net_amount)}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px', color: '#64748b' }}>📅 تاريخ المستخلص</label>
                        <input type="date" className="glass-input" value={claimData.date} onChange={e => setClaimData({...claimData, date: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #f1f5f9', fontWeight: 700 }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px', color: '#64748b' }}>🛡️ نسبة محتجز الضمان (%)</label>
                        <input type="number" className="glass-input" value={claimData.retention_percent} onChange={e => setClaimData({...claimData, retention_percent: Number(e.target.value)})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #f1f5f9', fontWeight: 900, textAlign: 'center' }} />
                    </div>
                    {/* 🚀 محرك بحث داخلي جديد للبنود */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px', color: THEME.primary }}>🔎 تصفية البنود</label>
                        <input type="text" placeholder="ابحث في البنود..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `2px solid ${THEME.primary}20`, fontWeight: 700 }} />
                    </div>
                </div>

                {/* جدول بنود المستخلص المفلتر */}
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '25px', marginBottom: '25px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: 900, color: THEME.primary }}>🏗️ بنود الأعمال المنجزة:</h4>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ color: '#64748b' }}>
                                <th style={{ textAlign: 'right', padding: '10px' }}>البند</th>
                                <th style={{ textAlign: 'center', padding: '10px' }}>الوحدة</th>
                                <th style={{ textAlign: 'center', padding: '10px' }}>الكمية</th>
                                <th style={{ textAlign: 'center', padding: '10px' }}>الفئة</th>
                                <th style={{ textAlign: 'left', padding: '10px' }}>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAssignments.map((a: any, i: number) => (
                                <tr key={i} style={{ background: 'white', borderRadius: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                                    <td style={{ padding: '15px', fontWeight: 800, borderRadius: '0 15px 15px 0' }}>{a.boq_items?.item_name || 'بند غير معروف'}</td>
                                    <td style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>{a.boq_items?.unit_of_measure || '---'}</td>
                                    <td style={{ padding: '15px', textAlign: 'center', fontWeight: 900 }}>{a.assigned_qty}</td>
                                    <td style={{ padding: '15px', textAlign: 'center', color: THEME.primary }}>{formatCurrency(a.unit_price)}</td>
                                    <td style={{ padding: '15px', textAlign: 'left', fontWeight: 900, borderRadius: '15px 0 0 15px' }}>{formatCurrency(a.assigned_qty * a.unit_price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAssignments.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontWeight: 700 }}>لم يتم العثور على بنود تطابق البحث</div>}
                </div>

                {/* جدول المصاريف المحملة (Auto-Deductions) */}
                {claimData.deductions?.length > 0 && (
                    <div style={{ background: '#fff1f2', padding: '20px', borderRadius: '25px', marginBottom: '25px', border: '1px solid #fecaca' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 900, color: '#be123c' }}>🔻 خصم مصاريف محملة (خامات/خدمات مسبقة):</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
                            {claimData.deductions.map((d: any, i: number) => (
                                <div key={i} style={{ background: 'white', padding: '10px 15px', borderRadius: '12px', fontSize: '12px', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <b style={{ color: '#475569' }}>{d.description}</b>
                                    <span style={{ fontWeight: 900, color: '#be123c' }}>{formatCurrency(d.total_price || d.unit_price)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* الملخص المالي */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', background: '#1e293b', padding: '25px', borderRadius: '25px', color: 'white', textAlign: 'center' }}>
                    <div><div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '5px' }}>إجمالي الأعمال</div><div style={{ fontSize: '18px', fontWeight: 900 }}>{formatCurrency(claimData.total_work)}</div></div>
                    <div><div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '5px' }}>محتجز الضمان</div><div style={{ fontSize: '18px', fontWeight: 900, color: '#fbbf24' }}>{formatCurrency(claimData.retention_amount)}</div></div>
                    <div><div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '5px' }}>إجمالي الخصومات</div><div style={{ fontSize: '18px', fontWeight: 900, color: '#fca5a5' }}>{formatCurrency(claimData.total_deductions)}</div></div>
                    <div style={{ background: THEME.success, borderRadius: '18px', padding: '10px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 900 }}>الصافي المستحق</div>
                        <div style={{ fontSize: '22px', fontWeight: 900 }}>{formatCurrency(claimData.net_amount)}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                    <button 
                        onClick={() => onSave(claimData)} 
                        disabled={isSaving || claimData.net_amount <= 0} 
                        style={{ flex: 2, background: THEME.success, color: 'white', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: 900, cursor: 'pointer', fontSize: '16px', boxShadow: `0 10px 20px ${THEME.success}40` }}
                    >
                        {isSaving ? '⏳ جاري الحفظ والترحيل...' : '✅ اعتماد المستخلص وترحيل القيود'}
                    </button>
                    <button onClick={onClose} style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: 900, cursor: 'pointer', fontSize: '16px' }}>إلغاء</button>
                </div>
            </div>
        </div>,
        document.body
    );
}