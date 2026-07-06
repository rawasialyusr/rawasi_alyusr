const fs = require('fs');

function applyMasterPage(filePath, title, subtitle, icon) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it already has MasterPage
    if (content.includes('MasterPage')) return;

    // Add import
    const importStr = `import MasterPage from '@/components/MasterPage';\n`;
    content = content.replace(/(import .*;\n)+/, match => match + importStr);

    // Find the return statement and wrap the main content
    // Usually it returns a <div ...> or <GlassContainer>
    // We'll look for the first main container after return (
    
    // For GlobalSummary:
    if (filePath.includes('GlobalSummary')) {
        content = content.replace('return (', `return (\n        <MasterPage title="${title}" subtitle="${subtitle}" icon="${icon}">`);
        content = content.replace(/(?<=<\/div>\s*)\)(?=\s*;\s*\}\s*$)/, '        </MasterPage>\n    )');
    } else if (filePath.includes('performance')) {
        content = content.replace('return (', `return (\n        <MasterPage title="${title}" subtitle="${subtitle}" icon="${icon}">`);
        content = content.replace(/(?<=<\/div>\s*)\)(?=\s*;\s*\}\s*$)/, '        </MasterPage>\n    )');
    } else if (filePath.includes('messages')) {
        content = content.replace('return (', `return (\n        <MasterPage title="${title}" subtitle="${subtitle}" icon="${icon}">`);
        // Remove empty fragments
        content = content.replace(/<>\s*/, '');
        content = content.replace(/<\/>\s*\)(?=\s*;\s*\}\s*$)/, '        </MasterPage>\n    )');
    } else if (filePath.includes('import')) {
        content = content.replace('return (', `return (\n        <MasterPage title="${title}" subtitle="${subtitle}" icon="${icon}">`);
        content = content.replace(/(?<=<\/div>\s*)\)(?=\s*;\s*\}\s*$)/, '        </MasterPage>\n    )');
    }

    fs.writeFileSync(filePath, content, 'utf8');
}

applyMasterPage('C:/MyProjects/my-accounting-app/app/GlobalSummary/page.tsx', 'الملخص العام (Global Summary)', 'نظرة شاملة وموحدة لجميع قطاعات النظام', '📊');
applyMasterPage('C:/MyProjects/my-accounting-app/app/performance/page.tsx', 'مؤشرات الأداء التشغيلي والمالي', 'تحليل شامل ومتقدم لأداء الشركة', '🚀');
applyMasterPage('C:/MyProjects/my-accounting-app/app/messages/page.tsx', 'التواصل الداخلي', 'الرسائل والمحادثات بين فرق العمل', '💬');
applyMasterPage('C:/MyProjects/my-accounting-app/app/import/page.tsx', 'استيراد البيانات الذكي', 'نقل بيانات القيود، السندات، والأصناف بسهولة', '📥');

console.log("Applied MasterPage to missing pages");
