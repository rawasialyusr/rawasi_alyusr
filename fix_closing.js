const fs = require('fs');

function fixMasterPageClosing(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('</MasterPage>')) {
        console.log(`Already fixed: ${filePath}`);
        return;
    }

    // We look for the last ')' before the final '}'
    // A safe way is to replace the very last occurrence of `);` before `}`.
    // Let's find the last occurrence of `);` and insert `</MasterPage>` before it.
    // Or we can use a regex that matches `); \n }` at the end of the file.

    // Let's replace the last `);` that is immediately followed by `\n}` or `}` or `\r\n}`
    const lastReturnEndRegex = /\);\s*\}(?![\s\S]*\);\s*\})/m;
    
    // First, let's see if we can just replace `); \n}` with `\n</MasterPage>\n); \n}`
    // But wait, there might be helper components after the main export default function!
    // E.g., in GlobalSummary there is `function KPICard(...)`.
    // So `}` is not at the end of the file.
    
    // Instead, let's look for `return (` and find its matching `)`. This is hard in regex.
    // Let's manually replace it based on unique end patterns for each file.
    
    if (filePath.includes('GlobalSummary')) {
        content = content.replace('        </div>\n    );\n}', '        </div>\n        </MasterPage>\n    );\n}');
    } else if (filePath.includes('performance')) {
        content = content.replace('        </div>\n    );\n}', '        </div>\n        </MasterPage>\n    );\n}');
    } else if (filePath.includes('messages')) {
        content = content.replace('        </div>\n    );\n}', '        </div>\n        </MasterPage>\n    );\n}');
    } else if (filePath.includes('import')) {
        content = content.replace('        </div>\n    );\n}', '        </div>\n        </MasterPage>\n    );\n}');
    } else if (filePath.includes('journal-errors')) {
        content = content.replace('        </div>\n    );\n}', '        </div>\n        </MasterPage>\n    );\n}');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed closing tag in ${filePath}`);
}

fixMasterPageClosing('C:/MyProjects/my-accounting-app/app/GlobalSummary/page.tsx');
fixMasterPageClosing('C:/MyProjects/my-accounting-app/app/performance/page.tsx');
fixMasterPageClosing('C:/MyProjects/my-accounting-app/app/messages/page.tsx');
fixMasterPageClosing('C:/MyProjects/my-accounting-app/app/import/page.tsx');
fixMasterPageClosing('C:/MyProjects/my-accounting-app/app/journal-errors/page.tsx');
