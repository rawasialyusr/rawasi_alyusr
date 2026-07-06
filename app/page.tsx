"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { THEME } from '@/lib/theme';
import { usePermissions } from '@/lib/PermissionsContext';
import SecureAction from '@/components/SecureAction';
import LoadingScreen from '@/components/LoadingScreen';

const MOTIVATIONAL_MESSAGES = [
    "يوم جديد لنجاحات مبهرة، توكل على الله وانطلق! 🚀",
    "النجاح يبدأ بخطوة، وأنت الآن في المسار الصحيح! 🌟",
    "الأرقام لا تكذب، اجعل أرقام اليوم أفضل من الأمس! 📊",
    "كل مجهود صغير يتراكم ليصنع إنجازاً عظيماً! 💪",
    "رواسي اليسر تكبر بجهودكم، شكراً لعملكم الرائع! 🏗️",
    "الدقة في العمل هي أساس الثقة، حافظ على تميزك! 💎",
    "اجعل هدفك اليوم هو التميز، لا مجرد الإنجاز! ✨",
    "لا حدود لما يمكنك تحقيقه اليوم، انطلق بثقة! 🎯",
    "من جدّ وجد، ومن زرع حصد! العمل الجاد لا يخون! 🌾",
    "بثقتنا بالله وبجهودكم، نحن نبني المستقبل! 🏛️"
];

