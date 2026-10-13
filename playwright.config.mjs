import { defineConfig, devices } from '@playwright/test';

// Run against the local dev server; this does not touch the deployed Vercel site.
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  expect: { timeout: 10000 },
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
});
