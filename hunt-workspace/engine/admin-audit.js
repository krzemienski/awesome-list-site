// Comprehensive admin page audit — drive ALL /admin/* pages, every button, every form.
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';
const BUGS = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/bugs';
const AUTH = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/hunt-auth.json';

const ROUTES = [
  '/admin',
  '/admin/categories',
  '/admin/resources',
  '/admin/users',
  '/admin/settings',
  '/admin/users/new',
  '/admin/resources/new',
  '/admin/categories/new',
  '/admin/login',
  '/admin/profile',
  '/admin/logout',
  '/admin/audit',
  '/admin/logs',
  '/admin/flags'
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(BUGS, { recursive: true });
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: AUTH
  });
  const findings = [];

  for (const r of ROUTES) {
    const p = await ctx.newPage();
    const errs = [];
    const responses404 = [];
    const responses500 = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
    p.on('response', resp => {
      const url = resp.url();
      const s = resp.status();
      if (s === 404) responses404.push(url);
      else if (s >= 500) responses500.push(url);
    });
    p.on('pageerror', pe => errs.push('PAGEERROR: ' + pe.message.slice(0, 300)));
    let finalUrl = '';
    try {
      const resp = await p.goto('https://awesome.video' + r, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await p.waitForTimeout(2500);
      finalUrl = p.url();
      const status = resp ? resp.status() : 0;
      const safeName = r.replace(/\//g, '_').replace(/^_/, '');
      const shotPath = `${OUT}/audit_admin_${safeName}.png`;
      await p.screenshot({ path: shotPath, fullPage: true });

      const txt = await p.evaluate(() => document.body.innerText);
      const interactives = await p.evaluate(() => {
        const buttons = [...document.querySelectorAll('button, [role="button"], a[href], input, select, textarea')];
        return buttons.slice(0, 80).map(el => ({
          tag: el.tagName,
          type: el.type || '',
          text: (el.textContent || el.placeholder || el.getAttribute('aria-label') || '').trim().slice(0, 60),
          name: el.name || el.id || '',
          href: el.getAttribute('href') || '',
          role: el.getAttribute('role') || ''
        }));
      });

      console.log('\n========================');
      console.log('ROUTE:', r, '->', finalUrl, 'status', status);
      console.log('TEXT LEN:', txt.length, ' INTERACTIVES:', interactives.length);
      console.log('TEXT-300:', txt.replace(/\n+/g, ' | ').slice(0, 300));
      console.log('CONSOLE-ERRS:', errs.length);
      const ue = [...new Set(errs)];
      for (const e of ue.slice(0, 6)) console.log('  >', e.slice(0, 240));
      console.log('404s:', responses404.length);
      for (const e of responses404.slice(0, 6)) console.log('  404', e);
      console.log('INTERACTIVES:');
      for (const x of interactives.slice(0, 40)) console.log('  ', x.tag, '|', x.type || x.role, '|', JSON.stringify(x.text), 'href=', x.href);

      findings.push({
        route: r, finalUrl, status, shot: shotPath,
        textSnippet: txt.replace(/\n+/g, ' | ').slice(0, 400),
        consoleErrors: ue,
        responses404,
        interactives
      });
    } catch (err) {
      console.log('ERROR on', r, err.message);
      findings.push({ route: r, error: err.message });
    }
    await p.close();
  }

  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/admin-audit-1.json', JSON.stringify(findings, null, 2));
  console.log('\n\n=== SUMMARY ===');
  for (const f of findings) {
    console.log(`${f.route}  errs=${f.consoleErrors?.length||0}  404s=${f.responses404?.length||0}  text-50=${(f.textSnippet||'').slice(0,50)}`);
  }
  await b.close();
})();
