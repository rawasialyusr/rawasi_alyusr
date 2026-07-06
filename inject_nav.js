const fs = require('fs');
let code = fs.readFileSync('components/MasterPage.tsx', 'utf8');

const navStyles = `
        .nav-btn-glass {
            width: 40px; height: 40px; border-radius: 12px;
            background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.8);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: 0.3s;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            color: #1e293b; font-size: 18px;
        }
        .nav-btn-glass:hover {
            background: white; transform: translateY(-2px);
            border-color: \${THEME.goldAccent};
        }
        .nav-group { display: flex; gap: 8px; margin-right: 20px; border-right: 1px solid rgba(0,0,0,0.05); padding-right: 20px; }
        
        @media (max-width: 768px) {
            .nav-group { display: none; }
        }
`;

if (!code.includes('.nav-btn-glass')) {
    code = code.replace('.glass-container {', navStyles + '\n        .glass-container {');
}

const navHtml = `
          <div className="nav-group">
            <button onClick={() => router.back()} className="nav-btn-glass" title="رجوع للخلف">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            <button onClick={() => router.forward()} className="nav-btn-glass" title="تقدم للأمام">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </div>`;

if (!code.includes('className="nav-group"')) {
    code = code.replace(
        /(<div className="title-area".*?>.*?<\/div>)/s,
        '$1' + navHtml
    );
}

fs.writeFileSync('components/MasterPage.tsx', code);
console.log('Added Back/Forward buttons to MasterPage');
