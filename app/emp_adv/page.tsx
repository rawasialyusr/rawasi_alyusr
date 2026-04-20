"use client";

import React from 'react';
import { useEmpAdvLogic } from './emp_adv.logic';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import GlassContainer from '@/components/GlassContainer'; 
import { OperationsCenter } from '@/components/postingputton'; 
import AuthGuard from '@/components/authGuard';

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

  const formatDate = (dateVal: any) => {
    if (!dateVal) return "---";
    return new Date(dateVal).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <AuthGuard requiredRoles={['admin', 'accountant']}>
      <div style={{ direction: 'rtl', padding: '25px', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Cairo, sans-serif' }}>
        
        {/* ⚙️ مركز العمليات الموحد (الهيدر الرئيسي) */}
        <div style={{ marginBottom: '20px' }}>
          <OperationsCenter 
            title="منظومة عهد وسلف العمالة"
            kpis={[
              { title: 'إجمالي السلف', value: formatCurrency(totalAdvanceVal), color: '#10b981', icon: '💰' },
              { title: 'عدد العمليات', value: totalCount, color: '#0ea5e9', icon: '📝' },
              { title: 'بانتظار الترحيل', value: displayedAdvances.filter(a => !a.is_posted).length, color: '#f59e0b', icon: '⏳' }
            ]}
            searchQuery={searchName}
            onSearchChange={setSearchName}
            selectedCount={selectedIds.length}
            
            onDeleteSelected={handleDelete}
            onPostSelected={handlePostSelected}
            onUnpostSelected={handleUnpostSelected}
            
            onAdd={() => document.getElementById('import-excel')?.click()}
            addText="📥 استيراد من Excel"
            customActions={
              <button 
                onClick={exportToExcel}
                style={{ padding: '10px 20px', background: '#935b48', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
              >
                📤 تصدير البيانات
              </button>
            }
          />
          <input type="file" id="import-excel" accept=".xlsx, .xls" onChange={handleImportExcel} style={{ display: 'none' }} />
        </div>

        {/* 🛡️ هيدر الفلاتر الإضافية والمعلومات */}
        <GlassContainer>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', padding: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ background: THEME.primary + '10', padding: '10px', borderRadius: '12px' }}>
                <h1 style={{ color: THEME.primary, margin: 0, fontWeight: 900, fontSize: '20px' }}>💸 سجل السلف التاريخي</h1>
              </div>
              {/* فلتر البيان المدمج في الهيدر */}
              <input 
                type="text" 
                placeholder="فلترة بالبيان أو الموقع..." 
                value={searchSite} 
                onChange={(e) => setSearchSite(e.target.value)}
                style={{ padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '250px', outline: 'none', fontSize: '13px' }}
              />
            </div>

            {/* فلاتر التاريخ المدمجة في الهيدر */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '8px 15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#64748b' }}>الفترة من:</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#1e293b' }} />
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#64748b' }}>إلى:</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#1e293b' }} />
            </div>
          </div>
        </GlassContainer>

        {/* 📊 الجدول الرئيسي بكامل العرض */}
        <div style={{ marginTop: '20px', background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '20px', width: '50px' }}>
                    <input 
                      type="checkbox" 
                      onChange={toggleSelectAll} 
                      checked={displayedAdvances.length > 0 && selectedIds.length === displayedAdvances.length}
                      style={{ width: '18px', height: '18px', accentColor: THEME.primary }}
                    />
                  </th>
                  <th style={{ padding: '20px', fontWeight: 900, color: '#475569', fontSize: '14px' }}>الحالة</th>
                  <th style={{ padding: '20px', fontWeight: 900, color: '#475569', fontSize: '14px' }}>التاريخ</th>
                  <th style={{ padding: '20px', fontWeight: 900, color: '#475569', fontSize: '14px' }}>الموظف / العامل</th>
                  <th style={{ padding: '20px', fontWeight: 900, color: '#475569', fontSize: '14px' }}>البيان والغرض</th>
                  <th style={{ padding: '20px', fontWeight: 900, color: '#475569', fontSize: '14px' }}>القيمة</th>
                  <th style={{ padding: '20px', textAlign: 'center', fontWeight: 900, color: '#475569', fontSize: '14px' }}>تعديل</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: '100px', textAlign: 'center', color: '#94a3b8' }}>⏳ جاري تحميل البيانات...</td></tr>
                ) : displayedAdvances.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '100px', textAlign: 'center', color: '#94a3b8' }}>🔍 لا توجد سجلات مطابقة للبحث</td></tr>
                ) : displayedAdvances.map((adv) => (
                  <tr key={adv.id} style={{ borderBottom: '1px solid #f1f5f9', background: adv.is_posted ? '#f0fdf4' : 'white', transition: '0.2s' }}>
                    <td style={{ padding: '15px 20px' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(String(adv.id))} 
                        onChange={() => toggleSelectRow(String(adv.id))}
                      />
                    </td>
                    <td style={{ padding: '15px 20px' }}>
                      {adv.is_posted ? 
                        <span style={{ background: '#10b981', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 900 }}>مُرحل ✅</span> : 
                        <span style={{ background: '#f1f5f9', color: '#64748b', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 900, border: '1px solid #e2e8f0' }}>معلق</span>
                      }
                    </td>
                    <td style={{ padding: '15px 20px', color: '#64748b', fontWeight: 'bold' }}>{formatDate(adv.date)}</td>
                    <td style={{ padding: '15px 20px', fontWeight: 900, color: '#1e293b' }}>{adv.emp_name}</td>
                    <td style={{ padding: '15px 20px', color: '#475569', fontSize: '13px' }}>{adv.Desc || adv.notes || '-'}</td>
                    <td style={{ padding: '15px 20px', fontWeight: 900, color: '#e11d48', fontSize: '16px' }}>{formatCurrency(adv.amount)}</td>
                    <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleEdit(adv)} 
                        disabled={adv.is_posted}
                        style={{ background: 'none', border: 'none', cursor: adv.is_posted ? 'not-allowed' : 'pointer', fontSize: '18px', opacity: adv.is_posted ? 0.2 : 1 }}
                      >
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 🔢 فوتر الترقيم (Pagination) */}
          <footer style={{ padding: '20px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 900 }}>عرض السجلات:</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                <option value={100}>100 سجل</option>
                <option value={500}>500 سجل</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button 
                disabled={currentPage === 0} 
                onClick={() => setCurrentPage(p => p - 1)} 
                style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 900, cursor: 'pointer', opacity: currentPage === 0 ? 0.5 : 1 }}
              >السابق</button>
              <div style={{ fontWeight: 900, background: THEME.primary + '10', color: THEME.primary, padding: '6px 20px', borderRadius: '10px' }}>
                صفحة {currentPage + 1} من {totalPages}
              </div>
              <button 
                disabled={currentPage >= totalPages - 1} 
                onClick={() => setCurrentPage(p => p + 1)} 
                style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 900, cursor: 'pointer', opacity: currentPage >= totalPages - 1 ? 0.5 : 1 }}
              >التالي</button>
            </div>
          </footer>
        </div>

        {/* ✏️ مودال التحديث (كما هو) */}
        {isEditModalOpen && editingRecord && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div style={{ background: 'white', padding: '35px', borderRadius: '24px', width: '450px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <h3 style={{ margin: '0 0 25px 0', fontWeight: 900, color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>✏️ تحديث بيانات السلفة</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <input type="date" value={editingRecord.date || ''} onChange={(e) => setEditingRecord({...editingRecord, date: e.target.value})} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }} />
                <input type="text" placeholder="اسم العامل" value={editingRecord.emp_name || ''} onChange={(e) => setEditingRecord({...editingRecord, emp_name: e.target.value})} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }} />
                <input type="text" placeholder="البيان" value={editingRecord.Desc || ''} onChange={(e) => setEditingRecord({...editingRecord, Desc: e.target.value})} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }} />
                <input type="number" placeholder="المبلغ" value={editingRecord.amount || ''} onChange={(e) => setEditingRecord({...editingRecord, amount: Number(e.target.value)})} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: 900, color: '#e11d48' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '35px' }}>
                <button onClick={handleSaveUpdate} style={{ flex: 2, padding: '14px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}>💾 حفظ التعديلات</button>
                <button onClick={() => setIsEditModalOpen(false)} style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}>إلغاء</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}