"use client";
import React, { useRef, useState, useEffect } from 'react'; 
import { createPortal } from 'react-dom'; // 🚀 استدعاء البورتال
import { THEME } from '@/lib/theme';
import { formatCurrency, formatDate, tafqeet } from '@/lib/helpers';
import ZatcaQRCode from './ZatcaQRCode';
import { supabase } from '@/lib/supabase'; 
import { QRCodeSVG } from 'qrcode.react';

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any; 
}

export default function InvoicePrintModal({ isOpen, onClose, data }: InvoicePrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [fetchedPartner, setFetchedPartner] = useState<any>(null);
  const [fetchedProjects, setFetchedProjects] = useState<string>(''); 
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false); // 🚀 للتأكد من الرندر في المتصفح

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (data?.partner_id) {
          const { data: partnerData } = await supabase
            .from('partners')
            .select('name, vat_number, address') 
            .eq('id', data.partner_id)
            .single();
          if (partnerData) setFetchedPartner(partnerData);
        }

        if (data?.project_ids && data.project_ids.length > 0) {
            const { data: projectsData } = await supabase
                .from('projects')
                .select('Property')
                .in('id', data.project_ids);
            if (projectsData) {
                setFetchedProjects(projectsData.map(p => p.Property).join(' - '));
            }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, username, full_name, signature_url')
            .eq('id', session.user.id)
            .single();
          if (profile) setCurrentUser(profile);
        }
      } catch (err) {
        console.error("Error fetching print data", err);
      }
    };

    if (isOpen && data?.id) fetchData();
  }, [data?.id, isOpen]);

  if (!isOpen || !data || !mounted) return null;

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
              body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; font-family: 'Cairo', sans-serif; color: #0f172a; }
              * { box-sizing: border-box; }
              
              .a4-paper { 
                 box-shadow: none !important; 
                 border: none !important; 
                 width: 210mm !important; 
                 height: 296.5mm !important; 
                 overflow: hidden !important; 
                 padding: 12mm 15mm !important; 
                 margin: 0 !important;
                 page-break-after: avoid !important;
              }
              
              .print-table th { background-color: #f8fafc !important; color: #475569 !important; border-bottom: 2px solid #e2e8f0 !important; }
              .print-table td { border-bottom: 1px solid #f1f5f9 !important; }
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
        margin:       0, 
        filename:     fileName,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true, scrollY: 0, windowWidth: element.scrollWidth },
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

  const showStamp = currentUser?.role === 'admin' || data?.is_stamped || data?.status === 'مُعتمد'; 
  const showAccountant = currentUser?.role !== 'admin' || !!data?.accountant_name;
  
  const accountantName = currentUser?.role !== 'admin' 
      ? (currentUser?.full_name || currentUser?.username || 'توقيع إلكتروني') 
      : (data?.accountant_name || '');

  const signatureQRData = `
تم الاعتماد بواسطة: ${accountantName}
رقم الفاتورة: ${data?.invoice_number || '---'}
تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}
المنصة: نظام رواسي المالي
  `.trim();

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.style.display = 'none';
  };

  // 📦 محتوى المودال
  const modalContent = (
    <div className="warm-portal-overlay-fullscreen" onClick={onClose}>
      
      <style>{`
        /* 🚀 البلور الدافئ السينمائي */
        .warm-portal-overlay-fullscreen {
            position: fixed !important;
            top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
            width: 100vw !important; height: 100vh !important;
            background: radial-gradient(circle at center, rgba(139, 69, 19, 0.4) 0%, rgba(15, 7, 0, 0.9) 100%) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            display: flex !important; flex-direction: column; align-items: center !important; justify-content: flex-start !important;
            z-index: 999999999 !important;
            padding: 30px 20px;
            overflow: hidden;
        }

        .pdf-scroll-area { 
            width: 100%; 
            height: calc(100vh - 120px); 
            overflow-y: auto; 
            display: flex; 
            justify-content: center; 
            padding-bottom: 40px; 
        }
        .pdf-scroll-area::-webkit-scrollbar { display: none; }

        @keyframes modalScaleUp {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* 🎛️ شريط الأدوات الطائر (Floating Action Bar - Apple Style) */}
      <div onClick={(e) => e.stopPropagation()} style={{ animation: 'modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(30px)', padding: '10px 20px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', flexShrink: 0, border: '1px solid rgba(255,255,255,0.5)' }}>
        <span style={{ fontWeight: 900, color: THEME.primary, fontSize: '14px', marginRight: '10px' }}>معاينة الطباعة</span>
        <div style={{ width: '1px', height: '20px', background: '#cbd5e1' }}></div>
        <button onClick={handleDownloadPDF} disabled={isDownloading} style={{ padding: '8px 20px', background: 'transparent', color: THEME.primary, border: 'none', borderRadius: '50px', cursor: isDownloading ? 'wait' : 'pointer', fontWeight: 800, transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
            {isDownloading ? '⏳ جاري التجهيز...' : '📥 تحميل PDF'}
        </button>
        <button onClick={handlePrint} style={{ padding: '8px 25px', background: THEME.primary, color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 900, boxShadow: `0 4px 15px ${THEME.primary}40`, transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            طباعة الفاتورة
        </button>
        <button onClick={onClose} style={{ padding: '8px 20px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 800, transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'} onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}>
            إغلاق
        </button>
      </div>

      <div className="pdf-scroll-area">
        
        {/* 📄 الورقة البيضاء (Crisp White A4) */}
        <div 
          className="a4-paper"
          id="invoice-paper"
          ref={printRef} 
          onClick={(e) => e.stopPropagation()}
          style={{ 
            width: '210mm', 
            minHeight: '296.5mm', 
            backgroundColor: '#ffffff', 
            position: 'relative', 
            padding: '12mm 15mm', 
            direction: 'rtl', 
            fontFamily: "'Cairo', sans-serif",
            boxSizing: 'border-box',
            boxShadow: '0 30px 60px rgba(0,0,0,0.5)', /* ظل عميق لإبراز الورقة */
            borderRadius: '4px',
            color: '#0f172a',
            animation: 'modalScaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          
          <img 
            src="/in-Logo.png" 
            alt="Watermark" 
            onError={handleImageError}
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '70%', opacity: 0.03, pointerEvents: 'none', zIndex: 0, filter: 'grayscale(100%)' }} 
          />

          <div style={{ flex: 1, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* --- الهيدر النظيف (Clean Header) --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <img 
                      src="/in-Logo.png" 
                      alt="Logo" 
                      onError={handleImageError}
                      style={{ height: '75px', objectFit: 'contain' }} 
                    />
                    <div>
                      <h2 style={{ margin: '0 0 5px 0', color: THEME.primary, fontWeight: 900, fontSize: '20px', letterSpacing: '-0.5px' }}>مؤسسة طفله عبدالله السبيعي للمقاولات</h2>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'flex', gap: '15px' }}>
                         <span>الرقم الضريبي: <strong style={{color: '#334155'}}>312487477800003</strong></span>
                         <span>الرقم الموحد: <strong style={{color: '#334155'}}>7051013519</strong></span>
                      </div>
                    </div>
                 </div>
                 <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h1 style={{ color: '#0f172a', margin: '0 0 2px 0', fontSize: '24px', fontWeight: 900, letterSpacing: '-1px' }}>فاتورة ضريبية</h1>
                    <p style={{ color: '#94a3b8', fontSize: '11px', margin: '0 0 10px 0', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Tax Invoice</p>
                    <div style={{ padding: '2px', background: 'white', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
                       <ZatcaQRCode record={data} />
                    </div>    
                 </div>
            </div>

            {/* --- بيانات العميل والفاتورة (Minimalist Layout) --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', fontSize: '13px' }}>
                 <div style={{ flex: 1, paddingRight: '15px', borderRight: `3px solid ${THEME.accent}` }}>
                    <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 800, marginBottom: '8px' }}>مُصدرة إلى (BILLED TO)</div>
                    <div style={{ fontWeight: 900, fontSize: '16px', color: '#0f172a', marginBottom: '4px' }}>{customerName}</div>
                    <div style={{ color: '#475569', marginBottom: '2px' }}>الرقم الضريبي: <span style={{fontWeight: 700}}>{customerVat}</span></div>
                    <div style={{ color: '#475569' }}>العنوان: <span style={{fontWeight: 700}}>{customerAddress}</span></div>
                 </div>

                 <div style={{ flex: 1, paddingRight: '15px', borderRight: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 800, marginBottom: '8px' }}>تفاصيل الفاتورة (INVOICE DETAILS)</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#64748b' }}>رقم الفاتورة:</span>
                        <span style={{ fontWeight: 900, color: '#0f172a' }}>#{data.invoice_number}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#64748b' }}>تاريخ الإصدار:</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatDate(data.date)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>المشروع المرتبط:</span>
                        <span style={{ fontWeight: 700, color: '#0f172a', textAlign: 'left', maxWidth: '60%' }}>{fetchedProjects || data._projectNames || '---'}</span>
                    </div>
                 </div>
            </div>

            {/* --- جدول الأصناف (Clean Table) --- */}
            <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
                 <thead>
                    <tr>
                       <th style={{ padding: '12px 8px', textAlign: 'center', width: '50px', color: '#64748b', fontSize: '11px', borderBottom: '2px solid #e2e8f0' }}>#</th>
                       <th style={{ padding: '12px 8px', textAlign: 'right', color: '#64748b', fontSize: '11px', borderBottom: '2px solid #e2e8f0' }}>البيان / الوصف</th>
                       <th style={{ padding: '12px 8px', textAlign: 'center', width: '80px', color: '#64748b', fontSize: '11px', borderBottom: '2px solid #e2e8f0' }}>الوحدة</th>
                       <th style={{ padding: '12px 8px', textAlign: 'center', width: '80px', color: '#64748b', fontSize: '11px', borderBottom: '2px solid #e2e8f0' }}>الكمية</th>
                       <th style={{ padding: '12px 8px', textAlign: 'center', width: '100px', color: '#64748b', fontSize: '11px', borderBottom: '2px solid #e2e8f0' }}>السعر</th>
                       <th style={{ padding: '12px 8px', textAlign: 'left', width: '120px', color: '#64748b', fontSize: '11px', borderBottom: '2px solid #e2e8f0' }}>الإجمالي</th>
                    </tr>
                 </thead>
                 <tbody>
                    {invoiceLines.map((line: any, index: number) => (
                      <tr key={index}>
                         <td style={{ padding: '14px 8px', textAlign: 'center', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{index + 1}</td>
                         <td style={{ padding: '14px 8px', textAlign: 'right', color: '#0f172a', fontWeight: 700, borderBottom: '1px solid #f1f5f9' }}>
                           <bdi dir="rtl">{line.description}</bdi>
                         </td>
                         <td style={{ padding: '14px 8px', textAlign: 'center', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>{line.unit}</td>
                         <td style={{ padding: '14px 8px', textAlign: 'center', color: '#0f172a', fontWeight: 800, borderBottom: '1px solid #f1f5f9' }}>{line.quantity}</td>
                         <td style={{ padding: '14px 8px', textAlign: 'center', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>{formatCurrency(line.unit_price)}</td>
                         <td style={{ padding: '14px 8px', textAlign: 'left', color: '#0f172a', fontWeight: 800, borderBottom: '1px solid #f1f5f9' }}>{formatCurrency(line.total_price)}</td>
                      </tr>
                    ))}
                 </tbody>
            </table>

            {/* --- ملخص الحسابات (Refined Totals) --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 'auto', marginBottom: '20px' }}>
                 
                 <div style={{ width: '50%', paddingRight: '10px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 800, marginBottom: '5px' }}>المبلغ الإجمالي كتابةً:</div>
                    <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '13px', lineHeight: '1.8' }}> 
                      فقط {tafqeet(data.total_amount || data.net_amount)} لا غير.
                    </div>
                 </div>

                 <div style={{ width: '40%', fontSize: '13px', color: '#334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                       <span style={{ color: '#64748b' }}>إجمالي الأعمال:</span>
                       <strong style={{ color: '#0f172a' }}>{formatCurrency(data.line_total || data.total_amount || 0)}</strong>
                    </div>

                    {data.materials_discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc', color: '#dc2626' }}>
                         <span>يُخصم (مواد):</span>
                         <strong style={{ direction: 'ltr' }}>- {formatCurrency(data.materials_discount)}</strong>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                       <span style={{ color: '#64748b' }}>الخاضع للضريبة:</span>
                       <strong style={{ color: '#0f172a' }}>{formatCurrency(data.taxable_amount || data.line_total || data.total_amount || 0)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                       <span style={{ color: '#64748b' }}>ضريبة القيمة المضافة (15%):</span>
                       <strong style={{ color: '#0f172a' }}>{formatCurrency(data.tax_amount || 0)}</strong>
                    </div>

                    {data.guarantee_amount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc', color: '#dc2626' }}>
                         <span>يُخصم ضمان أعمال ({data.guarantee_percent}%):</span>
                         <strong style={{ direction: 'ltr' }}>- {formatCurrency(data.guarantee_amount)}</strong>
                      </div>
                    )}

                    {/* الصافي النهائي - Clean Box */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: `2px solid ${THEME.primary}`, marginTop: '10px' }}>
                       <span style={{ fontWeight: 900, fontSize: '15px', color: THEME.primary }}>الصافي المستحق:</span>
                       <span style={{ fontWeight: 900, fontSize: '18px', color: '#0f172a' }}>{formatCurrency(data.total_amount)}</span>
                    </div>
                 </div>
            </div>

            {/* --- التوقيعات والأختام --- */}
            {(showStamp || showAccountant) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', padding: '0 40px' }}>
                 {showAccountant ? (
                   <div style={{ textAlign: 'center' }}>
                      <p style={{ fontWeight: 800, fontSize: '12px', margin: '0 0 10px 0', color: '#64748b' }}>توقيع المحاسب المعتمد</p>
                      {currentUser?.signature_url ? (
                          <img src={currentUser.signature_url} alt="توقيع المحاسب" style={{ maxHeight: '50px', transform: 'rotate(-2deg)', filter: 'grayscale(100%) brightness(0.8)' }} />
                      ) : (
                          <div style={{ border: '1px dashed #e2e8f0', padding: '5px', borderRadius: '8px' }}>
                              <QRCodeSVG value={signatureQRData} size={45} level="L" fgColor="#475569" />
                          </div>
                      )}
                   </div>
                 ) : ( <div style={{ width: '100px' }}></div> )}

                 {showStamp ? (
                   <div style={{ textAlign: 'center' }}>
                      <img src="/company-stamp.png" alt="ختم الشركة" onError={handleImageError} style={{ maxHeight: '70px', opacity: 0.85, mixBlendMode: 'multiply' }} />
                   </div>
                 ) : ( <div style={{ width: '100px' }}></div> )}
              </div>
            )}
          </div>

          {/* --- الفوتر النظيف --- */}
          <div style={{ 
            borderTop: `1px solid #e2e8f0`, 
            paddingTop: '15px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '11px', 
            color: '#64748b',
            fontWeight: 600,
            position: 'relative',
            zIndex: 10
          }}>
             <div>الدمام - حي الفيصليه - شارع السعيره</div>
             <div style={{ display: 'flex', gap: '15px' }}>
                 <span>0578018944</span>
                 <span>0547606876</span>
             </div>
             <div>rawasi.alyusr@gmail.com</div>
          </div>

        </div>
      </div>
    </div>
  );

  // 🚀 السحر هنا: حقن المودال في البورتال الخارجي
  return createPortal(modalContent, document.body);
}