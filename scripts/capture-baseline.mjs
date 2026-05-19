#!/usr/bin/env node
// Phase-2 functional baseline capture.
// For each cell (route × viewport × auth × state) writes 5 artifacts:
//   .png, .dom.html, .console.json, .network.json, .axe.json
// Plus appends one line of summary JSON to _validation/phase-2/_results.jsonl
//
// Usage:
//   node scripts/capture-baseline.mjs                 (full sweep)
//   node scripts/capture-baseline.mjs --range=0:20    (slice, 0-based incl.)
//   node scripts/capture-baseline.mjs --list          (print cells + exit)

import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_ROOT = join(ROOT, '_validation', 'phase-2');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const AXE_PATH = join(OUT_ROOT, 'axe.min.js');

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

// Real ids/slugs probed from the live DB.
const SLUG_CAT = 'community-events';
const SLUG_SUB = 'ai-machine-learning-tools';
const SLUG_SUBSUB = 'av1';
const RESOURCE_ID = '186811';
const JOURNEY_ID = '6';

const VIEWPORTS = {
  '375':  { width: 375,  height: 720 },
  '768':  { width: 768,  height: 1024 },
  '1280': { width: 1280, height: 800 },
  '1536': { width: 1536, height: 900 },
};

// Cell shape: { slug, path, auth, state, viewports, waitFor?, settleMs? }
// auth: 'unauth' | 'admin'
// state: 'populated' | 'empty' | 'error' | 'gate' | 'notfound'
// viewports: array of keys into VIEWPORTS
function buildCells() {
  const allVps = ['375', '768', '1280', '1536'];
  const desktop = ['1280'];
  const mobileDesktop = ['375', '1280'];

  const cells = [];

  // --- Public routes, populated, full 4-viewport sweep ---
  const publicFull = [
    ['home',                '/',                                'populated'],
    ['login',               '/login',                           'populated'],
    ['category',            `/category/${SLUG_CAT}`,            'populated'],
    ['subcategory',         `/subcategory/${SLUG_SUB}`,         'populated'],
    ['sub-subcategory',     `/sub-subcategory/${SLUG_SUBSUB}`,  'populated'],
    ['resource-detail',     `/resource/${RESOURCE_ID}`,         'populated'],
    ['about',               '/about',                           'populated'],
    ['advanced',            '/advanced',                        'populated'],
    ['submit',              '/submit',                          'populated'],
    ['journeys',            '/journeys',                        'populated'],
    ['journey-detail',      `/journey/${JOURNEY_ID}`,           'populated'],
    ['settings-theme',      '/settings/theme',                  'populated'],
    ['notfound',            '/__this_route_does_not_exist__',   'notfound'],
  ];
  for (const [slug, path, state] of publicFull) {
    for (const vp of allVps) cells.push({ slug, path, auth: 'unauth', state, vp });
  }

  // --- Auth-required routes, BOTH unauth (gate) and admin (populated) ---
  // AuthGuard pages redirect to "/" with destructive toast on unauth.
  // AdminGuard renders <NotFound/> on unauth.
  for (const vp of allVps) {
    cells.push({ slug: 'profile',   path: '/profile',   auth: 'unauth', state: 'gate', vp });
    cells.push({ slug: 'bookmarks', path: '/bookmarks', auth: 'unauth', state: 'gate', vp });
    cells.push({ slug: 'admin',     path: '/admin',     auth: 'unauth', state: 'gate', vp });
    cells.push({ slug: 'profile',   path: '/profile',   auth: 'admin',  state: 'populated', vp });
    cells.push({ slug: 'bookmarks', path: '/bookmarks', auth: 'admin',  state: 'populated', vp });
  }

  // --- Admin dashboard tabs (admin auth, full 4-viewport sweep) ---
  const TABS = [
    'approvals', 'edits', 'enrichment', 'researcher', 'export', 'database',
    'resources', 'categories', 'subcategories', 'subsubcategories',
    'users', 'github', 'linkhealth', 'audit',
  ];
  for (const tab of TABS) {
    for (const vp of allVps) {
      cells.push({ slug: `admin-${tab}`, path: `/admin#${tab}`, auth: 'admin', state: 'populated', vp, tab });
    }
  }

  // --- Error / empty states reachable without code changes ---
  cells.push({ slug: 'resource-detail',  path: '/resource/9999999',           auth: 'unauth', state: 'error', vp: '1280' });
  cells.push({ slug: 'category',         path: '/category/__does_not_exist',  auth: 'unauth', state: 'error', vp: '1280' });
  cells.push({ slug: 'subcategory',      path: '/subcategory/__nope',         auth: 'unauth', state: 'error', vp: '1280' });
  cells.push({ slug: 'sub-subcategory',  path: '/sub-subcategory/__nope',     auth: 'unauth', state: 'error', vp: '1280' });
  cells.push({ slug: 'journey-detail',   path: '/journey/9999999',            auth: 'unauth', state: 'error', vp: '1280' });

  return cells;
}

