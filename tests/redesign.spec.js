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
    await expect(modelTiles).toHaveCount(8);
  });
  
  test('footer is present', async ({ page }) => {
    await page.goto(`${BASE_PATH}/`);
    
    const footer = page.locator('.foot');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Sumner is a trademark');
  });
  
});
