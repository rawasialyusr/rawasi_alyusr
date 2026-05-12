"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import SmartCombo from '@/components/SmartCombo';
import { formatCurrency } from '@/lib/helpers';

export default function MaterialIssueModal({ isOpen, onClose, logic }: any) {
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    // حارس الرندر
    if (!isOpen || !mounted) return null;

    // حساب الإجماليات للملخص السفلي
    const totalQuantity = logic.issueData.items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
    const grandTotal = logic.issueData.items.reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0);

    return createPortal(
        <div className="warm-portal-overlay-fullscreen" onClick={onClose}>
            <style>{`
                .warm-portal-overlay-fullscreen {
                    position: fixed !important; inset: 0 !important;
                    width: 100vw !important; height: 100vh !important;
                    background: radial-gradient(circle at center, rgba(40, 24, 10, 0.4) 0%, rgba(15, 7, 0, 0.9) 100%) !important;
                    backdrop-filter: blur(20px) !important;
                    display: flex !important; align-items: center !important; justify-content: center !important;
                    z-index: 999999999 !important;
                }
                .glass-input-field {
                    width: 100%; padding: 12px; border-radius: 12px;
                    background: rgba(255, 255, 255, 0.65);
                    border: 1px solid rgba(255, 255, 255, 0.8);
                    outline: none; transition: 0.2s; font-weight: 700; color: #1e293b;
                }
                .glass-input-field:focus { background: #fff; border-color: ${THEME.accent}; box-shadow: 0 0 0 4px rgba(202, 138, 4, 0.15); }
                
                .btn-glass-save { background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 16px; border-radius: 16px; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.3s; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4); }
                .btn-glass-save:hover:not(:disabled) { transform: translateY(-3px); filter: brightness(1.1); }
                .btn-glass-cancel { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255, 255, 255, 0.8); padding: 16px; border-radius: 16px; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.3s; }
                .btn-glass-cancel:hover { background: rgba(255, 255, 255, 0.9); transform: translateY(-2px); }
                
                .lines-table-container {
                    background: rgba(255, 255, 255, 0.5);
                    border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.7);
                    overflow: hidden; margin-top: 15px;
                }
                .item-row { transition: 0.2s; border-bottom: 1px solid rgba(0,0,0,0.05); }
                .item-row:hover { background: rgba(255, 255, 255, 0.8); }
            `}</style>

            <div className="cinematic-scroll glass-modal-container" onClick={(e) => e.stopPropagation()} style={{ 
                width: '1000px', maxHeight: '95vh', background: 'rgba(248, 250, 252, 0.9)', 
                backdropFilter: 'blur(30px)', borderRadius: '35px', padding: '40px', 
                boxShadow: '0 40px 80px rgba(0,0,0,0.4)', overflowY: 'auto', direction: 'rtl'
            }}>
                
                {/* 📝 الهيدر */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px', borderBottom:`2px solid ${THEME.accent}50`, paddingBottom:'15px'}}>
                    <h2 style={{ color: THEME.primary, fontWeight: 900, margin: 0, fontSize: '26px' }}>
                        {logic.editingIssueId ? '✏️ تعديل إذن صرف خامات' : '📤 إصدار إذن صرف خامات'}
                    </h2>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 900 }}>الصافي النهائي للصرف</div>
                        <div style={{ color: THEME.accent, fontWeight: 900, fontSize: '28px' }}>{formatCurrency(grandTotal)}</div>
                    </div>
                </div>

                {/* 📋 البيانات الأساسية (Master Data) */}
                <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '25px', marginBottom: '25px' }}>
                    <div style={{ zIndex: 90, position: 'relative' }}>
                        <SmartCombo 
                            label="🏢 المشروع الصارف *" 
                            icon="🏢" 
                            table="projects" 
                            displayCol="Property" 
                            searchCols="Property,project_code" 
                            value={logic.issueData.project_id}
                            onSelect={(v: any) => logic.setIssueData({ ...logic.issueData, project_id: v?.id })} 
                        />
                    </div>
                    
                    <div style={{ zIndex: 80, position: 'relative' }}>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'block', marginBottom: '6px' }}>🔄 التوجيه ونوع الصرف *</label>
                        <select className="glass-input-field" value={logic.issueData.issue_type} onChange={e => logic.setIssueData({...logic.issueData, issue_type: e.target.value})}>
                            <option value="صرف لمقاول">خصم من حساب مقاول باطن 👷</option>
                            <option value="استهلاك مباشر">استهلاك مباشر للمشروع 🏗️</option>
                        </select>
                    </div>

                    <div style={{ zIndex: 70, position: 'relative' }}>
                        {logic.issueData.issue_type === 'صرف لمقاول' ? (
                            <SmartCombo 
                                label="👤 المقاول المستلم *" 
                                icon="👷" 
                                table="partners" 
                                displayCol="name" 
                                searchCols="name" 
                                customFilter="partner_type=eq.مقاول" 
                                value={logic.issueData.subcontractor_id}
                                onSelect={(v: any) => logic.setIssueData({ ...logic.issueData, subcontractor_id: v?.id })} 
                            />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-end' }}>
                                <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#166534', padding: '12px', borderRadius: '12px', textAlign: 'center', fontWeight: 900, border: '1px dashed rgba(34, 197, 94, 0.4)' }}>
                                    سيتم تحميلها على تكلفة المشروع
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* 🚀 قسم إدخال الأصناف (متعدد الأصناف) */}
                <div style={{ background: 'rgba(202, 138, 4, 0.05)', padding: '20px', borderRadius: '20px', marginBottom: '25px', border: `1px dashed ${THEME.accent}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: THEME.brand?.coffee || THEME.coffeeDark }}>📦 الخامات المنصرفة (الأصناف)</h3>
                        <button onClick={logic.addItem} style={{ background: 'white', color: THEME.primary, border: `1px solid ${THEME.accent}`, padding: '8px 15px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', transition: '0.2s' }}>
                            ➕ إضافة صنف آخر
                        </button>
                    </div>
                    
                    <div className="lines-table-container">
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                            <thead style={{ background: THEME.primary, color: 'white' }}>
                                <tr>
                                    <th style={{ padding: '12px', fontSize: '11px', textAlign: 'right' }}>البيان / اسم الخامة</th>
                                    <th style={{ padding: '12px', fontSize: '11px', width: '10%' }}>الكمية</th>
                                    <th style={{ padding: '12px', fontSize: '11px', width: '15%' }}>الوحدة</th>
                                    <th style={{ padding: '12px', fontSize: '11px', width: '20%' }}>سعر الوحدة</th>
                                    <th style={{ padding: '12px', fontSize: '11px', width: '20%' }}>الإجمالي</th>
                                    <th style={{ padding: '12px', fontSize: '11px', width: '5%' }}>حذف</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logic.issueData.items.map((item: any, idx: number) => (
                                    <tr key={idx} className="item-row">
                                        <td style={{ padding: '10px' }}>
                                            <input type="text" placeholder="مثال: أسمنت بورتلاندي" className="glass-input-field" style={{ padding: '8px', background: 'white' }} value={item.item_name} onChange={e => logic.handleItemChange(idx, 'item_name', e.target.value)} />
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <input type="number" placeholder="0" className="glass-input-field" style={{ padding: '8px', textAlign: 'center', background: 'white' }} value={item.quantity} onChange={e => logic.handleItemChange(idx, 'quantity', e.target.value)} />
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <input type="text" placeholder="طن" className="glass-input-field" style={{ padding: '8px', textAlign: 'center', background: 'white' }} value={item.unit} onChange={e => logic.handleItemChange(idx, 'unit', e.target.value)} />
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <input type="number" placeholder="0.00" className="glass-input-field" style={{ padding: '8px', textAlign: 'center', background: 'white' }} value={item.unit_price} onChange={e => logic.handleItemChange(idx, 'unit_price', e.target.value)} />
                                        </td>
                                        <td style={{ padding: '10px', fontWeight: 900, color: THEME.primary, fontSize: '16px' }}>
                                            {formatCurrency(item.total_price)}
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            {idx > 0 ? (
                                                <button onClick={() => logic.handleRemoveItem(idx)} style={{ background: 'none', border: 'none', color: THEME.danger, cursor: 'pointer', fontSize: '18px' }} title="حذف الصنف">🗑️</button>
                                            ) : <div style={{width: '24px'}}></div>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 🚀 الملخص المالي السفلي المتطابق */}
                <div className="responsive-summary-grid" style={{ marginTop: '30px', padding: '25px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: '24px', color: 'white', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 800 }}>عدد الأصناف المنصرفة</div>
                        <div style={{ fontSize: '24px', fontWeight: 900 }}>{logic.issueData.items.length}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 800 }}>إجمالي الكميات</div>
                        <div style={{ fontSize: '24px', fontWeight: 900 }}>{totalQuantity}</div>
                    </div>
                    <div style={{ background: `linear-gradient(135deg, ${THEME.accent}40, transparent)`, padding: '15px', borderRadius: '16px', border: `1px solid ${THEME.accent}80`, boxShadow: `0 0 20px ${THEME.accent}20` }}>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: THEME.accentLight }}>الصافي النهائي للصرف</div>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{formatCurrency(grandTotal)}</div>
                    </div>
                </div>

                {/* أزرار الحفظ والإغلاق */}
                <div className="responsive-actions" style={{ display: 'flex', gap: '20px', marginTop: '35px' }}>
                    <button onClick={logic.handleSave} className="btn-glass-save" style={{ flex: 2 }}>
                        {logic.editingIssueId ? '✨ تحديث إذن الصرف' : '⏳ حفظ إذن الصرف كمسودة (غير مرحل)'}
                    </button>
                    <button onClick={onClose} className="btn-glass-cancel" style={{ flex: 1 }}>
                        إغلاق وإلغاء
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}