"use client";

import React from 'react';
import { useAddActionLogic } from './add_action_logic';

const THEME = {
  sandLight: '#F4F1EE',
  sandDark: '#E6D5C3',
  coffeeMain: '#8C6A5D',
  coffeeDark: '#2D2421',
  goldAccent: '#C5A059',
  white: '#FFFFFF',
  blackText: '#000000'
};

export default function DynamicActionPage() {
  const { 
    type, setType, formData, updateField, submitAction, loading, 
    employees, searchTerm, setSearchTerm, isDropdownOpen, setIsDropdownOpen,
    handleSelectEmployee 
  } = useAddActionLogic();

  const labelStyle = { 
    color: THEME.coffeeDark, 
    fontWeight: '800', 
    fontSize: '14px', 
    marginBottom: '8px', 
    display: 'block' 
  };

  const inputStyle = { 
    width: '100%', 
    padding: '12px', 
    borderRadius: '8px', 
    border: `2px solid ${THEME.sandDark}`, 
    fontWeight: 'bold', 
    outline: 'none',
    color: '#000000', 
    fontSize: '16px', 
    backgroundColor: '#FFFFFF'
  };

  const companyLogoUrl = "https://your-company-logo-url.png"; 

  return (
    <div style={{ 
      direction: 'rtl', 
      backgroundColor: THEME.sandLight, 
      minHeight: '100vh', 
      padding: '30px',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
        
        input::placeholder { color: #666 !important; font-weight: 500; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${THEME.coffeeMain}; border-radius: 10px; }
        
        .blurred-bg-logo {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 600px; height: 600px;
          background-image: url('${companyLogoUrl}');
          background-size: contain; background-repeat: no-repeat; background-position: center;
          filter: blur(80px) opacity(0.04); z-index: 0; pointer-events: none;
        }

        .main-content-card { position: relative; z-index: 10; }
        .auto-filled-input { background-color: #f9f4eb !important; border-right: 5px solid ${THEME.goldAccent} !important; color: #000000 !important; }
      `}</style>

      <div className="blurred-bg-logo"></div>

      <div className="main-content-card" style={{ maxWidth: '850px', margin: '0 auto', background: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 15px 45px rgba(0,0,0,0.15)' }}>
        
        <div style={{ background: THEME.coffeeDark, padding: '25px', textAlign: 'center', borderBottom: `4px solid ${THEME.goldAccent}` }}>
          <h2 style={{ color: THEME.goldAccent, margin: 0, fontWeight: 900 }}>
            {type === 'daily' ? '📝 إضافة يومية' : type === 'advance' ? '💵 صرف سلفة' : type === 'deduction' ? '✂️ تسجيل خصم' : '🏠 مستحقات سكن'}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '4px', padding: '12px', background: '#EAE5E0' }}>
          {['daily', 'advance', 'deduction', 'housing'].map(t => (
            <button 
              key={t} 
              onClick={() => { setType(t); setSearchTerm(''); setIsDropdownOpen(false); }} 
              style={{ 
                flex: 1, padding: '14px', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', 
                backgroundColor: type === t ? THEME.coffeeDark : THEME.sandDark, 
                color: type === t ? THEME.goldAccent : '#444',
                transition: 'all 0.3s ease'
              }}
            >
              {t === 'daily' ? 'يومية' : t === 'advance' ? 'سلفة' : t === 'deduction' ? 'خصم' : 'سكن'}
            </button>
          ))}
        </div>

        <form style={{ padding: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }} onSubmit={(e) => { e.preventDefault(); submitAction(); }}>
          
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <label style={labelStyle}>👤 اسم الموظف (بحث)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="ابحث عن الموظف..."
                style={{ ...inputStyle, borderRight: `8px solid ${THEME.coffeeMain}` }}
                value={searchTerm || formData.emp_name}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  updateField('emp_name', e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 300)} // زيادة وقت التأخير قليلاً
              />
            </div>

            {/* القائمة المنسدلة مع Z-Index مرتفع جداً */}
            {isDropdownOpen && (
              <div className="custom-scrollbar" style={{
                position: 'absolute', top: '105%', right: 0, left: 0, 
                zIndex: 9999, // تم رفعه لضمان الظهور أونلاين
                background: 'white', border: `2px solid ${THEME.coffeeMain}`, borderRadius: '10px',
                maxHeight: '220px', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
              }}>
                {employees.length > 0 ? employees.map((emp, i) => (
                  <div
                    key={`emp-${i}-${emp.emp_id || i}`}
                    onMouseDown={(e) => { // استخدام onMouseDown بدل onClick لتجنب الـ Blur
                        handleSelectEmployee(emp);
                        setIsDropdownOpen(false);
                    }}
                    style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: `1px solid ${THEME.sandLight}`, fontWeight: 'bold', color: '#000', textAlign: 'right' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = THEME.sandLight}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {emp.emp_name || emp.Emp_Name}
                  </div>
                )) : (
                  <div style={{ padding: '15px', textAlign: 'center', color: '#666' }}>
                    {searchTerm ? "لا يوجد نتائج" : "جاري تحميل البيانات..."}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* باقي الحقول */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>📅 التاريخ</label>
            <input type="date" style={inputStyle} value={formData.date} onChange={(e) => updateField('date', e.target.value)} />
          </div>

          {type === 'daily' ? (
            <>
              <div><label style={labelStyle}>🏗️ المقاول</label><input style={inputStyle} value={formData.main_cont} onChange={(e) => updateField('main_cont', e.target.value)} /></div>
              <div><label style={labelStyle}>📍 الموقع</label><input style={inputStyle} value={formData.site} onChange={(e) => updateField('site', e.target.value)} /></div>
              <div><label style={labelStyle}>🛠️ البند</label><input className="auto-filled-input" style={inputStyle} value={formData.item} onChange={(e) => updateField('item', e.target.value)} /></div>
              <div><label style={labelStyle}>🎓 المهنة</label><input className="auto-filled-input" style={inputStyle} value={formData.sk_level} onChange={(e) => updateField('sk_level', e.target.value)} /></div>
              <div><label style={labelStyle}>📊 الإنتاج</label><input type="number" style={inputStyle} value={formData.prod} onChange={(e) => updateField('prod', e.target.value)} /></div>
              <div><label style={labelStyle}>📏 الوحدة</label><input style={inputStyle} value={formData.unit} onChange={(e) => updateField('unit', e.target.value)} /></div>
              <div><label style={labelStyle}>💰 اليومية</label><input className="auto-filled-input" type="number" style={{...inputStyle, color: '#D32F2F'}} value={formData.d_w} onChange={(e) => updateField('d_w', e.target.value)} /></div>
              <div><label style={labelStyle}>✅ الحضور</label>
                <select style={inputStyle} value={formData.attendance} onChange={(e) => updateField('attendance', e.target.value)}>
                  <option value="1">حاضر (1)</option>
                  <option value="0.5">نصف يوم (0.5)</option>
                  <option value="0">غائب (0)</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div><label style={labelStyle}>💵 المبلغ</label><input type="number" style={{...inputStyle, color: '#D32F2F'}} value={formData.amount} onChange={(e) => updateField('amount', e.target.value)} /></div>
              {type === 'housing' && <div><label style={labelStyle}>🗓️ الفترة</label><input style={inputStyle} value={formData.period} onChange={(e) => updateField('period', e.target.value)} /></div>}
              <div style={{ gridColumn: type === 'housing' ? 'span 1' : 'span 2' }}>
                <label style={labelStyle}>📝 السبب</label>
                <input style={inputStyle} value={formData.reason} onChange={(e) => updateField('reason', e.target.value)} />
              </div>
            </>
          )}

          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>🗒️ ملاحظات</label>
            <textarea style={{ ...inputStyle, height: '80px', resize: 'none' }} value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} />
          </div>

          <button disabled={loading} style={{ 
            gridColumn: 'span 2', padding: '18px', background: THEME.coffeeDark, color: THEME.goldAccent, 
            border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '20px', cursor: 'pointer',
            opacity: loading ? 0.7 : 1
          }}>
            {loading ? '⏳ جاري الحفظ...' : `إعتماد البيانات 🚀`}
          </button>
        </form>
      </div>
    </div>
  );
}