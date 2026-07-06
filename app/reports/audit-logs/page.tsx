"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/lib/theme';
import { useSidebar } from '@/lib/SidebarContext'; 
import MasterPage from '@/components/MasterPage'; 
import RawasiSmartTable from '@/components/rawasismarttable';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/helpers';
import { createPortal } from 'react-dom';

export default function AuditLogsPage() {
    const router = useRouter();
    const { setSidebarContent } = useSidebar();
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<any>(null);

    // ==========================================
    // 🛡️ Security Guard
    // ==========================================
    useEffect(() => {
        const checkAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push('/login');

            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin' && !profile.permissions?.audit_logs?.view)) {
                alert("⛔ ليس لديك صلاحية لمشاهدة سجل المراقبة.");
                router.push('/');
            }
        };
        checkAccess();
    }, [router]);

    // ==========================================
    // 📡 Data Fetching
    // ==========================================
    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*, profiles(full_name, role)')
                .order('created_at', { ascending: false })
                .limit(500); // إحضار آخر 500 حركة كحد أقصى للأداء
            
            if (error) throw error;
            setLogs(data || []);
        } catch (error: any) {
            console.error("Fetch Error:", error);
            // لا تظهر خطأ للمستخدم إذا لم يتم إنشاء الجدول بعد
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { 
        fetchLogs(); 
    }, []);

    // ==========================================
    // 5. Sidebar Integration
    // ==========================================
    useEffect(() => {
        setSidebarContent({
            actions: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    <button onClick={fetchLogs} className="btn-main-glass white">
                        🔄 تحديث السجل
                    </button>
                </div>
            ),
            summary: (
                <div className="summary-glass-card" style={{ borderColor: THEME.brand.gold }}>
                    <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي الحركات 🕵️‍♂️</span>
                    <div style={{fontSize:'28px', fontWeight:900, color: THEME.brand.gold}}>{logs.length}</div>
                </div>
            )
        });
        return () => setSidebarContent({ actions: null, summary: null });
    }, [logs.length, setSidebarContent]);

    // ==========================================
    // Table Columns Configuration
    // ==========================================
    const columns = [
        { 
            key: 'created_at', 
            label: 'التاريخ والوقت', 
            sortable: true,
            render: (row: any) => <div style={{ direction: 'ltr', textAlign: 'right', fontWeight: 800 }}>{formatDate(row.created_at, true)}</div>
        },
        { 
            key: 'profiles.full_name', 
            label: 'بواسطة (المستخدم)', 
            sortable: true,
            render: (row: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 900, color: THEME.brand.coffee }}>{row.profiles?.full_name || 'System / Unknown'}</span>
                    <span style={{ fontSize: '10px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{row.profiles?.role || '---'}</span>
                </div>
            )
        },
        { 
            key: 'action', 
            label: 'نوع العملية', 
            sortable: true,
            render: (row: any) => {
                const colors: any = { 'INSERT': '#22c55e', 'UPDATE': '#f59e0b', 'DELETE': '#ef4444' };
                const labels: any = { 'INSERT': '➕ إضافة', 'UPDATE': '📝 تعديل', 'DELETE': '🗑️ حذف' };
                return (
                    <span style={{ background: `${colors[row.action]}15`, color: colors[row.action], padding: '6px 12px', borderRadius: '12px', fontWeight: 900, fontSize: '12px' }}>
                        {labels[row.action] || row.action}
                    </span>
                );
            }
        },
        { 
            key: 'table_name', 
            label: 'الجدول المستهدف', 
            sortable: true,
            render: (row: any) => <span style={{ fontWeight: 800, background: '#e2e8f0', padding: '4px 8px', borderRadius: '6px' }}>{row.table_name}</span>
        },
        {
            key: 'actions',
            label: 'التفاصيل',
            render: (row: any) => (
                <button 
                    onClick={() => setSelectedLog(row)}
                    style={{ background: 'white', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, transition: '0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = THEME.primary}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                >
                    🔍 عرض السجل
                </button>
            )
        }
    ];

    // ==========================================
    // Render JSON Diff
    // ==========================================
    const renderDiff = (oldData: any, newData: any) => {
        const o = oldData || {};
        const n = newData || {};
        const allKeys = Array.from(new Set([...Object.keys(o), ...Object.keys(n)]));

        return (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', direction: 'ltr', textAlign: 'left' }}>
                <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '10px', width: '25%' }}>Field Name</th>
                        <th style={{ padding: '10px', width: '37.5%', color: '#ef4444' }}>Old Value</th>
                        <th style={{ padding: '10px', width: '37.5%', color: '#22c55e' }}>New Value</th>
                    </tr>
                </thead>
                <tbody>
                    {allKeys.map(key => {
                        const oldVal = JSON.stringify(o[key] ?? 'null');
                        const newVal = JSON.stringify(n[key] ?? 'null');
                        const isChanged = oldVal !== newVal;
                        if (!isChanged && (o[key] === undefined || n[key] === undefined)) return null;

                        return (
                            <tr key={key} style={{ borderBottom: '1px solid #f1f5f9', background: isChanged ? '#fefce8' : 'white' }}>
                                <td style={{ padding: '10px', fontWeight: 800, color: '#475569' }}>{key}</td>
                                <td style={{ padding: '10px', fontFamily: 'monospace', color: isChanged ? '#ef4444' : '#94a3b8', textDecoration: isChanged ? 'line-through' : 'none' }}>
                                    {o[key] !== undefined ? oldVal : '-'}
                                </td>
                                <td style={{ padding: '10px', fontFamily: 'monospace', color: isChanged ? '#22c55e' : '#94a3b8', fontWeight: isChanged ? 800 : 400 }}>
                                    {n[key] !== undefined ? newVal : '-'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    return (
        <MasterPage icon="🕵️‍♂️" title="سجل المراقبة والنشاطات" subtitle="تتبع دقيق لجميع التعديلات والعمليات في النظام (Audit Logs)">
            
            {logs.length === 0 && !isLoading && (
                <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '24px', border: `1px solid ${THEME.brand.gold}40` }}>
                    <div style={{ fontSize: '50px' }}>🛡️</div>
                    <h3 style={{ color: THEME.brand.coffee, fontWeight: 900 }}>لم يتم تسجيل أي نشاط بعد أو أن المحرك غير مفعل</h3>
                    <p style={{ color: '#64748b' }}>يرجى التأكد من تشغيل سكريبت (SQL) الخاص بسجل المراقبة في قاعدة البيانات لتفعيل الرصد التلقائي.</p>
                </div>
            )}

            {logs.length > 0 && (
                <div style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', border: '1px solid white' }}>
                    <RawasiSmartTable 
                        data={logs} 
                        columns={columns} 
                        searchPlaceholder="ابحث باسم المستخدم، أو الجدول..."
                        isLoading={isLoading}
                    />
                </div>
            )}

            {/* 🔍 Details Modal */}
            {selectedLog && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)' }} onClick={() => setSelectedLog(null)} />
                    
                    <div style={{ background: 'white', width: '900px', maxWidth: '95vw', maxHeight: '90vh', borderRadius: '24px', zIndex: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
                        <div style={{ padding: '25px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontWeight: 900, color: THEME.primary, fontSize: '20px' }}>تفاصيل العملية 🕵️‍♂️</h3>
                                <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#64748b' }}>معرف السجل: {selectedLog.id}</p>
                            </div>
                            <button onClick={() => setSelectedLog(null)} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', fontWeight: 900 }}>✕</button>
                        </div>

                        <div style={{ padding: '25px', overflowY: 'auto', flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px', background: '#f1f5f9', padding: '15px', borderRadius: '16px' }}>
                                <div><span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 800 }}>الجدول:</span><span style={{ fontWeight: 900 }}>{selectedLog.table_name}</span></div>
                                <div><span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 800 }}>العملية:</span><span style={{ fontWeight: 900 }}>{selectedLog.action}</span></div>
                                <div><span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 800 }}>الوقت:</span><span style={{ fontWeight: 900, direction: 'ltr', display: 'inline-block' }}>{formatDate(selectedLog.created_at, true)}</span></div>
                                <div><span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 800 }}>بواسطة:</span><span style={{ fontWeight: 900 }}>{selectedLog.profiles?.full_name || 'System'}</span></div>
                            </div>

                            <h4 style={{ fontWeight: 900, marginBottom: '15px', color: THEME.brand.coffee }}>مقارنة البيانات الدقيقة (Data Diff)</h4>
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                                {renderDiff(selectedLog.old_data, selectedLog.new_data)}
                            </div>
                        </div>
                    </div>
                </div>, document.body
            )}
        </MasterPage>
    );
}
