"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/lib/theme';
import { useAuth } from '@/components/authGuard'; // 🛡️ استدعاء هوك الصلاحيات

interface SmartComboProps {
    label?: string;
    table?: string;          // للبحث في الداتابيز
    options?: any[];         // للبحث في مصفوفة محلية (بدون داتابيز)
    onSelect: (item: any) => void;
    placeholder?: string;
    searchCols?: string;     // الأعمدة اللي هيبحث فيها (مثال: 'name,code')
    displayCol?: string;     // العمود اللي هيتعرض (مثال: 'name')
    multi?: boolean;         // الاختيار المتعدد
    selectedValues?: any[];  // القيم المختارة مسبقاً (للمتعدد)
    initialDisplay?: string; // القيمة اللي هتظهر أول ما يفتح
    customQuery?: (queryBuilder: any) => any; // فلترة متقدمة
    icon?: string;           // أيقونة للعنوان
    
    // 💡 خصائص إضافية مدمجة
    strict?: boolean;        // إجبار المستخدم على اختيار عنصر موجود بالقائمة فقط
    isTextArea?: boolean;    // تحويل المربع إلى Textarea
    disabled?: boolean;      // تعطيل الحقل
    freeText?: boolean;      // السماح بكتابة نصوص حرة مع الاحتفاظ بالاقتراحات
    
    // 🚀 مميزات الـ Enterprise الجديدة
    allowAddNew?: boolean;         // إظهار زرار "إضافة جديد" في حالة عدم وجود نتائج
    requiredPermission?: { module: string, action: string }; // 🛡️ الصلاحية المطلوبة لظهور زر الإضافة
    onAddNew?: (val: string) => void; // الدالة اللي هتتنفذ لما يدوس "إضافة جديد"
    isSensitive?: boolean;         // تشفير/إخفاء البيانات الحساسة جزئياً
    showRecent?: boolean;          // إظهار آخر عمليات البحث أو الاختيارات
    enableClear?: boolean;         // تفعيل زرار مسح النص السريع (✖)
    showAvatar?: boolean;          // إظهار الصورة الشخصية (لو كان يوزر أو عميل)
    isMobileBottomSheet?: boolean; // تحويل القائمة لمودال سفلي في الجوال
}

