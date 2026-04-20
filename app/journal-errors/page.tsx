"use client";

import React from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { useJournalErrorsLogic } from './JournalErrors_logic';
import AuthGuard from '@/components/authGuard'; 
import GlassContainer from '@/components/GlassContainer'; 
import { OperationsCenter } from '@/components/postingputton'; 

export default function JournalMaintenancePage() {
    const logic = useJournalErrorsLogic();

    const SectionHeader = ({ title, count, color, icon }: any) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '15px 20px', background: `${color}15`, borderRadius: '12px', borderRight: `6px solid ${color}`, borderLeft: `1px solid ${color}30`, borderTop: `1px solid ${color}30`, borderBottom: `1px solid ${color}30` }}>
            <h3 style={{ margin: 0, color: color, fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px' }}>
                <span style={{ fontSize: '22px' }}>{icon}</span> {title} 
                <span style={{ background: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', border: `1px solid ${color}40` }}>{count} خطأ</span>
            </h3>
        </div>
    );

    return (
        <AuthGuard requiredRoles={['admin', 'auditor']}>
            <div style={{ padding: '30px', direction: 'rtl', fontFamily: 'Cairo, sans-serif', minHeight: '100vh', background: '#f8fafc', position: 'relative' }}>
                
                <div style={{ position: 'relative', zIndex: 10 }}>
                    <OperationsCenter 
                        title="لوحة تحكم المراجع الآلي"
                        kpis={[
                            { title: 'قيود يتيمة', value: logic.filteredOrphans.length, color: THEME.ruby, icon: '🗑️' },
                            { title: 'غير متزنة', value: logic.filteredUnbalanced.length, color: '#7c3aed', icon: '⚖️' },
                            { title: 'تكرار محتمل', value: logic.filteredDuplicates.length, color: '#d97706', icon: '👯' },
                            { title: 'سطور شبح', value: logic.filteredGhosts.length, color: '#0891b2', icon: '👻' }
                        ]}
                        searchQuery={logic.searchQuery}
                        onSearchChange={logic.setSearchQuery}
                        selectedCount={logic.selectedIds.length}
                        onAdd={logic.exportErrorsToExcel}
                        addText="📊 تقرير العيوب"
                        onDeleteSelected={logic.deleteSelected}
                        onPostSelected={() => alert("استخدم زر الموازنة الآلية داخل الجدول للقيود غير المتزنة.")}
                        onUnpostSelected={() => alert("استخدم صفحة السندات لفك الترحيل.")}
                    />
                </div>

                <GlassContainer>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px' }}>
                        <div>
                            <h1 style={{ color: THEME.primary, margin: 0, fontWeight: 900, fontSize: '26px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                🛡️ غرفة عمليات صيانة وتدقيق الحسابات
                            </h1>
                            <p style={{ color: '#64748b', marginTop: '10px', fontSize: '15px', fontWeight: 'bold' }}>
                                فحص شامل لدفتر اليومية، كشف التكرار، معالجة القيود غير المتزنة، وضمان سلامة ميزان المراجعة.
                            </p>
                        </div>
                        <button 
                            onClick={logic.scanForErrors} 
                            disabled={logic.isLoading} 
                            style={{ padding: '18px 40px', background: logic.isLoading ? '#cbd5e1' : THEME.primary, color: 'white', borderRadius: '15px', border: 'none', fontWeight: 900, fontSize: '16px', cursor: logic.isLoading ? 'not-allowed' : 'pointer', boxShadow: `0 10px 25px ${THEME.primary}40`, transition: '0.3s' }}
                        >
                            {logic.isLoading ? '⏳ جاري المسح الشامل...' : '🔍 إطلاق الرادار الآلي'}
                        </button>
                    </div>
                </GlassContainer>

                {!logic.hasScanned ? (
                    <div style={{ textAlign: 'center', padding: '120px 20px', color: '#94a3b8', background: 'white', borderRadius: '24px', marginTop: '30px', border: '2px dashed #cbd5e1' }}>
                        <div style={{ fontSize: '80px', marginBottom: '20px', animation: 'pulse 2s infinite' }}>🕵️‍♂️</div>
                        <h2 style={{ color: THEME.primary, fontWeight: 900 }}>النظام جاهز للفحص</h2>
                        <p style={{ fontSize: '16px' }}>اضغط على "إطلاق الرادار الآلي" لبدء تشخيص القيود والسندات والرواتب.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '35px', marginTop: '30px' }}>
                        
                        <GlassContainer>
                            <SectionHeader title="القيود اليتيمة (مستندات مفقودة)" count={logic.filteredOrphans.length} color={THEME.ruby} icon="🗑️" />
                            <ErrorTable data={logic.filteredOrphans} color={THEME.ruby} onAction={logic.deleteHeader} actionText="مسح القيد" logic={logic} />
                        </GlassContainer>

                        <GlassContainer>
                            <SectionHeader title="القيود غير المتزنة (خلل ميزان المراجعة)" count={logic.filteredUnbalanced.length} color="#7c3aed" icon="⚖️" />
                            <ErrorTable 
                                data={logic.filteredUnbalanced} 
                                color="#7c3aed" 
                                onAction={(id: any, item: any) => logic.forceBalanceJournal(id, item.diffAmount)} 
                                actionText="⚖️ موازنة آلية" 
                                secondaryAction={logic.deleteHeader}
                                secondaryActionText="حذف نهائي"
                                logic={logic} 
                            />
                        </GlassContainer>

                        <GlassContainer>
                            <SectionHeader title="القيود الأشباح (سطور بدون هيدر)" count={logic.filteredGhosts.length} color="#0891b2" icon="👻" />
                            <ErrorTable data={logic.filteredGhosts} color="#0891b2" onAction={(id: any) => logic.deleteHeader(id, true)} actionText="🛡️ تطهير السطور" logic={logic} />
                        </GlassContainer>

                        <GlassContainer>
                            <SectionHeader title="سندات مكررة محتملاً" count={logic.filteredDuplicates.length} color="#d97706" icon="👯" />
                            <ErrorTable data={logic.filteredDuplicates} color="#d97706" isReceipt onAction={(id:any) => logic.setSelectedIds((prev: any[]) => prev.filter(x => x !== id))} actionText="تجاهل / موافق" logic={logic} />
                        </GlassContainer>

                    </div>
                )}
            </div>
        </AuthGuard>
    );
}

function ErrorTable({ data, color, onAction, actionText, secondaryAction, secondaryActionText, isReceipt = false, logic }: any) {
    if (data.length === 0) {
        return (
            <div style={{ padding: '30px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', textAlign: 'center', color: '#10b981', fontWeight: 900, border: '2px dashed #10b981', fontSize: '16px' }}>
                ✨ هذا القسم نظيف تماماً، لا توجد أخطاء!
            </div>
        );
    }

    const allIds = data.map((item: any) => item.id);
    const isAllSelected = allIds.length > 0 && allIds.every((id: string) => logic.selectedIds.includes(id));

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            logic.setSelectedIds((prev: string[]) => Array.from(new Set([...prev, ...allIds])));
        } else {
            logic.setSelectedIds((prev: string[]) => prev.filter((id: string) => !allIds.includes(id)));
        }
    };

    return (
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: `1px solid ${color}30` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead style={{ background: `${color}08`, color: color }}>
                    <tr>
                        <th style={{ padding: '18px', width: '50px', borderBottom: `2px solid ${color}20` }}>
                            <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} style={{ width: '16px', height: '16px', accentColor: color, cursor: 'pointer' }} />
                        </th>
                        <th style={{ padding: '18px', borderBottom: `2px solid ${color}20`, width: '15%' }}>المعرف / رقم السند</th>
                        <th style={{ padding: '18px', borderBottom: `2px solid ${color}20`, width: '35%' }}>البيان وهوية المستند</th>
                        <th style={{ padding: '18px', borderBottom: `2px solid ${color}20`, width: '35%' }}>التشخيص والحل المحاسبي</th>
                        <th style={{ padding: '18px', textAlign: 'center', borderBottom: `2px solid ${color}20`, width: '15%' }}>إجراء سريع</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item: any) => {
                        const isSelected = logic.selectedIds.includes(item.id);
                        const documentDate = item.entry_date || item.date || item.created_at?.split('T')[0];
                        const documentAmount = item.totalAmount || item.amount || item.diffAmount || 0;
                        const refId = item.reference_id || item.reference_number;

                        return (
                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? `${color}10` : 'white', transition: '0.2s' }}>
                                <td style={{ padding: '15px' }}>
                                    <input type="checkbox" checked={isSelected} onChange={() => logic.toggleSelection(item.id)} style={{ width: '16px', height: '16px', accentColor: color, cursor: 'pointer' }} />
                                </td>
                                <td style={{ padding: '15px', fontWeight: 900, fontFamily: 'monospace', fontSize: '14px', color: '#334155' }}>
                                    {item.isGhost ? '👻 GHOST-REF' : (isReceipt ? item.receipt_number : `JRN-${item.id.toString().slice(0,8).toUpperCase()}`)}
                                </td>
                                <td style={{ padding: '15px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '10px' }}>
                                        {item.description || item.notes || 'لا يوجد بيان توضيحي'}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        <span style={{ background: `${color}15`, color: color, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 900, border: `1px solid ${color}30` }}>
                                            💰 {formatCurrency(documentAmount)}
                                        </span>
                                        {documentDate && (
                                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>
                                                📅 {documentDate}
                                            </span>
                                        )}
                                        {refId && (
                                            <span style={{ background: '#f8fafc', color: '#64748b', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: '1px dashed #cbd5e1', fontFamily: 'monospace' }}>
                                                🔗 {refId.toString().slice(0, 15)}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '15px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <span style={{ fontSize: '12px', color: '#334155', lineHeight: '1.6', background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <strong style={{ color: color }}>⚠️ تشخيص:</strong> {item.diagnosis}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#166534', lineHeight: '1.6', background: '#f0fdf4', padding: '8px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                            <strong style={{ color: '#059669' }}>💡 الحل:</strong> {item.solution}
                                        </span>
                                    </div>
                                </td>
                                <td style={{ padding: '15px', textAlign: 'center', verticalAlign: 'middle' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <button 
                                            onClick={() => onAction(item.id, item)} 
                                            style={{ padding: '10px 18px', background: color, color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', transition: '0.2s', boxShadow: `0 4px 10px ${color}30`, width: '100%' }}
                                        >
                                            {actionText}
                                        </button>
                                        {secondaryAction && (
                                            <button 
                                                onClick={() => secondaryAction(item.id)}
                                                style={{ background: 'none', border: 'none', color: '#e11d48', fontSize: '11px', fontWeight: 900, cursor: 'pointer', textDecoration: 'underline' }}
                                            >
                                                {secondaryActionText}
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}