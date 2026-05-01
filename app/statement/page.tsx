"use client";
import React, { useMemo, useEffect, useState } from 'react';
import { useStatementLogic } from './statement_logic';
import { THEME } from '@/lib/theme';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import SmartCombo from '@/components/SmartCombo';
import SecureAction from '@/components/SecureAction';
import { formatCurrency, formatDate } from '@/lib/helpers';

export default function PartnerStatementPage() {
    // 1️⃣ نقطة الاستدعاء (Single Source)
    const logic = useStatementLogic();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // 2️⃣ تعريف أعمدة الجدول مع تطبيق إلزامي لـ (حراس الرندر Render Guards)
    const columns = useMemo(() => [
        { 
            header: 'التاريخ', 
            accessor: 'date', 
            render: (row: any) => {
                if (!row) return null; // 🛡️ حارس الرندر V9
                return <span style={{fontWeight: 700, color: '#64748b'}}>{row.date === '---' ? '---' : formatDate(row.date)}</span>;
            }
        },
        { 
            header: 'النوع', 
            accessor: 'v_type', 
            render: (row: any) => {
                if (!row) return null; // 🛡️ حارس الرندر V9
                return (
                    <span className={`badge-glass ${row.v_type === 'سند صرف' ? 'red' : 'green'}`}>
                        {row.v_type}
                    </span>
                );
            }
        },
        { 
            header: 'البيان / الوصف', 
            accessor: 'description', 
            render: (row: any) => {
                if (!row) return null; // 🛡️ حارس الرندر V9
                return <span style={{fontSize: '13px', fontWeight: 800}}>{row.description}</span>;
            }
        },
        { 
            header: 'مدين (عليه)', 
            accessor: 'debit', 
            render: (row: any) => {
                if (!row) return null; // 🛡️ حارس الرندر V9
                return row.debit > 0 ? <strong style={{color: THEME.danger}}>{formatCurrency(row.debit)}</strong> : '-';
            }
        },
        { 
            header: 'دائن (له)', 
            accessor: 'credit', 
            render: (row: any) => {
                if (!row) return null; // 🛡️ حارس الرندر V9
                return row.credit > 0 ? <strong style={{color: THEME.success}}>{formatCurrency(row.credit)}</strong> : '-';
            }
        },
        { 
            header: 'الرصيد التراكمي', 
            accessor: 'balance', 
            render: (row: any) => {
                if (!row) return null; // 🛡️ حارس الرندر V9
                return (
                    <div style={{
                        background: 'rgba(0,0,0,0.05)', 
                        padding: '5px 10px', 
                        borderRadius: '8px', 
                        fontWeight: 900,
                        textAlign: 'center',
                        color: row.balance >= 0 ? THEME.success : THEME.danger
                    }}>
                        {formatCurrency(Math.abs(row.balance))}
                        <small style={{marginRight: '5px', fontSize: '10px'}}>
                            {row.balance >= 0 ? '(له)' : '(عليه)'}
                        </small>
                    </div>
                );
            }
        }
    ], []);

    // 3️⃣ إضافة سطر الرصيد الافتتاحي في بداية الجدول (Logic Filtering)
    const tableData = useMemo(() => {
        if (!logic.partnerId || logic.isLoading) return [];
        
        const openingRow = {
            id: 'opening',
            date: logic.dateFrom || '---',
            description: '🔹 رصيد افتتاحي (ما قبل الفترة المختارة)',
            v_type: 'رصيد سابق',
            debit: 0,
            credit: 0,
            balance: logic.openingBalance
        };

        return [openingRow, ...logic.statementLines];
    }, [logic.statementLines, logic.openingBalance, logic.isLoading, logic.partnerId, logic.dateFrom]);

    // 4️⃣ جسر الترحيل (Actions Bridge)
    const sidebarActions = useMemo(() => (
        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <button onClick={() => window.print()} className="btn-main-glass white">🖨️ طباعة كشف الحساب</button>
            <SecureAction module="statements" action="export">
                <button className="btn-main-glass gold">📥 تصدير Excel</button>
            </SecureAction>
        </div>
    ), []);

    if (!mounted) return null;

    return (
        <div className="clean-page">
            {/* 5️⃣ التغليف السيادي */}
            <MasterPage title="كشف حساب الشركاء" subtitle="متابعة الحركات المالية والأرصدة التراكمية للمقاولين والعمال والموردين">
                
                <RawasiSidebarManager 
                    actions={sidebarActions}
                    summary={
                        <div className="statement-summary">
                            <div className="sum-item">
                                <span>الرصيد الحالي</span>
                                <strong style={{color: logic.currentBalance >= 0 ? THEME.success : THEME.danger}}>
                                    {formatCurrency(Math.abs(logic.currentBalance))}
                                    <small>{logic.currentBalance >= 0 ? ' (له)' : ' (عليه)'}</small>
                                </strong>
                            </div>
                            <div className="sum-grid">
                                <div className="grid-box red">
                                    <small>إجمالي عليه</small>
                                    <span>{formatCurrency(logic.totalDebit)}</span>
                                </div>
                                <div className="grid-box green">
                                    <small>إجمالي له</small>
                                    <span>{formatCurrency(logic.totalCredit)}</span>
                                </div>
                            </div>
                        </div>
                    }
                    customFilters={
                        <div style={{display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px'}}>
                            <SmartCombo 
                                label="👤 اختر الشريك" 
                                table="partners" 
                                displayCol="name" 
                                initialDisplay={logic.partnerId}
                                onSelect={(v: any) => logic.setPartnerId(v.id)} 
                            />
                            <div>
                                <label className="filter-label">📅 من تاريخ</label>
                                <input type="date" className="glass-input" value={logic.dateFrom} onChange={e => logic.setDateFrom(e.target.value)} />
                            </div>
                            <div>
                                <label className="filter-label">📅 إلى تاريخ</label>
                                <input type="date" className="glass-input" value={logic.dateTo} onChange={e => logic.setDateTo(e.target.value)} />
                            </div>
                        </div>
                    }
                    watchDeps={[logic.partnerId, logic.currentBalance, logic.statementLines.length, logic.dateFrom, logic.dateTo]}
                />

                {/* 6️⃣ مكونات العرض (الجدول الذكي) */}
                {!logic.partnerId ? (
                    <div className="welcome-placeholder">
                        <div className="icon">🧾</div>
                        <h3>يرجى اختيار شريك من القائمة الجانبية لعرض كشف الحساب</h3>
                        <p>يمكنك البحث عن العمال، الموردين، أو مقاولي الباطن.</p>
                    </div>
                ) : (
                    <RawasiSmartTable 
                        data={tableData} 
                        columns={columns} 
                        isLoading={logic.isLoading} 
                        enablePagination={true}
                        rowsPerPage={100}
                    />
                )}

                <style>{`
                    .statement-summary { background: #1e293b; color: white; padding: 20px; border-radius: 20px; margin-bottom: 20px; }
                    .sum-item { text-align: center; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px; }
                    .sum-item span { display: block; font-size: 12px; color: #94a3b8; font-weight: 900; }
                    .sum-item strong { font-size: 24px; display: block; margin-top: 5px; }
                    
                    .sum-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                    .grid-box { padding: 10px; border-radius: 12px; text-align: center; }
                    .grid-box.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
                    .grid-box.green { background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid rgba(34,197,94,0.2); }
                    .grid-box small { display: block; font-size: 10px; margin-bottom: 3px; font-weight: 900; }
                    .grid-box span { font-weight: 900; font-size: 13px; }

                    .badge-glass { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 900; display: inline-block; }
                    .badge-glass.red { background: #fef2f2; color: #ef4444; }
                    .badge-glass.green { background: #f0fdf4; color: #16a34a; }

                    .filter-label { font-size: 12px; font-weight: 900; color: white; margin-bottom: 8px; display: block; }
                    .glass-input { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white; font-weight: 800; outline: none; }
                    .glass-input::-webkit-calendar-picker-indicator { filter: invert(1); }

                    .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
                    .btn-main-glass.gold { background: linear-gradient(135deg, rgba(197, 160, 89, 0.9), rgba(151, 115, 50, 1)); color: white; }
                    .btn-main-glass.white { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255,255,255,0.8); }
                    .btn-main-glass:hover { transform: translateY(-3px); filter: brightness(1.1); }

                    .welcome-placeholder { text-align: center; padding: 100px 20px; color: #94a3b8; }
                    .welcome-placeholder .icon { font-size: 64px; margin-bottom: 20px; }
                    
                    @media print {
                        .RawasiSidebarManager, .btn-main-glass, .master-header { display: none !important; }
                        .MasterPage-content { width: 100% !important; margin: 0 !important; }
                        .clean-page { background: white !important; }
                    }
                `}</style>
            </MasterPage>
        </div>
    );
}