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
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: '#e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', padding: '40px 20px', direction: 'rtl' }}>
            
            {/* 🖨️ أزرار التحكم (لا تظهر في الطباعة) */}
            <div className="no-print" style={{ display: 'flex', gap: '15px', marginBottom: '20px', width: '210mm' }}>
                <button onClick={() => window.print()} style={{ flex: 1, padding: '15px', background: THEME.primary, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '16px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                    🖨️ طباعة إذن التوريد
                </button>
                <button onClick={onClose} style={{ padding: '15px 30px', background: 'white', color: THEME.danger, border: '2px solid #ef4444', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}>
                    إلغاء وإغلاق
                </button>
            </div>

            {/* 📄 ورقة الطباعة (A4 Size) */}
            <div className="print-page" style={{ width: '210mm', minHeight: '297mm', background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', color: 'black' }}>
                
                {/* هيدر الشركة */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1e293b', paddingBottom: '20px', marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ margin: 0, color: '#1e293b', fontSize: '28px', fontWeight: 900 }}>رواسي اليسر للمقاولات</h1>
                        <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '14px', fontWeight: 800 }}>إدارة المشتريات والمخازن</p>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <h2 style={{ margin: 0, color: THEME.primary, fontSize: '24px', fontWeight: 900 }}>إذن إضافة خامات (وارد)</h2>
                        <p style={{ margin: '5px 0 0 0', fontWeight: 900 }}>التاريخ: {masterData.exp_date}</p>
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
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                    <thead>
                        <tr style={{ background: '#1e293b', color: 'white' }}>
                            <th style={styles.th}>م</th>
                            <th style={styles.th}>اسم الخامة / البيان</th>
                            <th style={styles.th}>الكمية</th>
                            <th style={styles.th}>الوحدة</th>
                            <th style={styles.th}>سعر الوحدة</th>
                            <th style={styles.th}>الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        {receiptItems.map((item: any, idx: number) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={styles.td}>{idx + 1}</td>
                                <td style={{ ...styles.td, fontWeight: 900 }}>{item.work_item}</td>
                                <td style={styles.td}>{item.quantity}</td>
                                <td style={styles.td}>{item.unit}</td>
                                <td style={styles.td}>{formatCurrency(item.unit_price)}</td>
                                <td style={{ ...styles.td, fontWeight: 900, color: THEME.primary }}>{formatCurrency(item.total_price)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* الإجمالي النهائي */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '50px' }}>
                    <div style={{ width: '300px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '2px solid #1e293b', textAlign: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#64748b' }}>إجمالي قيمة الإذن</span>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', marginTop: '5px' }}>{formatCurrency(totalAmount)}</div>
                    </div>
                </div>

                {/* التوقيعات */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', textAlign: 'center', marginTop: '50px' }}>
                    <div>
                        <p style={{ fontWeight: 900, color: '#64748b', borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px' }}>أمين المخزن (المستلم)</p>
                        <div style={{ height: '60px' }}></div>
                    </div>
                    <div>
                        <p style={{ fontWeight: 900, color: '#64748b', borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px' }}>مهندس الموقع (الاعتماد)</p>
                        <div style={{ height: '60px' }}></div>
                    </div>
                    <div>
                        <p style={{ fontWeight: 900, color: '#64748b', borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px' }}>المدير المالي (التوجيه)</p>
                        <div style={{ height: '60px' }}></div>
                    </div>
                </div>

            </div>

            {/* 🖨️ ستايلات الطباعة لضمان اختفاء الأزرار وراء الكواليس */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body * { visibility: hidden; }
                    .no-print { display: none !important; }
                    .print-page, .print-page * { visibility: visible; }
                    .print-page { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; padding: 0; }
                }
            `}} />
        </div>,
        document.body
    );
}

const styles = {
    th: { padding: '15px 10px', textAlign: 'right' as const, fontWeight: 900, fontSize: '14px' },
    td: { padding: '15px 10px', fontSize: '14px', color: '#334155' }
};