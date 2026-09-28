#!/usr/bin/env node

const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const fs = require('fs');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const PORT = 8889;

async function findWideElement() {
  const server = http.createServer((req, res) => {
    let urlPath = req.url.includes('?') ? req.url.split('?')[0] : req.url;
    urlPath = urlPath.replace('/energized-engines-v2', '');
    const filePath = path.join(DOCS_DIR, urlPath === '/' ? 'index.html' : urlPath);
    
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        const ext = path.extname(filePath);
        const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
        res.writeHead(200, {'Content-Type': types[ext] || 'text/plain'});
        res.end(content);
      }
    });
  });
  
  await new Promise(resolve => server.listen(PORT, resolve));
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 320, height: 844 } });
  const page = await context.newPage();
  
  await page.goto(`http://localhost:${PORT}/energized-engines-v2/search.html?q=pin`);
  await page.waitForTimeout(500);
  
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`scrollWidth: ${scrollWidth}`);
  
  const wideElements = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    const results = [];
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > 320) {
        results.push({
          tag: el.tagName,
          class: el.className,
          id: el.id,
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          text: el.textContent?.substring(0, 50)
        });
      }
    });
    return results.sort((a, b) => b.right - a.right).slice(0, 20);
  });
  
  console.log('\nElements extending past 320px:');
  wideElements.forEach(el => {
    console.log(`  ${el.tag}.${el.class || '(no class)'} #${el.id || '(no id)'} - right: ${el.right}, width: ${el.width}`);
    if (el.text) console.log(`    text: ${el.text.replace(/\n/g, ' ')}`);
  });
  
  await browser.close();
  server.close();
}

findWideElement().catch(console.error);
