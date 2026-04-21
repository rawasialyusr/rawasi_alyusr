"use client";
import React, { useState, useEffect, useRef } from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';

// =========================================================================
// 🔍 مكون البحث الذكي المطور (مع دعم السحب الآلي initialDisplay)
// =========================================================================
const SmartCombo = ({ label, table, onSelect, placeholder, searchCols = 'name,code', displayCol = 'name', filterStatus, tabIndex, multi = false, selectedValues = [], initialDisplay = '' }: any) => {
    const [search, setSearch] = useState<string>(initialDisplay || ''); 
    const [results, setResults] = useState<any[]>([]);
    const [show, setShow] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
    
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialDisplay) {
            setSearch(initialDisplay);
        } else if (!multi) {
            setSearch('');
        }
    }, [initialDisplay, multi]);

    const loadInitialData = async (query = '') => {
        if (!table) return;
        setIsLoading(true);
        try {
            let q = supabase.from(table).select('*').limit( multi ? 50 : 15); 
            if (table === 'accounts') q = q.eq('is_transactional', true);
            if (filterStatus) q = q.eq('status', filterStatus);
            if (query) {
                const orQuery = searchCols.split(',').map((col: string) => `${col}.ilike.%${query}%`).join(',');
                q = q.or(orQuery);
            }
            const { data, error } = await q;
            if (!error) setResults((data as any[]) || []);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!show && e.key === 'ArrowDown') { setShow(true); loadInitialData(search); return; }
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
                break;
            case 'Enter':
                if (show && highlightedIndex >= 0) {
                    e.preventDefault();
                    handleItemAction(results[highlightedIndex]);
                }
                break;
            case 'Escape': setShow(false); break;
        }
    };

    const handleItemAction = (item: any) => {
        onSelect(item);
        if (!multi) {
            const displayName = item[displayCol] || item.Property || item.invoice_number || item.name;
            setSearch(displayName); 
            setShow(false);
        }
    };

    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const el = listRef.current.children[highlightedIndex] as HTMLElement;
            el?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightedIndex]);

    return (
        <div style={{ position: 'relative', flex: 1 }}>
            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'block', marginBottom: '6px' }}>{label}</label>
            <input 
                type="text" 
                tabIndex={tabIndex}
                placeholder={placeholder || '🔍 ابحث...'}
                value={search} 
                onChange={(e) => { setSearch(e.target.value); setShow(true); }}
                onFocus={() => { setShow(true); loadInitialData(search); }}
                onKeyDown={handleKeyDown} 
                className="glass-input"
            />
            {show && results.length > 0 && (
                <>
                    <div onClick={() => setShow(false)} style={{ position: 'fixed', inset: 0, zIndex: 1999 }} />
                    <div ref={listRef} className="cinematic-scroll glass-dropdown">
                        {results.map((item: any, index: number) => {
                            const isSelected = multi ? selectedValues.some((v: any) => v.id === item.id) : false;
                            const isHighlighted = index === highlightedIndex;
                            return (
                                <div key={item.id} onClick={() => handleItemAction(item)} 
                                     className={`dropdown-item ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}>
                                    {multi && <input type="checkbox" checked={isSelected} readOnly style={{ width: '18px', height: '18px', accentColor: THEME.success }} />}
                                    <span style={{ fontWeight: isSelected ? '900' : 'bold' }}>{item[displayCol] || item.Property || item.invoice_number || item.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

// =========================================================================
// 📝 المودال الرئيسي (سند القبض)
// =========================================================================
export default function ReceiptVoucherModal({ isOpen, onClose, record, setRecord, onSave }: any) {
    if (!isOpen) return null;

    // 🚀 [إضافة] المراقبة الذكية لجلب الأسماء عند الضغط من الخارج
    useEffect(() => {
        const syncNames = async () => {
            if (!isOpen || !record) return;
            
            let updates: any = {};
            let needsUpdate = false;

            // 1. ترجمة مصفوفة العقارات (project_ids) لأسماء
            if (record.project_ids?.length > 0 && (!record.selected_projects || record.selected_projects.length === 0)) {
                const { data } = await supabase.from('projects').select('id, "Property"').in('id', record.project_ids);
                if (data) {
                    updates.selected_projects = data;
                    needsUpdate = true;
                }
            }

            // 2. ترجمة العميل (partner_id) لاسم
            if (record.partner_id && !record.partner_name) {
                const { data } = await supabase.from('partners').select('name').eq('id', record.partner_id).single();
                if (data) {
                    updates.partner_name = data.name;
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                setRecord((prev: any) => ({ ...prev, ...updates }));
            }
        };

        syncNames();
    }, [isOpen, record?.project_ids, record?.partner_id]);

    // 🧠 1. سحر السحب الآلي عند اختيار الفاتورة يدوياً من الداخل
    const handleInvoiceSelect = async (inv: any) => {
        const remainingAmount = Number(inv.total_amount) - Number(inv.paid_amount || 0);
        const { data: partnerData } = await supabase.from('partners').select('name').eq('id', inv.partner_id).single();
        
        let projectsData: any[] = [];
        if (inv.project_ids && inv.project_ids.length > 0) {
            const { data } = await supabase.from('projects').select('id, "Property"').in('id', inv.project_ids);
            projectsData = data || [];
        }

        setRecord({
            ...record,
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            partner_id: inv.partner_id,
            partner_name: partnerData?.name || '', 
            selected_projects: projectsData, 
            project_ids: projectsData.map(p => p.id), 
            amount: remainingAmount > 0 ? remainingAmount : 0 
        });
    };

    // 🧠 2. دالة اختيار العقارات
    const handleProjectToggle = (proj: any) => {
        const current = record.selected_projects || [];
        const isExists = current.find((p: any) => p.id === proj.id);
        
        let newList = isExists 
            ? current.filter((p: any) => p.id !== proj.id) 
            : [...current, { id: proj.id, Property: proj.Property }];

        setRecord({
            ...record,
            selected_projects: newList,
            project_ids: newList.map((p: any) => p.id)
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(record);
    };

    return (
        <div className="cinematic-scroll" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, backdropFilter: 'blur(10px)', overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            
            <style>{`
                .glass-modal {
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(25px);
                    border: 1px solid rgba(255, 255, 255, 0.8);
                    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.15);
                    border-radius: 28px;
                    width: 950px;
                    padding: 40px;
                    direction: rtl;
                }
                .glass-input {
                    width: 100%; padding: 14px; border-radius: 12px;
                    border: 1px solid rgba(0, 0, 0, 0.1);
                    background: rgba(255, 255, 255, 0.7);
                    outline: none; transition: all 0.2s;
                    font-weight: 700; color: #1e293b; font-size: 14px;
                }
                .glass-input:focus {
                    background: #ffffff; border-color: ${THEME.accent};
                    box-shadow: 0 0 0 4px rgba(202, 138, 4, 0.15);
                }
                .glass-dropdown {
                    position: absolute; top: calc(100% + 5px); left: 0; right: 0;
                    background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px);
                    z-index: 2000; border-radius: 12px;
                    box-shadow: 0 15px 35px rgba(0,0,0,0.15); border: 1px solid rgba(255, 255, 255, 0.8);
                    max-height: 200px; overflow-y: auto; padding: 6px;
                }
                .dropdown-item {
                    padding: 12px; cursor: pointer; border-radius: 8px;
                    font-size: 13px; transition: all 0.1s; display: flex; align-items: center; gap: 10px;
                }
                .dropdown-item.highlighted { background: #f1f5f9; border-right: 4px solid ${THEME.primary}; }
                .dropdown-item.selected { background: #f0fdf4; border-right: 4px solid ${THEME.success}; }
                
                .btn-save {
                    background: linear-gradient(135deg, #10b981, #059669); color: white;
                    border: none; padding: 18px; border-radius: 16px; font-weight: 900; font-size: 16px;
                    cursor: pointer; transition: 0.3s; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);
                }
                .btn-save:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(16, 185, 129, 0.5); }
                
                .btn-cancel {
                    background: rgba(255, 255, 255, 0.6); color: ${THEME.ruby};
                    border: 1px solid rgba(255, 255, 255, 0.8); padding: 18px; border-radius: 16px;
                    font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.3s;
                }
            `}</style>

            <div className="glass-modal">
                <h2 style={{ color: THEME.primary, borderBottom: `2px solid ${THEME.accent}40`, paddingBottom: '15px', margin: '0 0 30px 0', fontWeight: 900, fontSize: '26px' }}>
                    💰 {record.id ? 'تعديل سند قبض' : 'إصدار سند قبض جديد'}
                </h2>
                
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                    
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'block', marginBottom: '6px' }}>تاريخ السند *</label>
                        <input type="date" required tabIndex={1} value={record.date || ''} onChange={e => setRecord({...record, date: e.target.value})} className="glass-input" />
                    </div>
                    
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'block', marginBottom: '6px' }}>طريقة الدفع *</label>
                        <select required tabIndex={2} value={record.payment_method || ''} onChange={e => setRecord({...record, payment_method: e.target.value})} className="glass-input" style={{ appearance: 'auto' }}>
                            <option value="نقدي (كاش)">نقدي (كاش)</option>
                            <option value="تحويل بنكي">تحويل بنكي</option>
                            <option value="شيك">شيك</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '14px', fontWeight: 900, color: THEME.success, display: 'block', marginBottom: '6px' }}>المبلغ المُحصل (ريال) *</label>
                        <input type="number" required tabIndex={3} step="0.01" value={record.amount ?? ''} onChange={e => setRecord({...record, amount: e.target.value})} className="glass-input" style={{ background: '#f0fdf4', color: THEME.success, fontSize: '18px', border: `2px solid ${THEME.success}50` }} />
                    </div>

                    {/* --- الصف الثاني (السحب الآلي) --- */}
                    <div style={{ gridColumn: 'span 1' }}>
                        <SmartCombo 
                            tabIndex={4} 
                            label="رقم الفاتورة (سحب آلي ⚡)" 
                            table="invoices" 
                            searchCols="invoice_number" 
                            displayCol="invoice_number" 
                            initialDisplay={record.invoice_number}
                            onSelect={handleInvoiceSelect} 
                        />
                    </div>

                    <div style={{ gridColumn: 'span 1' }}>
                        <SmartCombo 
                            tabIndex={5} 
                            multi={true} 
                            label="العقارات (متعدد ✅)" 
                            table="projects" 
                            searchCols="Property" 
                            displayCol="Property" 
                            selectedValues={record.selected_projects || []}
                            placeholder={ (record.selected_projects?.length > 0) ? `تم اختيار (${record.selected_projects.length}) عقارات` : '🔍 اختر العقارات...' }
                            onSelect={handleProjectToggle} 
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                            {(record.selected_projects || []).map((p: any) => (
                                <span key={p.id} style={{ background: 'rgba(30, 41, 59, 0.1)', fontSize: '11px', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontWeight: 800, color: THEME.primary }}>
                                    {p.Property}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div style={{ gridColumn: 'span 1' }}>
                        <SmartCombo 
                            tabIndex={6} 
                            label="العميل الدافع *" 
                            table="partners" 
                            searchCols="name" 
                            displayCol="name" 
                            initialDisplay={record.partner_name}
                            onSelect={(p: any) => setRecord({...record, partner_id: p.id, partner_name: p.name})} 
                        />
                    </div>

                    {/* --- قسم الخصم (Apple Style) --- */}
                    <div style={{ gridColumn: '1 / -1', background: 'rgba(245, 158, 11, 0.05)', padding: '20px', borderRadius: '20px', border: `1px dashed rgba(245, 158, 11, 0.3)` }}>
                        <h4 style={{ color: '#d97706', margin: '0 0 15px 0', fontSize: '14px', fontWeight: 900 }}>🎁 خصم مسموح به (اختياري)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 900, color: '#d97706', display: 'block', marginBottom: '6px' }}>مبلغ الخصم</label>
                                <input type="number" step="0.01" tabIndex={7} placeholder="0.00" value={record.discount_amount ?? ''} onChange={e => setRecord({...record, discount_amount: e.target.value})} className="glass-input" style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'block', marginBottom: '6px' }}>بيان الخصم</label>
                                <input type="text" tabIndex={8} placeholder="مثال: خصم تعجيل دفع..." value={record.discount_notes || ''} onChange={e => setRecord({...record, discount_notes: e.target.value})} className="glass-input" />
                            </div>
                            <div>
                                <SmartCombo 
                                    tabIndex={9} 
                                    label="حساب الخصم" 
                                    table="accounts" 
                                    initialDisplay={record.discount_acc_name}
                                    onSelect={(a: any) => setRecord({...record, discount_acc_id: a.id, discount_acc_name: a.name})} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* --- التوجيه المحاسبي --- */}
                    <div style={{ gridColumn: '1 / -1', background: 'rgba(255, 255, 255, 0.5)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <h4 style={{ color: THEME.primary, margin: '0 0 15px 0', fontSize: '14px', fontWeight: 900 }}>🏦 التوجيه المحاسبي</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <SmartCombo tabIndex={10} label="حساب الصندوق/البنك (مدين)" table="accounts" initialDisplay={record.safe_bank_acc_name} onSelect={(a: any) => setRecord({...record, safe_bank_acc_id: a.id, safe_bank_acc_name: a.name})} />
                            <SmartCombo tabIndex={11} label="حساب العميل (دائن)" table="accounts" initialDisplay={record.partner_acc_name} onSelect={(a: any) => setRecord({...record, partner_acc_id: a.id, partner_acc_name: a.name})} />
                        </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'block', marginBottom: '6px' }}>البيان / الملاحظات العامة</label>
                        <input type="text" tabIndex={12} placeholder="بيان السند توضيحي..." value={record.notes || ''} onChange={e => setRecord({...record, notes: e.target.value})} className="glass-input" />
                    </div>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '15px', marginTop: '10px' }}>
                        <button type="submit" tabIndex={13} className="btn-save" style={{ flex: 2 }}>💾 حفظ وإصدار السند</button>
                        <button type="button" tabIndex={14} onClick={onClose} className="btn-cancel" style={{ flex: 1 }}>❌ إغلاق النافذة</button>
                    </div>
                </form>
            </div>
        </div>
    );
}