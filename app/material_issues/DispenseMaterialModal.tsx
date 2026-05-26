"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import SmartCombo from '@/components/SmartCombo';
import { formatCurrency } from '@/lib/helpers';

// 🚀 الثوابت المحاسبية (الـ UUIDs الخاصة بشجرة الحسابات)
const ACCOUNT_INVENTORY = '4f828d0d-a1f4-4762-83e3-c17dafae802d'; // حساب الخامات والمخزون (دائن)
const ACCOUNT_CONTRACTOR = '27f37adf-c0ec-4b40-80d0-2b36b853fd4b'; // التزام مقاولي الباطن (مدين للمقاول)
const ACCOUNT_COMPANY_COST = 'ضع_اي_دي_حساب_تكلفة_الخامات_هنا'; // ⚠️ ضع هنا آي دي حساب (تكلفة مواد بناء / خامات) للمشاريع

export default function DispenseMaterialModal({ isOpen, onClose, invoiceItem, onSave, isSaving }: any) {
    const [mounted, setMounted] = useState(false);
    const [formData, setFormData] = useState({
        issue_date: new Date().toISOString().split('T')[0],
        project_id: '',
        project_name: '', // 🚀 مضاف لسحب الاسم
        issue_type: 'استهلاك مباشر', // Default
        subcontractor_id: '',
        subcontractor_name: '', // 🚀 مضاف لسحب الاسم
        quantity: 0,
        notes: '',
        boq_id: null,
        boq_item_id: null,
        boq_item_name: '', // 🚀 مضاف لسحب الاسم
        debit_account_id: ACCOUNT_COMPANY_COST,
        credit_account_id: ACCOUNT_INVENTORY
    });

    useEffect(() => {
        setMounted(true);
        if (invoiceItem) {
            // 🚀 سحب بيانات المشروع والبند من الفاتورة ووضعها في الـ State
            setFormData(prev => ({ 
                ...prev, 
                quantity: invoiceItem.available_qty || 1,
                project_id: invoiceItem.project_id || '',
                project_name: invoiceItem.project?.Property || '',
                boq_id: invoiceItem.boq_id || null,
                boq_item_id: invoiceItem.boq_id || null,
                boq_item_name: invoiceItem.boq_item || ''
            }));
        }
    }, [invoiceItem]);

    // 🎯 المراقبة الذكية للتوجيه المحاسبي
    useEffect(() => {
        const isContractor = formData.issue_type === 'صرف لمقاول';
        setFormData(prev => ({
            ...prev,
            debit_account_id: isContractor ? ACCOUNT_CONTRACTOR : ACCOUNT_COMPANY_COST,
            credit_account_id: ACCOUNT_INVENTORY
        }));
    }, [formData.issue_type]);

    if (!isOpen || !mounted || !invoiceItem) return null;

    const totalPrice = (Number(formData.quantity) || 0) * (Number(invoiceItem.unit_price) || 0);

    const handleSubmit = () => {
        if (!formData.project_id) return alert('⚠️ يرجى اختيار الفيلا/المشروع العقاري');
        if (formData.issue_type === 'صرف لمقاول' && !formData.subcontractor_id) return alert('⚠️ يرجى اختيار المقاول المستلم');
        if (formData.quantity <= 0 || formData.quantity > invoiceItem.available_qty) return alert('⚠️ كمية الصرف غير صحيحة أو تتجاوز المتاح في الفاتورة');
        
        onSave({ ...formData, item: invoiceItem });
    };

    return createPortal(
        <div className="warm-portal-overlay-fullscreen" onClick={onClose}>
            <style>{`
                .warm-portal-overlay-fullscreen {
                    position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important;
                    background: radial-gradient(circle at center, rgba(40, 24, 10, 0.4) 0%, rgba(15, 7, 0, 0.9) 100%) !important;
                    backdrop-filter: blur(20px) !important; display: flex !important; align-items: center !important; justify-content: center !important;
                    z-index: 999999999 !important;
                }
                .glass-input-field {
                    width: 100%; padding: 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.65); border: 1px solid rgba(255, 255, 255, 0.8);
                    outline: none; transition: 0.2s; font-weight: 700; color: #1e293b;
                }
                .glass-input-field:focus { background: #fff; border-color: ${THEME.goldAccent || '#ca8a04'}; box-shadow: 0 0 0 4px rgba(202, 138, 4, 0.15); }
                .btn-glass-save { background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 16px; border-radius: 16px; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.3s; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4); width: 100%; }
                .btn-glass-save:hover:not(:disabled) { transform: translateY(-3px); filter: brightness(1.1); }
            `}</style>

            <div className="cinematic-scroll glass-modal-container" onClick={(e) => e.stopPropagation()} style={{ 
                width: '700px', maxHeight: '95vh', background: 'rgba(248, 250, 252, 0.9)', 
                backdropFilter: 'blur(30px)', borderRadius: '35px', padding: '40px', 
                boxShadow: '0 40px 80px rgba(0,0,0,0.4)', overflowY: 'auto', direction: 'rtl'
            }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px', borderBottom:`2px solid ${THEME.goldAccent || '#ca8a04'}50`, paddingBottom:'15px'}}>
                    <h2 style={{ color: THEME.coffeeDark || '#2d1a11', fontWeight: 900, margin: 0, fontSize: '24px' }}>📤 صرف مباشر للموقع</h2>
                </div>

                <div style={{ background: 'white', padding: '15px', borderRadius: '16px', marginBottom: '25px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '18px' }}>{invoiceItem?.item_name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: 800 }}>المتاح للصرف: <span style={{color: THEME.success}}>{invoiceItem?.available_qty} {invoiceItem?.unit}</span></div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 900 }}>سعر الوحدة</div>
                        <div style={{ fontWeight: 900, color: THEME.primary }}>{formatCurrency(invoiceItem?.unit_price)}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ zIndex: 100, position: 'relative' }}>
                        <SmartCombo 
                            label="🏢 المشروع المستفيد *" 
                            icon="🏢" 
                            table="projects" 
                            displayCol="Property" 
                            searchCols="Property" 
                            value={formData.project_id}
                            initialDisplay={formData.project_name} // 🚀 ربط الاسم المسحوب
                            onSelect={(v: any) => setFormData({ ...formData, project_id: v?.id, project_name: v?.Property, boq_id: null, boq_item_id: null, boq_item_name: '' })}
                        />
                    </div>
                    <div style={{ zIndex: 90, position: 'relative' }}>
                        <SmartCombo 
                            label="📋 تحميل على بند (BOQ)" 
                            icon="📋" 
                            table="boq_budget_distinct" 
                            displayCol="work_item" 
                            searchCols="work_item"
                            searchColumns={['work_item']} 
                            customFilter={formData.project_id ? `project_id=eq.${formData.project_id}` : 'id=is.null'}
                            value={formData.boq_id}
                            initialDisplay={formData.boq_item_name} // 🚀 ربط الاسم المسحوب
                            onSelect={(v: any) => setFormData({ ...formData, boq_id: v?.id, boq_item_id: v?.boq_item_id, boq_item_name: v?.work_item })} 
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.coffeeDark, display: 'block', marginBottom: '6px' }}>📅 تاريخ الصرف</label>
                        <input type="date" className="glass-input-field" value={formData.issue_date} onChange={e => setFormData({...formData, issue_date: e.target.value})} />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.coffeeDark, display: 'block', marginBottom: '6px' }}>📦 الكمية المراد صرفها</label>
                        <input type="number" max={invoiceItem?.available_qty} min="0.1" step="0.1" className="glass-input-field" style={{ borderColor: formData.quantity > invoiceItem?.available_qty ? '#ef4444' : '' }} value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
                    </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px', marginBottom: '25px', border: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.coffeeDark, display: 'block', marginBottom: '15px' }}>🔄 التوجيه المحاسبي (جهة التحميل) *</label>
                    <div style={{ display: 'flex', gap: '20px', marginBottom: formData.issue_type === 'صرف لمقاول' ? '15px' : '0' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '13px' }}>
                            <input type="radio" checked={formData.issue_type === 'استهلاك مباشر'} onChange={() => setFormData({...formData, issue_type: 'استهلاك مباشر', subcontractor_id: ''})} style={{ accentColor: THEME.primary, transform: 'scale(1.2)' }} />
                            🏢 استهلاك للشركة (تكلفة مشروع)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '13px', color: '#be123c' }}>
                            <input type="radio" checked={formData.issue_type === 'صرف لمقاول'} onChange={() => setFormData({...formData, issue_type: 'صرف لمقاول'})} style={{ accentColor: '#be123c', transform: 'scale(1.2)' }} />
                            👷 تحميل كسلفة على مقاول
                        </label>
                    </div>

                    <div style={{ zIndex: 80, position: 'relative', animation: 'fadeIn 0.3s' }}>
                        {formData.issue_type === 'صرف لمقاول' ? (
                            <SmartCombo 
                                label="👤 اختر المقاول المراد الخصم منه *" 
                                icon="👷" 
                                table="partners" 
                                displayCol="name" 
                                searchCols="name" 
                                customFilter="partner_type=eq.مقاول" 
                                value={formData.subcontractor_id}
                                initialDisplay={formData.subcontractor_name} // 🚀 ربط الاسم للمقاول
                                onSelect={(v: any) => setFormData({ ...formData, subcontractor_id: v?.id, subcontractor_name: v?.name })} 
                            />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
                                <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#166534', padding: '12px', borderRadius: '12px', textAlign: 'center', fontWeight: 900, border: '1px dashed rgba(34, 197, 94, 0.4)' }}>
                                    سيتم تحميل التكلفة مباشرة على حساب تكلفة المشروع
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `linear-gradient(135deg, ${THEME.goldAccent || '#ca8a04'}20, transparent)`, padding: '15px 20px', borderRadius: '16px', border: `1px dashed ${THEME.goldAccent || '#ca8a04'}`, marginBottom: '25px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: THEME.coffeeDark }}>إجمالي قيمة الصرف:</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: THEME.goldAccent || '#ca8a04' }}>{formatCurrency(totalPrice)}</div>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <button onClick={handleSubmit} disabled={isSaving} className="btn-glass-save" style={{ flex: 2 }}>
                        {isSaving ? '⏳ جاري الصرف والترحيل...' : '✅ تأكيد الصرف والترحيل'}
                    </button>
                    <button onClick={onClose} disabled={isSaving} style={{ flex: 1, padding: '16px', background: '#e2e8f0', color: '#475569', borderRadius: '16px', fontWeight: 900, border: 'none', cursor: 'pointer' }}>
                        إلغاء
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}