export default function WelcomeHomePage() {
    const { role, can, loading: permsLoading, profile } = usePermissions();
    const [greeting, setGreeting] = useState('');
    const [quote, setQuote] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('صباح الخير ☀️');
        else if (hour < 18) setGreeting('طاب مساؤك 🌤️');
        else setGreeting('مساء الخير 🌙');

        setQuote(MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]);
    }, []);

    if (permsLoading) {
        return <LoadingScreen message="جاري تحضير مساحة العمل..." fullScreen={false} />;
    }

    const userName = profile?.full_name || 'زميلنا العزيز';
    const firstNameOnly = userName.split(' ')[0];
    const roleTitle = role === 'super_admin' ? 'المدير العام 👑' : role === 'admin' ? 'مدير النظام 🛡️' : 'مستخدم النظام';
    const avatarUrl = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=C5A059&color=fff&bold=true&size=128`;

    return (
        <div className="welcome-page-wrapper">
            <style>{`
                .welcome-page-wrapper {
                    padding: 40px;
                    direction: rtl;
                    min-height: calc(100vh - 80px);
                    display: flex;
                    flex-direction: column;
                    gap: 30px;
                    background: radial-gradient(circle at top right, rgba(197, 160, 89, 0.05), transparent 400px),
                                radial-gradient(circle at bottom left, rgba(67, 52, 46, 0.03), transparent 400px);
                }

                @media (max-width: 768px) {
                    .welcome-page-wrapper { padding: 20px; gap: 20px; }
                }

                /* ===== كارت المستخدم (أعلى الصفحة) ===== */
                .user-card {
                    background: rgba(255,255,255,0.7);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255,255,255,0.9);
                    border-radius: 24px;
                    padding: 22px 35px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.04);
                    animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    position: relative;
                    overflow: hidden;
                }
                .user-card::before {
                    content: '';
                    position: absolute;
                    top: 0; right: 0; left: 0; height: 3px;
                    background: linear-gradient(90deg, ${THEME.goldAccent}, ${THEME.coffeeDark});
                }
                .user-avatar {
                    width: 60px; height: 60px;
                    border-radius: 50%;
                    border: 3px solid ${THEME.goldAccent}60;
                    object-fit: cover;
                    flex-shrink: 0;
                }
                .user-card-info { flex: 1; }
                .user-card-greeting {
                    font-size: 12px; font-weight: 700;
                    color: #94a3b8; margin: 0 0 3px 0;
                }
                .user-card-name {
                    font-size: 22px; font-weight: 900;
                    color: ${THEME.coffeeDark}; margin: 0 0 5px 0;
                    letter-spacing: -0.5px;
                }
                .user-card-role {
                    display: inline-block;
                    padding: 3px 12px;
                    background: ${THEME.goldAccent}18;
                    border: 1px solid ${THEME.goldAccent}40;
                    border-radius: 20px;
                    font-size: 12px; font-weight: 900;
                    color: ${THEME.coffeeDark};
                }

                @media (max-width: 768px) {
                    .user-card { padding: 18px 20px; gap: 15px; }
                    .user-card-name { font-size: 18px; }
                }

                /* ===== البطاقة الرئيسية (وسط الصفحة) ===== */
                .hero-glass-card {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.9);
                    border-radius: 30px;
                    padding: 60px 50px;
                    text-align: center;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.03);
                    animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    position: relative;
                    overflow: hidden;
                }
                .hero-glass-card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; height: 4px;
                    background: linear-gradient(90deg, ${THEME.goldAccent}, ${THEME.coffeeDark});
                }

                .welcome-title {
                    font-size: 48px;
                    font-weight: 900;
                    color: ${THEME.coffeeDark};
                    margin: 0 0 15px 0;
                    letter-spacing: -1px;
                }

                .welcome-subtitle {
                    font-size: 18px;
                    color: #64748b;
                    font-weight: 700;
                    max-width: 600px;
                    margin: 0 auto 40px auto;
                    line-height: 1.7;
                    font-style: italic;
                }

                .modules-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    max-width: 1000px;
                    margin: 0 auto;
                }

                .module-card {
                    background: white;
                    border: 1px solid #f1f5f9;
                    border-radius: 20px;
                    padding: 30px 20px;
                    text-align: center;
                    text-decoration: none;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.02);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 15px;
                }
                .module-card:hover {
                    transform: translateY(-10px) scale(1.02);
                    box-shadow: 0 20px 40px rgba(197, 160, 89, 0.1);
                    border-color: ${THEME.goldAccent};
                }
                .module-icon {
                    width: 70px; height: 70px;
                    background: #f8fafc;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 32px;
                    transition: 0.3s;
                }
                .module-card:hover .module-icon {
                    background: ${THEME.goldAccent}20;
                    transform: rotate(5deg) scale(1.1);
                }
                .module-title { color: ${THEME.coffeeDark}; font-weight: 900; font-size: 18px; margin: 0; }
                .module-desc { color: #94a3b8; font-size: 12px; font-weight: 700; margin: 0; }

                @media (max-width: 768px) {
                    .hero-glass-card { padding: 30px 20px; }
                    .welcome-title { font-size: 30px; }
                    .welcome-subtitle { font-size: 15px; }
                    .modules-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
                    .module-card { padding: 20px 12px; }
                    .module-icon { width: 52px; height: 52px; font-size: 24px; }
                    .module-title { font-size: 15px; }
                }
            `}</style>

            {/* ===== كارت المستخدم (أعلى الصفحة لوحده) ===== */}
            <div className="user-card">
                <img src={avatarUrl} alt={userName} className="user-avatar" />
                <div className="user-card-info">
                    <p className="user-card-greeting">{greeting}،</p>
                    <h2 className="user-card-name">{firstNameOnly} 👋</h2>
                    <span className="user-card-role">{roleTitle}</span>
                </div>
            </div>

            {/* ===== البطاقة الرئيسية — الرسالة + الوحدات ===== */}
            <div className="hero-glass-card">

                <div style={{ display: 'inline-block', padding: '8px 20px', background: `${THEME.goldAccent}20`, color: THEME.coffeeDark, borderRadius: '20px', fontWeight: 900, fontSize: '14px', marginBottom: '20px' }}>
                    {roleTitle}
                </div>

                <h1 className="welcome-title">{greeting}، {firstNameOnly}</h1>
                <p className="welcome-subtitle">✨ {quote}</p>

                <div className="modules-grid">

                    <SecureAction module="dashboard" action="view">
                        <Link href="/Dashboard" className="module-card">
                            <div className="module-icon">📊</div>
                            <div><h3 className="module-title">لوحة القيادة</h3><p className="module-desc">ملخص المؤشرات والإحصائيات</p></div>
                        </Link>
                    </SecureAction>

                    <SecureAction module="accounts" action="view">
                        <Link href="/accounts" className="module-card">
                            <div className="module-icon">🏦</div>
                            <div><h3 className="module-title">دليل الحسابات</h3><p className="module-desc">إدارة شجرة الحسابات المالية</p></div>
                        </Link>
                    </SecureAction>

                    <SecureAction module="projects" action="view">
                        <Link href="/projects" className="module-card">
                            <div className="module-icon">🏗️</div>
                            <div><h3 className="module-title">المشاريع</h3><p className="module-desc">متابعة المشاريع والتكاليف</p></div>
                        </Link>
                    </SecureAction>

                    <SecureAction module="journal" action="view">
                        <Link href="/journal" className="module-card">
                            <div className="module-icon">📓</div>
                            <div><h3 className="module-title">دفتر اليومية</h3><p className="module-desc">القيود المحاسبية الشاملة</p></div>
                        </Link>
                    </SecureAction>

                    <SecureAction module="partners" action="view">
                        <Link href="/partners" className="module-card">
                            <div className="module-icon">🤝</div>
                            <div><h3 className="module-title">الشركاء</h3><p className="module-desc">إدارة المقاولين والموردين</p></div>
                        </Link>
                    </SecureAction>

                    <SecureAction module="team" action="view">
                        <Link href="/team" className="module-card">
                            <div className="module-icon">👥</div>
                            <div><h3 className="module-title">إدارة الفريق</h3><p className="module-desc">الصلاحيات والمستخدمين</p></div>
                        </Link>
                    </SecureAction>

                    <SecureAction module="settings" action="view">
                        <Link href="/settings" className="module-card">
                            <div className="module-icon">⚙️</div>
                            <div><h3 className="module-title">إعدادات النظام</h3><p className="module-desc">النسخ الاحتياطي والصيانة</p></div>
                        </Link>
                    </SecureAction>

                </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 700, fontSize: '13px', paddingBottom: '10px' }}>
                تم تأمين الجلسة الخاصة بك 🔒 | رواسي اليسر © {new Date().getFullYear()}
            </div>
        </div>
    );
}