const fs = require('fs');
let code = fs.readFileSync('app/projects/page.tsx', 'utf8');

if (!code.includes('import SecureAction')) {
    code = code.replace("import React,", "import React, { useState } from 'react';\nimport SecureAction from '@/components/SecureAction';\n");
}

// Wrap Add Project
if (!code.includes('<SecureAction module="projects" action="create">')) {
    code = code.replace(
        /<button onClick=\{\(\) => \{\s*logic\.setCurrentProjectRecord\(\{ project_code: '',(.*?)\}\);\s*logic\.setIsAddProjectModalOpen\(true\);\s*\}\} className="btn-main-glass gold">\s*➕ إضافة مشروع جديد\s*<\/button>/s,
        '<SecureAction module="projects" action="create">\n            <button onClick={() => { logic.setCurrentProjectRecord({ project_code: \'\',$1}); logic.setIsAddProjectModalOpen(true); }} className="btn-main-glass gold">\n                ➕ إضافة مشروع جديد\n            </button>\n        </SecureAction>'
    );
}

// Wrap Edit Project
if (!code.includes('<SecureAction module="projects" action="edit">')) {
    code = code.replace(
        /<button onClick=\{\(\) => \{\s*logic\.setCurrentProjectRecord\(\{ \.\.\.logic\.selectedProject \}\);\s*logic\.setIsAddProjectModalOpen\(true\);\s*\}\} className="btn-main-glass blue">\s*✏️ تعديل بيانات المشروع\s*<\/button>/s,
        '<SecureAction module="projects" action="edit">\n                <button onClick={() => { logic.setCurrentProjectRecord({ ...logic.selectedProject }); logic.setIsAddProjectModalOpen(true); }} className="btn-main-glass blue">\n                    ✏️ تعديل بيانات المشروع\n                </button>\n            </SecureAction>'
    );
}

// Wrap Delete Project
if (!code.includes('<SecureAction module="projects" action="delete">')) {
    code = code.replace(
        /<button onClick=\{\(\) => \{\s*setDeleteAlert\(\{\s*isOpen: true,\s*type: 'project',\s*id: logic\.selectedProject\.id,\s*title: 'حذف المشروع نهائياً',\s*message: `هل أنت متأكد من حذف العقار "\$\{logic\.selectedProject\.Property\}" بكل بياناته وحساباته ومقايساته\؟ هذا الإجراء لا يمكن التراجع عنه!`\s*\}\);\s*\}\} className="btn-main-glass red">\s*🗑️ حذف المشروع نهائياً\s*<\/button>/s,
        '<SecureAction module="projects" action="delete">\n                <button onClick={() => { setDeleteAlert({ isOpen: true, type: \'project\', id: logic.selectedProject.id, title: \'حذف المشروع نهائياً\', message: `هل أنت متأكد من حذف العقار "${logic.selectedProject.Property}" بكل بياناته وحساباته ومقايساته؟ هذا الإجراء لا يمكن التراجع عنه!` }); }} className="btn-main-glass red">\n                    🗑️ حذف المشروع نهائياً\n                </button>\n            </SecureAction>'
    );
}

fs.writeFileSync('app/projects/page.tsx', code);
console.log('Updated projects page with SecureAction.');
