"use client";
import React, { useState } from 'react';
import MasterPage from '@/components/MasterPage';
import RawasiSmartTable from '@/components/rawasismarttable';
import { formatCurrency } from '@/lib/helpers';
import { THEME } from '@/lib/theme';
import { useLedgerLogic } from './ledger_logic';

export default function HierarchicalLedgerPage() {
  const logic = useLedgerLogic();
  
  // حفظ حالة "الطي والفتح" لكل مشروع ولكل نوع تكلفة
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});

  const toggleProject = (projName: string) => {
    setExpandedProjects(prev => ({ ...prev, [projName]: !prev[projName] }));
  };

  const toggleType = (typeKey: string) => {
    setExpandedTypes(prev => ({ ...prev, [typeKey]: !prev[typeKey] }));
  };

  // إعداد أعمدة جدول التفاصيل (قاعدة الهرم)
  const columns = [
    { header: 'التاريخ', render: (row: any) => <span style={{ fontWeight: 900, color: '#475569' }}>{row['التاريخ']}</span> },
    { header: 'الشهر المالي', render: (row: any) => <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontWeight: 900 }}>{row['الشهر المالي']}</span> },
    { header: 'البيان / اسم البند', render: (row: any) => <span style={{ fontWeight: 800, color: '#1e293b' }}>{row['البيان / البند']}</span> },
    { header: 'التكلفة المحملة', render: (row: any) => <strong style={{ fontSize: '16px', color: THEME.coffeeDark }}>{formatCurrency(row['التكلفة المحملة (جنيه)'])}</strong> }
  ];

  return (
    <div className="clean-page">
      <MasterPage title="الدفتر المالي للتكاليف" subtitle="تحليل هرمي للتكاليف من الإجمالي العام حتى أدق التفاصيل">
        
        {logic.isLoading ? (
           <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: THEME.goldAccent }}>⏳ جاري بناء الهرم المالي...</div>
        ) : (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            
            {/* 🎛️ شريط الفلاتر */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.8)', marginBottom: '25px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 250px' }}>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: '#64748b', marginBottom: '5px' }}>بحث في التفاصيل:</span>
                <input type="text" placeholder="🔍 ابحث عن بند..." value={logic.searchQuery} onChange={(e) => logic.setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontWeight: 800, outline: 'none' }} />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: '#64748b', marginBottom: '5px' }}>تصفية بالمشروع:</span>
                <select value={logic.filterProject} onChange={(e) => logic.setFilterProject(e.target.value)} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontWeight: 800, outline: 'none', backgroundColor: 'white' }}>
                  <option value="الكل">كل المشاريع 🏢</option>
                  {logic.uniqueProjects.map((proj: any, idx: number) => <option key={idx} value={proj}>{proj}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: '#64748b', marginBottom: '5px' }}>نوع التكلفة:</span>
                <select value={logic.filterType} onChange={(e) => logic.setFilterType(e.target.value)} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontWeight: 800, outline: 'none', backgroundColor: 'white' }}>
                  <option value="الكل">كل التكاليف 📂</option>
                  <option value="عمالة مباشرة">👷 عمالة مباشرة فقط</option>
                  <option value="مصروفات تشغيل وأوفر هيد">🏢 أوفر هيد وتشغيل فقط</option>
                </select>
              </div>
            </div>

            {/* 🔺 رأس الهرم (إجمالي الشركة) */}
            <div style={{ backgroundColor: THEME.coffeeDark, color: 'white', padding: '30px', borderRadius: '24px', textAlign: 'center', marginBottom: '20px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, opacity: 0.9, display: 'block', marginBottom: '10px' }}>🏆 الإجمالي العام للتكاليف (رأس الهرم)</span>
              <strong style={{ fontSize: '42px', fontWeight: 900, color: THEME.goldAccent }}>
                {formatCurrency(logic.pyramidData.grandTotal)}
              </strong>
            </div>

            {/* 🏗️ جسم الهرم (المشاريع والتفاصيل) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {logic.pyramidData.projects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontWeight: 900, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '20px' }}>لا توجد بيانات مطابقة للفلاتر.</div>
              ) : (
                logic.pyramidData.projects.map((project: any, pIdx: number) => {
                  const isProjOpen = expandedProjects[project.name];

                  return (
                    <div key={pIdx} style={{ backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
                      
                      {/* مستوى 1: كارت المشروع */}
                      <div 
                        onClick={() => toggleProject(project.name)}
                        style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: isProjOpen ? '#f8fafc' : 'white', transition: '0.2s' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <span style={{ fontSize: '24px' }}>{isProjOpen ? '📂' : '📁'}</span>
                          <strong style={{ fontSize: '18px', color: THEME.coffeeDark, fontWeight: 900 }}>{project.name}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <strong style={{ fontSize: '18px', color: THEME.danger, fontWeight: 900 }}>{formatCurrency(project.total)}</strong>
                          <span style={{ fontSize: '14px', color: '#94a3b8' }}>{isProjOpen ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {/* مستوى 2: أنواع التكاليف داخل المشروع */}
                      {isProjOpen && (
                        <div style={{ padding: '10px 20px 20px 20px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {project.types.map((typeNode: any, tIdx: number) => {
                            const typeKey = `${project.name}-${typeNode.name}`;
                            const isTypeOpen = expandedTypes[typeKey];
                            const isLabor = typeNode.name === 'عمالة مباشرة';

                            return (
                              <div key={tIdx} style={{ border: `1px solid ${isLabor ? '#bae6fd' : '#e9d5ff'}`, borderRadius: '12px', overflow: 'hidden', backgroundColor: 'white' }}>
                                
                                {/* رأس كارت نوع التكلفة */}
                                <div 
                                  onClick={() => toggleType(typeKey)}
                                  style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: isLabor ? '#f0f9ff' : '#faf5ff' }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span>{isLabor ? '👷' : '🏢'}</span>
                                    <strong style={{ fontSize: '15px', color: isLabor ? '#0369a1' : '#6b21a8', fontWeight: 900 }}>{typeNode.name}</strong>
                                    <span style={{ fontSize: '12px', backgroundColor: 'white', padding: '2px 8px', borderRadius: '20px', color: '#64748b', fontWeight: 800 }}>{typeNode.items.length} عملية</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <strong style={{ fontSize: '16px', color: isLabor ? '#0369a1' : '#6b21a8', fontWeight: 900 }}>{formatCurrency(typeNode.total)}</strong>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{isTypeOpen ? '▲' : '▼'}</span>
                                  </div>
                                </div>

                                {/* مستوى 3: التفاصيل (قاعدة الهرم - الجدول) */}
                                {isTypeOpen && (
                                  <div style={{ padding: '15px', borderTop: `1px solid ${isLabor ? '#bae6fd' : '#e9d5ff'}` }}>
                                    <RawasiSmartTable data={typeNode.items} columns={columns} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}
      </MasterPage>
    </div>
  );
}