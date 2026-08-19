#!/usr/bin/env node
/**
 * Task #327 — HTTP cache-contract assertion matrix.
 *
 * Asserts the delivery policy documented in server/http-cache-policy.ts for
 * every public delivery class:
 *   - HTML documents (GET *and* HEAD): no-store, no ETag/Last-Modified
 *     (per-request CSP nonce makes cached/304 HTML actively broken).
 *   - Hashed /assets bundles: public, max-age=31536000, immutable + 304 on
 *     If-None-Match (prod build only — dev serves unhashed modules).
 *   - Catalog reads (awesome-list, filtered variants, nav, taxonomy):
 *     public, max-age=60, must-revalidate + ETag/304. Filtered variants must
 *     serve the STRONG sha1 ETag (a weak W/ ETag means the uncached legacy
 *     path handled a known-taxonomy slug — a regression).
 *   - Unknown-slug catalog variants: public, max-age=0, must-revalidate.
 *   - /api/public/* success: public, max-age=60 (+ weak ETag 304); 404s:
 *     no-store.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:5000 node scripts/validation/http-cache-headers.mjs
 *   node scripts/validation/http-cache-headers.mjs --spawn   # builds dist/ must exist;
 *     boots NODE_ENV=production node dist/index.js on an ephemeral port and
 *     runs the full matrix (including asset checks) against it.
 *
 * Exit code 0 = every applicable assertion passed; 1 = any failure.
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';

const SPAWN = process.argv.includes('--spawn');
const PORT = process.env.CACHE_MATRIX_PORT || '5093';
let BASE = process.env.BASE_URL || 'http://127.0.0.1:5000';
let publicApiRequest = 0;

const results = [];
let child = null;

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const icon = pass === null ? 'SKIP' : pass ? 'PASS' : 'FAIL';
  console.log(`  [${icon}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function timedFetch(path, opts = {}) {
  const started = performance.now();
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual', ...opts });
  const ttfbMs = performance.now() - started; // headers received
  const body = opts.method === 'HEAD' ? '' : await res.text();
  return { res, body, ttfbMs };
}

/**
 * Node's built-in fetch intentionally applies fetch-cache semantics to weak
 * validators. The HTTP contract needs to assert Express's raw wire response,
 * so use node:http for this one W/"…" conditional request.
 */
async function rawConditionalGet(path, etag, method = 'GET', extraHeaders = {}) {
  const url = new URL(path, BASE);
  const started = performance.now();
  return new Promise((resolve, reject) => {
    const request = http.request(
      url,
      { method, headers: { ...extraHeaders, 'If-None-Match': etag } },
      (res) => {
        res.resume();
        res.on('end', () => resolve({
          status: res.statusCode,
          headers: res.headers,
          ttfbMs: performance.now() - started,
        }));
      },
    );
    request.on('error', reject);
    request.setTimeout(10_000, () => request.destroy(new Error('raw conditional request timed out')));
    request.end();
  });
}

/**
 * Public API endpoints have a deliberate per-client hourly limiter. The cache
 * matrix makes several legitimate assertions in quick succession and may run
 * more than once in CI, so give each probe a distinct virtual client behind
 * the app's trusted proxy instead of contaminating the user's/runner's quota.
 */
function publicApiOptions() {
  publicApiRequest += 1;
  return { headers: { 'X-Forwarded-For': `10.78.0.${publicApiRequest}` } };
}

function header(res, name) {
  return res.headers.get(name);
}

