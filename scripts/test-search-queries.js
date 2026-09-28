#!/usr/bin/env node

const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const fs = require('fs');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const PORT = 8889;

async function runTests() {
  const server = http.createServer((req, res) => {
    let urlPath = req.url;
    
    if (urlPath.includes('?')) {
      urlPath = urlPath.split('?')[0];
    }
    
    urlPath = urlPath.replace('/energized-engines-v2', '');
    
    let filePath = path.join(DOCS_DIR, urlPath === '/' ? 'index.html' : urlPath);
    
    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.jpg': 'image/jpeg',
      '.png': 'image/png',
      '.svg': 'image/svg+xml'
    };
    
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
        res.end(content);
      }
    });
  });
  
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`Server started on http://localhost:${PORT}\n`);
  
  const browser = await chromium.launch({ headless: true });
  const queries = ['plunger', '783540', '7835', 'lift'];
  
  for (const query of queries) {
    const page = await browser.newPage();
    
    await page.goto(`http://localhost:${PORT}/energized-engines-v2/search.html?q=${query}`);
    await page.waitForTimeout(1000);
    
    const cards = await page.locator('.product-card').count();
    console.log(`${query}: ${cards} cards`);
    
    await page.close();
  }
  
  await browser.close();
  server.close();
  
  console.log('\n✓ Search tests complete');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
