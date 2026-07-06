const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('app');
let fixedCount = 0;

files.forEach(file => {
    let code = fs.readFileSync(file, 'utf8');
    let original = code;

    // 1. Fix add -> create
    code = code.replace(/userPermissions\?\.(.*?)\?\.add/g, 'userPermissions?.$1?.create');

    // 2. Fix userRole === 'admin' -> (userRole === 'admin' || userRole === 'super_admin')
    if (!code.includes("userRole === 'super_admin'")) {
        code = code.replace(/userRole === 'admin'/g, "(userRole === 'admin' || userRole === 'super_admin')");
    }

    if (code !== original) {
        fs.writeFileSync(file, code);
        fixedCount++;
        console.log('Fixed ' + file);
    }
});

console.log('Total fixed: ' + fixedCount);
