const fs = require('fs');
const path = 'C:/MyProjects/my-accounting-app/components/MasterPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldIconsBlock = `<div style={{ display: 'flex', gap: '15px', paddingRight: '15px', paddingLeft: '15px', alignItems: 'center' }}>
             <button onClick={() => setIsNotificationsOpen(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', textDecoration: 'none', fontSize: '22px', transition: '0.2s', opacity: 0.8 }} onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.8'}>
                 🔔
                 {unread_notifications > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)' }}>{unread_notifications}</span>}
             </button>
             <Link href="/messages" style={{ position: 'relative', textDecoration: 'none', fontSize: '22px', transition: '0.2s', opacity: 0.8 }} onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.8'}>
                 ✉️
                 {unread_messages > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#3b82f6', color: 'white', fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(59, 130, 246, 0.4)' }}>{unread_messages}</span>}
             </Link>
          </div>`;

const newIconsBlock = `<div style={{ display: 'flex', gap: '12px', paddingRight: '20px', paddingLeft: '20px', alignItems: 'center', borderRight: '2px solid rgba(0,0,0,0.05)', marginRight: '10px' }}>
             <button onClick={() => setIsNotificationsOpen(true)} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', position: 'relative', textDecoration: 'none', fontSize: '24px', transition: 'all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)', opacity: 1, width: '45px', height: '45px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }} onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 15px rgba(0,0,0,0.08)'; }} onMouseOut={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 10px rgba(0,0,0,0.03)'; }}>
                 🔔
                 {unread_notifications > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', fontSize: '12px', minWidth: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 8px rgba(239, 68, 68, 0.5)', fontWeight: 900, border: '2px solid white' }}>{unread_notifications}</span>}
             </button>
             <Link href="/messages" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', position: 'relative', textDecoration: 'none', fontSize: '24px', transition: 'all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)', opacity: 1, width: '45px', height: '45px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }} onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 15px rgba(0,0,0,0.08)'; }} onMouseOut={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 10px rgba(0,0,0,0.03)'; }}>
                 ✉️
                 {unread_messages > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#3b82f6', color: 'white', fontSize: '12px', minWidth: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 8px rgba(59, 130, 246, 0.5)', fontWeight: 900, border: '2px solid white' }}>{unread_messages}</span>}
             </Link>
          </div>`;

content = content.replace(oldIconsBlock, newIconsBlock);

fs.writeFileSync(path, content, 'utf8');
console.log("Enhanced icons visibility");
