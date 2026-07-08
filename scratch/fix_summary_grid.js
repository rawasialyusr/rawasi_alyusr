const fs = require('fs');

function fixSummaryGrid() {
    let filePath = 'app/joborders/JobOrderLedgerModal.tsx';
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace the rigid 4 columns with auto-fit
    content = content.replace(
        /gridTemplateColumns: 'repeat\(4, 1fr\)'/g,
        `gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'`
    );

    // Replace the rigid 3 columns with auto-fit
    content = content.replace(
        /gridTemplateColumns: 'repeat\(3, 1fr\)'/g,
        `gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'`
    );

    fs.writeFileSync(filePath, content);
    console.log("Updated JobOrderLedgerModal.tsx to use auto-fit minmax");
}

fixSummaryGrid();
