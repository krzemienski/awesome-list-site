// Aggressive admin audit — Radix UI-aware, drag through every tab,
// enumerate all buttons in each, fire XSS/SQL/empty-submit via every input,
// screenshot every step. Then handle API endpoints via direct fetch with auth.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';
const BUGS = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/bugs';
const AUTH = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/hunt-auth.json';
const RESULT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/admin-deep2.json';

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(BUGS, { recursive: true });

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: AUTH,
  });
  const findings = { tabs: [], directApi: [], consoleErrs: [], networkErrs: [], bugCandidates: [] };

  const log = (...a) => console.log('[adm2]', ...a);
  const safe = (s) => s.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const shot = async (p, name) => await p.screenshot({ path: `${OUT}/admin2_${name}.png`, fullPage: true });

  const attachErrLog = (page, slot) => {
    page.on('console', m => {
      if (m.type() === 'error' || m.type() === 'warning') {
        slot.consoleErrs.push({ url: page.url(), t: m.type(), msg: m.text().slice(0, 300) });
      }
    });
    page.on('pageerror', pe => slot.networkErrs.push({ url: page.url(), err: pe.message.slice(0, 300) }));
    page.on('response', resp => {
      if (resp.status() >= 400) {
        slot.networkErrs.push({ url: page.url(), resp: resp.url(), status: resp.status(), method: resp.request().method() });
      }
    });
  };

  // ─── PHASE 1: enumerate tabs in actual DOM ─────────────────────────────────
  log('PHASE 1: open /admin');
  const p = await ctx.newPage();
  attachErrLog(p, findings);
  await p.goto('https://awesome.video/admin', { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(3500);
  await shot(p, '00_admin_initial');

  // Find Radix tab triggers
  const tabData = await p.evaluate(() => {
    const tablist = document.querySelector('[role="tablist"]');
    if (!tablist) {
      // generic — look for buttons with text labels
      const all = [...document.querySelectorAll('button, [role="tab"]')]
        .filter(el => /^(Approvals|Edits|Enrichment|Researcher|Export|Database|Resources|Categories|Subcategories|Sub-Subcats|Journeys|Users|GitHub|Link Health|Audit)/.test((el.textContent || '').trim()))
        .map(el => ({ text: (el.textContent || '').trim(), role: el.getAttribute('role') || '', value: el.getAttribute('data-value') || el.getAttribute('value') || '', id: el.id, attrs: [...el.attributes].map(a => a.name + '=' + a.value).join('|') }));
      return { type: 'fallback', tabs: all };
    }
    const tabs = [...tablist.querySelectorAll('[role="tab"]')].map(el => ({
      text: (el.textContent || '').trim(),
      id: el.id,
      value: el.getAttribute('data-value') || el.getAttribute('value') || '',
      attrs: [...el.attributes].map(a => a.name + '=' + a.value).join('|'),
    }));
    return { type: 'tablist', tabs };
  });
  log('tab detection:', JSON.stringify(tabData, null, 2));

  if (tabData.type === 'tablist' && tabData.tabs.length === 0) {
    // Try baseline button selector
    const fallbackTabs = await p.evaluate(() => {
      const labels = ['Approvals', 'Edits', 'Enrichment', 'Researcher', 'Export', 'Database', 'Resources', 'Categories', 'Subcategories', 'Sub-Subcats', 'Journeys', 'Users', 'GitHub', 'Link Health', 'Audit'];
      return labels.filter(L => [...document.querySelectorAll('button, [role="tab"], a')].some(el => (el.textContent || '').trim() === L || (el.textContent || '').trim().startsWith(L)));
    });
    log('fallback tabs found by label:', fallbackTabs);
    tabData.tabs = fallbackTabs.map(t => ({ text: t }));
  }

  // ─── PHASE 2: drive each tab via Radix-compatible click ─────────────────
  const tabsToTest = (tabData.tabs || []).map(t => t.text);
  log('PHASE 2: clicking', tabsToTest.length, 'tabs');

  for (const tname of tabsToTest) {
    log('-- tab:', tname);
    // Reload to reset state
    await p.goto('https://awesome.video/admin', { waitUntil: 'networkidle', timeout: 30000 });
    await p.waitForTimeout(2500);

    // Click the tab
    let clicked = false;
    try {
      clicked = await p.evaluate((name) => {
        const targets = [...document.querySelectorAll('button, [role="tab"], a, [data-tab-value]')];
        const node = targets.find(el => (el.textContent || '').trim() === name || (el.textContent || '').trim().startsWith(name));
        if (node) {
          node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
          node.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
          node.click();
          return true;
        }
        return false;
      }, tname);
    } catch (e) { log('  click error', e.message); }
    log('  clicked:', clicked);
    await p.waitForTimeout(2500);
    await shot(p, `tab_${safe(tname)}_loaded`);

    // Enumerate EVERY visible interactive control now that tab is active
    const tabbed = await p.evaluate(() => {
      const all = [...document.querySelectorAll('button, [role="button"], a, input, textarea, select, [role="combobox"], [role="checkbox"]')];
      return all.map((el, i) => ({
        i, tag: el.tagName,
        type: el.type || '',
        text: (el.textContent || el.value || el.placeholder || el.getAttribute('aria-label') || '').trim().slice(0, 80),
        name: el.name || '',
        id: el.id || '',
        placeholder: el.placeholder || '',
        role: el.getAttribute('role') || '',
        href: el.getAttribute('href') || '',
        disabled: el.disabled || false,
        visible: !!(el.offsetWidth || el.offsetHeight),
        attrs: [...el.attributes].filter(a => a.name.startsWith('aria-') || a.name.startsWith('data-')).map(a => a.name + '=' + a.value).join('|'),
      }));
    }).catch(() => []);
    findings.tabs.push({ tab: tname, clicked, interactives: tabbed });
    log('  interactives:', tabbed.length);

    // Find every button by visible text
    const buttons = tabbed.filter(b => ['BUTTON', 'A'].includes(b.tag) && b.visible && b.text);
    log('  buttons:', buttons.length, buttons.slice(0, 12).map(b => b.text).join(' | '));

    // ─── XSS / SQL / empty / overflow per input ──────────────────────────
    const inputs = tabbed.filter(x => ['INPUT', 'TEXTAREA'].includes(x.tag) && x.visible && !['hidden', 'submit', 'checkbox', 'radio'].includes(x.type));
    log('  inputs:', inputs.length);

    for (const inp of inputs.slice(0, 4)) {
      // XSS
      try {
        const sel = (inp.id && `#${inp.id}`) || (inp.name && `[name="${inp.name}"]`) || (inp.placeholder && `[placeholder="${inp.placeholder}"]`);
        if (!sel) continue;
        const handle = await p.$(sel).catch(() => null);
        if (!handle) continue;
        await handle.click({ timeout: 1500 }).catch(() => {});
        await handle.fill('<script>alert(1)</script>', { timeout: 1500 }).catch(() => {});
        await p.waitForTimeout(400);
        await shot(p, `xss_${safe(tname)}_${safe(inp.name || inp.id || inp.placeholder).slice(0, 30)}_${Date.now()}`);
        // Find a Submit button in same form
        const sub = await p.evaluate((sel) => {
          const inp = document.querySelector(sel);
          const f = inp && inp.closest('form');
          return f ? (f.querySelector('button[type="submit"]') || f.querySelector('button')) : null;
        }, sel);
        if (sub) {
          await sub.click().catch(() => {});
          await p.waitForTimeout(800);
        }
      } catch (e) {}
      // Empty
      try {
        const sel = (inp.id && `#${inp.id}`) || (inp.name && `[name="${inp.name}"]`) || (inp.placeholder && `[placeholder="${inp.placeholder}"]`);
        const handle = await p.$(sel).catch(() => null);
        if (!handle) continue;
        await handle.click({ timeout: 1500 }).catch(() => {});
        await handle.fill('', { timeout: 1500 }).catch(async () => await handle.evaluate(el => el.value = '').catch(() => {}));
        await p.waitForTimeout(300);
        const sub = await p.evaluate((sel) => {
          const inp = document.querySelector(sel);
          const f = inp && inp.closest('form');
          return f ? (f.querySelector('button[type="submit"]') || f.querySelector('button')) : null;
        }, sel);
        if (sub) {
          await sub.click().catch(() => {});
          await p.waitForTimeout(800);
        }
      } catch (e) {}
      // Max-length overflow
      try {
        const sel = (inp.id && `#${inp.id}`) || (inp.name && `[name="${inp.name}"]`) || (inp.placeholder && `[placeholder="${inp.placeholder}"]`);
        const handle = await p.$(sel).catch(() => null);
        if (!handle) continue;
        await handle.click({ timeout: 1500 }).catch(() => {});
        const big = 'A'.repeat(8000);
        await handle.fill(big, { timeout: 2000 }).catch(async () => await handle.evaluate(el => { el.value = 'A'.repeat(8000); }).catch(() => {}));
        await p.waitForTimeout(500);
        await shot(p, `overflow_${safe(tname)}_${safe(inp.name || inp.id || inp.placeholder).slice(0, 30)}_${Date.now()}`);
      } catch (e) {}
    }

    // SQL injection: probe every text input with ' OR 1=1 --
    try {
      const sqlPayload = '\' OR 1=1--';
      const filters = await p.$$('input, textarea');
      for (const f of filters.slice(0, 4)) {
        const tag = await f.evaluate(el => el.tagName);
        const type = await f.evaluate(el => el.type);
        if (type === 'hidden' || type === 'submit') continue;
        await f.click({ timeout: 1000 }).catch(() => {});
        await f.fill(sqlPayload).catch(async () => await f.evaluate(el => { el.value = sqlPayload; }).catch(() => {}));
        await p.waitForTimeout(400);
      }
      await shot(p, `sqli_${safe(tname)}_${Date.now()}`);
    } catch (e) {}

    // ─── BUTTON BOMB: click every visible button that isn't a tab ───
    const startIdx = 0;
    // Get fresh handles (DOM re-rendered)
    const clickables = await p.$$('button:visible, [role="button"]:visible, a.button:visible');
    for (let i = 0; i < Math.min(clickables.length, 30); i++) {
      try {
        const txt = await clickables[i].evaluate(el => (el.textContent || '').trim().slice(0, 50)).catch(() => '');
        const isSubmit = await clickables[i].evaluate(el => el.type === 'submit' || el.tagName === 'A').catch(() => false);
        log(`    clickable ${i}: "${txt}"`);
        await shot(p, `tab_${safe(tname)}_before_click_${i}_${safe(txt).slice(0, 30)}`);
        await clickables[i].click({ timeout: 1500 }).catch(() => {});
        await p.waitForTimeout(1500);
        await shot(p, `tab_${safe(tname)}_after_click_${i}_${safe(txt).slice(0, 30)}`);
        // If a dialog/modal opened, close it (Escape)
        const esc = await p.keyboard.press('Escape').catch(() => {});
        await p.waitForTimeout(500);
      } catch (e) { /* ignore */ }
    }
  }

  await p.close();

  // ─── PHASE 3: Direct API probe with auth cookie ──────────────────────
  log('PHASE 3: API direct probe with auth cookie');
  const cookies = fs.readFileSync(AUTH, 'utf8');
  const cookieHeader = JSON.parse(cookies).cookies.map(c => `${c.name}=${c.value}`).join('; ');
  const apiProbe = async (url, method, body) => {
    const r = await fetch(url, {
      method,
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 admin-audit' },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });
    const text = await r.text().catch(() => '');
    return { url, method, status: r.status, body: text.slice(0, 800) };
  };

  const endpoints = [
    ['/api/admin/users', 'GET'],
    ['/api/admin/resources', 'GET'],
    ['/api/admin/categories', 'GET'],
    ['/api/admin/categories', 'POST', { name: 'TestCat-Audit-' + Date.now() }],
    ['/api/admin/resources', 'POST', { title: 'TestResource-Audit-' + Date.now(), url: 'https://example.com', category: 'community-events' }],
    ['/api/auth/me', 'GET'],
    ['/api/admin/journeys', 'GET'],
    ['/api/admin/submissions', 'GET'],
    ['/api/admin/config', 'GET'],
    ['/api/admin/settings', 'GET'],
    ['/api/admin/audit', 'GET'],
    ['/api/admin/health', 'GET'],
    ['/api/admin/db/export', 'GET'],
    ['/api/admin/db/import', 'POST', { foo: 'bar' }],
    ['/admin/api/users', 'GET'],
    ['/admin/api/categories', 'GET'],
    ['/api/users', 'GET'],
    ['/api/categories', 'GET'],
    ['/api/journeys', 'GET'],
    ['/api/submissions', 'GET'],
    // CSRF-style: uncookied POST to admin endpoints
  ];
  for (const ep of endpoints) {
    try {
      const r = await apiProbe('https://awesome.video' + ep[0], ep[1], ep[2]);
      findings.directApi.push(r);
      log('  api', ep[1], ep[0], '->', r.status);
    } catch (e) {
      findings.directApi.push({ url: ep[0], method: ep[1], error: e.message });
    }
  }

  // CSRF without cookie
  log('PHASE 3b: CSRF probe (no cookie)');
  const csrfEndpoints = [
    ['/api/admin/categories', 'POST', { name: 'TestCat-CSRF-' + Date.now() }],
    ['/api/admin/resources', 'POST', { title: 'TestResource-CSRF-' + Date.now(), url: 'https://evil.example.com', category: 'community-events' }],
    ['/api/admin/db/import', 'POST', { evil: true }],
  ];
  for (const ep of csrfEndpoints) {
    const r = await fetch('https://awesome.video' + ep[0], {
      method: ep[1],
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 csrf-probe', 'Origin': 'https://evil.example.com' },
      body: JSON.stringify(ep[2]),
      redirect: 'manual',
    });
    const text = await r.text().catch(() => '');
    findings.directApi.push({ url: ep[0], method: ep[1], csrf: true, status: r.status, body: text.slice(0, 400) });
    log('  csrf', ep[1], ep[0], '->', r.status);
  }

  fs.writeFileSync(RESULT, JSON.stringify(findings, null, 2));
  log('=== DONE ===');
  log(`tabs clicked: ${findings.tabs.length}, console errs: ${findings.consoleErrs.length}, network errs: ${findings.networkErrs.length}, directApi: ${findings.directApi.length}`);
  await b.close();
  process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
