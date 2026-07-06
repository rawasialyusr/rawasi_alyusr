const fs = require('fs');
const path = 'C:/MyProjects/my-accounting-app/components/MasterPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add imports
const importString = `import Link from 'next/link';\nimport { useUnreadCounts } from '@/hooks/useUnreadCounts';\n`;
content = content.replace('import { useRouter', importString + 'import { useRouter');

// 2. Add hook call
const hookString = `  const { unread_messages, unread_notifications } = useUnreadCounts();\n  const [isMenuOpen`;
content = content.replace('  const [isMenuOpen', hookString);

// 3. Add icons next to the trigger
const iconsString = `
          <div style={{ display: 'flex', gap: '15px', paddingRight: '15px', paddingLeft: '15px', alignItems: 'center' }}>
             <Link href="/notifications" style={{ position: 'relative', textDecoration: 'none', fontSize: '22px', transition: '0.2s', opacity: 0.8 }} onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.8'}>
                 🔔
                 {unread_notifications > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)' }}>{unread_notifications}</span>}
             </Link>
             <Link href="/messages" style={{ position: 'relative', textDecoration: 'none', fontSize: '22px', transition: '0.2s', opacity: 0.8 }} onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.8'}>
                 ✉️
                 {unread_messages > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#3b82f6', color: 'white', fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(59, 130, 246, 0.4)' }}>{unread_messages}</span>}
             </Link>
          </div>

          <div className="imperial-trigger" ref={triggerRef} onClick={toggleMenu}>
`;
content = content.replace('<div className="imperial-trigger" ref={triggerRef} onClick={toggleMenu}>', iconsString);

fs.writeFileSync(path, content, 'utf8');
console.log("Updated MasterPage.tsx");
