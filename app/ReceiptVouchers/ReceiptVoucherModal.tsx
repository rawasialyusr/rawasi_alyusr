"use client";

import React, { useState, useEffect, useRef } from 'react';
import { THEME } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

// =========================================================================
// 🔍 مكون البحث الذكي المطور (يدعم الاختيار المتعدد Multi-Select)
// =========================================================================
const SmartCombo = ({ label, table, onSelect, placeholder, searchCols = 'name,code', displayCol = 'name', filterStatus, tabIndex, multi = false, selectedValues = [] }: any) => {
    const [search, setSearch] = useState<string>(''); 
    const [results, setResults] = useState<any[]>([]);
    const [show, setShow] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
    
    const listRef = useRef<HTMLDivElement>(null);

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
            setSearch(''); 
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
            <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary }}>{label}</label>
            <input 
                type="text" 
                tabIndex={tabIndex}
                placeholder={placeholder || '🔍 ابحث...'}
                value={search} 
                onChange={(e) => { setSearch(e.target.value); setShow(true); }}
                onFocus={() => { setShow(true); loadInitialData(search); }}
                onKeyDown={handleKeyDown} 
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${THEME.border}`, background: '#f8fafc', outline: 'none', marginTop: '5px', fontWeight: 'bold' }}
            />
            {show && results.length > 0 && (
                <>
                    <div onClick={() => setShow(false)} style={{ position: 'fixed', inset: 0, zIndex: 1999 }} />
                    <div ref={listRef} className="cinematic-scroll" style={{ position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, background: 'white', zIndex: 2000, borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', maxHeight: '250px', overflowY: 'auto', padding: '5px', border: `1px solid ${THEME.border}`, direction: 'rtl' }}>
                        {results.map((item: any, index: number) => {
                            const isSelected = multi ? selectedValues.some((v: any) => v.id === item.id) : false;
                            return (
                                <div key={item.id} onClick={() => handleItemAction(item)} 
                                     style={{ 
                                        padding: '12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px',
                                        background: index === highlightedIndex ? '#f0f9ff' : (isSelected ? '#ecfdf5' : 'transparent'),
                                     }}>
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
// 📝 المودال الرئيسي
// =========================================================================
export default function ReceiptVoucherModal({ isOpen, onClose, record, setRecord, onSave }: any) {
    if (!isOpen) return null;

    // 🧠 سحر السحب الآلي المتعدد
    const handleInvoiceSelect = async (inv: any) => {
        const remainingAmount = Number(inv.total_amount) - Number(inv.paid_amount || 0);
        
        // 1. جلب اسم العميل
        const { data: partnerData } = await supabase.from('partners').select('name').eq('id', inv.partner_id).single();
        
        // 2. جلب كل العقارات المربوطة بالفاتورة (بناءً على مصفوفة project_ids)
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
            partner_name: partnerData?.name || '---',
            // 💡 تخزين الكائنات المختارة كاملة للعرض، والـ IDs للحفظ
            selected_projects: projectsData,
            project_ids: projectsData.map(p => p.id), 
            amount: remainingAmount > 0 ? remainingAmount : 0
        });
    };

    // دالة التعامل مع اختيار عقار (إضافة أو حذف من القائمة)
    const handleProjectToggle = (proj: any) => {
        const current = record.selected_projects || [];
        const isExists = current.find((p: any) => p.id === proj.id);
        
        let newList;
        if (isExists) {
            newList = current.filter((p: any) => p.id !== proj.id);
        } else {
            newList = [...current, { id: proj.id, Property: proj.Property }];
        }

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

    const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${THEME.border}`, marginTop: '5px', outline: 'none', fontWeight: 'bold' };

    return (
        <div className="cinematic-scroll" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', zIndex: 9999, backdropFilter: 'blur(5px)', overflowY: 'auto' }}>
            <div style={{ background: 'white', padding: '40px', borderRadius: '24px', width: '950px', margin: '5vh auto', direction: 'rtl', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', position: 'relative', overflow: 'visible' }}>
                <h2 style={{ color: THEME.primary, borderBottom: `3px solid ${THEME.accent}50`, paddingBottom: '15px', margin: '0 0 30px 0', fontWeight: 900 }}>
                    💰 {record.id ? 'تعديل سند قبض' : 'إصدار سند قبض جديد'}
                </h2>
                
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px' }}>
                    
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 900 }}>تاريخ السند *</label>
                        <input type="date" required tabIndex={1} value={record.date || ''} onChange={e => setRecord({...record, date: e.target.value})} style={inputStyle} />
                    </div>
                    
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 900 }}>طريقة الدفع *</label>
                        <select required tabIndex={2} value={record.payment_method || ''} onChange={e => setRecord({...record, payment_method: e.target.value})} style={inputStyle}>
                            <option value="نقدي (كاش)">نقدي (كاش)</option>
                            <option value="تحويل بنكي">تحويل بنكي</option>
                            <option value="شيك">شيك</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '14px', fontWeight: 900, color: THEME.success }}>المبلغ المُحصل (ريال) *</label>
                        <input type="number" required tabIndex={3} step="0.01" value={record.amount ?? ''} onChange={e => setRecord({...record, amount: e.target.value})} style={{...inputStyle, background: '#f0fdf4', color: THEME.success, fontSize: '18px'}} />
                    </div>

                    {/* الفاتورة */}
                    <div style={{ gridColumn: 'span 1' }}>
                        <SmartCombo tabIndex={4} label="رقم الفاتورة" table="invoices" searchCols="invoice_number" displayCol="invoice_number" placeholder={record.invoice_number} onSelect={handleInvoiceSelect} />
                    </div>

                    {/* العقارات (اختيار متعدد بالتشك بوكس) */}
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
                        {/* عرض أسامي العقارات المختارة تحت الخانة بشكل شيك */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                            {(record.selected_projects || []).map((p: any) => (
                                <span key={p.id} style={{ background: '#f1f5f9', fontSize: '10px', padding: '3px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                                    {p.Property}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div style={{ gridColumn: 'span 1' }}>
                        <SmartCombo tabIndex={6} label="العميل الدافع *" table="partners" searchCols="name" displayCol="name" placeholder={record.partner_name} onSelect={(p: any) => setRecord({...record, partner_id: p.id, partner_name: p.name})} />
                    </div>

                    {/* التوجيه المحاسبي */}
                    <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '25px', borderRadius: '16px', border: '2px dashed #cbd5e1' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                            <SmartCombo tabIndex={7} label="حساب الصندوق (مدين)" table="accounts" placeholder={record.safe_bank_acc_name} onSelect={(a: any) => setRecord({...record, safe_bank_acc_id: a.id, safe_bank_acc_name: a.name})} />
                            <SmartCombo tabIndex={8} label="حساب العميل (دائن)" table="accounts" placeholder={record.partner_acc_name} onSelect={(a: any) => setRecord({...record, partner_acc_id: a.id, partner_acc_name: a.name})} />
                        </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '13px', fontWeight: 900 }}>البيان / الملاحظات</label>
                        <input type="text" tabIndex={9} placeholder="بيان توضيحي..." value={record.notes || ''} onChange={e => setRecord({...record, notes: e.target.value})} style={inputStyle} />
                    </div>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '15px', marginTop: '20px' }}>
                        <button type="submit" tabIndex={10} style={{ flex: 2, padding: '18px', borderRadius: '12px', background: THEME.success, color: 'white', border: 'none', fontWeight: 900, fontSize: '18px' }}>💾 حفظ السند</button>
                        <button type="button" tabIndex={11} onClick={onClose} style={{ flex: 1, padding: '18px', borderRadius: '12px', background: '#f1f5f9', color: THEME.ruby, border: 'none', fontWeight: 900 }}>❌ إغلاق</button>
                    </div>
                </form>
            </div>
        </div>
    );
}