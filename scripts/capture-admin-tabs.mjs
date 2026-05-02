import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'screenshots', 'admin');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

const TABS = [
  { id: 'approvals',         label: 'Pending Resources (Approvals)' },
  { id: 'edits',             label: 'Pending Edits' },
  { id: 'enrichment',        label: 'AI Batch Enrichment' },
  { id: 'researcher',        label: 'AI Researcher' },
  { id: 'export',            label: 'Export (Markdown / JSON / OPML)' },
  { id: 'database',          label: 'Database Tools' },
  { id: 'resources',         label: 'Resource Manager' },
  { id: 'categories',        label: 'Categories' },
  { id: 'subcategories',     label: 'Subcategories' },
  { id: 'subsubcategories',  label: 'Sub-Subcategories' },
  { id: 'users',             label: 'Users' },
  { id: 'github',            label: 'GitHub Sync' },
  { id: 'linkhealth',        label: 'Link Health Monitor' },
  { id: 'audit',             label: 'Audit Log' },
];

// Log in once with a throwaway browser context, return its storage state so each
// per-tab browser launch can hydrate auth cookies via context options. Doing the
// login inside Playwright (instead of node fetch + manual addCookies) avoids
// cookie-shape mismatches that left earlier captures unauthenticated.
async function loginAndGetStorageState() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const context = await browser.newContext();
    const res = await context.request.post(`${BASE_URL}/api/auth/local/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok()) throw new Error(`Login failed: HTTP ${res.status()} ${await res.text()}`);
    // Sanity-check the session by fetching /api/auth/user.
    const me = await context.request.get(`${BASE_URL}/api/auth/user`);
    const meBody = await me.json();
    if (!meBody?.isAuthenticated) throw new Error(`/api/auth/user did not confirm session: ${JSON.stringify(meBody)}`);
    return await context.storageState();
  } finally {
    await browser.close().catch(() => {});
  }
}

async function captureOne(page, tab, num, total) {
  const file = `${num}_admin_${tab.id}.png`;
  const outPath = join(OUT_DIR, file);
  process.stdout.write(`\n📸 [${num}/${total}] ${tab.id} — ${tab.label}\n`);

  try {
    const target = tab.id === 'overview' ? `${BASE_URL}/admin` : `${BASE_URL}/admin#${tab.id}`;

    // Re-using a persistent page across all tabs: navigate fresh each time so
    // the URL hash drives the initial active tab via useState reading location.hash.
    // We also push the hash explicitly via History API in case wouter intercepts.
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the dashboard to leave its "Loading admin dashboard..." stage.
    // First wait for ANY text to appear (proves React mounted), then wait for
    // tablist (proves useAdmin() resolved past the loading guard).
    await page.waitForFunction(() => document.body.innerText.length > 10, null, { timeout: 15000 })
      .catch(() => process.stdout.write(`   ⚠ body never gained text in 15s\n`));

    try {
      await page.waitForSelector('[role="tablist"]', { timeout: 25000, state: 'visible' });
    } catch (e) {
      const bodyPreview = await page.evaluate(() => document.body.innerText.slice(0, 300)).catch(() => '');
      process.stdout.write(`   ⚠ tablist never appeared. body preview: ${JSON.stringify(bodyPreview)}\n`);
    }

    // Settle: let the tab's queries paint. Many tabs lazy-load on first click.
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2500);

    // Viewport-only (1440×900) — captures tab nav + stats cards + first ~10 rows.
    await page.screenshot({ path: outPath, fullPage: false });
    const stat = await fs.stat(outPath);
    process.stdout.write(`   ✓ saved ${file} (${(stat.size / 1024).toFixed(0)} KB)\n`);
    return { ...tab, file, bytes: stat.size, ok: true };
  } catch (err) {
    console.error(`   ✗ failed: ${err.message.slice(0, 200)}`);
    return { ...tab, file, ok: false, error: err.message };
  }
}

