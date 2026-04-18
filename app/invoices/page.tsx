"use client";
import React, { useState } from 'react';
import { useInvoicesLogic } from './invoices_logic';
import { THEME } from '@/lib/theme';
import { formatCurrency, getInvoiceAging } from '@/lib/helpers'; // تأكد من وجود getInvoiceAging
import InvoiceAgingDashboard from '@/components/InvoiceAgingDashboard';

// استيراد المكونات
import { OperationsCenter, PaginationPanel } from '@/components/operationscenter';
import InvoiceFormModal from './InvoiceFormModal';
import InvoicePrintModal from './InvoicePrintModal';

// --- [تعريف الستايلات لتجنب ReferenceError] ---
const tableHeaderStyle: React.CSSProperties = { padding: '15px', textAlign: 'right' };
const dateInputStyle: React.CSSProperties = {
  padding: '10px',
  borderRadius: '8px',
  border: `1px solid #cbd5e1`,
  fontSize: '13px',
  width: '100%',
  outline: 'none',
  background: 'white'
};

// --- [عنصر الجدول] ---
const InvoicesTable = ({ data, projects, selectedIds, onToggleSelect, onSelectAll, onPrint, onEdit }: any) => {
  return (
    <div style={{ background: 'white', borderRadius: '12px', overflowX: 'auto', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl', minWidth: '800px' }}>
        <thead>
          <tr style={{ background: THEME.primary, color: 'white' }}>
            <th style={{ padding: '15px', width: '50px' }}>
              <input 
                type="checkbox" 
                onChange={(e) => onSelectAll(e.target.checked)} 
                checked={data.length > 0 && selectedIds.length === data.length}
              />
            </th>
            <th style={tableHeaderStyle}>رقم الفاتورة</th>
            <th style={tableHeaderStyle}>العميل / المشروع</th>
            <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>الصافي</th>
            <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>الحالة</th>
            <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {data.map((inv: any) => {
            const projectNames = (inv.project_ids && inv.project_ids.length > 0 && projects)
              ? projects.filter((p: any) => inv.project_ids.includes(p.id)).map((p: any) => p.Property || p.project_name || p.name).join('، ')
              : (inv.projects?.name || 'بدون مشروع');

            return (
              <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(inv.id)} 
                    onChange={() => onToggleSelect(inv.id)} 
                  />
                </td>
                <td style={{ padding: '12px' }}>#{inv.invoice_number}</td>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 'bold' }}>{inv.client_name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{projectNames}</div>
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 900, color: THEME.primary }}>
                  {formatCurrency(inv.net_amount || inv.total_amount)}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '20px', fontSize: '12px',
                    background: inv.status === 'مُعتمد' ? '#dcfce7' : '#fef9c3',
                    color: inv.status === 'مُعتمد' ? '#166534' : '#854d0e'
                  }}>{inv.status}</span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button onClick={() => onPrint(inv)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '18px' }}>🖨️</button>
                  <button onClick={() => onEdit(inv)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '18px' }}>📝</button>
                </td>
              </tr>
            )})}
        </tbody>
      </table>
    </div>
  );
};

export default function InvoicesPage() {
  const {
    invoices, allFiltered, projects, isLoading, isSaving,
    globalSearch, setGlobalSearch,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    selectedIds, setSelectedIds,
    currentPage, setCurrentPage,
    rowsPerPage, setRowsPerPage,
    handlePostSelected, handleUnpostSelected, handleDeleteSelected,
    handleSave, handleAddNew, handleEdit, 
    kpis, isEditModalOpen, setIsEditModalOpen, currentRecord, setCurrentRecord
  } = useInvoicesLogic();

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState(null);

  // حساب بيانات الأعمار
  const agingData = getInvoiceAging(allFiltered || invoices);

  const onToggleSelect = (id: string) => {
    setSelectedIds((p: string[]) => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const onSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? invoices.map((i: any) => i.id) : []);
  };

  return (
    <div style={{ padding: '25px', background: '#f8fafc', minHeight: '100vh', direction: 'rtl' }}>
      
      <OperationsCenter 
        title="مركز عمليات الفواتير"
        searchQuery={globalSearch}
        onSearchChange={setGlobalSearch}
        selectedCount={selectedIds.length}
        onAdd={handleAddNew}
        onEdit={() => handleEdit(invoices.find(i => i.id === selectedIds[0]))}
        onDeleteSelected={handleDeleteSelected}
        onPostSelected={handlePostSelected}
        onUnpostSelected={handleUnpostSelected}
        kpis={kpis}
        filtersSlot={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
            {/* لوحة أعمار الديون داخل السايد بار */}
            {!isLoading && <InvoiceAgingDashboard aging={agingData} />}

            {/* فلاتر التاريخ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px', background: 'rgba(0,0,0,0.03)', borderRadius: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>📅 تصفية الفترة:</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={dateInputStyle} />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={dateInputStyle} />
            </div>
          </div>
        }
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ color: THEME.primary, fontWeight: 900, marginBottom: '20px' }}>📄 قائمة الفواتير والمستخلصات</h1>
        
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '100px', color: THEME.primary }}>⏳ جاري تحميل البيانات...</div>
        ) : (
          <>
            <InvoicesTable 
              data={invoices} 
              projects={projects} 
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onSelectAll={onSelectAll}
              onEdit={handleEdit}
              onPrint={(inv: any) => { 
                  let projNames = 'بدون مشروع';
                  if (inv.project_ids && inv.project_ids.length > 0 && projects) {
                      projNames = projects
                          .filter((p: any) => inv.project_ids.includes(p.id))
                          .map((p: any) => p.Property || p.project_name || p.name)
                          .join('، ');
                  }
                  setPrintData({ ...inv, _projectNames: projNames }); 
                  setIsPrintModalOpen(true); 
              }}
            />
            <PaginationPanel 
              totalItems={allFiltered.length}
              currentPage={currentPage}
              rowsPerPage={rowsPerPage}
              onPageChange={setCurrentPage}
              onRowsChange={setRowsPerPage}
            />
          </>
        )}
      </div>

      {isEditModalOpen && (
        <InvoiceFormModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          record={currentRecord}
          setRecord={setCurrentRecord}
          onSave={handleSave}
          isSaving={isSaving}
          projects={projects}
        />
      )}

      <InvoicePrintModal 
        isOpen={isPrintModalOpen} 
        onClose={() => setIsPrintModalOpen(false)} 
        data={printData} 
      />
    </div>
  );
}