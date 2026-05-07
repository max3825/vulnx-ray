const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx')) {
      callback(dirPath);
    }
  });
}

walkDir('c:/Users/Administrateur/vulnx-ray/frontend/src', (file) => {
  // Do not touch api.ts itself
  if (file.endsWith('api.ts') || file.endsWith('next-env.d.ts')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  
  // Quick check if there is a 'fetch(' call
  if (content.includes('fetch(') && !content.includes('import { apiFetch }')) {
    content = content.replace(/fetch\(/g, 'apiFetch(');
    content = "import { apiFetch } from '@/utils/api';\n" + content;
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
