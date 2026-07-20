// Task 184 live verification: NB-020, BUG-049, axe Users/Approvals, admin smoke.
import { chromium } from 'playwright';
import fs from 'fs';

const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const BASE = 'http://localhost:5000';
const OUT = '/tmp/t184';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const ok = (n, p, d = '') => { results.push({ n, p, d }); console.log(`${p ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`); };

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
const page = await ctx.newPage();
page.on('pageerror', e => pageErrors.push(String(e).slice(0, 200)));

// login
const res = await ctx.request.post(`${BASE}/api/auth/local/login`, { data: { email: 'admin@example.com', password: process.env.ADMIN_PASSWORD || 'admin123' } });
ok('admin login', res.ok(), String(res.status()));

await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1500);

// ---- NB-020: tab keyboard access
const tablist = page.getByRole('tablist').first();
const firstTab = page.getByRole('tab').first();
await firstTab.focus();
const before = await page.evaluate(() => ({
  sel: document.activeElement?.getAttribute('aria-selected'),
  id: document.activeElement?.textContent?.trim(),
}));
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
const after = await page.evaluate(() => ({
  role: document.activeElement?.getAttribute('role'),
  sel: document.activeElement?.getAttribute('aria-selected'),
  id: document.activeElement?.textContent?.trim(),
}));
ok('NB-020 ArrowRight moves focus to next tab', after.role === 'tab' && after.id !== before.id, `${before.id} -> ${after.id} sel=${after.sel}`);
// Radix automatic activation should also select it
ok('NB-020 arrowed tab is selected (roving+activation)', after.sel === 'true', String(after.sel));
// Tab count / tabindex roving: only one tab has tabindex=0
const roving = await page.evaluate(() => {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  return { total: tabs.length, tab0: tabs.filter(t => t.tabIndex === 0).length };
});
ok('NB-020 roving tabindex (exactly one tab tabbable)', roving.tab0 === 1, JSON.stringify(roving));
await page.screenshot({ path: `${OUT}/nb-020-tabs-keyboard.png` });

// helper to open a tab by matching accessible name
async function openTab(re) {
  await page.getByRole('tab', { name: re }).first().click();
  await page.waitForTimeout(1200);
  const active = await page.getByRole('tab', { name: re }).first().getAttribute('data-state');
  return active === 'active';
}

// ---- BUG-049: Resource Manager edit dialog validation
ok('open Resources tab', await openTab(/resource manager|resources/i));
await page.waitForSelector('[data-testid^="button-edit-"]', { timeout: 15000 });
await page.locator('[data-testid^="button-edit-"]').first().click();
await page.waitForSelector('[data-testid="input-edit-title"]', { timeout: 5000 });
// invalid values
await page.fill('[data-testid="input-edit-title"]', '');
await page.fill('[data-testid="input-edit-url"]', 'notaurl');
await page.fill('[data-testid="input-edit-description"]', 'short');
await page.click('[data-testid="button-save-edit"]');
await page.waitForTimeout(400);
const tErr = await page.locator('[data-testid="error-edit-title"]').textContent().catch(() => null);
const uErr = await page.locator('[data-testid="error-edit-url"]').textContent().catch(() => null);
const dErr = await page.locator('[data-testid="error-edit-description"]').textContent().catch(() => null);
ok('BUG-049 edit inline title error', !!tErr, tErr || '');
ok('BUG-049 edit inline url error', !!uErr, uErr || '');
ok('BUG-049 edit inline description error', !!dErr, dErr || '');
const ariaInvalid = await page.locator('[data-testid="input-edit-url"]').getAttribute('aria-invalid');
const ariaDesc = await page.locator('[data-testid="input-edit-url"]').getAttribute('aria-describedby');
ok('BUG-049 aria-invalid + aria-describedby wired', ariaInvalid === 'true' && ariaDesc === 'edit-url-error', `${ariaInvalid}/${ariaDesc}`);
await page.screenshot({ path: `${OUT}/bug-049-edit-inline-errors.png` });
// typing clears error
await page.fill('[data-testid="input-edit-url"]', 'https://example.com');
await page.waitForTimeout(200);
ok('BUG-049 typing clears url error', !(await page.locator('[data-testid="error-edit-url"]').isVisible().catch(() => false)));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// create dialog: http url must fail (httpsUrlSchema)
await page.locator('button', { hasText: 'Add Resource' }).first().click().catch(async () => {
  await page.locator('[data-testid="button-create-resource"], [data-testid="button-add-resource"]').first().click();
});
await page.waitForSelector('[data-testid="input-create-title"]', { timeout: 5000 });
await page.fill('[data-testid="input-create-title"]', 'QA Title valid');
await page.fill('[data-testid="input-create-url"]', 'http://example.com/tool');
const createBtn = page.locator('[data-testid="button-confirm-create"], [data-testid="button-create-save"]');
// find footer save button generically
const saveBtn = (await createBtn.count()) ? createBtn.first() : page.getByRole('button', { name: /create|add resource|save/i }).last();
await saveBtn.click();
await page.waitForTimeout(400);
const cUrlErr = await page.locator('[data-testid="error-create-url"]').textContent().catch(() => null);
ok('BUG-049 create requires https (inline error)', !!cUrlErr && /https/i.test(cUrlErr), cUrlErr || '');
await page.screenshot({ path: `${OUT}/bug-049-create-https-error.png` });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// ---- axe on Users + Approvals
const axeSrc = fs.readFileSync('/tmp/axe.min.js', 'utf8');
async function runAxe(name) {
  await page.evaluate(axeSrc);
  const r = await page.evaluate(async () => {
    const res = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] });
    return res.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target }));
  });
  fs.writeFileSync(`${OUT}/axe-${name}.json`, JSON.stringify(r, null, 2));
  const serious = r.filter(v => v.impact === 'serious' || v.impact === 'critical');
  ok(`axe ${name} no serious/critical`, serious.length === 0, JSON.stringify(serious).slice(0, 300));
  return r;
}
ok('open Users tab', await openTab(/^users$/i));
await runAxe('users');
// R4-041: role select aria-label
const roleAria = await page.locator('[data-testid^="select-role-"], [aria-label^="Change role for"]').first().getAttribute('aria-label').catch(() => null);
ok('R4-041 role select aria-label present', !!roleAria && roleAria.startsWith('Change role for'), roleAria || 'none');
await page.screenshot({ path: `${OUT}/r4-041-users.png` });

