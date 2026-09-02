// VG-2: Real-browser GA4 validation. Launches the pinned Chromium build,
// drives real user flows against the running dev server, and captures every
// GA4 /g/collect request off the wire. No mocks, no stubs — this asserts on
// the actual network payloads GA4 receives.
import { chromium } from 'playwright-core';
import fs from 'fs';

const EXEC = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  '/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome',
  '/home/runner/workspace/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome',
].filter(Boolean).find((candidate) => fs.existsSync(candidate));
const BASE = 'http://localhost:5000';
const OUT = '/home/runner/workspace/evidence';
const TS = Date.now();
const EXPECTED_BROWSER_ERROR = 'VG2 deliberate browser error';

// ---------------------------------------------------------------------------
// Clerk test-account plumbing (task #393 — real `login` / `sign_up` conversions)
// ---------------------------------------------------------------------------
// The auth conversions can only be observed by completing a REAL Clerk attempt
// through the prebuilt <SignIn>/<SignUp> UI, so the harness registers and signs
// in a throwaway account on the development instance and deletes it afterwards.
// Three Clerk testing affordances make that possible headlessly:
//   · a `+clerk_test` email subaddress, whose email code is the fixed, publicly
//     documented value below (it only ever unlocks these fake addresses on a
//     development instance — override with CLERK_TEST_VERIFICATION_CODE);
//   · a testing token (Backend API POST /testing_tokens) appended to every FAPI
//     request, so Clerk accepts the scripted attempt instead of answering
//     "Bot traffic detected";
//   · `Clerk.client.captchaBypass`, forced on so clerk-js skips the Cloudflare
//     Turnstile widget it would otherwise render before POSTing a sign-up.
//     Turnstile serves an interactive challenge to headless Chromium that no
//     script can honestly clear, and it guards ONLY registration — sign-in
//     never invokes it. Nothing about the measurement under test is faked: the
//     registration, the session, the app code and the GA4 network path are all
//     real; only the third-party bot gate in front of them is stepped around.
// Without Clerk keys, or on a production instance, the auth flows are SKIPPED
// loudly rather than silently passing.
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || '';
const CLERK_PUBLISHABLE_KEY =
  process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY || '';
const CLERK_TEST_CODE = process.env.CLERK_TEST_VERIFICATION_CODE || '424242';
const AUTH_FLOWS_READY = Boolean(CLERK_SECRET_KEY) && CLERK_PUBLISHABLE_KEY.startsWith('pk_test_');

/** Clerk's Frontend API host is base64-encoded into the publishable key. */
function fapiHostFromPublishableKey(pk) {
  try {
    return Buffer.from(pk.replace(/^pk_(test|live)_/, ''), 'base64').toString('utf8').replace(/\$$/, '');
  } catch {
    return '';
  }
}

/** Returns the throwaway Clerk account, or undefined when it does not exist. */
async function findClerkUser() {
  const found = await clerkApi('GET', `/users?email_address=${encodeURIComponent(QA_EMAIL)}`);
  return (Array.isArray(found) ? found : found.data ?? [])[0];
}

