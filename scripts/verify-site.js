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

// 11. Check for $150 in shipping copy (should be $250)
console.log('\n11. Shipping threshold check...');
const configJs = fs.readFileSync(path.join(DOCS_DIR, 'config.js'), 'utf8');
const has150 = configJs.includes('FREE_SHIPPING_THRESHOLD: 150');
const has250 = configJs.includes('FREE_SHIPPING_THRESHOLD: 250');
if (!has150 && has250) {
  console.log(`   ✓ FREE_SHIPPING_THRESHOLD is 250 (not 150)`);
} else {
  errors.push(`FREE_SHIPPING_THRESHOLD is ${has150 ? '150' : 'not 250'}`);
  console.log(`   ✗ FREE_SHIPPING_THRESHOLD is ${has150 ? '150' : 'not 250'}`);
}

// 12. Check for Stripe claims (should not exist)
console.log('\n12. Stripe claims check...');
let stripeCount = 0;
allHtmlFiles.forEach(file => {
  const html = fs.readFileSync(file, 'utf8');
  if (html.includes('Secure checkout by Stripe') && !file.includes('footer')) {
    stripeCount++;
  }
});
if (stripeCount === 0) {
  console.log(`   ✓ No inappropriate "Secure checkout by Stripe" claims`);
} else {
  errors.push(`Found "Secure checkout by Stripe" on ${stripeCount} pages`);
  console.log(`   ✗ Found on ${stripeCount} pages`);
}

// 13. Check models count (should be 27 with links, not 39)
console.log('\n13. Models count...');
const modelsHtml = fs.readFileSync(path.join(DOCS_DIR, 'models.html'), 'utf8');
const modelCount = (modelsHtml.match(/<a class="mtile"/g) || []).length;
if (modelCount === 27) {
  console.log(`   ✓ ${modelCount} models with links`);
} else {
  errors.push(`Models count is ${modelCount}, expected 27`);
  console.log(`   ✗ ${modelCount} models (expected 27)`);
}

// 14. Check for filterEE and typeaheadMobile
console.log('\n14. Filter and typeahead elements...');
const searchHtml = fs.readFileSync(path.join(DOCS_DIR, 'search.html'), 'utf8');
const hasFilterEE = searchHtml.includes('id="filterEE"');
const hasTypeaheadMobile = searchHtml.includes('id="typeaheadMobile"');
if (hasFilterEE && hasTypeaheadMobile) {
  console.log(`   ✓ Brand filter and mobile typeahead present`);
} else {
  if (!hasFilterEE) errors.push('Missing Brand filter');
  if (!hasTypeaheadMobile) errors.push('Missing mobile typeahead');
  console.log(`   ${hasFilterEE ? '✓' : '✗'} Brand filter, ${hasTypeaheadMobile ? '✓' : '✗'} mobile typeahead`);
}

// 15. Check oldPrice count in search-data
console.log('\n15. oldPrice count in search-data.json...');
const oldPriceCount = searchData.parts.filter(p => p.oldPrice != null).length;
const oldPricePositive = searchData.parts.filter(p => {
  if (!p.oldPrice) return false;
  const price = parseFloat(p.price);
  const old = parseFloat(p.oldPrice);
  const pct = Math.round(((old - price) / old) * 100);
  return pct > 0;
}).length;
if (oldPricePositive >= 34) {
  console.log(`   ✓ ${oldPricePositive} parts with positive oldPrice percentage (≥34)`);
} else {
  errors.push(`oldPrice count ${oldPricePositive}, expected ≥34`);
  console.log(`   ✗ ${oldPricePositive} parts with positive oldPrice (expected ≥34)`);
}

// 16. Check return policy content
console.log('\n16. Return policy text...');
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

// 17. Check EE 1004 shows savings on product page and in search
console.log('\n17. EE 1004 savings check...');
const ee1004Page = fs.readFileSync(path.join(DOCS_DIR, 'products', 'load-line-cable-eventer-or-2000-series.html'), 'utf8');
const ee1004HasSave = ee1004Page.includes('You save $106.00 (47%)');
const ee1004Search = searchData.parts.find(p => p.partNumber === 'EE 1004' || p.partNumber === '1004');
const ee1004SearchOk = ee1004Search && ee1004Search.oldPrice && parseFloat(ee1004Search.oldPrice) === 226;
if (ee1004HasSave && ee1004SearchOk) {
  console.log(`   ✓ EE 1004 shows savings on product page and has oldPrice in search`);
} else {
  if (!ee1004HasSave) errors.push('EE 1004 product page missing savings');
  if (!ee1004SearchOk) errors.push('EE 1004 search-data missing oldPrice');
  console.log(`   ${ee1004HasSave ? '✓' : '✗'} Product page, ${ee1004SearchOk ? '✓' : '✗'} search data`);
}

// Summary
console.log('\n' + '='.repeat(70));
if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅ ALL STATIC CHECKS PASSED\n');
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
