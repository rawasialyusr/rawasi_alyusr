const fs = require('fs');

let code = fs.readFileSync('app/globals.css', 'utf8');

const mobileCSS = `

/* ========================================================= */
/* 📱 GLOBAL MOBILE RESPONSIVENESS (SMART LAYOUT)            */
/* ========================================================= */
@media (max-width: 768px) {
  /* 1. Base Layout Resets */
  body, html { overflow-x: hidden !important; width: 100vw !important; }
  
  /* 2. Tables & Data Display */
  /* Make all tables horizontally scrollable natively */
  .table-responsive {
      display: block !important;
      width: 100% !important;
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch !important;
  }
  table { width: 100% !important; min-width: 600px !important; }
  
  /* 3. Sidebars & Layouts */
  /* Convert any flex-row layouts to flex-column */
  .dashboard-layout,
  .main-layout,
  .sidebar-container {
      flex-direction: column !important;
  }
  
  aside, .sidebar {
      width: 100% !important;
      min-width: 100% !important;
      margin-bottom: 20px !important;
      border-radius: 12px !important;
      height: auto !important;
      min-height: unset !important;
  }
  
  /* 4. Glass Containers & Paddings */
  .clean-page {
      padding: 10px !important;
      margin: 0 !important;
  }
  
  .glass-container, 
  .glass-card,
  main {
      padding: 15px !important;
      border-radius: 15px !important;
      margin: 0 !important;
      width: 100% !important;
      box-sizing: border-box !important;
      border: none !important;
      box-shadow: 0 5px 15px rgba(0,0,0,0.05) !important;
  }

  /* 5. Headers & Buttons */
  .master-header {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 15px !important;
      padding: 15px !important;
  }
  
  .title-area h1 { font-size: 20px !important; }
  
  /* Ensure buttons don't break flex layout */
  button {
      white-space: nowrap !important;
      flex-shrink: 0 !important;
  }
  
  /* 6. Modals */
  .modal-content, .supreme-modal {
      width: 95% !important;
      padding: 15px !important;
      max-height: 90vh !important;
      overflow-y: auto !important;
  }
}
`;

if (!code.includes('GLOBAL MOBILE RESPONSIVENESS')) {
    fs.appendFileSync('app/globals.css', mobileCSS);
    console.log('Injected mobile CSS into globals.css');
} else {
    console.log('Mobile CSS already present in globals.css');
}
