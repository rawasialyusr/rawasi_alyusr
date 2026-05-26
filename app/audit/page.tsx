"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import { useAdvancedAuditLogic } from './audit_logic';
import { THEME } from '@/lib/theme';

export default function AccountingAuditPage() {
    const logic = useAdvancedAuditLogic();

    // 🚀 تصنيف الأخطاء لعرضها في أقسام منفصلة
    const errorCategories = [
        { key: 'غير متزن', title: 'قيود غير متزنة', icon: '⚖️', color: '#ef4444', bg: '#fef2f2' },
        { key: 'صفري', title: 'قيود صفرية', icon: '0️⃣', color: '#f59e0b', bg: '#fffbeb' },
        { key: 'يتيم', title: 'قيود يتيمة (رأس بلا سطور)', icon: '🕳️', color: '#3b82f6', bg: '#eff6ff' },
        { key: 'شبح', title: 'سطور شبح (سطر بلا قيد أب)', icon: '👻', color: '#8b5cf6', bg: '#f3e8ff' },
        { key: 'مفقود', title: 'مراجع مفقودة (المستند الأصلي محذوف)', icon: '🔗', color: '#d97706', bg: '#fef3c7' },
    ];

    return (
        <MasterPage title="الرادار المحاسبي" subtitle="لوحة التدقيق التفصيلية واكتشاف التشوهات">
            <style>{`
                .audit-stat-card { background: white; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; align-items: center; justify-content: space-between; }
                .err-row { display: grid; grid-template-columns: 40px 1fr 1.5fr 2fr 1fr; gap: 15px; align-items: center; padding: 15px; border-bottom: 1px dashed #e2e8f0; transition: 0.2s; }
                .err-row:hover { background: #f8fafc; }
                .section-container { background: white; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.03); margin-bottom: 30px; }
                .section-header { padding: 15px 20px; color: white; display: flex; align-items: center; gap: 10px; font-weight: 900; font-size: 16px; }
            `}</style>

            {/* 📊 الإحصائيات العلوية */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                <div className="audit-stat-card">
                    <div><h3 style={{ margin: '0 0 5px 0', color: THEME.primary, fontSize: '24px' }}>{logic.stats.total}</h3><p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#64748b' }}>إجمالي التشوهات</p></div><div style={{ fontSize: '30px' }}>🚨</div>
                </div>
                <div className="audit-stat-card">
                    <div><h3 style={{ margin: '0 0 5px 0', color: '#ef4444', fontSize: '24px' }}>{logic.stats.unbalanced}</h3><p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#64748b' }}>قيود غير متزنة</p></div><div style={{ fontSize: '30px' }}>⚖️</div>
                </div>
                <div className="audit-stat-card">
                    <div><h3 style={{ margin: '0 0 5px 0', color: '#8b5cf6', fontSize: '24px' }}>{logic.stats.ghosts}</h3><p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#64748b' }}>سطور شبح</p></div><div style={{ fontSize: '30px' }}>👻</div>
                </div>
                <div className="audit-stat-card">
                    <div><h3 style={{ margin: '0 0 5px 0', color: '#f59e0b', fontSize: '24px' }}>{logic.stats.brokenRef}</h3><p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#64748b' }}>مراجع مفقودة</p></div><div style={{ fontSize: '30px' }}>🔗</div>
                </div>
            </div>

            {/* 🎛️ شريط التحكم */}
            <div style={{ background: 'white', padding: '15px 25px', borderRadius: '16px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                <input 
                    type="text" 
                    placeholder="🔍 ابحث في تفاصيل المشكلة أو ID القيد..." 
                    value={logic.searchQuery}
                    onChange={(e) => logic.setSearchQuery(e.target.value)}
                    style={{ padding: '10px 20px', borderRadius: '10px', border: '2px solid #f1f5f9', outline: 'none', width: '350px', fontWeight: 700 }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={logic.exportToExcel} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer' }}>📥 تصدير التقرير Excel</button>
                    <button onClick={() => logic.refetch()} style={{ background: THEME.primary, color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer' }}>🔄 تحديث الرادار</button>
                </div>
            </div>

            {/* 📋 الأقسام المفصلة (كل نوع خطأ في جدول مستقل) */}
            {logic.isLoading ? (
                <div style={{ padding: '50px', textAlign: 'center', fontWeight: 800, color: '#64748b' }}>⏳ جاري فحص الدفاتر...</div>
            ) : logic.errors.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '50px', marginBottom: '10px' }}>🎉</div>
                    <h2 style={{ color: '#16a34a', margin: 0, fontWeight: 900 }}>الدفاتر متزنة وقاعدة البيانات نظيفة 100%</h2>
                </div>
            ) : (
                <div>
                    {errorCategories.map(cat => {
                        // تصفية الأخطاء للقسم الحالي
                        const catErrors = logic.errors.filter((e:any) => e.error_type.includes(cat.key));
                        
                        if (catErrors.length === 0) return null; // إخفاء القسم لو مفيهوش أخطاء

                        return (
                            <div key={cat.key} className="section-container">
                                <div className="section-header" style={{ background: cat.color }}>
                                    <span>{cat.icon}</span> {cat.title} ({catErrors.length})
                                </div>
                                <div style={{ background: '#f8fafc', padding: '10px 15px', display: 'grid', gridTemplateColumns: '40px 1fr 1.5fr 2fr 1fr', gap: '15px', fontWeight: 900, color: '#475569', fontSize: '12px', borderBottom: '1px solid #e2e8f0' }}>
                                    <span>م</span>
                                    <span>التاريخ</span>
                                    <span>مصدر القيد والـ ID الأصلي</span>
                                    <span>التشخيص الفني</span>
                                    <span style={{ textAlign: 'center' }}>إجراءات الإصلاح</span>
                                </div>
                                
                                {catErrors.map((err: any, idx: number) => (
                                    <div key={err.error_id} className="err-row">
                                        <div style={{ color: '#94a3b8', fontWeight: 900 }}>{idx + 1}</div>
                                        
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>
                                            {err.error_date}
                                        </div>

                                        {/* 🚀 هنا بنعرض المصدر والآي دي بوضوح تام */}
                                        <div>
                                            <div style={{ display: 'inline-block', background: cat.bg, color: cat.color, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 900, marginBottom: '5px' }}>
                                                المصدر: {err.source_type || 'غير محدد'}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace', fontWeight: 800, userSelect: 'all' }}>
                                                ID: {err.source_id || err.journal_id || 'N/A'}
                                            </div>
                                        </div>

                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', lineHeight: 1.6 }}>
                                            {err.details}
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            {cat.key === 'غير متزن' && (
                                                <button onClick={() => logic.autoBalance(err.journal_id, err.diff_amount)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}>موازنة ⚖️</button>
                                            )}
                                            <button onClick={() => confirm('تأكيد الحذف النهائي للقيد لتنظيف ميزان المراجعة؟') && logic.deleteError(err.error_id, err.table_name)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}>حذف 🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}
        </MasterPage>
    );
}