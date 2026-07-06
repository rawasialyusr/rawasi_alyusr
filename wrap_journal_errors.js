const fs = require('fs');
const path = 'C:/MyProjects/my-accounting-app/app/journal-errors/page.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('<MasterPage')) {
    // 1. Add import
    const importStr = `import MasterPage from '@/components/MasterPage';\n`;
    content = content.replace(/(import .*;\n)+/, match => match + importStr);
    
    // 2. Remove MobileTopNav and UserCard imports
    content = content.replace(/import MobileTopNav.*;\n/g, '');
    content = content.replace(/import UserCard.*;\n/g, '');
    
    // 3. Replace the MobileTopNav usage
    const mobileTopNavRegex = /<MobileTopNav[\s\S]*?\/>/;
    content = content.replace(mobileTopNavRegex, '');
    
    // 4. Wrap return content in MasterPage
    content = content.replace('return (', 'return (\n        <MasterPage icon="🛡️" title="رادار الأخطاء والتنبيهات" subtitle="مراقبة وتصحيح المشاكل المحاسبية والقيود المفقودة">');
    content = content.replace(/(?<=<\/div>\s*)\)(?=\s*;\s*\}\s*$)/, '        </MasterPage>\n    )');
    
    fs.writeFileSync(path, content, 'utf8');
    console.log("Applied MasterPage to journal-errors");
} else {
    console.log("Already has MasterPage");
}
