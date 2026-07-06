const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  const jsxLoadingRegex = /<div[^>]*padding[^>]*100px[^>]*>\s*(?:⏳|⌛)?\s*(جاري.*?)(?:\.\.\.)?\s*<\/div>/g;
  const jsxLoadingRegex2 = /<div[^>]*textAlign:\s*'center'[^>]*>\s*(?:⏳|⌛)?\s*(جاري.*?)(?:\.\.\.)?\s*<\/div>/g;

  function replaceFn(match, message) {
    modified = true;
    const cleanMsg = message.replace(/<[^>]*>/g, '').trim();
    return `<LoadingScreen message="${cleanMsg}..." fullScreen={false} />`;
  }

  if (content.match(jsxLoadingRegex)) {
      content = content.replace(jsxLoadingRegex, replaceFn);
  }
  
  if (content.match(jsxLoadingRegex2)) {
      content = content.replace(jsxLoadingRegex2, replaceFn);
  }

  if (modified) {
    if (!content.includes('import LoadingScreen')) {
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', lastImportIndex);
        content = content.substring(0, endOfLine + 1) + 
                  "import LoadingScreen from '@/components/LoadingScreen';\n" + 
                  content.substring(endOfLine + 1);
      } else {
        content = "import LoadingScreen from '@/components/LoadingScreen';\n" + content;
      }
    }
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      processFile(filePath);
    }
  }
}

walkDir('app');
