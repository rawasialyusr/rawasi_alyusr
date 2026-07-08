const fs = require('fs');
const path = require('path');

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Fix the wide grid minmax values for cards
            if (content.includes('minmax(340px, 1fr)')) {
                content = content.replace(/minmax\(340px, 1fr\)/g, 'minmax(280px, 1fr)');
                modified = true;
            }
            if (content.includes('minmax(320px, 1fr)')) {
                content = content.replace(/minmax\(320px, 1fr\)/g, 'minmax(280px, 1fr)');
                modified = true;
            }
            if (content.includes('minmax(300px, 1fr)')) {
                content = content.replace(/minmax\(300px, 1fr\)/g, 'minmax(280px, 1fr)');
                modified = true;
            }
            if (content.includes('minmax(350px, 1fr)')) {
                content = content.replace(/minmax\(350px, 1fr\)/g, 'minmax(280px, 1fr)');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated grid in ${fullPath}`);
            }
        }
    }
}

processDirectory('app');
console.log('Finished updating card grids');
