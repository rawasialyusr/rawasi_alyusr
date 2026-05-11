"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';

export default function PrintClaimModal({ isOpen, onClose, claim, contractorName, assignments = [] }: any) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // 🚀 استخراج أسماء כל الفلل المشاركة بدون تكرار للترويسة العلوية (تجميع ذكي)
    const allVillas = useMemo(() => {
        if (!assignments || assignments.length === 0) return claim?.projects?.Property || 'مجمع عقارات';
        // بنسحب الـ Property من الـ projects object
        const names = assignments.map((a: any) => a.projects?.Property).filter(Boolean);
        // بنشيل التكرار وبنجمعهم بعلامة (+)
        const uniqueNames = Array.from(new Set(names));
        return uniqueNames.join(' + ');
    }, [assignments, claim]);

    // 🎯 السحر هنا: تجميع البنود المتشابهة في سطر واحد وجمع كمياتها
    const groupedAssignments = useMemo(() => {
        if (!assignments || assignments.length === 0) return [];
        
        const groups: Record<string, any> = {};
        
        assignments.forEach((a: any) => {
            const itemName = a.boq_budget?.work_item || a.boq_items?.item_name || a.description || 'بند أعمال غير محدد';
            const unitName = a.boq_budget?.unit || a.boq_items?.unit_of_measure || 'م';
            const price = Number(a.unit_price || 0);
            const qty = Number(a.assigned_qty || 0);
            const projectName = a.projects?.Property || 'مشروع عام';

            // بنعمل مفتاح التجميع بناءً على اسم البند وسعره (عشان لو نفس البند بسعر مختلف ميتجمعش بالغلط)
            const key = `${itemName}_${price}`;

            if (!groups[key]) {
                groups[key] = {
                    itemName,
                    unitName,
                    price,
                    totalQty: 0,
                    totalAmount: 0,
                    villas: new Set<string>() // نستخدم Set لمنع تكرار اسم الفيلا في نفس البند
                };
            }

            groups[key].totalQty += qty;
            groups[key].totalAmount += (qty * price);
            groups[key].villas.add(projectName);
        });

        // تحويل الـ Object لمصفوفة عشان نرسمها في الجدول
        return Object.values(groups).map(g => ({
            ...g,
            villasList: Array.from(g.villas).join(' + ') // تحويل الـ Set لنص
        }));
    }, [assignments]);

    if (!isOpen || !mounted || !claim) return null;

    const handlePrint = () => {
        window.print();
    };

    const totalWorkAmount = claim.total_amount || 0;

    return createPortal(
        <div className="print-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', direction: 'rtl', padding: '20px' }}>
            <div className="print-modal-backdrop" style={{ position: 'fixed', inset: 0 }} onClick={onClose} />
            
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    /* 🚀 تعديلات الطباعة لضبط ورقة A4 وفك قيود الطول */
                    .print-modal-overlay { position: absolute !important; left: 0; top: 0; padding: 0 !important; background: white !important; align-items: flex-start !important; overflow: visible !important; }
                    .print-modal-backdrop { display: none !important; }
                    .printable-area, .printable-area * { visibility: visible; }
                    .printable-area { position: relative !important; left: 0; top: 0; width: 100% !important; max-width: 100% !important; height: auto !important; max-height: none !important; overflow: visible !important; box-shadow: none !important; border: none !important; padding: 10px !important; margin: 0 !important; background: white !important; }
                    .no-print { display: none !important; }
                    @page { size: A4 landscape; margin: 8mm; } 
                    
                    /* 🚀 منع قطع الجداول بين الصفحات */
                    .modern-table { page-break-inside: auto; }
                    .modern-table tr { page-break-inside: avoid; page-break-after: auto; }
                    .signatures-container { page-break-inside: avoid; }
                }
                
                /* تصميم عصري للمودال */
                .printable-area { 
                    background: white; 
                    border-radius: 24px; 
                    width: 100%; 
                    maxWidth: 1200px; 
                    max-height: 90vh; 
                    overflow-y: auto; 
                    padding: 40px; 
                    position: relative; 
                    zIndex: 10; 
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); 
                    font-family: 'Tajawal', 'Arial', sans-serif; 
                }
                
                /* تصميم ترويسة الشركة (Corporate Header) */
                .company-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 3px solid #1e3a8a; /* كحلي للشركة */
                    padding-bottom: 15px;
                    margin-bottom: 25px;
                }
                .company-brand {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .company-logo-img {
                    height: 60px; /* حجم الشعار */
                    object-fit: contain;
                }
                .company-logo-text {
                    font-size: 28px;
                    font-weight: 900;
                    color: #1e3a8a;
                    margin: 0;
                    letter-spacing: -0.5px;
                }
                .company-subtext {
                    font-size: 13px;
                    color: #64748b;
                    margin: 4px 0 0 0;
                    font-weight: 700;
                }
                
                /* بيانات المستخلص (Info Cards) */
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    margin-bottom: 25px;
                }
                .info-card {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 15px;
                }
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
                
                .text-right { text-align: right !important; padding-right: 15px !important; }
                .villa-badge { display: inline-block; background: #e0f2fe; color: #1d4ed8; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 900; margin-bottom: 6px; }
                
                /* خلاصة الحسابات */
                .summary-section { width: 50%; float: left; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; }
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
                    <h2 style={{ margin: 0, color: '#0f172a', fontWeight: 900, fontSize: '20px' }}>📄 معاينة الطباعة الاحترافية (مُجمّع)</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handlePrint} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)' }}>🖨️ طباعة المستخلص</button>
                        <button onClick={onClose} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer' }}>❌ إغلاق</button>
                    </div>
                </div>

                <div style={{ background: '#fff' }}>
                    
                    {/* 🏢 ترويسة الشركة العصرية مع الشعار */}
                    <div className="company-header">
                        <div className="company-brand">
                            {/* 🎯 مسار الشعار (تأكد من وجود الصورة في مجلد public) */}
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
                            <div className="info-value" style={{ marginTop: '4px', fontSize: '12px' }}>تاريخ: {claim.date}</div>
                        </div>
                    </div>

                    {/* 📊 الجدول الهندسي التفصيلي (بعد التجميع) */}
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
                                groupedAssignments.map((item: any, i: number) => {
                                    return (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 800, color: '#64748b' }}>{i + 1}</td>
                                            <td className="text-right">
                                                {/* 🚀 أسماء الفلل اللي اتجمع منها البند ده */}
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
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan={10} style={{ padding: '30px', color: '#94a3b8', fontWeight: 800 }}>
                                        هذا المستخلص تم تسجيله بقيمة إجمالية مقطوعة ولا يحتوي على تفاصيل بنود حصر.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* 💰 الملخص المالي والتفقيط */}
                    <div style={{ overflow: 'hidden' }}>
                        
                        <div style={{ width: '48%', float: 'right', fontSize: '11px', color: '#64748b', fontWeight: 700, lineHeight: '1.8', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            <strong style={{ color: '#0f172a', display: 'block', marginBottom: '8px', fontSize: '13px' }}>إقرار المقاول:</strong>
                            أقر أنا الموقع أدناه بصفتي ممثلاً عن الجهة المنفذة للأعمال، بأنني قمت بمراجعة كافة الكميات والأسعار المذكورة أعلاه، وبأنها تمثل حصر دقيق ونهائي للأعمال المنجزة حتى تاريخه. وأقر باستلامي للصافي الموضح بعد خصم كافة المستقطعات النظامية، ولا يحق لي الرجوع على الشركة بأي مطالبات مالية تخص هذه البنود مستقبلاً.
                        </div>

                        <div className="summary-section">
                            <div className="summary-row">
                                <span>إجمالي قيمة الأعمال (Total Work):</span>
                                <span>{Number(totalWorkAmount).toLocaleString(undefined, {minimumFractionDigits: 2})} SAR</span>
                            </div>
                            <div className="summary-row deduction">
                                <span>(-) خصم ضمان أعمال {claim.retention_percent || 10}% (Retention):</span>
                                <span>{Number(claim.retention_amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="summary-row deduction">
                                <span>(-) خصم دفعات سابقة (Advances):</span>
                                <span>{Number(claim.advance_payment || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="summary-row deduction">
                                <span>(-) خصم خامات ومسحوبات (Materials):</span>
                                <span>{Number(claim.materials_deduction || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="summary-row deduction" style={{ borderBottom: 'none' }}>
                                <span>(-) استقطاعات أخرى / غرامات (Others):</span>
                                <span>{Number(claim.other_deductions || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
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