"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import GlassContainer from '@/components/GlassContainer';

const THEME = {
  primary: '#0f172a',
  accent: '#ca8a04',
  success: '#059669', // للقبض (دخول نقدية)
  danger: '#e11d48',  // للصرف (خروج نقدية)
  slate: '#f8fafc'
};

export default function VouchersPage() {
  const [voucherType, setVoucherType] = useState<'payment' | 'receipt'>('payment');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [description, setDescription] = useState('');
  
  // القوائم المنسدلة
  const [partners, setPartners] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // جلب بيانات الشركاء (موظفين، مقاولين، موردين، عملاء)
  useEffect(() => {
    const fetchPartners = async () => {
      const { data } = await supabase.from('partners').select('id, name, partner_type').order('name');
      if (data) setPartners(data);
    };
    fetchPartners();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !partnerId || !description) return alert("الرجاء إكمال جميع الحقول الأساسية");

    setIsSaving(true);
    try {
      const tableName = voucherType === 'payment' ? 'payment_vouchers' : 'receipt_vouchers';
      const isPayment = voucherType === 'payment';

      // 1. إنشاء رأس القيد المحاسبي أولاً
      const { data: header, error: headerError } = await supabase.from('journal_headers').insert({
        date: date,
        description: `${isPayment ? 'سند صرف' : 'سند قبض'} - ${description}`,
        reference: `${isPayment ? 'PV' : 'RV'}-${new Date().getTime().toString().slice(-6)}`,
        total_amount: Number(amount)
      }).select().single();

      if (headerError) throw headerError;

      // 2. إنشاء تفاصيل القيد (المدين والدائن)
      const lines = isPayment ? [
        // حالة الصرف: المستفيد (مدين) والخزنة (دائن)
        { journal_id: header.id, account_id: 'حساب المستفيد / المصروف', debit: Number(amount), credit: 0, description },
        { journal_id: header.id, account_id: 'حساب الصندوق / البنك', debit: 0, credit: Number(amount), description: 'خروج نقدية' }
      ] : [
        // حالة القبض: الخزنة (مدين) والمصدر (دائن)
        { journal_id: header.id, account_id: 'حساب الصندوق / البنك', debit: Number(amount), credit: 0, description: 'دخول نقدية' },
        { journal_id: header.id, account_id: 'حساب العميل / الإيراد', debit: 0, credit: Number(amount), description }
      ];

      const { error: linesError } = await supabase.from('journal_lines').insert(lines);
      if (linesError) throw linesError;

      // 3. حفظ السند نفسه في جدول السندات للتوثيق
      // (تأكد أن جدول payment_vouchers و receipt_vouchers موجودين في الداتابيز بنفس الأعمدة دي)
      const { error: voucherError } = await supabase.from(tableName).insert({
        date: date,
        partner_id: partnerId,
        amount: Number(amount),
        description: description,
        journal_id: header.id // ربط السند بالقيد
      });

      if (voucherError) {
          // لو جدول السندات مش موجود، هننبه المستخدم بس القيد اترحل
          console.warn("Voucher Table Error:", voucherError);
          alert(`تم ترحيل القيد بنجاح، لكن جدول (${tableName}) غير موجود في قاعدة البيانات للأرشفة.`);
      } else {
          alert(`✅ تم حفظ ${isPayment ? 'سند الصرف' : 'سند القبض'} وترحيل القيد بنجاح!`);
      }

      // تصفير الحقول بعد الحفظ
      setAmount('');
      setDescription('');
      
    } catch (err: any) {
      alert(`❌ حدث خطأ: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '40px', direction: 'rtl', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Cairo' }}>
      
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontWeight: 900, color: THEME.primary, margin: 0 }}>💸 إدارة النقدية والسندات</h1>
          <p style={{ color: '#64748b', fontWeight: 900, margin: '5px 0' }}>تسجيل الحركات المالية والتوجيه المحاسبي الآلي</p>
        </header>

        <GlassContainer style={{ padding: '0', overflow: 'hidden' }}>
          
          {/* التابات للتبديل بين الصرف والقبض */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
            <button 
              onClick={() => setVoucherType('payment')}
              style={{ flex: 1, padding: '20px', fontWeight: 900, fontSize: '18px', border: 'none', cursor: 'pointer', transition: '0.3s', background: voucherType === 'payment' ? `${THEME.danger}15` : 'white', color: voucherType === 'payment' ? THEME.danger : '#94a3b8', borderBottom: voucherType === 'payment' ? `4px solid ${THEME.danger}` : '4px solid transparent' }}
            >
              🔴 سند صرف (خروج نقدية)
            </button>
            <button 
              onClick={() => setVoucherType('receipt')}
              style={{ flex: 1, padding: '20px', fontWeight: 900, fontSize: '18px', border: 'none', cursor: 'pointer', transition: '0.3s', background: voucherType === 'receipt' ? `${THEME.success}15` : 'white', color: voucherType === 'receipt' ? THEME.success : '#94a3b8', borderBottom: voucherType === 'receipt' ? `4px solid ${THEME.success}` : '4px solid transparent' }}
            >
              🟢 سند قبض (دخول نقدية)
            </button>
          </div>

          <form onSubmit={handleSave} style={{ padding: '30px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 900, marginBottom: '8px', color: THEME.primary }}>التاريخ:</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 900 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 900, marginBottom: '8px', color: THEME.primary }}>المبلغ ({voucherType === 'payment' ? 'المنصرف' : 'المستلم'}):</label>
                <div style={{ position: 'relative' }}>
                    <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0.00" style={{ width: '100%', padding: '12px 12px 12px 50px', borderRadius: '8px', border: `2px solid ${voucherType === 'payment' ? THEME.danger : THEME.success}`, outline: 'none', fontWeight: 900, fontSize: '18px', color: THEME.primary }} />
                    <span style={{ position: 'absolute', left: '15px', top: '12px', fontWeight: 900, color: '#94a3b8' }}>ر.س</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 900, marginBottom: '8px', color: THEME.primary }}>الطرف ({voucherType === 'payment' ? 'المستفيد' : 'المُسدد'}):</label>
              <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 900 }}>
                <option value="" disabled>اختر (موظف / مقاول / مورد / عميل)...</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - ({p.partner_type || 'غير مصنف'})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', fontWeight: 900, marginBottom: '8px', color: THEME.primary }}>البيان / التفاصيل:</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="مثال: دفعة مقدمة، سداد فاتورة، سلفة..." rows={3} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 900, resize: 'vertical' }} />
            </div>

            <button type="submit" disabled={isSaving} style={{ width: '100%', padding: '15px', borderRadius: '10px', background: voucherType === 'payment' ? THEME.danger : THEME.success, color: 'white', border: 'none', fontWeight: 900, fontSize: '18px', cursor: 'pointer', transition: '0.3s', boxShadow: `0 4px 15px ${voucherType === 'payment' ? THEME.danger : THEME.success}40` }}>
              {isSaving ? '⏳ جاري التنفيذ...' : `✅ اعتماد وحفظ ${voucherType === 'payment' ? 'سند الصرف' : 'سند القبض'}`}
            </button>

          </form>
        </GlassContainer>

        <div style={{ marginTop: '20px', padding: '15px', background: '#fffbeb', borderRadius: '10px', borderRight: `4px solid ${THEME.accent}`, fontSize: '13px', fontWeight: 900, color: '#92400e' }}>
          💡 ملاحظة: عند حفظ السند، يقوم النظام بإنشاء "قيد يومية" تلقائياً لضبط ميزان المراجعة وحساب الصندوق.
        </div>
      </div>
    </div>
  );
}