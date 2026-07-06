const fs = require('fs');
const path = 'C:/MyProjects/my-accounting-app/components/MasterPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove them from the dropdown
const dropdownItemToRemove = `            <div className="drop-item" onClick={() => { setIsNotificationsOpen(true); setIsMenuOpen(false); }}>
                <span>🔔</span> الإشعارات
                {unread_notifications > 0 && <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>{unread_notifications}</span>}
            </div>
            <div className="drop-item" onClick={() => { router.push('/messages'); setIsMenuOpen(false); }}>
                <span>✉️</span> الرسائل
                {unread_messages > 0 && <span style={{ marginLeft: 'auto', background: '#3b82f6', color: 'white', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>{unread_messages}</span>}
            </div>
            <div style={{ height: '1px', background: '#e2e8f0', margin: '5px 0' }}></div>`;

content = content.replace(dropdownItemToRemove, '');

// 2. Put them back outside the trigger, next to the name
const iconsString = `
          <div style={{ display: 'flex', gap: '15px', paddingRight: '15px', paddingLeft: '15px', alignItems: 'center' }}>
             <button onClick={() => setIsNotificationsOpen(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', textDecoration: 'none', fontSize: '22px', transition: '0.2s', opacity: 0.8 }} onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.8'}>
                 🔔
                 {unread_notifications > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)' }}>{unread_notifications}</span>}
             </button>
             <Link href="/messages" style={{ position: 'relative', textDecoration: 'none', fontSize: '22px', transition: '0.2s', opacity: 0.8 }} onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.8'}>
                 ✉️
                 {unread_messages > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#3b82f6', color: 'white', fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(59, 130, 246, 0.4)' }}>{unread_messages}</span>}
             </Link>
          </div>

          <div className="imperial-trigger" ref={triggerRef} onClick={toggleMenu}>
`;

content = content.replace('<div className="imperial-trigger" ref={triggerRef} onClick={toggleMenu}>', iconsString);

fs.writeFileSync(path, content, 'utf8');
console.log("Restored icons to the outside");
