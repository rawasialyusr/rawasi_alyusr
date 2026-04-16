"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react'; 
import { useQuickEntryLogic } from './quick_logic';

// ❌ تم حذف استيراد الأكشنز نهائياً لتجنب الـ Build Error

// 🎨 الهوية البصرية المعتمدة (الرسمية) لـ "رواسي اليسر"
const BRAND = {
  sandLight: '#F4F1EE',
  sandDark: '#E6D5C3',
  coffeeMain: '#8C6A5D',
  coffeeDark: '#2D221E',
  gold: '#C5A059',
  white: '#FFFFFF',
  success: '#166534',
  danger: '#991B1B'
};

export default function BrandedQuickEntry() {
  // ✅ تم سحب كل البيانات (بما فيها الموظفين والمراحل) من اللوجيك مباشرة
  const { 
    treasuries = [], 
    expenseAccounts = [], 
    revenueAccounts = [], 
    projects = [], 
    employees = [], // سحب الموظفين من اللوجيك
    stages = [],    // سحب المراحل من اللوجيك
    isSaving, 
    submitQuickEntry 
  } = useQuickEntryLogic();
  
  const [subType, setSubType] = useState('');
  const [activeForm, setActiveForm] = useState<'expense' | 'revenue' | null>(null);

  // 🔍 حالات إضافية للبحث الذكي في المشاريع
  const [projectSearch, setProjectSearch] = useState('');
  const [isProjectListOpen, setIsProjectListOpen] = useState(false);
  const projectListRef = useRef<HTMLDivElement>(null);

  // 📝 الحالة الجديدة (الاسكيما المتكاملة)
  const [formData, setFormData] = useState({ 
    docNumber: '',          
    debitAccount: '',       
    description: '',        
    quantity: 1,            
    price: 0,               
    projectId: '',          
    stageId: '',            
    partnerId: '',          
    date: new Date().toISOString().split('T')[0], 
    creditAccount: '',      
    notes: ''               
  });

  // 🔍 فلترة المشاريع بناءً على البحث
  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projects || [];
    return (projects || []).filter(p => 
      p.name?.toLowerCase().includes(projectSearch.toLowerCase()) || 
      p.project_code?.toLowerCase().includes(projectSearch.toLowerCase())
    );
  }, [projectSearch, projects]);

  // حساب الإجمالي تلقائياً
  const totalAmount = useMemo(() => {
    return (Number(formData.quantity) || 0) * (Number(formData.price) || 0);
  }, [formData.quantity, formData.price]);

  useEffect(() => {
    // ❌ تم حذف دالة loadData اللي كانت بتنادي على الأكشنز الغلط
    
    // إغلاق القائمة المنسدلة عند الضغط خارجها
    const handleClickOutside = (e: MouseEvent) => {
      if (projectListRef.current && !projectListRef.current.contains(e.target as Node)) {
        setIsProjectListOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenForm = (type: 'expense' | 'revenue', sub: string = '') => {
    setSubType(sub);
    setActiveForm(type);
    setProjectSearch(''); 
    setFormData({ 
      docNumber: '',
      debitAccount: '',
      description: sub ? `إجراء ${sub}` : '', 
      quantity: 1,
      price: 0,
      projectId: '',
      partnerId: '',
      stageId: '',
      date: new Date().toISOString().split('T')[0], 
      creditAccount: '',
      notes: ''
    });
  };

  const handleSubmit = async () => {
    if (totalAmount <= 0) return alert('الرجاء إدخال الكمية والسعر');
    if (!formData.creditAccount || !formData.debitAccount) return alert('الرجاء اختيار الحسابات المدينة والدائنة');
    
    const success = await submitQuickEntry(activeForm!, { ...formData, amount: totalAmount });
    if (success) setActiveForm(null);
  };

  return (
    <div style={{ direction: 'rtl', padding: '60px 8%', backgroundColor: BRAND.sandLight, minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
        
        .brand-header { margin-bottom: 70px; text-align: right; border-right: 8px solid ${BRAND.gold}; padding-right: 25px; }
        .section-box { margin-bottom: 60px; }
        .section-title { font-size: 16px; font-weight: 900; color: ${BRAND.coffeeDark}; letter-spacing: 1px; margin-bottom: 30px; display: flex; align-items: center; gap: 20px; }
        .section-title::after { content: ''; flex: 1; height: 1.5px; background: linear-gradient(90deg, ${BRAND.gold}, transparent); opacity: 0.6; }
        .grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 25px; }
        .card-item { background: ${BRAND.white}; border-radius: 20px; padding: 30px; cursor: pointer; border: 1px solid ${BRAND.sandDark}; transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); display: flex; align-items: center; gap: 20px; box-shadow: 0 4px 6px rgba(45, 34, 30, 0.02); }
        .card-item:hover { border-color: ${BRAND.gold}; transform: translateY(-8px); box-shadow: 0 20px 40px rgba(197, 160, 89, 0.12); }
        .icon-wrapper { width: 60px; height: 60px; border-radius: 14px; display: flex; justify-content: center; align-items: center; font-size: 28px; flex-shrink: 0; background: ${BRAND.sandLight}; color: ${BRAND.coffeeDark}; border: 1px solid ${BRAND.sandDark}; }
        .card-item:hover .icon-wrapper { background: ${BRAND.coffeeDark}; color: ${BRAND.gold}; border-color: ${BRAND.gold}; }
        
        .glass-modal { position: fixed; inset: 0; background: rgba(26, 21, 19, 0.85); backdrop-filter: blur(12px); display: flex; justify-content: center; align-items: center; z-index: 10000; padding: 20px; }
        .form-container { background: white; border-radius: 28px; width: 100%; max-width: 850px; padding: 40px; border: 1px solid ${BRAND.gold}; box-shadow: 0 40px 100px rgba(0,0,0,0.3); animation: slideUp 0.4s ease-out; overflow-y: auto; max-height: 95vh; position: relative; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        
        .clean-input { width: 100%; padding: 12px 16px; border: 1.5px solid ${BRAND.sandDark}; border-radius: 10px; font-weight: 700; font-size: 15px; outline: none; transition: 0.2s; background: #FFF; color: ${BRAND.coffeeDark}; }
        .clean-input:focus { border-color: ${BRAND.gold}; background: #FFFDF9; }
        .input-label { font-size: 12px; font-weight: 900; color: ${BRAND.coffeeMain}; margin-bottom: 8px; display: block; text-transform: uppercase; }
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        
        .search-results {
          position: absolute; top: 100%; left: 0; right: 0; background: white; 
          border: 1px solid ${BRAND.gold}; border-radius: 10px; z-index: 10005;
          max-height: 200px; overflow-y: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          margin-top: 5px;
        }
        .search-item {
          padding: 12px 15px; cursor: pointer; border-bottom: 1px solid ${BRAND.sandLight};
          font-size: 14px; font-weight: 700; color: ${BRAND.coffeeDark};
        }
        .search-item:hover { background: ${BRAND.sandLight}; color: ${BRAND.gold}; }

        .total-box { background: #FDF2F2; border: 2px solid ${BRAND.danger}; color: ${BRAND.danger}; text-align: center; font-size: 22px; font-weight: 900; display: flex; align-items: center; justify-content: center; border-radius: 10px; height: 48px; }
        .btn-confirm { width: 100%; padding: 18px; border-radius: 12px; border: none; background: ${BRAND.coffeeDark}; color: ${BRAND.gold}; font-weight: 900; font-size: 18px; cursor: pointer; transition: 0.3s; margin-top: 15px; }
        .btn-confirm:hover { background: #000; transform: scale(1.01); }
      `}</style>

      {/* الهيدر */}
      <div className="brand-header">
        <h1 style={{ fontSize: '48px', fontWeight: 900, color: BRAND.coffeeDark, margin: 0 }}>مركز العمليات</h1>
        <p style={{ color: BRAND.coffeeMain, fontWeight: 700, marginTop: '5px', fontSize: '20px' }}>نظام رواسي اليـسر المالي المتكامل</p>
      </div>

      {/* البطاقات */}
      <div className="section-box">
        <div className="section-title">📦 إدارة المصروفات والتشغيل</div>
        <div className="grid-layout">
          <ActionCard title="العهود النقدية" icon="💼" onClick={() => handleOpenForm('expense', 'عهد')} />
          <ActionCard title="سند مصروفات" icon="🧾" onClick={() => handleOpenForm('expense', 'مصروفات')} />
          <ActionCard title="عقود التوريد" icon="🚚" onClick={() => handleOpenForm('expense', 'توريد')} />
          <ActionCard title="مقاول باطن" icon="👷" onClick={() => handleOpenForm('expense', 'مقاول باطن')} />
          <ActionCard title="مشتريات خامات" icon="🛒" onClick={() => handleOpenForm('expense', 'مشتريات')} />
        </div>
      </div>

      {/* النافذة المنبثقة */}
      {activeForm && (
        <div className="glass-modal" onClick={() => setActiveForm(null)}>
          <div className="form-container" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: `2px solid ${BRAND.sandLight}`, paddingBottom: '15px' }}>
              <div>
                <h2 style={{ margin: 0, fontWeight: 900, color: BRAND.coffeeDark, fontSize: '24px' }}>تسجيل {subType}</h2>
                <span style={{ fontSize: '13px', color: BRAND.coffeeMain, fontWeight: 700 }}>نموذج القيد المحاسبي المزدوج</span>
              </div>
              <button onClick={() => setActiveForm(null)} style={{ background: BRAND.sandLight, border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: 900 }}>إغلاق ✕</button>
            </div>

            <div className="form-grid-2">
              <div>
                <label className="input-label">🔵 قيد المشتريات (مدين)</label>
                <select className="clean-input" value={formData.debitAccount} onChange={e => setFormData({...formData, debitAccount: e.target.value})}>
                  <option value="">-- اختر الحساب المدين --</option>
                  {(activeForm === 'expense' ? expenseAccounts : revenueAccounts).map((acc: any) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">📄 رقم الفاتورة / المستند</label>
                <input className="clean-input" placeholder="00000" value={formData.docNumber} onChange={e => setFormData({...formData, docNumber: e.target.value})} />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="input-label">📝 البيان / تفاصيل الحركة</label>
              <input className="clean-input" placeholder="اكتب وصفاً تفصيلياً للعملية..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <div className="form-grid-3">
              <div>
                <label className="input-label">🔢 العدد / الكمية</label>
                <input type="number" className="clean-input" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
              </div>
              <div>
                <label className="input-label">🏷️ السعر</label>
                <input type="number" className="clean-input" placeholder="0.00" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
              </div>
              <div>
                <label className="input-label">💰 الإجمالي (تلقائي)</label>
                <div className="total-box">{totalAmount.toLocaleString()}</div>
              </div>
            </div>

            <div className="form-grid-2">
              <div style={{ position: 'relative' }} ref={projectListRef}>
                <label className="input-label" style={{ color: BRAND.gold }}>📍 توجيه المشروع (ابحث بالاسم أو الكود)</label>
                <input 
                  type="text" 
                  className="clean-input" 
                  placeholder="اكتب اسم المشروع أو الكود..."
                  value={projectSearch} 
                  onChange={(e) => {
                    setProjectSearch(e.target.value);
                    setIsProjectListOpen(true);
                  }}
                  onFocus={() => setIsProjectListOpen(true)}
                />
                {isProjectListOpen && filteredProjects.length > 0 && (
                  <div className="search-results">
                    {filteredProjects.map((proj: any) => (
                      <div 
                        key={proj.id} 
                        className="search-item" 
                        onClick={() => {
                          setFormData({ ...formData, projectId: proj.id });
                          setProjectSearch(`${proj.project_code || ''} - ${proj.name}`);
                          setIsProjectListOpen(false);
                        }}
                      >
                        <span style={{ color: BRAND.gold, fontWeight: 900 }}>{proj.project_code}</span> | {proj.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="input-label">🏢 المورد / الجهة المستفيدة</label>
                <select className="clean-input" value={formData.partnerId} onChange={e => setFormData({...formData, partnerId: e.target.value})}>
                  <option value="">-- اختر الجهة --</option>
                  {(employees || []).map((emp: any) => <option key={emp.id} value={emp.id}>{emp.emp_name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="input-label">🏗️ مرحلة المشروع المرتبطة</label>
              <select 
                className="clean-input" 
                value={formData.stageId} 
                onChange={e => setFormData({...formData, stageId: e.target.value})}
              >
                <option value="">-- اختر المرحلة (إن وجد) --</option>
                {stages.filter((s: any) => s.project_id === formData.projectId).map((stage: any) => (
                  <option key={stage.id} value={stage.id}>{stage.stage_name}</option>
                ))}
              </select>
            </div>

            <div className="form-grid-2">
              <div>
                <label className="input-label">📅 تاريخ المستند</label>
                <input type="date" className="clean-input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div>
                <label className="input-label">🔽 طريقة الدفع (دائن)</label>
                <select className="clean-input" value={formData.creditAccount} onChange={e => setFormData({...formData, creditAccount: e.target.value})}>
                  <option value="">-- اختر الخزنة أو البنك --</option>
                  {(treasuries || []).map((acc: any) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="input-label">🗒️ ملاحظات إضافية</label>
              <textarea className="clean-input" style={{ height: '80px', resize: 'none' }} placeholder="أي ملاحظات أخرى..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>

            <button onClick={handleSubmit} disabled={isSaving} className="btn-confirm">
              {isSaving ? '⏳ جاري الحفظ والترحيل...' : '✅ اعتماد القيد المزدوج'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionCard({ title, icon, onClick }: any) {
  return (
    <div className="card-item" onClick={onClick}>
      <div className="icon-wrapper">{icon}</div>
      <div style={{ fontWeight: 800, color: BRAND.coffeeDark, fontSize: '18px' }}>{title}</div>
    </div>
  );
}