export default function SmartCombo({ 
    label, table, options, onSelect, placeholder, 
    searchCols = 'name,code', displayCol = 'name', 
    multi = false, selectedValues = [], initialDisplay = '',
    customQuery, icon,
    strict = false, isTextArea = false, disabled = false, freeText = false,
    allowAddNew = false, requiredPermission, onAddNew, isSensitive = false, showRecent = false, 
    enableClear = false, showAvatar = false, isMobileBottomSheet = false
}: SmartComboProps) {
    
    const [search, setSearch] = useState<string>(initialDisplay || ''); 
    const [results, setResults] = useState<any[]>([]);
    const [recentItems, setRecentItems] = useState<any[]>([]); // للـ History
    const [show, setShow] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false); // كشف الجوال
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
    const listRef = useRef<HTMLDivElement>(null);

    // 🛡️ [مقص الصلاحيات]: حماية ذكية في حالة عدم وجود الـ AuthGuard
    let can = (module: string, action: string) => true; // القيمة الافتراضية
    try {
        const auth = useAuth();
        // 🚀 التأكد من أن الهوك أعاد كائناً يحتوي على الدالة can
        if (auth && typeof auth.can === 'function') {
            can = auth.can;
        }
    } catch (e) {
        // لو الهوك مش موجود، هيتجاهل الخطأ ويكمل عادي عشان ميوقفش السيستم
    }

    // فحص هل المستخدم يمتلك صلاحية الإضافة؟
    const hasAddPermission = requiredPermission ? can(requiredPermission.module, requiredPermission.action) : true;

    // 🚀 [رفع الحساسية]: دالة لتوحيد الحروف العربية وتجاهل المسافات الزائدة
    const normalizeText = (text: any) => {
        return String(text || '')
            .toLowerCase()
            .replace(/[أإآ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/\s+/g, ' ')
            .trim();
    };

    // 🕵️‍♂️ [الخصوصية]: دالة تشفير البيانات الحساسة
    const applyMask = (text: string) => {
        if (!isSensitive || !text) return text;
        if (text.length <= 4) return '***';
        const first2 = text.slice(0, 2);
        const last2 = text.slice(-2);
        return `${first2}****${last2}`;
    };

    // 📱 كشف الشاشة للمودال السفلي
    useEffect(() => {
        if (isMobileBottomSheet) {
            const checkMobile = () => setIsMobile(window.innerWidth <= 768);
            checkMobile();
            window.addEventListener('resize', checkMobile);
            return () => window.removeEventListener('resize', checkMobile);
        }
    }, [isMobileBottomSheet]);

    // 👥 جلب آخر الاختيارات من LocalStorage
    useEffect(() => {
        if (showRecent) {
            const key = `smartcombo_recent_${table || label || 'global'}`;
            const saved = localStorage.getItem(key);
            if (saved) setRecentItems(JSON.parse(saved));
        }
    }, [showRecent, table, label]);

    // 🔄 حفظ الاختيار في History
    const saveToRecent = (item: any) => {
        if (!showRecent) return;
        const key = `smartcombo_recent_${table || label || 'global'}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const updated = [item, ...existing.filter((i:any) => i.id !== item.id)].slice(0, 5);
        localStorage.setItem(key, JSON.stringify(updated));
        setRecentItems(updated);
    };

    // 🔄 تحديث القيمة الافتراضية
    useEffect(() => {
        if (initialDisplay !== undefined) setSearch(initialDisplay);
        else if (!multi && !freeText) setSearch('');
    }, [initialDisplay, multi, freeText]);

    // 📡 دالة البحث الذكية (محلية + داتابيز)
    const loadData = async (query = '') => {
        setIsLoading(true);
        try {
            // 1️⃣ البحث في المصفوفة المحلية (High Sensitivity)
            if (options && options.length > 0) {
                const normQuery = normalizeText(query);
                const filtered = options.filter((o: any) => {
                    const textToSearch = typeof o === 'object' ? (o[displayCol] || o.item_name || o.Property || o.name || o.description || '') : o;
                    return normalizeText(textToSearch).includes(normQuery);
                }).slice(0, 20); 
                setResults(filtered);
                return;
            }

            // 2️⃣ البحث في السوبابيس (Supabase)
            if (!table) return;
            let q = supabase.from(table).select('*').limit(20); 
            
            if (table === 'accounts') q = q.eq('is_transactional', true);
            if (customQuery) q = customQuery(q);

            if (query) {
                const orQuery = searchCols.split(',').map((col: string) => `${col}.ilike.%${query}%`).join(',');
                q = q.or(orQuery);
            }
            
            const { data, error } = await q;
            if (!error) setResults(data || []);
        } catch (error) {
            console.error("SmartCombo Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // ⏱️ [رفع الحساسية]: تقليل الـ Debounce لـ 150ms لاستجابة شبه فورية
    useEffect(() => {
        const searchLen = search?.length || 0; 
        if (searchLen < 1 && !show) { setResults([]); return; }
        
        const timer = setTimeout(() => {
            if (show) loadData(search);
        }, 150); 
        
        return () => clearTimeout(timer);
    }, [search, table, options, show]); // eslint-disable-line react-hooks/exhaustive-deps

    // 🖱️ تتبع الكيبورد لعمل Scroll أوتوماتيك
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const container = listRef.current;
            const activeElement = container.children[highlightedIndex] as HTMLElement;
            if (activeElement) {
                const elementTop = activeElement.offsetTop;
                const elementBottom = elementTop + activeElement.clientHeight;
                const containerTop = container.scrollTop;
                const containerBottom = containerTop + container.clientHeight;

                if (elementTop < containerTop) container.scrollTop = elementTop;
                else if (elementBottom > containerBottom) container.scrollTop = elementBottom - container.clientHeight;
            }
        }
    }, [highlightedIndex]);

    const handleItemSelect = (item: any, e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e) e.stopPropagation();
        const isPrimitive = typeof item !== 'object';
        const displayName = isPrimitive ? item : (item[displayCol] || item.Property || item.project_name || item.item_name || item.name || item.description || 'بدون اسم');
        
        saveToRecent(item); // 💾 حفظ في الـ Recent
        
        if (multi) {
            onSelect(item);
        } else {
            onSelect(item);
            setSearch(isSensitive ? applyMask(displayName) : displayName);
            setShow(false);
            setHighlightedIndex(-1);
        }
    };

    // 🚨 وضع الحماية (Strict Mode): يمسح الحقل لو الكلمة مش في القائمة
    const handleBlur = () => {
        if (strict && search && !multi && !freeText) {
            const match = results.find(item => {
                const isPrimitive = typeof item !== 'object';
                const lbl = isPrimitive ? item : (item[displayCol] || item.Property || item.name || item.description);
                return normalizeText(lbl) === normalizeText(search);
            });
            if (!match) {
                setSearch('');
                onSelect('');
            }
        }
        setTimeout(() => setShow(false), 200); 
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!show && e.key !== 'Tab') {
            if (e.key === 'ArrowDown') { setShow(true); loadData(search || ''); }
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
                } else if (freeText) {
                    setShow(false);
                } else if (allowAddNew && results.length === 0 && search.length > 0 && onAddNew && hasAddPermission) {
                    // 🛡️ مقص الصلاحيات شغال حتى مع ضغطة الانتر!
                    onAddNew(search);
                    setShow(false);
                }
                break;
            case 'Escape':
            case 'Tab':
                setShow(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSearch('');
        onSelect(null);
        setShow(true);
        loadData('');
    };

    const InputElement = isTextArea ? 'textarea' : 'input';

    // 🎨 ستايل القائمة المنسدلة (عادي أو Bottom Sheet للموبايل)
    const dropdownStyle: React.CSSProperties = (isMobile && isMobileBottomSheet) 
        ? { position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99999, background: '#fff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '20px 15px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 -15px 40px rgba(0,0,0,0.15)', animation: 'slideUp 0.3s ease-out' }
        : { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 2000, maxHeight: '250px', overflowY: 'auto', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)', borderRadius: '16px', padding: '8px', boxShadow: '0 15px 40px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.05)', marginTop: '5px' };

    // 📝 المكون المساعد لرسم عناصر القائمة (Results أو Recent)
    const renderListItem = (item: any, index: number, isRecent = false) => {
        const isPrimitive = typeof item !== 'object';
        const displayName = isPrimitive ? item : (item[displayCol] || item.Property || item.project_name || item.item_name || item.name || item.description || 'بدون اسم');
        const displayCode = isPrimitive ? '' : (item.project_code || item.item_code || item.code); 
        const itemId = isPrimitive ? item : item.id;
        
        const isSelected = multi ? selectedValues.some((v: any) => (v.id || v) === itemId) : false;
        const isHighlighted = index === highlightedIndex && !isRecent; 

        return (
            <div key={`${isRecent ? 'recent' : 'res'}_${isPrimitive ? index : item.id}`} 
                 onClick={(e) => handleItemSelect(item, e)} 
                 className={`smart-drop-item ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}>
                
                {multi && (
                    <input type="checkbox" checked={isSelected} readOnly style={{ width: '18px', height: '18px', accentColor: THEME.success, cursor: 'pointer', flexShrink: 0 }} />
                )}

                {showAvatar && !isPrimitive && (
                    <img src={item.avatar_url || `https://ui-avatars.com/api/?name=${displayName}&background=random`} alt="avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, border: '1px solid #e2e8f0' }} />
                )}

                <div style={{ wordBreak: 'break-word', flex: 1 }}>
                    <span style={{ fontWeight: 900, color: THEME.primary, opacity: 0.7, fontSize: '11px', marginLeft: displayCode ? '5px' : '0' }}>
                        {displayCode ? `[${isSensitive ? applyMask(displayCode) : displayCode}] ` : ''}
                    </span> 
                    {isSensitive ? applyMask(displayName) : displayName}
                </div>
                
                {isRecent && <span style={{ fontSize: '10px', color: '#94a3b8' }}>🕒</span>}
            </div>
        );
    };

    return (
        <div style={{ position: 'relative', flex: 1, width: '100%' }}>
            <style>{`
                .smart-combo-input {
                    width: 100%; padding: 14px 15px; border-radius: 14px;
                    background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px);
                    border: 1.5px solid rgba(255, 255, 255, 0.8); outline: none;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    font-weight: 800; color: #1e293b; font-size: 14px;
                    font-family: inherit; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
                }
                .smart-combo-input:focus {
                    background: #ffffff; border-color: ${THEME.accent};
                    box-shadow: 0 0 0 4px ${THEME.accent}20;
                }
                .smart-combo-input::placeholder { color: #94a3b8; font-weight: 600; }
                .smart-combo-input.disabled { background: rgba(0,0,0,0.05); cursor: not-allowed; color: #64748b; border-color: transparent; }
                
                .smart-drop-item {
                    padding: 12px; cursor: pointer; border-radius: 12px; font-size: 13px;
                    transition: all 0.1s; display: flex; align-items: center; gap: 10px; color: #334155;
                }
                .smart-drop-item:hover { background: #f8fafc; }
                .smart-drop-item.highlighted { background: #f1f5f9; border-right: 4px solid ${THEME.primary}; color: ${THEME.primary}; font-weight: 800; }
                .smart-drop-item.selected { background: ${THEME.success}10; border-right: 4px solid ${THEME.success}; color: ${THEME.success}; font-weight: 800; }
                
                .cinematic-scroll::-webkit-scrollbar { width: 6px; }
                .cinematic-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .cinematic-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>

            {label && (
                <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                    {icon && <span>{icon}</span>}
                    {label}
                </label>
            )}
            
            <div style={{ position: 'relative', display: 'flex', alignItems: isTextArea ? 'flex-start' : 'center' }}>
                <InputElement 
                    disabled={disabled}
                    placeholder={placeholder || (isLoading ? '⏳ جاري البحث...' : '🔍 ابحث هنا...')}
                    value={search ?? ''} 
                    onChange={(e: any) => { 
                        setSearch(e.target.value); 
                        setShow(true); 
                        setHighlightedIndex(-1); 
                        if(freeText) onSelect(e.target.value);
                    }}
                    onFocus={() => { if (!disabled) { setShow(true); loadData(search || ''); } }}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown} 
                    className={`smart-combo-input ${disabled ? 'disabled' : ''}`}
                    style={{ 
                        resize: isTextArea ? 'vertical' : 'none', 
                        minHeight: isTextArea ? '90px' : 'auto',
                        paddingLeft: (!isTextArea && !disabled) ? (enableClear && search ? '60px' : '35px') : '15px'
                    }}
                />
                
                {/* ✖ زرار المسح السريع */}
                {enableClear && search && !disabled && (
                    <span 
                        onClick={handleClear} 
                        style={{ position: 'absolute', left: '35px', top: isTextArea ? '15px' : '50%', transform: isTextArea ? 'none' : 'translateY(-50%)', fontSize: '14px', color: '#ef4444', cursor: 'pointer', padding: '5px', fontWeight: 900, background: '#fee2e2', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="مسح"
                    >
                        ×
                    </span>
                )}

                {/* ▼ سهم فتح القائمة */}
                {!isTextArea && !disabled && (
                    <span 
                        onClick={() => { if(!disabled) { setShow(!show); if(!show) loadData(search || ''); } }} 
                        style={{ position: 'absolute', left: '15px', fontSize: '10px', color: '#64748b', cursor: 'pointer', padding: '5px', transition: '0.2s', transform: show ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                        ▼
                    </span>
                )}
                
                {/* ⏳ مؤشر التحميل */}
                {isLoading && <div style={{ position: 'absolute', left: enableClear && search ? '65px' : '35px', top: isTextArea ? '20px' : '50%', transform: isTextArea ? 'none' : 'translateY(-50%)', fontSize: '12px' }}>⏳</div>}
            </div>

            {/* القائمة المنسدلة / المودال السفلي */}
            {show && !disabled && (
                <>
                    {/* طبقة الإغلاق والخلفية الداكنة للموبايل */}
                    <div onClick={() => setShow(false)} style={{ position: 'fixed', inset: 0, zIndex: 1999, background: (isMobile && isMobileBottomSheet) ? 'rgba(0,0,0,0.5)' : 'transparent', backdropFilter: (isMobile && isMobileBottomSheet) ? 'blur(5px)' : 'none' }} />
                    
                    <div ref={listRef} className="cinematic-scroll" style={dropdownStyle}>
                        
                        {/* مقبض سحب المودال في الموبايل */}
                        {isMobile && isMobileBottomSheet && (
                            <div style={{ width: '40px', height: '5px', background: '#cbd5e1', borderRadius: '10px', margin: '0 auto 15px auto' }} />
                        )}

                        {/* حالة: لا توجد نتائج + تفعيل زر الإضافة */}
                        {results.length === 0 && search.length > 0 && !isLoading && (
                            <div style={{ padding: '15px', textAlign: 'center' }}>
                                <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 800, margin: '0 0 10px 0' }}>❌ لا توجد نتائج لـ "<span style={{color: THEME.ruby}}>{search}</span>"</p>
                                {/* 🛡️ زرار الإضافة هيظهر فقط لو اليوزر عنده صلاحية الإنشاء */}
                                {allowAddNew && onAddNew && hasAddPermission && (
                                    <button 
                                        onMouseDown={(e) => { e.preventDefault(); onAddNew(search); setShow(false); }} // استخدمنا onMouseDown بدل onClick عشان ما يهربش من الـ Blur
                                        style={{ background: THEME.success, color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '13px', boxShadow: `0 5px 15px ${THEME.success}40`, width: '100%' }}
                                    >
                                        ➕ إضافة "{search}" كجديد
                                    </button>
                                )}
                            </div>
                        )}

                        {/* حالة: عرض الـ History (الخيارات الأخيرة) */}
                        {results.length === 0 && search.length === 0 && showRecent && recentItems.length > 0 && !isLoading && (
                            <div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 900, marginBottom: '8px', padding: '0 10px' }}>⏱️ آخر الاختيارات</div>
                                {recentItems.map((item, index) => renderListItem(item, index, true))}
                                <div style={{ height: '1px', background: '#f1f5f9', margin: '10px 0' }} />
                            </div>
                        )}

                        {/* عرض النتائج الأساسية */}
                        {results.length > 0 && results.map((item, index) => renderListItem(item, index, false))}
                    </div>
                </>
            )}
        </div>
    );
}