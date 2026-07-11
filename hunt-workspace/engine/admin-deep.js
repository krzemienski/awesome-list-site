// Deep admin audit — drive every tab on /admin, every action, every form
// Captures screenshots to admin2_*.png, records bugs as it goes.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';
const BUGS = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/bugs';
const AUTH = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/hunt-auth.json';

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(BUGS, { recursive: true });

const findings = [];
const consoleErrs = [];
const reqLog = [];

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: AUTH,
  });

  let bugIdx = 100;
  const log = (...a) => console.log('[audit]', ...a);
  const snap = async (page, name) => {
    const p = `${OUT}/admin2_${name}.png`;
    await page.screenshot({ path: p, fullPage: true });
    return p;
  };

  const errsOnPage = (p, bag) => {
    p.on('console', m => {
      if (m.type() === 'error' || m.type() === 'warning') {
        bag.push({ type: m.type(), text: m.text().slice(0, 350) });
      }
    });
    p.on('pageerror', pe => {
      bag.push({ type: 'PAGEERROR', text: pe.message.slice(0, 350) });
    });
    p.on('response', resp => {
      const s = resp.status();
      if (s >= 400) {
        reqLog.push({ url: resp.url(), status: s, method: resp.request().method() });
      }
    });
  };

  const writeBug = async ({ title, severity, url, repro, expected, actual, screenshot, fixPrompt, observe }) => {
    bugIdx += 1;
    const id = `BUG-${String(bugIdx).padStart(3, '0')}`;
    const dir = path.join(BUGS, id);
    fs.mkdirSync(dir, { recursive: true });
    const md =
`# ${id} — ${title}

**Severity:** ${severity}
**URL:** ${url}
**Viewport:** 1440×900 desktop
**Observed:** ${observe}

## Reproduction
${repro}

## Expected
${expected}

## Actual
${actual}

## Evidence
- Screenshot: ${screenshot}
- Console errors / network failures captured into admin-deep-findings.json (${id} key)

## Fix prompt (self-contained for a coding agent)
${fixPrompt}
`;
    fs.writeFileSync(path.join(dir, 'evidence.md'), md);
    findings.push({ id, title, severity, screenshot });
    return id;
  };

  // 1) LAND ON /admin, capture tabs
  log('STEP 1: Load /admin and capture tabs');
  const p = await ctx.newPage();
  errsOnPage(p, consoleErrs);
  await p.goto('https://awesome.video/admin', { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(3000);

  const tabs = await p.evaluate(() => {
    return [...document.querySelectorAll('[role="tab"], button')]
      .map(b => (b.textContent || '').trim())
      .filter((t, i, a) => t && t.length < 50 && a.indexOf(t) === i)
      .slice(0, 60);
  });
  log('TABS / Buttons seen:', tabs);

  const adminShot = await snap(p, '00_admin_initial');

  // 2) CLICK EVERY TAB (matching text from screenshot)
  const tabCandidates = ['Approvals', 'Edits', 'Enrichment', 'Researcher', 'Export', 'Database', 'Resources', 'Categories', 'Subcategories', 'Sub-Subcats', 'Jobs'];
  const tabScreenshots = {};
  for (const tname of tabCandidates) {
    log(`STEP tab: ${tname}`);
    const before = p.url();
    try {
      // Try multiple selectors
      const tabBtn = await p.evaluateHandle((name) => {
        const all = [...document.querySelectorAll('button, [role="tab"], a, [data-tab-value]')];
        return all.find(el => (el.textContent || '').trim() === name || (el.textContent || '').trim().startsWith(name));
      }, tname);
      if (tabBtn) {
        try {
          await tabBtn.evaluate(el => el && el.click && el.click());
        } catch (e) { /* ignore */ }
      }
    } catch {}
    await p.waitForTimeout(2500);
    const shotPath = await snap(p, `tab_${tname.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`);
    tabScreenshots[tname] = { before, after: p.url(), shotPath };
  }

  // 3) Try direct sub-URL fetch — record each 404 vs any redirect
  log('STEP: probe direct admin endpoints');
  const probeEndpoints = [
    '/admin', '/admin/users', '/admin/users/new', '/admin/settings', '/admin/profile',
    '/admin/audit', '/admin/logs', '/admin/flags', '/admin/api/users',
    '/admin/api/resources', '/admin/api/config', '/admin/journeys', '/admin/submissions',
    '/admin/login', '/admin/categories', '/admin/categories/new',
    '/admin/resources', '/admin/resources/new', '/admin/jobs', '/admin/analytics',
  ];
  const probeResults = [];
  for (const r of probeEndpoints) {
    const pp = await ctx.newPage();
    errsOnPage(pp, []);
    try {
      const resp = await pp.goto('https://awesome.video' + r, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await pp.waitForTimeout(1500);
      const u = pp.url();
      const txt = (await pp.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(0, 250);
      const sname = r.replace(/\//g, '_').replace(/^_/, '');
      await pp.screenshot({ path: `${OUT}/admin2_probe${sname}.png` });
      probeResults.push({ route: r, status: resp ? resp.status() : 0, finalUrl: u, snippet: txt });
      log(`  probe ${r} -> ${resp ? resp.status() : 0} final=${u}`);
    } catch (e) {
      probeResults.push({ route: r, error: e.message });
    }
    await pp.close();
  }

  // 4) On each captured tab, locate actions and inputs, attempt XSS/SQL/empty/maxlen
  log('STEP: enumerate interactions per tab + XSS/SQL probes');

  // Re-navigate to /admin for re-clicks
  const tabPayloads = [
    { name: 'Approvals', tab: 'Approvals', xss: '<script>alert(\'audit-xss\');</script>', sqli: '\' OR 1=1--' },
    { name: 'Edits', tab: 'Edits', xss: '<img src=x onerror=alert(1)>', sqli: '\' OR \'1\'=\'1' },
    { name: 'Enrichment', tab: 'Enrichment', xss: '"><svg onload=alert(1)>', sqli: '1 OR 1=1' },
    { name: 'Researcher', tab: 'Researcher', xss: '<script>alert(2)</script>', sqli: '\'; DROP TABLE x;' },
    { name: 'Export', tab: 'Export', xss: 'test\"; alert(3); //', sqli: '1; SELECT 1' },
    { name: 'Database', tab: 'Database', xss: '<script>alert(4)</script>', sqli: '\' UNION SELECT 1--' },
    { name: 'Resources', tab: 'Resources', xss: '<script>alert(5)</script>', sqli: '\' OR 1=1--' },
    { name: 'Categories', tab: 'Categories', xss: '<h1>injection</h1>', sqli: '\' OR 1=1--' },
    { name: 'Subcategories', tab: 'Subcategories', xss: '<script>alert(6)</script>', sqli: '1\' OR \'1\'=\'1' },
    { name: 'Sub-Subcats', tab: 'Sub-Subcats', xss: '<script>alert(7)</script>', sqli: "evil'); DROP TABLE x;--" },
    { name: 'Jobs', tab: 'Jobs', xss: '<script>alert(8)</script>', sqli: '\' OR 1=1--' },
  ];

  // Now actually click each tab again and probe inputs
  for (const t of tabPayloads) {
    log(`STEP probing tab: ${t.tab}`);
    // Click tab
    await p.goto('https://awesome.video/admin', { waitUntil: 'networkidle', timeout: 30000 });
    await p.waitForTimeout(2000);
    try {
      const tabHandle = await p.evaluateHandle((name) => {
        const all = [...document.querySelectorAll('button, [role="tab"], a, [data-tab-value]')];
        return all.find(el => (el.textContent || '').trim() === name || (el.textContent || '').trim().startsWith(name));
      }, t.tab);
      if (tabHandle) {
        try { await tabHandle.evaluate(el => el && el.click && el.click()); } catch {}
      }
    } catch {}
    await p.waitForTimeout(2000);

    // Snapshot
    await snap(p, `interact_${t.tab.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_${Date.now()}`);

    // Enumerate inputs/textareas
    const inputs = await p.evaluate(() => {
      const list = [];
      document.querySelectorAll('input, textarea, select').forEach((el, i) => {
        list.push({
          i, tag: el.tagName, type: el.type || '',
          name: el.name || '', id: el.id || '',
          placeholder: el.placeholder || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          required: el.required || false,
          maxLength: el.maxLength || -1,
          visible: !!(el.offsetWidth || el.offsetHeight),
        });
      });
      return list;
    });
    log(`  inputs on ${t.tab}: ${inputs.length}`);

    // Try XSS in first text/search input
    for (const f of inputs.slice(0, 4)) {
      if (f.type === 'hidden' || f.type === 'submit') continue;
      if (!f.visible) continue;
      try {
        const sel = (f.id && `#${f.id}`) || (f.name && `[name="${f.name}"]`) || `textarea:nth-of-type(${f.i+1})`;
        const handle = await p.$(sel);
        if (!handle) continue;
        await handle.click({ timeout: 1500 }).catch(() => {});
        // Triple-click select, type
        await handle.fill(t.xss).catch(async () => await handle.type(t.xss).catch(() => {}));
        await p.waitForTimeout(500);
        // Submit if there's a form nearby
        const sub = await p.$(`${sel}`).then(h => {
          return h ? h.evaluate(el => {
            let p = el.closest('form');
            return p ? p.querySelector('button[type="submit"], button:not([type])') : null;
          }) : null;
        });
        if (sub) await sub.click().catch(() => {});
        await p.waitForTimeout(800);
      } catch {}
    }
    await snap(p, `interact_${t.tab.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_xss_${Date.now()}`);

    // Try SQL in inputs
    for (const f of inputs.slice(0, 2)) {
      if (f.type === 'hidden' || f.type === 'submit') continue;
      if (!f.visible) continue;
      try {
        const sel = (f.id && `#${f.id}`) || (f.name && `[name="${f.name}"]`) || `textarea:nth-of-type(${f.i+1})`;
        const handle = await p.$(sel);
        if (!handle) continue;
        await handle.click({ timeout: 1500 }).catch(() => {});
        await handle.fill(t.sqli).catch(async () => await handle.type(t.sqli).catch(() => {}));
        await p.waitForTimeout(500);
      } catch {}
    }
    await snap(p, `interact_${t.tab.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_sqli_${Date.now()}`);

    // Try empty submit
    try {
      const sub = await p.$('form button[type="submit"], form button:not([type])');
      if (sub) {
        await sub.click().catch(() => {});
        await p.waitForTimeout(1200);
      }
    } catch {}
    await snap(p, `interact_${t.tab.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_empty_${Date.now()}`);

    // Try max-length overflow on first text input
    if (inputs.length > 0) {
      try {
        const f0 = inputs.find(x => x.visible && x.type !== 'hidden' && x.type !== 'submit');
        if (f0) {
          const sel = (f0.id && `#${f0.id}`) || (f0.name && `[name="${f0.name}"]`) || `textarea:nth-of-type(${f0.i+1})`;
          const handle = await p.$(sel);
          if (handle) {
            const big = 'A'.repeat(5000);
            await handle.click({ timeout: 1500 }).catch(() => {});
            await handle.fill(big).catch(() => {});
            await p.waitForTimeout(700);
            await snap(p, `interact_${t.tab.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_overflow_${Date.now()}`);
          }
        }
      } catch {}
    }
  }

  await p.close();

  // 5) Final dump
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/admin-deep-findings.json', JSON.stringify({ findings, consoleErrs, reqLog, probeResults, tabScreenshots }, null, 2));
  log('=== DONE ===');
  log(`console errors: ${consoleErrs.length}, request errors: ${reqLog.length}, probe results: ${probeResults.length}`);

  await b.close();
  process.exit(0);
})().catch(e => {
  console.error('FATAL', e);
  process.exit(1);
});