async function clerkApi(method, apiPath, body) {
  const res = await fetch(`https://api.clerk.com/v1${apiPath}`, {
    method,
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Clerk ${method} ${apiPath} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

// Throwaway identity. The local-part carries the `__qa_test_` prefix the
// project's teardown sweeps, and the address ends in `+clerk_test@example.com`
// so Clerk treats it as a test email. The password is generated per run and
// never written to evidence.
const QA_EMAIL = `__qa_test_ga4_${TS}+clerk_test@example.com`;
const QA_PASSWORD = `Qa!${TS}${Math.random().toString(36).slice(2, 10)}`;

const raw = [];   // full request records
const events = [];// flattened parsed events with a monotonic seq
let seq = 0;

// GA4 collect: shared/session params live in the query string; each event's
// own params are `en`, `ep.*` (strings), `epn.*` (numbers), plus `_et`. When
// multiple events batch, extra events arrive as newline-delimited lines in the
// POST body. Merge shared query params (minus event-specific keys) into each
// body-line event so per-event context (dl/dt/dr/cid) is preserved without
// leaking event #1's own ep.* into siblings.
function eventsFromRequest(url, postData) {
  const u = new URL(url);
  const q = Object.fromEntries(u.searchParams.entries());
  const shared = {};
  for (const [k, v] of Object.entries(q)) {
    if (k.startsWith('ep.') || k.startsWith('epn.') || ['en', '_et', '_ee', '_c'].includes(k)) continue;
    shared[k] = v;
  }
  const units = [];
  if (q.en) units.push(q); // single-event GET/POST: query carries everything
  if (postData) {
    for (const line of postData.split('\n')) {
      if (!line.trim()) continue;
      const p = Object.fromEntries(new URLSearchParams(line).entries());
      if (!p.en) continue;
      units.push({ ...shared, ...p });
    }
  }
  return units;
}

function record(req) {
  const url = req.url();
  if (!url.includes('google-analytics.com') && !url.includes('analytics.google.com')) return;
  if (!url.includes('/collect')) return;
  const postData = req.postData() || '';
  raw.push({ ts: Date.now(), method: req.method(), url, postData });
  for (const ev of eventsFromRequest(url, postData)) {
    events.push({ seq: seq++, en: ev.en, dl: ev.dl || '', dt: ev.dt || '', dr: ev.dr || '', params: ev });
  }
}

const LOG = `${OUT}/vg2-run.log`;
try { fs.writeFileSync(LOG, ''); } catch {}
function log(line) {
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch {}
}

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || '' });
  log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}
// A skipped flow never counts as verified: it is reported in its own row so a
// run that could not exercise something says so out loud instead of looking green.
function skip(name, detail) {
  results.push({ name, pass: true, skipped: true, detail: detail || '' });
  log(`SKIP  ${name}${detail ? '  — ' + detail : ''}`);
}

function evByName(en, sinceSeq = -1) {
  return events.filter((e) => e.en === en && e.seq > sinceSeq);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let PAGE = null;
// GA4 (gtag) batches events and flushes on visibilitychange->hidden / pagehide.
// Under a scripted browser we must force that flush before asserting or before a
// full-reload navigation discards the queued batch. Toggle hidden->visible so
// the beacon fires without leaving the page inert for subsequent interactions.
async function flushGA() {
  try {
    await PAGE.evaluate(() => {
      try { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); } catch {}
      document.dispatchEvent(new Event('visibilitychange'));
      try { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); } catch {}
    });
  } catch { /* page may be navigating */ }
  await sleep(1600);
}

// Wait until gtag.js has loaded and sent its first /collect (cold first paint
// can take several seconds); prevents racing early events against a warming SDK.
async function waitForCollect(min = 1, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (raw.length >= min) return true;
    await sleep(500);
  }
  return false;
}

// Poll until an event named `name` (after sinceSeq) is captured off the wire,
// forcing a GA flush on each iteration. Fresh full-page loads take several
// seconds for gtag.js to load + drain its queue, so a fixed sleep races the
// batch. This asserts on the REAL network payload once it actually arrives.
async function waitForEvent(name, sinceSeq, timeout = 14000) {
  const start = Date.now();
  if (evByName(name, sinceSeq).length >= 1) return true;
  while (Date.now() - start < timeout) {
    await flushGA(); // ~1.6s per iteration
    if (evByName(name, sinceSeq).length >= 1) return true;
  }
  return false;
}

async function waitForPerformanceMetric(metricName, sinceSeq, timeout = 14000) {
  const start = Date.now();
  const hasMetric = () =>
    evByName('performance', sinceSeq).some((event) => event.params['ep.metric_name'] === metricName);
  if (hasMetric()) return true;
  while (Date.now() - start < timeout) {
    await flushGA();
    if (hasMetric()) return true;
  }
  return false;
}

