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
            if (file.endsWith('Modal.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('app');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Reduce .glass-input-field padding
    if (content.includes('padding: 12px;') && content.includes('.glass-input-field')) {
        content = content.replace(/padding: 12px;/g, 'padding: 10px 12px;');
        changed = true;
    }
    
    // Reduce .btn-glass-save padding
    if (content.includes('padding: 16px;') && content.includes('.btn-glass-save')) {
        content = content.replace(/padding: 16px;/g, 'padding: 12px 20px;');
        changed = true;
    }
    
    if (content.includes('border-radius: 16px;') && content.includes('.btn-glass-save')) {
        content = content.replace(/border-radius: 16px;/g, 'border-radius: 12px;');
        changed = true;
    }
    
    if (content.includes('font-size: 16px;') && content.includes('.btn-glass-save')) {
        content = content.replace(/font-size: 16px;/g, 'font-size: 14px;');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
    }
});
