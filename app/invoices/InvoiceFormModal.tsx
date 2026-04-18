"use client";
import React, { useState, useEffect, useRef } from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';

// --- [مكون البحث الذكي - Smart Autocomplete] ---
const SmartCombo = ({ label, table, onSelect, placeholder, searchCols = 'name,code', displayCol = 'name', multi = false, selectedValues = [] }: any) => {
    const [search, setSearch] = useState<string>(''); 
    const [results, setResults] = useState<any[]>([]);
    const [show, setShow] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
    const listRef = useRef<HTMLDivElement>(null);

    const loadInitialData = async (query = '') => {
        if (!table) return;
        setIsLoading(true);
        let q = supabase.from(table).select('*').limit(15); 
        
        if (table === 'accounts') {
            q = q.eq('is_transactional', true);
        }

        if (query) {
            const orQuery = searchCols.split(',').map((col: string) => `${col}.ilike.%${query}%`).join(',');
            q = q.or(orQuery);
        }
        
        const { data, error } = await q;
        if (!error) setResults((data as any[]) || []);
        setIsLoading(false);
    };

    useEffect(() => {
        const searchLen = search?.length || 0; 
        if (searchLen < 1 && !show) { 
            setResults([]); 
            return; 
        }

        const timer = setTimeout(() => {
            if (show && searchLen > 0) loadInitialData(search);
        }, 200);
        
        return () => clearTimeout(timer);
    }, [search, table, show]);

    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const container = listRef.current;
            const activeElement = container.children[highlightedIndex] as HTMLElement;
            if (activeElement) {
                const elementTop = activeElement.offsetTop;
                const elementBottom = elementTop + activeElement.clientHeight;
                const containerTop = container.scrollTop;
                const containerBottom = containerTop + container.clientHeight;

                if (elementTop < containerTop) {
                    container.scrollTop = elementTop;
                } else if (elementBottom > containerBottom) {
                    container.scrollTop = elementBottom - container.clientHeight;
                }
            }
        }
    }, [highlightedIndex]);

    const handleItemSelect = (item: any, e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e) e.stopPropagation();
        const displayName = item[displayCol] || item.Property || item.project_name || item.item_name || item.name || item.description || 'بدون اسم';
        
        if (multi) {
            onSelect(item);
        } else {
            onSelect(item);
            setSearch(displayName);
            setShow(false);
            setHighlightedIndex(-1);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!show && e.key !== 'Tab') {
            if (e.key === 'ArrowDown') {
                setShow(true);
                loadInitialData(search || '');
            }
            return;
        }

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
                e.preventDefault();
                if (highlightedIndex >= 0 && results[highlightedIndex]) {
                    handleItemSelect(results[highlightedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setShow(false);
                setHighlightedIndex(-1);
                break;
            case 'Tab':
                setShow(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    return (
        <div style={{ position: 'relative', flex: 1 }}>
            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary }}>{label}</label>
            <input 
                type="text" 
                placeholder={placeholder || (isLoading ? '⏳ جاري التحميل...' : '🔍 ابحث هنا...')}
                value={search ?? ''} 
                onChange={(e) => { setSearch(e.target.value); setShow(true); setHighlightedIndex(-1); }}
                onFocus={() => { setShow(true); loadInitialData(search || ''); }}
                onKeyDown={handleKeyDown} 
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.5)', outline: 'none', transition: 'all 0.2s' }}
            />
            {show && results.length > 0 && (
                <>
                    <div onClick={() => { setShow(false); setHighlightedIndex(-1); }} style={{ position: 'fixed', inset: 0, zIndex: 1999 }} />
                    <div ref={listRef} className="cinematic-scroll" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', zIndex: 2000, borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', maxHeight: '200px', overflowY: 'auto', padding: '5px', border: '1px solid #eee' }}>
                        {results.map((item: any, index: number) => {
                            const displayName = item[displayCol] || item.Property || item.project_name || item.item_name || item.name || item.description || 'بدون اسم';
                            const displayCode = item.project_code || item.item_code || item.code; 
                            
                            const isSelected = multi ? selectedValues.some((v: any) => v.id === item.id) : false;
                            const isHighlighted = index === highlightedIndex; 

                            return (
                                <div key={item.id} 
                                     onClick={(e) => handleItemSelect(item, e)} 
                                     style={{ 
                                         padding: '12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', 
                                         fontSize: '13px', transition: 'all 0.1s', display: 'flex', alignItems: 'center', gap: '10px',
                                         background: isSelected ? '#f0fdf4' : (isHighlighted ? '#f1f5f9' : 'transparent'),
                                         borderLeft: isHighlighted ? `4px solid ${THEME.primary}` : '4px solid transparent'
                                     }}>
                                    
                                    {multi && (
                                        <input 
                                            type="checkbox" 
                                            checked={isSelected} 
                                            readOnly 
                                            style={{ width: '18px', height: '18px', accentColor: THEME.success, cursor: 'pointer' }}
                                        />
                                    )}

                                    <div>
                                        <span style={{ fontWeight: 'bold', color: THEME.primary }}>{displayCode ? `[${displayCode}] ` : ''}</span> 
                                        {displayName}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};


// --- [المودال الرئيسي] ---
export default function InvoiceFormModal({ isOpen, onClose, record, setRecord, onSave, isSaving }: any) {
    if (!isOpen || !record) return null;

    // 🚀 1. إعطاء القيم الافتراضية لأول مرة فقط (عشان الزرار ميعلقش)
    useEffect(() => {
        if (record && !record.invoice_number) {
            setRecord((prev: any) => ({
                ...prev,
                invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
                date: prev.date || new Date().toISOString(),
                tax_acc_id: prev.tax_acc_id || '990c949c-5f32-40d7-8d36-5fe45a6c892c', 
                materials_acc_id: prev.materials_acc_id || '85e61a6a-8c85-4219-a733-3b2180dfe043',
                guarantee_acc_id: prev.guarantee_acc_id || '8bf39cb1-4028-4c9e-817d-27c239873030'
            }));
        }
    }, [record?.id]); 

    // 🚀 2. الحسابات الفورية (تشتغل بس لما الأرقام أو زرار الضريبة يتغير)
    useEffect(() => {
        if (!record) return; 
        const qty = Number(record.quantity || 0);
        const price = Number(record.unit_price || 0);
        const lineTotal = qty * price;
        
        const materialsDiscount = Number(record.materials_discount || 0);
        const taxableAmount = lineTotal - materialsDiscount;
        const guaranteePercent = Number(record.guarantee_percent || 0);
        const guaranteeAmount = (taxableAmount * guaranteePercent) / 100;
        
        // 🔥 سحر التفعيل والإيقاف: لو skip_zatca شغالة يبقى الضريبة 0 كأنها مش موجودة نهائي
        const taxAmount = record.skip_zatca ? 0 : (taxableAmount * 0.15); 
        const finalTotal = taxableAmount + taxAmount - guaranteeAmount;

        const days = Number(record.due_in_days || 0);
        const invoiceDate = record.date ? new Date(record.date) : new Date();
        const dueDateCalculated = new Date(invoiceDate);
        dueDateCalculated.setDate(dueDateCalculated.getDate() + days);

        // التحديث يحصل فقط لو في تغيير فعلي (لمنع التعليق)
        if (
            record.line_total !== lineTotal ||
            record.taxable_amount !== taxableAmount ||
            record.guarantee_amount !== guaranteeAmount ||
            record.tax_amount !== taxAmount ||
            record.total_amount !== finalTotal ||
            record.due_date !== dueDateCalculated.toISOString()
        ) {
            setRecord((prev: any) => ({
                ...prev,
                line_total: lineTotal,
                taxable_amount: taxableAmount,
                guarantee_amount: guaranteeAmount,
                tax_amount: taxAmount,
                total_amount: finalTotal,
                due_date: dueDateCalculated.toISOString()
            }));
        }
    }, [record?.quantity, record?.unit_price, record?.materials_discount, record?.guarantee_percent, record?.date, record?.due_in_days, record?.skip_zatca]); 

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
            
            <style>{`
                .cinematic-scroll::-webkit-scrollbar { width: 6px; }
                .cinematic-scroll::-webkit-scrollbar-track { background: transparent; }
                .cinematic-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .cinematic-scroll::-webkit-scrollbar-thumb:hover { background: ${THEME.primary}40; }
            `}</style>

            <div className="cinematic-scroll" style={{ 
                width: '900px', maxHeight: '90vh', background: 'rgba(255, 255, 255, 0.85)', 
                backdropFilter: 'blur(20px)', borderRadius: '25px', padding: '35px', 
                boxShadow: '0 25px 50px rgba(0,0,0,0.2)', overflowY: 'auto', direction: 'rtl',
                border: '1px solid rgba(255,255,255,0.3)'
            }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: `2px solid ${THEME.accent}`, paddingBottom: '10px' }}>
                    <h2 style={{ color: THEME.primary, fontWeight: 900, margin: 0 }}>
                        📑 إنشاء / تعديل فاتورة ذكية
                    </h2>

                    {/* 🚀 زرار الـ Turn ON / Turn OFF الجديد */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: record?.skip_zatca ? '#fee2e2' : '#dcfce3', padding: '8px 15px', borderRadius: '12px', cursor: 'pointer', transition: '0.3s' }} 
                         onClick={() => setRecord({ ...record, skip_zatca: !record.skip_zatca })}>
                        
                        <div style={{ width: '36px', height: '20px', background: record?.skip_zatca ? '#cbd5e1' : THEME.success, borderRadius: '20px', position: 'relative', transition: '0.3s' }}>
                            <div style={{ width: '16px', height: '16px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: record?.skip_zatca ? '2px' : '18px', transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                        </div>
                        
                        <span style={{ fontSize: '12px', fontWeight: 900, color: record?.skip_zatca ? '#64748b' : THEME.success }}>
                            {record?.skip_zatca ? '❌ الضريبة: معطلة (إيقاف الدالة)' : '✅ الضريبة: مفعلة (15%)'}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                    
                    <div className="field">
                        <label style={{ fontSize: '12px', fontWeight: 900 }}>تاريخ الفاتورة</label>
                        <input type="date" value={record.date?.split('T')[0] ?? ''} onChange={(e) => setRecord({...record, date: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${THEME.border}` }} />
                    </div>
                    <div className="field">
                        <label style={{ fontSize: '12px', fontWeight: 900 }}>رقم الفاتورة</label>
                        <input type="text" value={record.invoice_number ?? ''} readOnly style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#e2e8f0', border: `1px solid ${THEME.border}`, fontWeight: 'bold', color: THEME.primary }} />
                    </div>

                    <div className="field">
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary }}>📅 فترة السداد (بالأيام)</label>
                        <input 
                            type="number" 
                            placeholder="مثلاً: 30" 
                            value={record.due_in_days ?? ''} 
                            onChange={(e) => setRecord({...record, due_in_days: e.target.value})} 
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `2px solid ${THEME.accent}50`, fontWeight: 'bold', outline: 'none' }} 
                        />
                        {record.due_date && (
                            <div style={{ fontSize: '10px', marginTop: '6px', color: '#64748b', fontWeight: 'bold' }}>
                                تاريخ الاستحقاق: {new Date(record.due_date).toLocaleDateString('ar-EG')}
                            </div>
                        )}
                    </div>

                    <SmartCombo 
                        label="العميل (البارتنر)" 
                        table="partners" 
                        searchCols="name,code" displayCol="name"
                        onSelect={(p: any) => setRecord({...record, partner_id: p.id, client_name: p.name})} 
                        placeholder={record.client_name ? record.client_name : undefined} 
                    />
                    
                    <div style={{ gridColumn: 'span 1' }}>
                        <SmartCombo 
                            label="العقار / العماير (متعدد)" 
                            table="projects" 
                            searchCols="Property,project_name,project_code" 
                            displayCol="Property" 
                            multi={true} 
                            selectedValues={record.selected_projects || []} 
                            onSelect={(p: any) => {
                                let current = record.selected_projects || [];
                                if (current.some((c: any) => c.id === p.id)) {
                                    current = current.filter((c: any) => c.id !== p.id);
                                } else {
                                    current = [...current, p];
                                }
                                
                                const updateData = { 
                                    ...record, 
                                    selected_projects: current, 
                                    project_ids: current.map((c: any) => c.id) 
                                };
                                
                                if (p.client_id && !record.partner_id) {
                                    updateData.partner_id = p.client_id;
                                    updateData.client_name = p.client_name;
                                }
                                setRecord(updateData);
                            }} 
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                            {(record.selected_projects || []).map((proj: any) => (
                                <div key={proj.id} style={{ background: '#f0f9ff', border: `1px solid ${THEME.primary}40`, color: THEME.primary, padding: '5px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {proj.Property || proj.project_name}
                                    <span style={{ cursor: 'pointer', color: THEME.ruby }} onClick={() => {
                                        const newSelected = record.selected_projects.filter((c:any) => c.id !== proj.id);
                                        setRecord({...record, selected_projects: newSelected, project_ids: newSelected.map((c:any)=>c.id)});
                                    }}>✖</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <SmartCombo 
                        label="البند (BOQ)" 
                        table="boq_items" 
                        searchCols="item_name,item_code" 
                        displayCol="item_name" 
                        onSelect={(b: any) => setRecord({
                            ...record, 
                            boq_id: b.id, 
                            description: b.item_name, 
                            unit: b.unit_of_measure || record.unit, 
                            unit_price: b.price || record.unit_price 
                        })} 
                    />

                    <div style={{ gridColumn: 'span 3' }}>
                        <label style={{ fontSize: '12px', fontWeight: 900 }}>البيان التفصيلي</label>
                        <textarea value={record.description ?? ''} onChange={(e) => setRecord({...record, description: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${THEME.border}`, height: '60px' }} />
                    </div>

                    <div className="field">
                        <label style={{ fontSize: '12px', fontWeight: 900 }}>العدد / الكمية</label>
                        <input type="number" value={record.quantity ?? ''} onChange={(e) => setRecord({...record, quantity: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${THEME.border}` }} />
                    </div>
                    <div className="field">
                        <label style={{ fontSize: '12px', fontWeight: 900 }}>الوحدة</label>
                        <select value={record.unit ?? 'عدد'} onChange={(e) => setRecord({...record, unit: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${THEME.border}` }}>
                            {record.unit && !['متر طولي', 'متر مربع', 'متر مكعب', 'مقطوعية', 'عدد'].includes(record.unit) && (
                                <option value={record.unit}>{record.unit}</option>
                            )}
                            <option value="متر طولي">متر طولي</option>
                            <option value="متر مربع">متر مربع</option>
                            <option value="متر مكعب">متر مكعب</option>
                            <option value="مقطوعية">مقطوعية</option>
                            <option value="عدد">عدد</option>
                        </select>
                    </div>
                    <div className="field">
                        <label style={{ fontSize: '12px', fontWeight: 900 }}>سعر الوحدة</label>
                        <input type="number" value={record.unit_price ?? ''} onChange={(e) => setRecord({...record, unit_price: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${THEME.border}` }} />
                    </div>

                    <SmartCombo 
                        label="حساب المدين (من حـ/)" 
                        table="accounts" 
                        searchCols="name,code" displayCol="name"
                        onSelect={(a: any) => setRecord({...record, debit_account_id: a.id})} 
                    />
                    <SmartCombo 
                        label="حساب الدائن (إلى حـ/)" 
                        table="accounts" 
                        searchCols="name,code" displayCol="name"
                        onSelect={(a: any) => setRecord({...record, credit_account_id: a.id})} 
                    />
                    
                    <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '15px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px' }}>الإجمالي قبل الخصم</div>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: THEME.primary }}>{formatCurrency(record.line_total ?? 0)}</div>
                    </div>

                    <div className="field">
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.ruby }}>خصم خامات العميل (-)</label>
                        <input type="number" value={record.materials_discount ?? ''} onChange={(e) => setRecord({...record, materials_discount: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `2px solid ${THEME.ruby}30` }} />
                    </div>
                    
                    <div style={{ gridColumn: 'span 2' }}>
                        {Number(record.materials_discount) > 0 && (
                            <SmartCombo 
                                label="ترحل الخامات إلى حساب:" 
                                table="accounts" 
                                searchCols="name,code" displayCol="name"
                                placeholder={record.materials_acc_id === '85e61a6a-8c85-4219-a733-3b2180dfe043' ? '[217] مخزون خامات العميل (افتراضي)' : '🔍 اختر حساب...'}
                                onSelect={(a: any) => setRecord({...record, materials_acc_id: a.id})} 
                            />
                        )}
                    </div>

                    <div className="field">
                        <label style={{ fontSize: '12px', fontWeight: 900 }}>نسبة ضمان الأعمال %</label>
                        <input type="number" value={record.guarantee_percent ?? ''} onChange={(e) => setRecord({...record, guarantee_percent: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${THEME.border}` }} />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        {Number(record.guarantee_percent) > 0 && (
                            <SmartCombo 
                                label="ترحل استقطاعات الضمان إلى حساب:" 
                                table="accounts" 
                                searchCols="name,code" displayCol="name"
                                placeholder={record.guarantee_acc_id === '8bf39cb1-4028-4c9e-817d-27c239873030' ? '[124] تأمينات محتجزة لدى الغير (افتراضي)' : '🔍 اختر حساب...'}
                                onSelect={(a: any) => setRecord({...record, guarantee_acc_id: a.id})} 
                            />
                        )}
                    </div>

                </div>

                <div style={{ marginTop: '30px', padding: '20px', background: THEME.primary, borderRadius: '20px', color: 'white', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', textAlign: 'center' }}>
                    <div>
                        <div style={{ fontSize: '11px', opacity: 0.8 }}>خاضع للضريبة</div>
                        <div style={{ fontSize: '18px', fontWeight: 900 }}>{formatCurrency(record.taxable_amount ?? 0)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', opacity: 0.8 }}>مبلغ الضريبة (15%)</div>
                        <div style={{ fontSize: '18px', fontWeight: 900 }}>{formatCurrency(record.tax_amount ?? 0)}</div>
                        <div style={{ fontSize: '9px', opacity: 0.6, marginTop: '2px' }}>{record.skip_zatca ? 'الدالة معطلة (0)' : 'ترحل آلياً لحساب [215]'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', opacity: 0.8 }}>محتجز ضمان أعمال</div>
                        <div style={{ fontSize: '18px', fontWeight: 900 }}>{formatCurrency(record.guarantee_amount ?? 0)}</div>
                        <div style={{ fontSize: '9px', opacity: 0.6, marginTop: '2px' }}>ترحل آلياً لحساب [124]</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '15px', padding: '5px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 900 }}>الصافي النهائي</div>
                        <div style={{ fontSize: '22px', fontWeight: 900, color: THEME.accent }}>{formatCurrency(record.total_amount ?? 0)}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '30px', position: 'sticky', bottom: '-20px', background: 'white', padding: '10px 0' }}>
                    <button onClick={() => onSave(record)} disabled={isSaving} style={{ flex: 2, padding: '16px', borderRadius: '15px', background: THEME.success, color: 'white', border: 'none', fontWeight: 900, cursor: 'pointer', fontSize: '18px' }}>
                        {isSaving ? '⏳ جاري الحفظ والترحيل...' : '✅ حفظ الفاتورة وترحيل القيود'}
                    </button>
                    <button onClick={onClose} style={{ flex: 1, padding: '16px', borderRadius: '15px', background: '#e2e8f0', color: THEME.primary, border: 'none', fontWeight: 900, cursor: 'pointer' }}>
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
}