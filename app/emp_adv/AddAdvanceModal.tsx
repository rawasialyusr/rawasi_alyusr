"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { THEME } from '@/lib/theme';
import SmartCombo from '@/components/SmartCombo';

export default function AddAdvanceModal({ isOpen, onClose, initialData, onSave }: any) {
  const [formData, setFormData] = useState<any>({});
  const [mounted, setMounted] = useState(false); 

  useEffect(() => {
    setMounted(true);
    if (initialData && isOpen) setFormData(initialData);
  }, [initialData, isOpen]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="warm-overlay-fullscreen" onClick={onClose}>
      <div className="warm-modal-container" onClick={(e) => e.stopPropagation()}>
        <div style={{ borderBottom: '2px dashed #f1f5f9', paddingBottom: '15px', marginBottom: '25px' }}>
          <h3 style={{ fontWeight: 900, fontSize: '20px', color: THEME.brand?.coffee || '#4a3b32', margin: 0 }}>
            {formData.id ? '✏️ تعديل سلفة (سند صرف)' : '➕ إضافة سلفة جديدة (سند صرف)'}
          </h3>
        </div>
        
        {/* 🚀 تم ترتيب الخانات هنا ليكونوا جنب بعض */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* الصف الأول: التاريخ واسم العامل */}
          <div>
            <label style={labelStyle}>📅 التاريخ</label>
            <input type="date" value={formData.date || ''} onChange={(e) => setFormData({...formData, date: e.target.value})} style={inputStyle} />
          </div>
          
          <div style={{ zIndex: 102 }}>
            <SmartCombo 
              label="👷 الموظف / العامل (المدين)" 
              table="partners" 
              searchCols="name,code"
              displayCol="name"
              freeText={true} 
              initialDisplay={formData.emp_name} 
              onSelect={(v:any) => setFormData({...formData, emp_name: v.name || v, partner_id: v.id})} 
            />
          </div>
          
          {/* الصف الثاني: القيمة وحساب الصرف */}
          <div>
            <label style={{...labelStyle, color: THEME.ruby || '#e11d48'}}>القيمة 💸</label>
            <input type="number" placeholder="0.00" value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: e.target.value})} style={{...inputStyle, fontWeight:900, color: THEME.ruby || '#e11d48', fontSize:'18px'}} />
          </div>

          <div style={{ zIndex: 101 }}>
            <SmartCombo 
                key={`credit-${formData.credit_account_id || 'empty'}`}
                label="🏦 حساب الصرف / الدفع (إلى حـ/)" 
                table="accounts" 
                searchCols="name,code" 
                displayCol="name"
                placeholder="اختر الصندوق، البنك، أو العهدة..."
                initialDisplay={formData.credit_account_name || ''} 
                onSelect={(a:any) => setFormData({...formData, credit_account_id: a.id, credit_account_name: a.name})} 
            />
          </div>
          
          {/* الصف الثالث: البيان / الملاحظات (واخد العرض كله) */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>📝 البيان / الملاحظات</label>
            <input type="text" placeholder="اكتب سبب الصرف أو أي ملاحظة..." value={formData.Desc || ''} onChange={(e) => setFormData({...formData, Desc: e.target.value})} style={inputStyle} />
          </div>

        </div>

        <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
          <button onClick={() => onSave(formData)} style={{ flex: 2, background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '16px', borderRadius: '15px', border: 'none', fontWeight: 900, cursor: 'pointer', fontSize: '16px' }}>💾 حفظ واعتماد السلفة</button>
          <button onClick={onClose} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', padding: '16px', borderRadius: '15px', border: 'none', fontWeight: 900, cursor: 'pointer' }}>إلغاء</button>
        </div>
      </div>

      <style>{`
        .warm-overlay-fullscreen {
          position: fixed !important; 
          top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
          width: 100vw !important; height: 100vh !important;
          background: radial-gradient(circle at center, rgba(139, 69, 19, 0.3) 0%, rgba(15, 7, 0, 0.85) 100%) !important;
          backdrop-filter: blur(15px) !important; 
          -webkit-backdrop-filter: blur(15px) !important;
          display: flex !important; align-items: center !important; justify-content: center !important; 
          z-index: 99999999 !important; 
        }
        .warm-modal-container {
          background: white; padding: 35px; border-radius: 30px; width: 90%; max-width: 650px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.8); direction: rtl;
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}

const labelStyle = { fontSize:'12px', fontWeight:900, display:'block', marginBottom: '8px', color: '#64748b' };
const inputStyle = { padding:'14px', borderRadius:'12px', border:'2px solid #e2e8f0', width:'100%', outline:'none', fontWeight: 800 };