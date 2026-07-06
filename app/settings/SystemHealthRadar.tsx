"use client";
import React, { useEffect, useState } from 'react';
import { THEME } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

export default function SystemHealthRadar() {
    const [dbLatency, setDbLatency] = useState<number | null>(null);
    const [isDbOnline, setIsDbOnline] = useState<boolean>(false);

    useEffect(() => {
        const pingDb = async () => {
            const start = performance.now();
            const { error } = await supabase.from('profiles').select('id').limit(1);
            const end = performance.now();
            if (!error) {
                setIsDbOnline(true);
                setDbLatency(Math.round(end - start));
            } else {
                setIsDbOnline(false);
            }
        };
        pingDb();
        const interval = setInterval(pingDb, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ animation: 'fadeUp 0.5s ease-out' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '25px', border: `1px solid ${THEME.border}`, textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '40px', marginBottom: '15px' }}>{isDbOnline ? '🟢' : '🔴'}</div>
                    <h3 style={{ margin: '0 0 10px 0', color: THEME.primary, fontWeight: 900 }}>حالة قاعدة البيانات</h3>
                    <div style={{ fontSize: '15px', color: isDbOnline ? '#059669' : '#dc2626', fontWeight: 800 }}>
                        {isDbOnline ? 'متصلة وتعمل بكفاءة' : 'مقطوعة الاتصال'}
                    </div>
                </div>

                <div style={{ background: 'white', borderRadius: '16px', padding: '25px', border: `1px solid ${THEME.border}`, textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '40px', marginBottom: '15px' }}>⚡</div>
                    <h3 style={{ margin: '0 0 10px 0', color: THEME.primary, fontWeight: 900 }}>زمن استجابة السيرفر</h3>
                    <div style={{ fontSize: '24px', color: '#3b82f6', fontWeight: 900, direction: 'ltr' }}>
                        {dbLatency !== null ? `${dbLatency} ms` : '...'}
                    </div>
                </div>

                <div style={{ background: 'white', borderRadius: '16px', padding: '25px', border: `1px solid ${THEME.border}`, textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '40px', marginBottom: '15px' }}>🛡️</div>
                    <h3 style={{ margin: '0 0 10px 0', color: THEME.primary, fontWeight: 900 }}>نظام الأمان</h3>
                    <div style={{ fontSize: '15px', color: '#059669', fontWeight: 800 }}>
                        نشط (مُشفر)
                    </div>
                </div>
            </div>
        </div>
    );
}
