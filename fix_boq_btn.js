const fs = require('fs');

let code = fs.readFileSync('app/projects/page.tsx', 'utf8');

if (!code.includes('<SecureAction module="boqbudget" action="create">')) {
    code = code.replace(
        /(<button onClick=\{\(\) => \{\s*logic\.setCurrentBoqRecord.*?\}\} className="btn-main-glass gold">\s*➕ إضافة بند للمقايسة \(WBS\)\s*<\/button>)/s,
        '<SecureAction module="boqbudget" action="create">\n                    $1\n                </SecureAction>'
    );
    fs.writeFileSync('app/projects/page.tsx', code);
    console.log('Fixed BOQ button in projects/page.tsx');
} else {
    console.log('BOQ button already fixed.');
}
