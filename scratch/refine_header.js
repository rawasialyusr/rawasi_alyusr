const fs = require('fs');

function refineMasterPageMobile() {
    let content = fs.readFileSync('components/MasterPage.tsx', 'utf8');
    
    const extraMobileCss = `
          .title-area { gap: 10px !important; }
          .title-area h1 { font-size: 16px !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; } 
          .header-icon { width: 40px !important; height: 40px !important; border-radius: 10px !important; min-width: 40px; }
          .header-icon span { font-size: 20px !important; } 
          .header-actions { border-right: none !important; padding-right: 0 !important; gap: 5px !important; }
          .header-actions button, .header-actions a { width: 40px !important; height: 40px !important; font-size: 20px !important; }
          .imperial-trigger { display: none !important; } /* Hide user info on tiny mobile screens completely from header */
    `;

    if (!content.includes('.title-area { gap: 10px !important; }')) {
        content = content.replace(
            '.title-area h1 { font-size: 18px !important; }',
            extraMobileCss
        );
        content = content.replace(
            '.title-area p { display: none; }',
            ''
        );
        content = content.replace(
            '.header-icon { width: 45px !important; height: 45px !important; border-radius: 12px !important; }',
            ''
        );
        content = content.replace(
            '.header-icon span { font-size: 24px !important; }',
            ''
        );
    }
    
    // Add class to the actions container
    content = content.replace(
        `style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', borderRight: '2px solid rgba(0,0,0,0.05)', paddingRight: '20px' }}>`,
        `className="header-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', borderRight: '2px solid rgba(0,0,0,0.05)', paddingRight: '20px' }}>`
    );

    fs.writeFileSync('components/MasterPage.tsx', content);
}

refineMasterPageMobile();
