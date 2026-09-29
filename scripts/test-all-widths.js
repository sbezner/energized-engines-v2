const { chromium } = require('playwright');
const path = require('path');

const widths = [320, 390, 769, 1280, 1440];
const baseURL = `file://${path.resolve(__dirname, '../docs')}`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  for (const width of widths) {
    console.log(`\n=== Testing at ${width}px width ===`);
    const context = await browser.newContext({
      viewport: { width, height: 1080 }
    });
    const page = await context.newPage();
    
    // Test home page
    await page.goto(`${baseURL}/index.html`);
    await page.waitForLoadState('networkidle');
    console.log(`✓ Home page loaded at ${width}px`);
    
    // Test search page
    await page.goto(`${baseURL}/search.html`);
    await page.waitForLoadState('networkidle');
    console.log(`✓ Search page loaded at ${width}px`);
    
    // Test model page
    await page.goto(`${baseURL}/models/2015.html`);
    await page.waitForLoadState('networkidle');
    console.log(`✓ Model page loaded at ${width}px`);
    
    // Test product page
    await page.goto(`${baseURL}/products/sumner-2118-lift-decals.html`);
    await page.waitForLoadState('networkidle');
    console.log(`✓ Product page loaded at ${width}px`);
    
    await context.close();
  }
  
  await browser.close();
  console.log('\n✓ All viewport tests passed!');
})();