async function main() {
  if (SPAWN) {
    if (!fs.existsSync('dist/index.js')) {
      console.error('FATAL: dist/index.js missing — run `npm run build` first.');
      process.exit(1);
    }
    BASE = `http://127.0.0.1:${PORT}`;
    console.log(`Booting production server on :${PORT} …`);
    child = spawn('node', ['dist/index.js'], {
      env: { ...process.env, NODE_ENV: 'production', PORT },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let bootLog = '';
    child.stdout.on('data', (d) => (bootLog += d));
    child.stderr.on('data', (d) => (bootLog += d));
    let up = false;
    for (let i = 0; i < 60; i++) {
      await sleep(1000);
      try {
        const r = await fetch(`${BASE}/api/awesome-list/nav`, { signal: AbortSignal.timeout(3000) });
        if (r.status === 200) { up = true; break; }
      } catch { /* not up yet */ }
    }
    if (!up) {
      console.error('FATAL: prod server did not come up in 60s. Boot log tail:');
      console.error(bootLog.slice(-2000));
      child.kill('SIGKILL');
      process.exit(1);
    }
  } else {
    try {
      await fetch(`${BASE}/api/awesome-list/nav`, { signal: AbortSignal.timeout(5000) });
    } catch {
      console.error(`FATAL: server not reachable at ${BASE}. Start the app workflow first (or use --spawn against a build).`);
      process.exit(1);
    }
  }

  console.log(`\nCache-contract matrix against ${BASE}\n`);

  // ---- 1. HTML documents: no-store, unvalidatable (GET + HEAD) ----------
  for (const path of ['/', '/about']) {
    const { res } = await timedFetch(path);
    const cc = header(res, 'cache-control');
    record(
      `HTML GET ${path} no-store`,
      res.status === 200 && cc === 'no-store' && !header(res, 'etag') && !header(res, 'last-modified'),
      `status=${res.status} cc=${JSON.stringify(cc)} etag=${header(res, 'etag')} lm=${header(res, 'last-modified')}`,
    );
  }
  {
    const { res } = await timedFetch('/', { method: 'HEAD' });
    const cc = header(res, 'cache-control');
    record(
      'HTML HEAD / no-store (no leaked validators)',
      res.status === 200 && cc === 'no-store' && !header(res, 'etag') && !header(res, 'last-modified'),
      `status=${res.status} cc=${JSON.stringify(cc)} etag=${header(res, 'etag')} lm=${header(res, 'last-modified')}`,
    );
  }
  {
    // Even an explicitly conditional document HEAD must not reach sendFile's
    // 304 path: a nonce-bearing document is always a fresh 200/no-store.
    const conditional = await rawConditionalGet(
      '/',
      // `*` matches any existing representation. Without the document-header
      // scrubber, sendFile would answer 304 here; a made-up ETag would not
      // actually exercise that regression path.
      '*',
      'HEAD',
    );
    record(
      'HTML conditional HEAD cannot become 304',
      conditional.status === 200 &&
        conditional.headers['cache-control'] === 'no-store' &&
        !conditional.headers.etag &&
        !conditional.headers['last-modified'],
      `status=${conditional.status} cc=${JSON.stringify(conditional.headers['cache-control'])} etag=${conditional.headers.etag} lm=${conditional.headers['last-modified']} TTFB=${conditional.ttfbMs.toFixed(0)}ms`,
    );
  }

  // ---- 2. Hashed assets: public+immutable + 304 (prod build only) -------
  {
    const { res, body } = await timedFetch('/');
    const m = body.match(/\/assets\/[A-Za-z0-9._-]+\.js/);
    if (!m) {
      record('asset public+immutable', null, 'no /assets/*.js reference in HTML (dev server) — run with --spawn for asset coverage');
    } else {
      const assetPath = m[0];
      const a = await timedFetch(assetPath);
      const cc = header(a.res, 'cache-control');
      record(
        `asset GET ${assetPath}`,
        a.res.status === 200 && cc === 'public, max-age=31536000, immutable',
        `status=${a.res.status} cc=${JSON.stringify(cc)}`,
      );
      const etag = header(a.res, 'etag');
      if (etag) {
        const b = await rawConditionalGet(assetPath, etag);
        record('asset conditional GET → 304', b.status === 304, `status=${b.status} TTFB=${b.ttfbMs.toFixed(0)}ms`);
      } else {
        record('asset conditional GET → 304', false, 'no ETag on asset response');
      }
    }
  }

  // ---- 3. Catalog: unfiltered, filtered (known + unknown), nav ----------
  const CATALOG_CC = 'public, max-age=60, must-revalidate';
  const catalogCases = [
    ['/api/awesome-list', 'unfiltered corpus', 'strong'],
    ['/api/awesome-list?category=encoding-codecs', 'filtered: category', 'strong'],
    ['/api/awesome-list?category=encoding-codecs&subcategory=codecs', 'filtered: cat+sub', 'strong'],
    ['/api/awesome-list/nav', 'nav projection', 'strong'],
  ];
  for (const [path, label, etagKind] of catalogCases) {
    const warm1 = await timedFetch(path); // may be a cold rebuild
    const warm2 = await timedFetch(path);
    const cc = header(warm2.res, 'cache-control');
    const etag = header(warm2.res, 'etag');
    const strong = etag != null && etag.startsWith('"');
    let pass = warm2.res.status === 200 && cc === CATALOG_CC && !!etag;
    if (etagKind === 'strong') pass = pass && strong;
    record(
      `${label} contract`,
      pass,
      `cc=${JSON.stringify(cc)} etag=${etag && etag.slice(0, 18)}… strong=${strong} coldTTFB=${warm1.ttfbMs.toFixed(0)}ms warmTTFB=${warm2.ttfbMs.toFixed(0)}ms`,
    );
    if (etag) {
      const c = await timedFetch(path, { headers: { 'If-None-Match': etag } });
      record(`${label} 304 revalidation`, c.res.status === 304, `status=${c.res.status} TTFB=${c.ttfbMs.toFixed(0)}ms`);
    }
  }
  {
    const { res } = await timedFetch('/api/awesome-list?category=zzz-not-a-real-slug');
    const cc = header(res, 'cache-control');
    record(
      'unknown-slug variant stays uncached-contract',
      res.status === 200 && cc === 'public, max-age=0, must-revalidate',
      `status=${res.status} cc=${JSON.stringify(cc)}`,
    );
  }

  // ---- 4. Taxonomy endpoints --------------------------------------------
  for (const path of ['/api/categories', '/api/tags', '/api/subcategories', '/api/sub-subcategories']) {
    const { res } = await timedFetch(path);
    const cc = header(res, 'cache-control');
    const etag = header(res, 'etag');
    record(
      `taxonomy ${path}`,
      res.status === 200 && cc === CATALOG_CC && !!etag,
      `status=${res.status} cc=${JSON.stringify(cc)} etag=${etag && etag.slice(0, 18)}…`,
    );
    if (etag) {
      const conditional = await rawConditionalGet(path, etag);
      record(
        `taxonomy ${path} 304 revalidation`,
        conditional.status === 304,
        `status=${conditional.status} TTFB=${conditional.ttfbMs.toFixed(0)}ms`,
      );
    }
  }

  // ---- 5. Public REST API -----------------------------------------------
  {
    const l = await timedFetch('/api/public/resources?limit=5', publicApiOptions());
    const cc = header(l.res, 'cache-control');
    const etag = header(l.res, 'etag');
    record(
      'public list contract',
      l.res.status === 200 && cc === 'public, max-age=60' && !!etag,
      `status=${l.res.status} cc=${JSON.stringify(cc)} etag=${etag && etag.slice(0, 14)}…`,
    );
    if (etag) {
      const c = await rawConditionalGet('/api/public/resources?limit=5', etag, 'GET', publicApiOptions().headers);
      record('public list 304 revalidation', c.status === 304, `status=${c.status} TTFB=${c.ttfbMs.toFixed(0)}ms`);
    }
    let id = null;
    try { id = JSON.parse(l.body)?.resources?.[0]?.id ?? null; } catch { /* noop */ }
    if (id != null) {
      const d = await timedFetch(`/api/public/resources/${id}`, publicApiOptions());
      const detailEtag = header(d.res, 'etag');
      record(
        'public detail contract',
        d.res.status === 200 && header(d.res, 'cache-control') === 'public, max-age=60' && !!detailEtag,
        `status=${d.res.status} cc=${JSON.stringify(header(d.res, 'cache-control'))} etag=${detailEtag && detailEtag.slice(0, 14)}…`,
      );
      if (detailEtag) {
        const conditional = await rawConditionalGet(`/api/public/resources/${id}`, detailEtag, 'GET', publicApiOptions().headers);
        record(
          'public detail 304 revalidation',
          conditional.status === 304,
          `status=${conditional.status} TTFB=${conditional.ttfbMs.toFixed(0)}ms`,
        );
      }
    } else {
      record('public detail contract', false, 'could not extract a resource id from the list payload');
    }
    const nf = await timedFetch('/api/public/resources/999999999', publicApiOptions());
    record(
      'public detail 404 no-store',
      nf.res.status === 404 && header(nf.res, 'cache-control') === 'no-store',
      `status=${nf.res.status} cc=${JSON.stringify(header(nf.res, 'cache-control'))}`,
    );
    const cats = await timedFetch('/api/public/categories', publicApiOptions());
    record(
      'public categories contract',
      cats.res.status === 200 && header(cats.res, 'cache-control') === 'public, max-age=60',
      `status=${cats.res.status} cc=${JSON.stringify(header(cats.res, 'cache-control'))}`,
    );
  }

  // ---- 6. Authed surface stays non-cacheable (spot check) ----------------
  {
    const { res } = await timedFetch('/api/notifications');
    const cc = header(res, 'cache-control') || '';
    record(
      'authed endpoint non-cacheable spot check',
      // The auth middleware owns this 401 response and does not currently
      // attach a no-store header. What matters for this public-cache audit is
      // that it is never marked reusable by a shared cache.
      (res.status === 401 || res.status === 403) && !cc.includes('public'),
      `status=${res.status} cc=${JSON.stringify(cc)}`,
    );
  }

  // ---- summary ------------------------------------------------------------
  const failed = results.filter((r) => r.pass === false);
  const skipped = results.filter((r) => r.pass === null);
  console.log(`\n${results.length - failed.length - skipped.length} passed, ${failed.length} failed, ${skipped.length} skipped`);
  if (child) child.kill('SIGTERM');
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  if (child) child.kill('SIGKILL');
  process.exit(1);
});
