const fs = require('fs');

function fixMasterPage() {
    let content = fs.readFileSync('components/MasterPage.tsx', 'utf8');
    
    // Add mobile styles for the icon
    content = content.replace(
        '.title-area p { display: none; }',
        '.title-area p { display: none; }\n          .header-icon { width: 45px !important; height: 45px !important; border-radius: 12px !important; }\n          .header-icon span { font-size: 24px !important; }'
    );
    
    // Add class to the icon div
    content = content.replace(
        `<div style={{ \n            width: '80px', height: '80px',`,
        `<div className="header-icon" style={{ \n            width: '80px', height: '80px',`
    );

    // Adjust left side on mobile
    content = content.replace(
        `{/* Left side: Avatar, Notifications/Messages, Nav Buttons */}`,
        `{/* Left side: Avatar, Notifications/Messages, Nav Buttons */}`
    );
    // Make sure header has better flex wrap if needed, actually row is fine if items are small
    
    fs.writeFileSync('components/MasterPage.tsx', content);
}

function fixDashboard() {
    let content = fs.readFileSync('app/page.tsx', 'utf8');
    
    const mobileCss = `
                @media (max-width: 768px) {
                    .welcome-page-wrapper {
                        padding: 15px;
                        gap: 15px;
                    }
                    .hero-glass-card {
                        padding: 30px 20px;
                        border-radius: 20px;
                    }
                    .welcome-title {
                        font-size: 26px;
                    }
                    .welcome-subtitle {
                        font-size: 15px;
                        margin-bottom: 25px;
                    }
                    .modules-grid {
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        gap: 15px;
                    }
                    .module-card {
                        padding: 20px 15px;
                        gap: 10px;
                        border-radius: 16px;
                    }
                    .module-icon {
                        width: 55px;
                        height: 55px;
                        font-size: 24px;
                    }
                    .module-title {
                        font-size: 14px;
                    }
                    .add-fav-card {
                        padding: 20px 15px;
                        border-radius: 16px;
                    }
                }
`;

    if (!content.includes('@media (max-width: 768px)')) {
        content = content.replace(
            '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }',
            `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }\n${mobileCss}`
        );
        fs.writeFileSync('app/page.tsx', content);
    }
}

fixMasterPage();
fixDashboard();
