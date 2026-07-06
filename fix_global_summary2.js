const fs = require('fs');
let content = fs.readFileSync('C:/MyProjects/my-accounting-app/app/GlobalSummary/page.tsx', 'utf8');

// The file has Windows line endings (\r\n) or Unix (\n).
// Let's use regex that handles both.
content = content.replace(/        <\/div>\r?\n    \);\r?\n}/, "        </div>\n        </MasterPage>\n    );\n}");

fs.writeFileSync('C:/MyProjects/my-accounting-app/app/GlobalSummary/page.tsx', content, 'utf8');
console.log('Done');
