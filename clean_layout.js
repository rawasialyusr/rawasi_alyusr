const fs = require('fs');
const path = 'C:/MyProjects/my-accounting-app/components/layout/LayoutClient.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the Link elements in LayoutClient for notifications and messages with nothing, since they are now in MasterPage
content = content.replace(/<Link href="\/notifications"[\s\S]*?<\/Link>/, '');
content = content.replace(/<Link href="\/messages"[\s\S]*?<\/Link>/, '');

fs.writeFileSync(path, content, 'utf8');
console.log("Updated LayoutClient.tsx");