// Clerk's OTP field is a row of single-character inputs that auto-advance, so
// the code has to be typed key by key into the focused control (a bulk fill()
// lands entirely in the first box). Returns false when no code step appeared —
// a password sign-in on a trusted device skips it.
async function enterClerkCode(page) {
  const otp = page
    .locator('input[autocomplete="one-time-code"], input[name^="codeInput"], input[inputmode="numeric"]')
    .first();
  if (!(await otp.waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false))) {
    return false;
  }
  await otp.click();
  await page.keyboard.type(CLERK_TEST_CODE, { delay: 120 });
  return true;
}

/**
 * Ends the session through Clerk itself rather than the app's /logout route:
 * that route is a full document load, and the harness only needs the signed-out
 * state, not another page transition to measure.
 */
async function clerkSignOut(page) {
  await page.evaluate(async () => {
    await window.Clerk?.signOut?.();
  });
  await page.waitForFunction(() => !window.Clerk?.user, null, { timeout: 15000 }).catch(() => {});
  await sleep(1500);
}

async function main() {
  const catalogResponse = await fetch(`${BASE}/api/awesome-list`);
  if (!catalogResponse.ok) {
    throw new Error(`Could not load a resource for GA validation (${catalogResponse.status})`);
  }
  const catalog = await catalogResponse.json();
  const RESOURCE_ID = catalog.resources?.[0]?.id;
  if (!RESOURCE_ID) throw new Error('Catalog returned no resource for GA validation');
  const CATEGORY = catalog.categories?.find((c) => c.slug && c.name);
  if (!CATEGORY) throw new Error('Catalog returned no category for GA validation');

  const browser = await chromium.launch({
    ...(EXEC ? { executablePath: EXEC } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  context.setDefaultTimeout(8000);
  context.setDefaultNavigationTimeout(30000);

  // Bot-gate plumbing for the auth flows only (see the header note): the
  // testing token goes on every Frontend API call, and the bypass flag is
  // re-asserted on an interval because clerk-js resets it from every /v1/client
  // payload it receives.
  if (AUTH_FLOWS_READY) {
    const fapiHost = fapiHostFromPublishableKey(CLERK_PUBLISHABLE_KEY);
    const testingToken = (await clerkApi('POST', '/testing_tokens')).token;
    if (!fapiHost || !testingToken) throw new Error('Could not prepare a Clerk testing token');
    await context.route(`https://${fapiHost}/**`, async (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set('__clerk_testing_token', testingToken);
      await route.continue({ url: url.toString() });
    });
    await context.addInitScript(() => {
      setInterval(() => {
        try {
          if (window.Clerk?.client) window.Clerk.client.captchaBypass = true;
        } catch {
          /* Clerk not loaded on this page */
        }
      }, 200);
    });
  }

  const page = await context.newPage();
  PAGE = page;

  const consoleErrors = [];
  const failedResponses = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => {
    if (!e.message.includes(EXPECTED_BROWSER_ERROR)) {
      consoleErrors.push('pageerror: ' + e.message);
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('request', record);

  // ---- FLOW 1: landing with first-touch UTM acquisition ----------------
  await page.goto(`${BASE}/?utm_source=newsletter&utm_medium=email&utm_campaign=vg_test`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1200);
  check('no GA request before analytics consent', raw.length === 0, `${raw.length} pre-consent request(s)`);
  const accept = page.getByTestId('consent-accept');
  await accept.waitFor({ state: 'visible' });
  await accept.click();
  const consentGranted = await page.evaluate(
    () => localStorage.getItem('analytics-consent') === 'granted',
  );
  check('initial analytics consent grant completed', consentGranted, String(consentGranted));
  const warm = await waitForCollect(1, 20000); // wait for gtag.js cold-load + first hit
  check('GA4 gtag.js loaded and sent a /collect hit', warm, `${raw.length} request(s) after warmup`);
  await sleep(1500);
  await flushGA(); // flush the initial page_view batch
  await page.screenshot({ path: `${OUT}/vg2-01-landing.jpg`, quality: 70 });
  const pv1 = evByName('page_view');
  check('page_view fired on landing', pv1.length >= 1, `${pv1.length} page_view event(s)`);
  const pvUtm = pv1.find((e) => e.dl.includes('utm_source=newsletter'));
  check('landing page_view dl carries UTM', !!pvUtm, pvUtm ? decodeURIComponent(pvUtm.dl) : 'no dl with utm_source');

  // ---- FLOW 1b: Core Web Vitals + global JavaScript error ---------------
  // The page has already granted consent and warmed gtag, so these assertions
  // prove the mounted capture reaches the real /g/collect endpoint. The thrown
  // message deliberately contains a query-shaped value; only its safe shape
  // may appear in the captured payload.
  // INP is finalized after an interaction and when the page becomes hidden.
  // Create a real keyboard interaction after the consent-gated observer mounts,
  // then let flushGA() trigger the same visibility transition used by browsers.
  const beforeInp = seq - 1;
  await page.keyboard.press('/');
  const inpReached = await waitForPerformanceMetric('inp', beforeInp, 12000);
  const inpEvents = evByName('performance', beforeInp).filter(
    (event) => event.params['ep.metric_name'] === 'inp',
  );
  check('INP reached GA4 after a real interaction', inpReached && inpEvents.length >= 1, `${inpEvents.length} inp event(s)`);
  const performanceEvents = evByName('performance');
  check('Core Web Vitals reached GA4 after consent', performanceEvents.length >= 1, `${performanceEvents.length} performance event(s)`);
  const metricNames = new Set(performanceEvents.map((e) => e.params['ep.metric_name']));
  check('performance event carries a supported metric name', [...metricNames].some((name) => ['lcp', 'fid', 'inp', 'cls'].includes(name)), [...metricNames].join(', ') || 'none');

  const beforeBrowserError = seq - 1;
  await page.evaluate((message) => {
    setTimeout(() => {
      throw new Error(`${message} https://example.com/path?email=not-for-analytics`);
    }, 0);
  }, EXPECTED_BROWSER_ERROR);
  await waitForEvent('error', beforeBrowserError, 12000);
  const browserErrors = evByName('error', beforeBrowserError).filter(
    (e) => e.params['ep.error_type'] === 'javascript_error',
  );
  check('global JavaScript error reached GA4', browserErrors.length >= 1, `${browserErrors.length} javascript_error event(s)`);
  const browserError = browserErrors[0];
  if (browserError) {
    check('JavaScript error carries its error type', browserError.params['ep.error_type'] === 'javascript_error', browserError.params['ep.error_type']);
    check('JavaScript error carries only a safe message shape', /^(short|medium|long)-(text|url)(-query)?$/.test(browserError.params['ep.error_message']), browserError.params['ep.error_message']);
    check('JavaScript error message does not carry the thrown URL/query', !JSON.stringify(browserError).includes('example.com') && !JSON.stringify(browserError).includes('email=not-for-analytics'), 'scanned decoded event');
  }

  // ---- FLOW 2: debounced site search -----------------------------------
  const beforeSearch = seq - 1;
  await page.keyboard.press('/');
  await sleep(400);
  await page.locator('[cmdk-input]').first().fill('encoding');
  await sleep(1500); // debounce is 600ms; allow one settled search
  await flushGA();
  await waitForEvent('search', beforeSearch, 12000);
  await page.screenshot({ path: `${OUT}/vg2-02-search.jpg`, quality: 70 });
  const searchEvents = evByName('search', beforeSearch);
  check('search fired after typing', searchEvents.length >= 1, `${searchEvents.length} search event(s)`);
  check('search debounced to a single event', searchEvents.length === 1, `expected 1, got ${searchEvents.length}`);
  const se = searchEvents[0];
  if (se) {
    check('search has search_term=encoding', se.params['ep.search_term'] === 'encoding', se.params['ep.search_term']);
    check('search has numeric result_count', 'epn.result_count' in se.params, `result_count=${se.params['epn.result_count']}`);
  }
  const flushedVitalNames = new Set(
    evByName('performance').map((e) => e.params['ep.metric_name']),
  );
  check(
    'LCP, FID, INP, and CLS all reached GA4',
    ['lcp', 'fid', 'inp', 'cls'].every((name) => flushedVitalNames.has(name)),
    [...flushedVitalNames].join(', ') || 'none',
  );

  // ---- FLOW 3: click a search result -> SPA nav -> select_content -------
  // A search-result click opens the resource's EXTERNAL url in a new tab
  // (window.open), so it never lands on /resource/:id. The real path to the
  // detail page — and to select_content, which fires on ResourceDetail mount —
  // is the resource route itself (opened directly here, then via an in-app link
  // in FLOW 4 to prove per-route SPA page_view).
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(500);
  const beforeSelect = seq - 1;
  await page.goto(`${BASE}/resource/${RESOURCE_ID}`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1500);
  await waitForEvent('select_content', beforeSelect, 16000);
  await page.screenshot({ path: `${OUT}/vg2-03-resource.jpg`, quality: 70 });
  const selectEvents = evByName('select_content', beforeSelect);
  check('select_content fired on resource detail view', selectEvents.length >= 1, `${selectEvents.length} event(s)`);
  const sc = selectEvents[0];
  if (sc) {
    check('select_content content_type=resource', sc.params['ep.content_type'] === 'resource', sc.params['ep.content_type']);
    check('select_content has content_id', !!sc.params['ep.content_id'], `content_id=${sc.params['ep.content_id']}`);
  }
  const pvResource = evByName('page_view', beforeSelect);
  check('page_view fired on resource detail load', pvResource.length >= 1, `${pvResource.length} new page_view`);

  // ---- FLOW 4: in-app SPA navigation proves per-route page_view ---------
  const beforeSpa = seq - 1;
  let spaClicked = false;
  const homeNav = page.locator('[data-testid="nav-home"]').first();
  if (await homeNav.count().catch(() => 0)) {
    await homeNav.click().catch(() => {});
    spaClicked = true;
  } else {
    const related = page.locator('[data-testid^="related-resource-"]').first();
    if (await related.count().catch(() => 0)) {
      await related.scrollIntoViewIfNeeded().catch(() => {});
      await related.click().catch(() => {});
      spaClicked = true;
    }
  }
  await sleep(1800);
  await flushGA();
  const pvSpa = evByName('page_view', beforeSpa);
  check('page_view fired on in-app SPA navigation', pvSpa.length >= 1, spaClicked ? `${pvSpa.length} page_view after SPA nav` : 'no in-app link found to click');
  const engSpa = evByName('page_engaged', beforeSpa);
  check('page_engaged fired on navigation', engSpa.length >= 1, `${engSpa.length} page_engaged`);

  // ---- FLOW 5: theme_change --------------------------------------------
  const beforeTheme = seq - 1;
  try {
    await page.goto(`${BASE}/settings/theme`, { waitUntil: 'load', timeout: 30000 });
    await sleep(1200);
    const radios = page.locator('[role="radio"]');
    const n = await radios.count();
    if (n > 1) {
      await radios.nth(1).click();
      await sleep(1000);
    }
    await waitForEvent('theme_change', beforeTheme, 12000);
  } catch (e) { /* best-effort */ }
  const theme = evByName('theme_change', beforeTheme);
  check('theme_change fired', theme.length >= 1, `${theme.length} theme_change`);

  // ---- FLOW 6: taxonomy page -> category_view ---------------------------
  // trackCategoryView is keyed on the resolved node, so this also proves the
  // event does NOT re-fire when only filters/pagination change.
  const beforeCategory = seq - 1;
  await page.goto(`${BASE}/category/${CATEGORY.slug}`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1200);
  await waitForEvent('category_view', beforeCategory, 16000);
  await page.screenshot({ path: `${OUT}/vg2-04-category.jpg`, quality: 70 });
  const categoryEvents = evByName('category_view', beforeCategory);
  check('category_view fired on a taxonomy page', categoryEvents.length >= 1, `${categoryEvents.length} event(s)`);
  check('category_view fired exactly once per page view', categoryEvents.length === 1, `expected 1, got ${categoryEvents.length}`);
  const cv = categoryEvents[0];
  if (cv) {
    check(
      'category_view content_category is the resolved node name',
      cv.params['ep.content_category'] === CATEGORY.name,
      `${cv.params['ep.content_category']} (expected ${CATEGORY.name})`,
    );
  }
  // Narrowing the same page must NOT look like a second category view: the
  // in-page search re-queries and re-renders the listing without remounting it.
  const beforeCategoryFilter = seq - 1;
  await page.locator('[data-testid="input-search-resources"]').first().fill('a');
  await sleep(2000);
  await flushGA();
  const reFired = evByName('category_view', beforeCategoryFilter).length;
  check('category_view does not re-fire while filtering the same node', reFired === 0, `${reFired} extra event(s)`);

  // ---- FLOW 7-9: real Clerk sign-up / sign-in conversions ---------------
  if (!AUTH_FLOWS_READY) {
    skip(
      'auth conversions (sign_up / login) exercised against Clerk',
      'set CLERK_TEST_VERIFICATION_CODE (+ pk_test Clerk keys) to run the auth flows',
    );
  } else {
    // FLOW 7: sign up through the prebuilt <SignUp> card.
    const beforeSignUp = seq - 1;
    await page.goto(`${BASE}/sign-up`, { waitUntil: 'load', timeout: 30000 });
    await page.getByLabel(/email address/i).first().fill(QA_EMAIL);
    await page.getByLabel(/^password$/i).first().fill(QA_PASSWORD);
    await page.getByRole('button', { name: /^continue$/i }).first().click();
    await enterClerkCode(page);
    await page.waitForURL((url) => !url.pathname.startsWith('/sign-up'), { timeout: 30000 }).catch(() => {});
    await waitForEvent('sign_up', beforeSignUp, 20000);
    await page.screenshot({ path: `${OUT}/vg2-05-signed-up.jpg`, quality: 70 });
    const signUpEvents = evByName('sign_up', beforeSignUp);
    check('sign_up fired on a completed registration', signUpEvents.length >= 1, `${signUpEvents.length} event(s)`);
    check('sign_up fired exactly once', signUpEvents.length === 1, `expected 1, got ${signUpEvents.length}`);
    if (signUpEvents[0]) {
      check('sign_up carries a method', !!signUpEvents[0].params['ep.method'], `method=${signUpEvents[0].params['ep.method']}`);
    }
    check(
      'sign_up did not also count as a login',
      evByName('login', beforeSignUp).length === 0,
      `${evByName('login', beforeSignUp).length} login event(s) during registration`,
    );

    // FLOW 8: a signed-in reload is a session RESTORE, not a conversion.
    const beforeRestore = seq - 1;
    await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 30000 });
    await sleep(2500);
    await flushGA();
    await flushGA();
    check(
      'session restore fires neither login nor sign_up',
      evByName('login', beforeRestore).length === 0 && evByName('sign_up', beforeRestore).length === 0,
      `login=${evByName('login', beforeRestore).length} sign_up=${evByName('sign_up', beforeRestore).length}`,
    );

    // FLOW 9: sign out, then sign back in with the same credentials.
    await clerkSignOut(page);
    // Sign-in is never bot-gated, so `login` stays verifiable even if the
    // registration above did not land: fall back to provisioning the same
    // account through the Backend API so this flow always runs for real.
    if (!(await findClerkUser())) {
      await clerkApi('POST', '/users', {
        email_address: [QA_EMAIL],
        password: QA_PASSWORD,
        skip_password_checks: true,
      });
    }
    const beforeLogin = seq - 1;
    await page.goto(`${BASE}/sign-in`, { waitUntil: 'load', timeout: 30000 });
    await page.getByLabel(/email address/i).first().fill(QA_EMAIL);
    await page.getByRole('button', { name: /^continue$/i }).first().click();
    await page.getByLabel(/^password$/i).first().fill(QA_PASSWORD, { timeout: 20000 });
    await page.getByRole('button', { name: /^continue$/i }).first().click();
    await enterClerkCode(page); // device verification, if the instance asks
    await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'), { timeout: 30000 }).catch(() => {});
    await waitForEvent('login', beforeLogin, 20000);
    await page.screenshot({ path: `${OUT}/vg2-06-signed-in.jpg`, quality: 70 });
    const loginEvents = evByName('login', beforeLogin);
    check('login fired on a completed sign-in', loginEvents.length >= 1, `${loginEvents.length} event(s)`);
    check('login fired exactly once', loginEvents.length === 1, `expected 1, got ${loginEvents.length}`);
    if (loginEvents[0]) {
      check('login carries a method', !!loginEvents[0].params['ep.method'], `method=${loginEvents[0].params['ep.method']}`);
    }
    check(
      'returning sign-in is not counted as a registration',
      evByName('sign_up', beforeLogin).length === 0,
      `${evByName('sign_up', beforeLogin).length} sign_up event(s) during sign-in`,
    );

    await clerkSignOut(page);
  }

  // ---- FLOW 10: in-session revoke and re-grant --------------------------
  // Back to the theme page: the revoke flow needs both the footer consent
  // control and an in-app link to click once analytics is switched off.
  await page.goto(`${BASE}/settings/theme`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1200);
  await page.locator('[data-testid="footer-cookie-settings"]').click();
  await page.getByRole('button', { name: /^decline$/i }).click();
  const beforeRevokedNavigation = seq - 1;
  await page.locator('[data-testid="link-back-home"]').click();
  await sleep(1800);
  await flushGA();
  const revokedEvents = events.filter((event) => event.seq > beforeRevokedNavigation);
  check('GA sends no events after consent revoke', revokedEvents.length === 0, `${revokedEvents.length} post-revoke event(s)`);

  await page.locator('[data-testid="footer-cookie-settings"]').click();
  const beforeRegrant = seq - 1;
  await page.getByRole('button', { name: /allow analytics/i }).click();
  await waitForEvent('page_view', beforeRegrant, 12000);
  const regrantPageViews = evByName('page_view', beforeRegrant);
  check('GA resumes after consent re-grant', regrantPageViews.length >= 1, `${regrantPageViews.length} page_view event(s)`);

  // ---- PII guard: URL query values do not leak beyond expected UTM data --
  const blob = JSON.stringify(raw);
  check('no password/token-shaped values in GA payloads', !/(password|token)=/i.test(blob), 'scanned all /collect requests');
  if (AUTH_FLOWS_READY) {
    // The auth conversions only ever report a verification STRATEGY. Prove the
    // credentials typed into the Clerk card never reached GA4 — checked against
    // both the raw and the percent-decoded payloads. Detail names no value.
    const decoded = decodeURIComponent(blob);
    const leaked = [blob, decoded].some(
      (haystack) => haystack.includes(QA_EMAIL) || haystack.includes('__qa_test_ga4_') || haystack.includes(QA_PASSWORD),
    );
    check('no sign-up email or password in GA payloads', !leaked, 'scanned raw + decoded /collect payloads');
  }

  check(
    'no console errors during flows',
    consoleErrors.length === 0,
    [...consoleErrors.slice(0, 5), ...failedResponses.slice(0, 5)].join(' | '),
  );

  await browser.close();

  // ---- teardown: delete the throwaway Clerk account ---------------------
  // Its application-DB row is swept by scripts/vg2-teardown.ts (the local-part
  // carries the `__qa_test_` prefix that sweep matches).
  if (AUTH_FLOWS_READY) {
    let removed = 0;
    try {
      const found = await clerkApi('GET', `/users?email_address=${encodeURIComponent(QA_EMAIL)}`);
      for (const user of Array.isArray(found) ? found : found.data ?? []) {
        await clerkApi('DELETE', `/users/${user.id}`);
        removed += 1;
      }
    } catch (error) {
      check('throwaway Clerk account deleted', false, String(error).slice(0, 160));
    }
    if (removed) check('throwaway Clerk account deleted', true, `${removed} account(s) removed`);
  }

  // ---- write evidence -------------------------------------------------
  fs.writeFileSync(`${OUT}/vg2-collect-raw.json`, JSON.stringify(raw, null, 2));
  fs.writeFileSync(`${OUT}/vg2-events.json`, JSON.stringify(events, null, 2));

  const counts = {};
  for (const e of events) counts[e.en] = (counts[e.en] || 0) + 1;
  const skipCount = results.filter((r) => r.skipped).length;
  const passCount = results.filter((r) => r.pass && !r.skipped).length;
  const assertedCount = results.length - skipCount;

  const md = [];
  md.push('# VG-2 — Real-Browser GA4 Validation Evidence');
  md.push('');
  md.push(`Run: ${new Date(TS).toISOString()} · Browser: pinned Chromium 1208 · Target: ${BASE}`);
  md.push('');
  md.push(`**Result: ${passCount}/${assertedCount} checks passed${skipCount ? ` · ${skipCount} skipped` : ''}.**`);
  md.push('');
  md.push('## Event volume captured off the wire (`/g/collect`)');
  md.push('');
  md.push('| Event | Count |');
  md.push('|---|---|');
  for (const [k, v] of Object.entries(counts).sort()) md.push(`| \`${k}\` | ${v} |`);
  md.push('');
  md.push('## Assertions');
  md.push('');
  md.push('| Check | Result | Detail |');
  md.push('|---|---|---|');
  for (const r of results) {
    const verdict = r.skipped ? '⏭️ SKIP' : r.pass ? '✅ PASS' : '❌ FAIL';
    md.push(`| ${r.name} | ${verdict} | ${String(r.detail).replace(/\|/g, '\\|').slice(0, 160)} |`);
  }
  md.push('');
  md.push('## Sample decoded events');
  md.push('');
  md.push('```');
  for (const en of ['page_view', 'page_engaged', 'performance', 'error', 'search', 'select_content', 'theme_change', 'category_view', 'sign_up', 'login']) {
    const e = events.find((x) => x.en === en);
    if (e) {
      const shown = {};
      for (const [k, v] of Object.entries(e.params)) {
        if (k.startsWith('ep.') || k.startsWith('epn.') || ['en', 'dl', 'dt', 'dr', '_et', 'method'].includes(k)) shown[k] = v;
      }
      md.push(`${en}: ${JSON.stringify(shown)}`);
    }
  }
  md.push('```');
  md.push('');
  md.push(`Raw payloads: \`vg2-collect-raw.json\` (${raw.length} requests) · Parsed: \`vg2-events.json\` (${events.length} events)`);
  md.push('Screenshots: `vg2-01-landing.jpg` … `vg2-06-signed-in.jpg`');
  fs.writeFileSync(`${OUT}/vg2-report.md`, md.join('\n'));

  console.log(
    `\n=== ${passCount}/${assertedCount} checks passed${skipCount ? ` (${skipCount} skipped)` : ''}. Evidence written to ${OUT}/vg2-* ===`,
  );
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}

main().catch((e) => { console.error('FATAL', e); process.exit(2); });
