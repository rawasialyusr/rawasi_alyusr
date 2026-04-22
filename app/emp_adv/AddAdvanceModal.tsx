"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // 👈 استيراد البورتال
import { THEME } from '@/lib/theme';
import SmartCombo from '@/components/SmartCombo';

export default function AddAdvanceModal({ isOpen, onClose, initialData, onSave }: any) {
  const [formData, setFormData] = useState<any>({});
  const [mounted, setMounted] = useState(false); // 👈 ضروري عشان نتأكد إننا في المتصفح

  useEffect(() => {
    setMounted(true);
    if (initialData && isOpen) setFormData(initialData);
  }, [initialData, isOpen]);

  // لو المودال مقفول أو الصفحة لسه بتحمل، مانعرضش حاجة
  if (!isOpen || !mounted) return null;

  // 📦 محتوى المودال بالكامل
  const modalContent = (
    <div className="warm-overlay-fullscreen" onClick={onClose}>
      <div className="warm-modal-container" onClick={(e) => e.stopPropagation()}>
        <div style={{ borderBottom: '2px dashed #f1f5f9', paddingBottom: '15px', marginBottom: '25px' }}>
          <h3 style={{ fontWeight: 900, fontSize: '20px', color: THEME.brand.coffee, margin: 0 }}>
            {formData.id ? '✏️ تعديل سلفة (سند صرف)' : '➕ إضافة سلفة جديدة (سند صرف)'}
          </h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={labelStyle}>التاريخ</label>
            <input type="date" value={formData.date || ''} onChange={(e) => setFormData({...formData, date: e.target.value})} style={inputStyle} />
          </div>
          <div style={{ zIndex: 101 }}>
            <SmartCombo label="الموظف / الشريك" table="partners" freeText={true} initialDisplay={formData.emp_name} onSelect={(v:any) => setFormData({...formData, emp_name: v.name || v})} />
          </div>
          <div>
            <label style={labelStyle}>من حساب (الخزينة/البنك)</label>
            <input type="text" placeholder="مثال: الخزينة" value={formData.from_account || ''} onChange={(e) => setFormData({...formData, from_account: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>إلى حساب (سلف الموظفين)</label>
            <input type="text" placeholder="مثال: مديونية السلف" value={formData.to_account || ''} onChange={(e) => setFormData({...formData, to_account: e.target.value})} style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{...labelStyle, color: THEME.ruby}}>القيمة 💸</label>
            <input type="number" value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: e.target.value})} style={{...inputStyle, fontWeight:900, color:THEME.ruby, fontSize:'20px'}} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>البيان</label>
            <input type="text" placeholder="اكتب سبب الصرف..." value={formData.Desc || ''} onChange={(e) => setFormData({...formData, Desc: e.target.value})} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
          <button onClick={() => onSave(formData)} style={{ flex: 2, background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '16px', borderRadius: '15px', border: 'none', fontWeight: 900, cursor: 'pointer' }}>💾 حفظ واعتماد</button>
          <button onClick={onClose} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', padding: '16px', borderRadius: '15px', border: 'none', fontWeight: 900, cursor: 'pointer' }}>إلغاء</button>
        </div>
      </div>

      <style>{`
        /* 🎨 التنسيق الجديد اللي بيجبر التغطية الكاملة 100% */
        .warm-overlay-fullscreen {
          position: fixed !important; 
          top: 0 !important; 
          left: 0 !important; 
          right: 0 !important; 
          bottom: 0 !important;
          width: 100vw !important; 
          height: 100vh !important;
          background: radial-gradient(circle at center, rgba(139, 69, 19, 0.3) 0%, rgba(15, 7, 0, 0.85) 100%) !important;
          backdrop-filter: blur(15px) !important; 
          -webkit-backdrop-filter: blur(15px) !important;
          display: flex !important; 
          align-items: center !important; 
          justify-content: center !important; 
          z-index: 99999999 !important; /* أعلى قيمة ممكنة */
        }
        .warm-modal-container {
          background: white; padding: 35px; border-radius: 30px; width: 90%; max-width: 600px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.8); direction: rtl;
        }
      `}</style>
    </div>
  );

  // 👈 هنا السحر: بنرمي المودال في الـ body مباشرة عشان يخرج بره تحكم الـ MasterPage
  return createPortal(modalContent, document.body);
}

const labelStyle = { fontSize:'11px', fontWeight:900, display:'block', marginBottom: '8px', color: '#64748b' };
const inputStyle = { padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0', width:'100%', outline:'none', fontWeight: 800 };