"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddDailyReportPage() {
  const [loading, setLoading] = useState(false);
  const logoUrl = "/RYC_Logo.png"; 
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
    Attendance: 1,
    Notes: ''
  });

  useEffect(() => { fetchAssets(); }, []);

  async function fetchAssets() {
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
    } catch (err: any) { alert('❌ خطأ: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    const finalValue = name === "Attendance" ? Number(value) : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  return (
    <div style={{ 
      direction: 'rtl', minHeight: '100vh', 
      backgroundColor: '#f8fafc',
      backgroundImage: bgUrl ? `url(${bgUrl})` : 'none',
      backgroundSize: 'cover', backgroundAttachment: 'fixed',
      padding: '40px 20px 80px 20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      position: 'relative', 
      overflowX: 'hidden'
    }}>
      
      {/* --- طبقة اللوجو الخلفية الموضحة (Clearer Background Layer) --- */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '200%', // تكبير الحجم قليلاً
        maxWidth: '2500px',
        zIndex: 0,
        opacity: 0.25,      // زيادة الوضوح من 0.1 إلى 0.25
        filter: 'blur(8px)', // تقليل التغبيش لزيادة التفاصيل
        pointerEvents: 'none',
        userSelect: 'none'
      }}>
        <img src={logoUrl} alt="" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
      </div>

      {/* --- حاوية المحتوى الأمامي --- */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        <div style={{ 
          width: '100%', display: 'flex', justifyContent: 'center', 
          marginBottom: '30px', padding: '0 15px' 
        }}>
          <img 
            src={logoUrl} 
            alt="RYC Logo" 
            style={{ 
              height: 'auto', maxHeight: '320px', width: '100%', maxWidth: '600px', 
              objectFit: 'contain', filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.15))',
              transition: 'all 0.4s ease'
            }} 
          />
        </div>

        <div style={{ 
          width: '100%', maxWidth: '900px', 
          backgroundColor: 'rgba(255, 255, 255, 0.94)', 
          padding: '50px 40px', borderRadius: '50px', 
          boxShadow: '0 35px 70px -15px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(12px)', 
          border: '1px solid rgba(255,255,255,0.8)',
          marginTop: '-10px'
        }}>
          
          <div style={{ textAlign: 'center', marginBottom: '45px' }}>
            <h2 style={{ color: '#0f172a', fontSize: '36px', fontWeight: '900', margin: 0, letterSpacing: '-1.5px' }}>
              تسجيل بيانات اليومية
            </h2>
            <p style={{ color: '#475569', marginTop: '12px', fontSize: '20px', fontWeight: '800' }}>
              Daily Accounting Journal
            </p>
            <div style={{ width: '100px', height: '6px', background: '#f59e0b', margin: '20px auto', borderRadius: '10px' }}></div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
            <div style={inputContainer}>
              <span style={iconLabel}>📅 التاريخ</span>
              <input type="date" name="Date" value={formData.Date} onChange={handleChange} required style={inputStyle} />
            </div>

            <div style={inputContainer}>
              <span style={iconLabel}>👤 اسم الموظف</span>
              <input type="text" name="Emp_Name" value={formData.Emp_Name} onChange={handleChange} placeholder="أدخل الاسم بالكامل" required style={inputStyle} />
            </div>

            <div style={inputContainer}>
              <span style={iconLabel}>🏗️ الموقع</span>
              <input type="text" name="Site" value={formData.Site} onChange={handleChange} placeholder="اسم المشروع" style={inputStyle} />
            </div>

            <div style={inputContainer}>
              <span style={iconLabel}>🤝 المقاول</span>
              <input type="text" name="Main_Cont" value={formData.Main_Cont} onChange={handleChange} placeholder="المقاول الرئيسي" style={inputStyle} />
            </div>

            <div style={inputContainer}>
              <span style={iconLabel}>🛠️ البند</span>
              <input type="text" name="Item" value={formData.Item} onChange={handleChange} placeholder="نوع العمل المنفذ" style={inputStyle} />
            </div>

            <div style={inputContainer}>
              <span style={iconLabel}>🏅 المستوى</span>
              <select name="Sk_Level" value={formData.Sk_Level} onChange={handleChange} style={inputStyle}>
                <option value="فني">فني</option>
                <option value="مساعد">مساعد</option>
                <option value="عامل">عامل</option>
                <option value="مشرف">مشرف</option>
              </select>
            </div>

            <div style={{...inputContainer, border: '3px solid #f59e0b', backgroundColor: '#fffdfa'}}>
              <span style={{...iconLabel, color: '#b45309', fontSize: '14px'}}>💵 القيمة (اليومية)</span>
              <input type="number" name="D_W" value={formData.D_W} onChange={handleChange} placeholder="0.00" style={{...inputStyle, background: 'transparent', fontSize: '22px'}} />
            </div>

            <div style={inputContainer}>
              <span style={iconLabel}>✅ حالة الحضور</span>
              <select name="Attendance" value={formData.Attendance} onChange={handleChange} style={inputStyle}>
                <option value={1}>حاضر </option>
                <option value={0.5}>نص يوم </option>
                <option value={0}>غائب </option>
              </select>
            </div>

            <div style={{ ...inputContainer, gridColumn: '1 / -1' }}>
              <span style={iconLabel}>📝 ملاحظات</span>
              <textarea name="Notes" value={formData.Notes} onChange={handleChange} rows={2} placeholder="أي تفاصيل إضافية..." style={inputStyle}></textarea>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '30px' }}>
              <button type="submit" disabled={loading} style={btnPrimary}>
                {loading ? 'جاري الحفظ...' : 'اعتماد السجل 💾'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputContainer: any = { display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', border: '2px solid #f1f5f9', borderRadius: '25px', padding: '18px 26px', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)' };
const iconLabel: any = { fontSize: '14px', fontWeight: '800', color: '#64748b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' };
const inputStyle: any = { border: 'none', outline: 'none', fontSize: '18px', color: '#0f172a', fontWeight: '700', backgroundColor: 'transparent' };
const btnPrimary: any = { width: '100%', padding: '25px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '30px', fontWeight: '900', fontSize: '22px', cursor: 'pointer', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.3)' };