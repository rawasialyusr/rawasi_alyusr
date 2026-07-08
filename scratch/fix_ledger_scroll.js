const fs = require('fs');

function fixLedgerScroll() {
    let filePath = 'app/joborders/JobOrderLedgerModal.tsx';
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Change .modal-content from overflow: hidden to overflowY: auto, overflowX: hidden
    content = content.replace(
        /display: flex; flex-direction: column; overflow: hidden;/g,
        'display: flex; flex-direction: column; overflow-y: auto; overflow-x: hidden;'
    );

    // 2. Make the Header flexShrink: 0 so it doesn't get squished by flexbox
    content = content.replace(
        /<div style={{ background: 'linear-gradient\(135deg, rgba\(30, 41, 59, 0\.98\), rgba\(15, 23, 42, 0\.98\)\)', padding: '30px 40px', color: 'white', position: 'relative', overflow: 'hidden' }}>/g,
        `<div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98))', padding: '30px 20px', color: 'white', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>`
    );

    // 3. Keep the Table Data wrapper natural (remove flex: 1 and overflowY: auto) so the parent scrolls it
    content = content.replace(
        /<div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>/g,
        `<div style={{ padding: '20px', flexShrink: 0 }}>`
    );

    // 4. Ensure Tabs wrapper is flexShrink: 0
    content = content.replace(
        /<div style={{ display: 'flex', background: 'rgba\(248, 250, 252, 0\.8\)', padding: '0 20px', borderBottom: '1px solid #e2e8f0', overflowX: 'auto', backdropFilter: 'blur\(10px\)' }}>/g,
        `<div style={{ display: 'flex', background: 'rgba(248, 250, 252, 0.8)', padding: '0 20px', borderBottom: '1px solid #e2e8f0', overflowX: 'auto', backdropFilter: 'blur(10px)', flexShrink: 0 }}>`
    );

    fs.writeFileSync(filePath, content);
    console.log("Updated JobOrderLedgerModal scroll behavior");
}

fixLedgerScroll();
