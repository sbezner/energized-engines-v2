#!/usr/bin/env node
/**
 * Verify Iris polish changes
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
let errors = [];
let checks = 0;
let passed = 0;

console.log('\n🔍 VERIFYING IRIS POLISH CHANGES\n');
console.log('='.repeat(70));

// Check A: .eeband .card CSS rule
console.log('\nA. EE band card color for contrast...');
checks++;
const cssContent = fs.readFileSync(path.join(DOCS_DIR, 'pages.css'), 'utf8');
if (cssContent.includes('.eeband .card{color:var(--ink)}')) {
  console.log('   ✓ CSS rule added');
  passed++;
} else {
  console.log('   ✗ CSS rule missing');
  errors.push('Missing .eeband .card{color:var(--ink)} rule');
}

// Check B: Checkout radio inputs
console.log('\nB. Checkout shipping options with real radio inputs...');
checks += 4;
const checkoutHtml = fs.readFileSync(path.join(DOCS_DIR, 'checkout.html'), 'utf8');

if (checkoutHtml.includes('<input type="radio" name="ship"')) {
  console.log('   ✓ Real radio inputs added');
  passed++;
} else {
  console.log('   ✗ Radio inputs missing');
  errors.push('Missing radio inputs in checkout');
}

if (checkoutHtml.match(/<input type="radio" name="ship"/g)?.length >= 2) {
  console.log('   ✓ Multiple radio options present');
  passed++;
} else {
  console.log('   ✗ Need multiple radio options');
  errors.push('Need at least 2 radio options');
}

if (cssContent.includes('.rate>div:not(.rd){flex:1')) {
  console.log('   ✓ CSS layout for radio buttons');
  passed++;
} else {
  console.log('   ✗ CSS layout missing');
  errors.push('Missing .rate>div:not(.rd){flex:1} rule');
}

if (cssContent.includes('.rd{width:20px;height:20px')) {
  console.log('   ✓ Radio dot sizing correct');
  passed++;
} else {
  console.log('   ✗ Radio dot sizing incorrect');
  errors.push('.rd sizing incorrect');
}

// Check C: Home EE brand link color
console.log('\nC. Home EE brand link color...');
checks++;
const indexHtml = fs.readFileSync(path.join(DOCS_DIR, 'index.html'), 'utf8');
if (indexHtml.includes('Shop all') && indexHtml.includes('EE brand parts</a>') && 
    indexHtml.includes('style="color:var(--on-dark-2)"')) {
  console.log('   ✓ Link color set to var(--on-dark-2)');
  passed++;
} else {
  console.log('   ✗ Link color not set correctly');
  errors.push('EE brand link color incorrect');
}

// Check D: Product pages without inline max-height:600px
console.log('\nD. Product images without inline max-height:600px...');
checks++;
const productFiles = fs.readdirSync(path.join(DOCS_DIR, 'products')).filter(f => f.endsWith('.html'));
let withMaxHeight = 0;
productFiles.forEach(file => {
  const content = fs.readFileSync(path.join(DOCS_DIR, 'products', file), 'utf8');
  if (content.includes('max-height:600px')) {
    withMaxHeight++;
  }
});

if (withMaxHeight === 0) {
  console.log(`   ✓ 0 of ${productFiles.length} product pages have inline max-height:600px`);
  passed++;
} else {
  console.log(`   ✗ ${withMaxHeight} of ${productFiles.length} product pages still have inline max-height:600px`);
  errors.push(`${withMaxHeight} pages still have max-height:600px`);
}

// Check E: After Market parser and oldPrice count
console.log('\nE. After Market parser (case-insensitive) and oldPrice values...');
checks += 2;
const searchData = JSON.parse(fs.readFileSync(path.join(DOCS_DIR, 'search-data.json'), 'utf8'));
const withOldPrice = searchData.parts.filter(p => p.oldPrice);

if (withOldPrice.length === 34) {
  console.log(`   ✓ Exactly 34 parts with oldPrice (expected 34)`);
  passed++;
} else {
  console.log(`   ✗ ${withOldPrice.length} parts with oldPrice (expected 34)`);
  errors.push(`Expected 34 oldPrice entries, got ${withOldPrice.length}`);
}

// Check EE 1004 specifically
const ee1004 = searchData.parts.find(p => p.partNumber === 'EE 1004');
if (ee1004 && ee1004.oldPrice === '226' && ee1004.price === '120.00') {
  const savings = (226 - 120).toFixed(2);
  const percent = Math.round(((226 - 120) / 226) * 100);
  console.log(`   ✓ EE 1004 shows savings: $${savings} (${percent}%)`);
  passed++;
} else {
  console.log(`   ✗ EE 1004 savings incorrect`);
  errors.push('EE 1004 does not show correct savings');
}

// Check F: Shipping policy text
console.log('\nF. Shipping policy text on cart and checkout...');
checks += 2;
const cartHtml = fs.readFileSync(path.join(DOCS_DIR, 'cart.html'), 'utf8');
const policyText = 'Free standard ground shipping on qualified parts orders over $250';

if (cartHtml.includes(policyText)) {
  console.log('   ✓ Shipping policy text in cart');
  passed++;
} else {
  console.log('   ✗ Shipping policy text missing from cart');
  errors.push('Missing shipping policy in cart');
}

if (checkoutHtml.includes(policyText)) {
  console.log('   ✓ Shipping policy text in checkout');
  passed++;
} else {
  console.log('   ✗ Shipping policy text missing from checkout');
  errors.push('Missing shipping policy in checkout');
}

// Check that key files weren't deleted
console.log('\nKey files preserved...');
checks += 5;
const keyFiles = ['home.js', 'cart.js', 'search.js', 'config.js', 'checkout.html'];
keyFiles.forEach(file => {
  const filePath = path.join(DOCS_DIR, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    if (stats.size > 100) {
      console.log(`   ✓ ${file} exists (${stats.size} bytes)`);
      passed++;
    } else {
      console.log(`   ✗ ${file} is too small (${stats.size} bytes)`);
      errors.push(`${file} is too small`);
    }
  } else {
    console.log(`   ✗ ${file} missing`);
    errors.push(`${file} was deleted`);
  }
});

// Check README-checkout.md doesn't exist
console.log('\nREADME-checkout.md check...');
checks++;
if (!fs.existsSync(path.join(DOCS_DIR, 'README-checkout.md'))) {
  console.log('   ✓ README-checkout.md does not exist (good)');
  passed++;
} else {
  console.log('   ✗ README-checkout.md exists (should not)');
  errors.push('README-checkout.md should not exist');
}

// Summary
console.log('\n' + '='.repeat(70));
console.log(`\n📊 RESULTS: ${passed}/${checks} checks passed\n`);

if (errors.length === 0) {
  console.log('✅ ALL CHECKS PASSED\n');
  process.exit(0);
} else {
  console.log('❌ ERRORS:\n');
  errors.forEach(err => console.log(`   - ${err}`));
  console.log('');
  process.exit(1);
}
