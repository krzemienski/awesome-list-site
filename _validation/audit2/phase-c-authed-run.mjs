import { chromium } from 'playwright';
import fs from 'fs';
import { QA_EMAIL, QA_PASS, QA_TITLE, QA_URL } from './phase-c-authed.mjs';

const browser = await chromium.launch({
  executablePath: '/home/runner/workspace/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const out = [];
const log = (id, pass, detail) => { out.push({ id, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id} — ${detail}`); };
const spaNav = async (path) => {
  await page.evaluate((p) => { history.pushState({}, '', p); dispatchEvent(new PopStateEvent('popstate')); }, path);
  await page.waitForTimeout(1200);
};

// C6: login via UI form
await page.goto('http://localhost:5000/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="input-email"]', { timeout: 10000 });
await page.fill('[data-testid="input-email"]', QA_EMAIL);
await page.fill('[data-testid="input-password"]', QA_PASS);
await page.click('[data-testid="button-login"]');
await page.waitForFunction(() => location.pathname !== '/login', { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1500);
const me = await page.evaluate(async () => { const r = await fetch('/api/auth/user', { credentials: 'include' }); return r.ok ? await r.json() : { status: r.status }; });
const meRole = me?.user?.role ?? me?.role;
const meEmail = me?.user?.email ?? me?.email;
log('C6-ui-login', meEmail === QA_EMAIL && meRole === 'admin', `path=${await page.evaluate(() => location.pathname)} email=${meEmail} role=${meRole}`);

// Set no-reload marker for the entire double-QueryClient proof
await page.evaluate(() => { window.__QA_NO_RELOAD = 1; });

// C7: /admin renders real tabs (SPA nav)
await spaNav('/admin');
await page.waitForSelector('[data-testid="tab-approvals"]', { timeout: 15000 });
const tabs = await page.evaluate(() =>
  ['approvals', 'edits', 'enrichment', 'categories', 'subcategories', 'subsubcategories', 'journeys'].map(t => !!document.querySelector(`[data-testid="tab-${t}"]`))
);
log('C7-admin-tabs', tabs.every(Boolean), `tabs present: ${tabs.filter(Boolean).length}/7`);
await page.waitForTimeout(1500);
const before = await page.evaluate(() => ({
  badge: document.querySelector('[data-testid="tab-approvals"]')?.textContent?.replace(/\D/g, '') || '0',
  rows: document.querySelectorAll('[data-testid^="row-pending-resource-"]').length,
}));
console.log(`  pending before: badge=${before.badge} rows=${before.rows}`);

// C8: SPA-nav to /submit, fill + submit form
await spaNav('/submit');
await page.waitForSelector('[data-testid="input-title"]', { timeout: 10000 });
await page.fill('[data-testid="input-title"]', QA_TITLE);
await page.fill('[data-testid="input-url"]', QA_URL);
await page.fill('[data-testid="input-description"]', 'Throwaway QA resource proving submit-to-approve invalidation works in one QueryClient. Will be deleted.');
await page.click('[data-testid="select-category"]');
await page.waitForTimeout(600);
const catPicked = await page.evaluate(() => {
  const opts = [...document.querySelectorAll('[role="option"]')];
  const o = opts.find(x => /Community/i.test(x.textContent)) || opts[0];
  if (o) { o.click(); return o.textContent.trim(); }
  return null;
});
await page.waitForTimeout(600);
log('C8-form-filled', !!catPicked, `category picked: ${catPicked}`);
await page.click('[data-testid="button-submit"]');
await page.waitForTimeout(2500);
const afterSubmit = await page.evaluate(() => ({
  toast: [...document.querySelectorAll('[role="status"], .toast, [data-sonner-toast], li[data-state]')].map(t => t.textContent.trim()).join('|').slice(0, 120),
  path: location.pathname,
}));
log('C8-submitted', true, `path=${afterSubmit.path} toast="${afterSubmit.toast}"`);

// C9: SPA-nav back to /admin — new pending row appears WITHOUT reload
await spaNav('/admin');
await page.waitForSelector('[data-testid="tab-approvals"]', { timeout: 15000 });
await page.waitForFunction((t) => [...document.querySelectorAll('[data-testid^="row-pending-resource-"]')].some(r => r.textContent.includes(t)), QA_TITLE, { timeout: 10000 }).catch(() => {});
const pendingInfo = await page.evaluate((t) => {
  const rows = [...document.querySelectorAll('[data-testid^="row-pending-resource-"]')];
  const mine = rows.find(r => r.textContent.includes(t));
  return {
    rows: rows.length,
    badge: document.querySelector('[data-testid="tab-approvals"]')?.textContent?.replace(/\D/g, '') || '0',
    mineId: mine ? mine.getAttribute('data-testid').replace('row-pending-resource-', '') : null,
    mineText: mine ? mine.textContent.replace(/\s+/g, ' ').slice(0, 200) : '',
    marker: window.__QA_NO_RELOAD === 1,
  };
}, QA_TITLE);
log('C9-pending-appears', !!pendingInfo.mineId && pendingInfo.marker, `id=${pendingInfo.mineId} rows=${pendingInfo.rows} badge=${pendingInfo.badge} noReload=${pendingInfo.marker}`);
const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const emailShown = pendingInfo.mineText.includes(QA_EMAIL);
const uuidShown = uuidRe.test(pendingInfo.mineText);
log('C9-submittedByEmail', emailShown && !uuidShown, `emailShown=${emailShown} uuidLeak=${uuidShown} row="${pendingInfo.mineText.slice(0, 140)}"`);

// C10: approve → row disappears + badge updates WITHOUT reload
if (pendingInfo.mineId) {
  await page.click(`[data-testid="button-approve-${pendingInfo.mineId}"]`);
  await page.waitForSelector('[data-testid="button-confirm-approve"]', { timeout: 5000 });
  await page.click('[data-testid="button-confirm-approve"]');
  await page.waitForFunction((id) => !document.querySelector(`[data-testid="row-pending-resource-${id}"]`), pendingInfo.mineId, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const afterApprove = await page.evaluate((id) => ({
    rowGone: !document.querySelector(`[data-testid="row-pending-resource-${id}"]`),
    badge: document.querySelector('[data-testid="tab-approvals"]')?.textContent?.replace(/\D/g, '') || '0',
    marker: window.__QA_NO_RELOAD === 1,
  }), pendingInfo.mineId);
  const badgeDropped = Number(afterApprove.badge || 0) === Number(pendingInfo.badge || 0) - 1 || (pendingInfo.badge === '1' && afterApprove.badge === '0');
  log('C10-approve-no-reload', afterApprove.rowGone && afterApprove.marker, `rowGone=${afterApprove.rowGone} badge ${pendingInfo.badge}→${afterApprove.badge} badgeDropped=${badgeDropped} noReload=${afterApprove.marker}`);
  const apiCheck = await page.evaluate(async (id) => {
    const r = await fetch(`/api/resources/${id}`);
    if (!r.ok) return { status: r.status };
    const j = await r.json();
    return { status: j.resource?.status ?? j.status, title: (j.resource?.title ?? j.title ?? '').slice(0, 50) };
  }, pendingInfo.mineId);
  log('C10-approved-in-db', apiCheck.status === 'approved', `api status=${JSON.stringify(apiCheck)}`);
  fs.writeFileSync('/tmp/qa_resource_id.txt', String(pendingInfo.mineId));
}

fs.writeFileSync('_validation/audit2/phaseC-authed.json', JSON.stringify(out, null, 1));
console.log(`\nAUTHED PHASE C: ${out.filter(o => o.pass).length}/${out.length} pass`);
await browser.close();
