import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

test("required storefront and owner routes exist", () => {
  for (const path of [
    "app/page.tsx", "app/collection/page.tsx", "app/policies/page.tsx",
    "app/login/page.tsx", "app/admin/layout.tsx", "app/admin/page.tsx",
    "app/admin/products/page.tsx", "app/admin/promotions/page.tsx",
    "app/admin/reviews/page.tsx", "app/admin/settings/page.tsx",
    "app/products/[slug]/page.tsx", "app/not-found.tsx", "app/error.tsx",
  ]) assert.ok(existsSync(resolve(root, path)), `Missing route: ${path}`);
});

test("admin layout checks signed-in claims and owner authorization", () => {
  const src = read("app/admin/layout.tsx");
  assert.match(src, /auth\.getClaims\s*\(/);
  assert.match(src, /rpc\(\s*["']is_owner["']/);
  assert.match(src, /redirect\(\s*["']\/login["']/);
});

test("session refresh proxy covers admin routes", () => {
  assert.match(read("proxy.ts"), /updateSession\(request\)/);
  assert.match(read("proxy.ts"), /\/admin\/:path\*/);
});

test("baseline browser security policies remain configured", () => {
  const src = read("next.config.ts");
  for (const header of ["Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy"]) {
    assert.ok(src.includes(header), `Missing header: ${header}`);
  }
  for (const directive of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'"]) {
    assert.ok(src.includes(directive), `Missing CSP directive: ${directive}`);
  }
});

test("review API validates key inputs before writing", () => {
  const src = read("app/api/reviews/route.ts");
  for (const check of ["UUID_PATTERN.test", "customerName.length", "reviewText.length", "Number.isInteger(rating)"]) {
    assert.ok(src.includes(check), `Missing input validation: ${check}`);
  }
  assert.ok(src.includes("REVIEW_RATE_LIMIT_SECRET"));
});

test("analytics events are allowlisted and recorded via database RPC", () => {
  const src = read("app/api/analytics/route.ts");
  for (const event of ["product_view", "whatsapp_click", "instagram_click"]) assert.ok(src.includes(event));
  assert.ok(src.includes("ALLOWED_EVENTS.has(eventType)"));
  assert.ok(src.includes("record_analytics_event_secure"));
});

test("environment secrets are not bundled in example config", () => {
  const example = read(".env.example");
  assert.match(example, /SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(example, /REVIEW_RATE_LIMIT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET/);
  assert.ok(read(".gitignore").includes(".env*"));
});
