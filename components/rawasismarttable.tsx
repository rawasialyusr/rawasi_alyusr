"use client";
import React from 'react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// إعدادات الثيم عشان المكون يكون متناسق في كل حتة
const THEME = {
  coffeeDark: '#43342E', goldAccent: '#C5A059', sandLight: '#F4F1EE', sandDark: '#E6D5C3'
};

// تعريف نوع البيانات اللي المكون هيستقبلها
interface Column {
    header: string;
    accessor: string;
    render?: (value: any, row: any) => React.ReactNode;
}

interface RawasiSmartTableProps {
    title: string;
    data: any[];
    columns: Column[];
    fileName?: string;
}

export default function RawasiSmartTable({ title, data, columns, fileName = 'Rawasi_Report' }: RawasiSmartTableProps) {
    
    // 📊 دالة تصدير إلى Excel
    const exportToExcel = () => {
        if (!data || data.length === 0) return alert('لا توجد بيانات للتصدير');
        // تحضير الداتا بناءً على العواميد
        const exportData = data.map(row => {
            const newRow: any = {};
            columns.forEach(col => { newRow[col.header] = row[col.accessor]; });
            return newRow;
        });
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${fileName}_${new Date().toLocaleDateString()}.xlsx`);
    };

    // 📄 دالة تصدير إلى PDF (مع دعم الجداول)
    const exportToPDF = () => {
        if (!data || data.length === 0) return alert('لا توجد بيانات للتصدير');
        const doc = new jsPDF('p', 'pt', 'a4');
        
        // ملاحظة: لدعم اللغة العربية في PDF ستحتاج لإضافة خط (Font) عربي لـ jsPDF لاحقاً
        const tableColumn = columns.map(col => col.header);
        const tableRows = data.map(row => columns.map(col => row[col.accessor] || '---'));

        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            styles: { font: 'helvetica', halign: 'center' }, // يمكنك تغيير الخط هنا
            headStyles: { fillColor: [67, 52, 46] }, // THEME.coffeeDark
            margin: { top: 40 },
        });
        doc.save(`${fileName}_${new Date().toLocaleDateString()}.pdf`);
    };

    // 🎬 إعدادات حركة Framer Motion
    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div style={{ background: 'white', borderRadius: '25px', padding: '25px', border: `1px solid ${THEME.sandDark}`, boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            
            {/* هيدر الجدول وزراير التصدير */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <h3 style={{ margin: 0, color: THEME.coffeeDark, fontWeight: 900 }}>{title}</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={exportToExcel} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        📊 Excel
                    </button>
                    <button onClick={exportToPDF} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        📄 PDF
                    </button>
                </div>
            </div>

            {/* الجدول المتحرك */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: THEME.sandLight }}>
                        <tr>
                            {columns.map((col, index) => (
                                <th key={index} style={{ padding: '15px', textAlign: 'right', color: THEME.coffeeDark, whiteSpace: 'nowrap' }}>{col.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <motion.tbody variants={containerVariants} initial="hidden" animate="show">
                        {data.length === 0 ? (
                            <tr><td colSpan={columns.length} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>لا توجد بيانات متاحة.</td></tr>
                        ) : (
                            data.map((row, rowIndex) => (
                                <motion.tr key={rowIndex} variants={itemVariants} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    {columns.map((col, colIndex) => (
                                        <td key={colIndex} style={{ padding: '15px', color: THEME.coffeeDark }}>
                                            {/* إذا كان هناك دالة Render مخصصة استخدمها، وإلا اطبع القيمة مباشرة */}
                                            {col.render ? col.render(row[col.accessor], row) : row[col.accessor] || '---'}
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