const fs = require('fs');

function finalizeHeader() {
    let content = fs.readFileSync('components/MasterPage.tsx', 'utf8');
    
    // Add aggressive flex-shrink rules for mobile to ensure absolutely no wrapping
    content = content.replace(
        '.title-area { gap: 8px !important; }',
        '.title-area { gap: 8px !important; flex-shrink: 1 !important; min-width: 0 !important; }'
    );
    
    content = content.replace(
        '.title-area h1 { font-size: 16px !important; max-width: 130px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
        '.title-area h1 { font-size: 18px !important; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }'
    );

    content = content.replace(
        '.header-side { gap: 10px !important; }',
        '.header-side { gap: 8px !important; flex-shrink: 0 !important; }'
    );

    fs.writeFileSync('components/MasterPage.tsx', content);
}

finalizeHeader();
