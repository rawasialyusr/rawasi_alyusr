"use client";
import React from 'react';
import { QRCodeSVG } from 'qrcode.react'; 
import { THEME } from '@/lib/theme';

export default function ZatcaQRCode({ record }: { record: any }) {
  if (!record) return null;
  
  if (record.is_internal) {
     return (
        <div style={{ padding: '4px', border: `2px solid ${THEME.ruby}`, borderRadius: '8px', background: 'white', display: 'inline-block' }}>
           <QRCodeSVG value={`INTERNAL-INV-${record.invoice_number}`} size={90} level="H" imageSettings={{ src: "/RYC_Logo.png", height: 20, width: 20, excavate: true }} />
        </div>
     );
  }

  const timestamp = record.date ? `${record.date}T12:00:00Z` : new Date().toISOString().split('.')[0] + 'Z';
  
  const generateQR = (s:string, v:string, t:string, it:string, vt:string) => {
    const getB = (tag:number, val:string) => {
      const enc = new TextEncoder(); const b = Array.from(enc.encode(val));
      return [tag, b.length, ...b];
    };
    const tlvs = [...getB(1, s), ...getB(2, v), ...getB(3, t), ...getB(4, it), ...getB(5, vt)];
    return btoa(String.fromCharCode(...new Uint8Array(tlvs)));
  };

  return (
    <div style={{ padding: '4px', border: `2px solid ${THEME.primary}`, borderRadius: '8px', background: 'white', display: 'inline-block' }}>
      <QRCodeSVG value={generateQR("شركة رواسي اليسر", "312487477800003", timestamp, Number(record.net_amount||0).toFixed(2), Number(record.tax_amount||0).toFixed(2))} 
        size={90} level="H" imageSettings={{ src: "/RYC_Logo.png", height: 20, width: 20, excavate: true }} />
    </div>
  );
}