"use client";
import React, { useState, useMemo, useEffect, useRef } from 'react';
import MasterPage from '@/components/MasterPage';
import { useSubClaimsLogic } from './sub_claims_logic';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import RawasiSmartTable from '@/components/rawasismarttable';
import AssignWorkModal from './AssignWorkModal'; 
import ClaimFormModal from './ClaimFormModal'; 
import PrintClaimModal from './PrintClaimModal'; 
import RawasiSidebarManager from '@/components/RawasiSidebarManager'; 
import PaymentVoucherModal from '../PaymentVouchers/PaymentVoucherModal';

// 🚀 قائمة منسدلة ذكية للفلاتر المتعددة
const FilterDropdown = ({ title, options, selectedOptions, setSelectedOptions }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: any) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const toggleOption = (opt: string) => {
        if (selectedOptions.includes(opt)) {
            setSelectedOptions(selectedOptions.filter((o: string) => o !== opt));
        } else {
            setSelectedOptions([...selectedOptions, opt]);
        }
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', minWidth: '220px' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '14px', padding: '10px 15px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '13px', color: selectedOptions.length > 0 ? THEME.primary : '#64748b' }}
            >
                <span>{title} {selectedOptions.length > 0 ? `(${selectedOptions.length})` : ''}</span>
                <span style={{ fontSize: '10px', transition: '0.3s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
            </div>
            
            {isOpen && (
                <div style={{ position: 'absolute', top: '110%', right: 0, width: '100%', background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '250px', overflowY: 'auto', padding: '10px' }}>
                    {options.length === 0 ? <div style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>لا يوجد بيانات</div> : null}
                    {options.map((opt: string, idx: number) => (
                        <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', cursor: 'pointer', borderRadius: '8px', transition: '0.2s' }} className="hover-bg-slate">
                            <input 
                                type="checkbox" 
                                checked={selectedOptions.includes(opt)}
                                onChange={() => toggleOption(opt)}
                                style={{ accentColor: THEME.primary, width: '16px', height: '16px' }}
                            />
                            <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>{opt}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function SubContractorClaimsPage() {
    const logic = useSubClaimsLogic();
    const [mounted, setMounted] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState(""); 
    const [assignmentSearch, setAssignmentSearch] = useState("");

    const [selectedVillas, setSelectedVillas] = useState<string[]>([]);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    useEffect(() => { setMounted(true); }, []);

    // 🎯 فلترة قائمة المقاولين
    const filteredContractors = useMemo(() => {
        const list = logic.contractors || [];
        const cleanSearch = searchTerm.trim().toLowerCase();
        if (!cleanSearch) return list;
        return list.filter((c: any) => {
            const nameStr = (c.name || '').toLowerCase();
            return nameStr.includes(cleanSearch);
        });
    }, [logic.contractors, searchTerm]);

    // 🚀 استخراج الفلل والبنود المتاحة للفلترة
    const availableVillas = useMemo(() => {
        if (!logic.assignments) return [];
        return Array.from(new Set(logic.assignments.map((a: any) => a.projects?.Property).filter(Boolean)));
    }, [logic.assignments]);

    const availableItems = useMemo(() => {
        if (!logic.assignments) return [];
        return Array.from(new Set(logic.assignments.map((a: any) => a.boq_budget?.work_item || a.boq_items?.item_name || a.description).filter(Boolean)));
    }, [logic.assignments]);

    // 🎯 فلترة الأعمال الجارية بذكاء (النص + التشك بوكس)
    const filteredAssignments = useMemo(() => {
        let list = logic.assignments || [];
        
        if (selectedVillas.length > 0) {
            list = list.filter((a: any) => selectedVillas.includes(a.projects?.Property));
        }

        if (selectedItems.length > 0) {
            list = list.filter((a: any) => selectedItems.includes(a.boq_budget?.work_item || a.boq_items?.item_name || a.description));
        }

        const cleanSearch = assignmentSearch.trim().toLowerCase();
        if (cleanSearch) {
            list = list.filter((a: any) => {
                const projName = (a.projects?.Property || '').toLowerCase();
                const itemName = (a.boq_budget?.work_item || a.boq_items?.item_name || a.description || '').toLowerCase();
                return projName.includes(cleanSearch) || itemName.includes(cleanSearch);
            });
        }

        return list;
    }, [logic.assignments, assignmentSearch, selectedVillas, selectedItems]);

    useEffect(() => {
        setSelectedVillas([]);
        setSelectedItems([]);
        setAssignmentSearch("");
    }, [logic.selectedContractor]);

    if (!mounted) return null;

    const sidebarActions = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {logic.selectedContractor ? (
                <>
                    <button 
                        onClick={() => {
                            logic.setAssignRecord({ assigned_qty: 1, unit_price: 0 });
                            logic.setIsAssignModalOpen(true);
                        }} 
                        className="btn-main-glass blue"
                    >
                        ➕ إسناد بند عمل جديد
                    </button>

                    <button 
                        disabled={logic.selectedAssignments.length === 0 || logic.isClaimSaving} 
                        onClick={logic.handleOpenClaimModal}
                        className="btn-main-glass green"
                    >
                        {logic.isClaimSaving ? '⏳ جاري المعالجة...' : `📑 إصدار مستخلص (${logic.selectedAssignments.length})`}
                    </button>

                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', margin: '10px 0' }} />

                    <button 
                        onClick={() => {
                            logic.setSelectedContractor(null);
                            logic.setSelectedAssignments([]);
                        }} 
                        className="btn-main-glass white"
                    >
                        🔙 رجوع لقائمة المقاولين
                    </button>
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', color: '#94a3b8', fontSize: '12px', fontWeight: 800 }}>
                    👆 يرجى اختيار مقاول من القائمة لعرض الإجراءات وإسناد الأعمال
                </div>
            )}
        </div>
    );

    // 🚀 تحديث عواميد السجل لعرض حالة "السداد الجزئي" و "التدرج اللوني للاستحقاق"
    const historyColumns = [
        { header: 'تاريخ المستخلص', render: (row: any) => row.date },
        { header: 'رقم المستخلص', render: (row: any) => <strong style={{color: THEME.primary}}>{row.claim_number}</strong> },
        { header: 'المشروع المرتبط', render: (row: any) => row.projects?.Property || 'مجمع (عدة عقارات)' },
        { header: 'الصافي للصرف', render: (row: any) => <strong style={{color: THEME.success, fontSize: '15px'}}>{formatCurrency(row.net_amount)}</strong> },
        
        // 🚀 العمود الجديد: تتبع الاستحقاق المتدرج الألوان
        {
            header: 'ميعاد الاستحقاق',
            render: (row: any) => {
                const net = Number(row.net_amount || 0);
                const paid = Number(row.paid_amount || 0);
                if (paid >= net && net > 0) {
                    return <span style={{ color: '#10b981', fontWeight: 900, fontSize: '12px' }}>✔️ تمت التسوية</span>;
                }

                const period = row.payment_period_days || 0;
                if (!period) return <span style={{ color: '#94a3b8', fontSize: '11px' }}>غير محدد</span>;

                const claimDate = new Date(row.date);
                const dueDate = new Date(claimDate);
                dueDate.setDate(dueDate.getDate() + period);
                
                const today = new Date();
                today.setHours(0, 0, 0, 0); 
                dueDate.setHours(0, 0, 0, 0);

                const diffTime = dueDate.getTime() - today.getTime();
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let color = '#10b981'; 
                let bg = '#ecfdf5';
                let text = `متبقي ${daysLeft} يوم`;
                let icon = '🟢';

                if (daysLeft < 0) {
                    color = '#ef4444'; 
                    bg = '#fef2f2';
                    text = `متأخر ${Math.abs(daysLeft)} يوم!`;
                    icon = '🔴';
                } else if (daysLeft === 0) {
                    color = '#f97316'; 
                    bg = '#fff7ed';
                    text = `يُستحق اليوم!`;
                    icon = '🟠';
                } else if (daysLeft <= 3) {
                    color = '#f59e0b'; 
                    bg = '#fffbeb';
                    icon = '🟡';
                } else if (daysLeft <= 7) {
                    color = '#84cc16'; 
                    bg = '#f7fee7';
                    icon = '🟢';
                }

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800 }}>
                            {dueDate.toISOString().split('T')[0]}
                        </div>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '4px 10px', borderRadius: '8px', fontSize: '11px',
                            fontWeight: 900, color: color, background: bg, border: `1px solid ${color}40`,
                            whiteSpace: 'nowrap'
                        }}>
                            {icon} {text}
                        </div>
                    </div>
                );
            }
        },

        { 
            header: 'حالة السداد', 
            render: (row: any) => {
                const net = Number(row.net_amount || 0);
                const paid = Number(row.paid_amount || 0);
                const remaining = net - paid;

                let status = { label: 'غير مسدد', color: '#ef4444', bg: '#fef2f2' };
                if (paid >= net && net > 0) {
                    status = { label: 'مسدد بالكامل', color: '#16a34a', bg: '#dcfce7' };
                } else if (paid > 0 && paid < net) {
                    status = { label: 'مسدد جزئي', color: '#f59e0b', bg: '#fef3c7' };
                }

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 900, color: status.color, background: status.bg, border: `1px solid ${status.color}30` }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: status.color }}></span>
                            {status.label}
                        </div>
                        {paid > 0 && paid < net && (
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                سُدد: <span style={{ color: '#16a34a' }}>{formatCurrency(paid)}</span> | متبقي: <span style={{ color: '#ef4444' }}>{formatCurrency(remaining)}</span>
                            </div>
                        )}
                    </div>
                );
            } 
        },
        { 
            header: 'الحالة المحاسبية', 
            render: (row: any) => (
                <span style={{ background: row.is_posted ? '#dcfce7' : '#fef3c7', color: row.is_posted ? '#166534' : '#b45309', padding: '5px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 900 }}>
                    {row.is_posted ? 'مُرحل ✅' : 'مسودة ⏳'}
                </span>
            ) 
        },
        {
            header: 'الإجراءات (لحظية)',
            render: (row: any) => {
                const net = Number(row.net_amount || 0);
                const paid = Number(row.paid_amount || 0);
                const isFullyPaid = paid >= net && net > 0;
                const isActionPending = logic.actionMutation.isPending && logic.actionMutation.variables?.id === row.id;

                return (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        
                        {/* 🚀 زرار الصرف المباشر مع الحماية */}
                        {row.is_posted && !isFullyPaid && (
                            <button 
                                disabled={logic.isSavingPayment}
                                onClick={() => logic.handleOpenPayment(row)} 
                                style={{ background: '#16a34a', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '11px', transition: '0.2s', boxShadow: '0 4px 10px rgba(22,163,74,0.3)' }}
                            >
                                {paid > 0 ? 'صرف المتبقي 💸' : 'صرف 💸'}
                            </button>
                        )}

                        <button onClick={() => logic.handlePreparePrint(row)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '11px', transition: '0.2s' }}>طباعة 🖨️</button>

                        {/* 🚀 تأمين وحماية أزرار الترحيل وفك الترحيل ضد النقرات المتعددة */}
                        {!row.is_posted ? (
                            <button 
                                disabled={logic.actionMutation.isPending}
                                onClick={() => logic.actionMutation.mutate({ action: 'post', id: row.id })} 
                                style={{ background: THEME.success, color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '11px', transition: '0.2s', opacity: logic.actionMutation.isPending ? 0.6 : 1 }}
                            >
                                {isActionPending && logic.actionMutation.variables?.action === 'post' ? 'جاري... ⏳' : 'ترحيل 🚀'}
                            </button>
                        ) : (
                            <button 
                                disabled={logic.actionMutation.isPending}
                                onClick={() => { if(confirm('متأكد من فك الترحيل؟ سيتم مسح أي سندات صرف تمت وتصفير السداد.')) logic.actionMutation.mutate({ action: 'unpost', id: row.id, claimNumber: row.claim_number }) }} 
                                style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '11px', transition: '0.2s', opacity: logic.actionMutation.isPending ? 0.6 : 1 }}
                            >
                                {isActionPending && logic.actionMutation.variables?.action === 'unpost' ? 'جاري... ⏳' : 'فك الترحيل 🔓'}
                            </button>
                        )}

                        {/* 🚀 تأمين حماية الحذف الفوري */}
                        <button 
                            disabled={logic.actionMutation.isPending}
                            onClick={() => { if(confirm('متأكد من مسح المستخلص نهائياً وإرجاع الأعمال لجاري التنفيذ؟ (سيتم إلغاء القيود المتعلقة به)')) logic.actionMutation.mutate({ action: 'delete', id: row.id }) }} 
                            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '11px', transition: '0.2s', opacity: logic.actionMutation.isPending ? 0.6 : 1 }}
                        >
                            {isActionPending && logic.actionMutation.variables?.action === 'delete' ? 'جاري... ⏳' : 'مسح 🗑️'}
                        </button>
                    </div>
                );
            }
        }
    ];

    return (
        <div className="clean-page">
            <MasterPage title="إدارة مقاولي الباطن" subtitle="إسناد الأعمال وإصدار المستخلصات الدورية">
                
                <RawasiSidebarManager 
                    actions={sidebarActions}
                    watchDeps={[logic.selectedContractor, logic.selectedAssignments.length]}
                />

                <style>{`
                    .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
                    .btn-main-glass.blue { background: linear-gradient(135deg, rgba(14, 165, 233, 0.8), rgba(2, 132, 199, 0.9)); color: white; }
                    .btn-main-glass.green { background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(22, 163, 74, 0.9)); color: white; }
                    .btn-main-glass.white { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255,255,255,0.8); }
                    .btn-main-glass:disabled { opacity: 0.4; cursor: not-allowed; filter: grayscale(1); }
                    .btn-main-glass:hover:not(:disabled) { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
                    
                    .search-box-container { margin-bottom: 25px; background: white; padding: 10px 15px; border-radius: 20px; border: 1px solid #eee; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; align-items: center; position: relative; }
                    .search-input-fancy { width: 100%; padding: 10px 35px 10px 10px; border-radius: 15px; border: 2px solid transparent; outline: none; transition: 0.3s; font-weight: 700; font-size: 14px; background: #f8fafc; }
                    .search-input-fancy:focus { border-color: ${THEME.primary}80; background: #fff; }
                    .search-icon { position: absolute; right: 25px; color: #94a3b8; pointer-events: none; }
                    .search-clear-btn { position: absolute; left: 25px; background: #e2e8f0; border: none; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #64748b; cursor: pointer; transition: 0.2s; font-size: 10px; }
                    .search-clear-btn:hover { background: #ef4444; color: white; }
                    
                    .tab-btn { padding: 12px 25px; border-radius: 15px; border: none; font-weight: 900; cursor: pointer; transition: 0.3s; font-size: 14px; }
                    .tab-btn.active { background: ${THEME.primary}; color: white; box-shadow: 0 10px 20px ${THEME.primary}40; }
                    .tab-btn.inactive { background: white; color: #64748b; border: 1px solid #e2e8f0; }
                    .tab-btn.inactive:hover { background: #f8fafc; }
                    
                    .hover-bg-slate:hover { background: #f1f5f9; }
                `}</style>

                {!logic.selectedContractor ? (
                    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        <div className="search-box-container">
                            <span className="search-icon">🔍</span>
                            <input 
                                type="text" 
                                className="search-input-fancy" 
                                placeholder="ابحث عن اسم مقاول باطن هنا..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button className="search-clear-btn" onClick={() => setSearchTerm("")}>✖</button>
                            )}
                        </div>

                        {filteredContractors.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', padding: '10px' }}>
                                {filteredContractors.map((contractor: any) => (
                                    <div key={contractor.id} onClick={() => logic.setSelectedContractor(contractor)} 
                                         style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(15px)', borderRadius: '24px', padding: '25px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.5)', transition: '0.3s', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                                        <div style={{ fontSize: '40px', marginBottom: '15px' }}>👷</div>
                                        <h3 style={{ margin: 0, color: THEME.primary, fontWeight: 900 }}>{contractor.name}</h3>
                                        <div style={{ marginTop: '15px', background: THEME.accent, color: 'white', padding: '8px', borderRadius: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 900 }}>فتح ملف الأعمال ⬅️</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '24px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                                <div style={{ fontSize: '45px', marginBottom: '15px' }}>🕵️‍♂️</div>
                                <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: 900 }}>لم نتمكن من العثور على مقاول</h3>
                                <p style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>تأكد من كتابة الاسم بشكل صحيح.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ animation: 'slideUp 0.5s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', background: 'white', padding: '20px', border: '1px solid #eee', borderRadius: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                            <div>
                                <h2 style={{ margin: 0, fontWeight: 900, color: THEME.primary }}>📂 سجل أعمال المقاول</h2>
                                <span style={{ fontSize: '14px', color: THEME.accent, fontWeight: 800 }}>👤 الاسم: {logic.selectedContractor.name}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
                            <button 
                                className={`tab-btn ${logic.activeTab === 'assignments' ? 'active' : 'inactive'}`} 
                                onClick={() => logic.setActiveTab('assignments')}
                            >
                                📋 الأعمال الجارية (لم تفوتر)
                            </button>
                            <button 
                                className={`tab-btn ${logic.activeTab === 'history' ? 'active' : 'inactive'}`} 
                                onClick={() => logic.setActiveTab('history')}
                            >
                                📚 سجل المستخلصات (الأرشيف)
                            </button>
                        </div>

                        {logic.activeTab === 'assignments' && (
                            <div style={{ animation: 'fadeIn 0.3s' }}>
                                <div style={{ background: 'white', padding: '15px', borderRadius: '20px', marginBottom: '20px', border: '1px solid #eee', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
                                    <FilterDropdown 
                                        title="🏡 تحديد الفلل" 
                                        options={availableVillas as string[]} 
                                        selectedOptions={selectedVillas} 
                                        setSelectedOptions={setSelectedVillas} 
                                    />
                                    
                                    <FilterDropdown 
                                        title="🛠️ تحديد البنود" 
                                        options={availableItems as string[]} 
                                        selectedOptions={selectedItems} 
                                        setSelectedOptions={setSelectedItems} 
                                    />

                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <span className="search-icon" style={{ right: '15px', top: '12px' }}>🔍</span>
                                        <input 
                                            type="text" 
                                            className="search-input-fancy" 
                                            style={{ background: '#f1f5f9', border: 'none', padding: '12px 40px 12px 10px' }}
                                            placeholder="بحث سريع (فيلا أو بند)..." 
                                            value={assignmentSearch}
                                            onChange={(e) => setAssignmentSearch(e.target.value)}
                                        />
                                        {assignmentSearch && (
                                            <button className="search-clear-btn" style={{ top: '10px' }} onClick={() => setAssignmentSearch("")}>✖</button>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={() => {
                                            if (logic.selectedAssignments.length === filteredAssignments.length) {
                                                logic.setSelectedAssignments([]);
                                            } else {
                                                logic.setSelectedAssignments(filteredAssignments.map((a:any) => a.id));
                                            }
                                        }}
                                        style={{ background: THEME.primary, color: 'white', border: 'none', padding: '12px 20px', borderRadius: '14px', fontWeight: 900, cursor: 'pointer', transition: '0.2s', fontSize: '13px' }}
                                    >
                                        {logic.selectedAssignments.length === filteredAssignments.length && filteredAssignments.length > 0 ? 'إلغاء التحديد' : 'تحديد جميع النتائج ✓'}
                                    </button>
                                </div>

                                <div style={{ background: 'white', borderRadius: '24px', padding: '10px', border: '1px solid #eee', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                                    <RawasiSmartTable 
                                        data={filteredAssignments} 
                                        isLoading={logic.isAssignLoading}
                                        columns={[
                                            { header: 'المشروع العقاري', render: (row: any) => <span style={{fontWeight: 800}}>{row.projects?.Property || '---'}</span> },
                                            { header: 'بند العمل المسند', render: (row: any) => <span style={{color: THEME.primary, fontWeight: 700}}>{row.boq_budget?.work_item || row.boq_items?.item_name || '---'}</span> },
                                            { header: 'الكمية', render: (row: any) => `${row.assigned_qty} ${row.boq_budget?.unit || row.boq_items?.unit_of_measure || ''}` },
                                            { header: 'سعر الوحدة', render: (row: any) => formatCurrency(row.unit_price) },
                                            { header: 'الإجمالي', render: (row: any) => <strong style={{ color: THEME.success }}>{formatCurrency(row.assigned_qty * row.unit_price)}</strong> },
                                            { header: 'الحالة', render: (row: any) => <span style={{ color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 900 }}>{row.status}</span> },
                                            {
                                                header: 'إجراءات',
                                                render: (row: any) => (
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); logic.handleEditAssignment(row); }} 
                                                            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '11px' }}
                                                        >
                                                            تعديل ✏️
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                if(confirm('متأكد من مسح هذا البند؟')) logic.deleteAssignment(row.id); 
                                                            }} 
                                                            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '11px' }}
                                                        >
                                                            مسح 🗑️
                                                        </button>
                                                    </div>
                                                )
                                            }
                                        ]}
                                        selectable={true}
                                        selectedIds={logic.selectedAssignments}
                                        onSelectionChange={logic.setSelectedAssignments}
                                    />
                                </div>
                            </div>
                        )}

                        {logic.activeTab === 'history' && (
                            <div style={{ background: 'white', borderRadius: '24px', padding: '10px', border: '1px solid #eee', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', animation: 'fadeIn 0.3s' }}>
                                <RawasiSmartTable 
                                    data={logic.claimsHistory} 
                                    isLoading={logic.isHistoryLoading} 
                                    columns={historyColumns} 
                                Dad        />
                            </div>
                        )}
                    </div>
                )}

                {logic.isAssignModalOpen && (
                    <AssignWorkModal 
                        isOpen={logic.isAssignModalOpen}
                        onClose={() => logic.setIsAssignModalOpen(false)}
                        record={logic.assignRecord}
                        setRecord={logic.setAssignRecord}
                        onSave={logic.handleAssignWork}
                        isSaving={logic.isAssigning} 
                        contractorName={logic.selectedContractor?.name}
                        logic={logic}
                    />
                )}

                {logic.isClaimModalOpen && (
                    <ClaimFormModal 
                        isOpen={logic.isClaimModalOpen}
                        onClose={() => logic.setIsClaimModalOpen(false)}
                        logic={logic} 
                    />
                )}

                {logic.isPrintModalOpen && (
                    <PrintClaimModal 
                        isOpen={logic.isPrintModalOpen}
                        onClose={() => { logic.setIsPrintModalOpen(false); logic.setSelectedPrintClaim(null); }}
                        claim={logic.selectedPrintClaim}
                        assignments={logic.printAssignments} 
                        deductions={logic.printDeductions}
                        contractorName={logic.selectedContractor?.name}
                    />
                )}

                {logic.isPaymentModalOpen && (
                    <PaymentVoucherModal 
                        isOpen={logic.isPaymentModalOpen}
                        onClose={() => logic.setIsPaymentModalOpen(false)}
                        record={logic.paymentRecord}
                        setRecord={logic.setPaymentRecord}
                        onSave={logic.handleSavePayment}
                        isSaving={logic.isSavingPayment}
                        partnerBalance={logic.partnerBalance}
                        isBalanceLoading={logic.isBalanceLoading}
                    />
                )}

            </MasterPage>
        </div>
    );
}