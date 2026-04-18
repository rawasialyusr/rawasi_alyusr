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
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchPartnerData = async () => {
      if (data?.partner_id) {
        const { data: partnerData } = await supabase
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
    const content = printRef.current?.outerHTML; 
    const invNumber = data?.invoice_number || 'بدون_رقم';
    const fileName = `فاتورة_${invNumber}`;
    const printWindow = window.open('', '_blank', 'width=1000,height=1000');
    
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>${fileName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
            <style>
              @page { size: A4 portrait; margin: 0; }
              body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; font-family: 'Cairo', sans-serif; }
              * { box-sizing: border-box; }
              
              /* 🚀 إجبار المتصفح على مقاس ورقة واحدة في الطباعة */
              #invoice-paper { 
                 box-shadow: none !important; 
                 border: none !important; 
                 width: 210mm !important; 
                 height: 296.5mm !important; /* طول ثابت لمنع رفع الفوتر */
                 padding: 10mm 15mm !important; 
              }
            </style>
          </head>
          <body>
            ${content}
            <script>
              window.onload = function() {
                document.title = "${fileName}"; 
                setTimeout(() => { window.print(); window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownloadPDF = async () => {
    const element = printRef.current;
    if (!element) return;

    setIsDownloading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const invNumber = data?.invoice_number || 'بدون_رقم';
      const fileName = `فاتورة_${invNumber}.pdf`;

      const opt = {
        margin:       0, // بدون هوامش خارجية لأن الورقة مضبوطة من الداخل
        filename:     fileName,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  {
          scale: 2, 
          useCORS: true,
          scrollY: 0,
          windowWidth: element.scrollWidth 
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      setTimeout(async () => {
        await html2pdf().set(opt).from(element).save();
        setIsDownloading(false);
      }, 1000);

    } catch (error) {
      console.error("PDF Error:", error);
      alert("حدث خطأ أثناء تحميل الملف.");
      setIsDownloading(false);
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

  const showStamp = data?.status === 'مُعتمد'; 
  const showAccountant = !!data?.accountant_name;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(5px)', padding: '20px' }}>
      <div style={{ background: 'white', width: '100%', maxWidth: '950px', maxHeight: '95vh', borderRadius: '15px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ padding: '15px 25px', background: THEME.primary, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'white', margin: 0, fontWeight: 900 }}>🖨️ معاينة طباعة الفاتورة</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleDownloadPDF} disabled={isDownloading} style={{ padding: '8px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: isDownloading ? 'wait' : 'pointer', fontWeight: 900 }}>
                {isDownloading ? '⏳ جاري التجهيز...' : '📥 تحميل PDF'}
            </button>
            <button onClick={handlePrint} style={{ padding: '8px 20px', background: THEME.accent, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 900 }}>طباعة</button>
            <button onClick={onClose} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>إغلاق</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#e2e8f0', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* 🚀 الورقة البيضاء: طول ثابت + Flexbox لضمان بقاء الفوتر في الأسفل */}
          <div 
            id="invoice-paper"
            ref={printRef} 
            style={{ 
              width: '210mm', 
              height: '296.5mm', // 🚀 سر الصفحة الواحدة: الطول الثابت بيمنع الصفحة التانية وبيمنع الفوتر يطلع للنص
              overflow: 'hidden', // لمنع أي عنصر من الهروب لصفحة تانية
              display: 'flex', 
              flexDirection: 'column', 
              backgroundColor: 'white', 
              position: 'relative', 
              padding: '10mm 15mm', 
              direction: 'rtl', 
              fontFamily: "'Cairo', sans-serif",
              boxSizing: 'border-box',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)' 
            }}
          >
            
            <img 
              src="/in-Logo.png" 
              alt="Watermark" 
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '75%', opacity: 0.08, pointerEvents: 'none', zIndex: 0 }} 
            />

            {/* 🚀 المحتوى الأساسي يأخذ المساحة المتبقية ويزق الفوتر للأسفل */}
            <div style={{ flex: 1, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: `2px solid ${THEME.primary}`, paddingBottom: '10px' }}>
                 <div>
                    <img src="/in-Logo.png" alt="Logo" style={{ height: '65px', marginRight: '70px', display: 'block' }} />
                    <h2 style={{ margin: '5px 0', color: THEME.primary, fontWeight: 900, fontSize: '20px' }}>مؤسسة طفله عبدالله السبيعي للمقاولات</h2>
                    <div style={{ fontSize: '12px' }}>
                       <p style={{ margin: '2px 0' }}>الرقم الضريبي: 312487477800003</p>
                       <p style={{ margin: '2px 0' }}>الرقم الموحد : 7051013519 </p>
                    </div>
                 </div>
                 <div style={{ textAlign: 'left' }}>
                    <h1 style={{ color: THEME.primary, margin: 0, fontSize: '24px' }}>فاتورة ضريبية</h1>
                    <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>Tax Invoice</p>
                    <div style={{ marginTop: '5px' }}>
                       <ZatcaQRCode record={data} />
                    </div>    
                 </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                 <div style={{ padding: '10px', border: '1px solid #eee', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 5px 0', borderBottom: '1px solid #eee', fontSize: '13px', paddingBottom: '5px' }}>بيانات العميل</h4>
                    <p style={{ margin: '3px 0', fontSize: '12px' }}><strong>الاسم:</strong> {customerName}</p>
                    <p style={{ margin: '3px 0', fontSize: '12px' }}><strong>الضريبة:</strong> {customerVat}</p>
                    <div style={{ marginTop: '3px', fontSize: '12px', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                       <strong>العنوان:</strong>
                       <span style={{ flex: 1, whiteSpace: 'normal', lineHeight: '1.6', direction: 'rtl', unicodeBidi: 'isolate' }}>
                         <bdi dir="rtl">{customerAddress}</bdi>
                       </span>
                    </div>
                 </div>
                 <div style={{ padding: '10px', border: '1px solid #eee', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 5px 0', borderBottom: '1px solid #eee', fontSize: '13px', paddingBottom: '5px' }}>بيانات الفاتورة</h4>
                    <p style={{ margin: '3px 0', fontSize: '12px' }}><strong>رقم الفاتورة:</strong> #{data.invoice_number}</p>
                    <p style={{ margin: '3px 0', fontSize: '12px' }}><strong>تاريخ الإصدار:</strong> {formatDate(data.date)}</p>
                    
                    <div style={{ marginTop: '3px', fontSize: '12px', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                       <strong>المشروع:</strong>
                       <span style={{ flex: 1, whiteSpace: 'normal', lineHeight: '1.6', direction: 'rtl', unicodeBidi: 'isolate' }}>
                         <bdi dir="rtl">{data._projectNames || '---'}</bdi>
                       </span>
                    </div>
                 </div>
              </div>

              <table style={{ width: '100%', marginBottom: '10px', borderCollapse: 'collapse', fontSize: '12px' }}>
                 <thead>
                    <tr style={{ background: THEME.primary, color: 'white' }}>
                       <th style={{ border: '1px solid #ddd', padding: '7px' }}>م</th>
                       <th style={{ border: '1px solid #ddd', padding: '7px', textAlign: 'right' }}>البيان</th>
                       <th style={{ border: '1px solid #ddd', padding: '7px' }}>الوحدة</th>
                       <th style={{ border: '1px solid #ddd', padding: '7px' }}>الكمية</th>
                       <th style={{ border: '1px solid #ddd', padding: '7px' }}>السعر</th>
                       <th style={{ border: '1px solid #ddd', padding: '7px' }}>الإجمالي</th>
                    </tr>
                 </thead>
                 <tbody>
                    {invoiceLines.map((line: any, index: number) => (
                      <tr key={index}>
                         <td style={{ border: '1px solid #ddd', padding: '7px', textAlign: 'center' }}>{index + 1}</td>
                         <td style={{ border: '1px solid #ddd', padding: '7px', textAlign: 'right', whiteSpace: 'normal', lineHeight: '1.6', direction: 'rtl', unicodeBidi: 'isolate' }}>
                           <bdi dir="rtl">{line.description}</bdi>
                         </td>
                         <td style={{ border: '1px solid #ddd', padding: '7px', textAlign: 'center' }}>{line.unit}</td>
                         <td style={{ border: '1px solid #ddd', padding: '7px', textAlign: 'center' }}>{line.quantity}</td>
                         <td style={{ border: '1px solid #ddd', padding: '7px', textAlign: 'center' }}>{formatCurrency(line.unit_price)}</td>
                         <td style={{ border: '1px solid #ddd', padding: '7px', textAlign: 'center' }}>{formatCurrency(line.total_price)}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '20px' }}>
                 <div style={{ width: '48%', padding: '15px', border: `1px solid #e2e8f0`, borderRadius: '10px', background: '#f8fafc' }}>
                    <p style={{ fontWeight: 900, fontSize: '13px', marginBottom: '8px', color: '#64748b' }}>المبلغ الإجمالي كتابةً:</p>
                    <p style={{ color: THEME.primary, fontWeight: 900, fontSize: '14px', lineHeight: '1.8', margin: 0 }}> 
                      {tafqeet(data.total_amount || data.net_amount)} 
                    </p>
                 </div>

                 <div style={{ width: '48%', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                       <span style={{ color: '#475569' }}>إجمالي الأعمال:</span>
                       <strong>{formatCurrency(data.line_total || data.total_amount || 0)}</strong>
                    </div>

                    {data.materials_discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', color: '#ef4444' }}>
                         <span>يُخصم (مواد):</span>
                         <strong style={{ direction: 'ltr' }}>- {formatCurrency(data.materials_discount)}</strong>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                       <span style={{ color: '#475569', fontWeight: 'bold' }}>الإجمالي الخاضع للضريبة:</span>
                       <strong style={{ color: THEME.primary }}>{formatCurrency(data.taxable_amount || data.line_total || data.total_amount || 0)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                       <span style={{ color: '#475569' }}>ضريبة القيمة المضافة (15%):</span>
                       <strong>{formatCurrency(data.tax_amount || 0)}</strong>
                    </div>

                    {data.guarantee_amount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', color: '#ef4444' }}>
                         <span>يُخصم ضمان أعمال ({data.guarantee_percent}%):</span>
                         <strong style={{ direction: 'ltr' }}>- {formatCurrency(data.guarantee_amount)}</strong>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', background: THEME.primary, color: 'white', borderRadius: '10px', marginTop: '12px' }}>
                       <span style={{ fontWeight: 900, fontSize: '14px' }}>الصافي المستحق:</span>
                       <span style={{ fontWeight: 900, fontSize: '16px' }}>{formatCurrency(data.total_amount)}</span>
                    </div>
                 </div>
              </div>

              {(showStamp || showAccountant) && (
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '30px' }}>
                   {showStamp ? (
                     <div style={{ textAlign: 'center' }}>
                        <p style={{ fontWeight: 900, fontSize: '13px', margin: '0 0 5px 0' }}>ختم الشركة</p>
                        <img src="/company-stamp.png" alt="ختم الشركة" style={{ maxHeight: '75px' }} />
                     </div>
                   ) : (
                     <div style={{ width: '100px' }}></div> 
                   )}
                   
                   {showAccountant ? (
                     <div style={{ textAlign: 'center' }}>
                        <p style={{ fontWeight: 900, fontSize: '13px', margin: '0 0 5px 0' }}>توقيع المحاسب</p>
                        <p style={{ fontFamily: 'cursive', fontSize: '18px', color: THEME.primary, margin: 0 }}>{data.accountant_name}</p>
                     </div>
                   ) : (
                     <div style={{ width: '100px' }}></div>
                   )}
                </div>
              )}
            </div>

            {/* 🚀 الفوتر ملزوق في الأسفل دائمًا باستخدام marginTop: auto */}
            <div style={{ 
              marginTop: 'auto', // ده اللي بيزق الفوتر لقاع الورقة (لأن الورقة طولها ثابت)
              borderTop: `2px solid ${THEME.primary}`, 
              paddingTop: '10px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '11px', 
              color: '#444',
              position: 'relative',
              zIndex: 10
            }}>
               <div><strong>العنوان:</strong> الدمام - حي الفيصليه - شارع السعيره</div>
               <div><strong>جوال:</strong> 0578018944</div>
               <div><strong>جوال:</strong> 0547606876</div>
               <div>rawasi.alyusr@gmail.com</div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}