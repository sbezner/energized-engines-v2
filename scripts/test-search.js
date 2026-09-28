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
  const context = await browser.newContext();
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
  
  const tests = [];
  
  async function testSearch(query, description) {
    const errors = [];
    await page.goto(`http://localhost:${PORT}/search.html?q=${encodeURIComponent(query)}`);
    await page.waitForTimeout(500);
    
    const resultsText = await page.textContent('#search-results');
    const productCards = await page.locator('.product-card').count();
    
    tests.push({
      query,
      description,
      results: productCards,
      passed: productCards > 0
    });
    
    console.log(`${productCards > 0 ? '✓' : '✗'} ${description}: ${productCards} result(s)`);
    
    return productCards;
  }
  
  console.log('Running search tests...\n');
  
  await testSearch('783540', 'Full part number (783540)');
  await testSearch('7835', 'Partial part number (7835)');
  await testSearch('plunger', 'Keyword search (plunger)');
  
  console.log('\nTesting "Show more parts" button...\n');
  
  await page.goto(`http://localhost:${PORT}/search.html?q=787`);
  await page.waitForTimeout(800);
  
  const initialCount = await page.locator('.product-card').count();
  console.log(`Initial results: ${initialCount}`);
  
  const showMoreBtn = page.locator('button.show-more-btn');
  const hasShowMore = await showMoreBtn.count() > 0;
  
  if (hasShowMore) {
    const btnText = await showMoreBtn.textContent();
    console.log(`Show more button text: "${btnText}"`);
    
    await showMoreBtn.click();
    await page.waitForTimeout(500);
    
    const afterClickCount = await page.locator('.product-card').count();
    console.log(`After clicking "Show more": ${afterClickCount}`);
    
    const focused = await page.evaluate(() => {
      const activeEl = document.activeElement;
      return activeEl ? `${activeEl.tagName}.${activeEl.className}` : 'none';
    });
    console.log(`Focused element: ${focused}`);
    
    tests.push({
      query: 'Show more button',
      description: 'Show more loads additional results',
      results: afterClickCount - initialCount,
      passed: afterClickCount > initialCount && afterClickCount === 48
    });
  } else {
    console.log('No "Show more" button found (all results fit in one page)');
    tests.push({
      query: 'Show more button',
      description: 'Show more loads additional results',
      results: 0,
      passed: false
    });
  }
  
  console.log('\nTesting home page search form...\n');
  
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForTimeout(300);
  
  const searchInput = page.locator('.hero form input');
  await searchInput.fill('783540');
  const searchForm = page.locator('.hero form');
  await searchForm.evaluate(form => form.submit());
  await page.waitForTimeout(500);
  
  const url = page.url();
  const resultsCount = await page.locator('.product-card').count();
  
  console.log(`Landed on: ${url}`);
  console.log(`Results: ${resultsCount}`);
  
  tests.push({
    query: 'Home page search',
    description: 'Home search lands on search.html with results',
    results: resultsCount,
    passed: url.includes('search.html') && resultsCount > 0
  });
  
  console.log('\nChecking for console errors on all pages...\n');
  
  const pagesToCheck = [
    { path: '/search.html?q=783540', name: 'search.html' },
    { path: '/index.html', name: 'index.html' },
    { path: '/models.html', name: 'models.html' },
    { path: '/products/sumner-s783800-eventer-25.html', name: 'product page' }
  ];
  
  for (const { path: pagePath, name } of pagesToCheck) {
    const pageErrors = [];
    const testPage = await context.newPage();
    
    testPage.on('console', msg => {
      if (msg.type() === 'error') {
        pageErrors.push(msg.text());
      }
    });
    
    testPage.on('pageerror', err => {
      pageErrors.push(err.message);
    });
    
    await testPage.goto(`http://localhost:${PORT}${pagePath}`);
    await testPage.waitForTimeout(300);
    
    console.log(`${pageErrors.length === 0 ? '✓' : '✗'} ${name}: ${pageErrors.length} console error(s)`);
    
    if (pageErrors.length > 0) {
      pageErrors.forEach(err => console.log(`  - ${err}`));
    }
    
    consoleErrors.push(...pageErrors);
    await testPage.close();
  }
  
  await browser.close();
  server.close();
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  tests.forEach(test => {
    console.log(`${test.passed ? '✓' : '✗'} ${test.description}: ${test.results} result(s)`);
  });
  
  console.log(`\nTotal console errors: ${consoleErrors.length}`);
  
  const allPassed = tests.every(t => t.passed) && consoleErrors.length === 0;
  
  if (allPassed) {
    console.log('\n✓ All tests passed!\n');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
