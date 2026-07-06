"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import LoadingScreen from '@/components/LoadingScreen';
import { supabase } from '@/lib/supabase';

export default function JobOrderLedgerModal({ isOpen, onClose, jobOrder }: any) {
    const [activeTab, setActiveTab] = useState('خامات مصروفة');
    const [loading, setLoading] = useState(true);
    
    const [ledgerData, setLedgerData] = useState<any[]>([]);
    const [assignmentData, setAssignmentData] = useState<any[]>([]);
    const [claimsData, setClaimsData] = useState<any[]>([]);

    useEffect(() => {
        if (!isOpen || !(jobOrder?.id || jobOrder?.job_order_id)) return;

        const fetchData = async () => {
            setLoading(true);
            const targetId = jobOrder.id || jobOrder.job_order_id;

            // 1. جلب السجل الأساسي (خامات، عمالة)
            const { data: ledger } = await supabase
                .from('job_order_ledger_view')
                .select('*')
                .eq('job_order_id', targetId)
                .order('trans_date', { ascending: false });

            // 2. جلب المصروفات المباشرة (اللي مربوطة بـ job_order_id مباشرة)
            const { data: directExpenses } = await supabase
                .from('expenses')
                .select('exp_date, description, total_price')
                .eq('job_order_id', targetId)
                .eq('is_deleted', false);

            // 3. 🚀 جلب "التحميل المالي" (المصروفات العامة الموزعة) من الفيو الجديد
            const { data: allocatedOverheads } = await supabase
                .from('advanced_cost_allocation_view')
                .select('*')
                .eq('job_order_id', targetId);

            // دمج كل الداتا في مصفوفة واحدة
            const allLedger = [
                ...(ledger || []),
                ...(directExpenses || []).map(e => ({
                    trans_date: e.exp_date,
                    trans_desc: e.description,
                    amount: e.total_price,
                    trans_type: 'مصروفات نثرية',
                    qty: 1
                })),
                ...(allocatedOverheads || []).map(ao => ({
                    trans_date: ao["تاريخ المصروف الأصلي"],
                    trans_desc: `[تحميل مالي] ${ao["البيان / الوصف"]} (${ao["آلية التوزيع"]})`,
                    amount: ao["المبلغ المحمل (ر.س)"],
                    trans_type: 'مصروفات نثرية',
                    qty: '-'
                }))
            ];

            // 4. جلب الإسناد والمستخلصات
            const { data: assignments } = await supabase
                .from('contractor_assignments')
                .select(`
                    id, assigned_qty, unit_price, claim_id,
                    sub_claims ( id, claim_number, date, total_amount, net_amount, paid_amount, materials_deduction, other_deductions, advance_payment, retention_amount, status )
                `)
                .eq('job_order_id', targetId);

            setLedgerData(allLedger);
            
            if (assignments) {
                setAssignmentData(assignments);
                const uniqueClaims: any[] = [];
                assignments.forEach((a: any) => {
                    const claimObj = Array.isArray(a.sub_claims) ? a.sub_claims[0] : a.sub_claims;
                    if (claimObj && !uniqueClaims.find(c => c.id === claimObj.id)) {
                        uniqueClaims.push(claimObj);
                    }
                });
                setClaimsData(uniqueClaims);
            }

            setLoading(false);
        };

        fetchData();
    }, [isOpen, jobOrder]);

    useEffect(() => {
        if (jobOrder?.executor_type === 'مقاول باطن') {
            setActiveTab('خامات مصروفة');
        } else {
            setActiveTab('يوميات عمالة');
        }
    }, [jobOrder?.executor_type]);

    if (!isOpen) return null;

    // 🚀 الحسابات المحاسبية الدقيقة (المعادلة الموزونة)
    const isSubcontractor = jobOrder?.executor_type === 'مقاول باطن';
    
    // 1. حساب إجمالي قيمة أعمال الفيلا الحالية
    let totalWorkValue = 0;
    let assignmentQty = 0;
    let assignmentPrice = 0;

    if (assignmentData.length > 0) {
        assignmentData.forEach(a => {
            assignmentQty += Number(a.assigned_qty || 0);
            assignmentPrice = Number(a.unit_price || 0); 
            totalWorkValue += Number(a.assigned_qty || 0) * Number(a.unit_price || 0);
        });
    } else {
        assignmentQty = Number(jobOrder?.assigned_qty || 0);
        assignmentPrice = Number(jobOrder?.unit_price || 0);
        totalWorkValue = assignmentQty * assignmentPrice;
    }
    
    // 2. الخصومات (خامات + مصروفات) الخاصة بهذه الفيلا فقط
    const materialsTotal = ledgerData.filter(d => d.trans_type === 'خامات مصروفة').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expensesTotal = ledgerData.filter(d => d.trans_type === 'مصروفات نثرية').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    
    // 3. الصافي التقديري للفيلا (أساس النسبة)
    const estimatedNet = totalWorkValue - materialsTotal - expensesTotal;
    
    // 4. 🚀 معالجة المستخلصات واستخراج نصيب الفيلا من (السداد + الضمان + السلفة)
    let paymentsTotal = 0;
    let advanceTotal = 0;
    let retentionTotal = 0;

    const processedClaims = claimsData.map(c => {
        // أساس المستخلص = الإجمالي الكلي - خامات الكلية - مصروفات الكلية
        const claimBase = Number(c.total_amount || 0) - Number(c.materials_deduction || 0) - Number(c.other_deductions || 0);
        
        // 🚀 النسبة والتناسب: صافي الفيلا / صافي المستخلص
        let ratio = 0;
        if (claimBase > 0 && estimatedNet > 0) {
            ratio = estimatedNet / claimBase;
        }
        
        // تأمين النسبة (لا تتعدى 100% ولا تقل عن صفر)
        if (ratio > 1) ratio = 1;
        if (ratio < 0) ratio = 0;

        const allocPaid = Number(c.paid_amount || 0) * ratio;
        const allocAdvance = Number(c.advance_payment || 0) * ratio;
        const allocRet = Number(c.retention_amount || 0) * ratio;

        paymentsTotal += allocPaid;
        advanceTotal += allocAdvance;
        retentionTotal += allocRet;

        return {
            ...c,
            ratio,
            allocPaid,
            allocAdvance,
            allocRet
        };
    });
    
    // 5. المتبقي الفعلي والصافي للاستحقاق الآن
    const remainingBalance = estimatedNet - paymentsTotal - advanceTotal - retentionTotal;

    // تجهيز الجدول حسب التاب
    let tableRows: any[] = [];
    if (activeTab === 'دفعات مقاولين') {
        processedClaims.forEach(c => {
            if (c.allocPaid > 0) {
                tableRows.push({ trans_date: c.date, trans_desc: `سداد مستخلص #${c.claim_number} | حصة الفيلا (${(c.ratio * 100).toFixed(1)}%)`, qty: '-', amount: c.allocPaid });
            }
            if (c.allocAdvance > 0) {
                 tableRows.push({ trans_date: c.date, trans_desc: `دفعة مقدمة مخصومة من مستخلص #${c.claim_number}`, qty: '-', amount: c.allocAdvance });
            }
            if (c.allocRet > 0) {
                 tableRows.push({ trans_date: c.date, trans_desc: `محتجز ضمان أعمال من مستخلص #${c.claim_number}`, qty: '-', amount: c.allocRet });
            }
        });
    } else {
        tableRows = ledgerData.filter(d => d.trans_type === activeTab);
    }
    
    const tabTotal = tableRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const tabs = [
        { id: 'خامات مصروفة', label: '🧱 الخامات' },
        { id: 'مصروفات نثرية', label: '💸 مصروفات' },
        { id: 'دفعات مقاولين', label: '🤝 المستخلصات (سداد وخصم)' },
        { id: 'يوميات عمالة', label: '👷‍♂️ العمالة' },
    ];

    const modalContent = (
        <div className="modal-overlay" onClick={onClose}>
            <style>{`
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 999999; }
                .modal-content { width: 1100px; max-height: 90vh; background: #ffffff; border-radius: 30px; display: flex; flex-direction: column; overflow: hidden; animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 20px 50px rgba(0,0,0,0.4); direction: rtl; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .tab-btn { padding: 15px 20px; border: none; background: transparent; font-weight: 900; cursor: pointer; border-bottom: 3px solid transparent; color: #64748b; transition: 0.3s; font-size: 14px; flex: 1; }
                .tab-btn.active { border-bottom-color: ${THEME.accent}; color: ${THEME.primary}; background: #f8fafc; }
                .tab-btn:hover:not(.active) { color: ${THEME.primary}; background: rgba(0,0,0,0.02); }
            `}</style>

            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '30px', color: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {isSubcontractor ? '🤝 كشف حساب مقاول الباطن' : '📊 دفتر أستاذ التشغيل'}
                                <span style={{ fontSize: '13px', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
                                    أمر رقم: <span style={{ color: THEME.accentLight }}>{jobOrder?.order_number}</span>
                                </span>
                            </h2>
                            <p style={{ margin: '10px 0 0 0', color: '#94a3b8', fontSize: '14px', fontWeight: 800 }}>
                                📍 {jobOrder?.projects?.Property} | 🛠️ {jobOrder?.boq_budget?.work_item || jobOrder?.job_order_name}
                                {isSubcontractor && <span style={{ color: '#fcd34d' }}> | 👷 المقاول: {jobOrder?.partners?.name || 'غير محدد'}</span>}
                            </p>
                        </div>
                        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900, transition: '0.2s', fontSize: '14px' }} onMouseOver={e => e.currentTarget.style.background='rgba(239, 68, 68, 0.8)'} onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}>إغلاق ✖</button>
                    </div>

                    {isSubcontractor ? (
                        // لوحة التحكم المخصصة لمقاول الباطن
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '30px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>إجمالي قيمة الإسناد (للفيلا)</div>
                                <div style={{ fontSize: '22px', fontWeight: 900, color: '#60a5fa', marginTop: '5px' }}>{formatCurrency(totalWorkValue)}</div>
                            </div>
                            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px dashed rgba(245, 158, 11, 0.3)', padding: '20px', borderRadius: '16px' }}>
                                <div style={{ fontSize: '11px', color: '#fcd34d', fontWeight: 800 }}>الصافي بعد الخامات والمصاريف</div>
                                <div style={{ fontSize: '22px', fontWeight: 900, color: '#f59e0b', marginTop: '5px' }}>{formatCurrency(estimatedNet)}</div>
                            </div>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed rgba(16, 185, 129, 0.3)', padding: '20px', borderRadius: '16px' }}>
                                <div style={{ fontSize: '11px', color: '#6ee7b7', fontWeight: 800 }}>المسدد ومحجوز الضمان (حصة الفيلا)</div>
                                <div style={{ fontSize: '22px', fontWeight: 900, color: '#10b981', marginTop: '5px' }}>{formatCurrency(paymentsTotal + advanceTotal + retentionTotal)}</div>
                            </div>
                            <div style={{ background: `linear-gradient(135deg, ${THEME.accent}40, transparent)`, padding: '20px', borderRadius: '16px', border: `1px solid ${THEME.accent}80`, boxShadow: `0 0 25px ${THEME.accent}30` }}>
                                <div style={{ fontSize: '13px', color: THEME.accentLight, fontWeight: 900 }}>المتبقي المستحق للفيلا</div>
                                <div style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', marginTop: '5px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{formatCurrency(remainingBalance)}</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '25px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>الميزانية المعتمدة</div>
                                <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '5px' }}>{formatCurrency(jobOrder?.boq_total_budget || 0)}</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>إجمالي التكلفة الفعالة</div>
                                <div style={{ fontSize: '20px', fontWeight: 900, color: '#f87171', marginTop: '5px' }}>{formatCurrency(jobOrder?.effective_cost || 0)}</div>
                            </div>
                            <div style={{ background: `${THEME.accent}30`, padding: '15px', borderRadius: '15px', border: `1px solid ${THEME.accent}60` }}>
                                <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 800 }}>صافي الربح</div>
                                <div style={{ fontSize: '20px', fontWeight: 900, color: '#34d399', marginTop: '5px' }}>{formatCurrency(jobOrder?.total_profit_or_loss || 0)}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', background: '#f8fafc', padding: '0 10px', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
                    {tabs.map(tab => (
                        <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Table Data */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {loading ? (
                        <LoadingScreen message="جاري استخراج السجل المالي بدقة..." fullScreen={false} />
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f1f5f9', color: '#475569', fontSize: '12px', textAlign: 'right' }}>
                                <tr>
                                    <th style={{ padding: '14px 20px', borderRadius: '0 12px 12px 0' }}>التاريخ</th>
                                    <th style={{ padding: '14px 20px' }}>البيان التحليلي</th>
                                    <th style={{ padding: '14px 20px' }}>الكمية</th>
                                    <th style={{ padding: '14px 20px', borderRadius: '12px 0 0 0' }}>القيمة (ر.س)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableRows.length > 0 ? tableRows.map((row: any, i: number) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px', fontWeight: 800, color: '#1e293b', transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.background='#f8fafc'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
                                        <td style={{ padding: '15px 20px' }}>{new Date(row.trans_date).toLocaleDateString('ar-EG')}</td>
                                        <td style={{ padding: '15px 20px' }}>{row.trans_desc}</td>
                                        <td style={{ padding: '15px 20px' }}>{row.qty || '-'}</td>
                                        <td style={{ padding: '15px 20px', color: THEME.primary, fontWeight: 900 }}>{formatCurrency(row.amount)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '15px', fontWeight: 800 }}>لا توجد حركات أو مستخلصات مسجلة في هذا البند حتى الآن.</td></tr>
                                )}
                            </tbody>
                            <tfoot style={{ background: '#f8fafc' }}>
                                <tr>
                                    <td colSpan={3} style={{ padding: '15px 20px', textAlign: 'left', fontWeight: 900, color: '#475569', fontSize: '14px' }}>الإجمالي المسحوب على الفيلا</td>
                                    <td style={{ padding: '15px 20px', color: THEME.primary, fontWeight: 900, fontSize: '18px' }}>{formatCurrency(tabTotal)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}