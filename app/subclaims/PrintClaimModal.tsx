"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useReactToPrint } from 'react-to-print';
import { formatCurrency } from '@/lib/helpers';
import { THEME } from '@/lib/theme';

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

    // 🚀 تجميع الخصومات وتوحيد التاريخ (حسب طلبك)
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

    // 🚀 التعديل الأول: تغيير دالة الطباعة لتعمل مثل الكيبورد تماماً (window.print)
    const handlePrint = () => {
        document.title = `مستخلص_${contractorName}_${claim?.claim_number}`;
        window.print();
    };

    if (!isOpen || !mounted || !claim) return null;

    const totalWorkAmount = claim.total_amount || 0;

    return createPortal(
        <div className="print-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', direction: 'rtl', padding: '20px' }}>
            <div className="print-modal-backdrop" style={{ position: 'fixed', inset: 0 }} onClick={onClose} />
            
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-modal-overlay { position: absolute !important; left: 0; top: 0; padding: 0 !important; background: white !important; align-items: flex-start !important; overflow: visible !important; }
                    .print-modal-backdrop { display: none !important; }
                    .printable-area, .printable-area * { visibility: visible; }
                    
                    /* 🚀 السحر هنا: تصغير الصفحة تلقائياً لتناسب ورقة الطباعة (Fit to Page) */
                    .printable-area { 
                        position: absolute !important; 
                        left: 0; top: 0; 
                        width: 100% !important; 
                        max-width: 100% !important; 
                        height: auto !important; 
                        overflow: visible !important; 
                        box-shadow: none !important; 
                        border: none !important; 
                        padding: 15px !important; 
                        margin: 0 !important; 
                        background: white !important; 
                        zoom: 0.85; /* 👈 بيصغر المحتوى 15% عشان يلم الصفحة كلها بالعرض */
                    }
                    .no-print { display: none !important; }
                    
                    @page { size: A4 landscape; margin: 10mm; } 
                    
                    /* 🚀 تصغير المسافات بين العناصر أثناء الطباعة فقط عشان توفر مساحة */
                    .info-grid { gap: 10px !important; margin-bottom: 15px !important; }
                    .info-card { padding: 10px !important; }
                    .modern-table { page-break-inside: auto; font-size: 11px !important; margin-bottom: 15px !important; }
                    .modern-table th, .modern-table td { padding: 6px !important; }
                    .modern-table tr { page-break-inside: avoid; page-break-after: auto; }
                    .signatures-container { page-break-inside: avoid; margin-top: 30px !important; }
                    .summary-section { width: 60% !important; float: left; }
                }
                
                /* تصميم عصري للمودال (المعاينة على الشاشة) */
                .printable-area { 
                    background: white; 
                    border-radius: 24px; 
                    width: 100%; 
                    max-width: 1100px; 
                    max-height: 95vh; 
                    overflow-y: auto; 
                    padding: 40px; 
                    position: relative; 
                    z-index: 10; 
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); 
                    font-family: 'Tajawal', 'Arial', sans-serif; 
                }
                
                /* تصميم ترويسة الشركة (Corporate Header) */
                .company-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 25px; }
                .company-brand { display: flex; align-items: center; gap: 15px; }
                .company-logo-img { height: 60px; object-fit: contain; }
                .company-logo-text { font-size: 28px; font-weight: 900; color: #1e3a8a; margin: 0; letter-spacing: -0.5px; }
                .company-subtext { font-size: 13px; color: #64748b; margin: 4px 0 0 0; font-weight: 700; }
                
                /* بيانات المستخلص (Info Cards) */
                .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
                .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; }
                .info-label { font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase; margin-bottom: 5px; display: block;}
                .info-value { font-size: 14px; color: #0f172a; font-weight: 900; }
                .info-value.highlight { color: #2563eb; }

                /* جدول هندسي عصري */
                .modern-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 25px; font-size: 12px; border-radius: 12px; overflow: hidden; border: 1px solid #cbd5e1; }
                .modern-table th, .modern-table td { border-bottom: 1px solid #e2e8f0; border-left: 1px solid #e2e8f0; padding: 10px; text-align: center; }
                .modern-table th:last-child, .modern-table td:last-child { border-left: none; }
                .modern-table tbody tr:last-child td { border-bottom: none; }
                
                .modern-table th { background-color: #1e293b; color: white; font-weight: 800; font-size: 12px; }
                .modern-table .sub-header th { background-color: #334155; font-size: 11px; color: #cbd5e1; }
                
                /* تنسيق جدول الخصومات (أحمر) */
                .deduction-table th { background-color: #7f1d1d; color: white; }
                .deduction-table .sub-header th { background-color: #991b1b; }
                
                .text-right { text-align: right !important; padding-right: 15px !important; }
                .villa-badge { display: inline-block; background: #e0f2fe; color: #1d4ed8; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 900; margin-bottom: 6px; }
                
                /* خلاصة الحسابات */
                .summary-section { width: 55%; float: left; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; }
                .summary-row { display: flex; justify-content: space-between; padding: 10px 15px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 800; }
                .summary-row.deduction { color: #dc2626; background: #fef2f2; }
                .summary-row.net { background: #166534; color: white; font-size: 16px; font-weight: 900; border-bottom: none; }
                
                /* التوقيعات */
                .signatures-container { clear: both; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 50px; padding-top: 30px; border-top: 2px dashed #cbd5e1; }
                .signature-box { text-align: center; }
                .sig-title { font-weight: 800; color: #475569; font-size: 13px; margin-bottom: 40px; }
                .sig-line { border-bottom: 1.5px solid #94a3b8; width: 80%; margin: 0 auto; }
            `}</style>

            <div className="printable-area cinematic-scroll">
                
                {/* 🚀 أزرار التحكم */}
                <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', background: '#f8fafc', padding: '15px', borderRadius: '16px' }}>
                    <h2 style={{ margin: 0, color: '#0f172a', fontWeight: 900, fontSize: '20px' }}>📄 معاينة الطباعة (A4 بالعرض)</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handlePrint} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)' }}>🖨️ طباعة المستخلص</button>
                        <button onClick={onClose} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer' }}>❌ إغلاق</button>
                    </div>
                </div>

                <div ref={printRef} style={{ background: '#fff', color: '#0f172a', direction: 'rtl' }}>
                    
                    {/* 🏢 ترويسة الشركة العصرية مع الشعار */}
                    <div className="company-header">
                        <div className="company-brand">
                            <img src="/logo.png" alt="Rawasi Logo" className="company-logo-img" onError={(e: any) => e.target.style.display = 'none'} />
                            <div>
                                <h1 className="company-logo-text">RAWASI <span style={{ color: '#f59e0b' }}>AL-YUSR</span></h1>
                                <p className="company-subtext">إدارة المشاريع الهندسية والمقاولات </p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ background: '#1e3a8a', color: 'white', padding: '8px 20px', borderRadius: '8px', fontWeight: 900, fontSize: '18px', display: 'inline-block' }}>
                                مستخلص أعمال مقاول باطن
                            </div>
                        </div>
                    </div>

                    {/* 📋 كروت البيانات */}
                    <div className="info-grid">
                        <div className="info-card">
                            <span className="info-label">👤 المقاول المنفذ</span>
                            <div className="info-value">{contractorName}</div>
                        </div>
                        <div className="info-card">
                            <span className="info-label">🏢 نطاق الأعمال (الفلل / العقارات)</span>
                            <div className="info-value highlight" style={{ fontSize: '12px', lineHeight: '1.4' }}>{allVillas}</div>
                        </div>
                        <div className="info-card">
                            <span className="info-label">🧾 بيانات المستخلص</span>
                            <div className="info-value">رقم: <span style={{ color: '#dc2626' }}>{claim.claim_number}</span></div>
                            <div className="info-value" style={{ marginTop: '4px', fontSize: '12px' }}>تاريخ المستخلص: {claim.date}</div>
                        </div>
                    </div>

                    {/* 📊 الجدول الأول: الأعمال المنجزة */}
                    <div style={{ marginBottom: '10px', fontWeight: 900, color: '#1e293b' }}>أولاً: بيان الأعمال المنجزة (مستحقات المقاول)</div>
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th rowSpan={2} style={{ width: '4%' }}>م</th>
                                <th rowSpan={2} style={{ width: '28%' }}>البيان / تفاصيل البند (BOQ)</th>
                                <th rowSpan={2} style={{ width: '6%' }}>الوحدة</th>
                                <th colSpan={3}>الكميات المنفذة المجمعة</th>
                                <th rowSpan={2} style={{ width: '9%' }}>الفئة<br/>(SAR)</th>
                                <th colSpan={3}>إجمالي القيمة (SAR)</th>
                            </tr>
                            <tr className="sub-header">
                                <th>سابق</th>
                                <th>حالي</th>
                                <th>إجمالي</th>
                                <th>سابق</th>
                                <th>حالي</th>
                                <th>إجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedAssignments && groupedAssignments.length > 0 ? (
                                groupedAssignments.map((item: any, i: number) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 800, color: '#64748b' }}>{i + 1}</td>
                                        <td className="text-right">
                                            <span className="villa-badge">📍 {item.villasList}</span>
                                            <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{item.itemName}</div>
                                        </td>
                                        <td style={{ fontWeight: 800 }}>{item.unitName}</td>
                                        <td style={{ color: '#94a3b8' }}>0.00</td>
                                        <td style={{ fontWeight: 800, color: '#2563eb' }}>{item.totalQty.toFixed(2)}</td>
                                        <td style={{ fontWeight: 900 }}>{item.totalQty.toFixed(2)}</td>
                                        <td style={{ fontWeight: 800 }}>{item.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td style={{ color: '#94a3b8' }}>0.00</td>
                                        <td style={{ fontWeight: 800 }}>{item.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td style={{ fontWeight: 900, color: '#166534' }}>{item.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={10} style={{ padding: '30px', color: '#94a3b8', fontWeight: 800 }}>
                                        هذا المستخلص تم تسجيله بقيمة إجمالية مقطوعة ولا يحتوي على تفاصيل بنود حصر.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* 🚀 الجدول الثاني: الخصومات والمسحوبات المجمعة (بتاريخ موحد) */}
                    {groupedDeductions && groupedDeductions.length > 0 && (
                        <>
                            <div style={{ marginBottom: '10px', marginTop: '20px', fontWeight: 900, color: '#7f1d1d' }}>ثانياً: بيان المسحوبات والخصومات المرحلة (تُخصم من المقاول)</div>
                            <table className="modern-table deduction-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '5%' }}>م</th>
                                        <th style={{ width: '15%' }}>تاريخ الخصم</th>
                                        <th style={{ width: '45%' }}>البيان / نوع الخصم المجمع</th>
                                        <th style={{ width: '15%' }}>تصنيف الحركة</th>
                                        <th style={{ width: '20%' }}>القيمة المخصومة (SAR)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedDeductions.map((d: any, idx: number) => (
                                        <tr key={idx} style={{ background: '#fef2f2' }}>
                                            <td style={{ fontWeight: 800, color: '#991b1b' }}>{idx + 1}</td>
                                            <td style={{ fontWeight: 800 }}>{d.date}</td>
                                            <td className="text-right" style={{ fontWeight: 800, color: '#7f1d1d' }}>{d.statement}</td>
                                            <td style={{ fontWeight: 900, color: '#b91c1c' }}>{d.type === 'material' ? '📦 منصرف خامات' : '💸 استقطاعات أخرى'}</td>
                                            <td style={{ fontWeight: 900, color: '#dc2626', fontSize: '14px' }}>{Number(d.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}

                    {/* 💰 الملخص المالي والتفقيط */}
                    <div style={{ overflow: 'hidden', marginTop: '20px' }}>
                        
                        <div style={{ width: '38%', float: 'right', fontSize: '11px', color: '#64748b', fontWeight: 700, lineHeight: '1.8', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            <strong style={{ color: '#0f172a', display: 'block', marginBottom: '8px', fontSize: '13px' }}>إقرار المقاول:</strong>
                            أقر أنا الموقع أدناه بصفتي ممثلاً عن الجهة المنفذة للأعمال، بأنني قمت بمراجعة كافة الكميات والأسعار المذكورة أعلاه، وبأنها تمثل حصر دقيق ونهائي للأعمال المنجزة حتى تاريخه. وأقر باستلامي للصافي الموضح بعد خصم كافة المستقطعات، ولا يحق لي الرجوع على الشركة بأي مطالبات تخص هذه البنود مستقبلاً.
                        </div>

                        <div className="summary-section">
                            <div className="summary-row">
                                <span>إجمالي قيمة الأعمال (Total Work):</span>
                                <span>{Number(totalWorkAmount).toLocaleString(undefined, {minimumFractionDigits: 2})} SAR</span>
                            </div>
                            
                            {Number(claim.retention_amount || 0) > 0 && (
                                <div className="summary-row deduction">
                                    <span>(-) خصم ضمان أعمال {claim.retention_percent || 0}% (Retention):</span>
                                    <span>{Number(claim.retention_amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                            )}

                            {Number(claim.advance_payment || 0) > 0 && (
                                <div className="summary-row deduction">
                                    <span>(-) خصم دفعات سابقة (Advances):</span>
                                    <span>{Number(claim.advance_payment || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                            )}

                            {groupedDeductions.map((d: any, idx: number) => (
                                <div className="summary-row deduction" key={`ded-${idx}`} style={{ borderBottom: idx === groupedDeductions.length - 1 ? 'none' : '1px solid #e2e8f0' }}>
                                    <span>(-) {d.statement}:</span>
                                    <span>{Number(d.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                            ))}

                            <div className="summary-row net">
                                <span>الصافي للصرف (Net Amount):</span>
                                <span>{Number(claim.net_amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} SAR</span>
                            </div>
                        </div>

                    </div>

                    {/* ✒️ التوقيعات */}
                    <div className="signatures-container">
                        <div className="signature-box">
                            <div className="sig-title">المقاول المستلم<br/><span style={{ fontSize: '10px', color: '#94a3b8' }}>Subcontractor</span></div>
                            <div className="sig-line"></div>
                        </div>
                        <div className="signature-box">
                            <div className="sig-title">مهندس الموقع<br/><span style={{ fontSize: '10px', color: '#94a3b8' }}>Site Engineer</span></div>
                            <div className="sig-line"></div>
                        </div>
                        <div className="signature-box">
                            <div className="sig-title">مدير المشاريع<br/><span style={{ fontSize: '10px', color: '#94a3b8' }}>Project Manager</span></div>
                            <div className="sig-line"></div>
                        </div>
                        <div className="signature-box">
                            <div className="sig-title">الاعتماد المالي<br/><span style={{ fontSize: '10px', color: '#94a3b8' }}>Finance Dept.</span></div>
                            <div className="sig-line"></div>
                        </div>
                    </div>

                </div>
            </div>
        </div>,
        document.body
    );
}