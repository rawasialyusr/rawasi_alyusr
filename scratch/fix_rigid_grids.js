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

            // Replace rigid multi-columns with auto-fit grids
            if (content.includes("gridTemplateColumns: 'repeat(4, 1fr)'")) {
                content = content.replace(/gridTemplateColumns: 'repeat\(4, 1fr\)'/g, "gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'");
                modified = true;
            }
            if (content.includes('gridTemplateColumns: "repeat(4, 1fr)"')) {
                content = content.replace(/gridTemplateColumns: "repeat\(4, 1fr\)"/g, 'gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))"');
                modified = true;
            }
            if (content.includes("gridTemplateColumns: 'repeat(3, 1fr)'")) {
                content = content.replace(/gridTemplateColumns: 'repeat\(3, 1fr\)'/g, "gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'");
                modified = true;
            }
            if (content.includes('gridTemplateColumns: "repeat(3, 1fr)"')) {
                content = content.replace(/gridTemplateColumns: "repeat\(3, 1fr\)"/g, 'gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"');
                modified = true;
            }
            if (content.includes("gridTemplateColumns: '1fr 1fr 1fr'")) {
                content = content.replace(/gridTemplateColumns: '1fr 1fr 1fr'/g, "gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'");
                modified = true;
            }

            // Also check for 1fr 1fr without repeat
            if (content.includes("gridTemplateColumns: '1fr 1fr'")) {
                content = content.replace(/gridTemplateColumns: '1fr 1fr'/g, "gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'");
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated rigid grids in ${fullPath}`);
            }
        }
    }
}

processDirectory('app');
console.log('Finished updating rigid grids globally');
