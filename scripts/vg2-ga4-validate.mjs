// VG-2: Real-browser GA4 validation. Launches the pinned Chromium build,
// drives real user flows against the running dev server, and captures every
// GA4 /g/collect request off the wire. No mocks, no stubs — this asserts on
// the actual network payloads GA4 receives.
import { chromium } from 'playwright-core';
import fs from 'fs';

const EXEC = '/home/runner/workspace/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const BASE = 'http://localhost:5000';
const OUT = '/home/runner/workspace/evidence';
const TS = Date.now();
const QA_EMAIL = `__qa_test_${TS}@example.com`;
const QA_PASSWORD = 'Vg2Passw0rd!secure';
const QA_URL = `https://qa-test-${TS}.example.com/resource`;
const RESOURCE_ID = 186811; // Galène — a stable approved resource for detail-view flow

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

async function main() {
  const browser = await chromium.launch({
    executablePath: EXEC,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  context.setDefaultTimeout(8000);
  context.setDefaultNavigationTimeout(30000);
  const page = await context.newPage();
  PAGE = page;

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  page.on('request', record);

  // ---- FLOW 1: landing with first-touch UTM acquisition ----------------
  await page.goto(`${BASE}/?utm_source=newsletter&utm_medium=email&utm_campaign=vg_test`, { waitUntil: 'load', timeout: 30000 });
  const warm = await waitForCollect(1, 20000); // wait for gtag.js cold-load + first hit
  check('GA4 gtag.js loaded and sent a /collect hit', warm, `${raw.length} request(s) after warmup`);
  await sleep(1500);
  await flushGA(); // flush the initial page_view batch
  await page.screenshot({ path: `${OUT}/vg2-01-landing.jpg`, quality: 70 });
  const pv1 = evByName('page_view');
  check('page_view fired on landing', pv1.length >= 1, `${pv1.length} page_view event(s)`);
  const pvUtm = pv1.find((e) => e.dl.includes('utm_source=newsletter'));
  check('landing page_view dl carries UTM', !!pvUtm, pvUtm ? decodeURIComponent(pvUtm.dl) : 'no dl with utm_source');

  // ---- FLOW 2: debounced site search -----------------------------------
  const beforeSearch = seq - 1;
  await page.keyboard.press('/');
  await sleep(400);
  await page.locator('[cmdk-input]').first().fill('encoding');
  await sleep(1500); // debounce is 600ms; allow one settled search
  await flushGA();
  await page.screenshot({ path: `${OUT}/vg2-02-search.jpg`, quality: 70 });
  const searchEvents = evByName('search', beforeSearch);
  check('search fired after typing', searchEvents.length >= 1, `${searchEvents.length} search event(s)`);
  check('search debounced to a single event', searchEvents.length === 1, `expected 1, got ${searchEvents.length}`);
  const se = searchEvents[0];
  if (se) {
    check('search has search_term=encoding', se.params['ep.search_term'] === 'encoding', se.params['ep.search_term']);
    check('search has numeric result_count', 'epn.result_count' in se.params, `result_count=${se.params['epn.result_count']}`);
  }

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
  const related = page.locator('[data-testid^="related-resource-"]').first();
  if (await related.count().catch(() => 0)) {
    await related.scrollIntoViewIfNeeded().catch(() => {});
    await related.click().catch(() => {});
    spaClicked = true;
  } else {
    const homeNav = page.locator('[data-testid="nav-home"]').first();
    if (await homeNav.count().catch(() => 0)) {
      await homeNav.click().catch(() => {});
      spaClicked = true;
    }
  }
  await sleep(1800);
  await flushGA();
  const pvSpa = evByName('page_view', beforeSpa);
  check('page_view fired on in-app SPA navigation', pvSpa.length >= 1, spaClicked ? `${pvSpa.length} page_view after SPA nav` : 'no in-app link found to click');
  const engSpa = evByName('page_engaged', beforeSpa);
  check('page_engaged fired on navigation', engSpa.length >= 1, `${engSpa.length} page_engaged`);

  // ---- FLOW 5: sign_up conversion (throwaway user) ---------------------
  const beforeSignup = seq - 1;
  await page.goto(`${BASE}/register`, { waitUntil: 'load', timeout: 30000 });
  await page.locator('[data-testid="input-email"]').fill(QA_EMAIL);
  await page.locator('[data-testid="input-password"]').fill(QA_PASSWORD);
  await sleep(300);
  await page.locator('[data-testid="button-register"]').click();
  await sleep(2000);
  await waitForEvent('sign_up', beforeSignup, 14000);
  await page.screenshot({ path: `${OUT}/vg2-05-signup.jpg`, quality: 70 });
  const signup = evByName('sign_up', beforeSignup);
  check('sign_up conversion fired', signup.length >= 1, `${signup.length} sign_up`);
  const su = signup[0];
  if (su) {
    check('sign_up method=password', su.params['ep.method'] === 'password', su.params['ep.method']);
    check('sign_up carries first-touch utm_source', su.params['ep.utm_source'] === 'newsletter', su.params['ep.utm_source']);
  }

  // ---- FLOW 6: generate_lead conversion (resource submission) ----------
  const beforeLead = seq - 1;
  let leadAttempted = false;
  await page.goto(`${BASE}/submit`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1500);
  const titleInput = page.locator('[data-testid="input-title"]');
  if (await titleInput.count()) {
    leadAttempted = true;
    await titleInput.fill(`QA Test Resource ${TS}`);
    await page.locator('[data-testid="input-url"]').fill(QA_URL);
    await page.locator('[data-testid="input-description"]').fill('Throwaway QA submission for VG-2 GA4 conversion validation. Safe to delete.');
    await page.locator('[data-testid="select-category"]').click();
    await sleep(500);
    await page.locator('[role="option"]').first().click();
    await sleep(800);
    await page.locator('[data-testid="button-submit"]').click();
    await sleep(2000);
    await waitForEvent('generate_lead', beforeLead, 16000);
    await page.screenshot({ path: `${OUT}/vg2-06-submit.jpg`, quality: 70 });
  }
  const lead = evByName('generate_lead', beforeLead);
  check('generate_lead conversion fired', lead.length >= 1, leadAttempted ? `${lead.length} generate_lead` : 'submit form not reached');
  const gl = lead[0];
  if (gl) {
    check('generate_lead content_type=resource_submission', gl.params['ep.content_type'] === 'resource_submission', gl.params['ep.content_type']);
    check('generate_lead carries first-touch utm_source', gl.params['ep.utm_source'] === 'newsletter', gl.params['ep.utm_source']);
  }

  // ---- FLOW 7: theme_change (best-effort) ------------------------------
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
  check('theme_change fired (best-effort)', theme.length >= 1, `${theme.length} theme_change`);

  // ---- PII guard: no email/password anywhere in GA payloads -----------
  const blob = JSON.stringify(raw);
  check('no throwaway email in any GA payload', !blob.includes(QA_EMAIL), 'scanned all /collect requests');
  check('no password in any GA payload', !blob.includes(QA_PASSWORD), 'scanned all /collect requests');

  check('no console errors during flows', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '));

  await browser.close();

  // ---- write evidence -------------------------------------------------
  fs.writeFileSync(`${OUT}/vg2-collect-raw.json`, JSON.stringify(raw, null, 2));
  fs.writeFileSync(`${OUT}/vg2-events.json`, JSON.stringify(events, null, 2));

  const counts = {};
  for (const e of events) counts[e.en] = (counts[e.en] || 0) + 1;
  const passCount = results.filter((r) => r.pass).length;

  const md = [];
  md.push('# VG-2 — Real-Browser GA4 Validation Evidence');
  md.push('');
  md.push(`Run: ${new Date(TS).toISOString()} · Browser: pinned Chromium 1208 · Target: ${BASE}`);
  md.push('');
  md.push(`**Result: ${passCount}/${results.length} checks passed.**`);
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
  for (const r of results) md.push(`| ${r.name} | ${r.pass ? '✅ PASS' : '❌ FAIL'} | ${String(r.detail).replace(/\|/g, '\\|').slice(0, 160)} |`);
  md.push('');
  md.push('## Sample decoded events');
  md.push('');
  md.push('```');
  for (const en of ['page_view', 'page_engaged', 'search', 'select_content', 'sign_up', 'generate_lead', 'theme_change']) {
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
  md.push('Screenshots: `vg2-01-landing.jpg` … `vg2-06-submit.jpg`');
  fs.writeFileSync(`${OUT}/vg2-report.md`, md.join('\n'));

  console.log(`\n=== ${passCount}/${results.length} checks passed. Evidence written to ${OUT}/vg2-* ===`);
  console.log(`QA_EMAIL=${QA_EMAIL}`);
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}

main().catch((e) => { console.error('FATAL', e); process.exit(2); });
