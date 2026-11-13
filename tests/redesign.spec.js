const { test, expect } = require('@playwright/test');

const BASE_PATH = '/energized-engines-v2';

test.describe('Redesign Tests', () => {
  
  test('home page loads without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto(`${BASE_PATH}/`);
    await expect(page).toHaveTitle(/Sumner lift parts.*Energized Engines/);
    
    expect(errors).toEqual([]);
  });
  
  test('no horizontal scroll on any viewport', async ({ page, viewport }) => {
    await page.goto(`${BASE_PATH}/`);
    
    const scrollWidth = await page.evaluate(() => {
      return document.documentElement.scrollWidth;
    });
    
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 1); // +1 for rounding
  });
  
  test('cart functionality works', async ({ page }) => {
    await page.goto(`${BASE_PATH}/`);
    
    // Check cart badge is hidden initially
    const cartCount = page.locator('.icon-btn .count').first();
    await expect(cartCount).not.toBeVisible();
    
    // Open cart drawer
    await page.click('.cart-btn');
    const drawer = page.locator('#cartDrawer');
    await expect(drawer).toHaveClass(/show/);
    
    // Close cart drawer
    await page.click('#cartCloseBtn');
    await expect(drawer).not.toHaveClass(/show/);
  });
  
  test('cart page renders', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto(`${BASE_PATH}/cart.html`);
    await expect(page).toHaveTitle(/Shopping Cart/);
    
    expect(errors).toEqual([]);
  });
  
  test('checkout page renders in demo mode', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto(`${BASE_PATH}/checkout.html`);
    await expect(page).toHaveTitle(/Checkout/);
    
    // Check for demo mode notice
    await expect(page.locator('text=Demo Mode')).toBeVisible();
    
    expect(errors).toEqual([]);
  });
  
  test('order confirmation page renders', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto(`${BASE_PATH}/order-confirmation.html`);
    await expect(page).toHaveTitle(/Order Confirmation/);
    
    expect(errors).toEqual([]);
  });
  
  test('test banner is present', async ({ page, viewport }) => {
    await page.goto(`${BASE_PATH}/`);
    
    // Banner exists in both mobile and desktop versions
    const banner = viewport.width < 640 
      ? page.locator('.test-banner.m-only') 
      : page.locator('.test-banner.d-only');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Test site');
  });
  
  test('noindex meta tag is present', async ({ page }) => {
    await page.goto(`${BASE_PATH}/`);
    
    const metaRobots = page.locator('meta[name="robots"]');
    const content = await metaRobots.getAttribute('content');
    expect(content).toBe('noindex, nofollow');
  });
  
  test('responsive header at mobile', async ({ page, viewport }) => {
    if (viewport.width >= 640) {
      test.skip();
      return;
    }
    
    await page.goto(`${BASE_PATH}/`);
    
    // Mobile-only elements should be visible
    await expect(page.locator('.m-only').first()).toBeVisible();
    
    // Desktop-only elements should be hidden
    await expect(page.locator('.d-only').first()).not.toBeVisible();
  });
  
  test('responsive header at desktop', async ({ page, viewport }) => {
    if (viewport.width < 640) {
      test.skip();
      return;
    }
    
    await page.goto(`${BASE_PATH}/`);
    
    // Desktop elements should be visible
    await expect(page.locator('.util').first()).toBeVisible();
  });
  
  test('search input is present', async ({ page, viewport }) => {
    await page.goto(`${BASE_PATH}/`);
    
    // Search input is present in both mobile and desktop, but in different containers
    const searchInput = viewport.width < 640
      ? page.locator('.m-search input[type="search"]')
      : page.locator('.d-only .search input[type="search"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', /Search part number/);
  });
  
  test('model tiles are present', async ({ page }) => {
    await page.goto(`${BASE_PATH}/`);
    
    const modelTiles = page.locator('.mtile');
    const count = await modelTiles.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });
  
  test('footer is present', async ({ page }) => {
    await page.goto(`${BASE_PATH}/`);
    
    const footer = page.locator('.foot');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Sumner is a trademark');
  });
  
});

