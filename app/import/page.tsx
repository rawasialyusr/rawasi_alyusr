"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddDailyReportPage() {
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    Date: new Date().toISOString().split('T')[0],
    Main_Cont: '',
    Emp_Name: '',
    Site: '',
    Item: '',
    Prod: 0,
    Unit: '',
    Sk_Level: 'فني',
    D_W: 0,
    Attendance: 'حاضر',
    Notes: ''
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  async function fetchAssets() {
    const { data: logoData } = supabase.storage.from('public0').getPublicUrl('RYC_Logo.png');
    if (logoData?.publicUrl) setLogoUrl(logoData.publicUrl);
    const { data: bgData } = supabase.storage.from('public0').getPublicUrl('back0.png');
    if (bgData?.publicUrl) setBgUrl(bgData.publicUrl);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('Daily_Report').insert([formData]);
      if (error) throw error;
      alert('✅ تم حفظ البيانات بنجاح');
      setFormData({ ...formData, Emp_Name: '', Item: '', Prod: 0, D_W: 0, Notes: '' });
    } catch (err: any) {
      alert('❌ خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div style={{ 
      direction: 'rtl', minHeight: '100vh', 
      backgroundImage: bgUrl ? `linear-gradient(rgba(248, 250, 252, 0.8), rgba(248, 250, 252, 0.8)), url(${bgUrl})` : 'none',
      backgroundSize: 'cover', backgroundPosition: 'center', padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '30px', borderRadius: '25px', boxShadow: '0 15px 35px rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '90px', marginBottom: '15px' }} />}
          <h1 style={{ color: '#0f172a', fontSize: '28px', fontWeight: '900' }}>إضافة يومية جديدة</h1>
          <p style={{ color: '#64748b', fontWeight: 'bold' }}>تعبئة بيانات التقرير اليومي</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={fld}> <label style={lbl}>التاريخ</label> <input type="date" name="Date" value={formData.Date} onChange={handleChange} required style={inp} /> </div>
          <div style={fld}> <label style={lbl}>المقاول الرئيسي</label> <input type="text" name="Main_Cont" value={formData.Main_Cont} onChange={handleChange} placeholder="اسم المقاول" style={inp} /> </div>
          <div style={fld}> <label style={lbl}>اسم الموظف</label> <input type="text" name="Emp_Name" value={formData.Emp_Name} onChange={handleChange} required placeholder="الاسم" style={inp} /> </div>
          <div style={fld}> <label style={lbl}>الموقع</label> <input type="text" name="Site" value={formData.Site} onChange={handleChange} placeholder="الموقع" style={inp} /> </div>
          <div style={fld}> <label style={lbl}>البند</label> <input type="text" name="Item" value={formData.Item} onChange={handleChange} placeholder="نوع العمل" style={inp} /> </div>
          <div style={fld}> <label style={lbl}>المستوى</label> 
            <select name="Sk_Level" value={formData.Sk_Level} onChange={handleChange} style={inp}>
              <option value="فني">فني</option> <option value="مساعد">مساعد</option> <option value="عامل">عامل</option> <option value="مشرف">مشرف</option>
            </select>
          </div>
          <div style={fld}> <label style={lbl}>الإنتاج</label> <input type="number" name="Prod" value={formData.Prod} onChange={handleChange} style={inp} /> </div>
          <div style={fld}> <label style={lbl}>الوحدة</label> <input type="text" name="Unit" value={formData.Unit} onChange={handleChange} placeholder="م2 / طن" style={inp} /> </div>
          <div style={fld}> <label style={lbl}>اليومية</label> <input type="number" name="D_W" value={formData.D_W} onChange={handleChange} style={{...inp, borderColor: '#f59e0b'}} /> </div>
          <div style={fld}> <label style={lbl}>الحضور</label> 
            <select name="Attendance" value={formData.Attendance} onChange={handleChange} style={inp}>
              <option value="حاضر">حاضر ✅</option> <option value="غائب">غائب ❌</option>
            </select>
          </div>
          <div style={{ ...fld, gridColumn: '1 / span 2' }}> <label style={lbl}>ملاحظات</label> <textarea name="Notes" value={formData.Notes} onChange={handleChange} rows={3} style={inp}></textarea> </div>

          <div style={{ gridColumn: '1 / span 2', display: 'flex', gap: '15px', marginTop: '10px' }}>
            <button type="submit" disabled={loading} style={btnMain}>{loading ? 'جاري الحفظ...' : 'حفظ السجل 💾'}</button>
            <button type="button" onClick={() => window.location.href = '/'} style={btnSec}>العودة للجدول 📋</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Styles
const fld: any = { display: 'flex', flexDirection: 'column', gap: '6px' };
const lbl: any = { fontSize: '14px', fontWeight: 'bold', color: '#1e293b' };
const inp: any = { padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' };
const btnMain: any = { flex: 2, padding: '16px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer' };
const btnSec: any = { flex: 1, padding: '16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer' };
