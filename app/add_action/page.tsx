"use client";

import React, { useState, useEffect } from 'react';
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
    handleSelectEmployee, dropdowns 
  } = useAddActionLogic();

  // 1. حالة لتحديد نوع "واجهة المصروف" (إضافة وضع operations)
  const [expenseMode, setExpenseMode] = useState<'general' | 'salary' | 'contractor' | 'fuel' | 'materials' | 'rent' | 'operations'>('general');

  const safeDropdowns = dropdowns || { projects: [], partners: [], accounts: [] };

  // ⚡ حساب الإجمالي تلقائياً للمصروفات (يشمل الآن وضع التشغيل)
  useEffect(() => {
    if (type === 'expense' || type === 'revenue') {
      const calculatedTotal = (Number(formData.qty) || 0) * (Number(formData.price) || 0);
      if (calculatedTotal > 0) {
        updateField('amount', calculatedTotal);
      }
    }
  }, [formData.qty, formData.price, type]);

  // 🔍 وظيفة الفلترة بناءً على الأكواد في سوبا بيز (مهمة لظهور الحسابات)
  const getFilteredAccounts = () => {
    const allAccounts = safeDropdowns.accounts || [];
    
    if (type === 'revenue') {
      return allAccounts.filter((a: any) => a.account_type === 'إيرادات');
    }

    switch (expenseMode) {
      case 'general': // النثريات والمصاريف الإدارية
        return allAccounts.filter((a: any) => a.code?.startsWith('53'));
      case 'operations': // مصاريف التشغيل
        return allAccounts.filter((a: any) => a.code?.startsWith('52'));
      case 'materials': // الخامات
        return allAccounts.filter((a: any) => a.code?.startsWith('5101'));
      case 'contractor': // المقاولين
        return allAccounts.filter((a: any) => a.code?.startsWith('5102'));
      case 'salary': // الرواتب واليوميات
        return allAccounts.filter((a: any) => a.code?.startsWith('5103') || a.code?.startsWith('5104'));
      case 'fuel': // الوقود
        return allAccounts.filter((a: any) => a.code?.startsWith('5201'));
      case 'rent': // الإيجارات
        return allAccounts.filter((a: any) => a.code?.startsWith('5301'));
      default:
        return allAccounts.filter((a: any) => a.account_type === 'مصروفات');
    }
  };

  const labelStyle = { color: THEME.coffeeDark, fontWeight: '800', fontSize: '14px', marginBottom: '8px', display: 'block' };
  const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: `2px solid ${THEME.sandDark}`, fontWeight: 'bold', outline: 'none', color: '#000000', fontSize: '16px', backgroundColor: '#FFFFFF' };

  const companyLogoUrl = "https://your-company-logo-url.png"; 
  const isEmployeeAction = ['daily', 'advance', 'deduction', 'housing'].includes(type);
  const isFinancialAction = ['expense', 'revenue'].includes(type);

  return (
    <div style={{ direction: 'rtl', backgroundColor: THEME.sandLight, minHeight: '100vh', padding: '30px', position: 'relative', overflowX: 'hidden' }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
        input::placeholder, textarea::placeholder { color: #888 !important; font-weight: 500; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${THEME.coffeeMain}; border-radius: 10px; }
        .blurred-bg-logo { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 600px; height: 600px; background-image: url('${companyLogoUrl}'); background-size: contain; background-repeat: no-repeat; background-position: center; filter: blur(80px) opacity(0.04); z-index: 0; pointer-events: none; }
        .main-content-card { position: relative; z-index: 10; }
        .auto-filled-input { background-color: #f9f4eb !important; border-right: 5px solid ${THEME.goldAccent} !important; color: #000000 !important; }
      `}</style>

      <div className="blurred-bg-logo"></div>

      <div className="main-content-card" style={{ maxWidth: '850px', margin: '0 auto', background: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 15px 45px rgba(0,0,0,0.15)' }}>
        
        <div style={{ background: THEME.coffeeDark, padding: '25px', textAlign: 'center', borderBottom: `4px solid ${THEME.goldAccent}` }}>
          <h2 style={{ color: THEME.goldAccent, margin: 0, fontWeight: 900 }}>
            {type === 'daily' ? '📝 إضافة يومية' : type === 'advance' ? '💵 صرف سلفة' : type === 'deduction' ? '✂️ تسجيل خصم' : type === 'housing' ? '🏠 مستحقات سكن' : type === 'expense' ? '💸 تسجيل مصروف' : '💰 تسجيل إيراد / تحصيل'}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '4px', padding: '12px', background: '#EAE5E0', flexWrap: 'wrap' }}>
          {[ { id: 'daily', icon: '📝', label: 'يومية' }, { id: 'advance', icon: '💵', label: 'سلفة' }, { id: 'deduction', icon: '✂️', label: 'خصم' }, { id: 'housing', icon: '🏠', label: 'سكن' }, { id: 'expense', icon: '💸', label: 'مصروفات' }, { id: 'revenue', icon: '💰', label: 'إيرادات' } ].map(t => (
            <button 
              key={t.id} 
              type="button"
              onClick={() => { setType(t.id); setSearchTerm(''); setIsDropdownOpen(false); setExpenseMode('general'); }} 
              style={{ flex: 1, minWidth: '100px', padding: '12px 5px', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '14px', backgroundColor: type === t.id ? THEME.coffeeDark : THEME.sandDark, color: type === t.id ? THEME.goldAccent : '#444', transition: 'all 0.3s ease' }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <form style={{ padding: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }} onSubmit={(e) => { e.preventDefault(); submitAction(); }}>
          
          {isEmployeeAction && (
            <>
              <div style={{ position: 'relative', gridColumn: 'span 2' }}>
                <label style={labelStyle}>👤 اسم الموظف (بحث)</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="ابحث عن الموظف..." style={{ ...inputStyle, borderRight: `8px solid ${THEME.coffeeMain}` }} value={searchTerm || formData.emp_name} onChange={(e) => { setSearchTerm(e.target.value); updateField('emp_name', e.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} onBlur={() => setTimeout(() => setIsDropdownOpen(false), 300)} />
                </div>
                {isDropdownOpen && (
                  <div className="custom-scrollbar" style={{ position: 'absolute', top: '105%', right: 0, left: 0, zIndex: 9999, background: 'white', border: `2px solid ${THEME.coffeeMain}`, borderRadius: '10px', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                    {employees.length > 0 ? employees.map((emp, i) => (
                      <div key={`emp-${i}-${emp.emp_id || i}`} onMouseDown={() => { handleSelectEmployee(emp); setIsDropdownOpen(false); }} style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: `1px solid ${THEME.sandLight}`, fontWeight: 'bold', color: '#000' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = THEME.sandLight} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        {emp.emp_name || emp.Emp_Name}
                      </div>
                    )) : <div style={{ padding: '15px', textAlign: 'center', color: '#666' }}>{searchTerm ? "لا يوجد نتائج" : "جاري تحميل البيانات..."}</div>}
                  </div>
                )}
              </div>

              <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>📅 التاريخ</label><input type="date" style={inputStyle} value={formData.date} onChange={(e) => updateField('date', e.target.value)} /></div>
              
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
                    <select style={inputStyle} value={formData.attendance} onChange={(e) => updateField('attendance', e.target.value)}><option value="1">حاضر (1)</option><option value="0.5">نصف يوم (0.5)</option><option value="0">غائب (0)</option></select>
                  </div>
                </>
              ) : (
                <>
                  <div><label style={labelStyle}>💵 المبلغ</label><input type="number" style={{...inputStyle, color: '#D32F2F'}} value={formData.amount} onChange={(e) => updateField('amount', e.target.value)} /></div>
                  {type === 'housing' && <div><label style={labelStyle}>🗓️ الفترة</label><input style={inputStyle} value={formData.period} onChange={(e) => updateField('period', e.target.value)} /></div>}
                  <div style={{ gridColumn: type === 'housing' ? 'span 1' : 'span 2' }}><label style={labelStyle}>📝 السبب</label><input style={inputStyle} value={formData.reason} onChange={(e) => updateField('reason', e.target.value)} /></div>
                </>
              )}
            </>
          )}

          {isFinancialAction && (
            <>
              {type === 'expense' && (
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '8px', padding: '10px', backgroundColor: '#F0F0F0', borderRadius: '12px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setExpenseMode('general')} style={{ flex: 1, minWidth: '80px', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: expenseMode === 'general' ? THEME.coffeeDark : THEME.sandDark, color: expenseMode === 'general' ? THEME.goldAccent : '#555' }}>🛒 عام</button>
                  <button type="button" onClick={() => setExpenseMode('salary')} style={{ flex: 1, minWidth: '80px', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: expenseMode === 'salary' ? THEME.coffeeDark : THEME.sandDark, color: expenseMode === 'salary' ? THEME.goldAccent : '#555' }}>👷 رواتب</button>
                  <button type="button" onClick={() => setExpenseMode('contractor')} style={{ flex: 1, minWidth: '80px', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: expenseMode === 'contractor' ? THEME.coffeeDark : THEME.sandDark, color: expenseMode === 'contractor' ? THEME.goldAccent : '#555' }}>🏗️ مقاول</button>
                  <button type="button" onClick={() => setExpenseMode('fuel')} style={{ flex: 1, minWidth: '80px', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: expenseMode === 'fuel' ? THEME.coffeeDark : THEME.sandDark, color: expenseMode === 'fuel' ? THEME.goldAccent : '#555' }}>⛽ وقود</button>
                  <button type="button" onClick={() => setExpenseMode('materials')} style={{ flex: 1, minWidth: '80px', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: expenseMode === 'materials' ? THEME.coffeeDark : THEME.sandDark, color: expenseMode === 'materials' ? THEME.goldAccent : '#555' }}>🧱 خامات</button>
                  <button type="button" onClick={() => setExpenseMode('rent')} style={{ flex: 1, minWidth: '80px', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: expenseMode === 'rent' ? THEME.coffeeDark : THEME.sandDark, color: expenseMode === 'rent' ? THEME.goldAccent : '#555' }}>🏠 إيجار</button>
                  <button type="button" onClick={() => setExpenseMode('operations')} style={{ flex: 1, minWidth: '80px', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: expenseMode === 'operations' ? THEME.coffeeDark : THEME.sandDark, color: expenseMode === 'operations' ? THEME.goldAccent : '#555' }}>⚙️ تشغيل</button>
                </div>
              )}

              {['general', 'fuel', 'materials', 'rent', 'operations'].includes(expenseMode) || type === 'revenue' ? (
                <div style={{ gridColumn: 'span 1', position: 'relative', zIndex: 90 }}>
                  <CustomTreeSelect 
                    label={type === 'expense' ? `🔼 قيد ${expenseMode === 'general' ? 'النثريات' : expenseMode} (مدين)` : '🔼 حساب التحصيل (مدين)'}
                    accounts={getFilteredAccounts()} 
                    value={formData.primary_account}
                    onChange={(val: string) => updateField('primary_account', val)}
                    borderColor={type === 'expense' ? '#D32F2F' : '#27ae60'}
                  />
                </div>
              ) : null}

              {expenseMode === 'salary' && type === 'expense' && (
                <div style={{ gridColumn: 'span 1' }}>
                  <label style={labelStyle}>👤 اسم العامل المستلم</label>
                  <input type="text" style={inputStyle} placeholder="اكتب اسم العامل..." onChange={(e) => updateField('emp_name', e.target.value)} />
                </div>
              )}

              {expenseMode === 'contractor' && type === 'expense' && (
                <div style={{ gridColumn: 'span 1' }}>
                   <label style={labelStyle}>🏢 اختر المقاول</label>
                   <select style={inputStyle} onChange={(e) => updateField('partner_id', e.target.value)}>
                    <option value="">-- اختر المقاول --</option>
                    {safeDropdowns.partners.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                </div>
              )}

              {expenseMode === 'fuel' && (
                <div style={{ gridColumn: 'span 1' }}>
                  <label style={labelStyle}>🚜 المعدة / السيارة</label>
                  <input style={inputStyle} placeholder="رقم المعدة..." onChange={(e) => updateField('asset_name', e.target.value)} />
                </div>
              )}

              <div style={{ gridColumn: 'span 1' }}>
                <label style={labelStyle}>🧾 رقم الفاتورة / المستند</label>
                <input type="text" style={inputStyle} placeholder="رقم الفاتورة..." value={formData.invoice_no || ''} onChange={(e) => updateField('invoice_no', e.target.value)} />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>📝 البيان / تفاصيل الحركة</label>
                <input required type="text" style={inputStyle} placeholder="اكتب وصفاً دقيقاً للحركة..." value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
              </div>

              {['general', 'fuel', 'materials', 'operations'].includes(expenseMode) || type === 'revenue' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridColumn: 'span 2', gap: '15px' }}>
                  <div>
                    <label style={labelStyle}>🔢 العدد / الكمية</label>
                    <input type="number" style={inputStyle} placeholder="1" onChange={(e) => updateField('qty', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>🏷️ السعر</label>
                    <input type="number" style={inputStyle} placeholder="0.00" onChange={(e) => updateField('price', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>💰 الإجمالي (تلقائي)</label>
                    <input type="number" disabled style={{...inputStyle, backgroundColor: '#f9f4eb', color: '#D32F2F', borderRight: `5px solid ${THEME.goldAccent}`}} value={formData.amount} />
                  </div>
                </div>
              ) : (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>💰 المبلغ الصافي</label>
                  <input type="number" style={{...inputStyle, color: '#D32F2F'}} placeholder="0.00" onChange={(e) => updateField('amount', e.target.value)} />
                </div>
              )}

              <div style={{ gridColumn: 'span 1' }}>
                <label style={labelStyle}>📍 توجيه المشروع</label>
                <select style={inputStyle} value={formData.project_id} onChange={(e) => updateField('project_id', e.target.value)}>
                  <option value="">-- مصروف عام --</option>
                  {safeDropdowns.projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: 'span 1' }}>
                <label style={labelStyle}>🏢 المورد / الجهة</label>
                <select style={inputStyle} value={formData.partner_id} onChange={(e) => updateField('partner_id', e.target.value)}>
                  <option value="">-- بدون جهة --</option>
                  {safeDropdowns.partners.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2', height: '1px', backgroundColor: THEME.sandDark, margin: '5px 0' }}></div>

              <div style={{ gridColumn: 'span 1' }}><label style={labelStyle}>📅 التاريخ</label><input required type="date" style={inputStyle} value={formData.date} onChange={(e) => updateField('date', e.target.value)} /></div>

              <div style={{ gridColumn: 'span 1', position: 'relative', zIndex: 80 }}>
                <CustomTreeSelect 
                  label={type === 'expense' ? '🔽 طريقة الدفع (دائن)' : '🔽 مصدر الإيراد (دائن)'}
                  accounts={safeDropdowns.accounts.filter((a: any) => type === 'expense' ? a.account_type === 'أصول' : a.account_type === 'إيرادات')}
                  value={formData.secondary_account}
                  onChange={(val: string) => updateField('secondary_account', val)}
                  borderColor={type === 'expense' ? '#27ae60' : '#D32F2F'}
                />
              </div>
            </>
          )}

          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>🗒️ ملاحظات إضافية</label>
            <textarea style={{ ...inputStyle, height: '80px', resize: 'none' }} placeholder="اكتب أي ملاحظات هنا..." value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} />
          </div>

          <button type="submit" disabled={loading} style={{ gridColumn: 'span 2', padding: '18px', background: THEME.coffeeDark, color: THEME.goldAccent, border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '20px', cursor: 'pointer', opacity: loading ? 0.7 : 1, transition: '0.3s' }}>
            {loading ? '⏳ جاري المعالجة...' : `إعتماد حركة ${expenseMode === 'operations' ? 'تشغيل' : expenseMode} 🚀`}
          </button>

        </form>
      </div>
    </div>
  );
}

// 🌳 مكون الـ CustomTreeSelect المصلح (ليعرض الحسابات المفلترة بشكل صحيح)
function CustomTreeSelect({ label, accounts, value, onChange, borderColor }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedAccount = accounts.find((a: any) => a.id == value);

  // دالة ذكية لبناء الشجرة (تعتبر الحسابات المفلترة جذوراً حتى لو كان والدها الأصلي غير موجود في القائمة المفلترة)
  const buildTree = (data: any[], parentId = null, isRoot = true): any[] => {
    return data
      .filter(item => {
        if (isRoot) {
          // إذا كنا في المستوى الأول، نتحقق هل والده موجود في القائمة المفلترة حالياً؟
          // إذا لم يكن موجوداً، نعتبر هذا الحساب "جذر" في هذه القائمة المعروضة.
          return !data.find(d => d.id === item.parent_id);
        }
        return item.parent_id === parentId;
      })
      .map(item => ({
        ...item,
        children: buildTree(data, item.id, false)
      }));
  };

  const accountTree = buildTree(accounts);

  const RenderTreeNodes = ({ nodes, depth = 0 }: { nodes: any[], depth: number }) => {
    return (
      <>
        {nodes.map((node) => (
          <div key={node.id}>
            <div 
              onMouseDown={() => {
                onChange(node.id);
                setIsOpen(false);
              }}
              style={{ 
                padding: '10px 15px', 
                paddingRight: `${(depth * 20) + 15}px`,
                cursor: 'pointer', 
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: node.id == value ? '#fdf7e9' : 'transparent',
                transition: '0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = node.id == value ? '#fdf7e9' : 'transparent'}
            >
              {node.children.length > 0 ? (
                <span style={{ color: THEME.coffeeMain, fontSize: '12px' }}>📁</span>
              ) : (
                <span style={{ color: borderColor, fontSize: '10px' }}>●</span>
              )}
              <span style={{ 
                fontWeight: node.children.length > 0 ? '900' : 'bold',
                color: node.children.length > 0 ? THEME.coffeeDark : '#444',
                fontSize: node.children.length > 0 ? '14px' : '13px'
              }}>
                {node.code && <small style={{ color: '#888', marginLeft: '5px' }}>{node.code}</small>}
                {node.name}
              </span>
            </div>
            {node.children.length > 0 && (
              <RenderTreeNodes nodes={node.children} depth={depth + 1} />
            )}
          </div>
        ))}
      </>
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      <label style={{ color: THEME.coffeeDark, fontWeight: '800', fontSize: '14px', marginBottom: '8px', display: 'block' }}>{label}</label>
      <div 
        tabIndex={0}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `2px solid ${THEME.sandDark}`, borderRight: `5px solid ${borderColor}`, fontWeight: 'bold', backgroundColor: '#FFFFFF', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span style={{ color: selectedAccount ? '#000' : '#888' }}>
          {selectedAccount ? `${selectedAccount.code || ''} - ${selectedAccount.name}` : '-- اختر من شجرة الحسابات --'}
        </span>
        <span style={{ fontSize: '12px', transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.3s' }}>▼</span>
      </div>
      {isOpen && (
        <div className="custom-scrollbar" style={{ position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 9999, marginTop: '5px', backgroundColor: '#fff', border: `2px solid ${THEME.coffeeMain}`, borderRadius: '10px', maxHeight: '300px', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          {accountTree.length > 0 ? <RenderTreeNodes nodes={accountTree} depth={0} /> : <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>لا توجد حسابات مطابقة.</div>}
        </div>
      )}
    </div>
  );
}