#!/usr/bin/env node
/**
 * Verify specific measurements and take screenshots
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8080/energized-engines-v2';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'notes', 'verify-shots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function verifyMeasurements() {
  const browser = await chromium.launch();
  const results = [];
  
  console.log('\n🔍 VERIFYING MEASUREMENTS\n');
  console.log('='.repeat(70));
  
  // Test 1: Check search.html?q=1021 shows EE 1021 card with Save badge and compare price
  console.log('\n1. Checking search.html?q=1021 for EE 1021 card...');
  const context1 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page1 = await context1.newPage();
  await page1.goto(`${BASE_URL}/search.html?q=1021`);
  await page1.waitForTimeout(2000); // Wait for JS to render results
  
  // Find the EE 1021 card by looking for the card with "EE 1021" in the part number
  const cards = await page1.locator('.card').all();
  let ee1021Card = null;
  
  for (const card of cards) {
    const pnEl = card.locator('.pn');
    const pnText = await pnEl.textContent();
    if (pnText && pnText.includes('EE 1021')) {
      ee1021Card = card;
      break;
    }
  }
  
  let cardVisible = false;
  let saveBadgeVisible = false;
  let comparePrice = null;
  
  if (ee1021Card) {
    cardVisible = await ee1021Card.isVisible();
    
    // Check for Save badge
    const saveBadge = ee1021Card.locator('.badge.b-save');
    saveBadgeVisible = await saveBadge.count() > 0;
    
    // Check for compare price in .pr div (should contain <s> tag with "Sumner $112.00")
    const prDiv = ee1021Card.locator('.pr');
    const sTag = prDiv.locator('s');
    const sCount = await sTag.count();
    
    if (sCount > 0) {
      const sText = await sTag.textContent();
      comparePrice = sText ? sText.trim() : null;
    }
    
    console.log(`   ${cardVisible ? '✓' : '✗'} EE 1021 card visible`);
    console.log(`   ${saveBadgeVisible ? '✓' : '✗'} Save badge visible`);
    console.log(`   ${comparePrice === 'Sumner $112.00' ? '✓' : '✗'} Compare price: "${comparePrice}" (expected "Sumner $112.00")`);
    
    results.push({
      test: 'EE 1021 card with Save badge',
      cardVisible,
      saveBadgeVisible,
      comparePrice,
      pass: cardVisible && saveBadgeVisible && comparePrice === 'Sumner $112.00'
    });
  } else {
    console.log(`   ✗ EE 1021 card not found`);
    results.push({
      test: 'EE 1021 card with Save badge',
      cardVisible: false,
      pass: false
    });
  }
  
  // Take screenshot
  await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify-search-1021-save-badge.png'), fullPage: true });
  console.log(`   📸 Screenshot saved: verify-search-1021-save-badge.png`);
  
  await context1.close();
  
  // Test 2: At 390px, verify product image box fits inside 358x358 frame
  console.log('\n2. Checking product page at 390px for image constraint...');
  const context2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page2 = await context2.newPage();
  
  // Use the EE 1021 product page
  await page2.goto(`${BASE_URL}/products/outrigger-caster-kit-for-series-2000-and-2100.html`);
  await page2.waitForTimeout(1000);
  
  // Get the .gal-main dimensions (the image container)
  const galMain = page2.locator('.gal-main').first();
  const galBounds = await galMain.boundingBox();
  
  if (galBounds) {
    const width = Math.round(galBounds.width);
    const height = Math.round(galBounds.height);
    const fitsInFrame = width <= 358 && height <= 358;
    
    console.log(`   .gal-main box: ${width}px × ${height}px`);
    console.log(`   ${fitsInFrame ? '✓' : '✗'} Fits inside 358×358 frame`);
    
    results.push({
      test: 'Product image at 390px',
      width: `${width}px`,
      height: `${height}px`,
      fitsInFrame,
      pass: fitsInFrame
    });
  } else {
    console.log(`   ✗ .gal-main box not found`);
    results.push({
      test: 'Product image at 390px',
      pass: false
    });
  }
  
  // Take screenshot
  await page2.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify-product-390px-image.png'), fullPage: true });
  console.log(`   📸 Screenshot saved: verify-product-390px-image.png`);
  
  await context2.close();
  
  // Test 3: At 320/390, verify mobile search input & button are 44px tall
  console.log('\n3. Checking mobile search input & button height...');
  
  for (const width of [320, 390]) {
    console.log(`\n   Testing at ${width}px:`);
    const context3 = await browser.newContext({ viewport: { width, height: 568 } });
    const page3 = await context3.newPage();
    await page3.goto(`${BASE_URL}/search.html`);
    await page3.waitForTimeout(1000);
    
    // Check mobile search input height (.m-only .search input)
    const searchInput = page3.locator('.m-only .search input[type="search"]').first();
    const inputBounds = await searchInput.boundingBox();
    
    // Check mobile search button height (.m-only .search button)
    const searchButton = page3.locator('.m-only .search button').first();
    const buttonBounds = await searchButton.boundingBox();
    
    if (inputBounds && buttonBounds) {
      const inputHeight = Math.round(inputBounds.height);
      const buttonHeight = Math.round(buttonBounds.height);
      const inputPass = inputHeight >= 44;
      const buttonPass = buttonHeight >= 44;
      
      console.log(`      Search input: ${inputHeight}px tall ${inputPass ? '✓' : '✗'}`);
      console.log(`      Search button: ${buttonHeight}px tall ${buttonPass ? '✓' : '✗'}`);
      
      results.push({
        test: `Mobile search at ${width}px`,
        inputHeight: `${inputHeight}px`,
        buttonHeight: `${buttonHeight}px`,
        pass: inputPass && buttonPass
      });
    } else {
      console.log(`      ✗ Search elements not found`);
      results.push({
        test: `Mobile search at ${width}px`,
        pass: false
      });
    }
    
    if (width === 390) {
      await page3.screenshot({ path: path.join(SCREENSHOTS_DIR, 'verify-mobile-search-390px.png'), fullPage: true });
      console.log(`      📸 Screenshot saved: verify-mobile-search-390px.png`);
    }
    
    await context3.close();
  }
  
  // Test 4: At 390, verify .qty buttons are at least 44x44px rendered box
  console.log('\n4. Checking quantity buttons at 390px...');
  const context4 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page4 = await context4.newPage();
  
  // Go to product page with quantity selector
  await page4.goto(`${BASE_URL}/products/outrigger-caster-kit-for-series-2000-and-2100.html`);
  await page4.waitForTimeout(1000);
  
  // Find .qty buttons (the - and + buttons in .atc section)
  const qtyButtons = await page4.locator('.atc .qty button').all();
  
  if (qtyButtons.length > 0) {
    let allPass = true;
    console.log(`   Found ${qtyButtons.length} quantity buttons:`);
    
    for (let i = 0; i < qtyButtons.length; i++) {
      const bounds = await qtyButtons[i].boundingBox();
      if (bounds) {
        const width = Math.round(bounds.width);
        const height = Math.round(bounds.height);
        const pass = width >= 44 && height >= 44;
        
        console.log(`      Button ${i + 1}: ${width}px × ${height}px ${pass ? '✓' : '✗'}`);
        
        if (!pass) allPass = false;
      }
    }
    
    results.push({
      test: 'Quantity buttons at 390px',
      buttonCount: qtyButtons.length,
      pass: allPass
    });
  } else {
    console.log(`   ✗ No quantity buttons found`);
    results.push({
      test: 'Quantity buttons at 390px',
      pass: false
    });
  }
  
  await context4.close();
  
  // Test 5: Verify #filterEE is visible (Brand filter group open by default)
  console.log('\n5. Checking #filterEE visibility...');
  const context5 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page5 = await context5.newPage();
  await page5.goto(`${BASE_URL}/search.html`);
  await page5.waitForTimeout(1000);
  
  const filterEE = page5.locator('#filterEE');
  const filterVisible = await filterEE.isVisible();
  
  console.log(`   ${filterVisible ? '✓' : '✗'} #filterEE visible`);
  
  results.push({
    test: '#filterEE visibility',
    visible: filterVisible,
    pass: filterVisible
  });
  
  await context5.close();
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SUMMARY:\n');
  
  const allPass = results.every(r => r.pass);
  
  results.forEach(r => {
    console.log(`${r.pass ? '✅' : '❌'} ${r.test}`);
    Object.keys(r).forEach(key => {
      if (key !== 'test' && key !== 'pass') {
        console.log(`   ${key}: ${r[key]}`);
      }
    });
  });
  
  console.log('\n' + '='.repeat(70));
  
  if (allPass) {
    console.log('\n✅ ALL MEASUREMENTS VERIFIED\n');
  } else {
    console.log('\n❌ SOME MEASUREMENTS FAILED\n');
  }
  
  await browser.close();
  
  return allPass ? 0 : 1;
}

verifyMeasurements()
  .then(exitCode => process.exit(exitCode))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
