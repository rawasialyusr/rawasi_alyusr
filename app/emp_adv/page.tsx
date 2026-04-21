"use client";

import React, { useEffect } from 'react';
import { useEmpAdvLogic } from './emp_adv.logic';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import AuthGuard, { useAuth } from '@/components/authGuard'; 
import MasterPage from '@/components/MasterPage'; 
import SmartCombo from '@/components/SmartCombo'; 
import { useSidebar } from '@/lib/SidebarContext'; // 🔌 الربط بالسايد بار المركزي

export default function EmpAdvPage() {
  const {
    loading, displayedAdvances, 
    searchName, setSearchName,
    searchSite, setSearchSite, 
    startDate, setStartDate, 
    endDate, setEndDate,
    currentPage, setCurrentPage, 
    totalCount, totalPages, totalAdvanceVal,
    selectedIds, toggleSelectAll, toggleSelectRow,
    handleDelete, handleEdit,
    isEditModalOpen, setIsEditModalOpen,
    editingRecord, setEditingRecord,
    handleSaveUpdate,
    exportToExcel, handleImportExcel,
    handlePostSelected, handleUnpostSelected,
    pageSize, setPageSize 
  } = useEmpAdvLogic();

  const { setSidebarContent } = useSidebar(); // 🚀 سحب دالة التحكم بالسايد بار
  const { can } = useAuth(); 

  // 🛡️ 1. إرسال الأزرار والملخص المالي للسايد بار الرئيسي (اللاياوت)
  useEffect(() => {
    const sidebarActions = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {can('emp_adv', 'create') && (
            <button className="btn-main-glass gold" onClick={() => document.getElementById('import-excel')?.click()}>
                📥 استيراد من Excel
            </button>
        )}
        
        {selectedIds.length > 0 && (
          <>
            <p style={{fontSize:'10px', textAlign:'center', color:'#94a3b8', fontWeight:900, marginBottom:'-5px'}}>الإجراءات على ({selectedIds.length})</p>
            {can('emp_adv', 'post') && <button className="btn-main-glass blue" onClick={handlePostSelected}>🚀 ترحيل السلف</button>}
            {can('emp_adv', 'post') && <button className="btn-main-glass yellow" onClick={handleUnpostSelected}>↩️ فك الترحيل</button>}
            {can('emp_adv', 'delete') && <button className="btn-main-glass red" onClick={handleDelete}>🗑️ حذف نهائي</button>}
          </>
        )}

        <button className="btn-main-glass white" onClick={exportToExcel}>📊 تصدير البيانات</button>
      </div>
    );

    const sidebarSummary = (
        <div className="summary-glass-card">
            <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي مديونية العمالة 💸</span>
            <div style={{fontSize:'22px', fontWeight:900, color: THEME.primary}}>{formatCurrency(totalAdvanceVal)}</div>
            <div style={{fontSize:'11px', color:'#10b981', fontWeight:800, marginTop:'5px'}}>إجمالي العمليات: {totalCount}</div>
        </div>
    );

    // تحديث محتوى السايد بار
    setSidebarContent({
      actions: sidebarActions,
      summary: sidebarSummary,
      customFilters: null 
    });

    // تنظيف عند الخروج
    return () => setSidebarContent({ actions: null, summary: null, customFilters: null });
  }, [selectedIds, totalAdvanceVal, totalCount, setSidebarContent, can]);


  const formatDate = (dateVal: any) => {
    if (!dateVal) return "---";
    return new Date(dateVal).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <AuthGuard requiredRoles={['admin', 'accountant']}>
      <MasterPage 
        title="عهد وسلف العمالة" 
        subtitle="تتبع المديونيات التاريخية والمستحقات الميدانية"
      >
        
        {/* مخفي: لرفع ملف الاكسيل */}
        <input type="file" id="import-excel" accept=".xlsx, .xls" onChange={handleImportExcel} style={{ display: 'none' }} />

        {/* 🔍 منطقة الفلاتر والبحث داخل الصفحة */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 2, minWidth: '300px' }}>
            <SmartCombo 
                label="بحث ذكي متقدم"
                icon="🔍"
                freeText={true}
                initialDisplay={searchSite}
                onSelect={(val: string) => setSearchSite(val)}
                placeholder="ابحث باسم الموظف، الموقع، أو غرض السلفة..."
            />
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.6)', padding: '10px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.8)', height: '48px' }}>
            <span style={{ fontSize: '11px', fontWeight: 900, color: '#64748b' }}>الفترة:</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: 700 }} title="من تاريخ" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: 700 }} title="إلى تاريخ" />
          </div>
        </div>

        {/* 📊 الجدول الزجاجي الموحد */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid #f1f5f9` }}>
                <th style={{ padding: '15px' }}>
                   <input type="checkbox" className="custom-checkbox" onChange={toggleSelectAll} checked={displayedAdvances.length > 0 && selectedIds.length === displayedAdvances.length} />
                </th>
                <th style={{ padding: '15px', fontWeight: 900, fontSize: '14px', color: '#475569' }}>الحالة</th>
                <th style={{ padding: '15px', fontWeight: 900, fontSize: '14px', color: '#475569' }}>التاريخ</th>
                <th style={{ padding: '15px', fontWeight: 900, fontSize: '14px', color: '#475569' }}>الموظف / العامل</th>
                <th style={{ padding: '15px', fontWeight: 900, fontSize: '14px', color: '#475569' }}>البيان</th>
                <th style={{ padding: '15px', fontWeight: 900, fontSize: '14px', color: '#475569' }}>القيمة</th>
                <th style={{ padding: '15px', textAlign: 'center', fontWeight: 900, fontSize: '14px', color: '#475569' }}>تعديل</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '100px', textAlign: 'center', fontWeight: 900, color: '#94a3b8' }}>⏳ جاري تحميل البيانات...</td></tr>
              ) : displayedAdvances.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '100px', textAlign: 'center', color: '#94a3b8', fontWeight: 900 }}>🔍 لا توجد سجلات</td></tr>
              ) : displayedAdvances.map((adv:any) => (
                <tr key={adv.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', background: adv.is_posted ? 'rgba(16, 185, 129, 0.03)' : 'transparent' }}>
                  <td style={{ padding: '15px' }}>
                    <input type="checkbox" className="custom-checkbox" checked={selectedIds.includes(String(adv.id))} onChange={() => toggleSelectRow(String(adv.id))} />
                  </td>
                  <td style={{ padding: '15px' }}>
                    {adv.is_posted ? <span className="glass-badge green">مُرحل ✅</span> : <span className="glass-badge orange">معلق</span>}
                  </td>
                  <td style={{ padding: '15px', fontSize: '12px', color: '#64748b', fontWeight: 700 }}>{formatDate(adv.date)}</td>
                  <td style={{ padding: '15px', fontWeight: 800, color: '#1e293b' }}>{adv.emp_name}</td>
                  <td style={{ padding: '15px', fontSize: '13px', color: '#475569' }}>{adv.Desc || adv.notes || '-'}</td>
                  <td style={{ padding: '15px', fontWeight: 900, color: THEME.ruby, fontSize: '15px' }}>{formatCurrency(adv.amount)}</td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    {can('emp_adv', 'edit') && (
                        <button onClick={() => handleEdit(adv)} disabled={adv.is_posted} className="btn-glass-print" style={{fontSize:'12px', opacity: adv.is_posted ? 0.3 : 1}}>✏️</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 🔢 Pagination التحكم في الصفحات */}
        <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px' }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <span style={{fontSize:'12px', fontWeight:900, color:'#64748b'}}>السجلات:</span>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 800 }}>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems:'center' }}>
              <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} className="btn-glass-print">السابق</button>
              <div style={{background: THEME.primary, color:'white', padding:'6px 15px', borderRadius:'10px', fontWeight:900, fontSize:'13px'}}>
                 صفحة {currentPage + 1} من {totalPages}
              </div>
              <button disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} className="btn-glass-print">التالي</button>
            </div>
        </div>

        {/* ✏️ مودال التعديل الفخم */}
        {isEditModalOpen && editingRecord && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ background: 'white', padding: '35px', borderRadius: '30px', width: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <h3 style={{fontWeight:900, marginBottom:'25px', fontSize:'20px', borderBottom:'2px solid #f1f5f9', paddingBottom:'15px'}}>✏️ تعديل بيانات السلفة</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{fontSize:'12px', fontWeight:900, color:THEME.primary, display:'block', marginBottom:'5px'}}>📅 التاريخ</label>
                  <input type="date" value={editingRecord.date || ''} onChange={(e) => setEditingRecord({...editingRecord, date: e.target.value})} style={{padding:'14px', borderRadius:'12px', border:'2px solid #e2e8f0', width:'100%', fontWeight:800}} />
                </div>
                
                <SmartCombo 
                   label="الموظف / العامل" 
                   table="employees" 
                   freeText={true} 
                   initialDisplay={editingRecord.emp_name} 
                   onSelect={(v:any)=>setEditingRecord({...editingRecord, emp_name: v.name || v})} 
                />

                <div>
                  <label style={{fontSize:'12px', fontWeight:900, color:THEME.ruby, display:'block', marginBottom:'5px'}}>💰 قيمة السلفة</label>
                  <input type="number" value={editingRecord.amount} onChange={(e) => setEditingRecord({...editingRecord, amount: Number(e.target.value)})} style={{padding:'14px', borderRadius:'12px', border:'2px solid #fee2e2', width:'100%', fontWeight:900, fontSize:'18px', color:THEME.ruby}} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '35px' }}>
                <button onClick={handleSaveUpdate} style={{ flex: 2, background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '16px', borderRadius: '15px', border: 'none', fontWeight: 900, cursor: 'pointer', boxShadow:'0 10px 15px rgba(16, 185, 129, 0.2)' }}>💾 حفظ التعديلات</button>
                <button onClick={() => setIsEditModalOpen(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', padding: '16px', borderRadius: '15px', border: 'none', fontWeight: 900, cursor: 'pointer' }}>إلغاء</button>
              </div>
            </div>
          </div>
        )}

      </MasterPage>
    </AuthGuard>
  );
}