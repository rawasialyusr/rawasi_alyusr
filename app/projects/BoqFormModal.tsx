"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import SmartCombo from '@/components/SmartCombo';

// 🚀 أضفنا projectBoq و onImport في الـ Props عشان نقدر نربط البنود ببعضها
export default function BoqFormModal({ isOpen, onClose, record, setRecord, onSave, projectBoq = [], onImport }: any) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // 🚀 حساب مدة التنفيذ أوتوماتيكياً
    const durationDays = useMemo(() => {
        if (record.start_date && record.end_date) {
            const start = new Date(record.start_date);
            const end = new Date(record.end_date);
            const diffTime = end.getTime() - start.getTime();
            if (diffTime < 0) return 0;
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 لحساب اليوم نفسه
        }
        return 0;
    }, [record.start_date, record.end_date]);

    if (!isOpen || !mounted) return null;

    // 🚀 استخراج المراحل الرئيسية المضافة فعلياً للمشروع
    const mainPhases = projectBoq?.filter((item: any) => item.item_type === 'رئيسي') || [];

    const handleSave = () => {
        if (!record.work_item) {
            return alert("يرجى اختيار أو كتابة اسم البند / المرحلة.");
        }
        if (record.item_type === 'فرعي' && !record.parent_id) {
            return alert("يرجى اختيار المرحلة الرئيسية التي يتبعها هذا البند الفرعي.");
        }
        // 🚀 حماية من إدخال تواريخ خاطئة
        if (record.start_date && record.end_date && new Date(record.start_date) > new Date(record.end_date)) {
            return alert("تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية!");
        }
        onSave(record);
    };

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(40, 24, 10, 0.85)', backdropFilter: 'blur(15px)', direction: 'rtl', padding: '20px' }}>
            <div style={{ position: 'fixed', inset: 0 }} onClick={onClose} />
            <div className="cinematic-scroll" style={{ background: 'white', borderRadius: '35px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '40px', position: 'relative', zIndex: 10, boxShadow: '0 50px 100px rgba(0,0,0,0.5)' }}>
                
                <h2 style={{ margin: '0 0 25px 0', fontWeight: 900, color: THEME.primary, borderBottom: '2px dashed #eee', paddingBottom: '15px' }}>
                    🛠️ {record.id ? 'تعديل بند المقايسة' : 'إضافة بند مقايسة وربط الموازنة (WBS)'}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 🚀 قسم تحديد النوع (رئيسي / فرعي) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: '#f1f5f9', padding: '15px', borderRadius: '20px' }}>
                        <button 
                            onClick={() => setRecord({...record, item_type: 'رئيسي', parent_id: null})}
                            style={{ padding: '15px', borderRadius: '12px', border: 'none', fontWeight: 900, cursor: 'pointer', transition: '0.3s', backgroundColor: record.item_type === 'رئيسي' ? THEME.coffeeDark : 'transparent', color: record.item_type === 'رئيسي' ? 'white' : '#64748b' }}
                        >
                            📂 مرحلة رئيسية (تصنيف)
                        </button>
                        <button 
                            onClick={() => setRecord({...record, item_type: 'فرعي'})}
                            style={{ padding: '15px', borderRadius: '12px', border: 'none', fontWeight: 900, cursor: 'pointer', transition: '0.3s', backgroundColor: record.item_type === 'فرعي' ? THEME.goldAccent : 'transparent', color: record.item_type === 'فرعي' ? 'white' : '#64748b' }}
                        >
                            ↪️ بند تنفيذي فرعي
                        </button>
                    </div>

                    {/* 🚀 اختيار المرحلة الأب (يظهر فقط لو البند "فرعي") */}
                    {record.item_type === 'فرعي' && (
                        <div style={{ background: '#fffbeb', padding: '20px', borderRadius: '20px', border: '1px solid #fef3c7' }}>
                            <label style={{ fontSize: '14px', fontWeight: 900, color: '#b45309', display: 'block', marginBottom: '10px' }}>📍 يتبع لأي مرحلة رئيسية في المشروع؟</label>
                            <select 
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #fbbf24', fontWeight: 800, outline: 'none' }}
                                value={record.parent_id || ''}
                                onChange={e => setRecord({...record, parent_id: e.target.value})}
                            >
                                <option value="">-- اختر المرحلة الرئيسية --</option>
                                {mainPhases.map((phase: any) => (
                                    <option key={phase.id} value={phase.id}>{phase.work_item}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* 🚀 السحر هنا: السحب من جدول دليل البنود الموحد */}
                    <div style={{ zIndex: 90, position: 'relative', background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                        <SmartCombo 
                            label="اسم البند / المرحلة (من الدليل الموحد) 📚" 
                            table="boq_items" 
                            searchCols="item_name,item_code,main_category,sub_category"
                            displayCol="item_name" 
                            initialDisplay={record.work_item}
                            freeText={true} 
                            onSelect={async (b: any) => {
                                const isObj = typeof b === 'object' && b !== null;
                                
                                // 🚀 تفعيل الاستيراد التلقائي القوي (لو الدالة مبعوتة من اللوجيك)
                                if (isObj && onImport) {
                                    await onImport(b);
                                    onClose(); // نقفل المودال لأن البند نزل في الداتا بيز خلاص
                                    return;
                                }

                                // 🚀 السحب الذكي العادي (التسكين التلقائي للـ parent_id)
                                let suggestedParentId = record.parent_id;
                                if (isObj) {
                                    const existingPhase = projectBoq?.find((item: any) => item.item_type === 'رئيسي' && item.work_item === b.main_category);
                                    if (existingPhase) suggestedParentId = existingPhase.id;
                                }

                                setRecord({
                                    ...record, 
                                    boq_item_id: isObj ? b.id : null,
                                    work_item: isObj ? b.item_name : b, 
                                    item_type: isObj ? 'فرعي' : (record.item_type || 'رئيسي'), 
                                    parent_id: suggestedParentId, 
                                    main_category: isObj ? b.main_category : 'بند عام',
                                    sub_category: isObj ? b.sub_category : 'مرحلة عامة',
                                    unit: isObj ? b.unit_of_measure : record.unit || 'مقطوعية',
                                    unit_contract_price: isObj && b.default_unit_price ? b.default_unit_price : record.unit_contract_price,
                                    estimated_labor_cost: isObj && b.default_labor_price ? b.default_labor_price : record.estimated_labor_cost,
                                    estimated_operational_cost: isObj && b.default_material_price ? b.default_material_price : record.estimated_operational_cost
                                });
                            }} 
                        />
                        
                        {/* مسار الشجرة (Breadcrumbs) بيظهر أوتوماتيك بعد الاختيار */}
                        {record.work_item && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '15px', fontSize: '13px', fontWeight: 900, flexWrap: 'wrap' }}>
                                <span style={{ background: THEME.coffeeDark, color: 'white', padding: '4px 10px', borderRadius: '6px' }}>{record.main_category || 'بند عام'}</span>
                                <span style={{ color: '#cbd5e1' }}>◀</span>
                                <span style={{ background: 'white', color: THEME.coffeeMain, padding: '4px 10px', borderRadius: '6px', border: `1px solid ${THEME.sandDark}` }}>{record.sub_category || 'مرحلة عامة'}</span>
                                <span style={{ color: '#cbd5e1' }}>◀</span>
                                <span style={{ color: THEME.success }}>{record.work_item}</span>
                            </div>
                        )}
                    </div>

                    {/* 🚀 القسم الجديد: الجدول الزمني للتنفيذ */}
                    <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '16px', border: '1px solid #bbf7d0', position: 'relative' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📅 الجدول الزمني للتنفيذ (Time Schedule)
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 900, color: '#14532d', display: 'block', marginBottom: '8px' }}>تاريخ البدء المتوقع</label>
                                <input type="date" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid #86efac`, outline: 'none', fontWeight: 900, color: '#14532d' }} 
                                       value={record.start_date || ''} onChange={e => setRecord({...record, start_date: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 900, color: '#14532d', display: 'block', marginBottom: '8px' }}>تاريخ الانتهاء المستهدف</label>
                                <input type="date" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid #86efac`, outline: 'none', fontWeight: 900, color: '#14532d' }} 
                                       value={record.end_date || ''} onChange={e => setRecord({...record, end_date: e.target.value})} />
                            </div>
                        </div>
                        {/* عرض مدة التنفيذ ديناميكياً */}
                        {durationDays > 0 && (
                            <div style={{ position: 'absolute', top: '15px', left: '20px', background: '#166534', color: 'white', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 900 }}>
                                مدة التنفيذ: {durationDays} أيام ⏳
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