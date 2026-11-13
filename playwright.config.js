const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8080/energized-engines-v2',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile-320',
      use: { ...devices['Pixel 5'], viewport: { width: 320, height: 568 } },
    },
    {
      name: 'mobile-390',
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'tablet-768',
      use: { viewport: { width: 768, height: 1024 }, ...devices['Desktop Chrome'] },
    },
    {
      name: 'desktop-1280',
      use: { viewport: { width: 1280, height: 720 }, ...devices['Desktop Chrome'] },
    },
    {
      name: 'desktop-1440',
      use: { viewport: { width: 1440, height: 900 }, ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node serve.js',
    url: 'http://localhost:8080/energized-engines-v2/',
    reuseExistingServer: !process.env.CI,
  },
});
