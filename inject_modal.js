const fs = require('fs');
const path = 'C:/MyProjects/my-accounting-app/components/MasterPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Import
const importString = `import NotificationsModal from './NotificationsModal';\n`;
if (!content.includes('import NotificationsModal')) {
    content = content.replace('import Link from', importString + 'import Link from');
}

// 2. Add state
const stateString = `  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);\n  const { unread_messages`;
content = content.replace('  const { unread_messages', stateString);

// 3. Replace Link with Button
const oldLink = `<Link href="/notifications" style={{ position: 'relative', textDecoration: 'none', fontSize: '22px', transition: '0.2s', opacity: 0.8 }} onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.8'}>
                 🔔
                 {unread_notifications > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)' }}>{unread_notifications}</span>}
             </Link>`;

const newButton = `<button onClick={() => setIsNotificationsOpen(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', textDecoration: 'none', fontSize: '22px', transition: '0.2s', opacity: 0.8 }} onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.8'}>
                 🔔
                 {unread_notifications > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)' }}>{unread_notifications}</span>}
             </button>`;

content = content.replace(oldLink, newButton);

// 4. Add modal renderer inside the div that wraps {children}
const mainTagStr = `<main className="glass-container">`;
const newMainTagStr = `<main className="glass-container">
        <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />`;
content = content.replace(mainTagStr, newMainTagStr);

fs.writeFileSync(path, content, 'utf8');
console.log("Updated MasterPage.tsx with NotificationsModal");
