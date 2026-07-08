const fs = require('fs');

function updateGlobalsCssMore() {
    let cssPath = 'app/globals.css';
    let content = fs.readFileSync(cssPath, 'utf8');

    const moreRules = `
    div[style*="grid-template-columns"],
    div[style*="gridTemplateColumns"] {
        /* If it's a multi-column grid, force to 1 column on mobile, EXCEPT if it's the master header or sidebar */
    }
    
    /* We will use regex-like attribute selectors to catch common multi-column inline styles */
    div[style*="1fr 1fr"],
    div[style*="1fr 2fr"],
    div[style*="2fr 1fr"],
    div[style*="1fr 1.5fr"],
    div[style*="1.5fr 1fr"],
    div[style*="1fr 3fr"],
    div[style*="3fr 1fr"],
    div[style*="repeat(2"],
    div[style*="repeat(3"],
    div[style*="repeat(4"],
    div[style*="repeat(5"] {
        grid-template-columns: 1fr !important;
    }
`;

    if (!content.includes('div[style*="1fr 2fr"]')) {
        content = content.replace(
            /div\[style\*="grid-template-columns: repeat\(4"\] \{/,
            `div[style*="grid-template-columns: repeat(4"] {` + moreRules
        );
        fs.writeFileSync(cssPath, content);
        console.log("Updated globals.css with more regex styles");
    } else {
        console.log("Already updated");
    }
}

updateGlobalsCssMore();
