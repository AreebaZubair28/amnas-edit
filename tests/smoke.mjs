// Run against a locally started or deployed app: TEST_BASE_URL=http://localhost:3000 npm run test:smoke
import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL;
if (!base) {
  console.error("Set TEST_BASE_URL to the application origin (e.g. http://localhost:3000).");
  process.exit(1);
}
const origin = new URL(base).origin;
let failures = 0;

async function check(path, acceptableStatuses = [200]) {
  try {
    const response = await fetch(new URL(path, origin), {
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "amnas-edit-smoke/1.0" },
    });
    assert.ok(acceptableStatuses.includes(response.status), `${path}: unexpected HTTP ${response.status}`);
    const csp = response.headers.get("content-security-policy");
    assert.ok(csp?.includes("default-src 'self'"), `${path}: CSP missing`);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff", `${path}: nosniff missing`);
    console.log(`PASS ${path} (${response.status})`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${path}: ${error.message}`);
  }
}

for (const path of ["/", "/collection", "/policies", "/login", "/robots.txt", "/sitemap.xml"]) {
  await check(path);
}
// The protected area should redirect unauthenticated visitors to login.
// Next.js App Router may emit an unauthenticated redirect inside a streamed
// response with HTTP 200, rather than as an HTTP 3xx response. Verify the
// redirect signal, not just the status; never accept an arbitrary HTTP 200.
async function checkAnonymousAdminRedirect() {
  const path = "/admin";
  try {
    const response = await fetch(new URL(path, origin), {
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "amnas-edit-smoke/1.0" },
    });
    assert.ok(response.headers.get("content-security-policy")?.includes("default-src 'self'"), `${path}: CSP missing`);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff", `${path}: nosniff missing`);

    if ([302, 303, 307, 308].includes(response.status)) {
      const destination = response.headers.get("location");
      assert.ok(destination, `${path}: redirect missing Location header`);
      assert.equal(new URL(destination, origin).pathname, "/login", `${path}: redirect must go to /login`);
    } else if (response.status === 200) {
      const html = await response.text();
      // Next.js streamed redirects carry the NEXT_REDIRECT digest, often
      // with an escaped `\\/` in the HTML / RSC payload.
      const normalized = html.replaceAll('\\"', '"').replaceAll('\\/', '/');
      const hasNextRedirect = /NEXT_REDIRECT/.test(normalized) && /\/login(?:[;?\"<\s]|$)/.test(normalized);
      const hasMetaRefresh = /<meta[^>]+http-equiv=["']refresh["'][^>]+url=\/?login\b/i.test(normalized);
      assert.ok(hasNextRedirect || hasMetaRefresh, `${path}: HTTP 200 without a verifiable login redirect`);
    } else {
      assert.fail(`${path}: unexpected HTTP ${response.status}`);
    }
    console.log(`PASS ${path} (anonymous visitor redirected to /login; HTTP ${response.status})`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${path}: ${error.message}`);
  }
}
await checkAnonymousAdminRedirect();
if (failures) process.exitCode = 1;
