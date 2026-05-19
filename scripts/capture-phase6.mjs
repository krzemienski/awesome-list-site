#!/usr/bin/env node
// Phase-6 wall-to-wall evidence sweep.
// Per cell writes 6 artifacts under _validation/phase-6/<slug>/<vp>-dark-<auth>-<state>:
//   .png .dom.html .console.json .network.json .axe.json .tokens.json
// Token probe = computed-style read of all DS_SPEC Terminal tokens on <html>,
// compared to the Terminal column of DS_SPEC §1 token contract.
//
// Usage:
//   node scripts/capture-phase6.mjs                  (full sweep)
//   node scripts/capture-phase6.mjs --range=0:20
//   node scripts/capture-phase6.mjs --indices=0,5,12
//   node scripts/capture-phase6.mjs --list

import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_ROOT = join(ROOT, '_validation', 'phase-6');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const AXE_PATH = join(OUT_ROOT, 'axe.min.js');

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

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

// DS_SPEC §1 Terminal column. Values are normalized expectations.
// `match` rules:
//   exact   — string equality after trim
//   substr  — expected substring exists in computed value
//   accent  — must be #00ff88 (Matrix default) or its rgb equivalent
const TERMINAL_TOKENS = [
  { name: '--bg',                 expected: 'rgb(0, 0, 0)',                  match: 'exact'  },
  { name: '--bg-2',               expected: 'rgb(4, 4, 4)',                  match: 'exact'  },
  { name: '--surface',            expected: 'rgba(0, 255, 136, 0.012)',      match: 'substr', sub: '0, 255, 136' },
  { name: '--surface-2',          expected: 'rgba(0, 255, 136, 0.025)',      match: 'substr', sub: '0, 255, 136' },
  { name: '--surface-3',          expected: 'rgba(0, 255, 136, 0.05)',       match: 'substr', sub: '0, 255, 136' },
  { name: '--grain-opacity',      expected: '0.5',                            match: 'exact'  },
  { name: '--border',             expected: 'rgba(232, 232, 224, 0.14)',     match: 'substr', sub: '232, 232, 224' },
  { name: '--border-strong',      expected: 'rgba(232, 232, 224, 0.32)',     match: 'substr', sub: '232, 232, 224' },
  { name: '--hairline',           expected: 'rgba(232, 232, 224, 0.08)',     match: 'substr', sub: '232, 232, 224' },
  { name: '--border-w',           expected: '1px',                            match: 'exact'  },
  { name: '--hairline-w',         expected: '1px',                            match: 'exact'  },
  { name: '--text',               expected: 'rgb(232, 232, 224)',            match: 'exact'  },
  { name: '--text-2',             expected: 'rgba(232, 232, 224, 0.62)',     match: 'substr', sub: '232, 232, 224' },
  { name: '--text-3',             expected: 'rgba(232, 232, 224, 0.36)',     match: 'substr', sub: '232, 232, 224' },
  { name: '--text-4',             expected: 'rgba(232, 232, 224, 0.2)',      match: 'substr', sub: '232, 232, 224' },
  { name: '--font-body',          expected: 'IBM Plex Mono',                 match: 'substr', sub: 'Plex Mono' },
  { name: '--font-display',       expected: 'IBM Plex Mono',                 match: 'substr', sub: 'Plex Mono' },
  { name: '--font-mono',          expected: 'IBM Plex Mono',                 match: 'substr', sub: 'Plex Mono' },
  { name: '--display-weight',     expected: '600',                            match: 'exact'  },
  { name: '--display-tracking',   expected: '-0.01em',                        match: 'exact'  },
  { name: '--display-leading',    expected: '1.1',                            match: 'exact'  },
  { name: '--body-leading',       expected: '1.55',                           match: 'exact'  },
  { name: '--eyebrow-tracking',   expected: '0.2em',                          match: 'exact'  },
  { name: '--mono-size-step',     expected: '12px',                           match: 'exact'  },
  { name: '--radius',             expected: '0px',                            match: 'exact'  },
  { name: '--radius-sm',          expected: '0px',                            match: 'exact'  },
  { name: '--radius-pill',        expected: '0px',                            match: 'exact'  },
  { name: '--shadow-sm',          expected: 'none',                           match: 'exact'  },
  { name: '--shadow',             expected: 'none',                           match: 'exact'  },
  { name: '--shadow-lg',          expected: '0 0 0 1px',                      match: 'substr', sub: '0 0 0 1px' },
  { name: '--shadow-accent',      expected: '0 0 0 1px',                      match: 'substr', sub: '0 0 0 1px' },
  { name: '--accent',             expected: 'rgb(0, 255, 136)',              match: 'accent' },
  { name: '--accent-2',           expected: '(matrix secondary)',             match: 'substr', sub: '' }, // presence-only
  // Runtime attrs (read on <html>):
  { name: 'data-system',          expected: 'terminal',                       match: 'attr'   },
  { name: 'data-accent',          expected: 'matrix',                         match: 'attr'   },
];

