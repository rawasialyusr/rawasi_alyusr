"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import SmartCombo from '@/components/SmartCombo';
import { formatCurrency } from '@/lib/helpers';

export default function PaymentVoucherModal({ isOpen, onClose, record, setRecord, onSave, isSaving }: any) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    if (!isOpen || !mounted || !record) return null;

    return createPortal(
        // 🚀 البلور الدافي المعتمد
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'rgba(40, 24, 10, 0.85)', backdropFilter: 'blur(10px)', direction: 'rtl', padding: '50px 20px', overflowY: 'auto' }}>
            <div style={{ position: 'fixed', inset: 0, zIndex: 0 }} onClick={onClose} />
            
            <style>{`
                @keyframes modalEntrance { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>

            <div className="cinematic-scroll" style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '32px', width: '100%', maxWidth: '700px', padding: '45px', position: 'relative', zIndex: 10, margin: 'auto', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.5)', animation: 'modalEntrance 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px', borderBottom:'2px dashed #e2e8f0', paddingBottom:'20px'}}>
                    <div>
                        <h2 style={{ fontWeight: 900, color: THEME.brand.coffee, margin:0, fontSize: '26px' }}>💸 {record.id ? 'تعديل سند الصرف' : 'إصدار سند صرف'}</h2>
                    </div>
                    <div style={{ textAlign: 'left', background: '#fef2f2', padding: '10px 20px', borderRadius: '16px', border: `1px solid ${THEME.danger}30` }}>
                        <div style={{ fontSize: '11px', color: THEME.danger, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>مبلغ السند</div>
                        <div style={{ color: THEME.danger, fontWeight: 900, fontSize: '24px' }}>{formatCurrency(record.amount || 0)}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.brand.coffee, display: 'block', marginBottom: '8px' }}>📅 تاريخ السداد *</label>
                        <input type="date" style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, color: '#1e293b', outline: 'none' }} value={record.date || ''} onChange={e => setRecord({...record, date: e.target.value})} />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.brand.coffee, display: 'block', marginBottom: '8px' }}>💰 المبلغ المراد صرفه *</label>
                        <input type="number" style={{ width: '100%', padding: '14px', borderRadius: '14px', border: `2px solid ${THEME.danger}50`, background: '#fef2f2', fontWeight: 900, color: THEME.danger, outline: 'none', fontSize: '16px' }} value={record.amount || ''} onChange={e => setRecord({...record, amount: Number(e.target.value)})} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ zIndex: 60, position: 'relative' }}>
                        <SmartCombo label="👤 المستفيد المباشر *" table="partners" displayCol="name" initialDisplay={record.payee_name} onSelect={(val:any) => setRecord({...record, payee_name: val.name})} allowAddNew={true} />
                    </div>
                    <div style={{ zIndex: 50, position: 'relative' }}>
                        <SmartCombo label="🏢 المشروع (اختياري)" table="projects" displayCol="Property" initialDisplay={record.site_ref} onSelect={(val:any) => setRecord({...record, site_ref: val.Property})} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ zIndex: 40, position: 'relative' }}>
                        <SmartCombo label="🏦 حساب السداد (الخزينة/البنك) *" table="accounts" displayCol="name" initialDisplay={record.payment_account} onSelect={(val:any) => setRecord({...record, payment_account: val.name})} strict={true} />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.brand.coffee, display: 'block', marginBottom: '8px' }}>💳 طريقة الدفع</label>
                        <select style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 700, color: '#1e293b', outline: 'none', cursor: 'pointer' }} value={record.payment_method || 'تحويل بنكي'} onChange={e => setRecord({...record, payment_method: e.target.value})} >
                            <option value="تحويل بنكي">تحويل بنكي</option>
                            <option value="نقدي">نقدي (كاش)</option>
                            <option value="شيك">شيك</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.brand.coffee, display: 'block', marginBottom: '8px' }}>🔢 رقم المرجع (حوالة / شيك)</label>
                        <input type="text" placeholder="رقم المرجع..." style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: '#fff', fontWeight: 700, color: '#1e293b', outline: 'none' }} value={record.reference_number || ''} onChange={e => setRecord({...record, reference_number: e.target.value})} />
                    </div>
                    <div style={{ zIndex: 30, position: 'relative' }}>
                        <SmartCombo label="📂 بيان السند / الوصف" freeText={true} initialDisplay={record.description} onSelect={(val:any) => setRecord({...record, description: typeof val === 'object' ? val.name : val})} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '25px' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '18px', borderRadius: '16px', border: '2px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 900, cursor: 'pointer', fontSize: '15px', transition: '0.2s' }}>إلغاء</button>
                    <button onClick={onSave} disabled={isSaving} style={{ flex: 2, padding: '18px', borderRadius: '16px', background: THEME.danger, color: 'white', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '16px', boxShadow: `0 10px 25px ${THEME.danger}40`, transition: '0.2s' }}>
                        {isSaving ? '⏳ جاري التنفيذ...' : '✅ حفظ وإصدار السند'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}