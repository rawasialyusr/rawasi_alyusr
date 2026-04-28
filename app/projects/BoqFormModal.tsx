"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import SmartCombo from '@/components/SmartCombo';

export default function BoqFormModal({ isOpen, onClose, record, setRecord, onSave }: any) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!isOpen || !mounted) return null;

    const handleSave = () => {
        if (!record.work_item) {
            return alert("يرجى اختيار أو كتابة اسم البند / المرحلة.");
        }
        onSave(record);
    };

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(40, 24, 10, 0.85)', backdropFilter: 'blur(15px)', direction: 'rtl', padding: '20px' }}>
            <div style={{ position: 'fixed', inset: 0 }} onClick={onClose} />
            <div className="cinematic-scroll" style={{ background: 'white', borderRadius: '35px', width: '100%', maxWidth: '800px', padding: '40px', position: 'relative', zIndex: 10, boxShadow: '0 50px 100px rgba(0,0,0,0.5)' }}>
                
                <h2 style={{ margin: '0 0 25px 0', fontWeight: 900, color: THEME.primary, borderBottom: '2px dashed #eee', paddingBottom: '15px' }}>
                    🛠️ {record.id ? 'تعديل بند المقايسة' : 'إضافة بند مقايسة وربط الموازنة (WBS)'}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 🚀 السحر هنا: السحب من جدول دليل البنود الموحد */}
                    <div style={{ zIndex: 90, position: 'relative', background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                        <SmartCombo 
                            label="اسم البند / المرحلة (من الدليل الموحد) 📚" 
                            table="boq_items" 
                            searchCols="item_name,item_code,main_category,sub_category"
                            displayCol="item_name" 
                            initialDisplay={record.work_item}
                            freeText={true} 
                            onSelect={(b: any) => {
                                const isObj = typeof b === 'object';
                                setRecord({
                                    ...record, 
                                    work_item: isObj ? b.item_name : b, 
                                    main_category: isObj ? b.main_category : 'بند عام',
                                    sub_category: isObj ? b.sub_category : 'مرحلة عامة',
                                    unit: isObj ? b.unit_of_measure : record.unit || 'مقطوعية'
                                });
                            }} 
                        />
                        
                        {/* مسار الشجرة (Breadcrumbs) بيظهر أوتوماتيك بعد الاختيار */}
                        {record.work_item && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '15px', fontSize: '13px', fontWeight: 900 }}>
                                <span style={{ background: THEME.coffeeDark, color: 'white', padding: '4px 10px', borderRadius: '6px' }}>{record.main_category || 'بند عام'}</span>
                                <span style={{ color: '#cbd5e1' }}>◀</span>
                                <span style={{ background: 'white', color: THEME.coffeeMain, padding: '4px 10px', borderRadius: '6px', border: `1px solid ${THEME.sandDark}` }}>{record.sub_category || 'مرحلة عامة'}</span>
                                <span style={{ color: '#cbd5e1' }}>◀</span>
                                <span style={{ color: THEME.success }}>{record.work_item}</span>
                            </div>
                        )}
                    </div>

                    {/* بيانات التعاقد */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                        <div><label style={{ fontSize: '12px', fontWeight: 900 }}>الوحدة</label><input type="text" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: 900, textAlign: 'center', background: '#fafafa' }} value={record.unit || ''} onChange={e => setRecord({...record, unit: e.target.value})} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 900 }}>الكمية التعاقدية</label><input type="number" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: 900, textAlign: 'center' }} value={record.contract_quantity || ''} onChange={e => setRecord({...record, contract_quantity: e.target.value})} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 900 }}>سعر الوحدة</label><input type="number" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `2px solid ${THEME.accent}50`, fontWeight: 900, textAlign: 'center', color: THEME.accent }} value={record.unit_contract_price || ''} onChange={e => setRecord({...record, unit_contract_price: e.target.value})} /></div>
                    </div>

                    {/* 🚀 قسم تحديد الميزانيات التقديرية (عمالة + خامات + مصروفات) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.warning, display: 'block', marginBottom: '8px' }}>👷 ميزانية العمالة</label>
                            <input type="number" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `2px solid ${THEME.warning}50`, outline: 'none', fontWeight: 900, textAlign: 'center', color: THEME.warning }} 
                                   value={record.estimated_labor_cost || ''} onChange={e => setRecord({...record, estimated_labor_cost: e.target.value})} placeholder="0.00" />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.success, display: 'block', marginBottom: '8px' }}>🧱 ميزانية الخامات</label>
                            <input type="number" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `2px solid ${THEME.success}50`, outline: 'none', fontWeight: 900, textAlign: 'center', color: THEME.success }} 
                                   value={record.estimated_operational_cost || ''} onChange={e => setRecord({...record, estimated_operational_cost: e.target.value})} placeholder="0.00" />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: '#3b82f6', display: 'block', marginBottom: '8px' }}>💸 ميزانية المصروفات</label>
                            <input type="number" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `2px solid #3b82f650`, outline: 'none', fontWeight: 900, textAlign: 'center', color: '#3b82f6' }} 
                                   value={record.estimated_expenses_cost || ''} onChange={e => setRecord({...record, estimated_expenses_cost: e.target.value})} placeholder="0.00" />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '35px' }}>
                    <button onClick={handleSave} style={{ flex: 2, background: THEME.success, color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', fontSize: '16px', boxShadow: `0 10px 20px ${THEME.success}40` }}>
                        ✅ حفظ البند في المقايسة
                    </button>
                    <button onClick={onClose} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', fontSize: '16px' }}>إلغاء</button>
                </div>
            </div>
        </div>,
        document.body
    );
}