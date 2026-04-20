"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useProfileLogic } from './profile_logic';
import { formatCurrency, formatDate } from '@/lib/helpers';
import SignaturePad from '@/components/signaturepad';
import RawasiSmartTable from '@/components/rawasismarttable';
import { useSidebar } from '@/lib/SidebarContext'; 
import { THEME } from '@/lib/theme'; 

export default function EmployeeProfilePage() {
    const { 
        isLoading, isSaving, userProfile, partnerData, financials, 
        recentLogs, recentAdvances, recentDeductions, filteredLogs,
        tasks, notifications, monthlyKPIs, userRequests,
        filteredData, rangeKPIs, 
        activeTab, setActiveTab, refreshProfile, searchFilters, setSearchFilters,
        updateProfileInfo, uploadAvatar, submitTaskUpdate, createRequest, markAllNotificationsAsRead
    } = useProfileLogic();

    const [isPinned, setIsPinned] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const isSidebarOpen = isPinned || isHovered;

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [failingTaskId, setFailingTaskId] = useState<string | null>(null);
    const [failNote, setFailNote] = useState("");
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [newRequest, setNewRequest] = useState({ type: 'objection', category: 'wage', subject: '', details: '' });

    const { setSidebarContent } = useSidebar(); 

    // 🚀 المتغيرات الآمنة عشان الـ useEffect ما يعملش Loop
    const totalProd = monthlyKPIs?.totalProduction || 0;
    const pTasks = (tasks || []).filter((t:any) => t.status !== 'completed').length;
    const pReqs = (userRequests || []).filter((r:any) => r.status === 'pending').length;
    const nBal = rangeKPIs?.netBalance || 0;

    // 🚀 2. "تجميد" محتوى السايد بار في الذاكرة (منع إعادة التوليد)
    const currentSidebarContent = useMemo(() => {
        let currentSummary = null;
        let currentActions = null;

        switch (activeTab) {
            case 'tasks':
                currentSummary = (
                    <div style={{ background: 'rgba(220, 38, 38, 0.1)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(220, 38, 38, 0.3)', textAlign: 'center' }}>
                        <div style={{ fontSize: '30px', marginBottom: '10px' }}>⏳</div>
                        <p style={{ margin: 0, fontSize: '13px', color: THEME.danger || '#be123c', fontWeight: 900 }}>مهام قيد التنفيذ</p>
                        <h3 style={{ margin: '5px 0 0 0', fontWeight: 900, fontSize: '28px', color: 'white' }}>{pTasks} <small style={{fontSize:'12px'}}>مهمة</small></h3>
                    </div>
                );
                currentActions = (
                    <button className="rawasi-action-btn" onClick={() => window.print()}><span>🖨️</span><span>طباعة المهام</span></button>
                );
                break;

            case 'requests':
                currentSummary = (
                    <div style={{ background: 'rgba(197, 160, 89, 0.1)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(197, 160, 89, 0.3)', textAlign: 'center' }}>
                        <div style={{ fontSize: '30px', marginBottom: '10px' }}>📨</div>
                        <p style={{ margin: 0, fontSize: '13px', color: THEME.goldAccent, fontWeight: 900 }}>الطلبات المعلقة</p>
                        <h3 style={{ margin: '5px 0 0 0', fontWeight: 900, fontSize: '28px', color: 'white' }}>{pReqs} <small style={{fontSize:'12px'}}>طلب</small></h3>
                    </div>
                );
                currentActions = (
                    <>
                        <button className="rawasi-action-btn" onClick={() => window.dispatchEvent(new CustomEvent('openRequestsTab'))}><span>➕</span><span>طلب جديد</span></button>
                        <button className="rawasi-action-btn" onClick={() => window.print()}><span>🖨️</span><span>طباعة السجل</span></button>
                    </>
                );
                break;

            case 'statement':
            case 'daily_fin':
                currentSummary = (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
                        <div style={{ fontSize: '30px', marginBottom: '10px' }}>💰</div>
                        <p style={{ margin: 0, fontSize: '13px', color: THEME.success, fontWeight: 900 }}>صافي المستحقات</p>
                        <h3 style={{ margin: '5px 0 0 0', fontWeight: 900, fontSize: '22px', color: 'white' }}>{formatCurrency(nBal)}</h3>
                    </div>
                );
                currentActions = (
                    <button className="rawasi-action-btn" onClick={() => window.print()}><span>🖨️</span><span>طباعة الكشف</span></button>
                );
                break;

            default:
                currentSummary = (
                    <div style={{ background: 'rgba(197, 160, 89, 0.1)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(197, 160, 89, 0.3)', textAlign: 'center' }}>
                        <div style={{ fontSize: '30px', marginBottom: '10px' }}>🏗️</div>
                        <p style={{ margin: 0, fontSize: '13px', color: THEME.goldAccent, fontWeight: 900 }}>الإنتاجية المحققة</p>
                        <h3 style={{ margin: '5px 0 0 0', fontWeight: 900, fontSize: '28px', color: 'white' }}>{totalProd}</h3>
                    </div>
                );
                currentActions = (
                    <button className="rawasi-action-btn" onClick={() => window.print()}><span>📑</span><span>طباعة التقرير</span></button>
                );
                break;
        }

        return { summary: currentSummary, actions: currentActions };
    }, [activeTab, totalProd, pTasks, pReqs, nBal]); // المحتوى مش هيتغير إلا لو القيم دي اتغيرت فعلياً

    // 🚀 3. إرسال المحتوى للسايد بار (بدون تصفير Cleanup يسبب Loop)
    useEffect(() => {
        if (currentSidebarContent) {
            setSidebarContent(currentSidebarContent);
        }
        // 💡 ملحوظة: شلنا الـ return () => setSidebarContent(...) لأنها كانت سبب الـ Loop في الـ Layout الموحد
    }, [currentSidebarContent, setSidebarContent]);

    // 🚀 4. استقبال أوامر فتح التابات والبحث
    useEffect(() => {
        const hOpen = () => setActiveTab('requests');
        const hSearch = (e: any) => setSearchFilters((prev: any) => ({ ...prev, term: e.detail }));
        const hDate = (e: any) => setSearchFilters((prev: any) => ({ ...prev, startDate: e.detail.start, endDate: e.detail.end }));

        window.addEventListener('openRequestsTab', hOpen);
        window.addEventListener('globalSearch', hSearch);
        window.addEventListener('globalDateFilter', hDate);

        return () => {
            window.removeEventListener('openRequestsTab', hOpen);
            window.removeEventListener('globalSearch', hSearch);
            window.removeEventListener('globalDateFilter', hDate);
        };
    }, [setActiveTab, setSearchFilters]);

    const combinedStatement = useMemo(() => {
        const advBase = filteredData?.advances || [];
        const dedBase = filteredData?.deductions || [];
        const logsBase = filteredData?.logs || [];

        const advances = advBase.map((a: any) => ({ ...a, dType: 'سحب سلفة', color: THEME.goldAccent, sign: '-' }));
        const deductions = dedBase.map((d: any) => ({ ...d, dType: 'خصم مخالفة', color: THEME.danger || '#be123c', sign: '-' }));
        const logs = logsBase.map((l: any) => ({ ...l, dType: 'يومية عمل', color: THEME.success, sign: '+', amount: l.daily_wage || l.D_W }));
        
        return [...advances, ...deductions, ...logs].sort((a, b) => 
            new Date(b.date || b.work_date || b.created_at).getTime() - new Date(a.date || a.work_date || a.created_at).getTime()
        );
    }, [filteredData]);

    if (isLoading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'transparent', fontWeight: 900, color: THEME.coffeeDark }}>⏳ جاري تحميل معايير رواسي الذكية...</div>;

    const displayName = userProfile?.display_name || userProfile?.full_name || userProfile?.nickname || 'موظف رواسي';
    const profession = userProfile?.profession || 'المسمى الوظيفي غير محدد';
    const usernamePhone = userProfile?.username || userProfile?.phone_number || '---';
    const avatarImg = userProfile?.avatar || userProfile?.avatar_url;

    return (
        <div style={{ minHeight: '100vh', direction: 'rtl', fontFamily: "'Cairo', sans-serif", background: 'transparent', padding: '40px 50px' }}>
            
            <style>{`
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(12px); display: flex; justify-content: center; align-items: center; z-index: 2000; animation: fadeIn 0.3s ease; }
                .modal-box { background: rgba(255,255,255,0.9); backdrop-filter: blur(15px); width: 600px; padding: 40px; border-radius: 35px; border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 25px 50px rgba(0,0,0,0.2); position: relative; max-height: 90vh; overflow-y: auto; }
                .sidebar-input { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; margin-bottom: 20px; outline: none; font-size: 13px; transition: 0.3s; }
                .sidebar-input:focus { border-color: ${THEME.goldAccent}; background: rgba(197, 160, 89, 0.05); }
                .tab-btn { padding: 18px 25px; border: none; background: transparent; font-size: 14px; font-weight: 900; color: #94a3b8; cursor: pointer; border-bottom: 4px solid transparent; transition: 0.3s; white-space: nowrap; }
                .tab-btn.active { color: ${THEME.coffeeDark}; border-bottom-color: ${THEME.goldAccent}; background: rgba(255,255,255,0.6); }
                .card-base { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.4); border-radius: 35px; box-shadow: 0 10px 40px rgba(140, 106, 93, 0.08); overflow: hidden; margin-bottom: 30px; }
                .summary-card { background: rgba(67, 52, 46, 0.9); backdrop-filter: blur(10px); color: white; padding: 25px; border-radius: 25px; display: flex; justify-content: space-around; margin-bottom: 30px; border: 1px solid rgba(197, 160, 89, 0.5); box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                .policy-paper { background: rgba(252, 250, 248, 0.85); backdrop-filter: blur(10px); padding: 45px; border-radius: 25px; border: 1px solid rgba(230, 213, 195, 0.5); line-height: 1.8; position: relative; color: ${THEME.coffeeDark}; }
                .policy-paper::after { content: 'RYC'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 150px; color: rgba(0,0,0,0.02); pointer-events: none; }
                .request-card { background: rgba(255,255,255,0.8); padding: 20px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.5); border-right: 6px solid ${THEME.goldAccent}; transition: 0.3s; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
                .request-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.05); }
                .btn-primary { background: ${THEME.goldAccent}; color: white; border: none; padding: 12px 25px; border-radius: 12px; font-weight: 900; cursor: pointer; transition: 0.3s; }
                .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(197, 160, 89, 0.3); }
                .status-badge { padding: 6px 15px; border-radius: 20px; font-size: 11px; font-weight: 900; }
                .animate-fade-in { animation: fadeIn 0.4s ease forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', border: `3px solid ${THEME.goldAccent}`, overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                        {avatarImg ? <img src={avatarImg} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="Avatar" /> : <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px'}}>👤</div>}
                    </div>
                    <div>
                        <h1 style={{ margin: 0, color: THEME.coffeeDark, fontWeight: 900, fontSize: '28px' }}>مرحباً، {displayName} 🏗️</h1>
                        <p style={{ margin: '5px 0 8px 0', color: THEME.goldAccent, fontSize: '16px', fontWeight: 900 }}>{profession}</p>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                            <span style={{ fontWeight: 900 }}>🆔 اسم المستخدم (الجوال): </span>
                            <code style={{ background: 'rgba(255,255,255,0.6)', padding: '3px 8px', borderRadius: '5px', fontWeight: 900, border: '1px solid rgba(0,0,0,0.1)' }}>
                                {usernamePhone}
                            </code>
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '15px' }}>
                    <button onClick={() => setIsSettingsOpen(true)} style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.5)', padding: '12px 25px', borderRadius: '15px', fontWeight: 900, cursor: 'pointer', color: THEME.coffeeDark, transition: '0.3s' }}>⚙️ الإعدادات</button>
                    <div onClick={markAllNotificationsAsRead} style={{ position: 'relative', background: 'rgba(67, 52, 46, 0.85)', backdropFilter: 'blur(10px)', color: 'white', padding: '12px 20px', borderRadius: '15px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}>
                        🔔 {(notifications || []).length > 0 && <span style={{ position: 'absolute', top: '-5px', left: '-5px', background: THEME.danger || '#be123c', color: 'white', fontSize: '10px', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', fontWeight: 900 }}>{notifications.length}</span>}
                    </div>
                </div>
            </div>

            <div className="card-base">
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.4)', overflowX: 'auto' }}>
                    <button className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>📋 المهام</button>
                    <button className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>📑 تقرير العمل والإنتاجية</button>
                    <button className={`tab-btn ${activeTab === 'daily_fin' ? 'active' : ''}`} onClick={() => setActiveTab('daily_fin')}>💰 التقرير المالي</button>
                    <button className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>⚖️ الطلبات والاعتراضات</button>
                    <button className={`tab-btn ${activeTab === 'statement' ? 'active' : ''}`} onClick={() => setActiveTab('statement')}>🧾 كشف الحساب</button>
                    <button className={`tab-btn ${activeTab === 'kpi' ? 'active' : ''}`} onClick={() => setActiveTab('kpi')}>📊 التقييم الشهري</button>
                    <button className={`tab-btn ${activeTab === 'policy' ? 'active' : ''}`} onClick={() => setActiveTab('policy')}>📜 اللائحة</button>
                </div>

                <div style={{ padding: '45px' }}>
                    {activeTab === 'tasks' && (
                        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '35px' }}>
                            <div>
                                <h3 style={{ color: THEME.danger || '#be123c', borderRight: `6px solid ${THEME.danger || '#be123c'}`, paddingRight: '15px', marginBottom: '25px' }}>⏳ مهام قيد التنفيذ</h3>
                                {(tasks || []).filter((t:any) => t.status !== 'completed').map((task: any) => (
                                    <div key={task.id} className="request-card" style={{ borderRightColor: THEME.goldAccent, padding: '25px' }}>
                                        <h4 style={{ margin: 0, fontSize: '18px', color: THEME.coffeeDark }}>{task.title}</h4>
                                        <p style={{ fontSize: '14px', color: '#64748b', margin: '10px 0' }}>{task.description}</p>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={() => submitTaskUpdate(task.id, 'completed')} className="btn-primary" style={{ background: THEME.success, padding: '8px 20px' }}>تم الإنجاز ✅</button>
                                            <button onClick={() => setFailingTaskId(task.id)} className="btn-primary" style={{ background: THEME.danger || '#be123c', padding: '8px 20px' }}>لم يتم</button>
                                        </div>
                                        {failingTaskId === task.id && (
                                            <div className="animate-fade-in" style={{ marginTop: '20px' }}>
                                                <textarea style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', outline: 'none', background: 'rgba(255,255,255,0.9)' }} placeholder="اذكر العائق الفني أو السبب بوضوح..." onChange={(e) => setFailNote(e.target.value)} />
                                                <button onClick={() => submitTaskUpdate(task.id, 'failed', failNote).then(() => setFailingTaskId(null))} className="btn-primary" style={{ marginTop: '10px', width: '100%' }}>إرسال التقرير للإدارة</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {(tasks || []).filter((t:any) => t.status !== 'completed').length === 0 && <p style={{color:'#94a3b8', textAlign:'center', padding: '20px', background: 'rgba(255,255,255,0.5)', borderRadius: '15px'}}>لا توجد مهام قيد التنفيذ حالياً.</p>}
                            </div>
                            <div>
                                <h3 style={{ color: THEME.success, borderRight: `6px solid ${THEME.success}`, paddingRight: '15px', marginBottom: '25px' }}>✅ المهام المكتملة</h3>
                                {(tasks || []).filter((t:any) => t.status === 'completed').map((task: any) => (
                                    <div key={task.id} className="request-card" style={{ borderRightColor: THEME.success, opacity: 0.65 }}>
                                        <h4 style={{ margin: 0, textDecoration: 'line-through', color: THEME.coffeeDark }}>{task.title}</h4>
                                        <p style={{ fontSize: '12px', marginTop: '8px', fontWeight: 700 }}>تاريخ الإنجاز: {formatDate(task.updated_at)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'report' && (
                         <div className="animate-fade-in">
                            <RawasiSmartTable 
                                title="📑 أرشيف يوميات العمل والإنتاجية (مفلتر)"
                                fileName={`WorkReport_${displayName}`}
                                data={filteredData?.logs || []}
                                columns={[
                                    { header: 'التاريخ', accessor: 'work_date', render: (val, row) => `📅 ${formatDate(val || row.Date)}` },
                                    { header: 'الموقع والبند', accessor: 'site_ref', render: (val, row) => <div style={{ fontWeight: 900, color: THEME.coffeeDark }}>{val || row.Site} <span style={{fontSize:'12px', color:THEME.goldAccent, display:'block'}}>{row.work_item || row.Item}</span></div> },
                                    { header: 'الإنتاجية', accessor: 'daily_production', render: (val, row) => <span style={{ fontWeight: 900, color: THEME.coffeeDark }}>📦 {val || row.Prod || 0} وحدة</span> },
                                    { header: 'الأجر المسجل', accessor: 'daily_wage', render: (val, row) => <span style={{ fontWeight: 900, color: THEME.success }}>{formatCurrency(val || row.D_W)}</span> }
                                ]}
                            />
                        </div>
                    )}

                    {activeTab === 'daily_fin' && (
                         <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div style={{ background: 'rgba(252, 248, 241, 0.8)', backdropFilter: 'blur(10px)', padding: '30px', borderRadius: '25px', border: `1px solid ${THEME.goldAccent}` }}>
                                <h4 style={{ color: THEME.goldAccent, margin: '0 0 20px 0', fontSize: '18px' }}>💵 آخر السحوبات (سلف)</h4>
                                {(recentAdvances || []).slice(0, 5).map((a: any) => <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px dashed rgba(197, 160, 89, 0.3)', color: THEME.coffeeDark }}><span>{formatDate(a.date)}</span><span style={{ fontWeight: 900 }}>{formatCurrency(a.amount)}</span></div>)}
                            </div>
                            <div style={{ background: 'rgba(255, 241, 242, 0.8)', backdropFilter: 'blur(10px)', padding: '30px', borderRadius: '25px', border: `1px solid ${THEME.danger || '#be123c'}` }}>
                                <h4 style={{ color: THEME.danger || '#be123c', margin: '0 0 20px 0', fontSize: '18px' }}>✂️ آخر الخصومات</h4>
                                {(recentDeductions || []).slice(0, 5).map((d: any) => <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px dashed rgba(190, 18, 60, 0.3)', color: THEME.coffeeDark }}><span>{formatDate(d.date)}</span><span style={{ fontWeight: 900 }}>{formatCurrency(d.amount)}</span></div>)}
                            </div>
                        </div>
                    )}

                    {activeTab === 'requests' && (
                         <div className="animate-fade-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <h3 style={{ margin: 0, color: THEME.coffeeDark }}>الطلبات والاعتراضات الرسمية</h3>
                                <button onClick={() => setShowRequestForm(true)} className="btn-primary">➕ تقديم طلب جديد</button>
                            </div>
                            {showRequestForm ? (
                                <div className="animate-fade-in" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', padding: '35px', borderRadius: '25px', border: `1px solid rgba(255,255,255,0.5)` }}>
                                    <h4 style={{marginTop:0, marginBottom:'20px', color: THEME.coffeeDark}}>تعبئة بيانات الطلب</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 900, display: 'block', marginBottom: '8px', color: THEME.coffeeDark }}>نوع الطلب</label>
                                            <select className="sidebar-input" style={{ color: 'black', background: 'white', border: '1px solid #ddd' }} onChange={(e) => setNewRequest({...newRequest, type: e.target.value})}>
                                                <option value="objection">🛑 اعتراض على (يومية/خصم/سلفة)</option>
                                                <option value="request">📨 طلب إداري (إجازة/عهدة/شهادة)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 900, display: 'block', marginBottom: '8px', color: THEME.coffeeDark }}>التصنيف</label>
                                            <select className="sidebar-input" style={{ color: 'black', background: 'white', border: '1px solid #ddd' }} onChange={(e) => setNewRequest({...newRequest, category: e.target.value})}>
                                                <option value="wage">الأجور واليوميات</option>
                                                <option value="deduction">الخصومات والجزاءات</option>
                                                <option value="advance">السلف المالية</option>
                                                <option value="leave">الإجازات والغياب</option>
                                            </select>
                                        </div>
                                    </div>
                                    <input className="sidebar-input" style={{color:'black', border:'1px solid #ddd', marginBottom:'20px', background:'white'}} placeholder="عنوان الموضوع (مثلاً: اعتراض على خصم يومية)..." onChange={(e) => setNewRequest({...newRequest, subject: e.target.value})} />
                                    <textarea className="sidebar-input" style={{color:'black', border:'1px solid #ddd', height:'100px', width:'100%', padding:'12px', borderRadius:'10px', marginBottom:'20px', background:'white'}} placeholder="اشرح التفاصيل أو المبررات هنا..." onChange={(e) => setNewRequest({...newRequest, details: e.target.value})} />
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <button onClick={() => createRequest(newRequest).then(() => setShowRequestForm(false))} className="btn-primary" style={{ flex: 2 }}>إرسال الطلب للإدارة 🚀</button>
                                        <button onClick={() => setShowRequestForm(false)} style={{ flex: 1, background:'rgba(0,0,0,0.05)', border:'none', padding:'15px', borderRadius:'15px', fontWeight:900, cursor:'pointer', color: THEME.coffeeDark }}>إلغاء</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: '20px' }}>
                                    {(userRequests || []).map((req: any) => (
                                        <div key={req.id} className="request-card" style={{ borderRightColor: req.type === 'objection' ? THEME.danger || '#be123c' : THEME.goldAccent }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                                        <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.05)', padding: '3px 8px', borderRadius: '5px', fontWeight: 900, color: THEME.coffeeDark }}>{req.category === 'wage' ? '💰 أجور' : req.category === 'leave' ? '📅 إجازات' : '⚙️ أخرى'}</span>
                                                        <h4 style={{ margin: 0, fontSize: '17px', color: THEME.coffeeDark }}>{req.subject}</h4>
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b', marginTop: '10px' }}>{req.details}</p>
                                                    <div style={{ fontSize: '11px', marginTop: '10px', opacity: 0.5, color: THEME.coffeeDark }}>تاريخ التقديم: {formatDate(req.created_at)}</div>
                                                </div>
                                                <span className="status-badge" style={{ background: req.status === 'approved' ? '#dcfce7' : req.status === 'rejected' ? '#ffe4e6' : '#fef3c7', color: req.status === 'approved' ? THEME.success : req.status === 'rejected' ? THEME.danger || '#be123c' : '#b45309', padding: '6px 15px' }}>
                                                    {req.status === 'pending' ? '⏳ قيد المراجعة' : req.status === 'approved' ? '✅ تم القبول' : '❌ مرفوض'}
                                                </span>
                                            </div>
                                            {req.admin_note && (
                                                <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', fontSize: '13px', color: THEME.coffeeDark }}>
                                                    <strong>💬 رد الإدارة:</strong> {req.admin_note}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {(userRequests || []).length === 0 && <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8', background: 'rgba(255,255,255,0.5)', borderRadius: '20px' }}>لا توجد طلبات أو اعتراضات سابقة.</div>}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'statement' && (
                        <div className="animate-fade-in">
                            <div className="summary-card">
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 900 }}>أيام العمل</div>
                                    <div style={{ fontSize: '26px', fontWeight: 900, color: THEME.goldAccent }}>{rangeKPIs?.workDays || 0}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 900 }}>إجمالي المستحقات</div>
                                    <div style={{ fontSize: '26px', fontWeight: 900, color: '#4ade80' }}>{formatCurrency(rangeKPIs?.totalWages || 0)}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 900 }}>إجمالي الخصوم</div>
                                    <div style={{ fontSize: '26px', fontWeight: 900, color: '#f87171' }}>{formatCurrency(rangeKPIs?.totalDeductions || 0)}</div>
                                </div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '25px' }}>
                                    <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 900 }}>صافي المستحقات (للفترة)</div>
                                    <div style={{ fontSize: '26px', fontWeight: 900 }}>{formatCurrency(rangeKPIs?.netBalance || 0)}</div>
                                </div>
                            </div>

                            <RawasiSmartTable 
                                title="🧾 كشف الحساب التفصيلي"
                                fileName={`AccountStatement_${displayName}`}
                                data={combinedStatement || []}
                                columns={[
                                    { header: 'التاريخ', accessor: 'date', render: (val, row) => formatDate(val || row.work_date || row.created_at) },
                                    { header: 'العملية', accessor: 'dType', render: (val, row) => <span style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 900, background: row.color + '15', color: row.color }}>{val}</span> },
                                    { header: 'البيان / الموقع', accessor: 'note', render: (val, row) => row.site_ref || row.note || row.reason || '---' },
                                    { header: 'المبلغ', accessor: 'amount', render: (val, row) => <span style={{ fontWeight: 900, color: row.color }}>{row.sign} {formatCurrency(val)}</span> }
                                ]}
                            />
                        </div>
                    )}

                    {activeTab === 'kpi' && (
                        <div className="animate-fade-in">
                            <h3 style={{ marginTop: 0, marginBottom: '25px', color: THEME.coffeeDark }}>📊 تقييم أداء شهر {monthlyKPIs?.monthName || ''}</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', padding: '25px', borderRadius: '20px', textAlign: 'center', border: `2px solid ${THEME.success}`, boxShadow: '0 5px 15px rgba(0,0,0,0.02)' }}>
                                    <div style={{ fontSize: '45px' }}>📈</div><h2 style={{ margin: '10px 0', color: THEME.success, fontSize: '32px' }}>{monthlyKPIs?.attendanceRate || 0}%</h2>
                                    <p style={{ margin: 0, fontWeight: 900, color: '#64748b' }}>نسبة الالتزام بالحضور</p>
                                    <span style={{ fontSize: '12px', color: THEME.coffeeDark }}>تم تسجيل {monthlyKPIs?.daysWorked || 0} يوم عمل</span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', padding: '25px', borderRadius: '20px', textAlign: 'center', border: `2px solid ${THEME.goldAccent}`, boxShadow: '0 5px 15px rgba(0,0,0,0.02)' }}>
                                    <div style={{ fontSize: '45px' }}>🏗️</div><h2 style={{ margin: '10px 0', color: THEME.goldAccent, fontSize: '32px' }}>{monthlyKPIs?.totalProduction || 0}</h2>
                                    <p style={{ margin: 0, fontWeight: 900, color: '#64748b' }}>إجمالي الإنتاجية</p>
                                    <span style={{ fontSize: '12px', color: THEME.coffeeDark }}>وحدات / أمتار محققة</span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', padding: '25px', borderRadius: '20px', textAlign: 'center', border: `2px solid ${THEME.coffeeDark}`, boxShadow: '0 5px 15px rgba(0,0,0,0.02)' }}>
                                    <div style={{ fontSize: '45px' }}>💰</div><h2 style={{ margin: '10px 0', color: THEME.coffeeDark, fontSize: '28px' }}>{formatCurrency(monthlyKPIs?.totalEarnings || 0)}</h2>
                                    <p style={{ margin: 0, fontWeight: 900, color: '#64748b' }}>إجمالي المستحقات</p>
                                    <span style={{ fontSize: '12px', color: THEME.coffeeDark }}>قبل تصفية الحساب</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'policy' && (
                        <div className="animate-fade-in">
                            <div className="policy-paper">
                                <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: `3px double ${THEME.goldAccent}`, paddingBottom: '25px' }}>
                                    <h2 style={{ margin: '0 0 5px 0', fontWeight: 900, fontSize: '24px' }}>لائحة تنظيم العمل والإنتاجية</h2>
                                    <h4 style={{ margin: 0, color: THEME.goldAccent }}>شركة رواسي اليسر للمقاولات العامة</h4>
                                    <p style={{ fontSize: '12px', marginTop: '10px', color: '#64748b' }}>مُصاغة وفقاً لنظام العمل السعودي الجديد</p>
                                </div>
                                <div style={{ display: 'grid', gap: '30px', position: 'relative', zIndex: 1 }}>
                                    <section>
                                        <h4 style={{ color: THEME.goldAccent, borderRight: `4px solid ${THEME.goldAccent}`, paddingRight: '12px', marginBottom: '15px' }}>📌 ساعات العمل والحضور</h4>
                                        <ul style={{ paddingRight: '20px' }}>
                                            <li>ساعات العمل الفعلية هي (8) ساعات. يبدأ الدوام من الساعة **5:00 صباحاً**.</li>
                                            <li>يُثبت الحضور حصراً عبر النظام الرقمي في الموقع الجغرافي للمشروع.</li>
                                        </ul>
                                    </section>
                                    <section style={{ background: 'rgba(197, 160, 89, 0.04)', padding: '20px', borderRadius: '15px' }}>
                                        <h4 style={{ color: THEME.goldAccent, borderRight: `4px solid ${THEME.goldAccent}`, paddingRight: '12px', marginBottom: '15px' }}>👷 نظام العمالة والإنتاجية</h4>
                                        <ul style={{ paddingRight: '20px' }}>
                                            <li>لا تُعتمد اليومية كاملة إلا بتحقيق "الحد الأدنى للإنتاج" المتفق عليه.</li>
                                            <li>في حال رفض الجودة من المهندس، يلتزم العامل بالإعادة على نفقته الخاصة.</li>
                                        </ul>
                                    </section>
                                    <section style={{ border: `1px solid rgba(0,0,0,0.1)`, padding: '20px', borderRadius: '15px' }}>
                                        <h4 style={{ color: THEME.coffeeDark, borderRight: `4px solid ${THEME.coffeeDark}`, paddingRight: '12px', marginBottom: '15px' }}>🏗️ ضوابط المقاولين</h4>
                                        <ul style={{ paddingRight: '20px' }}>
                                            <li>المقاول مسؤول عن تابعيه وتوفير معدات السلامة (PPE) وفق المادة 121.</li>
                                            <li>أي تأخير عن الجدول الزمني يترتب عليه غرامات تُخصم من المستخلص.</li>
                                        </ul>
                                    </section>
                                    <div style={{ marginTop: '20px', padding: '20px', background: THEME.coffeeDark, color: 'white', borderRadius: '15px', textAlign: 'center', fontSize: '13px' }}>
                                        "استخدامك لهذا النظام يُعد إقراراً بالموافقة على بنود اللائحة، وتعتبر توقيعاً ملزماً."
                                    </div>
                                </div>
                                <div style={{ marginTop: '40px', textAlign: 'center' }}>
                                    <button onClick={() => window.print()} className="btn-primary">🖨️ طباعة النسخة الرسمية</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 🚀 ⚙️ Glass Modal الإعدادات */}
            {isSettingsOpen && (
                <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setIsSettingsOpen(false)} style={{ position: 'absolute', top: '25px', left: '25px', background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                        <h2 style={{ marginTop: 0, marginBottom: '35px', color: THEME.coffeeDark, fontWeight: 900, textAlign: 'center', borderBottom: `3px solid ${THEME.goldAccent}`, paddingBottom: '10px', display:'inline-block' }}>⚙️ إعدادات الملف الشخصي</h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ width: '130px', height: '130px', borderRadius: '50%', background: THEME.coffeeDark, margin: '0 auto 20px', border: `5px solid ${THEME.goldAccent}`, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
                                    {avatarImg ? <img src={avatarImg} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="Avatar" /> : <span style={{fontSize:'50px', lineHeight: '120px', color:'white'}}>👤</span>}
                                </div>
                                <input type="file" id="modalFile" hidden accept="image/*" onChange={(e) => e.target.files && uploadAvatar(e.target.files[0])} />
                                <label htmlFor="modalFile" style={{ cursor: 'pointer', color: THEME.goldAccent, fontWeight: 900, fontSize: '14px', background:'rgba(0,0,0,0.03)', padding:'12px 30px', borderRadius:'12px', border:`1px solid rgba(0,0,0,0.1)` }}>{isSaving ? '⏳ جاري الرفع...' : '📸 تغيير الصورة الشخصية'}</label>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 900, color: THEME.coffeeDark, marginBottom: '10px' }}>الاسم المسجل (لا يمكن تعديله)</label>
                                    <input className="sidebar-input" style={{color:'#64748b', border:'1px solid #ddd', background:'#f8fafc', marginBottom:0, cursor:'not-allowed'}} value={displayName} readOnly title="لتعديل الاسم، تواصل مع الموارد البشرية" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 900, color: THEME.coffeeDark, marginBottom: '10px' }}>رقم الجوال (اسم المستخدم)</label>
                                    <input className="sidebar-input" style={{color:'#64748b', border:'1px solid #ddd', background:'#f8fafc', marginBottom:0, cursor:'not-allowed'}} value={usernamePhone} readOnly title="لتعديل الجوال، تواصل مع الموارد البشرية" />
                                </div>
                            </div>
                            
                            <div style={{ borderTop: '2px dashed #eee', paddingTop: '30px' }}>
                                <h4 style={{ color: THEME.coffeeDark, fontWeight: 900, marginBottom: '20px', textAlign: 'center' }}>✍️ تحديث التوقيع الرقمي المعتمد</h4>
                                <div style={{ border: `1px solid rgba(0,0,0,0.1)`, borderRadius: '15px', overflow: 'hidden' }}>
                                    <SignaturePad userId={userProfile?.id} currentSignature={userProfile?.signature_url} onSaved={refreshProfile} />
                                </div>
                            </div>
                            
                            <button onClick={() => setIsSettingsOpen(false)} className="btn-primary" style={{width:'100%', padding: '18px', fontSize: '16px', borderRadius: '15px'}}>إغلاق النافذة</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}