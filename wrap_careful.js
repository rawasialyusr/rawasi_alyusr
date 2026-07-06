const fs = require('fs');

// 1. Fix GlobalSummary
let gsContent = fs.readFileSync('C:/MyProjects/my-accounting-app/app/GlobalSummary/page.tsx', 'utf8');
if (!gsContent.includes('<MasterPage')) {
    gsContent = gsContent.replace(/import { THEME } from '@\/lib\/theme';/, "import { THEME } from '@/lib/theme';\nimport MasterPage from '@/components/MasterPage';");
    gsContent = gsContent.replace('return (', 'return (\n        <MasterPage title="الملخص العام (Global Summary)" subtitle="نظرة شاملة وموحدة لجميع قطاعات النظام" icon="📊">');
    gsContent = gsContent.replace('        </div>\n    );\n}\n\n// مكونات مساعدة', '        </div>\n        </MasterPage>\n    );\n}\n\n// مكونات مساعدة');
    fs.writeFileSync('C:/MyProjects/my-accounting-app/app/GlobalSummary/page.tsx', gsContent, 'utf8');
    console.log('Fixed GlobalSummary');
}

// 2. Fix performance
let pContent = fs.readFileSync('C:/MyProjects/my-accounting-app/app/performance/page.tsx', 'utf8');
if (!pContent.includes('<MasterPage')) {
    pContent = pContent.replace(/(import .*;\n)(?!import)/, "$1import MasterPage from '@/components/MasterPage';\n");
    pContent = pContent.replace('return (', 'return (\n        <MasterPage title="مؤشرات الأداء التشغيلي والمالي" subtitle="تحليل شامل ومتقدم لأداء الشركة" icon="🚀">');
    // find the last ); }
    const pLastEnd = pContent.lastIndexOf('    );\n}');
    if (pLastEnd !== -1) {
        pContent = pContent.substring(0, pLastEnd) + '        </MasterPage>\n' + pContent.substring(pLastEnd);
    }
    fs.writeFileSync('C:/MyProjects/my-accounting-app/app/performance/page.tsx', pContent, 'utf8');
    console.log('Fixed performance');
}

// 3. Fix messages
let mContent = fs.readFileSync('C:/MyProjects/my-accounting-app/app/messages/page.tsx', 'utf8');
if (!mContent.includes('<MasterPage')) {
    mContent = mContent.replace(/(import .*;\n)(?!import)/, "$1import MasterPage from '@/components/MasterPage';\n");
    // Ensure we have fragment around the div and style if missing
    if (!mContent.includes('<>')) {
        mContent = mContent.replace('return (', 'return (\n        <MasterPage title="التواصل الداخلي" subtitle="الرسائل والمحادثات بين فرق العمل" icon="💬">\n        <>');
        const mLastEnd = mContent.lastIndexOf('    );\n}');
        if (mLastEnd !== -1) {
            mContent = mContent.substring(0, mLastEnd) + '        </>\n        </MasterPage>\n' + mContent.substring(mLastEnd);
        }
    } else {
        mContent = mContent.replace('return (', 'return (\n        <MasterPage title="التواصل الداخلي" subtitle="الرسائل والمحادثات بين فرق العمل" icon="💬">');
        const mLastEnd = mContent.lastIndexOf('    );\n}');
        if (mLastEnd !== -1) {
            mContent = mContent.substring(0, mLastEnd) + '        </MasterPage>\n' + mContent.substring(mLastEnd);
        }
    }
    fs.writeFileSync('C:/MyProjects/my-accounting-app/app/messages/page.tsx', mContent, 'utf8');
    console.log('Fixed messages');
}

// 4. Fix import
let iContent = fs.readFileSync('C:/MyProjects/my-accounting-app/app/import/page.tsx', 'utf8');
if (!iContent.includes('<MasterPage')) {
    iContent = iContent.replace(/(import .*;\n)(?!import)/, "$1import MasterPage from '@/components/MasterPage';\n");
    iContent = iContent.replace('return (', 'return (\n        <MasterPage title="استيراد البيانات الذكي" subtitle="نقل بيانات القيود، السندات، والأصناف بسهولة" icon="📥">');
    const iLastEnd = iContent.lastIndexOf('    );\n}');
    if (iLastEnd !== -1) {
        iContent = iContent.substring(0, iLastEnd) + '        </MasterPage>\n' + iContent.substring(iLastEnd);
    }
    fs.writeFileSync('C:/MyProjects/my-accounting-app/app/import/page.tsx', iContent, 'utf8');
    console.log('Fixed import');
}

// 5. Fix journal-errors
let jContent = fs.readFileSync('C:/MyProjects/my-accounting-app/app/journal-errors/page.tsx', 'utf8');
if (!jContent.includes('<MasterPage')) {
    jContent = jContent.replace(/(import .*;\n)(?!import)/, "$1import MasterPage from '@/components/MasterPage';\n");
    jContent = jContent.replace(/import MobileTopNav.*;\n/g, '');
    jContent = jContent.replace(/import UserCard.*;\n/g, '');
    jContent = jContent.replace(/<MobileTopNav[\s\S]*?\/>/, '');
    
    jContent = jContent.replace('return (', 'return (\n        <MasterPage icon="🛡️" title="رادار الأخطاء والتنبيهات" subtitle="مراقبة وتصحيح المشاكل المحاسبية والقيود المفقودة">');
    const jLastEnd = jContent.lastIndexOf('    );\n}');
    if (jLastEnd !== -1) {
        jContent = jContent.substring(0, jLastEnd) + '        </MasterPage>\n' + jContent.substring(jLastEnd);
    }
    fs.writeFileSync('C:/MyProjects/my-accounting-app/app/journal-errors/page.tsx', jContent, 'utf8');
    console.log('Fixed journal-errors');
}

