"use client";
import React, { useEffect, useState } from 'react';
import { THEME } from '@/lib/theme';
import GlassContainer from '@/components/Glasscontainer';
import { formatCurrency } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';

export default function ExecutiveHomePage() {
    const [role, setRole] = useState<'admin' | 'accountant'>('admin'); // هتعرف الدور من الـ Auth
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        balance: 0,
        activeProjects: 0,
        laborEfficiency: 0,
        alerts: 0
    });

    useEffect(() => {
        // هنا بنجيب البيانات وبنشوف المستخدم مين
        const loadDashboard = async () => {
            setLoading(true);
            // نفترض بنجيب الدور من السيشن
            // const { data: { user } } = await supabase.auth.getUser();
            // setRole(user.role); 

            // داتا تجريبية للنموذج
            setData({
                balance: 1250000.50,
                activeProjects: 8,
                laborEfficiency: 92,
                alerts: 3
            });
            setLoading(false);
        };
        loadDashboard();
    }, []);

    if (loading) return <div className="fade-in-up" style={{ textAlign: 'center', padding: '100px' }}>⏳ جاري تجهيز مركز القيادة...</div>;

    return (
        <div style={{ padding: '40px', direction: 'rtl', minHeight: '100vh' }}>
            
            {/* 🔝 الهيدر الترحيبي الذكي */}
            <div style={{ marginBottom: '40px' }} className="fade-in-up">
                <h1 style={{ fontSize: '32px', fontWeight: 900, color: THEME.primary }}>
                    مرحباً بك، {role === 'admin' ? 'المدير العام' : 'المحاسب المالي'} 👋
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>إليك نبذة سريعة عن حالة "رواسي" اليوم</p>
            </div>

            {/* 🎴 كروت الأداء (تتغير حسب الصلاحية) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '40px' }}>
                
                {/* كارت السيولة: المحاسب يشوفه عادي */}
                <HomeCard 
                    title="السيولة النقدية" 
                    value={formatCurrency(data.balance)} 
                    icon="💰" 
                    color={THEME.success} 
                />

                {/* كارت الإنتاجية: يظهر للمدير فقط، المحاسب يشوف "نظام العمالة" فقط */}
                {role === 'admin' ? (
                    <HomeCard 
                        title="كفاءة العمل الميداني" 
                        value={data.laborEfficiency + "%"} 
                        icon="🚀" 
                        color={THEME.accent} 
                    />
                ) : (
                    <HomeCard 
                        title="عدد القيود اليومية" 
                        value="45 قيد" 
                        icon="📝" 
                        color={THEME.primary} 
                    />
                )}

                <HomeCard 
                    title="المشاريع الجارية" 
                    value={data.activeProjects} 
                    icon="🏗️" 
                    color="#6366f1" 
                />
            </div>

            {/* 🏗️ قسم الوصول السريع (Quick Navigation) */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                
                <GlassContainer className="fade-in-up">
                    <h3 style={{ marginBottom: '25px' }}>🔗 اختصارات الإدارة السريعة</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                        <QuickLink icon="📂" label="المشاريع" path="/projects" />
                        <QuickLink icon="👷" label="العمالة" path="/labor" />
                        <QuickLink icon="💸" label="المصروفات" path="/expenses" />
                        
                        {/* روابط تظهر للمدير فقط */}
                        {role === 'admin' && (
                            <>
                                <QuickLink icon="🛡️" label="غرفة العمليات" path="/journal-errors" color={THEME.danger} />
                                <QuickLink icon="📊" label="الخلاصة المالية" path="/GlobalSummary" color={THEME.accent} />
                                <QuickLink icon="👥" label="المستخدمين" path="/users" />
                            </>
                        )}
                    </div>
                </GlassContainer>

                <GlassContainer className="fade-in-up" style={{ background: 'rgba(15, 23, 42, 0.9)', color: 'white' }}>
                    <h3 style={{ marginBottom: '20px' }}>📢 تنبيهات النظام</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ padding: '10px', borderRight: `4px solid ${THEME.accent}`, background: 'rgba(255,255,255,0.05)' }}>
                            <small>منذ ساعتين</small>
                            <p style={{ fontSize: '13px' }}>تم اكتشاف 3 قيود يتيمة في جدول السندات.</p>
                        </div>
                        <div style={{ padding: '10px', borderRight: `4px solid ${THEME.success}`, background: 'rgba(255,255,255,0.05)' }}>
                            <small>اليوم</small>
                            <p style={{ fontSize: '13px' }}>اكتمال صب الخرسانة في مشروع "برج الشروق".</p>
                        </div>
                    </div>
                </GlassContainer>
            </div>
        </div>
    );
}

// مكونات فرعية للتنسيق
function HomeCard({ title, value, icon, color }: any) {
    return (
        <div className="kpi-card" style={{ padding: '30px', borderRight: `6px solid ${color}` }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>{icon}</div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>{title}</p>
            <h2 style={{ fontSize: '28px', color: color, margin: 0 }}>{value}</h2>
        </div>
    );
}

function QuickLink({ icon, label, path, color = THEME.primary }: any) {
    return (
        <a href={path} style={{ textDecoration: 'none' }}>
            <div className="btn" style={{ 
                background: 'white', 
                border: '1px solid var(--glass-border)', 
                color: color, 
                width: '100%', 
                height: '100px', 
                flexDirection: 'column',
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
            }}>
                <span style={{ fontSize: '24px' }}>{icon}</span>
                <span style={{ fontSize: '12px', fontWeight: 900 }}>{label}</span>
            </div>
        </a>
    );
}