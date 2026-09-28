#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DOCS_DIR = path.join(__dirname, '..', 'docs');

const testFiles = [
  'index.html',
  'search.html',
  'models.html',
  'models/2000.html',
  'products/sumner-s783800-eventer-25.html'
];

let totalScripts = 0;
let totalErrors = 0;

console.log('Checking inline JavaScript syntax...\n');

for (const file of testFiles) {
  const filePath = path.join(DOCS_DIR, file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${file}`);
    totalErrors++;
    continue;
  }
  
  const html = fs.readFileSync(filePath, 'utf8');
  const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
  let match;
  let fileScriptCount = 0;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    fileScriptCount++;
    totalScripts++;
    const scriptContent = match[1].trim();
    
    if (!scriptContent) continue;
    
    try {
      new vm.Script(scriptContent, { filename: `${file}:script-${fileScriptCount}` });
    } catch (err) {
      console.error(`❌ Syntax error in ${file} (script ${fileScriptCount}):`);
      console.error(`   ${err.message}`);
      
      const lines = scriptContent.split('\n');
      if (err.stack) {
        const lineMatch = err.stack.match(/:(\d+)/);
        if (lineMatch) {
          const lineNum = parseInt(lineMatch[1]);
          if (lines[lineNum - 1]) {
            console.error(`   Line ${lineNum}: ${lines[lineNum - 1].trim()}`);
          }
        }
      }
      console.error('');
      totalErrors++;
    }
  }
  
  if (fileScriptCount > 0) {
    console.log(`✓ ${file}: ${fileScriptCount} inline script(s) checked`);
  }
}

console.log(`\nTotal: ${totalScripts} inline scripts checked`);

if (totalErrors > 0) {
  console.error(`\n❌ Found ${totalErrors} error(s)\n`);
  process.exit(1);
} else {
  console.log('\n✓ All inline scripts have valid syntax\n');
  process.exit(0);
}
