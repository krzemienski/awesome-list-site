// Task 184 admin smoke: login → Approvals → approve/reject a QA resource → Users → Link Health.
import { chromium } from 'playwright';
import fs from 'fs';

const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const BASE = 'http://localhost:5000';
const OUT = '/tmp/t184';
const results = [];
const ok = (n, p, d = '') => { results.push({ n, p, d }); console.log(`${p ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`); };

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const res = await ctx.request.post(`${BASE}/api/auth/local/login`, { data: { email: 'admin@example.com', password: process.env.ADMIN_PASSWORD || 'admin123' } });
ok('login', res.ok());

// seed a throwaway pending resource via admin API
const create = await ctx.request.post(`${BASE}/api/admin/resources`, {
  data: { title: '__qa_test_t184 smoke resource', url: 'https://example.com/__qa_test_t184b', description: 'QA throwaway resource for approvals smoke test.', category: 'Learning Resources', status: 'pending' },
});
const body = await create.text();
const created = create.ok() ? JSON.parse(body) : null;
const rid = created?.id || created?.resource?.id || Number(process.env.QA_RID);
ok('seed pending QA resource', !!rid, `${create.status()} ${String(rid)} ${create.ok() ? '' : body.slice(0,150)}`);

await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 45000 });
await page.getByRole('tab', { name: /pending|approvals/i }).first().click();
await page.waitForTimeout(1500);
const row = page.locator(`[data-testid="row-pending-resource-${rid}"]`);
ok('QA row visible in Approvals', await row.count() > 0);
await page.locator(`[aria-label="Reject __qa_test_t184 smoke resource"]`).first().click();
await page.waitForTimeout(600);
await page.locator('[data-testid="textarea-rejection-reason"]').fill('QA smoke test rejection — throwaway resource.');
await page.locator('[data-testid="button-confirm-reject"]').click();
await page.waitForTimeout(1500);
ok('reject removes row from Approvals', (await page.locator(`[data-testid="row-pending-resource-${rid}"]`).count()) === 0);
await page.screenshot({ path: `${OUT}/smoke-approvals-after-reject.png` });

await page.getByRole('tab', { name: /^users$/i }).first().click();
await page.waitForTimeout(1200);
ok('Users tab renders', (await page.locator('[role="tabpanel"][data-state="active"]').innerText()).length > 20);
await page.getByRole('tab', { name: /link health/i }).first().click();
await page.waitForTimeout(1200);
ok('Link Health tab renders', (await page.locator('[role="tabpanel"][data-state="active"]').innerText()).includes('Link Health'));

// teardown: hard-delete the QA resource
if (rid) {
  const del = await ctx.request.delete(`${BASE}/api/admin/resources/${rid}`);
  ok('teardown QA resource deleted', del.ok(), String(del.status()));
}
fs.writeFileSync(`${OUT}/smoke-results.json`, JSON.stringify(results, null, 2));
console.log(`\n${results.filter(r => r.p).length}/${results.length} PASS`);
await browser.close();
process.exit(0);
