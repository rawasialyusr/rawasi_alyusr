"use client";
import React from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';

export default function AddProjectModal({ logic, mounted }: { logic: any, mounted: boolean }) {
  if (!mounted || !logic.isAddProjectModalOpen || typeof document === 'undefined') return null;

  // 🎯 تحديد إذا كانت العملية تعديل أم إضافة
  const isEditing = !!logic.currentProjectRecord.id;

  return createPortal(
    <div 
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(67, 52, 46, 0.5)', backdropFilter: 'blur(12px)', zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '5vh', paddingBottom: '5vh', overflowY: 'auto' }} 
      onClick={() => logic.setIsAddProjectModalOpen(false)}
    >
      <div 
        className="modal-content cinematic-scroll" 
        onClick={(e) => e.stopPropagation()} 
        style={{ background: 'white', padding: '35px', borderRadius: '24px', width: '100%', maxWidth: '850px', direction: 'rtl', boxShadow: '0 40px 100px rgba(0,0,0,0.5)', margin: 'auto' }}
      >
        <h2 style={{ fontWeight: 900, color: THEME.coffeeDark, marginBottom: '25px', fontSize: '24px', borderBottom: `2px dashed ${THEME.goldAccent}`, paddingBottom: '15px' }}>
            {/* 🎯 تغيير العنوان ديناميكياً */}
            {isEditing ? '✏️ تعديل بيانات المشروع' : '➕ إضافة مشروع / عقار جديد'}
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
           
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
             <div>
                <label className="modal-label"># كود المشروع</label>
                <input type="text" className="modal-input" placeholder="مثال: PRJ-001" value={logic.currentProjectRecord.project_code || ''} onChange={e => logic.setCurrentProjectRecord({...logic.currentProjectRecord, project_code: e.target.value})} />
             </div>
             <div>
                <label className="modal-label">🏢 اسم العقار / المشروع (إلزامي)</label>
                <input type="text" className="modal-input" placeholder="اسم العقار أو المشروع" value={logic.currentProjectRecord.Property || ''} onChange={e => logic.setCurrentProjectRecord({...logic.currentProjectRecord, Property: e.target.value})} />
             </div>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: 'rgba(197, 160, 89, 0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(197, 160, 89, 0.2)' }}>
             <div>
                <label className="modal-label" style={{ color: THEME.goldAccent }}>🏠 نوع النموذج (Type)</label>
                <input type="text" className="modal-input" placeholder="مثال: Type A, فيلا مزدوجة..." value={logic.currentProjectRecord.unit_type || ''} onChange={e => logic.setCurrentProjectRecord({...logic.currentProjectRecord, unit_type: e.target.value})} />
             </div>
             <div>
                <label className="modal-label" style={{ color: THEME.goldAccent }}>📏 مساحة العقار (م٢)</label>
                <input type="number" className="modal-input" placeholder="مثال: 250" value={logic.currentProjectRecord.unit_area || ''} onChange={e => logic.setCurrentProjectRecord({...logic.currentProjectRecord, unit_area: e.target.value})} />
             </div>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
             <div>
                <label className="modal-label">👤 العميل المالك</label>
                <select className="modal-input" value={logic.currentProjectRecord.client_id || ''} onChange={e => logic.setCurrentProjectRecord({...logic.currentProjectRecord, client_id: e.target.value})}>
                    <option value="">-- اختر العميل --</option>
                    {logic.clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
             </div>
             <div>
                <label className="modal-label">👷 مدير المشروع</label>
                <input type="text" className="modal-input" placeholder="اسم مدير المشروع" value={logic.currentProjectRecord.project_manager || ''} onChange={e => logic.setCurrentProjectRecord({...logic.currentProjectRecord, project_manager: e.target.value})} />
             </div>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
             <div>
                <label className="modal-label">📅 تاريخ البدء</label>
                <input type="date" className="modal-input" value={logic.currentProjectRecord.start_date || ''} onChange={e => logic.setCurrentProjectRecord({...logic.currentProjectRecord, start_date: e.target.value})} />
             </div>
             <div>
                <label className="modal-label">🏁 تاريخ الانتهاء المتوقع</label>
                <input type="date" className="modal-input" value={logic.currentProjectRecord.end_date || ''} onChange={e => logic.setCurrentProjectRecord({...logic.currentProjectRecord, end_date: e.target.value})} />
             </div>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
             <div>
                <label className="modal-label">💰 قيمة التعاقد</label>
                <input type="number" className="modal-input" placeholder="0.00" value={logic.currentProjectRecord.contract_value || ''} onChange={e => logic.setCurrentProjectRecord({...logic.currentProjectRecord, contract_value: e.target.value})} />
             </div>
             <div>
                <label className="modal-label">📊 الميزانية التقديرية</label>
                <input type="number" className="modal-input" placeholder="0.00" value={logic.currentProjectRecord.estimated_budget || ''} onChange={e => logic.setCurrentProjectRecord({...logic.currentProjectRecord, estimated_budget: e.target.value})} />
             </div>
             <div>
                <label className="modal-label">💵 الدفعة المقدمة</label>
                <input type="number" className="modal-input" placeholder="0.00" value={logic.currentProjectRecord.down_payment || ''} onChange={e => logic.setCurrentProjectRecord({...logic.currentProjectRecord, down_payment: e.target.value})} />
             </div>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px' }}>
             <div>
                <label className="modal-label">📍 عنوان الموقع</label>
                <input type="text" className="modal-input" placeholder="عنوان العقار بالتفصيل" value={logic.currentProjectRecord.location_address || ''} onChange={e => logic.setCurrentProjectRecord({...logic.currentProjectRecord, location_address: e.target.value})} />
             </div>
             <div>
                <label className="modal-label">📈 الحالة</label>
                <select className="modal-input" value={logic.currentProjectRecord.status || 'قيد الدراسة'} onChange={e => logic.setCurrentProjectRecord({...logic.currentProjectRecord, status: e.target.value})}>
                    <option value="قيد الدراسة">قيد الدراسة</option>
                    <option value="جاري تجهيز الموقع">جاري تجهيز الموقع</option>
                    <option value="قيد التنفيذ">قيد التنفيذ</option>
                    <option value="متوقف مؤقتا">متوقف مؤقتا</option>
                </select>
             </div>
             <div>
                <label className="modal-label">⚙️ المرحلة الحالية</label>
                <input type="text" className="modal-input" placeholder="مثال: الحفر" value={logic.currentProjectRecord.current_stage || ''} onChange={e => logic.setCurrentProjectRecord({...logic.currentProjectRecord, current_stage: e.target.value})} />
             </div>
           </div>

           <div>
              <label className="modal-label">📝 ملاحظات عامة</label>
              <textarea className="modal-input" rows={3} placeholder="أي تفاصيل أخرى..." value={logic.currentProjectRecord.notes || ''} onChange={e => logic.setCurrentProjectRecord({...logic.currentProjectRecord, notes: e.target.value})}></textarea>
           </div>

           {/* 💾 أزرار الحفظ والإلغاء */}
           <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
             <button onClick={logic.handleSaveProject} disabled={logic.isSavingProject} className="save-btn">
               {/* 🎯 تغيير نص الزر */}
               {logic.isSavingProject ? '⏳ جاري الحفظ...' : (isEditing ? '💾 حفظ التعديلات' : '💾 اعتماد المشروع')}
             </button>
             <button onClick={() => {
                 logic.setIsAddProjectModalOpen(false);
                 // 🎯 تصفير البيانات عند الإغلاق
                 logic.setCurrentProjectRecord({ project_code: '', Property: '', unit_type: '', unit_area: '', client_id: '', contract_value: '', estimated_budget: '', down_payment: '', start_date: '', end_date: '', location_address: '', project_manager: '', status: 'قيد الدراسة', current_stage: 'تجهيز الموقع', notes: '' });
             }} className="cancel-btn">
               إلغاء
             </button>
           </div>
        </div>
      </div>
    </div>,
    document.body
  );
}