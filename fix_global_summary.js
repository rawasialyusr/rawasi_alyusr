const fs = require('fs');

function forceCloseMasterPage(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it already has </MasterPage>
    if (content.includes('</MasterPage>')) {
        console.log(`Already has </MasterPage>: ${filePath}`);
        return;
    }

    // We know MasterPage opens around the start of the return statement.
    // For each of these files, the main component ends before the first `//` comment or before the end of the file.
    // In GlobalSummary, it ends right before `// مكونات مساعدة`.
    
    if (filePath.includes('GlobalSummary')) {
        content = content.replace(/(\s*)(}\r?\n\r?\n\/\/ مكونات مساعدة)/, "$1</MasterPage>\n    );\n$2");
        // Wait, the original code had:
        //         </div>
        //     );
        // }
        // // مكونات مساعدة
        content = content.replace(/\s*</div>\s*\);\s*}\s*\/\/\s*مكونات مساعدة/, '\n        </div>\n        </MasterPage>\n    );\n}\n\n// مكونات مساعدة');
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed: ' + filePath);
}

forceCloseMasterPage('C:/MyProjects/my-accounting-app/app/GlobalSummary/page.tsx');
