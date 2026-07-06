const fs = require('fs');

const sidebarFile = 'components/rawasifiltersidebar.tsx';
let sidebarContent = fs.readFileSync(sidebarFile, 'utf8');

// We will inject the isMobile logic
sidebarContent = sidebarContent.replace(
  "const [isPinned, setIsPinned] = useState(false);",
  "const [isPinned, setIsPinned] = useState(false);\n  const [isMobile, setIsMobile] = useState(false);\n  const [isMobileOpen, setIsMobileOpen] = useState(false);"
);

sidebarContent = sidebarContent.replace(
  "const { summary, actions, customFilters } = useSidebar();",
  `const { summary, actions, customFilters } = useSidebar();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);`
);

sidebarContent = sidebarContent.replace(
  "const isOpen = isHovered || isPinned;",
  "const isOpen = isMobile ? isMobileOpen : (isHovered || isPinned);"
);

sidebarContent = sidebarContent.replace(
  `<aside className="filter-sidebar" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>`,
  `{isMobile && (
        <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="mobile-filter-btn no-print" style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 1001, background: accentColor, color: 'white', border: 'none', borderRadius: '50%', width: '45px', height: '45px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
          {isMobileOpen ? '✕' : '⚙️'}
        </button>
      )}
      {isMobile && isMobileOpen && (
        <div onClick={() => setIsMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, backdropFilter: 'blur(3px)' }}></div>
      )}
      <aside className="filter-sidebar no-print" onMouseEnter={() => !isMobile && setIsHovered(true)} onMouseLeave={() => !isMobile && setIsHovered(false)}>`
);

// Fix CSS
sidebarContent = sidebarContent.replace(
  "width: ${isOpen ? '280px' : '65px'};",
  "width: \\${isMobile ? (isMobileOpen ? '280px' : '0px') : (isOpen ? '280px' : '65px')};"
);

// Add mobile CSS
sidebarContent = sidebarContent.replace(
  `/* 🚀 تنسيق التاريخ */`,
  `
        @media (max-width: 768px) {
          .filter-sidebar {
            right: \\${isMobileOpen ? '0' : '-300px'};
            width: 280px !important;
          }
          .vertical-label-container { display: none !important; }
          .filter-content {
            opacity: 1 !important;
            transform: translateX(0) !important;
            width: 100% !important;
          }
          .pin-btn-sidebar { display: none !important; }
        }
        /* 🚀 تنسيق التاريخ */`
);

fs.writeFileSync(sidebarFile, sidebarContent);


const layoutFile = 'components/layout/LayoutClient.tsx';
let layoutContent = fs.readFileSync(layoutFile, 'utf8');

// Fix LayoutClient.tsx CSS
layoutContent = layoutContent.replace(
  `.filter-sidebar { width: 0px !important; display: none; }`,
  `/* .filter-sidebar handled internally */`
);

// Disable dragging on mobile
layoutContent = layoutContent.replace(
  "const onMouseDown = (e: React.MouseEvent) => {",
  "const onMouseDown = (e: React.MouseEvent) => {\n    if (window.innerWidth <= 768) return; // Disable drag on mobile\n"
);

// Add onTouchStart to also block or handle nicely
layoutContent = layoutContent.replace(
  `<div className="fab-main no-print" onMouseDown={onMouseDown} onClick={() => !isDragging && setIsOpen(!isOpen)}>`,
  `<div className="fab-main no-print" onMouseDown={onMouseDown} onTouchStart={() => { if(window.innerWidth <= 768) setIsOpen(!isOpen) }} onClick={() => { if(window.innerWidth > 768 && !isDragging) setIsOpen(!isOpen) }}>`
);

fs.writeFileSync(layoutFile, layoutContent);

console.log("Done Mobile Fixes");
