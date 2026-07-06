const fs = require('fs');
const path = require('path');

function findLogicFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(findLogicFiles(filePath));
        } else if (file.endsWith('_logic.ts')) {
            results.push(filePath);
        }
    });
    return results;
}

const logicFiles = findLogicFiles(path.join(process.cwd(), 'app'));
logicFiles.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const match = content.match(/supabase\.from\(['"`](.*?)['"`]\)/);
    if (match) {
        console.log(`${path.basename(f)}: ${match[1]}`);
    }
});
