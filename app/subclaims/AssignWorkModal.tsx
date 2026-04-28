"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import SmartCombo from '@/components/SmartCombo';

export default function AssignWorkModal({ isOpen, onClose, record, setRecord, onSave, isSaving, contractorName }: any) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!isOpen || !mounted) return null;

    const handleSave = () => {
        if (!record.project_id) return alert("يرجى اختيار المشروع");
        if (!record.boq_id) return alert("يرجى اختيار البند");
        if (Number(record.assigned_qty) <= 0 || Number(record.unit_price) <= 0) return alert("يرجى إدخال كمية وسعر صحيحين");
        onSave(record);
    };

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(40, 24, 10, 0.85)', backdropFilter: 'blur(15px)', direction: 'rtl', padding: '20px' }}>
            <div style={{ position: 'fixed', inset: 0 }} onClick={onClose} />
            
            <div className="cinematic-scroll" style={{ background: 'white', borderRadius: '35px', width: '100%', maxWidth: '600px', padding: '40px', position: 'relative', zIndex: 10, boxShadow: '0 50px 100px rgba(0,0,0,0.5)' }}>
                
                <h2 style={{ margin: '0 0 25px 0', fontWeight: 900, color: THEME.primary, borderBottom: '2px dashed #eee', paddingBottom: '15px' }}>
                    👷 إسناد أعمال جديدة لـ ({contractorName})
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* 1. اختيار المشروع */}
                    <div style={{ zIndex: 100, position: 'relative' }}>
                        <SmartCombo 
                            label="🏢 اختر المشروع / العمارة" 
                            table="projects" displayCol="Property" 
                            initialDisplay={record.site_ref}
                            onSelect={(p: any) => setRecord({ ...record, project_id: p.id, site_ref: p.Property, boq_id: null, boq_name: '' })} 
                        />
                    </div>

                    {/* 2. اختيار البند (مفلتر بـ project_id) */}
                    <div style={{ zIndex: 90, position: 'relative' }}>
                        <SmartCombo 
                            label="🛠️ اختر البند أو المرحلة (BOQ)" 
                            table="boq_items" displayCol="item_name" 
                            initialDisplay={record.boq_name}
                            filter={{ column: 'project_id', value: record.project_id }} 
                            disabled={!record.project_id} 
                            onSelect={(b: any) => setRecord({ 
                                ...record, 
                                boq_id: b.id, 
                                boq_name: b.item_name,
                                assigned_qty: b.quantity, // سحب الكمية الأصلية مبدئياً
                                unit: b.unit_of_measure 
                            })} 
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'block', marginBottom: '8px' }}>الكمية المسندة للمقاول</label>
                            <input type="number" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 900, textAlign: 'center' }} 
                                   value={record.assigned_qty || ''} onChange={e => setRecord({...record, assigned_qty: e.target.value})} />
                            {record.unit && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '5px', textAlign: 'center' }}>الوحدة: {record.unit}</div>}
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'block', marginBottom: '8px' }}>سعر الاتفاق (للوحدة)</label>
                            <input type="number" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `2px solid ${THEME.accent}80`, outline: 'none', fontWeight: 900, textAlign: 'center', color: THEME.accent }} 
                                   value={record.unit_price || ''} onChange={e => setRecord({...record, unit_price: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '35px' }}>
                    <button onClick={handleSave} disabled={isSaving} style={{ flex: 2, background: THEME.success, color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 900, cursor: 'pointer' }}>
                        {isSaving ? '⏳ جاري الإسناد...' : '✅ حفظ الإسناد'}
                    </button>
                    <button onClick={onClose} style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 900, cursor: 'pointer' }}>إلغاء</button>
                </div>
            </div>
        </div>,
        document.body
    );
}