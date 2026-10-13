# Step 8L: read-only browser journey tests

This suite tests both desktop and mobile Chromium against your **local** app. It does not write to Supabase. Product content is read from the configured Supabase project, and the product-detail test is skipped if the catalogue is empty.

From the project root:

1. `npm install -D @playwright/test` (automatically updates your local package-lock.json)
2. `npx playwright install chromium`
3. Terminal A: `npm run dev`
4. Terminal B: `npm run test:e2e`

Set `TEST_BASE_URL` only if your local dev server uses a different port (PowerShell example: `$env:TEST_BASE_URL='http://127.0.0.1:3001'`). Do **not** point this suite at your live production site for routine development tests.

These are intentionally lightweight *smoke journeys*, not comprehensive tests of review submission, pricing calculations, or owner CRUD. Those need separate isolated data fixtures and/or a dedicated test Supabase project to avoid changing real records.

If a test fails, inspect its Playwright trace and screenshot; do not assume a failure automatically means the website is broken. Tests should be updated if the site UI intentionally changes.
