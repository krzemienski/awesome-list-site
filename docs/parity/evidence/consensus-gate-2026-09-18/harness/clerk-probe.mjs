import { chromium } from '@playwright/test';
import * as F from '/home/runner/workspace/scripts/validation/ds-button-filter.mjs';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(process.env.BASE + '/sign-in', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForFunction(() => typeof window.applyDesignSystem === 'function' && document.querySelector('.cl-rootBox button'), null, { timeout: 60000 }).catch(() => {});
for (const id of ['editorial', 'terminal']) {
  await p.evaluate((id) => window.applyDesignSystem(id, window.SYSTEM_DEFAULT_ACCENT[id]), id); await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const face = v => String(v||'').split(',')[0].replace(/["']/g,'').trim();
    const els = [...document.querySelectorAll('.cl-rootBox button, .cl-rootBox input')];
    return { n: els.length, faces: [...new Set(els.map(e => face(getComputedStyle(e).fontFamily)))], body: face(getComputedStyle(document.documentElement).getPropertyValue('--font-body')), primaryBg: getComputedStyle(document.querySelector('.cl-formButtonPrimary')||document.body).backgroundColor };
  });
  const strays = await p.evaluate(`(${F.collectStrayButtons.toString()})()`);
  const inputs = await p.evaluate(`(${F.collectStrayInputs.toString()})()`);
  console.log(id, JSON.stringify(r), 'strayBtns', strays.strays.length, 'strayInputs', inputs.strays.length);
  // negative control: force vendor font on one Clerk button → must become a stray
  await p.evaluate(() => { const x = document.querySelector('.cl-rootBox button'); x.style.fontFamily = 'Comic Sans MS'; });
  const s2 = await p.evaluate(`(${F.collectStrayButtons.toString()})()`);
  console.log(id, 'after vendor-font mutation strayBtns', s2.strays.length);
  await p.evaluate(() => { document.querySelector('.cl-rootBox button').style.fontFamily = ''; });
}
await b.close();
