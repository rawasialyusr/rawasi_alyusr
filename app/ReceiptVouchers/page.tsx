"use client";
import React, { useState } from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency, formatDate, tafqeet } from '@/lib/helpers';

// 🚀 الاستيرادات
import AuthGuard from '@/components/authGuard';
import AutoLogoutWrapper from '@/components/AutoLogoutWrapper';
import GlassContainer from '@/components/Glasscontainer';
import ResponsiveWrapper from '@/components/Responsivewrapper'; // 👈 استيراد الجوكر

// 🚀 استيراد المكونات الجديدة
import { OperationsCenter, PaginationPanel } from '@/components/operationscenter';
import BlurModal from '@/components/BlurModal';

// 🚀 الاستيراد من ملف اللوجيك 
import { useReceiptVouchers } from './ReceiptVouchers_logic';

export default function ReceiptVouchersPage() {
  const { 
    filteredVouchers, loading, stats, handleFilter, 
    isModalOpen, setIsModalOpen, isSubmitting, addVoucher, 
    selectedIds, toggleSelection, selectAll, deleteSelected 
  } = useReceiptVouchers();

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'نقدي (كاش)',
    notes: ''
  });

  // KPIs
  const receiptKPIs = [
    { title: 'إجمالي التحصيلات', value: formatCurrency(stats.total), color: THEME.primary, icon: '💰' },
    { title: 'تحصيلات البنوك', value: formatCurrency(stats.bank), color: '#2563eb', icon: '🏦' },
    { title: 'التحصيل النقدي', value: formatCurrency(stats.cash), color: THEME.success, icon: '💵' },
  ];

  // Pagination
  const startIndex = (currentPage - 1) * rowsPerPage;
  const displayedVouchers = filteredVouchers.slice(startIndex, startIndex + rowsPerPage);

  // حفظ السند
  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      alert("برجاء إدخال مبلغ صحيح أكبر من الصفر");
      return;
    }
    
    const result = await addVoucher({
      amount: Number(formData.amount),
      payment_method: formData.payment_method,
      notes: formData.notes
    });

    if (result.success) {
      setFormData({ amount: '', payment_method: 'نقدي (كاش)', notes: '' });
    }
  };

  return (
    <AuthGuard>
      <AutoLogoutWrapper>
        {/* 🚀 تغليف الصفحة بالكامل عشان تتجاوب مع الموبايل */}
        <ResponsiveWrapper>
          <div style={{ direction: 'rtl', fontFamily: 'Cairo, sans-serif', minHeight: '100vh', background: '#f8fafc', borderRadius: '15px' }}>
            
            <OperationsCenter 
              title="سندات القبض والتحصيل"
              kpis={receiptKPIs}
              searchQuery={searchQuery}
              onSearchChange={(val) => {
                setSearchQuery(val);
                handleFilter(val);
                setCurrentPage(1);
              }}
              selectedCount={selectedIds.length}
              onAdd={() => setIsModalOpen(true)}
              onDeleteSelected={deleteSelected}
              onPostSelected={() => console.log('ترحيل المختار')}
              onUnpostSelected={() => console.log('إلغاء الترحيل')}
            />

            <GlassContainer style={{ padding: '0', overflow: 'hidden' }}>
              {/* 🚀 السحر هنا للجدول على الموبايل */}
              <div className="mobile-table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', minWidth: '900px' /* مهم جداً عشان الموبايل */ }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '2px solid #edf2f7' }}>
                      <th style={{...tableHeaderStyle, width: '40px', textAlign: 'center'}}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.length === filteredVouchers.length && filteredVouchers.length > 0} 
                          onChange={selectAll} 
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </th>
                      <th style={tableHeaderStyle}>رقم السند</th>
                      <th style={tableHeaderStyle}>التاريخ</th>
                      <th style={tableHeaderStyle}>العميل</th>
                      <th style={tableHeaderStyle}>البيان</th>
                      <th style={tableHeaderStyle}>طريقة الدفع</th>
                      <th style={tableHeaderStyle}>المبلغ</th>
                      <th style={tableHeaderStyle}>مبلغ التفقيط</th>
                      <th style={tableHeaderStyle}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center' }}>جاري تحميل البيانات... ⏳</td></tr>
                    ) : displayedVouchers.length === 0 ? (
                      <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>لا توجد بيانات مطابقة للبحث 🔍</td></tr>
                    ) : (
                      displayedVouchers.map((voucher) => (
                        <tr 
                          key={voucher.id} 
                          style={{ 
                            borderBottom: '1px solid #edf2f7', 
                            transition: 'background 0.2s',
                            background: selectedIds.includes(voucher.id) ? '#f0f9ff' : 'transparent'
                          }} 
                          onMouseEnter={(e) => { if(!selectedIds.includes(voucher.id)) e.currentTarget.style.background = '#f8fafc' }} 
                          onMouseLeave={(e) => { if(!selectedIds.includes(voucher.id)) e.currentTarget.style.background = 'transparent' }}
                        >
                          <td style={{...tableCellStyle, textAlign: 'center'}}>
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(voucher.id)} 
                              onChange={() => toggleSelection(voucher.id)} 
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                          </td>
                          <td style={tableCellStyle}><strong>{voucher.id.slice(0, 8)}</strong></td>
                          <td style={tableCellStyle}>{formatDate(voucher.date)}</td>
                          <td style={tableCellStyle}>{voucher.partners?.name || 'عميل غير معروف'}</td>
                          <td style={tableCellStyle}>
                            {voucher.invoices ? `فاتورة #${voucher.invoices.invoice_number}` : (voucher.notes || 'تحت الحساب')}
                          </td>
                          <td style={tableCellStyle}>
                            <span style={{ 
                              padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
                              background: voucher.payment_method === 'نقدي (كاش)' ? '#fef3c7' : '#dbeafe',
                              color: voucher.payment_method === 'نقدي (كاش)' ? '#92400e' : '#1e40af'
                            }}>
                              {voucher.payment_method}
                            </span>
                          </td>
                          <td style={{ ...tableCellStyle, fontWeight: 'bold', color: THEME.success }}>
                            {formatCurrency(voucher.amount)}
                          </td>
                          <td style={{ ...tableCellStyle, fontSize: '10px', color: '#666' }}>
                            {tafqeet(voucher.amount)}
                          </td>
                          <td style={tableCellStyle}>
                            <button style={{ background: 'none', border: 'none', color: THEME.primary, cursor: 'pointer', fontSize: '16px' }}>📄</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </GlassContainer>

            {!loading && filteredVouchers.length > 0 && (
              <PaginationPanel 
                totalItems={filteredVouchers.length}
                currentPage={currentPage}
                rowsPerPage={rowsPerPage}
                onPageChange={setCurrentPage}
                onRowsChange={(rows) => {
                  setRowsPerPage(rows);
                  setCurrentPage(1);
                }}
              />
            )}

            <BlurModal 
              isOpen={isModalOpen} 
              onClose={() => setIsModalOpen(false)} 
              title="إصدار سند قبض جديد"
            >
              <form onSubmit={handleSaveVoucher} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>المبلغ</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      style={cinematicInputStyle} 
                      required 
                    />
                  </div>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>طريقة الدفع</label>
                    <select 
                      value={formData.payment_method}
                      onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                      style={cinematicInputStyle}
                    >
                      <option value="نقدي (كاش)">نقدي (كاش)</option>
                      <option value="تحويل بنكي">تحويل بنكي</option>
                      <option value="شيك">شيك</option>
                    </select>
                  </div>
                </div>

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>البيان / الملاحظات</label>
                  <textarea 
                    rows={3} 
                    placeholder="اكتب تفاصيل السند هنا..." 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    style={cinematicInputStyle} 
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: isSubmitting ? '#94a3b8' : THEME.primary, 
                    color: 'white', padding: '14px',
                    borderRadius: '10px', border: 'none', fontWeight: 900, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 10px 20px rgba(37, 99, 235, 0.3)',
                    transition: 'background 0.3s'
                  }}
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ السند وإصدار القيد ✅'}
                </button>
              </form>
            </BlurModal>

          </div>
        </ResponsiveWrapper>
      </AutoLogoutWrapper>
    </AuthGuard>
  );
}

// 🎨 التنسيقات
const tableHeaderStyle: React.CSSProperties = { padding: '15px 12px', color: '#475569', fontSize: '13px', fontWeight: 'bold' };
const tableCellStyle: React.CSSProperties = { padding: '12px', color: '#1e293b', fontSize: '13px', whiteSpace: 'nowrap' }; // whiteSpace: nowrap تمنع تكسير النص في الموبايل

// 🎨 تنسيقات المودال السينمائي
const inputGroupStyle = { display: 'flex', flexDirection: 'column', gap: '8px' as const };
const labelStyle = { color: '#94a3b8', fontSize: '13px', fontWeight: 'bold' as const };
const cinematicInputStyle = {
  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', padding: '12px', color: '#fff', outline: 'none'
};