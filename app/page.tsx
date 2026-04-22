"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/lib/PermissionsContext'; // 🛡️ نظام الصلاحيات المركزي
import SecureAction from '@/components/SecureAction';      // 🛡️ مغلف الأمان

export default function ExecutiveHomePage() {
    // 🛡️ سحب الصلاحيات والدور الفعلي من النظام
    const { role, can, loading: permsLoading } = usePermissions();
    
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        liquidity: 0,
        activeProjects: 0,
        todayEntries: 0,
        pendingErrors: 0
    });

    useEffect(() => {
        const fetchRealDashboardData = async () => {
            setIsLoading(true);
            try {
                // 1. حساب السيولة النقدية (مجموع أرصدة الصناديق والبنوك)
                // 💡 ملاحظة: عدل كلمة 'account_type' و 'balance' حسب مسميات الأعمدة في جدول accounts عندك
                const { data: accounts } = await supabase
                    .from('accounts')
                    .select('balance')
                    .in('account_type', ['صندوق', 'بنك', 'نقدية بالصندوق', 'حسابات بنكية', 'نقدية']);
                
                const totalLiquidity = accounts?.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0) || 0;

                // 2. حساب المشاريع النشطة
                const { count: projectsCount } = await supabase
                    .from('projects')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['نشط', 'جاري', 'قيد التنفيذ']); // عدل الحالات حسب نظامك

                // 3. قيود اليومية لليوم الحالي
                const today = new Date().toISOString().split('T')[0];
                const { count: entriesCount } = await supabase
                    .from('journal')
                    .select('*', { count: 'exact', head: true })
                    .gte('date', today);

                // 4. أخطاء الرادار المعلقة
                const { count: errorsCount } = await supabase
                    .from('journal_errors')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_fixed', false); // أو eq('status', 'pending') حسب جدولك

                setStats({
                    liquidity: totalLiquidity,
                    activeProjects: projectsCount || 0,
                    todayEntries: entriesCount || 0,
                    pendingErrors: errorsCount || 0
                });

            } catch (error) {
                console.error("❌ خطأ في سحب بيانات الداشبورد:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (!permsLoading) {
            fetchRealDashboardData();
        }
    }, [permsLoading]);

    if (permsLoading || isLoading) {
        return <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#94a3b8', direction: 'rtl' }}>⏳ جاري إعداد مركز القيادة...</div>;
    }

    // تحديد الترحيب حسب الدور
    const roleTitle = role === 'super_admin' ? 'المدير العام 👑' : role === 'admin' ? 'مدير النظام 🛡️' : 'زميلنا العزيز 👋';

    return (
        <div className="clean-page">
            
            <style>{`
                /* 🚀 سحر المسافات والهوامش السلبية الموحد */
                .clean-page { 
                    padding: 30px 20px 30px 0px !important; 
                    margin-right: -25px !important; 
                    direction: rtl; 
                    background: transparent; 
                    min-height: 100vh; 
                }
                
                @media (max-width: 768px) {
                    .clean-page { padding: 15px !important; margin-right: -10px !important; }
                }

                .glass-card {
                    background: rgba(255,255,255,0.6);
                    backdrop-filter: blur(15px);
                    border: 1px solid rgba(255,255,255,0.8);
                    border-radius: 24px;
                    padding: 25px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.03);
                    transition: 0.3s;
                }
                .glass-card:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0,0,0,0.06); }

                .quick-link-btn {
                    background: rgba(255,255,255,0.8);
                    border: 1px solid rgba(255,255,255,0.9);
                    border-radius: 20px;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    text-decoration: none;
                    color: #1e293b;
                    font-weight: 900;
                    transition: 0.3s;
                    cursor: pointer;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.02);
                }
                .quick-link-btn:hover { background: white; transform: scale(1.05); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
                .quick-link-btn .icon { font-size: 32px; }
            `}</style>

            {/* 🔝 الهيدر الترحيبي الذكي */}
            <div style={{ marginBottom: '40px', paddingRight: '15px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 900, color: THEME.brand.coffee, margin: 0, letterSpacing: '-0.5px' }}>
                    مرحباً بك، {roleTitle}
                </h1>
                <p style={{ color: '#64748b', fontSize: '15px', fontWeight: 600, marginTop: '8px' }}>إليك نبذة سريعة وحية عن حالة "رواسي" اليوم</p>
            </div>

            {/* 🎴 كروت الأداء الحية */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                
                {/* 🛡️ كارت السيولة (يظهر لمن لديه صلاحية رؤية المركز المالي أو الإدارة العليا) */}
                {(role === 'super_admin' || role === 'admin' || can('financial_center', 'view')) && (
                    <div className="glass-card" style={{ borderRight: `6px solid ${THEME.success}` }}>
                        <div style={{ fontSize: '35px', marginBottom: '10px' }}>💰</div>
                        <p style={{ fontSize: '13px', fontWeight: 900, color: '#64748b', margin: 0 }}>إجمالي السيولة النقدية المتاحة</p>
                        <h2 style={{ fontSize: '28px', color: THEME.success, margin: '5px 0 0 0', fontWeight: 900 }}>{formatCurrency(stats.liquidity)}</h2>
                    </div>
                )}

                {/* كارت المشاريع */}
                <div className="glass-card" style={{ borderRight: `6px solid ${THEME.primary}` }}>
                    <div style={{ fontSize: '35px', marginBottom: '10px' }}>🏗️</div>
                    <p style={{ fontSize: '13px', fontWeight: 900, color: '#64748b', margin: 0 }}>المشاريع النشطة حالياً</p>
                    <h2 style={{ fontSize: '28px', color: THEME.primary, margin: '5px 0 0 0', fontWeight: 900 }}>{stats.activeProjects} مشروع</h2>
                </div>

                {/* كارت القيود */}
                <div className="glass-card" style={{ borderRight: `6px solid ${THEME.accent}` }}>
                    <div style={{ fontSize: '35px', marginBottom: '10px' }}>📝</div>
                    <p style={{ fontSize: '13px', fontWeight: 900, color: '#64748b', margin: 0 }}>حركة القيود اليوم</p>
                    <h2 style={{ fontSize: '28px', color: THEME.accent, margin: '5px 0 0 0', fontWeight: 900 }}>{stats.todayEntries} قيد جديد</h2>
                </div>

                {/* 🛡️ كارت التنبيهات والأخطاء (يظهر لمن لديه صلاحية رادار الأخطاء) */}
                {(role === 'super_admin' || role === 'admin' || can('journal_errors', 'view')) && (
                    <div className="glass-card" style={{ borderRight: `6px solid ${stats.pendingErrors > 0 ? THEME.ruby : THEME.success}`, background: stats.pendingErrors > 0 ? 'rgba(239, 68, 68, 0.05)' : '' }}>
                        <div style={{ fontSize: '35px', marginBottom: '10px' }}>🛡️</div>
                        <p style={{ fontSize: '13px', fontWeight: 900, color: '#64748b', margin: 0 }}>أخطاء وتنبيهات الرادار</p>
                        <h2 style={{ fontSize: '28px', color: stats.pendingErrors > 0 ? THEME.ruby : THEME.success, margin: '5px 0 0 0', fontWeight: 900 }}>
                            {stats.pendingErrors > 0 ? `${stats.pendingErrors} أخطاء تحتاج مراجعة` : 'الدفاتر سليمة 100%'}
                        </h2>
                    </div>
                )}
            </div>

            {/* 🏗️ قسم الوصول السريع (Quick Navigation) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
                
                {/* صندوق الاختصارات */}
                <div className="glass-card" style={{ background: 'rgba(255,255,255,0.4)' }}>
                    <h3 style={{ marginBottom: '25px', fontWeight: 900, color: THEME.brand.coffee }}>🔗 اختصارات الإدارة السريعة</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '15px' }}>
                        
                        <SecureAction module="projects" action="view">
                            <Link href="/projects" className="quick-link-btn">
                                <span className="icon">📂</span><span>المشاريع</span>
                            </Link>
                        </SecureAction>

                        <SecureAction module="employees" action="view">
                            <Link href="/employees" className="quick-link-btn">
                                <span className="icon">👷</span><span>العمالة</span>
                            </Link>
                        </SecureAction>

                        <SecureAction module="expenses" action="view">
                            <Link href="/expenses" className="quick-link-btn">
                                <span className="icon">📉</span><span>المصروفات</span>
                            </Link>
                        </SecureAction>

                        <SecureAction module="invoices" action="view">
                            <Link href="/invoices" className="quick-link-btn">
                                <span className="icon">🧾</span><span>الفواتير</span>
                            </Link>
                        </SecureAction>

                        <SecureAction module="journal_errors" action="view">
                            <Link href="/journal-errors" className="quick-link-btn" style={{ border: `1px solid ${THEME.ruby}50` }}>
                                <span className="icon">🛡️</span><span style={{color: THEME.ruby}}>الرادار</span>
                            </Link>
                        </SecureAction>
                        
                        {(role === 'super_admin' || role === 'admin') && (
                            <Link href="/team" className="quick-link-btn" style={{ border: `1px solid ${THEME.primary}50` }}>
                                <span className="icon">👥</span><span style={{color: THEME.primary}}>صلاحيات الفريق</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* صندوق التنبيهات المباشرة (Live Feed) */}
                <div className="glass-card" style={{ background: 'linear-gradient(145deg, #0f172a, #1e293b)', color: 'white', border: 'none' }}>
                    <h3 style={{ marginBottom: '20px', fontWeight: 900, color: THEME.brand.gold }}>📢 نبض النظام (مباشر)</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {stats.pendingErrors > 0 ? (
                            <div style={{ padding: '15px', borderRadius: '15px', borderRight: `4px solid ${THEME.ruby}`, background: 'rgba(239, 68, 68, 0.1)' }}>
                                <small style={{ color: '#94a3b8', fontWeight: 900 }}>تنبيه محاسبي 🔴</small>
                                <p style={{ fontSize: '13px', fontWeight: 800, margin: '5px 0 0 0' }}>تم اكتشاف ({stats.pendingErrors}) قيود غير متزنة. يرجى التوجه لرادار الأخطاء فوراً.</p>
                            </div>
                        ) : (
                            <div style={{ padding: '15px', borderRadius: '15px', borderRight: `4px solid ${THEME.success}`, background: 'rgba(34, 197, 94, 0.1)' }}>
                                <small style={{ color: '#94a3b8', fontWeight: 900 }}>حالة الدفاتر 🟢</small>
                                <p style={{ fontSize: '13px', fontWeight: 800, margin: '5px 0 0 0' }}>جميع القيود المالية متزنة ولا توجد أخطاء في الدفاتر.</p>
                            </div>
                        )}

                        <div style={{ padding: '15px', borderRadius: '15px', borderRight: `4px solid ${THEME.accent}`, background: 'rgba(255,255,255,0.05)' }}>
                            <small style={{ color: '#94a3b8', fontWeight: 900 }}>نشاط اليوم ⚡</small>
                            <p style={{ fontSize: '13px', fontWeight: 800, margin: '5px 0 0 0' }}>تم تسجيل ({stats.todayEntries}) حركة مالية في دفتر اليومية منذ صباح اليوم.</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}