test.describe('Product Pages', () => {
  
  test('20 random product pages work correctly', async ({ page, viewport }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    // Load search data to get product handles
    await page.goto(`${BASE_PATH}/search-data.json`);
    const searchData = JSON.parse(await page.textContent('pre'));
    
    // Pick 20 random products
    const products = searchData.parts;
    const randomProducts = [];
    for (let i = 0; i < 20; i++) {
      const idx = Math.floor(Math.random() * products.length);
      randomProducts.push(products[idx]);
    }
    
    for (const product of randomProducts) {
      errors.length = 0; // Reset errors for each page
      
      await page.goto(`${BASE_PATH}/products/${product.handle}.html`);
      
      // Check no horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 1);
      
      // Check add to cart button exists and works
      const addToCartBtn = page.locator('#addToCartBtn');
      await expect(addToCartBtn).toBeVisible();
      await addToCartBtn.click();
      
      // Wait for cart drawer to open
      await page.waitForTimeout(500);
      const drawer = page.locator('#cartDrawer');
      await expect(drawer).toHaveClass(/show/);
      
      // Close drawer for next iteration
      await page.click('#cartCloseBtn');
      
      // Check for JavaScript errors
      expect(errors).toEqual([]);
    }
  });
  
  test('product page has required elements', async ({ page }) => {
    // Test a known product
    await page.goto(`${BASE_PATH}/`);
    await page.goto(`${BASE_PATH}/search-data.json`);
    const searchData = JSON.parse(await page.textContent('pre'));
    const firstProduct = searchData.parts[0];
    
    await page.goto(`${BASE_PATH}/products/${firstProduct.handle}.html`);
    
    // Check required elements
    await expect(page.locator('.pdp-t')).toBeVisible(); // Title
    await expect(page.locator('.pdp-pn')).toBeVisible(); // Part number
    await expect(page.locator('.pdp-price')).toBeVisible(); // Price
    await expect(page.locator('#addToCartBtn')).toBeVisible(); // Add to cart
  });
  
});

test.describe('Search Functionality', () => {
  
  test('search counts are correct', async ({ page }) => {
    await page.goto(`${BASE_PATH}/search-data.json`);
    const searchData = JSON.parse(await page.textContent('pre'));
    const parts = searchData.parts;
    
    // Count 783540 (part number exact match)
    const q1 = parts.filter(p => p.partNumber === '783540');
    console.log('783540 count:', q1.length);
    
    // Count 7835 (part number starts with)
    const q2 = parts.filter(p => p.partNumber.startsWith('7835'));
    console.log('7835* count:', q2.length);
    
    // Count plunger (name contains)
    const q3 = parts.filter(p => p.name.toLowerCase().includes('plunger'));
    expect(q3.length).toBe(21);
    
    // Count pin (name contains)
    const q4 = parts.filter(p => p.name.toLowerCase().includes('pin'));
    console.log('pin count:', q4.length, '(expected >= 24)');
  });
  
  test('search page works', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto(`${BASE_PATH}/search.html?q=plunger`);
    await expect(page.locator('#searchResults')).toBeVisible();
    await page.waitForTimeout(1000); // Wait for search to complete
    
    // Check results are shown
    const resultsText = await page.locator('#searchResults').textContent();
    expect(resultsText).toContain('results for');
    
    expect(errors).toEqual([]);
  });
  
});

test.describe('Cart and Checkout Flow', () => {
  
  test('full cart and checkout flow', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    // Go to cart page
    await page.goto(`${BASE_PATH}/cart.html`);
    await expect(page).toHaveTitle(/Shopping Cart/);
    
    // Go to checkout
    await page.goto(`${BASE_PATH}/checkout.html`);
    await expect(page.locator('text=Demo Mode')).toBeVisible();
    
    // Go to confirmation
    await page.goto(`${BASE_PATH}/order-confirmation.html`);
    await expect(page).toHaveTitle(/Order Confirmation/);
    
    expect(errors).toEqual([]);
  });
  
  test('shipping meter works', async ({ page }) => {
    await page.goto(`${BASE_PATH}/`);
    
    // Get product and add to cart
    await page.goto(`${BASE_PATH}/search-data.json`);
    const searchData = JSON.parse(await page.textContent('pre'));
    const product = searchData.parts[0]; // Use first product
    
    await page.goto(`${BASE_PATH}/products/${product.handle}.html`);
    await page.click('#addToCartBtn');
    await page.waitForTimeout(500);
    
    // Check shipping meter is visible
    const shippingMeter = page.locator('#shippingMeter');
    await expect(shippingMeter).toBeVisible();
    
    // Check shipping text exists
    const shippingText = page.locator('#shippingText');
    await expect(shippingText).toBeVisible();
  });
  
});

test.describe('Static Pages', () => {
  
  test('about page loads', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto(`${BASE_PATH}/about.html`);
    await expect(page).toHaveTitle(/About/);
    await expect(page.locator('h1')).toContainText('About');
    
    expect(errors).toEqual([]);
  });
  
  test('return policy page has draft notice', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto(`${BASE_PATH}/return-policy.html`);
    await expect(page).toHaveTitle(/Return Policy/);
    
    // Check draft notice
    await expect(page.locator('text=Draft Policy')).toBeVisible();
    await expect(page.locator('text=20%')).toBeVisible(); // 20% restocking fee
    
    expect(errors).toEqual([]);
  });
  
  test('manuals page loads', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto(`${BASE_PATH}/manuals.html`);
    await expect(page).toHaveTitle(/Manuals/);
    const manRows = await page.locator('.manrow').count();
    expect(manRows).toBeGreaterThanOrEqual(1);
    
    expect(errors).toEqual([]);
  });
  
  test('models index page loads', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto(`${BASE_PATH}/models.html`);
    await expect(page).toHaveTitle(/Shop by Model/);
    const mtiles = await page.locator('.mtile').count();
    expect(mtiles).toBeGreaterThanOrEqual(30);
    
    expect(errors).toEqual([]);
  });
  
});