function buildCells() {
  const allVps = ['375', '768', '1280', '1536'];
  const cells = [];

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

  // Auth-required pages — gate (unauth) + populated (admin)
  for (const vp of allVps) {
    cells.push({ slug: 'profile',   path: '/profile',   auth: 'unauth', state: 'gate', vp });
    cells.push({ slug: 'bookmarks', path: '/bookmarks', auth: 'unauth', state: 'gate', vp });
    cells.push({ slug: 'admin',     path: '/admin',     auth: 'unauth', state: 'gate', vp });
    cells.push({ slug: 'profile',   path: '/profile',   auth: 'admin',  state: 'populated', vp });
    cells.push({ slug: 'bookmarks', path: '/bookmarks', auth: 'admin',  state: 'populated', vp });
  }

  // Admin tabs × 4 viewports, admin auth
  const TABS = [
    'approvals', 'edits', 'enrichment', 'researcher', 'export', 'database',
    'resources', 'categories', 'subcategories', 'subsubcategories',
    'users', 'github', 'linkhealth', 'audit',
  ];
  for (const tab of TABS) {
    for (const vp of allVps) {
      cells.push({ slug: `admin-${tab}`, path: `/admin#${tab}`, auth: 'admin', state: 'populated', vp });
    }
  }

  // Error states — desktop only (parity with phase-2)
  cells.push({ slug: 'resource-detail',  path: '/resource/9999999',           auth: 'unauth', state: 'error', vp: '1280' });
  cells.push({ slug: 'category',         path: '/category/__does_not_exist',  auth: 'unauth', state: 'error', vp: '1280' });
  cells.push({ slug: 'subcategory',      path: '/subcategory/__nope',         auth: 'unauth', state: 'error', vp: '1280' });
  cells.push({ slug: 'sub-subcategory',  path: '/sub-subcategory/__nope',     auth: 'unauth', state: 'error', vp: '1280' });
  cells.push({ slug: 'journey-detail',   path: '/journey/9999999',            auth: 'unauth', state: 'error', vp: '1280' });

  return cells;
}

function cellFileBase(cell) {
  return join(OUT_ROOT, cell.slug, `${cell.vp}-dark-${cell.auth}-${cell.state}`);
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
    if (!meJson?.isAuthenticated) throw new Error(`/api/auth/user not authenticated`);
    return await ctx.storageState();
  } finally {
    await browser.close().catch(() => {});
  }
}

async function probeTokens(page, expected) {
  return await page.evaluate((spec) => {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const probe = {};
    for (const t of spec) {
      if (t.match === 'attr') {
        probe[t.name] = root.getAttribute(t.name);
      } else {
        probe[t.name] = (cs.getPropertyValue(t.name) || '').trim();
      }
    }
    return {
      probe,
      htmlAttrs: {
        'data-system': root.getAttribute('data-system'),
        'data-accent': root.getAttribute('data-accent'),
        'class':       root.getAttribute('class'),
      },
      computed: {
        body_bg:          getComputedStyle(document.body).backgroundColor,
        body_color:       getComputedStyle(document.body).color,
        body_fontFamily:  getComputedStyle(document.body).fontFamily,
      },
    };
  }, expected);
}

