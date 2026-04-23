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
    header?: string; // جعلناه اختيارياً لدعم الـ Label
    label?: string;  // أضفنا Label ليطابق كود الصفحة
    key?: string;    // أضفنا key ليطابق كود الصفحة
    accessor?: string;
    render?: (row: any) => React.ReactNode; // تعديل التوقيع ليناسب استخدامنا
}

interface RawasiSmartTableProps {
    title?: string;
    data: any[];
    columns: Column[];
    fileName?: string;
    selectable?: boolean; // 👈 إضافة خاصية التحديد
    selectedIds?: any[];
    onSelectionChange?: (ids: any[]) => void;
    emptyMessage?: string;
}

export default function RawasiSmartTable({ 
    title, data, columns, fileName = 'Rawasi_Report', 
    selectable, selectedIds = [], onSelectionChange, emptyMessage 
}: RawasiSmartTableProps) {
    
    // 📊 دالة تصدير Excel (معدلة لتقرأ الـ Key والـ Accessor)
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

    // 📄 دالة تصدير PDF
    const exportToPDF = () => {
        if (!data || data.length === 0) return toast.error('عفواً، لا توجد بيانات للتصدير ❌');
        const toastId = toast.loading('جاري تحضير ملف PDF... ⏳');
        try {
            const doc = new jsPDF('p', 'pt', 'a4');
            const tableColumn = columns.map(col => col.label || col.header || '');
            const tableRows = data.map(row => columns.map(col => String(row[col.key || col.accessor || ''] || '---')));
            (doc as any).autoTable({
                head: [tableColumn], body: tableRows,
                styles: { halign: 'right', font: 'courier' }, // ملاحظة: الـ PDF العادي لا يدعم العربي بسهولة بدون خط خارجي
                headStyles: { fillColor: [67, 52, 46] }
            });
            doc.save(`${fileName}.pdf`);
            toast.success('تم تصدير ملف PDF بنجاح ✅', { id: toastId });
        } catch (error) {
            toast.error('حدث خطأ أثناء التصدير ❌', { id: toastId });
        }
    };

    // 🎬 Animations
    const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } };
    const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

    return (
        <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(15px)', borderRadius: '20px', padding: '20px', border: `1px solid rgba(255,255,255,0.5)`, boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
            
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
                                <motion.tr key={row.id || rowIndex} variants={itemVariants} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                    {selectable && (
                                        <td style={{ padding: '12px 15px' }}>
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
                                            {/* 🚀 السطر السحري: دعم الـ Render المخصص أو الـ Key أو الـ Accessor */}
                                            {col.render ? col.render(row) : (row[col.key || col.accessor || ''] || '---')}
                                        </td>
                                    ))}
                                </motion.tr>
                            ))
                        )}
                    </motion.tbody>
                </table>
            </div>
        </div>
    );
}