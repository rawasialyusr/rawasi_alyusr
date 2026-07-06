const fs = require('fs');
let jContent = fs.readFileSync('C:/MyProjects/my-accounting-app/app/journal-errors/page.tsx', 'utf8');

// 1. Add MasterPage import
jContent = jContent.replace(/(import .*;\n)(?!import)/, "$1import MasterPage from '@/components/MasterPage';\n");

// 2. Remove old imports
jContent = jContent.replace(/import MobileTopNav.*;\r?\n/g, '');
jContent = jContent.replace(/import UserCard.*;\r?\n/g, '');

// 3. Remove MobileTopNav usage exactly
jContent = jContent.replace('                <MobileTopNav title="رادار الحسابات" leftContent={<UserCard />} />', '');

// 4. Wrap with MasterPage
jContent = jContent.replace('    return (\n        <AuthGuard', '    return (\n        <MasterPage icon="🛡️" title="رادار الأخطاء والتنبيهات" subtitle="مراقبة وتصحيح المشاكل المحاسبية والقيود المفقودة">\n        <AuthGuard');
jContent = jContent.replace('    return (\r\n        <AuthGuard', '    return (\r\n        <MasterPage icon="🛡️" title="رادار الأخطاء والتنبيهات" subtitle="مراقبة وتصحيح المشاكل المحاسبية والقيود المفقودة">\r\n        <AuthGuard');

// 5. Add closing tag
const jLastEnd = jContent.lastIndexOf('    );\n}');
if (jLastEnd !== -1) {
    jContent = jContent.substring(0, jLastEnd) + '        </MasterPage>\n' + jContent.substring(jLastEnd);
} else {
    const jLastEndWindows = jContent.lastIndexOf('    );\r\n}');
    if (jLastEndWindows !== -1) {
        jContent = jContent.substring(0, jLastEndWindows) + '        </MasterPage>\r\n' + jContent.substring(jLastEndWindows);
    }
}

fs.writeFileSync('C:/MyProjects/my-accounting-app/app/journal-errors/page.tsx', jContent, 'utf8');
console.log('Fixed journal-errors perfectly');
