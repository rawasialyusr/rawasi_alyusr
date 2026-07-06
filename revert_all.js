const fs = require('fs');

function revertMasterPage(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove import
    content = content.replace("import MasterPage from '@/components/MasterPage';\n", "");
    
    // Remove opening tag (it was inserted as <MasterPage title="..." subtitle="..." icon="...">)
    content = content.replace(/<MasterPage[^>]*>\n?/g, "");
    
    // Remove closing tag
    content = content.replace(/<\/MasterPage>\n?/g, "");
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Reverted MasterPage in " + filePath);
}

revertMasterPage('C:/MyProjects/my-accounting-app/app/GlobalSummary/page.tsx');
revertMasterPage('C:/MyProjects/my-accounting-app/app/performance/page.tsx');
revertMasterPage('C:/MyProjects/my-accounting-app/app/messages/page.tsx');
revertMasterPage('C:/MyProjects/my-accounting-app/app/import/page.tsx');
revertMasterPage('C:/MyProjects/my-accounting-app/app/journal-errors/page.tsx');
