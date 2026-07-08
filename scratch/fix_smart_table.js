const fs = require('fs');

function fixSmartTable() {
    let tablePath = 'components/rawasismarttable.tsx';
    let content = fs.readFileSync(tablePath, 'utf8');

    // Make sure we only wrap the <table> element if it's not already wrapped in a responsive div
    // Looking at common React table patterns:
    if (!content.includes('className="table-responsive-wrapper"')) {
        // We will do a generic replacement for the table tag
        content = content.replace(
            /<table\s+style={{[^}]*}}>/,
            match => `<div className="table-responsive-wrapper" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>\n            ${match}`
        );
        
        // Find the closing table tag that matches. It is usually right before a pagination div or simply `</table>`
        content = content.replace(
            /<\/table>/,
            `</table>\n          </div>`
        );

        fs.writeFileSync(tablePath, content);
        console.log("Updated rawasismarttable.tsx");
    } else {
        console.log("Table is already wrapped.");
    }
}

fixSmartTable();
