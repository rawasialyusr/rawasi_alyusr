"use client";
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency } from '@/lib/helpers';
import { THEME } from '@/lib/theme';

export default function MaterialReceiptPrintModal({ isOpen, onClose, logic, receiptId }: any) {
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => { 
        setMounted(true); 
    }, []);

    if (!isOpen || !mounted || !receiptId) return null;

    // 🚀 تجميع أصناف الفاتورة الحالية من الداتا المحملة
    const receiptItems = logic.data.filter((item: any) => item.receipt_id === receiptId);
    if (receiptItems.length === 0) return null;

    // استخراج بيانات الرأس (الماستر) من أول صنف
    const masterData = receiptItems[0];
    const totalAmount = receiptItems.reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0);

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', padding: '40px 20px', direction: 'rtl' }}>
            
            {/* 🖨️ ستايلات الطباعة */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body * { visibility: hidden; }
                    .no-print { display: none !important; }
                    .print-page, .print-page * { visibility: visible; }
                    .print-page { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%; 
                        box-shadow: none !important; 
                        padding: 0 !important; 
                        margin: 0 !important; 
                        background: white !important;
                    }
                    @page { size: A4 portrait; margin: 10mm; }
                    .modern-table { page-break-inside: auto; }
                    .modern-table tr { page-break-inside: avoid; page-break-after: auto; }
                }
                .modern-table th, .modern-table td { padding: 12px; text-align: center; border: 1px solid #cbd5e1; }
                .modern-table th { background: #1e293b; color: white; font-weight: 900; }
                .modern-table td { color: #334155; font-size: 14px; font-weight: 700; }
            `}} />

            {/* 🖨️ أزرار التحكم */}
            <div className="no-print" style={{ display: 'flex', gap: '15px', marginBottom: '20px', width: '100%', maxWidth: '210mm' }}>
                <button onClick={() => window.print()} style={{ flex: 1, padding: '15px', background: THEME.primary, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '16px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                    🖨️ طباعة إذن التوريد
                </button>
                <button onClick={onClose} style={{ padding: '15px 30px', background: 'white', color: '#ef4444', border: '2px solid #ef4444', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}>
                    إلغاء وإغلاق
                </button>
            </div>

            {/* 📄 ورقة الطباعة (A4 Size) */}
            <div className="print-page" style={{ width: '100%', maxWidth: '210mm', minHeight: '297mm', background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', color: 'black' }}>
                
                {/* هيدر الشركة */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1e3a8a', paddingBottom: '20px', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <img src="/logo.png" alt="Rawasi Logo" style={{ height: '60px', objectFit: 'contain' }} onError={(e: any) => e.target.style.display = 'none'} />
                        <div>
                            <h1 style={{ margin: 0, color: '#1e3a8a', fontSize: '28px', fontWeight: 900 }}>RAWASI <span style={{ color: '#f59e0b' }}>AL-YUSR</span></h1>
                            <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '14px', fontWeight: 800 }}>إدارة المشتريات والمخازن</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <h2 style={{ margin: 0, color: '#1e3a8a', fontSize: '22px', fontWeight: 900, background: '#f1f5f9', padding: '8px 15px', borderRadius: '8px' }}>إذن استلام خامات (وارد)</h2>
                        <p style={{ margin: '10px 0 0 0', fontWeight: 900, fontSize: '14px' }}>التاريخ: {masterData.exp_date}</p>
                        <p style={{ margin: '5px 0 0 0', fontWeight: 900, fontSize: '14px', color: '#dc2626' }}>رقم الإذن: {receiptId.slice(-6).toUpperCase()}</p>
                    </div>
                </div>

                {/* بيانات الفاتورة */}
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #e2e8f0' }}>
                    <div>
                        <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 800, color: '#64748b' }}>المشروع الموجه له:</p>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#1e293b' }}>🏢 {masterData.project?.Property || '---'}</h3>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 800, color: '#64748b' }}>المورد / التاجر:</p>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#1e293b' }}>👤 {masterData.supplier?.name || '---'}</h3>
                    </div>
                </div>

                {/* جدول الأصناف */}
                <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '5%' }}>م</th>
                            <th style={{ width: '40%', textAlign: 'right' }}>اسم الخامة / البيان</th>
                            <th style={{ width: '10%' }}>الكمية</th>
                            <th style={{ width: '10%' }}>الوحدة</th>
                            <th style={{ width: '15%' }}>سعر الوحدة</th>
                            <th style={{ width: '20%' }}>الإجمالي (SAR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {receiptItems.map((item: any, idx: number) => (
                            <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td style={{ textAlign: 'right', fontWeight: 900 }}>{item.work_item}</td>
                                <td style={{ fontWeight: 900, color: '#2563eb' }}>{item.quantity}</td>
                                <td>{item.unit}</td>
                                <td>{formatCurrency(item.unit_price)}</td>
                                <td style={{ fontWeight: 900, color: '#166534' }}>{formatCurrency(item.total_price)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* الإجمالي والإقرار */}
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '50px' }}>
                    <div style={{ flex: 1.5, background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px dashed #cbd5e1', fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
                        <strong style={{ color: '#0f172a', display: 'block', marginBottom: '5px' }}>إقرار استلام مخزني:</strong>
                        أقر أنا أمين المخزن / مهندس الموقع الموقع أدناه، باستلام كافة المواد والخامات المذكورة أعلاه بحالة جيدة ومطابقة للمواصفات، وقد تم إيداعها بعهدة المشروع المذكور.
                    </div>
                    <div style={{ flex: 1, background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '2px solid #1e293b', textAlign: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#64748b' }}>إجمالي قيمة الإذن</span>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b', margin: '5px 0' }}>{formatCurrency(totalAmount)}</div>
                    </div>
                </div>

                {/* التوقيعات */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', textAlign: 'center', marginTop: 'auto', paddingTop: '30px', borderTop: '2px dashed #e2e8f0' }}>
                    <div>
                        <p style={{ fontWeight: 900, color: '#475569', marginBottom: '40px', fontSize: '14px' }}>أمين المخزن (المستلم)</p>
                        <div style={{ borderBottom: '1.5px solid #94a3b8', width: '80%', margin: '0 auto' }}></div>
                    </div>
                    <div>
                        <p style={{ fontWeight: 900, color: '#475569', marginBottom: '40px', fontSize: '14px' }}>مهندس الموقع (الاعتماد)</p>
                        <div style={{ borderBottom: '1.5px solid #94a3b8', width: '80%', margin: '0 auto' }}></div>
                    </div>
                    <div>
                        <p style={{ fontWeight: 900, color: '#475569', marginBottom: '40px', fontSize: '14px' }}>المدير المالي (التوجيه)</p>
                        <div style={{ borderBottom: '1.5px solid #94a3b8', width: '80%', margin: '0 auto' }}></div>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
}