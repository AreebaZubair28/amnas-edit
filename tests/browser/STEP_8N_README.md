# Step 8N — Read-only authenticated owner tests

The current server-side `/admin` guard validates Supabase authentication **and** the `is_owner` RPC. Fake browser tokens would not test this guard honestly. These tests therefore use an **explicit, optional** owner login against a locally running application. They do not create, save, delete, approve or publish data. Authentication itself may create Supabase auth log entries; the app still connects to whichever database `.env.local` configures.

Run `npm run build` and `npm run start` in a terminal (not `npm run dev`). In a **second PowerShell terminal**, set your credentials for *that terminal session only*:

```powershell
$env:ADMIN_E2E_EMAIL = 'your-owner-email'
$env:ADMIN_E2E_PASSWORD = 'your-owner-password'
npx playwright test owner-readonly.spec.mjs
Remove-Item Env:ADMIN_E2E_EMAIL, Env:ADMIN_E2E_PASSWORD
```

Do not paste the password into chat, save it in source code, commit it, or include it in screenshots. Running this test without credentials safely **skips** the tests. The local hostname guard rejects production website URLs. Trace, video and failure screenshots are disabled for these sensitive tests.

These tests only cover navigation and opening/closing unsaved product/promotion editors. They do **not** validate writing data, approval rules, RLS policies, or complete owner workflows. Those would require an isolated staging Supabase project and test records.
