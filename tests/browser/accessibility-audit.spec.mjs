import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Automated audit only. Does not sign in, submit forms, or modify Supabase data.
// Run against a locally started production build: npm run build && npm run start.
const routes = [
  { path: '/', label: 'homepage' },
  { path: '/collection', label: 'collection' },
  { path: '/policies', label: 'policies' },
  { path: '/login', label: 'owner login' },
];

async function waitForCollection(page) {
  await expect(page.locator('.product-grid, .empty, .load-error-card')).toBeVisible({ timeout: 20000 });
  const error = page.locator('.load-error-card');
  if (await error.isVisible()) {
    throw new Error(`Collection failed to load: ${(await error.innerText()).trim()}`);
  }
}

async function checkA11y(page, label) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = results.violations.map((v) =>
    `${v.id} (${v.impact}): ${v.help}\n` +
    v.nodes.slice(0, 4).map((n) => `  ${n.target.join(', ')}: ${n.failureSummary || ''}`).join('\n')
  ).join('\n\n');
  expect(results.violations, `Accessibility findings on ${label}:\n${summary}`).toEqual([]);
}

for (const route of routes) {
  test(`${route.label}: WCAG A/AA automated audit`, async ({ page }) => {
    await page.goto(route.path);
    if (route.path === '/collection') await waitForCollection(page);
    await checkA11y(page, route.label);
  });
}

test('product dialog: WCAG A/AA automated audit', async ({ page }) => {
  await page.goto('/collection');
  await waitForCollection(page);
  const firstCard = page.locator('.product-card[role="button"]').first();
  await expect(firstCard, 'Expected a product card; do not silently skip this audit').toBeVisible({ timeout: 20000 });
  await firstCard.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await checkA11y(page, 'open product dialog');
});
