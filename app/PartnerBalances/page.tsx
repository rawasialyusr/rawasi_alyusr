"use client";
import React, { useState, useEffect, useMemo } from 'react';
import MasterPage from '@/components/MasterPage';
import { formatCurrency } from '@/lib/helpers';
import { THEME } from '@/lib/theme';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase'; 
import PrintStatement from './printstatement'; // 🚀 سطر إضافي: استدعاء ملف الطباعة من جنبه علطول

export default function PartnerBalancesPage() {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // الفلاتر
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [showInactive, setShowInactive] = useState(false);
    
    // الصفحات
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);

    const [expandedPartners, setExpandedPartners] = useState<string[]>([]);
    const [ledgers, setLedgers] = useState<Record<string, any[]>>({});
    const [loadingLedgers, setLoadingLedgers] = useState<Record<string, boolean>>({});

    // 🚀 سطر إضافي: حالة ذكية لمعرفة هل نحن في مود الطباعة أم لا بدون ضرب الـ Build
    const [isPrintMode, setIsPrintMode] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('print') === 'true') {
                setIsPrintMode(true);
            }
        }
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data: accountsData, error } = await supabase
                .from('all_partners_account_summary')
                .select('*');

            if (error) throw error;
            setData(accountsData || []);
        } catch (error) {
            console.error("خطأ في جلب الأرصدة:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // 🚀 دالة إيقاف/تفعيل الحساب
    const handleToggleActive = async (partnerId: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation(); 
        const actionName = currentStatus ? 'إيقاف/أرشفة' : 'تفعيل';
        if (!window.confirm(`هل أنت متأكد من ${actionName} هذا الحساب؟`)) return;

        try {
            const { error } = await supabase
                .from('partners')
                .update({ is_active: !currentStatus })
                .eq('id', partnerId);

            if (error) throw error;
            setData(prev => prev.map(p => p.partner_id === partnerId ? { ...p, is_active: !currentStatus } : p));
        } catch (err) {
            alert("حدث خطأ أثناء تغيير حالة الحساب!");
            console.error(err);
        }
    };

    const toggleLedger = async (partnerId: string) => {
        if (expandedPartners.includes(partnerId)) {
            setExpandedPartners(prev => prev.filter(id => id !== partnerId));
            return;
        }

        setExpandedPartners(prev => [...prev, partnerId]);

        if (!ledgers[partnerId]) {
            setLoadingLedgers(prev => ({ ...prev, [partnerId]: true }));
            try {
                const { data: ledgerData, error } = await supabase
                    .from('partner_statement_ledger')
                    .select('*')
                    .eq('partner_id', partnerId)
                    .order('transaction_date', { ascending: true });
                
                if (error) throw error;
                setLedgers(prev => ({ ...prev, [partnerId]: ledgerData || [] }));
            } catch (err) {
                console.error("خطأ في جلب كشف الحساب:", err);
            } finally {
                setLoadingLedgers(prev => ({ ...prev, [partnerId]: false }));
            }
        }
    };

    const uniqueTypes = useMemo(() => Array.from(new Set(data.map(d => d.partner_type).filter(Boolean))), [data]);

    const filteredData = useMemo(() => {
        let filtered = data.filter(item => {
            const searchStr = `${item.partner_name} ${item.partner_code}`.toLowerCase();
            const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'all' || item.partner_type === filterType;
            const isActiveMatch = showInactive ? true : (item.is_active !== false); 
            return matchesSearch && matchesType && isActiveMatch;
        });

        return filtered.sort((a, b) => {
            const netA = Math.abs(Number(a.total_credit || 0)) - Math.abs(Number(a.total_debit || 0));
            const netB = Math.abs(Number(b.total_credit || 0)) - Math.abs(Number(b.total_debit || 0));
            return netB - netA;
        });
    }, [data, searchTerm, filterType, showInactive]);

    const stats = useMemo(() => {
        let totalCredit = 0, totalDebit = 0;
        filteredData.forEach(p => {
            totalCredit += Math.abs(Number(p.total_credit || 0));
            totalDebit += Math.abs(Number(p.total_debit || 0));
        });
        const net = totalCredit - totalDebit;
        return { totalCredit, totalDebit, net };
    }, [filteredData]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType, showInactive]);
    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filteredData.slice(start, start + rowsPerPage);
    }, [filteredData, currentPage, rowsPerPage]);

    // 🚀 دالة ذكية لتحديد حالة الرصيد والألوان
    const getBalanceInfo = (netBal: number) => {
        if (netBal > 0.01) return { label: 'لــه', bg: '#ecfdf5', text: '#047857' }; 
        if (netBal < -0.01) return { label: 'عليــه', bg: '#fef2f2', text: '#dc2626' }; 
        return { label: 'مُتزن', bg: '#fef9c3', text: '#a16207' }; 
    };

    const exportToExcel = () => {
        const excelData = filteredData.map(p => {
            const tCredit = Math.abs(Number(p.total_credit || 0));
            const tDebit = Math.abs(Number(p.total_debit || 0));
            const netBal = tCredit - tDebit;
            const balInfo = getBalanceInfo(netBal);

            return {
                'الكود': p.partner_code || '---',
                'اسم الجهة': p.partner_name,
                'التصنيف': p.partner_type,
                'الحالة': p.is_active === false ? 'موقوف/مؤرشف' : 'نشط',
                'إجمالي أيام العمل': p.partner_type === 'عامل يومية' ? Number(p.total_work_days || 0) : '---',
                'إجمالي دائن (له)': tCredit,
                'إجمالي مدين (عليه)': tDebit,
                'الرصيد الصافي': Math.abs(netBal),
                'الموقف': balInfo.label
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "الأرصدة");
        worksheet['!cols'] = [{wch: 15}, {wch: 35}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 15}];
        worksheet['!dir'] = 'rtl';
        XLSX.writeFile(workbook, `أرصدة_الشركاء_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // 🚀 سطر إضافي: لو الصفحة مفتوحة للطباعة، اعرض كود الطباعة فوراً واقفل العرض العادي
    if (isPrintMode) {
        return <PrintStatement />;
    }

    return (
        <div className="clean-page print-container">
            <MasterPage title="أرصدة الشركاء وكشف الحساب" subtitle="اضغط على أي حساب لعرض تفاصيل حركاته (Ledger)">
                
                <style>{`
                    .glass-panel { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.5); border-radius: 16px; padding: 20px; box-shadow: 0 4px 25px rgba(0,0,0,0.03); margin-bottom: 20px; }
                    .stat-card { flex: 1; padding: 20px; border-radius: 12px; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden; }
                    .stat-card.credit { background: linear-gradient(135deg, #10b98115, #05966915); border: 1px solid #10b98130; }
                    .stat-card.debit { background: linear-gradient(135deg, #f59e0b15, #d9770615); border: 1px solid #f59e0b30; }
                    .stat-card.net { background: linear-gradient(135deg, #3b82f615, #1d4ed815); border: 1px solid #3b82f630; }
                    
                    .smart-table { width: 100%; border-collapse: collapse; text-align: right; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
                    .smart-table th { background: #f8fafc; padding: 15px; font-size: 13px; font-weight: 900; color: #334155; border-bottom: 2px solid #e2e8f0; }
                    .smart-table td { padding: 15px; font-size: 14px; font-weight: 800; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
                    .main-row { cursor: pointer; transition: 0.2s; }
                    .main-row:hover { background: #f8fafc; }
                    .main-row.inactive { opacity: 0.6; background: #fafafa; }
                    
                    .ledger-container { background: #f8fafc; padding: 15px 30px; border-bottom: 2px solid #cbd5e1; box-shadow: inset 0 4px 6px -4px rgba(0,0,0,0.05); }
                    .ledger-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
                    .ledger-table th { background: #475569; color: white; padding: 10px; font-size: 12px; }
                    .ledger-table td { padding: 10px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }

                    .arrow-icon { display: inline-block; transition: transform 0.3s; margin-left: 10px; color: #94a3b8; }
                    .arrow-expanded { transform: rotate(90deg); color: #3b82f6; }
                    .glass-input { width: 100%; padding: 12px 15px; border-radius: 10px; border: 2px solid #e2e8f0; outline: none; font-weight: 700; transition: 0.3s; background: white; }
                    .glass-input:focus { border-color: ${THEME.primary || '#3b82f6'}; }

                    .btn-toggle-status { padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 900; border: none; cursor: pointer; transition: 0.2s; }
                    .btn-toggle-status.active { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
                    .btn-toggle-status.inactive { background: #e2e8f0; color: #475569; border: 1px solid #cbd5e1; }
                    .btn-toggle-status:hover { transform: translateY(-1px); filter: brightness(0.9); }
                    
                    .btn-print-row { padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 900; background: white; color: #0f172a; border: 1px solid #cbd5e1; cursor: pointer; transition: 0.2s; }
                    .btn-print-row:hover { background: #f1f5f9; transform: translateY(-1px); border-color: #94a3b8; }
                `}</style>

                <div className="glass-panel" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div className="stat-card credit">
                        <div style={{ fontSize: '13px', fontWeight: 900, color: '#475569' }}>إجمالي دائن (مستحقات للغير) 📉</div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#059669' }}>{formatCurrency(stats.totalCredit)}</div>
                    </div>
                    <div className="stat-card debit">
                        <div style={{ fontSize: '13px', fontWeight: 900, color: '#475569' }}>إجمالي مدين (مسحوبات ودفعات) 📈</div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#d97706' }}>{formatCurrency(stats.totalDebit)}</div>
                    </div>
                    <div className="stat-card net">
                        <div style={{ fontSize: '13px', fontWeight: 900, color: '#475569' }}>الرصيد الصافي (المتأخرات) ⚖️</div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: getBalanceInfo(stats.net).text }}>
                            {formatCurrency(Math.abs(stats.net))} ({getBalanceInfo(stats.net).label})
                        </div>
                    </div>
                </div>

                <div className="glass-panel no-print" style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 2, minWidth: '250px' }}>
                        <input type="text" className="glass-input" placeholder="🔍 ابحث بالاسم أو الكود..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="glass-input">
                            <option value="all">كل التصنيفات</option>
                            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => setShowInactive(!showInactive)}>
                        <input type="checkbox" checked={showInactive} readOnly style={{ transform: 'scale(1.2)', marginLeft: '10px', cursor: 'pointer' }} />
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#475569' }}>عرض الموقوفين 🚫</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={exportToExcel} style={{ padding: '12px 20px', background: '#10b981', color: 'white', borderRadius: '10px', border: 'none', fontWeight: 900, cursor: 'pointer' }}>📊 Excel</button>
                    </div>
                </div>

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '50px', fontWeight: 900, color: '#64748b' }}>⏳ جاري التحميل...</div>
                ) : (
                    <>
                        <table className="smart-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '20%' }}>الجهة / الشريك</th>
                                    <th style={{ width: '10%' }}>التصنيف</th>
                                    <th style={{ width: '10%', textAlign: 'center' }}>أيام العمل</th>
                                    <th style={{ width: '15%' }}>إجمالي له (دائن)</th>
                                    <th style={{ width: '15%' }}>إجمالي عليه (مدين)</th>
                                    <th style={{ width: '15%' }}>الرصيد الصافي</th>
                                    <th style={{ width: '15%', textAlign: 'center' }}>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.map((row, idx) => {
                                    const tCredit = Math.abs(Number(row.total_credit || 0));
                                    const tDebit = Math.abs(Number(row.total_debit || 0));
                                    const netBal = tCredit - tDebit;
                                    const balInfo = getBalanceInfo(netBal); 
                                    
                                    const isExpanded = expandedPartners.includes(row.partner_id);
                                    const isActive = row.is_active !== false; 
                                    const pLedger = ledgers[row.partner_id] || [];

                                    return (
                                        <React.Fragment key={row.partner_id || idx}>
                                            <tr className={`main-row ${!isActive ? 'inactive' : ''}`} onClick={() => toggleLedger(row.partner_id)}>
                                                <td>
                                                    <span className={`arrow-icon ${isExpanded ? 'arrow-expanded' : ''}`}>◀</span>
                                                    <div style={{ display: 'inline-block' }}>
                                                        <div style={{ color: !isActive ? '#94a3b8' : (THEME.primary || '#2563eb'), fontSize: '15px', fontWeight: 900 }}>
                                                            {row.partner_name} {!isActive && '(موقوف)'}
                                                        </div>
                                                        <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 800 }}>كود: #{row.partner_code || '---'}</div>
                                                    </div>
                                                </td>
                                                <td><span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontSize: '11px' }}>{row.partner_type}</span></td>
                                                
                                                <td style={{ textAlign: 'center' }}>
                                                    {row.partner_type === 'عامل يومية' ? (
                                                        <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '6px', fontWeight: 900, fontSize: '13px' }}>
                                                            {Number(row.total_work_days || 0)} يوم
                                                        </span>
                                                    ) : <span style={{ color: '#cbd5e1' }}>---</span>}
                                                </td>

                                                <td style={{ color: '#059669' }}>{formatCurrency(tCredit)}</td>
                                                <td style={{ color: '#d97706' }}>{formatCurrency(tDebit)}</td>
                                                <td>
                                                    <span style={{ background: balInfo.bg, color: balInfo.text, padding: '6px 12px', borderRadius: '8px', WebkitPrintColorAdjust: 'exact' }}>
                                                        {formatCurrency(Math.abs(netBal))} {balInfo.label}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                                        <button 
                                                            className="btn-print-row"
                                                            title="طباعة كشف الحساب"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // 🚀 التعديل الوحيد: توجيه رابط المود الذكي بدون الـ 404 الفرعي
                                                                window.open(`/PartnerBalances?print=true&id=${row.partner_id}`, '_blank');
                                                            }}
                                                        >
                                                            🖨️ طباعة
                                                        </button>

                                                        <button 
                                                            className={`btn-toggle-status ${isActive ? 'active' : 'inactive'}`}
                                                            title={isActive ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                                                            onClick={(e) => handleToggleActive(row.partner_id, isActive, e)}
                                                        >
                                                            {isActive ? '🚫 إيقاف' : '✅ تفعيل'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={7} style={{ padding: 0 }}>
                                                        <div className="ledger-container">
                                                            <div style={{ marginBottom: '10px', fontWeight: 900, color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                                                                <span>📄 كشف حساب تفصيلي: {row.partner_name}</span>
                                                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>{pLedger.length} حركة مسجلة</span>
                                                            </div>
                                                            
                                                            {loadingLedgers[row.partner_id] ? (
                                                                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontWeight: 900 }}>⏳ جاري تحميل الحركات...</div>
                                                            ) : pLedger.length > 0 ? (
                                                                <table className="ledger-table">
                                                                    <thead>
                                                                        <tr>
                                                                            <th style={{ width: '15%' }}>التاريخ</th>
                                                                            <th style={{ width: '30%' }}>البيان / القيد</th>
                                                                            <th style={{ width: '15%' }}>دائن (له)</th>
                                                                            <th style={{ width: '15%' }}>مدين (عليه)</th>
                                                                            <th style={{ width: '25%' }}>الرصيد التراكمي</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {(() => {
                                                                            let runningBal = 0;
                                                                            return pLedger.map((lg: any, lIdx: number) => {
                                                                                const c = Math.abs(Number(lg.credit || 0));
                                                                                const d = Math.abs(Number(lg.debit || 0));
                                                                                runningBal += (c - d);
                                                                                const lgBalInfo = getBalanceInfo(runningBal);
                                                                                
                                                                                return (
                                                                                    <tr key={lIdx}>
                                                                                        <td style={{ fontWeight: 900, color: '#475569' }}>{lg.transaction_date}</td>
                                                                                        <td>
                                                                                            <strong style={{ color: '#1e293b' }}>{lg.main_description}</strong>
                                                                                            {lg.line_details && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{lg.line_details}</div>}
                                                                                        </td>
                                                                                        <td style={{ color: '#059669', fontWeight: 800 }}>{c > 0 ? formatCurrency(c) : '-'}</td>
                                                                                        <td style={{ color: '#dc2626', fontWeight: 800 }}>{d > 0 ? formatCurrency(d) : '-'}</td>
                                                                                        <td style={{ fontWeight: 900, background: '#f8fafc' }}>
                                                                                            <span style={{ color: lgBalInfo.text, background: Math.abs(runningBal) < 0.01 ? lgBalInfo.bg : 'transparent', padding: Math.abs(runningBal) < 0.01 ? '2px 8px' : '0', borderRadius: '4px' }}>
                                                                                                {formatCurrency(Math.abs(runningBal))} {lgBalInfo.label}
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            });
                                                                        })()}
                                                                    </tbody>
                                                                </table>
                                                            ) : (
                                                                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontWeight: 800 }}>لا توجد حركات مُرحلة لهذا الحساب.</div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* 🚀 زراير التقسيم (Pagination) */}
                        {filteredData.length > 0 && (
                            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#475569' }}>
                                    إجمالي الحسابات: <span style={{ color: THEME.primary || '#3b82f6' }}>{filteredData.length}</span> حساب
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <button 
                                        onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}
                                        style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: currentPage === 1 ? '#f1f5f9' : (THEME.primary || '#3b82f6'), color: currentPage === 1 ? '#94a3b8' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 900, transition: '0.2s' }}
                                    >السابق</button>
                                    
                                    <span style={{ padding: '8px 20px', background: '#f8fafc', borderRadius: '8px', fontWeight: 900, border: '1px solid #e2e8f0', color: '#1e293b' }}>
                                        صفحة {currentPage} من {totalPages}
                                    </span>
                                    
                                    <button 
                                        onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}
                                        style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: currentPage === totalPages ? '#f1f5f9' : (THEME.primary || '#3b82f6'), color: currentPage === totalPages ? '#94a3b8' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 900, transition: '0.2s' }}
                                    >التالي</button>
                                </div>
                            </div>
                        )}
                        {filteredData.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontWeight: 900, background: 'white', borderRadius: '12px', marginTop: '20px' }}>
                                ❌ لا توجد حسابات مطابقة للبحث
                            </div>
                        )}
                    </>
                )}
            </MasterPage>
        </div>
    );
}