"use client";
import React, { useRef, useState, useEffect } from 'react'; 
import { THEME } from '@/lib/theme';
import { formatCurrency, formatDate, tafqeet } from '@/lib/helpers';
import ZatcaQRCode from './ZatcaQRCode';
import { supabase } from '@/lib/supabase'; 

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any; 
}

export default function InvoicePrintModal({ isOpen, onClose, data }: InvoicePrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [fetchedPartner, setFetchedPartner] = useState<any>(null);

  useEffect(() => {
    const fetchPartnerData = async () => {
      if (data?.partner_id) {
        const { data: partnerData, error } = await supabase
          .from('partners')
          .select('name, vat_number, address') 
          .eq('id', data.partner_id)
          .single();
        if (partnerData) setFetchedPartner(partnerData);
      }
    };
    if (isOpen && data) fetchPartnerData();
  }, [data, isOpen]);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    const printWindow = window.open('', '_blank', 'width=1000,height=1000');
    
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>فاتورة - ${data.invoice_number}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
            <style>
              @page { size: A4; margin: 0; }
              html, body { height: 100%; margin: 0; padding: 0; background: white; font-family: 'Cairo', sans-serif; font-size: 12.5px; }
              * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
              
              .page-wrapper {
                display: flex;
                flex-direction: column;
                height: 282mm; 
                padding: 10mm 15mm;
                position: relative;
                overflow: hidden;
              }

              .watermark-bg {
                position: absolute;
                top: 55%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 75%; 
                opacity: 0.1; 
                z-index: 0;
                pointer-events: none;
              }

              .content-layer {
                position: relative;
                z-index: 1;
                display: flex;
                flex-direction: column;
                height: 100%;
              }

              table { width: 100%; border-collapse: collapse; margin: 10px 0; background: transparent; }
              th, td { border: 1px solid #ddd; padding: 7px; text-align: center; }
              th { background-color: ${THEME.primary} !important; color: white !important; font-weight: 700; }
              h1, h2, h3, h4, p { margin: 1px 0; }
              
              .footer-area { 
                margin-top: auto; 
                border-top: 2px solid ${THEME.primary}; 
                padding-top: 10px; 
                display: flex; 
                justify-content: space-between; 
                font-size: 11px; 
                color: #444;
              }
            </style>
          </head>
          <body>
            <div class="page-wrapper">
               <img src="/in-Logo.png" class="watermark-bg" />
               <div class="content-layer">
                  ${content}
               </div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(() => { window.print(); window.close(); }, 400);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const invoiceLines = (data.lines && data.lines.length > 0) ? data.lines : [
    {
      description: data.description || data.note || 'أعمال مقاولات / بند غير محدد',
      unit: data.unit || '---',
      quantity: data.quantity || 1,
      unit_price: data.unit_price || 0,
      total_price: data.line_total || data.total_amount || 0
    }
  ];

  const customerName = fetchedPartner?.name || data.client_name || 'عميل نقدي';
  const customerVat = fetchedPartner?.vat_number || '---';
  const customerAddress = fetchedPartner?.address || 'المملكة العربية السعودية';

  // 🚀 شروط التحقق من الأختام والتواقيع
  const showStamp = data.status === 'مُعتمد' || data.is_approved;
  const showAccountant = !!data.accountant_name;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(5px)', padding: '20px' }}>
      <div style={{ background: 'white', width: '100%', maxWidth: '900px', maxHeight: '95vh', borderRadius: '15px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ padding: '15px 25px', background: THEME.primary, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'white', margin: 0, fontWeight: 900 }}>🖨️ معاينة طباعة الفاتورة</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handlePrint} style={{ padding: '8px 20px', background: THEME.accent, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 900 }}>طباعة / حفظ PDF</button>
            <button onClick={onClose} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>إغلاق</button>
          </div>
        </div>
        <div ref={printRef} style={{ flex: 1, overflowY: 'auto', backgroundColor: 'white', direction: 'rtl', padding: '10px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: `2px solid ${THEME.primary}`, paddingBottom: '10px' }}>
             <div>
                <img src="/in-Logo.png"alt="Logo"style={{height: '65px',marginRight: '70px',display: 'block' }} />
                <h2 style={{ margin: '5px 0', color: THEME.primary, fontWeight: 900 }}>مؤسسة طفله عبدالله السبيعي للمقاولات</h2>
                <div style={{ fontSize: '12px' }}>
                   <p>الرقم الضريبي: 312487477800003</p>
                   <p>الرقم الموحد :7051013519 </p>
                </div>
             </div>
             <div style={{ textAlign: 'left' }}>
                <h1 style={{ color: THEME.primary, margin: 0, fontSize: '24px' }}>فاتورة ضريبية</h1>
                <p style={{ color: '#666', fontSize: '13px' }}>Tax Invoice</p>
                <div style={{ marginTop: '5px' }}>
                   <ZatcaQRCode record={data} />
                </div>    
             </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
             <div style={{ padding: '10px', border: '1px solid #eee', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 5px 0', borderBottom: '1px solid #eee', fontSize: '13px' }}>بيانات العميل</h4>
                <p><strong>الاسم:</strong> {customerName}</p>
                <p><strong>الضريبة:</strong> {customerVat}</p>
                <p><strong>العنوان:</strong> {customerAddress}</p>
             </div>
             <div style={{ padding: '10px', border: '1px solid #eee', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 5px 0', borderBottom: '1px solid #eee', fontSize: '13px' }}>بيانات الفاتورة</h4>
                <p><strong>رقم الفاتورة:</strong> #{data.invoice_number}</p>
                <p><strong>تاريخ الإصدار:</strong> {formatDate(data.date)}</p>
                <p><strong>المشروع:</strong> {data._projectNames || '---'}</p>
             </div>
          </div>

          <table style={{ width: '100%', marginBottom: '10px' }}>
             <thead>
                <tr style={{ background: THEME.primary, color: 'white' }}>
                   <th>م</th>
                   <th style={{ textAlign: 'right' }}>البيان</th>
                   <th>الوحدة</th>
                   <th>الكمية</th>
                   <th>السعر</th>
                   <th>الإجمالي</th>
                </tr>
             </thead>
             <tbody>
                {invoiceLines.map((line: any, index: number) => (
                  <tr key={index}>
                     <td>{index + 1}</td>
                     <td style={{ textAlign: 'right' }}>{line.description}</td>
                     <td>{line.unit}</td>
                     <td>{line.quantity}</td>
                     <td>{formatCurrency(line.unit_price)}</td>
                     <td>{formatCurrency(line.total_price)}</td>
                  </tr>
                ))}
             </tbody>
          </table>

          {/* مربع المجموع */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '30px' }}>
             <div style={{ width: '50%', padding: '12px', border: `1px solid #ddd`, borderRadius: '8px', background: '#fcfcfc' }}>
                <p style={{ fontWeight: 900, fontSize: '12px' }}>المبلغ كتابة:</p>
                <p style={{ color: THEME.primary, fontWeight: 'bold' }}> {tafqeet(data.total_amount || data.net_amount)}</p>
             </div>
             <div style={{ width: '40%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span>الإجمالي:</span><strong>{formatCurrency(data.line_total || data.total_amount)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span>الضريبة (15%):</span><strong>{formatCurrency(data.tax_amount)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: THEME.primary, color: 'white', borderRadius: '8px', marginTop: '10px' }}>
                   <span style={{ fontWeight: 900 }}>الصافي المستحق:</span>
                   <span style={{ fontWeight: 900, fontSize: '18px' }}>{formatCurrency(data.total_amount)}</span>
                </div>
             </div>
          </div>

          {/* 🚀 قسم الأختام والتواقيع: لن يظهر هذا الـ Div بالكامل إلا إذا وجد ختم أو توقيع */}
          {(showStamp || showAccountant) && (
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '40px' }}>
               {showStamp && (
                 <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 900, fontSize: '13px' }}>ختم الشركة</p>
                    <img src="/company-stamp.png" style={{ maxHeight: '75px', marginTop: '5px' }} />
                 </div>
               )}
               
               {showAccountant && (
                 <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 900, fontSize: '13px' }}>توقيع المحاسب</p>
                    <p style={{ fontFamily: 'cursive', fontSize: '18px', color: THEME.primary, marginTop: '10px' }}>{data.accountant_name}</p>
                 </div>
               )}
            </div>
          )}

          <div className="footer-area">
             <div><strong>العنوان:</strong> الدمام - حي الفيصليه - شارع السعيره</div>
             <div><strong>جوال:</strong> 0578018944</div>
             <div><strong>جوال:</strong> 0547606876</div>
             <div>rawasi.alyusr@gmail.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}