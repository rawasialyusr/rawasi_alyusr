const fs = require('fs');

try {
    let code = fs.readFileSync('app/projects/BoqTab.tsx', 'utf8');
    if (!code.includes('import SecureAction')) {
        code = code.replace(/(import React.*?from 'react';)/, '$1\nimport SecureAction from \'@/components/SecureAction\';');
    }
    
    code = code.replace(
        /(<button onClick=\{\(\) => \{\s*logic\.setCurrentBoqRecord.*?\}\} style=\{\{ background: 'none'.*?\}\} title="تعديل البند">✏️<\/button>)/s,
        '<SecureAction module="boqbudget" action="edit">$1</SecureAction>'
    );
    code = code.replace(
        /(<button onClick=\{\(\) => \{\s*setDeleteAlert.*?\}\} style=\{\{ background: 'none'.*?\}\} title="حذف البند">🗑️<\/button>)/s,
        '<SecureAction module="boqbudget" action="delete">$1</SecureAction>'
    );
    
    fs.writeFileSync('app/projects/BoqTab.tsx', code);
    console.log('Fixed BoqTab.tsx');
} catch (e) { console.error('Error BoqTab', e); }

try {
    let code = fs.readFileSync('app/boqcatalog/page.tsx', 'utf8');
    
    code = code.replace(
        /(<button onClick=\{\(\) => \{\s*logic\.setCurrentRecord\(item\).*?\}\} style=\{\{ background: 'none'.*?\}\} title="تعديل البند">✏️<\/button>)/s,
        '<SecureAction module="boqcatalog" action="edit">$1</SecureAction>'
    );
    code = code.replace(
        /(<button onClick=\{\(\) => logic\.handleDeleteItem\(item\.id\)\} style=\{\{ background: 'none'.*?\}\} title="حذف البند">🗑️<\/button>)/s,
        '<SecureAction module="boqcatalog" action="delete">$1</SecureAction>'
    );
    
    fs.writeFileSync('app/boqcatalog/page.tsx', code);
    console.log('Fixed boqcatalog inline items');
} catch (e) { console.error('Error boqcatalog', e); }
