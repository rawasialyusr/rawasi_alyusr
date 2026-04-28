"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import { THEME } from '@/lib/theme';
import { useBoqCatalogLogic } from './boq_catalog_logic';
import CatalogItemModal from './CatalogItemModal';

export default function BoqCatalogPage() {
    const logic = useBoqCatalogLogic();

    const sidebarActions = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <button onClick={() => {
                logic.setCurrentRecord({ main_category: '', sub_category: '', item_name: '', unit_of_measure: 'مقطوعية' });
                logic.setIsModalOpen(true);
            }} className="btn-main-glass gold">
                ➕ إضافة بند جديد للدليل
            </button>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', margin: '5px 0' }} />
            <button onClick={() => logic.setExpandedNodes({})} className="btn-main-glass white">
                🗂️ طي جميع الأقسام
            </button>
        </div>
    );

    return (
        <div className="clean-page">
            <MasterPage title="الدليل الموحد لبنود الأعمال (Master BOQ)" subtitle="إدارة التصنيفات الرئيسية والفرعية وبنود القياس القياسية للمشاريع">
                
                <RawasiSidebarManager 
                    summary={
                        <div className="summary-glass-card">
                            <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي البنود المسجلة 📚</span>
                            <div className="val" style={{fontSize:'24px', fontWeight:900, color: THEME.primary, marginTop:'5px'}}>{logic.catalogItems.length}</div>
                        </div>
                    }
                    actions={sidebarActions}
                    customFilters={
                        <div style={{marginTop: '15px'}}>
                            <input 
                                type="text" 
                                placeholder="🔍 ابحث عن بند أو تصنيف..." 
                                className="glass-input-field" 
                                value={logic.globalSearch} 
                                onChange={e => logic.setGlobalSearch(e.target.value)} 
                            />
                        </div>
                    }
                    watchDeps={[logic.catalogItems.length, logic.globalSearch]}
                />

                <style>{`
                    .glass-input-field { width: 100%; padding: 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.65); border: 1px solid rgba(255, 255, 255, 0.8); outline: none; font-weight: 700; color: #1e293b; transition: 0.3s; }
                    .glass-input-field:focus { background: #ffffff; border-color: ${THEME.goldAccent}; box-shadow: 0 0 0 4px rgba(197, 160, 89, 0.15); }
                    .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
                    .btn-main-glass.gold { background: linear-gradient(135deg, rgba(197, 160, 89, 0.9), rgba(151, 115, 50, 1)); color: white; }
                    .btn-main-glass.white { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255,255,255,0.8); }
                    .btn-main-glass:hover { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
                    .summary-glass-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); padding: 20px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 25px; }
                    
                    /* 🌳 ستايلات الشجرة */
                    .tree-main { background: white; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 15px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
                    .tree-main-header { background: #f8fafc; padding: 15px 20px; font-weight: 900; font-size: 16px; color: ${THEME.coffeeDark}; cursor: pointer; display: flex; align-items: center; border-bottom: 1px solid #e2e8f0; transition: 0.2s; }
                    .tree-main-header:hover { background: #f1f5f9; }
                    
                    .tree-sub { margin: 10px 20px 10px 0; border-right: 3px solid ${THEME.goldAccent}50; padding-right: 15px; }
                    .tree-sub-header { padding: 10px; font-weight: 900; font-size: 14px; color: ${THEME.coffeeMain}; cursor: pointer; display: flex; align-items: center; transition: 0.2s; border-radius: 8px; }
                    .tree-sub-header:hover { background: #f8fafc; }
                    
                    .tree-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; background: white; border: 1px solid #f1f5f9; border-radius: 12px; margin: 5px 20px 5px 0; transition: 0.2s; }
                    .tree-item:hover { border-color: ${THEME.goldAccent}; box-shadow: 0 4px 10px rgba(0,0,0,0.03); }
                    .tree-item-code { background: #f1f5f9; color: #64748b; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; margin-left: 10px; }
                `}</style>

                {logic.isLoading ? (
                    <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: THEME.goldAccent }}>⏳ جاري تحميل الدليل...</div>
                ) : (
                    <div style={{ animation: 'fadeIn 0.4s' }}>
                        {Object.keys(logic.treeData).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '24px', color: '#94a3b8', fontWeight: 900 }}>
                                لا توجد بنود مسجلة في الدليل الموحد. 📭
                            </div>
                        ) : (
                            Object.keys(logic.treeData).map((mainCat) => {
                                const isMainExpanded = logic.expandedNodes[`main_${mainCat}`];
                                
                                return (
                                    <div key={mainCat} className="tree-main">
                                        <div className="tree-main-header" onClick={() => logic.toggleNode(`main_${mainCat}`)}>
                                            <span style={{ width: '25px' }}>{isMainExpanded ? '📂' : '📁'}</span>
                                            {mainCat}
                                        </div>

                                        {/* إذا كان القسم الرئيسي مفتوحاً، اعرض الأقسام الفرعية */}
                                        {isMainExpanded && Object.keys(logic.treeData[mainCat]).map((subCat) => {
                                            const isSubExpanded = logic.expandedNodes[`sub_${mainCat}_${subCat}`];
                                            const items = logic.treeData[mainCat][subCat];

                                            return (
                                                <div key={subCat} className="tree-sub">
                                                    <div className="tree-sub-header" onClick={() => logic.toggleNode(`sub_${mainCat}_${subCat}`)}>
                                                        <span style={{ width: '25px', fontSize: '12px' }}>{isSubExpanded ? '▼' : '◀'}</span>
                                                        {subCat} <span style={{ fontSize: '11px', color: '#94a3b8', marginRight: '8px' }}>({items.length} بنود)</span>
                                                    </div>

                                                    {/* إذا كان القسم الفرعي مفتوحاً، اعرض البنود */}
                                                    {isSubExpanded && items.map((item: any) => (
                                                        <div key={item.id} className="tree-item">
                                                            <div>
                                                                <span className="tree-item-code">{item.item_code}</span>
                                                                <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '13px' }}>{item.item_name}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                                <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '6px', fontWeight: 900 }}>
                                                                    {item.unit_of_measure}
                                                                </span>
                                                                <div>
                                                                    <button onClick={() => { logic.setCurrentRecord(item); logic.setIsModalOpen(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }} title="تعديل">✏️</button>
                                                                    <button onClick={() => logic.handleDeleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }} title="حذف">🗑️</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    {/* زر إضافة سريع تحت كل قسم فرعي */}
                                                    {isSubExpanded && (
                                                        <button onClick={() => {
                                                            logic.setCurrentRecord({ main_category: mainCat, sub_category: subCat, item_name: '', unit_of_measure: 'مقطوعية' });
                                                            logic.setIsModalOpen(true);
                                                        }} style={{ background: 'transparent', color: THEME.goldAccent, border: 'none', padding: '5px 20px', fontSize: '11px', fontWeight: 900, cursor: 'pointer', display: 'block', marginTop: '5px' }}>
                                                            + إضافة بند تحت "{subCat}"
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* 🚀 استدعاء مودال الإضافة */}
                {logic.isModalOpen && (
                    <CatalogItemModal 
                        isOpen={logic.isModalOpen}
                        onClose={() => logic.setIsModalOpen(false)}
                        record={logic.currentRecord}
                        setRecord={logic.setCurrentRecord}
                        onSave={logic.handleSaveItem}
                        isSaving={logic.isSaving}
                        uniqueMains={logic.uniqueMainCategories}
                        uniqueSubs={logic.uniqueSubCategories}
                    />
                )}

            </MasterPage>
        </div>
    );
}