"use client";
import React, { useState } from 'react';
import { usePartnersLogic } from './partners_logic';

const THEME = {
  sandLight: '#F4F1EE',
  sandDark: '#E6D5C3',
  coffeeMain: '#8C6A5D',
  coffeeDark: '#43342E',
  goldAccent: '#C5A059',
};

export default function PartnersDirectory() {
  const {
    isLoading, searchTerm, setSearchTerm, filterType, setFilterType,
    isAddModalOpen, setIsAddModalOpen, newPartner, setNewPartner,
    isSaving, handleSavePartner, filteredPartners, stats, getTypeStyle,
    handleDelete, exportToExcel, handlePrint, handleEdit, selectedIds, setSelectedIds, editingId,
    // استدعاء متغيرات الصفحات من اللوجيك
    currentPage, setCurrentPage, rowsPerPage, setRowsPerPage, totalPages, totalResults
  } = usePartnersLogic();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isOneSelected = selectedIds.length === 1;
  const isNoneSelected = selectedIds.length === 0;

  const handleMainAction = () => {
    if (isOneSelected) {
      const partnerToEdit = filteredPartners.find(p => p.id === selectedIds[0]);
      if (partnerToEdit) handleEdit(partnerToEdit);
    } else {
      setIsAddModalOpen(true);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPartners.length && filteredPartners.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPartners.map(p => p.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 🎨 دالة تحديد الألوان لكل تصنيف (Badge Colors)
  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'موظف': return { bg: '#E0F2FE', color: '#0369A1' }; // أزرق
      case 'عامل يومية': return { bg: '#DCFCE7', color: '#166534' }; // أخضر
      case 'مقاول': return { bg: '#FEF3C7', color: '#B45309' }; // ذهبي/برتقالي
      case 'عميل': return { bg: '#F3E8FF', color: '#6B21A8' }; // بنفسجي
      case 'جهة داخلية': return { bg: '#F3F4F6', color: '#374151' }; // رمادي
      default: return { bg: '#FEE2E2', color: '#991B1B' }; // أحمر
    }
  };

  return (
    <div className="app-container" style={{ direction: 'rtl', backgroundColor: THEME.sandLight, display: 'flex' }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        
        /* 🎨 تخصيص السكرول بار (رملي / كافيه فاتح) */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.02); }
        ::-webkit-scrollbar-thumb { background-color: ${THEME.sandDark}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background-color: ${THEME.coffeeMain}; }

        /* 💡 تنسيق الشاشة فقط */
        @media screen {
          .app-container { height: 100vh; width: 100vw; overflow: hidden; }
          .main-content { flex: 1; height: 100vh; overflow-y: auto; padding: 50px; margin-right: 70px; transition: margin-right 0.4s; }
          .main-content.sidebar-open { margin-right: 320px; }
          .print-only { display: none !important; }
        }

        /* 🖨️ نظام الطباعة الاحترافي الشامل */
        @media print {
          @page { size: A4 landscape; margin: 1cm; }
          aside, .no-print, .sidebar-input, .floating-row, .table-header-grid, .stat-card, button { 
            display: none !important; 
          }
          .app-container, .main-content { 
            display: block !important; height: auto !important; width: 100% !important; 
            overflow: visible !important; margin: 0 !important; padding: 0 !important;
          }
          .print-only { display: block !important; }
          .print-header {
            display: flex !important; justify-content: space-between; align-items: center;
            border-bottom: 3px solid ${THEME.coffeeDark}; padding-bottom: 15px; margin-bottom: 25px;
          }
          .print-table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed; }
          .print-table th, .print-table td {
            border: 1px solid #000 !important; padding: 6px 4px !important;
            text-align: center !important; font-size: 9pt !important; word-wrap: break-word; color: black !important;
          }
          .print-table th { background: #f2f2f2 !important; font-weight: 900; }
          .print-table thead { display: table-header-group !important; }
          .footer-space { height: 50px; }
          .print-footer {
            position: fixed; bottom: 0; left: 0; width: 100%; text-align: center;
            font-size: 10pt; border-top: 1px solid #ccc; padding: 10px 0; background: white;
          }
          body { counter-reset: page; }
          .page-num::after { counter-increment: page; content: "صفحة " counter(page); }
        }

        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
        .floating-row, .table-header-grid {
          background: white; border-radius: 20px; margin-bottom: 12px; display: grid; 
          grid-template-columns: 40px 80px 1.8fr 0.8fr 0.8fr 1.1fr 1.1fr 1.1fr 1.4fr 1fr;
          align-items: center; padding: 15px 15px; border: 1px solid transparent; transition: 0.3s;
        }
        .floating-row:hover { border-color: ${THEME.goldAccent}; transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .data-text { font-weight: 700; font-size: 13px; color: ${THEME.coffeeDark}; }
        .label-header { font-size: 11px; font-weight: 900; color: ${THEME.coffeeDark}; opacity: 0.7; }
        .control-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; font-weight: 900; cursor: pointer; margin-bottom: 10px; }
        .sidebar-input { background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px; border-radius: 12px; color: white; width: 100%; outline: none; }
        .modal-input { width: 100%; padding: 12px; border-radius: 12px; border: 1.5px solid ${THEME.sandDark}; background: #FFF; color: ${THEME.coffeeDark}; font-weight: 700; outline: none; }
        
        /* أدوات التنقل والفلترة المدمجة */
        .sidebar-select {
          width: 100%; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1); color: white; cursor: pointer; outline: none; margin-bottom: 12px; font-size: 12px;
        }
        .sidebar-select option { color: ${THEME.coffeeDark}; }
        .nav-group { display: flex; gap: 8px; margin-bottom: 15px; }
        .nav-arrow-btn { 
          flex: 1; padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05); color: white; cursor: pointer; font-weight: 900;
        }
        .nav-arrow-btn:disabled { opacity: 0.2; cursor: not-allowed; }
        
        .filter-btn {
          width: 100%; padding: 8px 12px; border-radius: 8px; border: none; cursor: pointer;
          font-weight: 700; text-align: right; font-size: 12px; transition: 0.3s; margin-bottom: 4px;
        }

        /* 🏷️ كلاس التصنيف الملون */
        .category-badge {
          padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 900; display: inline-block;
        }
      `}</style>

      {/* 🟢 السلايدر الجانبي (لوحة التحكم الشاملة) */}
      <aside 
        onMouseEnter={() => setIsSidebarOpen(true)} 
        onMouseLeave={() => setIsSidebarOpen(false)} 
        className="no-print" 
        style={{ 
          width: isSidebarOpen ? '320px' : '70px', 
          backgroundColor: THEME.coffeeDark, position: 'fixed', right: 0, top: 0, height: '100vh', 
          zIndex: 1000, borderLeft: `3px solid ${THEME.goldAccent}`, display: 'flex', 
          flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', transition: '0.4s' 
        }}
      >
        <div style={{ padding: '30px 25px', width: '320px', opacity: isSidebarOpen ? 1 : 0 }}>
          <h2 style={{ color: THEME.goldAccent, fontWeight: 900, fontSize: '24px', marginBottom: '25px' }}>لوحة التحكم</h2>
          
          {/* العمليات */}
          <button onClick={handleMainAction} className="control-btn" style={{ backgroundColor: isOneSelected ? THEME.goldAccent : '#FFF', color: THEME.coffeeDark }}>
            {isOneSelected ? '✏️ تعديل المختار' : '➕ إضافة كيان جديد'}
          </button>
          <button onClick={() => selectedIds.forEach(id => handleDelete(id))} className="control-btn" style={{ backgroundColor: isNoneSelected ? 'rgba(255,255,255,0.05)' : '#ef4444', color: '#FFF' }} disabled={isNoneSelected}>
            🗑️ حذف ({selectedIds.length})
          </button>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            <button onClick={exportToExcel} className="control-btn" style={{ backgroundColor: '#166534', color: '#FFF', marginBottom: 0, fontSize: '12px' }}>📊 إكسل</button>
            <button onClick={handlePrint} className="control-btn" style={{ backgroundColor: THEME.coffeeMain, color: '#FFF', marginBottom: 0, fontSize: '12px' }}>🖨️ طباعة</button>
          </div>

          <hr style={{ opacity: 0.1, margin: '15px 0' }} />

          {/* نظام الفلترة المدمج 🟢 */}
          <label style={{ color: THEME.goldAccent, fontSize: '11px', fontWeight: 900, display: 'block', marginBottom: '10px', opacity: 0.6 }}>تصفية حسب التصنيف</label>
          <div style={{ marginBottom: '20px' }}>
            {['الكل', 'جهة داخلية', 'موظف', 'مقاول', 'عامل يومية', 'عميل'].map(type => (
              <button 
                key={type} 
                onClick={() => setFilterType(type)} 
                className="filter-btn"
                style={{ 
                  backgroundColor: filterType === type ? 'rgba(255,255,255,0.1)' : 'transparent', 
                  color: filterType === type ? THEME.goldAccent : THEME.sandLight 
                }}
              >
                {type}
              </button>
            ))}
          </div>

          <hr style={{ opacity: 0.1, margin: '15px 0' }} />

          {/* نظام الصفحات 🔢 */}
          <label style={{ color: THEME.goldAccent, fontSize: '11px', fontWeight: 900, display: 'block', marginBottom: '8px', opacity: 0.6 }}>إعدادات العرض</label>
          <select className="sidebar-select" value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}>
            <option value={50}>إظهار 50 صف</option>
            <option value={100}>إظهار 100 صف</option>
            <option value={500}>إظهار 500 صف</option>
            <option value={1000}>إظهار 1000 صف</option>
          </select>

          <div className="nav-group">
            <button className="nav-arrow-btn" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>التالي ◀</button>
            <button className="nav-arrow-btn" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>▶ السابق</button>
          </div>
          
          <div style={{ textAlign: 'center', color: 'white', marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 900 }}>صفحة {currentPage} من {totalPages || 1}</div>
            <div style={{ fontSize: '10px', opacity: 0.5 }}>إجمالي النتائج: {totalResults}</div>
          </div>

          <hr style={{ opacity: 0.1, margin: '15px 0' }} />
          <input type="text" placeholder="بحث سريع..." className="sidebar-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {!isSidebarOpen && <div style={{ fontSize: '28px', textAlign: 'center', marginTop: '40px' }}>⚙️</div>}
      </aside>

      {/* 🟢 المحتوى الرئيسي */}
      <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        
        {/* هيدر الشاشة */}
        <header className="no-print" style={{ marginBottom: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="print-hide-text">
            <h1 style={{ fontSize: '52px', fontWeight: 900, color: THEME.coffeeDark, margin: 0 }}>دليل الشركاء</h1>
            <p style={{ color: THEME.coffeeMain, fontWeight: 700, opacity: 0.8, fontSize: '20px' }}>رواسي اليسر للمقاولات</p>
          </div>
          <div className="logo-container" style={{ width: '320px', height: '140px', background: 'white', borderRadius: '24px', border: `1px solid ${THEME.sandDark}`, padding: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            <img src="/RYC_Logo.png" alt="RYC" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </header>

        {/* هيدر الجدول (شاشة) */}
        <div className="table-header-grid no-print" style={{ opacity: 0.8, marginBottom: '15px' }}>
           <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length === filteredPartners.length && filteredPartners.length > 0} />
           {['كود', 'الاسم الكامل', 'التصنيف', 'المهنة', 'الهوية', 'انتهاء الهوية', 'الضريبي', 'العنوان', 'الجوال'].map(h => <div key={h} className="label-header">{h}</div>)}
        </div>

        {/* بيانات الجدول (شاشة) */}
        {filteredPartners.map((p) => {
          const badge = getBadgeStyle(p.type); // تطبيق ستايل الألوان
          return (
            <div key={p.id} className="floating-row no-print" style={{ border: selectedIds.includes(p.id) ? `1px solid ${THEME.goldAccent}` : '1px solid transparent' }}>
              <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelectRow(p.id)} />
              <div className="data-text" style={{ color: THEME.goldAccent }}>{p.code}</div>
              <div className="data-text">{p.name}</div>
              <div><span className="category-badge" style={{ backgroundColor: badge.bg, color: badge.color }}>{p.type}</span></div>
              <div className="data-text" style={{ fontSize: '13px', opacity: 0.8 }}>{p.role}</div>
              <div className="data-text">{p.idNumber}</div>
              <div className="data-text" style={{ color: '#D946EF' }}>{p.identity_expiry_date || "---"}</div>
              <div className="data-text" style={{ color: THEME.coffeeMain }}>{p.vat_number || "---"}</div>
              <div className="data-text" style={{ fontSize: '11px', opacity: 0.7 }}>{p.address}</div>
              <div className="data-text">{p.phone}</div>
            </div>
          );
        })}

        {/* 🖨️ نظام الطباعة (يظهر فقط في الورق) */}
        <div className="print-only">
           <div className="print-header">
             <div style={{ textAlign: 'right' }}>
               <h1 style={{ margin: 0, fontSize: '26pt', color: THEME.coffeeDark, fontWeight: 900 }}>دليل الشركاء</h1>
               <p style={{ margin: 0, fontSize: '14pt', color: THEME.coffeeMain, fontWeight: 700 }}>شركة رواسي اليسر للمقاولات العامة</p>
             </div>
             <img src="/RYC_Logo.png" style={{ width: '180px' }} alt="Logo" />
           </div>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>كود</th><th style={{ width: '180px' }}>الاسم الكامل</th>
                <th>التصنيف</th><th>المهنة</th><th>الهوية</th><th>انتهاء</th>
                <th>الضريبي</th><th style={{ width: '200px' }}>العنوان</th><th>الجوال</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map((p) => (
                <tr key={p.id}>
                  <td>{p.code}</td><td style={{ fontWeight: 'bold' }}>{p.name}</td><td>{p.type}</td><td>{p.role}</td><td>{p.idNumber}</td><td>{p.identity_expiry_date}</td><td>{p.vat_number}</td><td style={{ fontSize: '9pt' }}>{p.address}</td><td>{p.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="footer-space"></div>
          <div className="print-footer"><span className="page-num"></span><span style={{ marginRight: '40px' }}>تقرير رسمي - رواسي اليسر للمقاولات - {new Date().toLocaleDateString('ar-SA')}</span></div>
        </div>
      </main>

      {/* 🟢 نافذة المودال (المنبثقة) */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(67, 52, 46, 0.7)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001 }} onClick={() => setIsAddModalOpen(false)}>
          <div className="glass-card" style={{ width: '750px', padding: '40px', background: 'white', borderRadius: '30px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontWeight: 900, color: THEME.coffeeDark, marginBottom: '30px', fontSize: '28px', borderBottom: `2px solid ${THEME.goldAccent}`, paddingBottom: '10px' }}>{editingId ? '✏️ تعديل بيانات الكيان' : '➕ إضافة كيان جديد'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div><label className="label-header">الكود</label><input className="modal-input" value={newPartner.code} onChange={e => setNewPartner({...newPartner, code: e.target.value})} /></div>
                  <div><label className="label-header">التصنيف</label><select className="modal-input" value={newPartner.type} onChange={e => setNewPartner({...newPartner, type: e.target.value})}><option>موظف</option><option>عامل يومية</option><option>مقاول</option><option>جهة داخلية</option><option>عميل</option></select></div>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div><label className="label-header">الاسم الكامل</label><input className="modal-input" value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})} /></div>
                  <div><label className="label-header">المهنة</label><input className="modal-input" value={newPartner.role} onChange={e => setNewPartner({...newPartner, role: e.target.value})} /></div>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div><label className="label-header">رقم الهوية</label><input className="modal-input" value={newPartner.idNumber} onChange={e => setNewPartner({...newPartner, idNumber: e.target.value})} /></div>
                  <div><label className="label-header">تاريخ الانتهاء</label><input type="date" className="modal-input" value={newPartner.identity_expiry_date} onChange={e => setNewPartner({...newPartner, identity_expiry_date: e.target.value})} /></div>
               </div>
               <div><label className="label-header">الرقم الضريبي</label><input className="modal-input" value={newPartner.vat_number} onChange={e => setNewPartner({...newPartner, vat_number: e.target.value})} /></div>
               <div><label className="label-header">العنوان</label><input className="modal-input" value={newPartner.address} onChange={e => setNewPartner({...newPartner, address: e.target.value})} /></div>
               <div><label className="label-header">رقم الجوال</label><input className="modal-input" value={newPartner.phone} onChange={e => setNewPartner({...newPartner, phone: e.target.value})} /></div>
               <button onClick={handleSavePartner} disabled={isSaving} style={{ backgroundColor: THEME.coffeeDark, color: 'white', padding: '18px', borderRadius: '15px', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '16px' }}>{isSaving ? 'جاري الحفظ...' : '✅ اعتماد البيانات'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}