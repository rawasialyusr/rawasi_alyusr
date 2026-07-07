const fs = require('fs');

function restoreCard() {
    let content = fs.readFileSync('components/MasterPage.tsx', 'utf8');

    // 1. Remove the rule that completely hides the imperial trigger on mobile, 
    // instead just scale it down or hide its text.
    content = content.replace(
        '.imperial-trigger { display: none !important; } /* Hide user info on tiny mobile screens completely from header */',
        '.u-info-text { display: none !important; } .avatar-frame { width: 40px !important; height: 40px !important; } .imperial-trigger { padding: 0 !important; background: transparent !important; border: none !important; box-shadow: none !important; }'
    );

    // 2. Put the user card back into the JSX
    const userCardJsx = `
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
          
          {/* Avatar Card Restored */}
          <div className="imperial-trigger" ref={triggerRef} onClick={toggleMenu} style={{ flexShrink: 0 }}>
            <div className="u-info-text">
              <span className="u-name">{userProfile?.full_name || 'جاري التحميل...'}</span>
              <span className="u-role">
                {userProfile?.role === 'super_admin' ? 'مدير عام 👑' : 'مسؤول نظام 🛡️'}
              </span>
            </div>
            <div className="avatar-frame">
              <img src={userProfile?.avatar_url || \`https://ui-avatars.com/api/?name=\${userProfile?.full_name || 'U'}&background=C5A059&color=fff&bold=true\`} alt="Avatar" />
              <div className="active-dot"></div>
            </div>
          </div>
`;

    content = content.replace(
        /\{\/\* Bottom: Back & Forward \*\/\}[\s\S]*?<\/div>[\s\n]*<\/div>/,
        userCardJsx
    );

    fs.writeFileSync('components/MasterPage.tsx', content);
}

restoreCard();
