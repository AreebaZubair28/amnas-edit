# Step 8P — Production readiness checklist

This checklist applies to the *local* tested build of Amna’s Edit. Passing local tests does not automatically deploy the changes to Vercel.

## Before deployment

- [ ] Confirm `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build` pass locally.
- [ ] Run `npm run test:e2e` against `npm run start` with the full test suite. Owner-only tests require credentials supplied **locally**, never committed.
- [ ] Confirm Vercel's Production environment contains `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_INSTAGRAM_URL`, and `NEXT_PUBLIC_SITE_URL=https://amnas-edit.vercel.app`.
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` and `REVIEW_RATE_LIMIT_SECRET` are configured as server-only environment variables in Vercel, and **not** exposed with a `NEXT_PUBLIC_` prefix. Do not share their values.
- [ ] Review Supabase database migrations and RLS policies against the current production project before applying any database changes. Do not apply SQL files blindly.
- [ ] Run `npm audit --omit=dev` and review any newly reported production dependency advisories. Previously documented audit findings concern development dependencies.
- [ ] Confirm `.env.local`, credentials, `.next`, `node_modules`, Playwright traces, and local cache files are not committed.

## After deployment

- [ ] Verify `/`, `/collection`, `/policies`, and a product detail page on desktop and mobile.
- [ ] Check product images, search, filtering, and WhatsApp/Instagram enquiry links.
- [ ] Verify owner login and protected admin routes without changing production records.
- [ ] Run `TEST_BASE_URL=https://amnas-edit.vercel.app npm run test:smoke` in a Bash shell. In PowerShell use `$env:TEST_BASE_URL = "https://amnas-edit.vercel.app"; npm run test:smoke`.
- [ ] Confirm social share metadata resolves with the production domain.
- [ ] Check Vercel runtime logs for errors and verify your analytics/review endpoints in a non-destructive manner.

No production deploy, Supabase migration, or live authenticated test is performed by this checklist.
