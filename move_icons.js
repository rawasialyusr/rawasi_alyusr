const fs = require('fs');
const path = 'C:/MyProjects/my-accounting-app/components/MasterPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove the icons from next to the card
const iconsBlockRegex = /<div style={{ display: 'flex', gap: '15px', paddingRight: '15px', paddingLeft: '15px', alignItems: 'center' }}>[\s\S]*?<\/div>\s*<div className="imperial-trigger"/;
content = content.replace(iconsBlockRegex, '<div className="imperial-trigger"');

// 2. Add them inside supreme-dropdown
const oldDropdown = `<div className="supreme-dropdown" style={{ top: coords.top, left: coords.left }} onClick={(e) => e.stopPropagation()}>`;
const newDropdown = `<div className="supreme-dropdown" style={{ top: coords.top, left: coords.left }} onClick={(e) => e.stopPropagation()}>
            <div className="drop-item" onClick={() => { setIsNotificationsOpen(true); setIsMenuOpen(false); }}>
                <span>🔔</span> الإشعارات
                {unread_notifications > 0 && <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>{unread_notifications}</span>}
            </div>
            <div className="drop-item" onClick={() => { router.push('/messages'); setIsMenuOpen(false); }}>
                <span>✉️</span> الرسائل
                {unread_messages > 0 && <span style={{ marginLeft: 'auto', background: '#3b82f6', color: 'white', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>{unread_messages}</span>}
            </div>
            <div style={{ height: '1px', background: '#e2e8f0', margin: '5px 0' }}></div>`;

content = content.replace(oldDropdown, newDropdown);

fs.writeFileSync(path, content, 'utf8');
console.log("Updated MasterPage.tsx to move icons into dropdown");
