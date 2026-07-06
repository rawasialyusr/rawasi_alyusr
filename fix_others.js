const fs = require('fs');

function addImport(code) {
    if (!code.includes('import SecureAction')) {
        return code.replace("import React,", "import React, { useState } from 'react';\nimport SecureAction from '@/components/SecureAction';\n");
    }
    return code;
}

// 1. materials/page.tsx
try {
    let code = fs.readFileSync('app/materials/page.tsx', 'utf8');
    code = addImport(code);
    code = code.replace(
        /(<button.*?onClick=\{.*?logic\.setIsModalOpen\(true\).*?\} className="btn-main-glass blue">.*?✏️ تعديل الفاتورة المحددة.*?<\/button>)/s,
        '<SecureAction module="materials" action="edit">\n                $1\n            </SecureAction>'
    );
    code = code.replace(
        /(<button.*?onClick=\{.*?logic\.handleDeleteSelected.*?\} className="btn-main-glass red".*?>.*?🗑️ مسح المحدد.*?<\/button>)/s,
        '<SecureAction module="materials" action="delete">\n                $1\n            </SecureAction>'
    );
    code = code.replace(
        /(<button.*?onClick=\{.*?logic\.handleEditRow.*?\}.*?>.*?✏️ تعديل.*?<\/button>)/s,
        '<SecureAction module="materials" action="edit">\n                                $1\n                            </SecureAction>'
    );
    fs.writeFileSync('app/materials/page.tsx', code);
    console.log('Fixed materials');
} catch (e) { console.error('Error materials', e); }

// 2. material_issues/page.tsx
try {
    let code = fs.readFileSync('app/material_issues/page.tsx', 'utf8');
    code = addImport(code);
    code = code.replace(
        /(<button.*?onClick=\{.*?logic\.setIsModalOpen\(true\).*?\} className="btn-main-glass blue".*?>.*?✏️ تعديل إذن الصرف المحدد.*?<\/button>)/s,
        '<SecureAction module="material_issues" action="edit">\n                $1\n            </SecureAction>'
    );
    code = code.replace(
        /(<button.*?onClick=\{.*?logic\.handleDeleteSelected.*?\} className="btn-main-glass red".*?>.*?🗑️ مسح الفواتير المحددة.*?<\/button>)/s,
        '<SecureAction module="material_issues" action="delete">\n                $1\n            </SecureAction>'
    );
    fs.writeFileSync('app/material_issues/page.tsx', code);
    console.log('Fixed material_issues');
} catch (e) { console.error('Error material_issues', e); }

// 3. boqcatalog/page.tsx
try {
    let code = fs.readFileSync('app/boqcatalog/page.tsx', 'utf8');
    code = addImport(code);
    code = code.replace(
        /(<button.*?onClick=\{.*?logic\.setCategoryModal\(\{ isOpen: true, type: 'main' \}\).*?\} className="btn-main-glass gold".*?>.*?➕ إضافة قسم \/ بند جديد.*?<\/button>)/s,
        '<SecureAction module="boqcatalog" action="create">\n            $1\n        </SecureAction>'
    );
    // There are many small icon buttons for edit/delete here, let's wrap them as well!
    // It's safer to just wrap the whole action column or the buttons directly.
    code = code.replace(
        /(<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); logic\.setCategoryModal\(\{ isOpen: true, oldName: mainCat, newName: mainCat, type: 'main' \}\); \}\} className="action-icon" title="تعديل اسم القسم">✏️<\/button>)/g,
        '<SecureAction module="boqcatalog" action="edit">$1</SecureAction>'
    );
    code = code.replace(
        /(<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); if\(confirm\(`هل أنت متأكد من حذف قسم "\$\{mainCat\}" بجميع بنوده نهائياً؟`\)\) logic\.handleDeleteCategory\(\{ name: mainCat, type: 'main' \}\); \}\} className="action-icon" title="حذف القسم بالكامل">🗑️<\/button>)/g,
        '<SecureAction module="boqcatalog" action="delete">$1</SecureAction>'
    );
    code = code.replace(
        /(<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); logic\.setCategoryModal\(\{ isOpen: true, oldName: subCat, newName: subCat, type: 'sub', parentMain: mainCat \}\); \}\} className="action-icon" title="تعديل اسم القسم الفرعي">✏️<\/button>)/g,
        '<SecureAction module="boqcatalog" action="edit">$1</SecureAction>'
    );
    code = code.replace(
        /(<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); if\(confirm\(`هل أنت متأكد من حذف "\$\{subCat\}" بجميع بنوده؟`\)\) logic\.handleDeleteCategory\(\{ name: subCat, type: 'sub', parentMain: mainCat \}\); \}\} className="action-icon" title="حذف القسم الفرعي">🗑️<\/button>)/g,
        '<SecureAction module="boqcatalog" action="delete">$1</SecureAction>'
    );
    fs.writeFileSync('app/boqcatalog/page.tsx', code);
    console.log('Fixed boqcatalog');
} catch (e) { console.error('Error boqcatalog', e); }

// 4. partners/page.tsx
try {
    let code = fs.readFileSync('app/partners/page.tsx', 'utf8');
    code = addImport(code);
    code = code.replace(
        /(<button.*?onClick=\{.*?openModal.*?\}.*?className="btn-main-glass blue".*?>.*?\{isOneSelected \? '✏️ تعديل الكيان المحدد' : '➕ إضافة كيان جديد'\}.*?<\/button>)/s,
        '<SecureAction module="partners" action="create">\n                $1\n            </SecureAction>'
    );
    code = code.replace(
        /(<button.*?onClick=\{.*?handleDeleteSelected.*?\}.*?className="btn-main-glass red".*?>.*?🗑️ مسح المحدد.*?<\/button>)/s,
        '<SecureAction module="partners" action="delete">\n                $1\n            </SecureAction>'
    );
    fs.writeFileSync('app/partners/page.tsx', code);
    console.log('Fixed partners');
} catch (e) { console.error('Error partners', e); }

// 5. employees/page.tsx
try {
    let code = fs.readFileSync('app/employees/page.tsx', 'utf8');
    code = addImport(code);
    code = code.replace(
        /(<button.*?onClick=\{logic\.handleAddNew\}.*?>➕ إضافة كادر جديد<\/button>)/s,
        '<SecureAction module="employees" action="create">\n            $1\n        </SecureAction>'
    );
    code = code.replace(
        /(<button.*?onClick=\{logic\.handleEditSelected\}.*?>✏️ تعديل بيانات السجل<\/button>)/s,
        '<SecureAction module="employees" action="edit">\n            $1\n        </SecureAction>'
    );
    code = code.replace(
        /(<button.*?onClick=\{logic\.handleDelete\}.*?>🗑️ طي قيد \/ حذف<\/button>)/s,
        '<SecureAction module="employees" action="delete">\n            $1\n        </SecureAction>'
    );
    fs.writeFileSync('app/employees/page.tsx', code);
    console.log('Fixed employees');
} catch (e) { console.error('Error employees', e); }
