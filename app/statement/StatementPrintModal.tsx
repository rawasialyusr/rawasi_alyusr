"use client";
import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { THEME } from '@/lib/theme';

interface StatementPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    partnerName: string;
    dateFrom: string;
    dateTo: string;
    openingBalance: number;
    currentBalance: number;
    totalDebit: number;
    totalCredit: number;
    statementLines: any[];
}

export default function StatementPrintModal({
    isOpen, onClose, partnerName, dateFrom, dateTo,
    openingBalance, currentBalance, totalDebit, totalCredit, statementLines
}: StatementPrintModalProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        window.print();
    };

    if (!isOpen) return null;

    // عكس المصفوفة لتبدأ من الأقدم إلى الأحدث في الطباعة (لأن كشف الحساب يقرأ من أعلى لأسفل)
    const printLines = [...statementLines].reverse();

    return (
        <AnimatePresence>
            <div className="print-modal-overlay">
                <motion.div 
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.95 }}
                    className="print-modal-content"
                >
                    {/* شريط الإجراءات (لا يظهر في الطباعة) */}
                    <div className="no-print modal-header-actions">
                        <h3 style={{ margin: 0, color: THEME.coffeeDark }}>🖨️ معاينة الطباعة</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handlePrint} className="btn-print">طباعة المستند</button>
                            <button onClick={onClose} className="btn-close">إغلاق</button>
                        </div>
                    </div>

                    {/* ورقة الـ A4 */}
                    <div className="a4-paper" ref={printRef}>
                        
                        {/* ترويسة الشركة */}
                        <div className="print-header">
                            <div className="company-info">
                                <h1>شركة رواسي اليسر للمقاولات</h1>
                                <p>الرقم الضريبي: 310000000000003</p>
                                <p>سجل تجاري: 1010000000</p>
                            </div>
                            <div className="doc-title">
                                <h2>كشف حساب تفصيلي</h2>
                                <p>Statement of Account</p>
                            </div>
                        </div>

                        <hr className="print-divider" />

                        {/* معلومات الشريك والفترة */}
                        <div className="print-meta-grid">
                            <div className="meta-box">
                                <span className="meta-label">اسم الحساب (الشريك):</span>
                                <strong className="meta-value">{partnerName || 'غير محدد'}</strong>
                            </div>
                            <div className="meta-box">
                                <span className="meta-label">تاريخ الإصدار:</span>
                                <strong className="meta-value">{formatDate(new Date().toISOString())}</strong>
                            </div>
                            <div className="meta-box">
                                <span className="meta-label">الفترة من:</span>
                                <strong className="meta-value">{dateFrom ? formatDate(dateFrom) : 'بداية التعامل'}</strong>
                            </div>
                            <div className="meta-box">
                                <span className="meta-label">الفترة إلى:</span>
                                <strong className="meta-value">{dateTo ? formatDate(dateTo) : 'حتى تاريخه'}</strong>
                            </div>
                        </div>

                        {/* الملخص المالي (Summary) */}
                        <div className="print-summary-box">
                            <div className="sum-col">
                                <span>الرصيد الافتتاحي</span>
                                <b style={{ color: openingBalance >= 0 ? THEME.success : THEME.danger }}>
                                    {formatCurrency(Math.abs(openingBalance))} <small>{openingBalance >= 0 ? '(له)' : '(عليه)'}</small>
                                </b>
                            </div>
                            <div className="sum-col">
                                <span>إجمالي الحركات (مدين/عليه)</span>
                                <b style={{ color: THEME.danger }}>{formatCurrency(totalDebit)}</b>
                            </div>
                            <div className="sum-col">
                                <span>إجمالي الحركات (دائن/له)</span>
                                <b style={{ color: THEME.success }}>{formatCurrency(totalCredit)}</b>
                            </div>
                            <div className="sum-col final-balance">
                                <span>الرصيد النهائي</span>
                                <b style={{ color: currentBalance >= 0 ? THEME.success : THEME.danger }}>
                                    {formatCurrency(Math.abs(currentBalance))} <small>{currentBalance >= 0 ? '(له)' : '(عليه)'}</small>
                                </b>
                            </div>
                        </div>

                        {/* جدول الحركات */}
                        <table className="print-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '12%' }}>التاريخ</th>
                                    <th style={{ width: '15%' }}>رقم المرجع/النوع</th>
                                    <th style={{ width: '35%' }}>البيان</th>
                                    <th style={{ width: '12%' }}>مدين (عليه)</th>
                                    <th style={{ width: '12%' }}>دائن (له)</th>
                                    <th style={{ width: '14%' }}>الرصيد</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* سطر الافتتاحي */}
                                <tr className="opening-row">
                                    <td>{dateFrom ? formatDate(dateFrom) : '---'}</td>
                                    <td>رصيد سابق</td>
                                    <td><strong>رصيد افتتاحي (ما قبل الفترة المختارة)</strong></td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td className="balance-cell">{formatCurrency(openingBalance)}</td>
                                </tr>
                                
                                {/* حركات كشف الحساب */}
                                {printLines.map((line, idx) => (
                                    <tr key={idx}>
                                        <td>{formatDate(line.date)}</td>
                                        <td><span className="type-badge">{line.v_type}</span></td>
                                        <td className="desc-cell">{line.description}</td>
                                        <td className="debit-cell">{line.debit > 0 ? formatCurrency(line.debit) : '-'}</td>
                                        <td className="credit-cell">{line.credit > 0 ? formatCurrency(line.credit) : '-'}</td>
                                        <td className="balance-cell" style={{ color: line.balance >= 0 ? THEME.success : THEME.danger }}>
                                            {formatCurrency(Math.abs(line.balance))}
                                            <span className="balance-dir">{line.balance >= 0 ? 'له' : 'عليه'}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* التوقيعات */}
                        <div className="print-signatures">
                            <div className="sig-box">
                                <p>المحاسب المختص</p>
                                <div className="sig-line"></div>
                            </div>
                            <div className="sig-box">
                                <p>المدير المالي</p>
                                <div className="sig-line"></div>
                            </div>
                            <div className="sig-box">
                                <p>توقيع المقر بالمصادقة (الشريك)</p>
                                <div className="sig-line"></div>
                            </div>
                        </div>

                    </div>
                </motion.div>

                <style>{`
                    .print-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 9999; display: flex; justify-content: center; overflow-y: auto; padding: 40px 20px; }
                    .print-modal-content { background: #f8fafc; padding: 20px; border-radius: 16px; width: 100%; max-width: 900px; height: fit-content; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
                    
                    .modal-header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: white; padding: 15px 25px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                    .btn-print { background: ${THEME.goldAccent}; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 900; cursor: pointer; font-family: inherit; }
                    .btn-close { background: #e2e8f0; color: #475569; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 900; cursor: pointer; font-family: inherit; }
                    
                    /* تنسيق ورقة A4 */
                    .a4-paper { background: white; padding: 40px; border-radius: 4px; box-shadow: 0 0 10px rgba(0,0,0,0.1); min-height: 1122px; margin: 0 auto; color: #000; font-family: 'Tajawal', sans-serif; direction: rtl; }
                    
                    .print-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
                    .company-info h1 { font-size: 22px; color: ${THEME.coffeeDark}; margin: 0 0 5px 0; font-weight: 900; }
                    .company-info p { margin: 2px 0; font-size: 13px; color: #475569; font-weight: 700; }
                    
                    .doc-title { text-align: left; }
                    .doc-title h2 { font-size: 24px; color: ${THEME.goldAccent}; margin: 0 0 5px 0; font-weight: 900; }
                    .doc-title p { margin: 0; color: #64748b; font-size: 14px; letter-spacing: 2px; }
                    
                    .print-divider { border: none; border-top: 2px solid ${THEME.goldAccent}; margin: 20px 0; opacity: 0.5; }
                    
                    .print-meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
                    .meta-box { display: flex; flex-direction: column; }
                    .meta-label { font-size: 11px; color: #64748b; font-weight: 800; margin-bottom: 4px; }
                    .meta-value { font-size: 13px; color: #0f172a; font-weight: 900; }
                    
                    .print-summary-box { display: flex; justify-content: space-between; margin-bottom: 30px; border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
                    .sum-col { flex: 1; padding: 15px; text-align: center; border-left: 1px solid #e2e8f0; background: white; }
                    .sum-col:last-child { border-left: none; }
                    .sum-col span { display: block; font-size: 12px; color: #64748b; font-weight: 800; margin-bottom: 8px; }
                    .sum-col b { display: block; font-size: 18px; font-weight: 900; }
                    .sum-col small { font-size: 11px; font-weight: 700; }
                    .final-balance { background: #f8fafc; }
                    
                    .print-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                    .print-table th { background: ${THEME.coffeeDark}; color: white; padding: 12px 10px; text-align: right; font-size: 13px; font-weight: 900; border: 1px solid ${THEME.coffeeDark}; }
                    .print-table td { padding: 10px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 700; color: #1e293b; }
                    .print-table tr:nth-child(even) { background: #f8fafc; }
                    
                    .opening-row td { background: #fffbeb !important; font-weight: 900 !important; }
                    .type-badge { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
                    .debit-cell { color: ${THEME.danger}; text-align: center; font-weight: 900 !important; }
                    .credit-cell { color: ${THEME.success}; text-align: center; font-weight: 900 !important; }
                    .balance-cell { text-align: center; font-weight: 900 !important; background: rgba(0,0,0,0.02); }
                    .balance-dir { display: inline-block; margin-right: 5px; font-size: 9px; padding: 2px 4px; background: #e2e8f0; border-radius: 4px; }
                    
                    .print-signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 30px; }
                    .sig-box { text-align: center; width: 25%; }
                    .sig-box p { font-size: 13px; font-weight: 900; color: #475569; margin-bottom: 40px; }
                    .sig-line { border-bottom: 1px dashed #94a3b8; width: 100%; }

                    /* 🖨️ إعدادات الطباعة الحقيقية */
                    @media print {
                        body * { visibility: hidden; }
                        .print-modal-overlay { position: absolute; left: 0; top: 0; background: transparent; padding: 0; overflow: visible; }
                        .print-modal-content { box-shadow: none; border-radius: 0; max-width: 100%; }
                        .no-print { display: none !important; }
                        .a4-paper { visibility: visible; box-shadow: none; padding: 0; margin: 0; width: 100%; min-height: auto; }
                        .a4-paper * { visibility: visible; }
                        @page { size: A4 portrait; margin: 15mm; }
                    }
                `}</style>
            </div>
        </AnimatePresence>
    );
}