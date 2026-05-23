"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency } from '@/lib/helpers';

export default function PrintClaimModal({ isOpen, onClose, claim, contractorName, assignments = [], deductions = [] }: any) {
    const [mounted, setMounted] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setMounted(true); }, []);

    // 🚀 استخراج أسماء כל الفلل المشاركة بدون تكرار للترويسة
    const allVillas = useMemo(() => {
        if (!assignments || assignments.length === 0) return claim?.projects?.Property || 'مجمع عقارات';
        const names = assignments.map((a: any) => a.projects?.Property).filter(Boolean);
        return Array.from(new Set(names)).join(' + ');
    }, [assignments, claim]);

    // 🎯 تجميع بنود الأعمال المتشابهة
    const groupedAssignments = useMemo(() => {
        if (!assignments || assignments.length === 0) return [];
        const groups: Record<string, any> = {};
        assignments.forEach((a: any) => {
            const itemName = a.boq_budget?.work_item || a.boq_items?.item_name || a.description || 'بند أعمال غير محدد';
            const unitName = a.boq_budget?.unit || a.boq_items?.unit_of_measure || 'م';
            const price = Number(a.unit_price || 0);
            const qty = Number(a.assigned_qty || 0);
            const projectName = a.projects?.Property || 'مشروع عام';
            const key = `${itemName}_${price}`;

            if (!groups[key]) {
                groups[key] = { itemName, unitName, price, totalQty: 0, totalAmount: 0, villas: new Set<string>() };
            }
            groups[key].totalQty += qty;
            groups[key].totalAmount += (qty * price);
            groups[key].villas.add(projectName);
        });
        return Object.values(groups).map(g => ({ ...g, villasList: Array.from(g.villas).join(' + ') }));
    }, [assignments]);

    // 🚀 تجميع الخصومات القديمة وتوحيد التاريخ
    const groupedDeductions = useMemo(() => {
        if (!deductions || deductions.length === 0) return [];
        let totalMat = 0;
        let totalExp = 0;
        deductions.forEach((d: any) => {
            if (d.type === 'material') totalMat += Number(d.amount || 0);
            if (d.type === 'expense') totalExp += Number(d.amount || 0);
        });

        const res = [];
        if (totalMat > 0) {
            res.push({ type: 'material', amount: totalMat, statement: 'إجمالي منصرف خامات للموقع', date: claim?.date });
        }
        if (totalExp > 0) {
            res.push({ type: 'expense', amount: totalExp, statement: 'استقطاعات أخرى (مصروفات وسلف مجمعة)', date: claim?.date });
        }
        return res;
    }, [deductions, claim]);

    // 🖨️ دالة الطباعة (window.print)
    const handlePrint = () => {
        document.title = `مستخلص_${contractorName}_${claim?.claim_number}`;
        window.print();
    };

    if (!isOpen || !mounted || !claim) return null;

    const totalWorkAmount = claim.total_amount || 0;
    
    // استخراج القيم من الأعمدة الجديدة في الداتا بيز
    const materialsDeductionDB = Number(claim.materials_deduction || 0);
    const expensesDeductionDB = Number(claim.deductions_amount || 0); 
    const otherDeductionsDB = Number(claim.other_deductions || 0);
    const advancePaymentDB = Number(claim.advance_payment || 0);

    return createPortal(
        <div className="print-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', direction: 'rtl', padding: '20px' }}>
            <div className="print-modal-backdrop" style={{ position: 'fixed', inset: 0 }} onClick={onClose} />
            
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800;900&display=swap');

                @media print {
                    body * { visibility: hidden; }
                    .print-modal-overlay { position: absolute !important; left: 0; top: 0; padding: 0 !important; background: white !important; align-items: flex-start !important; overflow: visible !important; }
                    .print-modal-backdrop { display: none !important; }
                    .printable-area, .printable-area * { visibility: visible; }
                    .printable-area { color: #0f172a; } /* تلوين الطباعة الأساسي بدون فرض إجباري على كل العناصر */
                    
                    /* 🚀 فرض اللون الأحمر الإجباري للخصومات في الطباعة */
                    .summary-row.deduction, .summary-row.deduction * { color: #b91c1c !important; }
                    /* فرض اللون الأبيض لسطر الصافي النهائي في الطباعة */
                    .summary-row.net, .summary-row.net * { color: #ffffff !important; background-color: #14532d !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    
                    .printable-area { 
                        position: absolute !important; 
                        left: 0; top: 0; 
                        width: 100% !important; 
                        max-width: 100% !important; 
                        height: auto !important; 
                        overflow: visible !important; 
                        box-shadow: none !important; 
                        border: none !important; 
                        padding: 10px 20px !important; 
                        margin: 0 !important; 
                        background: white !important; 
                        zoom: 0.85; 
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact;
                    }
                    .no-print { display: none !important; }
                    
                    @page { size: A4 landscape; margin: 8mm; } 
                    
                    /* تحسين الطباعة: تباين عالي بدون حواف */
                    .info-grid { gap: 15px !important; margin-bottom: 25px !important; }
                    .vip-table th { background-color: #f1f5f9 !important; color: #0f172a !important; border-bottom: 2px solid #cbd5e1 !important; }
                    .vip-table td { border-bottom: 1px solid #e2e8f0 !important; }
                    .deduction-table th { background-color: #fef2f2 !important; color: #b91c1c !important; border-bottom: 2px solid #fecaca !important; }
                    .summary-section { width: 60% !important; float: left; }
                    .signatures-container { margin-top: 50px !important; page-break-inside: avoid; }
                }
                
                /* ---------------------------------------------------
                   تصميم الـ VIP Theme - بدون حواف (Borderless & Clean)
                   --------------------------------------------------- */
                
                .printable-area { 
                    background: white; 
                    border-radius: 20px; 
                    width: 100%; 
                    max-width: 1150px; 
                    max-height: 95vh; 
                    overflow-y: auto; 
                    padding: 50px; 
                    position: relative; 
                    z-index: 10; 
                    box-shadow: 0 40px 60px -15px rgba(0,0,0,0.3); 
                    font-family: 'Tajawal', sans-serif; 
                    color: #0f172a; 
                }
                
                /* الترويسة الفاخرة المحدثة */
                .company-header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 20px; margin-bottom: 35px; border-bottom: 1px solid #e2e8f0; }
                .company-brand { display: flex; align-items: center; gap: 15px; text-align: left; }
                .company-logo-img { height: 65px; object-fit: contain; }
                .company-logo-text { font-size: 32px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -1px; }
                .company-subtext { font-size: 14px; color: #64748b; margin: 2px 0 0 0; font-weight: 700; }
                
                .document-title { text-align: right; }
                .document-title h2 { margin: 0; font-size: 24px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 1px; }
                .document-title p { margin: 5px 0 0 0; font-size: 13px; color: #64748b; font-weight: 700; text-transform: uppercase; }

                /* كروت المعلومات بتصميم جانبي ملون (Accent Border) */
                .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 35px; }
                .info-card { background: #f8fafc; border-radius: 12px; padding: 18px 20px; position: relative; overflow: hidden; }
                .info-card::before { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 4px; background: #1e3a8a; border-radius: 0 4px 4px 0; }
                .info-card:nth-child(2)::before { background: #f59e0b; }
                .info-card:nth-child(3)::before { background: #10b981; }
                
                .info-label { font-size: 12px; color: #64748b; font-weight: 800; margin-bottom: 6px; display: block; }
                .info-value { font-size: 16px; color: #0f172a; font-weight: 900; }
                .info-value.highlight { color: #0f172a; font-size: 14px; line-height: 1.5; }

                /* جداول بدون حواف (Modern Borderless Tables) */
                .vip-table { width: 100%; border-collapse: collapse; margin-bottom: 35px; font-size: 13px; text-align: center; }
                .vip-table th { padding: 14px 10px; font-weight: 900; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 12px; }
                .vip-table td { padding: 14px 10px; font-weight: 800; border-bottom: 1px dashed #f1f5f9; color: #0f172a; }
                .vip-table tbody tr:hover td { background-color: #f8fafc; }
                
                .text-right { text-align: right !important; }
                .item-title { font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 4px; }
                .villa-badge { display: inline-block; background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 900; margin-bottom: 4px; }
                
                .highlight-blue { color: #2563eb !important; font-weight: 900 !important; }
                .highlight-green { color: #166534 !important; font-weight: 900 !important; }
                .highlight-red { color: #b91c1c !important; font-weight: 900 !important; }

                /* جدول الخصومات (أحمر ناعم) */
                .deduction-table th { color: #b91c1c; border-bottom: 2px solid #fecaca; }
                .deduction-table td { border-bottom: 1px dashed #fee2e2; }
                .deduction-table tbody tr:hover td { background-color: #fef2f2; }

                /* الخلاصة المالية (Summary Box) - تصميم فواتير الشركات */
                .summary-container { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; }
                .disclaimer-box { width: 42%; font-size: 12px; color: #64748b; font-weight: 700; line-height: 1.8; padding: 20px; background: #f8fafc; border-radius: 16px; }
                .disclaimer-box strong { color: #0f172a; font-size: 14px; display: block; margin-bottom: 10px; }
                
                .summary-section { width: 52%; }
                .summary-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 800; color: #0f172a; }
                
                /* 🚀 إجبار كل الخصومات على اللون الأحمر */
                .summary-row.deduction, .summary-row.deduction span { color: #b91c1c !important; } 
                
                /* سطر الصافي الأخضر الفخم */
                .summary-row.net { padding: 18px 20px; background: #f0fdf4; border-radius: 12px; margin-top: 15px; border: none; align-items: center; background-color: #14532d; -webkit-print-color-adjust: exact; print-color-adjust: exact;}
                .summary-row.net span { color: #ffffff !important; }
                .summary-row.net span:first-child { font-size: 16px; font-weight: 900; }
                .summary-row.net span:last-child { font-size: 22px; font-weight: 900; }
                
                /* التوقيعات */
                .signatures-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 30px; margin-top: 70px; padding-top: 40px; }
                .signature-box { text-align: center; }
                .sig-title { font-weight: 900; color: #0f172a; font-size: 15px; margin-bottom: 60px; }
                .sig-sub { display: block; font-size: 11px; color: #94a3b8; font-weight: 700; margin-top: 4px; }
                .sig-line { border-bottom: 2px solid #cbd5e1; width: 85%; margin: 0 auto; }
            `}</style>

            <div className="printable-area cinematic-scroll">
                
                {/* 🚀 أزرار التحكم (لا تظهر في الطباعة) */}
                <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '35px', background: '#f8fafc', padding: '15px 25px', borderRadius: '16px', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: '#0f172a', fontWeight: 900, fontSize: '18px' }}>📄 معاينة مستخلص (شكل فني عصري)</h2>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button onClick={handlePrint} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '12px 28px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(15,23,42,0.2)' }}>🖨️ طباعة المستخلص</button>
                        <button onClick={onClose} style={{ background: '#f1f5f9', color: '#ef4444', border: 'none', padding: '12px 28px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}>إغلاق</button>
                    </div>
                </div>

                <div ref={printRef}>
                    
                    {/* 🏢 ترويسة الشركة (تم التبديل لتكون عربية 100%) */}
                    <div className="company-header">
                        <div className="document-title">
                            <h2>مستخلص أعمال</h2>
                            <p>SUBCONTRACTOR PAYMENT CERTIFICATE</p>
                        </div>
                        <div className="company-brand">
                            <div style={{ textAlign: 'left' }}>
                                <h1 className="company-logo-text">RAWASI <span style={{ color: '#1e3a8a' }}>AL-YUSR</span></h1>
                                <p className="company-subtext">إدارة المشاريع الهندسية والمقاولات</p>
                            </div>
                            <img src="/logo.png" alt="Logo" className="company-logo-img" onError={(e: any) => e.target.style.display = 'none'} />
                        </div>
                    </div>

                    {/* 📋 كروت البيانات */}
                    <div className="info-grid">
                        <div className="info-card">
                            <span className="info-label">المقاول المنفذ / Subcontractor</span>
                            <div className="info-value">{contractorName}</div>
                        </div>
                        <div className="info-card">
                            <span className="info-label">نطاق الأعمال / Project Scope</span>
                            <div className="info-value highlight">{allVillas}</div>
                        </div>
                        <div className="info-card">
                            <span className="info-label">بيانات الدفع / Claim Info</span>
                            <div className="info-value">رقم المستخلص: <span style={{ color: '#1e3a8a' }}>{claim.claim_number}</span></div>
                            <div className="info-value" style={{ marginTop: '6px', fontSize: '13px', color: '#64748b' }}>التاريخ: {claim.date}</div>
                        </div>
                    </div>

                    {/* 📊 الجدول الأول: الأعمال المنجزة */}
                    <div style={{ marginBottom: '15px', fontWeight: 900, color: '#0f172a', fontSize: '16px' }}>أولاً: بيان الأعمال المنجزة (Work Performed)</div>
                    <table className="vip-table">
                        <thead>
                            <tr>
                                <th style={{ width: '4%' }}>م</th>
                                <th className="text-right" style={{ width: '30%' }}>تفاصيل البند / Description</th>
                                <th style={{ width: '6%' }}>الوحدة</th>
                                <th style={{ width: '15%' }}>الكمية المنجزة</th>
                                <th style={{ width: '15%' }}>سعر الوحدة</th>
                                <th style={{ width: '30%' }}>إجمالي القيمة (SAR)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedAssignments && groupedAssignments.length > 0 ? (
                                groupedAssignments.map((item: any, i: number) => (
                                    <tr key={i}>
                                        <td style={{ color: '#64748b' }}>{i + 1}</td>
                                        <td className="text-right">
                                            <span className="villa-badge">{item.villasList}</span>
                                            <div className="item-title">{item.itemName}</div>
                                        </td>
                                        <td>{item.unitName}</td>
                                        <td className="highlight-blue">{item.totalQty.toFixed(2)}</td>
                                        <td>{item.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="highlight-green">{item.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} style={{ padding: '40px', color: '#94a3b8', fontSize: '14px' }}>
                                        هذا المستخلص تم تسجيله بقيمة مقطوعة ولا يحتوي على تفاصيل بنود حصر فرعية.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* 🚀 الجدول الثاني: الخصومات والمسحوبات */}
                    {groupedDeductions && groupedDeductions.length > 0 && (
                        <>
                            <div style={{ marginBottom: '15px', marginTop: '40px', fontWeight: 900, color: '#b91c1c', fontSize: '16px' }}>ثانياً: بيان الخصومات المرحلة (Deductions)</div>
                            <table className="vip-table deduction-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '5%' }}>م</th>
                                        <th style={{ width: '15%' }}>التاريخ</th>
                                        <th className="text-right" style={{ width: '45%' }}>نوع الخصم / Deduction Type</th>
                                        <th style={{ width: '15%' }}>التصنيف</th>
                                        <th style={{ width: '20%' }}>القيمة المخصومة (SAR)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedDeductions.map((d: any, idx: number) => (
                                        <tr key={idx}>
                                            <td style={{ color: '#b91c1c' }}>{idx + 1}</td>
                                            <td>{d.date}</td>
                                            <td className="text-right highlight-red">{d.statement}</td>
                                            <td style={{ color: '#7f1d1d' }}>{d.type === 'material' ? '📦 منصرف خامات' : '💸 خصم مالي'}</td>
                                            <td className="highlight-red" style={{ fontSize: '15px' }}>{Number(d.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}

                    {/* 💰 الملخص المالي والتفقيط (تصميم فاتورة) */}
                    <div className="summary-container">
                        
                        <div className="disclaimer-box">
                            <strong>إقرار استلام ومخالصة:</strong>
                            أقر أنا الموقع أدناه بصفتي ممثلاً عن الجهة المنفذة للأعمال، بأنني قمت بمراجعة كافة الكميات والأسعار أعلاه، وبأنها تمثل حصر دقيق ونهائي للأعمال المنجزة. وأقر باستلامي للصافي الموضح، ولا يحق لي الرجوع على الشركة بأي مطالبات مستقبلاً تخص هذه البنود.
                        </div>

                        <div className="summary-section">
                            <div className="summary-row">
                                <span>إجمالي قيمة الأعمال (Total Work)</span>
                                <span>{Number(totalWorkAmount).toLocaleString(undefined, {minimumFractionDigits: 2})} SAR</span>
                            </div>
                            
                            {Number(claim.retention_amount || 0) > 0 && (
                                <div className="summary-row deduction">
                                    <span>(-) ضمان أعمال {claim.retention_percent || 0}% (Retention)</span>
                                    <span>{Number(claim.retention_amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                            )}

                            {materialsDeductionDB > 0 && (
                                <div className="summary-row deduction">
                                    <span>(-) خامات ومواد منصرفة (Materials)</span>
                                    <span>{materialsDeductionDB.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                            )}

                             {expensesDeductionDB > 0 && (
                                <div className="summary-row deduction">
                                    <span>(-) مصروفات سابقة (Expenses)</span>
                                    <span>{expensesDeductionDB.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                            )}

                            {advancePaymentDB > 0 && (
                                <div className="summary-row deduction">
                                    <span>(-) دفعات نقدية سلفة (Advances)</span>
                                    <span>{advancePaymentDB.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                            )}

                            {otherDeductionsDB > 0 && (
                                <div className="summary-row deduction">
                                    <span>(-) خصومات أخرى وتسويات (Others)</span>
                                    <span>{otherDeductionsDB.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                            )}

                            {groupedDeductions.map((d: any, idx: number) => (
                                <div className="summary-row deduction" key={`ded-${idx}`}>
                                    <span>(-) {d.statement}</span>
                                    <span>{Number(d.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                            ))}

                            {/* سطر الصافي - تصميم بارز باللون الأخضر */}
                            <div className="summary-row net">
                                <span>الصافي المُستحق (Net Payable)</span>
                                <span>{Number(claim.net_amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} SAR</span>
                            </div>
                        </div>

                    </div>

                    {/* ✒️ التوقيعات */}
                    <div className="signatures-container">
                        <div className="signature-box">
                            <div className="sig-title">المقاول المستلم<span className="sig-sub">Subcontractor</span></div>
                            <div className="sig-line"></div>
                        </div>
                        <div className="signature-box">
                            <div className="sig-title">مهندس الموقع<span className="sig-sub">Site Engineer</span></div>
                            <div className="sig-line"></div>
                        </div>
                        <div className="signature-box">
                            <div className="sig-title">مدير المشاريع<span className="sig-sub">Project Manager</span></div>
                            <div className="sig-line"></div>
                        </div>
                        <div className="signature-box">
                            <div className="sig-title">الاعتماد المالي<span className="sig-sub">Finance Dept.</span></div>
                            <div className="sig-line"></div>
                        </div>
                    </div>

                </div>
            </div>
        </div>,
        document.body
    );
}