"use client";
import React, { useState } from 'react';
import GlassContainer from '@/components/Glasscontainer';
import { useRestoreLogic } from './restore_logic'; 
import { THEME } from '@/lib/theme';

export default function RestorePage() {
    const { processExcelRestore, processJSONRestore } = useRestoreLogic();
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [dragActive, setDragActive] = useState(false);

    const handleFile = async (file: File) => {
        setLoading(true);
        const isJson = file.name.endsWith('.json');
        setLogs([`⏳ جاري تحليل ملف (${isJson ? 'JSON' : 'Excel'})...`]);
        
        try {
            // رادار كشف نوع الملف وتوجيه اللوجيك
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

    return (
        <div style={{ padding: '40px', direction: 'rtl', maxWidth: '900px', margin: '0 auto' }}>
            <h1 style={{ fontWeight: 900, color: THEME.primary, marginBottom: '10px' }}>🚀 مركز الاستعادة الشامل</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>ارفع ملف (Excel) للجداول الفردية أو ملف (JSON) للقطة النظام الكاملة.</p>

            <GlassContainer className="fade-in-up">
                <div 
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => { e.preventDefault(); setDragActive(false); if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                    style={{ 
                        border: `3px dashed ${dragActive ? THEME.accent : 'var(--glass-border)'}`, 
                        padding: '60px 20px', 
                        textAlign: 'center', 
                        borderRadius: '20px',
                        background: dragActive ? 'rgba(202, 138, 4, 0.05)' : 'var(--input-bg)',
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
                        <h3 style={{ color: THEME.primary }}>{loading ? 'جاري الاستعادة...' : 'ارمي الملف هنا (Excel أو JSON)'}</h3>
                        <p style={{ color: 'var(--text-muted)' }}>النظام سيتعرف على النوع تلقائياً</p>
                    </label>
                </div>

                {loading && (
                    <div style={{ marginTop: '20px', height: '6px', background: '#eee', borderRadius: '10px', overflow: 'hidden' }}>
                        <div className="loading-bar-animation" style={{ height: '100%', background: THEME.accent, width: '100%' }}></div>
                    </div>
                )}
            </GlassContainer>

            {logs.length > 0 && (
                <GlassContainer className="fade-in-up" style={{ marginTop: '30px', maxHeight: '300px', overflowY: 'auto' }}>
                    <h4 style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>📋 تقرير المزامنة:</h4>
                    {logs.map((log, index) => (
                        <div key={index} style={{ 
                            padding: '8px 0', 
                            fontSize: '13px', 
                            color: log.includes('❌') ? THEME.danger : (log.includes('✅') ? THEME.success : '#555'),
                            borderBottom: '1px solid rgba(0,0,0,0.02)'
                        }}>
                            {log}
                        </div>
                    ))}
                </GlassContainer>
            )}
        </div>
    );
}