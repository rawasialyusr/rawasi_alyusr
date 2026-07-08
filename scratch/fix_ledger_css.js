const fs = require('fs');

function fixLedgerWidth() {
    let filePath = 'app/joborders/JobOrderLedgerModal.tsx';
    let content = fs.readFileSync(filePath, 'utf8');

    content = content.replace(
        /\.modal-content \{ width: 1100px;/g,
        `.modal-content { width: 95vw; max-width: 1100px;`
    );

    // Let's also ensure the tabs don't shrink too much
    content = content.replace(
        /\.tab-btn \{/g,
        `.tab-btn { min-width: 120px; white-space: nowrap;`
    );

    fs.writeFileSync(filePath, content);
    console.log("Updated ledger modal CSS");
}

fixLedgerWidth();
