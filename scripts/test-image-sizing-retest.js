#!/usr/bin/env node
/**
 * Re-test image sizing at 320px and 390px viewports after CSS fix
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

// Using the same products as before, with the problematic EE 1021
const PRODUCTS = [
  { file: 'outrigger-caster-kit-for-series-2000-and-2100.html', name: 'EE 1021 Outrigger Caster' },
  { file: 'sumner-780271-ball-caster-assembly.html', name: 'Sumner 780271 Caster Assembly' },
  { file: 'sumner-783540-mast-roller-1.html', name: 'Sumner 783540 Mast Roller' }
];

const VIEWPORTS = [
  { width: 320, height: 568, name: '320px' },
  { width: 390, height: 844, name: '390px' }
];

async function testImageSizing() {
  const browser = await chromium.launch();
  const results = [];
  
  console.log('\n🔍 RE-TESTING IMAGE SIZING AFTER CSS FIX\n');
  console.log('='.repeat(70));
  console.log('CSS Fix Applied: width:auto; height:auto; (instead of 100%)');
  console.log('='.repeat(70));
  
  for (const viewport of VIEWPORTS) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`VIEWPORT: ${viewport.name} (${viewport.width}×${viewport.height})`);
    console.log('='.repeat(70));
    
    for (const product of PRODUCTS) {
      console.log(`\n📦 Testing: ${product.name}`);
      
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      
      try {
        await page.goto(`${BASE_URL}/products/${product.file}`);
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        await page.waitForTimeout(500);
        
        // Measure .gal-main container
        const galMain = page.locator('.gal-main').first();
        const galBounds = await galMain.boundingBox();
        
        if (!galBounds) {
          console.log(`   ❌ Could not find .gal-main element`);
          results.push({
            viewport: viewport.name,
            product: product.name,
            pass: false,
            error: 'Element not found'
          });
          await context.close();
          continue;
        }
        
        // Measure .gal-main img element
        const galImg = page.locator('.gal-main img').first();
        const imgBounds = await galImg.boundingBox();
        
        if (!imgBounds) {
          console.log(`   ❌ Could not find img element`);
          results.push({
            viewport: viewport.name,
            product: product.name,
            frameHeight: `${Math.round(galBounds.height)}px`,
            pass: false,
            error: 'Image not found'
          });
          await context.close();
          continue;
        }
        
        const frameWidth = Math.round(galBounds.width);
        const frameHeight = Math.round(galBounds.height);
        const imgWidth = Math.round(imgBounds.width);
        const imgHeight = Math.round(imgBounds.height);
        const pass = imgHeight <= frameHeight + 1; // Allow 1px tolerance
        const status = pass ? '✅' : '❌';
        
        console.log(`   Frame (.gal-main): ${frameWidth}px × ${frameHeight}px`);
        console.log(`   Image (img):       ${imgWidth}px × ${imgHeight}px`);
        console.log(`   ${status} Image height ${imgHeight}px ${pass ? '≤' : '>'} Frame height ${frameHeight}px`);
        
        if (!pass) {
          console.log(`   ⚠️  Image STILL overflows by ${imgHeight - frameHeight}px`);
        }
        
        results.push({
          viewport: viewport.name,
          product: product.name,
          frameWidth: `${frameWidth}px`,
          frameHeight: `${frameHeight}px`,
          imgWidth: `${imgWidth}px`,
          imgHeight: `${imgHeight}px`,
          pass,
          difference: imgHeight - frameHeight
        });
        
        // Take screenshot for EE 1021 at 390px to compare
        if (product.file.includes('outrigger-caster') && viewport.width === 390) {
          await page.screenshot({ 
            path: path.join(SCREENSHOTS_DIR, 'verify-ee1021-image-390px-FIXED.png'),
            fullPage: false
          });
          console.log(`   📸 Screenshot saved: verify-ee1021-image-390px-FIXED.png`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.push({
          viewport: viewport.name,
          product: product.name,
          pass: false,
          error: error.message
        });
      }
      
      await context.close();
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 DETAILED COMPARISON TABLE\n');
  console.log('='.repeat(70));
  console.log('\nProduct                          Viewport  Frame     Image     Status');
  console.log('-'.repeat(70));
  
  results.forEach(r => {
    const name = r.product.substring(0, 30).padEnd(30);
    const viewport = r.viewport.padEnd(8);
    const frame = r.frameHeight ? r.frameHeight.padEnd(8) : 'N/A'.padEnd(8);
    const img = r.imgHeight ? r.imgHeight.padEnd(8) : 'N/A'.padEnd(8);
    const status = r.pass ? '✅ Pass' : '❌ FAIL';
    
    console.log(`${name}  ${viewport}  ${frame}  ${img}  ${status}`);
    
    if (r.difference !== undefined && r.difference > 1) {
      console.log(`${''.padEnd(30)}            ⚠️  Still overflows: ${r.difference}px`);
    }
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SUMMARY\n');
  
  const passCount = results.filter(r => r.pass).length;
  const totalCount = results.length;
  const allPass = results.every(r => r.pass);
  
  console.log(`Total tests: ${totalCount}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${totalCount - passCount}`);
  console.log(`Pass rate: ${((passCount/totalCount)*100).toFixed(1)}%`);
  
  console.log('\n' + '='.repeat(70));
  
  if (allPass) {
    console.log('\n✅ ALL TESTS PASSED - CSS fix successful!\n');
    console.log('All images now fit within their frames at both 320px and 390px.\n');
  } else {
    console.log('\n❌ SOME TESTS STILL FAILING - CSS fix incomplete\n');
    console.log('Some images still overflow their frames.\n');
  }
  
  await browser.close();
  
  return allPass ? 0 : 1;
}

testImageSizing()
  .then(exitCode => process.exit(exitCode))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
