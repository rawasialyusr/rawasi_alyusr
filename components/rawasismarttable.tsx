"use client";
import React from 'react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-hot-toast';

const THEME = {
    coffeeDark: '#43342E', goldAccent: '#C5A059', sandLight: '#F4F1EE', sandDark: '#E6D5C3', success: '#166534', danger: '#be123c', border: '#eef2f6'
};

interface Column {
    header?: string;
    label?: string;
    key?: string;
    accessor?: string;
    render?: (row: any) => React.ReactNode;
}

interface RawasiSmartTableProps {
    title?: string;
    data: any[];
    columns: Column[];
    fileName?: string;
    selectable?: boolean;
    selectedIds?: any[];
    onSelectionChange?: (ids: any[]) => void;
    onRowClick?: (row: any) => void;
    emptyMessage?: string;
    
    // 🚀 خصائص الـ Pagination المدمجة (اختيارية لعدم كسر الصفحات القديمة)
    enablePagination?: boolean;
    currentPage?: number;
    totalItems?: number;
    rowsPerPage?: number;
    onPageChange?: (page: number) => void;
    onRowsChange?: (rows: number) => void;
}

export default function RawasiSmartTable({ 
    title, data, columns, fileName = 'Rawasi_Report', 
    selectable, selectedIds = [], onSelectionChange, onRowClick, emptyMessage,
    
    // 🚀 تهيئة الخصائص الافتراضية للتصفح
    enablePagination = false,
    currentPage = 1,
    totalItems = 0,
    rowsPerPage = 50,
    onPageChange,
    onRowsChange
}: RawasiSmartTableProps) {
    
    // 🧮 حساب عدد الصفحات الديناميكي
    const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;

    const exportToExcel = () => {
        if (!data || data.length === 0) return toast.error('عفواً، لا توجد بيانات للتصدير ❌');
        const toastId = toast.loading('جاري تحضير ملف Excel... ⏳');
        try {
            const exportData = data.map(row => {
                const newRow: any = {};
                columns.forEach(col => { 
                    const headerName = col.label || col.header || 'Column';
                    const keyName = col.key || col.accessor || '';
                    newRow[headerName] = row[keyName] || '---'; 
                });
                return newRow;
            });
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "التقرير");
            XLSX.writeFile(workbook, `${fileName}_${new Date().toLocaleDateString('en-GB')}.xlsx`);
            toast.success('تم تصدير ملف Excel بنجاح ✅', { id: toastId });
        } catch (error) {
            toast.error('حدث خطأ أثناء التصدير ❌', { id: toastId });
        }
    };

    const exportToPDF = () => {
        if (!data || data.length === 0) return toast.error('عفواً، لا توجد بيانات للتصدير ❌');
        const toastId = toast.loading('جاري تحضير ملف PDF... ⏳');
        try {
            const doc = new jsPDF('p', 'pt', 'a4');
            const tableColumn = columns.map(col => col.label || col.header || '');
            const tableRows = data.map(row => columns.map(col => String(row[col.key || col.accessor || ''] || '---')));
            (doc as any).autoTable({
                head: [tableColumn], body: tableRows,
                styles: { halign: 'right', font: 'courier' },
                headStyles: { fillColor: [67, 52, 46] }
            });
            doc.save(`${fileName}.pdf`);
            toast.success('تم تصدير ملف PDF بنجاح ✅', { id: toastId });
        } catch (error) {
            toast.error('حدث خطأ أثناء التصدير ❌', { id: toastId });
        }
    };

    const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } };
    const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

    return (
        <div style={{ 
            background: 'rgba(255, 255, 255, 0.7)', 
            backdropFilter: 'blur(15px)', 
            borderRadius: '20px', 
            padding: '20px', 
            border: `1px solid rgba(255,255,255,0.5)`, 
            boxShadow: '0 8px 32px rgba(0,0,0,0.05)' 
        }}>
            
            {title && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: THEME.coffeeDark, fontWeight: 900 }}>{title}</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={exportToExcel} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 900, fontSize: '12px' }}>📊 Excel</button>
                        <button onClick={exportToPDF} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 900, fontSize: '12px' }}>📄 PDF</button>
                    </div>
                </div>
            )}

            <div style={{ overflowX: 'auto', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            {selectable && (
                                <th style={{ padding: '15px', width: '40px', textAlign: 'right' }}>
                                    <input 
                                        type="checkbox" 
                                        onChange={(e) => {
                                            if (e.target.checked) onSelectionChange?.(data.map(i => i.id));
                                            else onSelectionChange?.([]);
                                        }}
                                        checked={data.length > 0 && selectedIds.length === data.length}
                                        style={{ accentColor: THEME.goldAccent, width: '16px', height: '16px' }}
                                    />
                                </th>
                            )}
                            {columns.map((col, idx) => (
                                <th key={idx} style={{ padding: '15px', textAlign: 'right', color: THEME.coffeeDark, fontWeight: 900, fontSize: '13px', borderBottom: `2px solid ${THEME.goldAccent}40` }}>
                                    {col.label || col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <motion.tbody variants={containerVariants} initial="hidden" animate="show">
                        {data.length === 0 ? (
                            <tr><td colSpan={columns.length + (selectable ? 1 : 0)} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>{emptyMessage || 'لا توجد بيانات'}</td></tr>
                        ) : (
                            data.map((row, rowIndex) => (
                               <motion.tr key={row.id || rowIndex} variants={itemVariants} onClick={() => onRowClick?.(row)} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', cursor: onRowClick ? 'pointer' : 'default' }}>
                                    {selectable && (
                                        <td style={{ padding: '12px 15px' }} onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.includes(row.id)}
                                                onChange={() => {
                                                    const newSelection = selectedIds.includes(row.id) 
                                                        ? selectedIds.filter(id => id !== row.id) 
                                                        : [...selectedIds, row.id];
                                                    onSelectionChange?.(newSelection);
                                                }}
                                                style={{ accentColor: THEME.goldAccent, width: '16px', height: '16px' }}
                                            />
                                        </td>
                                    )}
                                    {columns.map((col, colIndex) => (
                                        <td key={colIndex} style={{ padding: '12px 15px' }}>
                                            {col.render ? col.render(row) : (row[col.key || col.accessor || ''] || '---')}
                                        </td>
                                    ))}
                                </motion.tr>
                            ))
                        )}
                    </motion.tbody>
                </table>
            </div>

            {/* 🚀 شريط الـ Pagination السيادي الجديد */}
            {enablePagination && totalItems > 0 && (
                <div style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '15px 20px', marginTop: '15px', borderTop: '1px solid rgba(0,0,0,0.05)',
                    background: 'rgba(255,255,255,0.4)', borderRadius: '12px', flexWrap: 'wrap', gap: '15px'
                }}>
                    
                    {/* 🔢 قائمة اختيار عدد السجلات */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: '#64748b' }}>عرض:</span>
                        <select 
                            value={rowsPerPage} 
                            onChange={(e) => {
                                if (onRowsChange) onRowsChange(Number(e.target.value));
                                if (onPageChange) onPageChange(1); // العودة للصفحة الأولى تلقائياً عند تغيير العدد
                            }}
                            style={{ padding: '8px 15px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 800, cursor: 'pointer', background: 'white', color: '#0f172a' }}
                        >
                            <option value="50">50 سجل</option>
                            <option value="100">100 سجل</option>
                            <option value="500">500 سجل</option>
                        </select>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>من إجمالي {totalItems}</span>
                    </div>

                    {/* ⏪ أزرار التحكم في الصفحات ⏩ */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button 
                            disabled={currentPage === 1} 
                            onClick={(e) => { e.stopPropagation(); if(onPageChange) onPageChange(currentPage - 1); }} 
                            style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 900, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, color: '#0f172a', transition: '0.2s' }}
                        >
                            السابق
                        </button>

                        <div style={{ background: THEME.goldAccent, color: 'white', padding: '8px 20px', borderRadius: '12px', fontWeight: 900, fontSize: '13px', boxShadow: `0 4px 10px ${THEME.goldAccent}40` }}>
                            صفحة {currentPage} من {totalPages}
                        </div>

                        <button 
                            disabled={currentPage >= totalPages} 
                            onClick={(e) => { e.stopPropagation(); if(onPageChange) onPageChange(currentPage + 1); }} 
                            style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 900, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPages ? 0.5 : 1, color: '#0f172a', transition: '0.2s' }}
                        >
                            التالي
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}