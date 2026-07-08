const fs = require('fs');

function updateGlobalsCss() {
    let cssPath = 'app/globals.css';
    let content = fs.readFileSync(cssPath, 'utf8');

    const newRules = `
/* 🚀 ENHANCED MOBILE RESPONSIVENESS OVERRIDES */
@media (max-width: 768px) {
    /* Enforce single column for responsive grids */
    .responsive-form-grid, 
    .responsive-summary-grid, 
    .responsive-card-grid {
        grid-template-columns: 1fr !important;
        gap: 15px !important;
    }

    /* Force all modals to be mobile-friendly and cancel any hardcoded min-width */
    .modal-content, 
    .supreme-modal,
    [style*="width: 500px"], 
    [style*="width: 600px"], 
    [style*="width: 700px"], 
    [style*="width: 800px"], 
    [style*="width: 900px"],
    [style*="width: 1000px"],
    [style*="max-width"],
    [style*="min-width"] {
        width: 95vw !important;
        max-width: 100vw !important;
        min-width: 0 !important;
        margin-left: auto !important;
        margin-right: auto !important;
        padding: 15px !important;
        overflow-x: hidden !important;
        box-sizing: border-box !important;
    }

    /* Fix any rogue grids inside modals or containers */
    div[style*="grid-template-columns: 1fr 1fr"],
    div[style*="gridTemplateColumns: 1fr 1fr"],
    div[style*="grid-template-columns: repeat(3"],
    div[style*="grid-template-columns: repeat(4"] {
        grid-template-columns: 1fr !important;
    }
}
`;

    if (!content.includes('ENHANCED MOBILE RESPONSIVENESS OVERRIDES')) {
        content += newRules;
        fs.writeFileSync(cssPath, content);
        console.log("Updated globals.css");
    } else {
        console.log("globals.css already has the enhanced overrides.");
    }
}

updateGlobalsCss();
