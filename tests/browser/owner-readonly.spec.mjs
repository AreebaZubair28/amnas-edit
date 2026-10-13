import { test, expect } from '@playwright/test';

// Step 8N: optional, read-only checks of REAL server-authorized owner pages.
// No product/review/promotion/settings write actions are performed.
// We deliberately disable traces and screenshots so login credentials and
// private dashboard information are not written to Playwright artifacts.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

const email = process.env.ADMIN_E2E_EMAIL;
const password = process.env.ADMIN_E2E_PASSWORD;
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

// Never test authenticated business operations on the live Vercel origin.
const origin = new URL(baseURL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) {
  throw new Error('Owner E2E tests must run against localhost, not the deployed website.');
}

test.describe('owner dashboard read-only journeys', () => {
  test.skip(!email || !password, 'Set ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD in your terminal to opt in.');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/admin(?:\/?|\?.*)$/, { timeout: 20000 });
    await expect(page.getByRole('navigation', { name: 'Owner dashboard navigation' })).toBeVisible({ timeout: 20000 });
  });

  test('owner navigation reaches every protected section', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Owner dashboard navigation' });
    for (const [text, path] of [
      ['Products', '/admin/products'],
      ['Promotions', '/admin/promotions'],
      ['Reviews', '/admin/reviews'],
      ['Website Settings', '/admin/settings'],
      ['Overview', '/admin'],
    ]) {
      await nav.getByRole('link', { name: new RegExp(`^${text}(?:\\s*\\d+)?$`) }).click();
      await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}(?:\\/?|\\?.*)$`));
      await expect(nav).toBeVisible();
    }
  });

  test('product editor opens and closes without saving', async ({ page }) => {
    await page.goto('/admin/products');
    await expect(page.getByRole('navigation', { name: 'Owner dashboard navigation' })).toBeVisible();
    await page.getByRole('button', { name: 'Add Product' }).click();
    await expect(page.getByRole('dialog', { name: 'Add a new piece' })).toBeVisible();
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Discard the changes you have not saved?');
      await dialog.accept();
    });
    await page.getByRole('button', { name: 'Close product editor' }).click();
    await expect(page.getByRole('dialog', { name: 'Add a new piece' })).toHaveCount(0);
  });

  test('promotion editor opens and closes without saving', async ({ page }) => {
    await page.goto('/admin/promotions');
    await expect(page.getByRole('navigation', { name: 'Owner dashboard navigation' })).toBeVisible();
    await page.getByRole('button', { name: 'New Sale' }).click();
    await expect(page.getByRole('dialog', { name: /sale|promotion/i })).toBeVisible();
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Discard the changes you have not saved?');
      await dialog.accept();
    });
    await page.getByRole('button', { name: 'Close promotion editor' }).click();
    await expect(page.getByRole('dialog', { name: /sale|promotion/i })).toHaveCount(0);
  });

  test('reviews and settings headings display without updates', async ({ page }) => {
    await page.goto('/admin/reviews');
    await expect(page.getByRole('heading', { name: 'Reviews & approvals.' })).toBeVisible();
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'Keep your website up to date.' })).toBeVisible();
  });
});
