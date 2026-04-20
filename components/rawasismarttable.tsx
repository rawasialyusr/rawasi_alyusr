"use client";
import React from 'react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-hot-toast'; // 🚀 استدعاء التنبيهات الفخمة

// إعدادات الثيم عشان المكون يكون متناسق في كل حتة
const THEME = {
    coffeeDark: '#43342E', goldAccent: '#C5A059', sandLight: '#F4F1EE', sandDark: '#E6D5C3', success: '#166534', danger: '#be123c', border: '#eef2f6'
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
        if (!data || data.length === 0) return toast.error('عفواً، لا توجد بيانات للتصدير ❌');
        
        const toastId = toast.loading('جاري تحضير ملف Excel... ⏳');
        try {
            // تحضير الداتا بناءً على العواميد (أخذ القيمة الصافية لتجنب أخطاء الـ HTML)
            const exportData = data.map(row => {
                const newRow: any = {};
                columns.forEach(col => { 
                    newRow[col.header] = row[col.accessor] || '---'; 
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

    // 📄 دالة تصدير إلى PDF (مع دعم الجداول وثيم رواسي)
    const exportToPDF = () => {
        if (!data || data.length === 0) return toast.error('عفواً، لا توجد بيانات للتصدير ❌');
        
        const toastId = toast.loading('جاري تحضير ملف PDF... ⏳');
        try {
            const doc = new jsPDF('p', 'pt', 'a4');
            
            const tableColumn = columns.map(col => col.header);
            const tableRows = data.map(row => columns.map(col => String(row[col.accessor] || '---')));

            (doc as any).autoTable({
                head: [tableColumn],
                body: tableRows,
                styles: { halign: 'center', fontSize: 10 }, 
                headStyles: { fillColor: [67, 52, 46], textColor: [255,255,255], fontStyle: 'bold' }, // THEME.coffeeDark
                alternateRowStyles: { fillColor: [244, 241, 238] }, // THEME.sandLight
                margin: { top: 50 },
                didDrawPage: function (data: any) {
                    doc.setFontSize(14);
                    doc.setTextColor(40);
                    // إضافة هيدر التقرير في كل صفحة
                    doc.text("Rawasi Al-Yosr - Official Report", data.settings.margin.left, 30);
                }
            });
            doc.save(`${fileName}_${new Date().toLocaleDateString('en-GB')}.pdf`);
            toast.success('تم تصدير ملف PDF بنجاح ✅', { id: toastId });
        } catch (error) {
            toast.error('حدث خطأ أثناء التصدير ❌', { id: toastId });
        }
    };

    // 🎬 إعدادات حركة Framer Motion (دخول سينمائي للصفوف)
    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div style={{ background: 'white', borderRadius: '25px', padding: '30px', border: `1px solid ${THEME.sandDark}`, boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            
            {/* هيدر الجدول وزراير التصدير */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <h3 style={{ margin: 0, color: THEME.coffeeDark, fontWeight: 900, fontSize: '20px' }}>{title}</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={exportToExcel} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)' }}>
                        <span>📊</span> Excel
                    </button>
                    <button onClick={exportToPDF} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)' }}>
                        <span>📄</span> PDF
                    </button>
                </div>
            </div>

            {/* الجدول المتحرك */}
            <div style={{ overflowX: 'auto', borderRadius: '15px', border: `1px solid ${THEME.border}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead style={{ background: THEME.sandLight }}>
                        <tr>
                            {columns.map((col, index) => (
                                <th key={index} style={{ padding: '18px 20px', textAlign: 'right', color: THEME.coffeeDark, whiteSpace: 'nowrap', borderBottom: `2px solid ${THEME.goldAccent}` }}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <motion.tbody variants={containerVariants} initial="hidden" animate="show">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: 900 }}>
                                    لا توجد بيانات متاحة للعرض.
                                </td>
                            </tr>
                        ) : (
                            data.map((row, rowIndex) => (
                                <motion.tr 
                                    key={rowIndex} 
                                    variants={itemVariants} 
                                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {columns.map((col, colIndex) => (
                                        <td key={colIndex} style={{ padding: '18px 20px', color: THEME.coffeeDark, fontSize: '14px' }}>
                                            {/* إذا كان هناك دالة Render مخصصة استخدمها، وإلا اطبع القيمة مباشرة */}
                                            {col.render ? col.render(row[col.accessor], row) : (row[col.accessor] || '---')}
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