"use client";
import React, { useState, useEffect } from 'react';
/* 🚀 تنبيه: تأكد أن اسم الملف GlassContainer (C كبيرة) في الفولدر */
import GlassContainer from '@/components/GlassContainer'; 
import { useRestoreLogic } from './restore_logic'; 
import { THEME } from '@/lib/theme';
import { supabase } from '@/lib/supabase'; // للتحقق من الصلاحيات

export default function RestorePage() {
    const { processExcelRestore, processJSONRestore } = useRestoreLogic();
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [verifying, setVerifying] = useState(true);

    // 🔐 التحقق من الصلاحيات قبل عرض الصفحة
    useEffect(() => {
        async function checkAuth() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', user.id)
                    .single();
                
                if (profile?.is_admin) {
                    setIsAdmin(true);
                }
            }
            setVerifying(false);
        }
        checkAuth();
    }, []);

    const handleFile = async (file: File) => {
        if (!isAdmin) return; // حماية إضافية
        setLoading(true);
        const isJson = file.name.endsWith('.json');
        setLogs([`⏳ جاري تحليل ملف (${isJson ? 'JSON' : 'Excel'})...`]);
        
        try {
            const result: any = isJson 
                ? await processJSONRestore(file) 
                : await processExcelRestore(file);

            if (result.success) {
                setLogs(result.logs);
            } else {
                setLogs([`❌ فشل الاستيراد: ${result.message}`]);
            }
        } catch (err) {
            setLogs([`❌ حدث خطأ غير متوقع أثناء المعالجة.`]);
        } finally {
            setLoading(false);
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
    };

    if (verifying) return <div style={{padding: '50px', textAlign: 'center'}}>⏳ جاري التحقق من الهوية...</div>;
    
    if (!isAdmin) return (
        <div style={{ padding: '100px', textAlign: 'center' }}>
            <h1 style={{fontSize: '50px'}}>🚫</h1>
            <h2 style={{color: THEME.danger}}>عفواً، هذه الصفحة مخصصة للمديرين فقط.</h2>
        </div>
    );

    return (
        <div style={{ padding: '40px', direction: 'rtl', maxWidth: '900px', margin: '0 auto' }}>
            <h1 style={{ fontWeight: 900, color: THEME.primary, marginBottom: '10px' }}>🚀 مركز الاستعادة الشامل</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>ارفع ملف (Excel) للجداول الفردية أو ملف (JSON) للقطة النظام الكاملة.</p>

            {/* تم تطبيق الـ Milky Glass Style هنا */}
            <div className="table-container fade-in-up" style={{ padding: '20px' }}>
                <div 
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => { e.preventDefault(); setDragActive(false); if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                    style={{ 
                        border: `3px dashed ${dragActive ? THEME.accent : 'rgba(0,0,0,0.1)'}`, 
                        padding: '60px 20px', 
                        textAlign: 'center', 
                        borderRadius: '20px',
                        background: dragActive ? 'rgba(202, 138, 4, 0.05)' : 'rgba(255,255,255,0.3)',
                        transition: '0.3s'
                    }}
                >
                    <input 
                        type="file" 
                        id="master-upload" 
                        accept=".xlsx, .xls, .json" 
                        onChange={onFileChange} 
                        style={{ display: 'none' }} 
                        disabled={loading}
                    />
                    <label htmlFor="master-upload" style={{ cursor: loading ? 'not-allowed' : 'pointer' }}>
                        <div style={{ fontSize: '60px', marginBottom: '15px' }}>📦</div>
                        <h3 style={{ color: THEME.primary, fontWeight: 900 }}>{loading ? 'جاري الاستعادة...' : 'ارمي الملف هنا (Excel أو JSON)'}</h3>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>النظام سيتعرف على النوع تلقائياً</p>
                    </label>
                </div>

                {loading && (
                    <div style={{ marginTop: '20px', height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div className="loading-bar-animation" style={{ height: '100%', background: THEME.accent, width: '100%', animation: 'loading 2s infinite' }}></div>
                    </div>
                )}
            </div>

            {logs.length > 0 && (
                <div className="table-container fade-in-up" style={{ marginTop: '30px', maxHeight: '400px', overflowY: 'auto', padding: '25px' }}>
                    <h4 style={{ marginBottom: '15px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '10px', fontWeight: 900 }}>📋 تقرير المزامنة:</h4>
                    {logs.map((log, index) => (
                        <div key={index} style={{ 
                            padding: '10px 0', 
                            fontSize: '14px', 
                            fontWeight: 600,
                            color: log.includes('❌') ? THEME.danger : (log.includes('✅') ? 'var(--success)' : 'var(--text-main)'),
                            borderBottom: '1px solid rgba(0,0,0,0.03)'
                        }}>
                            {log}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}