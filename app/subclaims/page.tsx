"use client";
import React, { useState, useMemo } from 'react';
import MasterPage from '@/components/MasterPage';
import { useSubClaimsLogic } from './sub_claims_logic';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import RawasiSmartTable from '@/components/rawasismarttable';
import AssignWorkModal from './AssignWorkModal'; 
import ClaimFormModal from './ClaimFormModal'; 
import RawasiSidebarManager from '@/components/RawasiSidebarManager'; 

export default function SubContractorClaimsPage() {
    const logic = useSubClaimsLogic();

    // 🎯 السحر هنا: بنحول الـ IDs المختارة من الجدول لبيانات كاملة عشان المودال يقرأها ويحسبها صح
    const selectedAssignmentObjects = useMemo(() => {
        return logic.assignments.filter((a: any) => logic.selectedAssignments.includes(a.id));
    }, [logic.assignments, logic.selectedAssignments]);

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
                        onClick={() => {
                            logic.setSelectedContractor(null);
                            logic.setSelectedAssignments([]);
                        }} 
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
                    
                    .search-box-container { margin-bottom: 25px; background: white; padding: 15px; border-radius: 20px; border: 1px solid #eee; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
                    .search-input-fancy { width: 100%; padding: 12px 20px; border-radius: 15px; border: 2px solid #f1f5f9; outline: none; transition: 0.3s; font-weight: 700; font-size: 14px; }
                    .search-input-fancy:focus { border-color: ${THEME.primary}80; background: #fff; box-shadow: 0 0 0 4px ${THEME.primary}10; }
                `}</style>

                {!logic.selectedContractor ? (
                    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        <div className="search-box-container">
                            <input 
                                type="text" 
                                className="search-input-fancy" 
                                placeholder="🔍 ابحث عن اسم مقاول باطن..." 
                                value={logic.searchTerm}
                                onChange={(e) => logic.setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', padding: '10px' }}>
                            {logic.contractors.map((contractor: any) => (
                                <div key={contractor.id} onClick={() => logic.setSelectedContractor(contractor)} 
                                     style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(15px)', borderRadius: '24px', padding: '25px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.5)', transition: '0.3s', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '15px' }}>👷</div>
                                    <h3 style={{ margin: 0, color: THEME.primary, fontWeight: 900 }}>{contractor.name}</h3>
                                    <div style={{ marginTop: '15px', background: THEME.accent, color: 'white', padding: '8px', borderRadius: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 900 }}>فتح ملف الأعمال ⬅️</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ animation: 'slideUp 0.5s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', background: 'white', padding: '20px', border: '1px solid #eee', borderRadius: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                            <div>
                                <h2 style={{ margin: 0, fontWeight: 900, color: THEME.primary }}>📂 سجل أعمال المقاول</h2>
                                <span style={{ fontSize: '14px', color: THEME.accent, fontWeight: 800 }}>👤 الاسم: {logic.selectedContractor.name}</span>
                            </div>
                        </div>

                        <div style={{ background: 'white', borderRadius: '24px', padding: '10px', border: '1px solid #eee', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                            <RawasiSmartTable 
                                data={logic.assignments}
                                isLoading={logic.isAssignLoading}
                                columns={[
                                    { header: 'المشروع العقاري', render: (row: any) => <span style={{fontWeight: 800}}>{row.projects?.Property || '---'}</span> },
                                    { header: 'بند العمل المسند', render: (row: any) => <span style={{color: THEME.primary, fontWeight: 700}}>{row.boq_items?.item_name || '---'}</span> },
                                    { header: 'الكمية الإجمالية', render: (row: any) => `${row.assigned_qty} ${row.boq_items?.unit_of_measure || ''}` },
                                    { header: 'سعر الوحدة', render: (row: any) => formatCurrency(row.unit_price) },
                                    { header: 'إجمالي القيمة', render: (row: any) => <strong style={{ color: THEME.success }}>{formatCurrency(row.assigned_qty * row.unit_price)}</strong> },
                                    { header: 'حالة التنفيذ', render: (row: any) => <span style={{ color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 900 }}>{row.status}</span> },
                                ]}
                                selectable={true}
                                selectedIds={logic.selectedAssignments}
                                onSelectionChange={logic.setSelectedAssignments}
                            />
                        </div>
                    </div>
                )}

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

                {/* 🚀 تمرير selectedAssignmentObjects للـ ClaimFormModal */}
                {logic.isClaimModalOpen && (
                    <ClaimFormModal 
                        isOpen={logic.isClaimModalOpen}
                        onClose={() => logic.setIsClaimModalOpen(false)}
                        contractor={logic.selectedContractor}
                        assignments={selectedAssignmentObjects} 
                        onSave={logic.handleSaveClaim}
                        isSaving={logic.isClaimSaving} 
                        fetchExpenses={logic.fetchContractorExpenses}
                    />
                )}

            </MasterPage>
        </div>
    );
}