// Normalize a CSS color/value string for tolerant comparison:
//  - lowercase, strip whitespace
//  - convert #rrggbb hex to rgb(r,g,b)
//  - convert #rgb shorthand to rgb(r,g,b)
//  - rgba with alpha preserved
function normColor(v) {
  if (v == null) return '';
  let s = String(v).toLowerCase().replace(/\s+/g, '');
  // #rrggbb → rgb(r,g,b)
  const m6 = s.match(/^#([0-9a-f]{6})$/);
  if (m6) {
    const r = parseInt(m6[1].slice(0, 2), 16);
    const g = parseInt(m6[1].slice(2, 4), 16);
    const b = parseInt(m6[1].slice(4, 6), 16);
    return `rgb(${r},${g},${b})`;
  }
  // #rgb → rgb(r,g,b)
  const m3 = s.match(/^#([0-9a-f]{3})$/);
  if (m3) {
    const r = parseInt(m3[1][0] + m3[1][0], 16);
    const g = parseInt(m3[1][1] + m3[1][1], 16);
    const b = parseInt(m3[1][2] + m3[1][2], 16);
    return `rgb(${r},${g},${b})`;
  }
  return s;
}

function evaluateTokenConformance(probe, htmlAttrs) {
  const results = [];
  let pass = 0, fail = 0;
  for (const t of TERMINAL_TOKENS) {
    const got = t.match === 'attr' ? htmlAttrs[t.name] : probe[t.name];
    let ok = false;
    let reason = '';
    if (got == null || got === '') {
      ok = false; reason = 'token-missing';
    } else if (t.match === 'exact') {
      ok = normColor(got) === normColor(t.expected);
      reason = ok ? '' : `expected '${t.expected}', got '${got}'`;
    } else if (t.match === 'substr') {
      const gotN = normColor(got);
      const sub = t.sub === '' ? '' : t.sub.toLowerCase().replace(/\s+/g, '');
      ok = sub === '' ? String(got).length > 0 : gotN.includes(sub);
      reason = ok ? '' : `expected to contain '${t.sub}', got '${got}'`;
    } else if (t.match === 'accent') {
      const norm = normColor(got);
      ok = norm === 'rgb(0,255,136)';
      reason = ok ? '' : `expected Matrix #00ff88, got '${got}'`;
    } else if (t.match === 'attr') {
      ok = String(got) === t.expected;
      reason = ok ? '' : `expected attr '${t.expected}', got '${got}'`;
    }
    results.push({ token: t.name, expected: t.expected, got, pass: ok, reason });
    if (ok) pass++; else fail++;
  }
  return { results, pass, fail };
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
    await page.goto(`${BASE_URL}${cell.path}`, { waitUntil: 'load', timeout: 25000 });
    // Wait for DS applier to have run (writes 33 inline custom props on <html>).
    await page.waitForFunction(
      () => {
        const html = document.documentElement;
        const keys = html.__appliedKeys;
        return Array.isArray(keys) && keys.length >= 30;
      },
      null,
      { timeout: 10000 },
    ).catch(() => {});
    await page.waitForFunction(
      () => {
        const body = document.body;
        if (!body) return false;
        const txt = (body.innerText || '').trim();
        return txt.length > 4 && !/^Loading\.\.\.$/.test(txt) && !/^Verifying access/.test(txt);
      },
      null,
      { timeout: 8000 },
    ).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(2500);
    // Extra safety: re-verify the applier ran even after settle
    await page.waitForFunction(
      () => Array.isArray(document.documentElement.__appliedKeys) && document.documentElement.__appliedKeys.length >= 30,
      null,
      { timeout: 5000 },
    ).catch(() => {});
  } catch (e) {
    navError = String(e.message).slice(0, 500);
  }

  // Token probe
  let tokenProbe = null;
  let tokenConformance = { results: [], pass: 0, fail: TERMINAL_TOKENS.length };
  try {
    tokenProbe = await probeTokens(page, TERMINAL_TOKENS);
    tokenConformance = evaluateTokenConformance(tokenProbe.probe, tokenProbe.htmlAttrs);
  } catch (e) {
    tokenProbe = { error: String(e.message).slice(0, 400) };
  }

  // axe scan with retry on context destroyed
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

  let dom = '';
  try { dom = await page.content(); } catch (e) { dom = `<!-- content() failed: ${e.message} -->`; }

  let screenshotErr = null;
  try {
    await page.screenshot({ path: `${fileBase}.png`, fullPage: false });
  } catch (e) { screenshotErr = String(e.message).slice(0, 300); }

  await Promise.all([
    fs.writeFile(`${fileBase}.dom.html`, dom),
    fs.writeFile(`${fileBase}.console.json`, JSON.stringify({ messages: consoleMessages, pageErrors }, null, 2)),
    fs.writeFile(`${fileBase}.network.json`, JSON.stringify({ requests: networkRequests }, null, 2)),
    fs.writeFile(`${fileBase}.axe.json`,     JSON.stringify(axeResults, null, 2)),
    fs.writeFile(`${fileBase}.tokens.json`,  JSON.stringify({
      probe: tokenProbe,
      conformance: tokenConformance,
    }, null, 2)),
  ]);

  const errors = consoleMessages.filter(m => m.type === 'error').length;
  const warnings = consoleMessages.filter(m => m.type === 'warning').length;
  // Exclude resource 404s on intentional "error" cells from network failure count.
  const intentional404 = cell.state === 'error' || cell.state === 'notfound';
  const netFails = networkRequests.filter(r => {
    if (r.ok === false && r.failure) return true;
    if (r.status >= 500) return true;
    if (intentional404 && r.status === 404 && r.resourceType !== 'document') return false;
    if (intentional404 && r.status === 404) return false;
    return r.status === 404 || (r.status >= 400 && r.status < 600 && r.status !== 401);
  }).length;

  const summary = {
    slug: cell.slug, path: cell.path, vp: cell.vp, auth: cell.auth, state: cell.state,
    navError, screenshotErr,
    consoleErrors: errors, consoleWarnings: warnings,
    pageErrors: pageErrors.length,
    networkFailures: netFails,
    axeViolations: axeResults.violations.length,
    axeError: axeResults.error,
    tokenPass: tokenConformance.pass,
    tokenFail: tokenConformance.fail,
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

  console.log(`admin login...`);
  const adminStorage = await loginAndGetStorageState();
  console.log(`  ok (${adminStorage.cookies.length} cookies)`);

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
          s.tokenFail ? `tok=${s.tokenFail}/${s.tokenFail + s.tokenPass}` : null,
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
