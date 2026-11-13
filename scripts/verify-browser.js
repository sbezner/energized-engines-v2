#!/usr/bin/env node
/**
 * Browser verification script - validates cart flow with Playwright
 * Requires: npm ci && npx playwright install chromium
 * Run with: npm run verify:browser
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
let errors = [];

console.log('\n🌐 BROWSER VERIFICATION\n');
console.log('='.repeat(70));

// Check for Playwright
try {
  require.resolve('playwright');
} catch (e) {
  console.error('\n❌ ERROR: Playwright not installed\n');
  console.error('Run: npm ci && npx playwright install chromium\n');
  process.exit(1);
}

// 1. Check that no products use the 225x225 placeholder
console.log('\n1. Placeholder image check...');
const searchData = JSON.parse(fs.readFileSync(path.join(DOCS_DIR, 'search-data.json'), 'utf8'));
const withPlaceholder = searchData.parts.filter(p => p.image && p.image.includes('_225x225')).length;
const withoutImage = searchData.parts.filter(p => !p.image || p.image === '').length;

if (withPlaceholder === 0) {
  console.log(`   ✓ No products using 225x225 placeholder (${withoutImage} now show "No photo yet")`);
} else {
  errors.push(`${withPlaceholder} products still using 225x225 placeholder`);
  console.log(`   ✗ ${withPlaceholder} products still using 225x225 placeholder`);
}

// 2. Check for duplicate IDs across all HTML pages
console.log('\n2. Duplicate IDs check...');
const allHtmlFiles = [];
function collectHtml(dir) {
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      collectHtml(fullPath);
    } else if (item.endsWith('.html')) {
      allHtmlFiles.push(fullPath);
    }
  });
}
collectHtml(DOCS_DIR);

let duplicateIdErrors = [];
allHtmlFiles.forEach(file => {
  const html = fs.readFileSync(file, 'utf8');
  const ids = [];
  const idMatches = html.matchAll(/\bid="([^"]+)"/g);
  for (const match of idMatches) {
    ids.push(match[1]);
  }
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  const uniqueDuplicates = [...new Set(duplicates)];
  if (uniqueDuplicates.length > 0) {
    duplicateIdErrors.push(`${path.relative(DOCS_DIR, file)}: duplicate IDs ${uniqueDuplicates.join(', ')}`);
  }
});

if (duplicateIdErrors.length === 0) {
  console.log(`   ✓ No duplicate IDs found in ${allHtmlFiles.length} pages`);
} else {
  duplicateIdErrors.forEach(err => {
    errors.push(err);
    console.log(`   ✗ ${err}`);
  });
}

// 3. Playwright cart flow test
console.log('\n3. Cart flow test (Playwright)...');
(async function testCartFlow() {
  try {
    const { chromium } = require('playwright');
    
    // Start a simple HTTP server - strip /energized-engines-v2 prefix from URL
    const server = http.createServer((req, res) => {
      let url = req.url;
      if (url.startsWith('/energized-engines-v2')) {
        url = url.slice('/energized-engines-v2'.length);
      }
      if (url === '' || url === '/') url = '/index.html';
      
      let filePath = path.join(DOCS_DIR, url.slice(1));
      const extname = path.extname(filePath);
      const contentTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml'
      };
      const contentType = contentTypes[extname] || 'text/plain';
      
      fs.readFile(filePath, (error, content) => {
        if (error) {
          res.writeHead(404);
          res.end(`Not found: ${filePath}`);
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    });
    
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}/energized-engines-v2`;
    
    const browser = await chromium.launch({ headless: true });
    
    // Helper to check element visibility and bounds
    async function checkVisibility(page, selector, name) {
      const locator = page.locator(selector).first();
      const count = await page.locator(selector).count();
      const isVisible = await locator.isVisible().catch(() => false);
      const box = await locator.boundingBox().catch(() => null);
      const hasBounds = box && box.width > 0 && box.height > 0;
      
      return { 
        name, 
        selector, 
        count,
        isVisible, 
        hasBounds, 
        ok: isVisible && hasBounds,
        box 
      };
    }
    
    // Test viewports: 320, 390, 768, 1280
    const viewports = [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1280, height: 720 }
    ];
    
    const allChecks = [];
    
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      await page.goto(`${baseUrl}/products/sumner-783540-mast-roller-1.html`);
      await page.click('.btn.btn-pri');
      await page.waitForTimeout(1000);
      await page.goto(`${baseUrl}/cart.html`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      
      // Wait for cart to render
      await page.waitForSelector('#cartPageSubtotal', { timeout: 5000 }).catch(() => {});
      
      // Check that Order Summary elements are visible and have bounds
      const subtotalCheck = await checkVisibility(page, '#cartPageSubtotal', `${viewport.width}px: #cartPageSubtotal visible & on-screen`);
      const totalCheck = await checkVisibility(page, '#cartPageTotal', `${viewport.width}px: #cartPageTotal visible & on-screen`);
      
      // Debug: check all links containing checkout
      const checkoutLinks = await page.locator('a[href*="checkout"]').count();
      const checkoutBtnCheck = await checkVisibility(page, 'a[href*="checkout.html"]', `${viewport.width}px: Proceed to Checkout visible & on-screen`);
      
      // Check values
      const subtotalText = await page.locator('#cartPageSubtotal').textContent({ timeout: 5000 }).catch(() => null);
      const totalText = await page.locator('#cartPageTotal').textContent({ timeout: 5000 }).catch(() => null);
      
      allChecks.push(subtotalCheck);
      allChecks.push(totalCheck);
      allChecks.push(checkoutBtnCheck);
      allChecks.push({ 
        name: `${viewport.width}px: cart subtotal = $33.00`, 
        ok: subtotalText?.trim() === '$33.00',
        actual: subtotalText?.trim()
      });
      allChecks.push({ 
        name: `${viewport.width}px: cart total = $33.00`, 
        ok: totalText?.trim() === '$33.00',
        actual: totalText?.trim()
      });
      
      await page.close();
    }
    
    await browser.close();
    server.close();
    
    // Report results
    allChecks.forEach(check => {
      if (check.ok) {
        console.log(`   ✓ ${check.name}`);
      } else {
        let detail = '';
        if (check.actual !== undefined) {
          detail = ` (got: ${check.actual})`;
        } else if (check.count === 0) {
          detail = ' (not found)';
        } else if (check.isVisible === false) {
          detail = ' (not visible)';
        } else if (!check.hasBounds) {
          detail = ` (no bounds: ${JSON.stringify(check.box)})`;
        }
        errors.push(`${check.name}${detail}`);
        console.log(`   ✗ ${check.name}${detail}`);
      }
    });
    
  } catch (e) {
    errors.push(`Playwright test failed: ${e.message}`);
    console.log(`   ✗ Playwright test failed: ${e.message}`);
  }
})().then(() => {
  // Summary after async test completes
  console.log('\n' + '='.repeat(70));
  if (errors.length === 0) {
    console.log('\n✅ ALL BROWSER CHECKS PASSED\n');
    process.exit(0);
  } else {
    console.log(`\n❌ ${errors.length} ERROR(S):`);
    errors.forEach(e => console.log(`   - ${e}`));
    console.log('');
    process.exit(1);
  }
}).catch(err => {
  console.error('\n💥 UNEXPECTED ERROR:', err);
  process.exit(1);
});
