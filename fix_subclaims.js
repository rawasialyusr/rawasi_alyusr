const fs = require('fs');
let code = fs.readFileSync('app/subclaims/page.tsx', 'utf8');

if (!code.includes('import SecureAction')) {
    code = code.replace("import React,", "import React, { useState } from 'react';\nimport SecureAction from '@/components/SecureAction';\n");
}

if (!code.includes('<SecureAction module="job_orders" action="create">')) {
    code = code.replace(
        /<button\s*onClick=\{\(\) => \{\s*logic\.setAssignRecord\(\{ assigned_qty: 1, unit_price: 0 \}\);\s*logic\.setIsAssignModalOpen\(true\);\s*\}\}\s*className="btn-main-glass blue"\s*>\s*➕ إسناد أمر تشغيل للمقاول\s*<\/button>/s,
        '<SecureAction module="job_orders" action="create">\n                        <button \n                            onClick={() => {\n                                logic.setAssignRecord({ assigned_qty: 1, unit_price: 0 });\n                                logic.setIsAssignModalOpen(true);\n                            }} \n                            className="btn-main-glass blue"\n                        >\n                            ➕ إسناد أمر تشغيل للمقاول\n                        </button>\n                    </SecureAction>'
    );
}

if (!code.includes('<SecureAction module="subclaims" action="create">')) {
    code = code.replace(
        /<button\s*disabled=\{logic\.selectedAssignments\.length === 0 \|\| logic\.isClaimSaving\}\s*onClick=\{logic\.handleOpenClaimModal\}\s*className="btn-main-glass green"\s*>\s*\{logic\.isClaimSaving \? '⏳ جاري المعالجة\.\.\.' : `📑 إصدار مستخلص \(\$\{logic\.selectedAssignments\.length\}\)`\}\s*<\/button>/s,
        '<SecureAction module="subclaims" action="create">\n                        <button \n                            disabled={logic.selectedAssignments.length === 0 || logic.isClaimSaving} \n                            onClick={logic.handleOpenClaimModal}\n                            className="btn-main-glass green"\n                        >\n                            {logic.isClaimSaving ? \'⏳ جاري المعالجة...\' : `📑 إصدار مستخلص (${logic.selectedAssignments.length})`}\n                        </button>\n                    </SecureAction>'
    );
}

fs.writeFileSync('app/subclaims/page.tsx', code);
console.log('Updated subclaims page with SecureAction.');
