#!/usr/bin/env node

const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const fs = require('fs');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const PORT = 8888;

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
  
  const widths = [320, 390, 1280];
  const queries = ['783540', '7835', 'plunger'];
  const allTests = [];
  
  for (const width of widths) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TESTING AT ${width}px WIDTH`);
    console.log('='.repeat(60));
    
    const context = await browser.newContext({
      viewport: { width, height: 844 }
    });
    const page = await context.newPage();
    
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });
    
    // Test search queries
    for (const query of queries) {
      await page.goto(`http://localhost:${PORT}/energized-engines-v2/search.html?q=${query}`);
      await page.waitForTimeout(500);
      
      const resultsCount = await page.locator('.product-card').count();
      const passed = resultsCount > 0;
      
      allTests.push({
        width,
        test: `search?q=${query}`,
        results: resultsCount,
        passed
      });
      
      console.log(`${passed ? '✓' : '✗'} search?q=${query}: ${resultsCount} result(s)`);
    }
    
    // Test Show more
    await page.goto(`http://localhost:${PORT}/energized-engines-v2/search.html?q=787`);
    await page.waitForTimeout(800);
    
    const initialCount = await page.locator('.product-card').count();
    const showMoreBtn = page.locator('button.show-more-btn');
    const hasShowMore = await showMoreBtn.count() > 0;
    
    if (hasShowMore) {
      await showMoreBtn.click();
      await page.waitForTimeout(500);
      
      const afterCount = await page.locator('.product-card').count();
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      const focusedOnLink = focused === 'A';
      
      allTests.push({
        width,
        test: 'Show more button',
        results: afterCount - initialCount,
        passed: afterCount > initialCount && focusedOnLink
      });
      
      console.log(`${afterCount > initialCount && focusedOnLink ? '✓' : '✗'} Show more: ${afterCount - initialCount} new cards, focus on ${focused}`);
    }
    
    // Test scrollWidth with mobile search row
    await page.goto(`http://localhost:${PORT}/energized-engines-v2/search.html?q=783540`);
    await page.waitForTimeout(300);
    
    const scrollWidthClosed = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidthClosed = await page.evaluate(() => window.innerWidth);
    
    // Open mobile search row
    if (width <= 768) {
      await page.click('.search-icon-btn');
      await page.waitForTimeout(200);
      
      const scrollWidthOpen = await page.evaluate(() => document.documentElement.scrollWidth);
      const viewportWidthOpen = await page.evaluate(() => window.innerWidth);
      
      const closedOk = scrollWidthClosed === viewportWidthClosed;
      const openOk = scrollWidthOpen === viewportWidthOpen;
      
      allTests.push({
        width,
        test: 'scrollWidth (closed)',
        results: scrollWidthClosed,
        passed: closedOk
      });
      
      allTests.push({
        width,
        test: 'scrollWidth (open)',
        results: scrollWidthOpen,
        passed: openOk
      });
      
      console.log(`${closedOk ? '✓' : '✗'} scrollWidth closed: ${scrollWidthClosed} === ${viewportWidthClosed}`);
      console.log(`${openOk ? '✓' : '✗'} scrollWidth open: ${scrollWidthOpen} === ${viewportWidthOpen}`);
    } else {
      allTests.push({
        width,
        test: 'scrollWidth',
        results: scrollWidthClosed,
        passed: scrollWidthClosed === viewportWidthClosed
      });
      console.log(`${scrollWidthClosed === viewportWidthClosed ? '✓' : '✗'} scrollWidth: ${scrollWidthClosed} === ${viewportWidthClosed}`);
    }
    
    // Check console errors
    console.log(`${consoleErrors.length === 0 ? '✓' : '✗'} Console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(err => console.log(`  - ${err}`));
    }
    
    allTests.push({
      width,
      test: 'Console errors',
      results: consoleErrors.length,
      passed: consoleErrors.length === 0
    });
    
    await context.close();
  }
  
  await browser.close();
  server.close();
  
  console.log('\n' + '='.repeat(60));
  console.log('FINAL TEST SUMMARY');
  console.log('='.repeat(60));
  
  const groupedTests = {};
  allTests.forEach(test => {
    if (!groupedTests[test.width]) groupedTests[test.width] = [];
    groupedTests[test.width].push(test);
  });
  
  Object.keys(groupedTests).forEach(width => {
    console.log(`\n${width}px:`);
    groupedTests[width].forEach(test => {
      console.log(`  ${test.passed ? '✓' : '✗'} ${test.test}: ${test.results}`);
    });
  });
  
  const allPassed = allTests.every(t => t.passed);
  
  console.log(`\n${allPassed ? '✓' : '✗'} Overall: ${allTests.filter(t => t.passed).length}/${allTests.length} tests passed\n`);
  
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
