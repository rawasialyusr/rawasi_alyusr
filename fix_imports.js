const fs = require('fs');

function fixFile(path) {
    try {
        let code = fs.readFileSync(path, 'utf8');
        
        // Remove the broken line that the previous script created
        code = code.replace(/import React, \{ useState \} from 'react';\nimport SecureAction from '@\/components\/SecureAction';\n \{/g, 'import React, {');
        code = code.replace(/import React, \{ useState \} from 'react';\nimport SecureAction from '@\/components\/SecureAction';\n\n \{/g, 'import React, {');

        // Add SecureAction import at the top if missing
        if (!code.includes("import SecureAction from '@/components/SecureAction';")) {
            code = code.replace(/(import React.*?from 'react';)/, '$1\nimport SecureAction from \'@/components/SecureAction\';');
        }
        
        fs.writeFileSync(path, code);
        console.log('Fixed ' + path);
    } catch (e) { console.error('Error', e); }
}

fixFile('app/materials/page.tsx');
fixFile('app/material_issues/page.tsx');
fixFile('app/boqcatalog/page.tsx');
fixFile('app/partners/page.tsx');
fixFile('app/employees/page.tsx');
fixFile('app/projects/page.tsx');
fixFile('app/subclaims/page.tsx');
