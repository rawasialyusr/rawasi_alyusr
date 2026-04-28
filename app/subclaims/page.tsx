"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import { useSubClaimsLogic } from './sub_claims_logic';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import RawasiSmartTable from '@/components/rawasismarttable';
import AssignWorkModal from './AssignWorkModal'; 
import RawasiSidebarManager from '@/components/RawasiSidebarManager'; // 🚀 استدعاء مدير السايد بار
import SecureAction from '@/components/SecureAction';

export default function SubContractorClaimsPage() {
    const logic = useSubClaimsLogic();

    // =========================================================================
    // 🎛️ أزرار الأكشن في السايد بار (تتغير حسب حالة اختيار المقاول)
    // =========================================================================
    const sidebarActions = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {logic.selectedContractor ? (
                <>
                    <button 
                        onClick={() => {
                            logic.setAssignRecord({ assigned_qty: 1, unit_price: 0 });
                            logic.setIsAssignModalOpen(true);
                        }} 
                        className="btn-main-glass blue"
                    >
                        ➕ إسناد بند عمل جديد
                    </button>

                    <button 
                        disabled={logic.selectedAssignments.length === 0} 
                        onClick={() => logic.setIsClaimModalOpen(true)}
                        className="btn-main-glass green"
                    >
                        📑 إصدار مستخلص ({logic.selectedAssignments.length})
                    </button>

                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', margin: '10px 0' }} />

                    <button 
                        onClick={() => logic.setSelectedContractor(null)} 
                        className="btn-main-glass white"
                    >
                        🔙 رجوع لقائمة المقاولين
                    </button>
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', color: '#94a3b8', fontSize: '12px', fontWeight: 800 }}>
                    👆 يرجى اختيار مقاول من القائمة لعرض الإجراءات وإسناد الأعمال
                </div>
            )}
        </div>
    );

    return (
        <div className="clean-page">
            <MasterPage title="إدارة مقاولي الباطن" subtitle="إسناد الأعمال وإصدار المستخلصات الدورية">
                
                {/* 🚀 تغليف المحتوى بمدير السايد بار */}
                <RawasiSidebarManager 
                    actions={sidebarActions}
                    watchDeps={[logic.selectedContractor, logic.selectedAssignments.length]}
                />

                <style>{`
                    .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
                    .btn-main-glass.blue { background: linear-gradient(135deg, rgba(14, 165, 233, 0.8), rgba(2, 132, 199, 0.9)); color: white; }
                    .btn-main-glass.green { background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(22, 163, 74, 0.9)); color: white; }
                    .btn-main-glass.white { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255,255,255,0.8); }
                    .btn-main-glass:disabled { opacity: 0.4; cursor: not-allowed; filter: grayscale(1); }
                    .btn-main-glass:hover:not(:disabled) { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
                `}</style>

                {/* 1. عرض كروت المقاولين (لو لم يتم اختيار مقاول) */}
                {!logic.selectedContractor ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', padding: '10px' }}>
                        {logic.contractors.map((contractor: any) => (
                            <div key={contractor.id} onClick={() => logic.setSelectedContractor(contractor)} 
                                 style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(15px)', borderRadius: '24px', padding: '25px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.5)', transition: '0.3s', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '40px', marginBottom: '15px' }}>👷</div>
                                <h3 style={{ margin: 0, color: THEME.primary, fontWeight: 900 }}>{contractor.name}</h3>
                                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                                    {contractor.contractor_assignments?.[0]?.count || 0} بنود أعمال مسندة
                                </p>
                                <div style={{ marginTop: '15px', background: THEME.accent, color: 'white', padding: '8px', borderRadius: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 900 }}>عرض المشاريع ⬅️</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* 2. عرض تفاصيل المقاول والأعمال المسندة */
                    <div style={{ animation: 'fadeIn 0.5s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', background: 'rgba(255,255,255,0.4)', padding: '20px', borderRadius: '20px' }}>
                            <h2 style={{ margin: 0, fontWeight: 900, color: THEME.primary }}>📂 أعمال المقاول: {logic.selectedContractor.name}</h2>
                        </div>

                        {/* جدول البنود المسندة للمقاول */}
                        <div style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)', borderRadius: '24px', padding: '10px', border: '1px solid rgba(255,255,255,0.7)' }}>
                            <RawasiSmartTable 
                                data={logic.assignments}
                                columns={[
                                    { header: 'المشروع', accessor: 'projects.Property' },
                                    { header: 'البند', accessor: 'boq_items.item_name' },
                                    { header: 'الكمية الكلية', render: (row) => `${row.assigned_qty} ${row.boq_items?.unit_of_measure || 'وحدة'}` },
                                    { header: 'سعر الاتفاق', render: (row) => formatCurrency(row.unit_price) },
                                    { header: 'الإجمالي التقديري', render: (row) => <span style={{ fontWeight: 900, color: THEME.primary }}>{formatCurrency(row.assigned_qty * row.unit_price)}</span> },
                                    { header: 'الحالة', render: (row) => <span style={{ color: THEME.accent, fontWeight: 900, background: '#fef3c7', padding: '4px 10px', borderRadius: '8px' }}>{row.status}</span> },
                                ]}
                                selectable={true}
                                selectedIds={logic.selectedAssignments}
                                onSelectionChange={logic.setSelectedAssignments}
                            />
                        </div>
                    </div>
                )}

                {/* 🚀 استدعاء مودال إسناد الأعمال المخفي */}
                {logic.isAssignModalOpen && (
                    <AssignWorkModal 
                        isOpen={logic.isAssignModalOpen}
                        onClose={() => logic.setIsAssignModalOpen(false)}
                        record={logic.assignRecord}
                        setRecord={logic.setAssignRecord}
                        onSave={logic.handleAssignWork}
                        isSaving={logic.isAssigning} 
                        contractorName={logic.selectedContractor?.name}
                    />
                )}

            </MasterPage>
        </div>
    );
}