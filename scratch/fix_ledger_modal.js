const fs = require('fs');

function fixLedgerModal() {
    let filePath = 'app/joborders/JobOrderLedgerModal.tsx';
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix header flexbox
    content = content.replace(
        /justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1/g,
        `justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px', position: 'relative', zIndex: 1`
    );

    // Add responsive grid classes
    content = content.replace(
        /<div style={{ display: 'grid', gridTemplateColumns: 'repeat\(4, 1fr\)', gap: '15px' }}>/g,
        `<div className="responsive-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>`
    );

    content = content.replace(
        /<div style={{ display: 'grid', gridTemplateColumns: 'repeat\(3, 1fr\)', gap: '15px' }}>/g,
        `<div className="responsive-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>`
    );

    // Make the title font responsive
    content = content.replace(
        /fontSize: '26px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '15px'/g,
        `fontSize: 'clamp(18px, 4vw, 26px)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap'`
    );

    // Fix the background line to not break layout
    content = content.replace(
        /width: '200px', height: '200px', background/g,
        `width: '150px', height: '150px', background`
    );

    fs.writeFileSync(filePath, content);
    console.log("Updated JobOrderLedgerModal.tsx");
}

fixLedgerModal();
