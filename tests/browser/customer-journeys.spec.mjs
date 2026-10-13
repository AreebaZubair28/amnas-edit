import { test, expect } from '@playwright/test';

// Read-only checks: never submit reviews, authenticate or alter inventory.
async function openReadyCatalogue(page) {
  await page.goto('/collection');
  await expect(page.getByRole('heading', { name: 'Our Collection' })).toBeVisible();
  // Distinguish normal loading from data errors, which previously produced
  // misleading missing-element / timeout failures.
  await expect(page.locator('.product-grid, .empty, .load-error-card')).toBeVisible({ timeout: 20000 });
  const error = page.locator('.load-error-card');
  if (await error.isVisible()) {
    throw new Error(`Catalogue data did not load: ${(await error.innerText()).trim()}. Check your local Supabase environment/network.`);
  }
}

test('storefront navigation loads collection and policies', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toContainText('Amna');
  await page.goto('/collection');
  await expect(page.getByRole('heading', { name: 'Our Collection' })).toBeVisible();
  await page.goto('/policies');
  await expect(page.locator('main')).toBeVisible();
});

test('search with no matches can be cleared', async ({ page }) => {
  await openReadyCatalogue(page);
  const search = page.getByRole('textbox', { name: 'Search products' });
  await search.fill('zzzz_no_matching_piece_8l_9372');
  await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();
  await expect(page.locator('.empty[role="status"]')).toContainText(/No pieces match\s+these filters/i);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(search).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0);
});

test('catalogue status filter can be changed and reset', async ({ page }) => {
  await openReadyCatalogue(page);
  const status = page.getByRole('combobox', { name: 'Filter by product status' });
  await expect(status).toHaveValue('All');
  await status.selectOption('in_stock');
  await expect(status).toHaveValue('in_stock');
  await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(status).toHaveValue('All');
});

test('product detail opens from an available product card', async ({ page }) => {
  await openReadyCatalogue(page);
  // Wait for a real product rather than checking the count once during loading.
  // Missing catalogue data should fail the test, not silently skip coverage.
  const firstCard = page.locator('.product-grid .product-card[role="button"]').first();
  await expect(firstCard).toBeVisible({ timeout: 20000 });
  await firstCard.click();
  await expect(page.getByRole('button', { name: 'Close product details' })).toBeVisible();
  await page.getByRole('button', { name: 'Close product details' }).click();
  await expect(page.getByRole('button', { name: 'Close product details' })).toHaveCount(0);
});

test('unauthenticated visitor cannot access owner dashboard', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
});

test('owner login requires email and password', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[type="email"]')).toHaveAttribute('required', '');
  await expect(page.locator('input[type="password"]')).toHaveAttribute('required', '');
});
