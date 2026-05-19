import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
const msgs = [];
p.on('console', m => msgs.push(`[${m.type()}] ${m.text().slice(0,200)}`));
p.on('pageerror', e => msgs.push(`[pageerror] ${e.message.slice(0,200)}`));
p.on('requestfailed', r => msgs.push(`[reqfail] ${r.url().slice(0,120)} ${r.failure()?.errorText}`));
try {
  await p.goto('http://localhost:5000/', { waitUntil: 'load', timeout: 30000 });
  await p.waitForTimeout(4000);
  const out = await p.evaluate(() => ({
    appliedKeys: (document.documentElement).__appliedKeys || null,
    hasApplyFn: typeof window.applyDesignSystem,
    styleTagCount: document.querySelectorAll('style').length,
    rootChildren: document.getElementById('root')?.children.length || 0,
  }));
  console.log(JSON.stringify({ out, msgs: msgs.slice(-40) }, null, 2));
} catch (e) { console.error('FAIL:', e.message); console.error(JSON.stringify(msgs.slice(-20), null, 2)); }
await b.close();