ok('open Approvals tab', await openTab(/pending|approvals/i));
await page.waitForTimeout(1200);
await runAxe('approvals');
// R5-058 keyboard region
const region = page.locator('[role="region"][aria-label*="scroll" i], [role="region"][tabindex="0"]').first();
const regionExists = await region.count();
ok('R5-058 approvals scroller keyboard region', regionExists > 0, String(regionExists));
await page.screenshot({ path: `${OUT}/r5-058-approvals.png` });

// ---- admin smoke: cycle key tabs, assert active panel has content
for (const [name, re] of [['Link Health', /link health/i], ['Export', /export/i], ['Audit', /audit/i], ['Enrichment', /enrichment/i], ['Researcher', /researcher/i]]) {
  const active = await openTab(re);
  const panelText = await page.locator('[role="tabpanel"][data-state="active"]').first().innerText().catch(() => '');
  ok(`smoke ${name} tab renders`, active && panelText.trim().length > 20, `${panelText.trim().slice(0, 60)}`);
}
// Link Health counters R4-044
const lhActive = await openTab(/link health/i);
await page.waitForTimeout(1500);
const lh = await page.evaluate(() => {
  const g = id => document.querySelector(`[data-testid="${id}"]`)?.textContent?.trim() ?? null;
  const noData = !!document.body.innerText.includes('No link health checks performed yet');
  return { noData, total: g('counter-total-links'), healthy: g('counter-healthy-links'), broken: g('counter-broken-links'), redirects: g('counter-redirect-links'), timeout: g('counter-timeout-links'), suspect: g('counter-suspect-links') };
});
const nums = Object.fromEntries(Object.entries(lh).filter(([k]) => k !== 'noData').map(([k, v]) => [k, v === null ? null : parseInt(String(v).replace(/[^\d]/g, ''), 10)]));
const consistent = lh.noData || (nums.total !== null && nums.healthy + nums.broken + nums.redirects + nums.timeout + nums.suspect <= nums.total);
ok('R4-044 link-health counters (one dataset or explicit no-data state)', lhActive && consistent, JSON.stringify(lh));
await page.screenshot({ path: `${OUT}/r4-044-linkhealth.png` });

ok('no page errors during run', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 300));

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
const fails = results.filter(r => !r.p);
console.log(`\n${results.length - fails.length}/${results.length} PASS`);
await browser.close();
process.exit(0);
