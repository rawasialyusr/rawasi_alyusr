const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Regex to match loading divs that look like:
  // return <div style={{...}}>⏳ جاري تحميل...</div>;
  const loadingRegex = /return\s*<div[^>]*style=\{\{.*?textAlign:\s*'center'.*?\}\}[^>]*>\s*(?:⏳|⌛)?\s*(جاري.*?)(?:\.\.\.)?\s*<\/div>\s*;/g;
  
  // also handle some with just text-align center padding 100px
  const genericLoadingRegex = /return\s*<div[^>]*padding[^>]*100px[^>]*>\s*(?:⏳|⌛)?\s*(جاري.*?)(?:\.\.\.)?\s*<\/div>\s*;/g;

  function replaceFn(match, message) {
    modified = true;
    const cleanMsg = message.replace(/<[^>]*>/g, '').trim();
    return `return <LoadingScreen message="${cleanMsg}..." fullScreen={false} />;`;
  }

  content = content.replace(loadingRegex, replaceFn);
  
  if (content.match(genericLoadingRegex)) {
      content = content.replace(genericLoadingRegex, replaceFn);
  }

  if (modified) {
    if (!content.includes('import LoadingScreen')) {
      // Find the last import statement
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