async function run() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  console.log('🔑 Logging in as admin (via Playwright context)...');
  const storageState = await loginAndGetStorageState();
  console.log(`   storage state has ${storageState.cookies.length} cookie(s): ${storageState.cookies.map(c => c.name).join(', ')}`);

  // Build the full ordered list (overview at index 0, then 14 tabs).
  const ALL = [
    { id: 'overview', label: 'Admin Dashboard Overview (stats + default tab)' },
    ...TABS,
  ];

  // Optional --range=START:END (inclusive, 0-based) to capture a slice.
  const rangeArg = process.argv.find(a => a.startsWith('--range='));
  let startIdx = 0, endIdx = ALL.length - 1;
  if (rangeArg) {
    const [s, e] = rangeArg.replace('--range=', '').split(':').map(Number);
    startIdx = Number.isFinite(s) ? s : 0;
    endIdx = Number.isFinite(e) ? e : ALL.length - 1;
  }
  const writeIndex = process.argv.includes('--write-index');

  // Single persistent browser + context + page for the whole batch — way more
  // reliable than relaunching per tab, and viewport-only screenshots keep
  // memory bounded so OOM isn't a risk.
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    storageState,
  });
  const page = await context.newPage();
  page.on('pageerror', (err) => process.stdout.write(`   [pageerror] ${err.message.slice(0, 200)}\n`));

  // Confirm auth landed on this page context before capturing anything.
  const authProbe = await context.request.get(`${BASE_URL}/api/auth/user`);
  const authJson = await authProbe.json().catch(() => ({}));
  console.log(`   auth probe: HTTP ${authProbe.status()} isAuthenticated=${authJson?.isAuthenticated} role=${authJson?.user?.role}`);
  if (!authJson?.isAuthenticated) {
    await browser.close();
    throw new Error('Page context is not authenticated — admin captures would all be blank.');
  }

  const results = [];
  try {
    for (let i = startIdx; i <= endIdx && i < ALL.length; i++) {
      const num = String(i).padStart(2, '0');
      results.push(await captureOne(page, ALL[i], num, ALL.length - 1));
    }
  } finally {
    await browser.close().catch(() => {});
  }

  if (!writeIndex) {
    const failed = results.filter(r => !r.ok);
    console.log(`\nBatch done: ${results.length - failed.length}/${results.length} ok`);
    process.exit(failed.length ? 1 : 0);
  }

  // --write-index: scan the directory for already-captured files and emit INDEX.md
  // covering everything on disk, regardless of which batch produced what.
  const onDisk = (await fs.readdir(OUT_DIR)).filter(f => f.endsWith('.png')).sort();
  const idToLabel = new Map(ALL.map(t => [t.id, t.label]));
  const lines = [
    '# Admin Dashboard Screenshots',
    '',
    `Captured ${new Date().toISOString().slice(0, 10)} against \`${BASE_URL}\` at 1440×900 viewport, 1× DPR. Each screenshot is the visible viewport on first paint after the tab loads — enough to show the tab navigation, stats cards, and the first page of any list.`,
    '',
    '| # | Tab | Description | File |',
    '|---|-----|-------------|------|',
  ];
  for (const f of onDisk) {
    const m = f.match(/^(\d+)_admin_(.+)\.png$/);
    if (!m) continue;
    const [, num, id] = m;
    const label = idToLabel.get(id) || id;
    lines.push(`| ${num} | \`#${id}\` | ${label} | [${f}](./${f}) |`);
  }
  await fs.writeFile(join(OUT_DIR, 'INDEX.md'), lines.join('\n') + '\n');
  console.log(`\n📝 Wrote ${join(OUT_DIR, 'INDEX.md')}`);

  const failed = results.filter(r => !r.ok);
  if (failed.length) {
    console.error(`\n❌ ${failed.length}/${results.length} captures failed`);
    process.exit(1);
  }
  console.log(`\n✅ All ${results.length} captures saved to screenshots/admin/`);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
