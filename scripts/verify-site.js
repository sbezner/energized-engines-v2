#!/usr/bin/env node
/**
 * Site verification script - validates all build requirements
 * Run with: npm run verify
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
let errors = [];
let warnings = [];

console.log('\n🔍 VERIFYING SITE BUILD\n');
console.log('='.repeat(70));

// 1. Check product page count
console.log('\n1. Product pages count...');
const productFiles = fs.readdirSync(path.join(DOCS_DIR, 'products')).filter(f => f.endsWith('.html'));
if (productFiles.length === 2369) {
  console.log(`   ✓ ${productFiles.length} product pages`);
} else {
  errors.push(`Expected 2,369 product pages, found ${productFiles.length}`);
  console.log(`   ✗ Expected 2,369 product pages, found ${productFiles.length}`);
}

// 2. Check prices from variants
console.log('\n2. Product prices (from variants[0].price)...');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'processed-products.json'), 'utf8'));
const zeroPrice = data.products.filter(p => !p.variants?.[0]?.price || parseFloat(p.variants[0].price) === 0);
const withPrice = data.products.length - zeroPrice.length;
if (zeroPrice.length < 10) {
  console.log(`   ✓ ${withPrice} products with price > 0, ${zeroPrice.length} at $0`);
} else {
  errors.push(`Too many products at $0: ${zeroPrice.length} (expected < 10)`);
  console.log(`   ✗ ${zeroPrice.length} products at $0 (expected < 10)`);
}

// 3. Check search-data.json has normalized_pn (only required when partNumber exists)
console.log('\n3. Search data normalized_pn...');
const searchData = JSON.parse(fs.readFileSync(path.join(DOCS_DIR, 'search-data.json'), 'utf8'));
const withoutNormPN = searchData.parts.filter(p => {
  const hasPartNumber = p.partNumber && p.partNumber.trim() !== '';
  return hasPartNumber && (!p.normalized_pn || p.normalized_pn === '');
});
if (withoutNormPN.length === 0) {
  console.log(`   ✓ All parts with partNumber have normalized_pn`);
} else {
  errors.push(`${withoutNormPN.length} parts with partNumber missing normalized_pn`);
  console.log(`   ✗ ${withoutNormPN.length} parts with partNumber missing normalized_pn`);
}

// 4. Check search ranking
console.log('\n4. Search result counts...');
function searchParts(query) {
  const normalizedQuery = query.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const lowerQuery = query.toLowerCase();
  
  const exact = [], startsWith = [], contains = [], titleMatch = [];
  
  searchData.parts.forEach(part => {
    const pn = part.normalized_pn || '';
    const partNum = (part.partNumber || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const title = part.name.toLowerCase();
    
    // Match on normalized_pn OR partNumber
    if (pn === normalizedQuery || partNum === normalizedQuery) {
      exact.push(part);
    } else if (pn.startsWith(normalizedQuery) || partNum.startsWith(normalizedQuery)) {
      startsWith.push(part);
    } else if (pn.includes(normalizedQuery) || partNum.includes(normalizedQuery)) {
      contains.push(part);
    } else if (title.includes(lowerQuery)) {
      titleMatch.push(part);
    }
  });
  
  return [...exact, ...startsWith, ...contains, ...titleMatch];
}

const tests = [
  { query: '783540', expected: 2 },
  { query: '7835', expectedFirst: 24, expectedMin: 24 },
  { query: 'plunger', expected: 21 },
  { query: 'pin', expectedFirst: 24, expectedMin: 24 }
];

tests.forEach(test => {
  const results = searchParts(test.query);
  const firstPage = results.slice(0, 24).length;
  
  if (test.expected !== undefined) {
    if (results.length === test.expected) {
      console.log(`   ✓ ${test.query}: ${results.length} results`);
    } else {
      errors.push(`Search "${test.query}" returned ${results.length}, expected ${test.expected}`);
      console.log(`   ✗ ${test.query}: ${results.length} results (expected ${test.expected})`);
    }
  } else if (test.expectedFirst !== undefined) {
    const firstPageOk = firstPage === test.expectedFirst;
    const totalOk = test.expectedTotal === undefined || results.length === test.expectedTotal;
    const minOk = test.expectedMin === undefined || results.length >= test.expectedMin;
    
    if (firstPageOk && totalOk && minOk) {
      console.log(`   ✓ ${test.query}: ${firstPage} first page (${results.length} total)`);
    } else if (!firstPageOk) {
      errors.push(`Search "${test.query}" first page ${firstPage}, expected ${test.expectedFirst}`);
      console.log(`   ✗ ${test.query}: ${firstPage} first page (expected ${test.expectedFirst})`);
    } else if (!totalOk) {
      errors.push(`Search "${test.query}" total ${results.length}, expected ${test.expectedTotal}`);
      console.log(`   ✗ ${test.query}: ${results.length} total (expected ${test.expectedTotal})`);
    }
  }
});

// 5. Check badge counts (classify by actual badge text content)
console.log('\n5. Badge types (60 exact / 96 series / 191 listed on 299 pages)...');
const badgeCounts = { exact: 0, series: 0, listed: 0, pages: 0 };
productFiles.forEach(file => {
  const html = fs.readFileSync(path.join(DOCS_DIR, 'products', file), 'utf8');
  if (html.includes('badge b-man')) {
    badgeCounts.pages++;
    // Classify by badge text: 'Verified for' = exact, 'Listed in Series ... parts manual' = series, other 'Listed in' = listed
    const badgeMatches = html.match(/<span class="badge b-man"[^>]*>([^<]+)<\/span>/g);
    if (badgeMatches) {
      badgeMatches.forEach(badge => {
        const text = badge.match(/>([^<]+)</)[1];
        if (text.includes('Verified for')) {
          badgeCounts.exact++;
        } else if (text.match(/Listed in Series \d+ parts manual/)) {
          badgeCounts.series++;
        } else if (text.includes('Listed in')) {
          badgeCounts.listed++;
        }
      });
    }
  }
});

if (badgeCounts.exact === 60 && badgeCounts.series === 96 && badgeCounts.listed === 191 && badgeCounts.pages === 299) {
  console.log(`   ✓ ${badgeCounts.exact} exact / ${badgeCounts.series} series / ${badgeCounts.listed} listed on ${badgeCounts.pages} pages`);
} else {
  errors.push(`Badge counts: ${badgeCounts.exact}/${badgeCounts.series}/${badgeCounts.listed} on ${badgeCounts.pages} pages (expected 60/96/191 on 299)`);
  console.log(`   ✗ ${badgeCounts.exact}/${badgeCounts.series}/${badgeCounts.listed} on ${badgeCounts.pages} pages (expected 60/96/191 on 299)`);
}

// 6. Check for 'not yet verified'
console.log('\n6. "not yet verified" text...');
let notYetCount = 0;
productFiles.forEach(file => {
  const html = fs.readFileSync(path.join(DOCS_DIR, 'products', file), 'utf8');
  if (html.toLowerCase().includes('not yet verified')) notYetCount++;
});
if (notYetCount === 0) {
  console.log(`   ✓ No "not yet verified" found`);
} else {
  errors.push(`Found "not yet verified" on ${notYetCount} pages`);
  console.log(`   ✗ Found "not yet verified" on ${notYetCount} pages`);
}

// 7. Check noindex on every page
console.log('\n7. noindex meta tag...');
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

let withoutNoindex = 0;
allHtmlFiles.forEach(file => {
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('noindex')) withoutNoindex++;
});

if (withoutNoindex === 0) {
  console.log(`   ✓ All ${allHtmlFiles.length} pages have noindex`);
} else {
  errors.push(`${withoutNoindex} pages missing noindex`);
  console.log(`   ✗ ${withoutNoindex} pages missing noindex`);
}

// 8. Check robots.txt Disallow
console.log('\n8. robots.txt Disallow...');
const robotsPath = path.join(DOCS_DIR, 'robots.txt');
if (fs.existsSync(robotsPath)) {
  const robots = fs.readFileSync(robotsPath, 'utf8');
  if (robots.includes('Disallow: /')) {
    console.log(`   ✓ robots.txt has Disallow: /`);
  } else {
    warnings.push(`robots.txt missing "Disallow: /"`);
    console.log(`   ⚠ robots.txt missing "Disallow: /"`);
  }
} else {
  warnings.push('robots.txt not found');
  console.log(`   ⚠ robots.txt not found`);
}

// 9. Check tile counts match series pages
console.log('\n9. Home tile counts vs series page counts...');
const homeHtml = fs.readFileSync(path.join(DOCS_DIR, 'index.html'), 'utf8');
const tileMatches = homeHtml.matchAll(/<a class="mtile" href="[^"]*\/series\/([^"]+)\.html"[^>]*>.*?<span class="num">(\d+) parts/gs);

let tileMismatch = false;
for (const [, seriesKey, tileCount] of tileMatches) {
  const seriesHtml = fs.readFileSync(path.join(DOCS_DIR, 'series', `${seriesKey}.html`), 'utf8');
  const cardCount = (seriesHtml.match(/<a class="card/g) || []).length;
  
  if (parseInt(tileCount) === cardCount) {
    console.log(`   ✓ ${seriesKey}: ${tileCount} = ${cardCount}`);
  } else {
    errors.push(`${seriesKey} tile=${tileCount}, page=${cardCount}`);
    console.log(`   ✗ ${seriesKey}: tile=${tileCount}, page=${cardCount}`);
    tileMismatch = true;
  }
}

// 10. Check product page prices
console.log('\n10. Product page prices...');
const productData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'processed-products.json'), 'utf8'));
const zeroVariantProducts = productData.products.filter(p => !p.variants?.[0]?.price || parseFloat(p.variants[0].price) === 0);
let zeroPriceErrors = 0;

// Check that no product has data-price="0" unless its variant price is 0
productFiles.slice(0, 100).forEach(file => {
  const html = fs.readFileSync(path.join(DOCS_DIR, 'products', file), 'utf8');
  const dataPriceMatch = html.match(/data-price="([^"]+)"/);
  if (dataPriceMatch && dataPriceMatch[1] === '0') {
    // Check if this product's variant price is actually 0
    const idMatch = html.match(/data-id="(\d+)"/);
    if (idMatch) {
      const product = productData.products.find(p => p.id.toString() === idMatch[1]);
      const variantPrice = parseFloat(product?.variants?.[0]?.price || 0);
      if (variantPrice > 0) zeroPriceErrors++;
    }
  }
});

// Check Eventer sound array bar shows $660.00
const eventerBarFile = productFiles.find(f => f.includes('784060'));
let eventerBarPrice = 'NOT FOUND';
if (eventerBarFile) {
  const html = fs.readFileSync(path.join(DOCS_DIR, 'products', eventerBarFile), 'utf8');
  const priceMatch = html.match(/\$660\.00/);
  eventerBarPrice = priceMatch ? '$660.00' : 'INCORRECT';
}

if (zeroPriceErrors === 0 && eventerBarPrice === '$660.00') {
  console.log(`   ✓ No incorrect data-price="0" found`);
  console.log(`   ✓ Eventer sound array bar shows ${eventerBarPrice}`);
} else {
  if (zeroPriceErrors > 0) {
    errors.push(`${zeroPriceErrors} products with data-price="0" but variants[0].price > 0`);
    console.log(`   ✗ ${zeroPriceErrors} products with incorrect data-price="0"`);
  }
  if (eventerBarPrice !== '$660.00') {
    errors.push(`Eventer bar price is ${eventerBarPrice}, expected $660.00`);
    console.log(`   ✗ Eventer bar shows ${eventerBarPrice}`);
  }
}

// 11. Check return policy content
console.log('\n11. Return policy text...');
const policyHtml = fs.readFileSync(path.join(DOCS_DIR, 'return-policy.html'), 'utf8');
const has14days = policyHtml.includes('within 14 days of ship date');
const hasCircuitBoards = policyHtml.includes('CIRCUIT BOARDS');
const has15days = policyHtml.includes('15 days');
const hasRA = policyHtml.includes('RA number');

const policyChecks = [];
if (has14days) policyChecks.push('✓ "within 14 days of ship date"');
else errors.push('Return policy missing "within 14 days of ship date"');

if (hasCircuitBoards) policyChecks.push('✓ "CIRCUIT BOARDS"');
else errors.push('Return policy missing "CIRCUIT BOARDS"');

if (!has15days) policyChecks.push('✓ No "15 days"');
else errors.push('Return policy incorrectly contains "15 days"');

if (!hasRA) policyChecks.push('✓ No "RA number"');
else errors.push('Return policy incorrectly contains "RA number"');

console.log(`   ${policyChecks.join(', ')}`);

// 12. Check for duplicate IDs across all HTML pages
console.log('\n12. Duplicate IDs check...');
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

// 13. Playwright cart flow test
console.log('\n13. Cart flow test (Playwright)...');
(async function testCartFlow() {
  try {
    const http = require('http');
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
    
    // Test at 1280px
    const page1280 = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page1280.goto(`${baseUrl}/products/sumner-783540-mast-roller-1.html`);
    await page1280.click('.btn.btn-pri');
    await page1280.waitForTimeout(1000);
    await page1280.goto(`${baseUrl}/cart.html`);
    await page1280.waitForLoadState('domcontentloaded');
    await page1280.waitForTimeout(1000);
    
    const hasItem1280 = await page1280.locator('.li').count() > 0;
    let itemPrice1280 = null;
    if (hasItem1280) {
      const priceDiv = page1280.locator('.li').first().locator('div[style*="text-align:right"]').first().locator('div[style*="font-weight:700"]');
      itemPrice1280 = await priceDiv.textContent({ timeout: 5000 }).catch(() => null);
    }
    const subtotal1280 = await page1280.locator('#cartPageSubtotal').textContent({ timeout: 5000 }).catch(() => null);
    const total1280 = await page1280.locator('#cartPageTotal').textContent({ timeout: 5000 }).catch(() => null);
    
    await page1280.goto(`${baseUrl}/checkout.html`);
    await page1280.waitForLoadState('domcontentloaded');
    await page1280.waitForTimeout(1000);
    const checkoutTotal1280 = await page1280.locator('#checkoutTotal').textContent({ timeout: 5000 }).catch(() => null);
    
    await page1280.close();
    
    // Test at 390px
    const page390 = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page390.goto(`${baseUrl}/products/sumner-783540-mast-roller-1.html`);
    await page390.click('.btn.btn-pri');
    await page390.waitForTimeout(1000);
    await page390.goto(`${baseUrl}/cart.html`);
    await page390.waitForLoadState('domcontentloaded');
    await page390.waitForTimeout(1000);
    
    const hasItem390 = await page390.locator('.li').count() > 0;
    let itemPrice390 = null;
    if (hasItem390) {
      const priceDiv = page390.locator('.li').first().locator('div[style*="text-align:right"]').first().locator('div[style*="font-weight:700"]');
      itemPrice390 = await priceDiv.textContent({ timeout: 5000 }).catch(() => null);
    }
    const subtotal390 = await page390.locator('#cartPageSubtotal').textContent({ timeout: 5000 }).catch(() => null);
    const total390 = await page390.locator('#cartPageTotal').textContent({ timeout: 5000 }).catch(() => null);
    
    await page390.goto(`${baseUrl}/checkout.html`);
    await page390.waitForLoadState('domcontentloaded');
    await page390.waitForTimeout(1000);
    const checkoutTotal390 = await page390.locator('#checkoutTotal').textContent({ timeout: 5000 }).catch(() => null);
    
    await page390.close();
    await browser.close();
    server.close();
    
    // Verify all values
    const checks = [
      { name: '1280px item visible', actual: hasItem1280, expected: true },
      { name: '1280px item price', actual: itemPrice1280?.trim(), expected: '$33.00' },
      { name: '1280px cart subtotal', actual: subtotal1280?.trim(), expected: '$33.00' },
      { name: '1280px cart total', actual: total1280?.trim(), expected: '$33.00' },
      { name: '1280px checkout total', actual: checkoutTotal1280?.trim(), expected: '$33.00' },
      { name: '390px item visible', actual: hasItem390, expected: true },
      { name: '390px item price', actual: itemPrice390?.trim(), expected: '$33.00' },
      { name: '390px cart subtotal', actual: subtotal390?.trim(), expected: '$33.00' },
      { name: '390px cart total', actual: total390?.trim(), expected: '$33.00' },
      { name: '390px checkout total', actual: checkoutTotal390?.trim(), expected: '$33.00' }
    ];
    
    let allPass = true;
    checks.forEach(check => {
      if (check.actual === check.expected) {
        console.log(`   ✓ ${check.name}: ${check.actual}`);
      } else {
        allPass = false;
        errors.push(`${check.name}: expected ${check.expected}, got ${check.actual}`);
        console.log(`   ✗ ${check.name}: expected ${check.expected}, got ${check.actual}`);
      }
    });
    
    if (allPass) {
      console.log(`   ✓ All cart flow checks passed`);
    }
  } catch (e) {
    errors.push(`Playwright test failed: ${e.message}`);
    console.log(`   ✗ Playwright test failed: ${e.message}`);
  }
})().then(() => {
  // Summary after async test completes
  console.log('\n' + '='.repeat(70));
  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✅ ALL CHECKS PASSED\n');
    process.exit(0);
  } else {
    if (errors.length > 0) {
      console.log(`\n❌ ${errors.length} ERROR(S):`);
      errors.forEach(e => console.log(`   - ${e}`));
    }
    if (warnings.length > 0) {
      console.log(`\n⚠️  ${warnings.length} WARNING(S):`);
      warnings.forEach(w => console.log(`   - ${w}`));
    }
    console.log('');
    process.exit(errors.length > 0 ? 1 : 0);
  }
}).catch(err => {
  console.error('\n💥 UNEXPECTED ERROR:', err);
  process.exit(1);
});
