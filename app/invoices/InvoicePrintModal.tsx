"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom'; 
import { THEME } from '@/lib/theme';
import { formatCurrency, tafqeet } from '@/lib/helpers'; 
import { useToast } from '@/lib/toast-context'; 
import ZatcaQRCode from './ZatcaQRCode'; 
import { QRCodeSVG } from 'qrcode.react'; 

// --- [المودال الرئيسي لطباعة ومعاينة الفاتورة] ---
export default function InvoicePrintModal({ isOpen, onClose, record, setRecord = () => {}, onSave, isSaving, projects }: any) {
    const { showToast } = useToast(); 
    const [mounted, setMounted] = useState(false); 

    useEffect(() => {
        setMounted(true);
    }, []);

    // =========================================================================
    // 🚀 سحب المشاريع بذكاء استراتيجي (دعم المصفوفات، النصوص، والبيانات الجاهزة)
    // =========================================================================
    const projectNames = useMemo(() => {
        if (!record || !projects) return '---';

        if (Array.isArray(record.selected_projects) && record.selected_projects.length > 0) {
            return record.selected_projects.map((p: any) => p.Property || p.project_name || p.name).join(' - ');
        }

        if (!record.project_ids) return '---';

        let pIds: string[] = [];
        try {
            if (Array.isArray(record.project_ids)) {
                pIds = record.project_ids.map(id => typeof id === 'object' ? String((id as any).id || id) : String(id));
            } else if (typeof record.project_ids === 'string') {
                const cleanStr = record.project_ids.trim();
                if (cleanStr.startsWith('[')) {
                    pIds = JSON.parse(cleanStr).map(String);
                } else {
                    pIds = cleanStr.replace(/[{}[\]"']/g, '').split(',').map(id => id.trim());
                }
            }
        } catch (error) {
            console.error("خطأ في قراءة مصفوفة المشاريع:", error);
        }

        pIds = pIds.filter(id => id && id.length > 0);
        if (pIds.length === 0) return '---';

        const matchedProjects = projects.filter((p: any) => pIds.includes(String(p.id)));
        if (matchedProjects.length === 0) return '---';

        return matchedProjects.map((p: any) => p.Property || p.project_name || p.name).join(' - ');
    }, [record?.project_ids, record?.selected_projects, projects]);

    // =========================================================================
    // 🛡️ 1. سحب البيانات والمنطق الحسابي (متروك بالكامل لحماية النظام)
    // =========================================================================
    useEffect(() => {
        if (!isOpen || !record) return;
        let updates: any = {};
        let needsUpdate = false;

        if (!record.invoice_number) {
            updates.invoice_number = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
            updates.date = record.date || new Date().toISOString();
            updates.tax_acc_id = record.tax_acc_id || '990c949c-5f32-40d7-8d36-5fe45a6c892c'; 
            updates.materials_acc_id = record.materials_acc_id || '85e61a6a-8c85-4219-a733-3b2180dfe043';
            updates.guarantee_acc_id = record.guarantee_acc_id || '8bf39cb1-4028-4c9e-817d-27c239873030';
            updates.lines = record.lines || []; 
            needsUpdate = true;
        }

        if (record.id && !record.selected_projects && record.project_ids && projects?.length > 0) {
            let arrIds = Array.isArray(record.project_ids) ? record.project_ids : [];
            if (typeof record.project_ids === 'string') {
                arrIds = record.project_ids.replace(/[{}[\]"']/g, '').split(',').map((id:string) => id.trim());
            }
            const mappedProjects = projects.filter((p: any) => arrIds.includes(String(p.id)));
            if (mappedProjects.length > 0) {
                updates.selected_projects = mappedProjects;
                needsUpdate = true;
            }
        }

        if (record.id && !record.client_name && record.partners?.name) {
            updates.client_name = record.partners.name;
            needsUpdate = true;
        }

        if (needsUpdate && typeof setRecord === 'function') {
            setRecord((prev: any) => ({ ...prev, ...updates }));
        }
    }, [record?.id, projects?.length, isOpen, setRecord]); 

    useEffect(() => {
        if (!record) return; 
        const qty = Number(record.quantity || 0);
        const price = Number(record.unit_price || 0);
        const linesTotal = (record.lines || []).reduce((sum: number, line: any) => sum + (Number(line.quantity) * Number(line.unit_price)), 0);
        const lineTotal = (qty * price) + linesTotal;
        const materialsDiscount = Number(record.materials_discount || 0);
        const taxableAmount = lineTotal - materialsDiscount;
        const guaranteePercent = Number(record.guarantee_percent || 0);
        const guaranteeAmount = (taxableAmount * guaranteePercent) / 100;
        const taxAmount = record.skip_zatca ? 0 : (taxableAmount * 0.15); 
        const finalTotal = taxableAmount + taxAmount - guaranteeAmount;
        const days = Number(record.due_in_days || 0);
        const invoiceDate = record.date ? new Date(record.date) : new Date();
        const dueDateCalculated = new Date(invoiceDate);
        dueDateCalculated.setDate(dueDateCalculated.getDate() + days);

        if (
            record.line_total !== lineTotal ||
            record.taxable_amount !== taxableAmount ||
            record.guarantee_amount !== guaranteeAmount ||
            record.tax_amount !== taxAmount ||
            record.total_amount !== finalTotal ||
            record.due_date !== dueDateCalculated.toISOString()
        ) {
            if (typeof setRecord === 'function') {
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
        }
    }, [record?.quantity, record?.unit_price, record?.materials_discount, record?.guarantee_percent, record?.date, record?.due_in_days, record?.skip_zatca, record?.lines, setRecord]); 

    const handleAddStatement = (e: React.MouseEvent) => { /* محفوظة للمنطق */ };
    const handleRemoveLine = (indexToRemove: number) => { /* محفوظة للمنطق */ };
    const handleValidateAndSave = () => { /* محفوظة للمنطق */ };

    if (!isOpen || !mounted || !record) return null;

    // =========================================================================
    // 🚀 دالة الطباعة السحرية
    // =========================================================================
    const handlePrintOrPDF = () => {
        const originalTitle = document.title;
        document.title = record?.invoice_number ? `فاتورة_${record.invoice_number}` : 'فاتورة_ضريبية';
        window.print();
        setTimeout(() => { document.title = originalTitle; }, 1000);
    };

    const accountantName = record.users?.name || record.created_by_name || record.profiles?.full_name || 'المحاسب المعتمد';
    const signatureData = `مُعتمد إلكترونياً\nبواسطة: ${accountantName}\nالتاريخ: ${new Date().toLocaleDateString('ar-EG')}`;
    const amountInWords = tafqeet(Number(record.total_amount || 0));

    // 📦 محتوى المعاينة والطباعة
    const modalContent = (
        <div className="print-modal-overlay">
            
            <style>{`
                body { overflow: hidden !important; }

                /* 💻 شاشة المعاينة */
                .print-modal-overlay {
                    position: fixed !important; 
                    inset: 0 !important;
                    background: rgba(15, 23, 42, 0.85) !important;
                    backdrop-filter: blur(8px) !important;
                    z-index: 999999999 !important;
                    display: flex !important; 
                    flex-direction: column !important; 
                    align-items: center !important; 
                    justify-content: flex-start !important; 
                    padding: 30px 20px !important; 
                    overflow-y: auto !important;
                    font-family: 'Arial', sans-serif;
                }

                .print-actions-bar {
                    display: flex !important; 
                    gap: 15px !important; 
                    margin-bottom: 25px !important;
                    background: white !important; 
                    padding: 15px 30px !important; 
                    border-radius: 50px !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
                    position: sticky !important; 
                    top: 20px !important; 
                    z-index: 1000000000 !important; 
                }
                .action-btn { padding: 12px 25px; border-radius: 10px; border: none; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.2s; }
                .action-btn.print { background: #0f172a; color: white; }
                .action-btn.close { background: #fee2e2; color: #dc2626; }
                .action-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }

                /* 📄 تصميم الورقة في المعاينة */
                .a4-preview-box {
                    width: 210mm !important; 
                    min-height: 297mm !important; 
                    background: white !important; 
                    color: #000;
                    padding: 15mm !important; 
                    margin: 0 auto 40px auto !important; 
                    box-shadow: 0 20px 50px rgba(0,0,0,0.4);
                    direction: rtl; 
                    border-radius: 4px;
                    display: flex !important;
                    flex-direction: column !important; 
                    box-sizing: border-box !important; 
                }

                .inv-header { display: grid; grid-template-columns: 180px 1fr 180px; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 25px; width: 100%; gap: 15px; }
                .header-qr { display: flex; justify-content: flex-start; } 
                .header-center { text-align: center; }
                .header-logo { display: flex; justify-content: flex-end; } 
                .header-logo img { max-height: 120px; width: auto; max-width: 100%; object-fit: contain; } 
                .qr-container { padding: 4px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; }

                .inv-title-box { text-align: center; margin-bottom: 25px; }
                .inv-title { font-size: 22px; font-weight: 900; border: 2.5px solid #000; padding: 8px 35px; display: inline-block; background: #f8fafc; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }

                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .info-box { border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 18px 15px 12px 15px; display: flex; flex-direction: column; justify-content: center; position: relative; background: #fff; min-height: 90px; }
                .box-label { position: absolute; top: -10px; right: 15px; background: white; padding: 0 8px; font-size: 12px; font-weight: 900; color: #475569; }

                .inner-table { width: 100%; border-collapse: collapse; }
                .inner-table td { padding: 4px 0; font-size: 13px; vertical-align: middle; }
                .label-cell { text-align: left; font-weight: 900; color: #64748b; width: 90px; padding-left: 10px !important; }
                .value-cell { text-align: right; font-weight: 900; color: #0f172a; }
                .value-highlight { color: ${THEME.primary}; font-size: 15px; font-weight: 900; }

                .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
                .inv-table th { background: #f8fafc; padding: 12px; text-align: center; border-bottom: 2px solid #94a3b8; border-top: 2px solid #94a3b8; color: #0f172a; font-weight: 900; }
                .inv-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #1e293b; font-weight: 700; }
                .inv-table td.desc { text-align: right; font-weight: 900; }

                .inv-footer-flex { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; gap: 40px; }
                .inv-amount-words { flex: 1; display: flex; flex-direction: column; }
                .inv-amount-words .words-box { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 8px; font-weight: 900; font-size: 15px; color: #0f172a; line-height: 1.6; }
                
                .signature-area { margin-top: 30px; text-align: center; align-self: flex-start; }
                .signature-title { font-weight: 900; font-size: 13px; color: #64748b; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }

                .inv-totals-box { width: 350px; }
                .inv-total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; font-weight: 700; color: #334155; }
                .inv-total-row.tax { color: #0284c7; }
                .inv-total-row.discount { color: #dc2626; }
                .inv-total-row.grand-total { border-top: 2px solid #0f172a; padding-top: 12px; margin-top: 12px; font-size: 20px; font-weight: 900; color: #0f172a; background: #f1f5f9; padding: 10px; border-radius: 8px; }

                /* 🚨 الفوتر يُدفع للأسفل تلقائياً */
                .inv-footer-contact { 
                    margin-top: auto !important; 
                    border-top: 2px solid #e2e8f0; 
                    padding-top: 15px; 
                    text-align: center; 
                    font-size: 13px; 
                    color: #64748b; 
                    font-weight: 700; 
                }

                /* 🖨️ سحر الطباعة: إجبار التغطية الكاملة 100% لتجاوز أي تعارض */
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 0 !important; 
                    }
                    
                    html, body { 
                        width: 210mm !important;
                        height: 297mm !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        background: white !important; 
                        overflow: visible !important;
                    }

                    /* 🚨 إخفاء كل الموقع وراء الفاتورة تماماً من الـ DOM لمنع التشوهات */
                    body > *:not(.print-modal-overlay) {
                        display: none !important;
                    }
                    
                    .no-print, .print-actions-bar { 
                        display: none !important; 
                    }

                    .print-modal-overlay, .print-modal-overlay * { 
                        visibility: visible !important; 
                    }
                    
                    /* 🚨 الحاوية تأخذ حجم الشاشة بالكامل (لا يمين ولا يسار) */
                    .print-modal-overlay { 
                        position: absolute !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        right: 0 !important;
                        bottom: 0 !important;
                        width: 210mm !important; 
                        height: 297mm !important; 
                        display: block !important; 
                        background: white !important; 
                        padding: 0 !important; 
                        margin: 0 !important; 
                    }
                    
                    /* 🚨 الورقة تطابق حجم الـ A4 وتملأه من الزاوية (0,0) بقوة الـ Absolute */
                    .a4-preview-box { 
                        position: absolute !important; 
                        top: 0 !important; 
                        left: 0 !important; 
                        width: 100% !important; /* 100% من عرض الـ 210mm */
                        height: 100% !important; /* 100% من طول الـ 297mm (وهنا الديل هينزل لآخر الصفحة) */
                        margin: 0 !important; 
                        box-shadow: none !important; 
                        border: none !important;
                        padding: 15mm !important; 
                        box-sizing: border-box !important;
                        direction: rtl !important; 
                        display: flex !important;
                        flex-direction: column !important;
                        page-break-after: avoid !important;
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>

            <div className="print-actions-bar no-print">
                <button onClick={handlePrintOrPDF} className="action-btn print">
                    🖨️ طباعة / تنزيل PDF
                </button>
                <button onClick={onClose} className="action-btn close">
                    ❌ إغلاق المعاينة
                </button>
            </div>

            <div className="a4-preview-box">
                
                {/* 1️⃣ رأس الفاتورة */}
                <div className="inv-header">
                    <div className="header-qr">
                        {!record.skip_zatca && (
                            <div className="qr-container">
                                <ZatcaQRCode record={record} />
                            </div>
                        )}
                    </div>

                    <div className="header-center">
                        <h1 style={{ fontSize: '18px', fontWeight: 900, color: THEME.primary, margin: '0 0 4px 0' }}>مؤسسة طفله عبد الله السبيعي للمقاولات</h1>
                        <h2 style={{ fontSize: '15px', fontWeight: 900, color: THEME.primary, margin: '0 0 8px 0', letterSpacing: '0.5px' }}>Tifla Abdullah Al-Subaie Est. for Contracting</h2>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>الرقم الضريبي (VAT No): ٣١٢٤٨٧٤٧٧٨٠٠٠٠٣</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginTop: '2px' }}>الرقم الموحد (Unified No): ٧٠٥١٠١٣٥١٩</div>
                    </div>

                    <div className="header-logo">
                        <img src="/in-Logo.png" alt="شعار الشركة" />
                    </div>
                </div>

                <div className="inv-title-box">
                    <div className="inv-title">فاتورة ضريبية | TAX INVOICE</div>
                </div>

                {/* 2️⃣ مربعات البيانات */}
                <div className="info-grid">
                    <div className="info-box">
                        <span className="box-label">صُدرت إلى | BILLED TO</span>
                        <table className="inner-table">
                            <tbody>
                                <tr>
                                    <td className="value-cell value-highlight" style={{ paddingBottom: '8px' }}>{record.client_name || record.partners?.name || '---'}</td>
                                </tr>
                                <tr>
                                    <td className="value-cell" style={{ color: '#334155' }}>الرقم الضريبي: {record.partners?.tax_id || record.partners?.vat_number || '---'}</td>
                                </tr>
                                <tr>
                                    <td className="value-cell" style={{ color: '#334155' }}>العنوان: {record.partners?.address || record.address || 'المملكة العربية السعودية'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="info-box">
                        <span className="box-label">تفاصيل الفاتورة | INVOICE DETAILS</span>
                        <table className="inner-table">
                            <tbody>
                                <tr>
                                    <td className="value-cell" style={{textAlign: 'left'}}>#{record.invoice_number}</td>
                                    <td className="label-cell">:رقم الفاتورة</td>
                                </tr>
                                <tr>
                                    <td className="value-cell" style={{textAlign: 'left'}}>{new Date(record.date).toLocaleDateString('ar-EG')}</td>
                                    <td className="label-cell">:تاريخ الإصدار</td>
                                </tr>
                                <tr>
                                    <td className="value-cell" style={{textAlign: 'left', color: THEME.primary, fontWeight: 900}}>{projectNames}</td>
                                    <td className="label-cell">:المشروع</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3️⃣ جدول البنود التفصيلية */}
                <table className="inv-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th style={{ textAlign: 'right' }}>البيان / الوصف</th>
                            <th style={{ width: '80px' }}>الوحدة</th>
                            <th style={{ width: '80px' }}>الكمية</th>
                            <th style={{ width: '120px' }}>السعر</th>
                            <th style={{ width: '150px' }}>الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(Number(record.quantity) > 0 || Number(record.unit_price) > 0 || record.description) && (
                            <tr>
                                <td>1</td>
                                <td className="desc">{record.description || '---'}</td>
                                <td>{record.unit || '---'}</td>
                                <td>{record.quantity || '-'}</td>
                                <td>{formatCurrency(record.unit_price)}</td>
                                <td style={{ fontWeight: 900, color: '#0f172a' }}>{formatCurrency((Number(record.quantity||0) * Number(record.unit_price||0)))}</td>
                            </tr>
                        )}
                        {record.lines?.map((line: any, idx: number) => (
                            <tr key={idx}>
                                <td>{(Number(record.quantity) > 0 || Number(record.unit_price) > 0 || record.description) ? idx + 2 : idx + 1}</td>
                                <td className="desc">{line.description}</td>
                                <td>{line.unit}</td>
                                <td>{line.quantity}</td>
                                <td>{formatCurrency(line.unit_price)}</td>
                                <td style={{ fontWeight: 900, color: '#0f172a' }}>{formatCurrency(line.total_price)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* 4️⃣ التفقيط والإجماليات */}
                <div className="inv-footer-flex">
                    <div className="inv-amount-words">
                        <div style={{ fontSize: '13px', fontWeight: 900, marginBottom: '6px', color: '#64748b' }}>المبلغ الإجمالي كتابة (Amount in Words):</div>
                        <div className="words-box">{amountInWords}</div>
                        
                        {/* التوقيع الإلكتروني */}
                        <div className="signature-area">
                            <div className="signature-title">المحاسب المعتمد / Signature</div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <QRCodeSVG value={signatureData} size={75} level="M" />
                                <div style={{ fontSize: '14px', fontWeight: 900, marginTop: '8px', color: THEME.primary }}>{accountantName}</div>
                            </div>
                        </div>
                    </div>

                    <div className="inv-totals-box">
                        <div className="inv-total-row">
                            <span>إجمالي الأعمال:</span>
                            <span>{formatCurrency(record.line_total)}</span>
                        </div>
                        {Number(record.materials_discount) > 0 && (
                            <div className="inv-total-row discount">
                                <span>يخصم (مواد):</span>
                                <span>{formatCurrency(record.materials_discount)} -</span>
                            </div>
                        )}
                        <div className="inv-total-row">
                            <span>الخاضع للضريبة:</span>
                            <span>{formatCurrency(record.taxable_amount)}</span>
                        </div>
                        <div className="inv-total-row tax">
                            <span>ضريبة القيمة المضافة (15%):</span>
                            <span>{formatCurrency(record.tax_amount)}</span>
                        </div>
                        {Number(record.guarantee_amount) > 0 && (
                            <div className="inv-total-row discount">
                                <span>يخصم ضمان أعمال ({record.guarantee_percent}%):</span>
                                <span>{formatCurrency(record.guarantee_amount)} -</span>
                            </div>
                        )}
                        <div className="inv-total-row grand-total">
                            <span>الصافي المستحق:</span>
                            <span>{formatCurrency(record.total_amount)}</span>
                        </div>
                    </div>
                </div>

                {/* 5️⃣ الفوتر الثابت أسفل الصفحة */}
                <div className="inv-footer-contact">
                    الدمام - حي الفيصليه - شارع السعيره &nbsp;|&nbsp; rawasi.alyusr@gmail.com &nbsp;|&nbsp; 0547606876 - 0578018944
                </div>

            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}