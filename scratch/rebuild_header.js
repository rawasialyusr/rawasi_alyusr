const fs = require('fs');

function rebuildHeader() {
    let content = fs.readFileSync('components/MasterPage.tsx', 'utf8');

    // 1. Remove the old messy CSS overrides for mobile header if any
    content = content.replace(/\/\* 📱 🚀 التعديل السحري للموبايل.*?\n        \}/s, `/* 📱 🚀 التعديل السحري للموبايل (Fullscreen Edge-to-Edge) */
        @media (max-width: 768px) {
          .header-divider { display: none; }
          .clean-page { padding: 0 !important; margin: 0 !important; width: 100% !important; }
          .master-header { 
              padding: 12px 15px !important; 
              margin-bottom: 0 !important; 
              border-radius: 0 0 20px 20px !important;
              flex-wrap: nowrap !important;
          }
          .header-icon { width: 40px !important; height: 40px !important; min-width: 40px !important; border-radius: 10px !important; }
          .header-icon span { font-size: 20px !important; }
          .title-area { gap: 8px !important; }
          .title-area h1 { font-size: 16px !important; max-width: 130px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .title-area p { display: none !important; }
          
          .header-side { gap: 10px !important; }
          .header-actions { border: none !important; padding: 0 !important; flex-direction: row !important; gap: 8px !important; }
          .nav-btn, .msg-btn { width: 40px !important; height: 40px !important; font-size: 20px !important; border-radius: 10px !important; }
          .nav-group { display: none !important; }
          
          .glass-container { padding: 15px 10px !important; border-radius: 0 !important; border: none !important; box-shadow: none !important; min-height: calc(100vh - 65px); }
          .u-info-text { display: none; }
          .imperial-trigger { padding: 0; background: transparent; border: none; box-shadow: none; }
          .imperial-trigger:hover { transform: none; box-shadow: none; border: none; }
          .avatar-frame { width: 55px; height: 55px; } 
        }`);

    // Let's also fix any duplicate or old extra CSS we added in the previous step
    content = content.replace(/\.title-area { gap: 10px !important; }.*?\/\* Hide user info on tiny mobile screens completely from header \*\//s, '');


    // 2. Rewrite the header JSX to be clean and predictable
    const newHeaderJsx = `<header className="master-header" style={{
            padding: '20px 25px', 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.8)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '15px',
            flexWrap: 'nowrap'
      }}>
        {/* Right side: Large Icon and Title */}
        <div className="title-area" style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: 0 }}>
          <div className="header-icon" style={{ 
            width: '70px', height: '70px', borderRadius: '22px', minWidth: '70px',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(15, 23, 42, 0.3)'
          }}>
            <span style={{ fontSize: '32px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{icon || '✨'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
              <p style={{ margin: 0, fontSize: '15px', color: '#64748b', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle || 'نظام رواسي لإدارة الموارد المؤسسية'}</p>
          </div>
        </div>

        {/* Left side: Header Content, Notifications, Navigation */}
        <div className="header-side" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
          {headerContent}
          
          <div className="header-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', borderRight: '2px solid rgba(0,0,0,0.05)', paddingRight: '20px' }}>
             {/* Top: Notifications & Messages */}
             <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                 <button className="msg-btn" onClick={() => setIsNotificationsOpen(true)} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', position: 'relative', fontSize: '24px', transition: 'all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)', width: '45px', height: '45px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
                     🔔
                     {unread_notifications > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', fontSize: '12px', minWidth: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 8px rgba(239, 68, 68, 0.5)', fontWeight: 900, border: '2px solid white' }}>{unread_notifications}</span>}
                 </button>
                 <Link className="msg-btn" href="/messages" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', position: 'relative', textDecoration: 'none', fontSize: '24px', transition: 'all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)', width: '45px', height: '45px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
                     ✉️
                     {unread_messages > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#3b82f6', color: 'white', fontSize: '12px', minWidth: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 8px rgba(59, 130, 246, 0.5)', fontWeight: 900, border: '2px solid white' }}>{unread_messages}</span>}
                 </Link>
             </div>
             
             {/* Bottom: Back & Forward */}
             <div className="nav-group" style={{ display: 'flex', gap: '8px', margin: 0, padding: 0, border: 'none' }}>
                <button onClick={() => router.forward()} className="nav-btn-glass" title="تقدم للأمام" style={{ width: '45px', height: '35px', borderRadius: '10px', fontSize: '20px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button onClick={() => router.back()} className="nav-btn-glass" title="رجوع للخلف" style={{ width: '45px', height: '35px', borderRadius: '10px', fontSize: '20px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
             </div>
          </div>
        </div>
      </header>`;

    // Find everything from `<header className="master-header"` to `</header>` and replace it
    const headerRegex = /<header className="master-header"[\s\S]*?<\/header>/;
    content = content.replace(headerRegex, newHeaderJsx);

    fs.writeFileSync('components/MasterPage.tsx', content);
}

rebuildHeader();
