const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const fs = require('fs');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const PORT = 8889;

async function test() {
  const server = http.createServer((req, res) => {
    let urlPath = req.url.includes('?') ? req.url.split('?')[0] : req.url;
    urlPath = urlPath.replace('/energized-engines-v2', '');
    const filePath = path.join(DOCS_DIR, urlPath === '/' ? 'index.html' : urlPath);
    fs.readFile(filePath, (err, content) => {
      if (err) { res.writeHead(404); res.end('Not found'); }
      else {
        const ext = path.extname(filePath);
        const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css'};
        res.writeHead(200, {'Content-Type': types[ext] || 'text/plain'});
        res.end(content);
      }
    });
  });
  
  await new Promise(resolve => server.listen(PORT, resolve));
  
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 320, height: 844 } })).newPage();
  
  await page.goto(`http://localhost:${PORT}/energized-engines-v2/search.html?q=pin`);
  await page.waitForTimeout(300);
  
  const closedWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`✓ Closed: scrollWidth ${closedWidth} at 320px`);
  
  await page.click('.search-icon-btn');
  await page.waitForTimeout(200);
  
  const openWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`✓ Open: scrollWidth ${openWidth} at 320px`);
  
  await browser.close();
  server.close();
  
  if (closedWidth === 320 && openWidth === 320) {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n✗ Failed');
    process.exit(1);
  }
}

test().catch(console.error);