function cellFileBase(cell) {
  // Layout per brief: <route-slug>/<viewport>-<theme>-<auth>-<state>.<ext>
  return join(OUT_ROOT, cell.slug, `${cell.vp}-dark-${cell.auth}-${cell.state}${cell.tab && cell.vp === '1280' ? '' : ''}`);
}

async function loginAndGetStorageState() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const ctx = await browser.newContext();
    const res = await ctx.request.post(`${BASE_URL}/api/auth/local/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok()) throw new Error(`Login HTTP ${res.status()}: ${await res.text()}`);
    const me = await ctx.request.get(`${BASE_URL}/api/auth/user`);
    const meJson = await me.json();
    if (!meJson?.isAuthenticated) throw new Error(`/api/auth/user not authenticated: ${JSON.stringify(meJson)}`);
    return await ctx.storageState();
  } finally {
    await browser.close().catch(() => {});
  }
}

async function captureCell(browser, axeSource, cell, adminStorage) {
  const fileBase = cellFileBase(cell);
  await fs.mkdir(dirname(fileBase), { recursive: true });

  const consoleMessages = [];
  const pageErrors = [];
  const networkRequests = [];

  const contextOpts = {
    viewport: VIEWPORTS[cell.vp],
    deviceScaleFactor: 1,
    colorScheme: 'dark',
  };
  if (cell.auth === 'admin') contextOpts.storageState = adminStorage;

  const ctx = await browser.newContext(contextOpts);
  const page = await ctx.newPage();

  page.on('console', (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text().slice(0, 2000),
      location: msg.location?.() ?? null,
    });
  });
  page.on('pageerror', (err) => {
    pageErrors.push({ message: String(err.message).slice(0, 2000), stack: String(err.stack || '').slice(0, 4000) });
  });
  page.on('requestfinished', async (req) => {
    try {
      const resp = await req.response();
      networkRequests.push({
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
        status: resp ? resp.status() : null,
        ok: resp ? resp.ok() : null,
      });
    } catch {}
  });
  page.on('requestfailed', (req) => {
    networkRequests.push({
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
      status: null,
      ok: false,
      failure: req.failure()?.errorText || 'unknown',
    });
  });

  let navError = null;
  try {
    await page.goto(`${BASE_URL}${cell.path}`, { waitUntil: 'domcontentloaded', timeout: 22000 });
    await page.waitForFunction(
      () => {
        const body = document.body;
        if (!body) return false;
        const txt = (body.innerText || '').trim();
        return txt.length > 4 && !/^Loading\.\.\.$/.test(txt) && !/^Verifying access/.test(txt);
      },
      null,
      { timeout: 5000 },
    ).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(1800);
  } catch (e) {
    navError = String(e.message).slice(0, 500);
  }

  // axe scan with single retry on "Execution context destroyed" (Wouter re-render race).
  async function runAxeOnce() {
    await page.addScriptTag({ content: axeSource });
    return await page.evaluate(async () => {
      // eslint-disable-next-line no-undef
      const r = await window.axe.run(document, { resultTypes: ['violations'] });
      return {
        violations: r.violations.map(v => ({
          id: v.id, impact: v.impact, help: v.help,
          nodes: v.nodes.length,
          targets: v.nodes.slice(0, 5).map(n => n.target),
        })),
        url: r.url, timestamp: r.timestamp,
      };
    });
  }
  let axeResults = { violations: [], error: null };
  try {
    axeResults = await runAxeOnce();
  } catch (e) {
    const msg = String(e.message || '');
    if (/Execution context was destroyed|navigation/i.test(msg)) {
      try {
        await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(600);
        axeResults = await runAxeOnce();
      } catch (e2) {
        axeResults = { violations: [], error: `retry: ${String(e2.message).slice(0, 400)}` };
      }
    } else {
      axeResults = { violations: [], error: msg.slice(0, 500) };
    }
  }

  // DOM snapshot
  let dom = '';
  try { dom = await page.content(); } catch (e) { dom = `<!-- content() failed: ${e.message} -->`; }

  // Screenshot
  let screenshotErr = null;
  try {
    await page.screenshot({ path: `${fileBase}.png`, fullPage: false });
  } catch (e) { screenshotErr = String(e.message).slice(0, 300); }

  // Write artifacts
  await Promise.all([
    fs.writeFile(`${fileBase}.dom.html`, dom),
    fs.writeFile(`${fileBase}.console.json`, JSON.stringify({ messages: consoleMessages, pageErrors }, null, 2)),
    fs.writeFile(`${fileBase}.network.json`, JSON.stringify({ requests: networkRequests }, null, 2)),
    fs.writeFile(`${fileBase}.axe.json`,     JSON.stringify(axeResults, null, 2)),
  ]);

  const errors = consoleMessages.filter(m => m.type === 'error').length;
  const warnings = consoleMessages.filter(m => m.type === 'warning').length;
  const netFails = networkRequests.filter(r => r.ok === false).length;

  const summary = {
    slug: cell.slug, path: cell.path, vp: cell.vp, auth: cell.auth, state: cell.state,
    navError, screenshotErr,
    consoleErrors: errors, consoleWarnings: warnings,
    pageErrors: pageErrors.length,
    networkFailures: netFails,
    axeViolations: axeResults.violations.length,
    axeError: axeResults.error,
  };

  await ctx.close().catch(() => {});
  return summary;
}

async function run() {
  const cells = buildCells();
  if (process.argv.includes('--list')) {
    cells.forEach((c, i) => console.log(`${i.toString().padStart(3, '0')}\t${c.slug}\t${c.path}\t${c.vp}\t${c.auth}\t${c.state}`));
    console.log(`\nTOTAL: ${cells.length} cells`);
    return;
  }
  const rangeArg = process.argv.find(a => a.startsWith('--range='));
  const indicesArg = process.argv.find(a => a.startsWith('--indices='));
  let startIdx = 0, endIdx = cells.length - 1;
  let explicitIndices = null;
  if (indicesArg) {
    explicitIndices = indicesArg.replace('--indices=', '').split(',').map(Number).filter(Number.isFinite);
  } else if (rangeArg) {
    const [s, e] = rangeArg.replace('--range=', '').split(':').map(Number);
    startIdx = Number.isFinite(s) ? s : 0;
    endIdx = Number.isFinite(e) ? e : cells.length - 1;
  }

  await fs.mkdir(OUT_ROOT, { recursive: true });
  const axeSource = await fs.readFile(AXE_PATH, 'utf8');
  const resultsPath = join(OUT_ROOT, '_results.jsonl');

  console.log(`🔑 admin login...`);
  const adminStorage = await loginAndGetStorageState();
  console.log(`   ok (${adminStorage.cookies.length} cookies)`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const indicesToRun = explicitIndices
    ? explicitIndices.filter(i => i >= 0 && i < cells.length)
    : Array.from({ length: endIdx - startIdx + 1 }, (_, k) => startIdx + k).filter(i => i < cells.length);

  const summaries = [];
  try {
    for (const i of indicesToRun) {
      const c = cells[i];
      const tag = `[${String(i).padStart(3, '0')}/${cells.length - 1}] ${c.slug} ${c.vp} ${c.auth}/${c.state}`;
      process.stdout.write(`${tag} ... `);
      const HARD_TIMEOUT_MS = 35000;
      try {
        const s = await Promise.race([
          captureCell(browser, axeSource, c, adminStorage),
          new Promise((_, rej) => setTimeout(() => rej(new Error(`hard-timeout ${HARD_TIMEOUT_MS}ms`)), HARD_TIMEOUT_MS)),
        ]);
        summaries.push(s);
        await fs.appendFile(resultsPath, JSON.stringify(s) + '\n');
        const flags = [
          s.navError ? `NAVERR` : null,
          s.screenshotErr ? `SHOTERR` : null,
          s.consoleErrors ? `err=${s.consoleErrors}` : null,
          s.pageErrors ? `pe=${s.pageErrors}` : null,
          s.networkFailures ? `net=${s.networkFailures}` : null,
          s.axeViolations ? `axe=${s.axeViolations}` : null,
        ].filter(Boolean).join(' ');
        console.log(`ok ${flags || 'clean'}`);
      } catch (e) {
        console.log(`FAIL ${e.message.slice(0, 200)}`);
        await fs.appendFile(resultsPath, JSON.stringify({ ...c, fatal: e.message }) + '\n');
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }
  console.log(`\nDone. ${summaries.length} cells captured.`);
}

run().catch(e => { console.error('FATAL', e); process.exit(1); });
