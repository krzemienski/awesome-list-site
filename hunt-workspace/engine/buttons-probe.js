// Quick: identify all clickable elements on /settings/theme and click each in turn
const { chromium } = require('playwright');
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();

  await p.goto('https://awesome.video/settings/theme', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `${OUT}/theme_full_page.png`, fullPage: true });

  const elems = await p.evaluate(() => {
    const out = [];
    for (const sel of ['button', '[role="button"]', '[role="radio"]', '[role="tab"]', '[role="switch"]']) {
      const items = [...document.querySelectorAll(sel)];
      for (const el of items) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        out.push({ sel, tag: el.tagName, text: (el.textContent||'').trim().slice(0, 40), role: el.getAttribute('role'), aria: el.getAttribute('aria-label'), cls: el.className.slice(0, 60) });
      }
    }
    return out;
  });
  console.log('CLICKABLE-ELMS:', elems.length);
  console.log(JSON.stringify(elems, null, 0).slice(0, 6000));

  // Click first 8 "theme swatch"-looking items (anything with role=button or swatch-shaped)
  const swatches = elems.filter(e => /swatch|theme|preset|accent|font/i.test(JSON.stringify(e)));
  console.log('--- SWATCHES:', swatches.length);

  // Click Toggle Sidebar (the only real button) to see what happens
  await p.click('button:has-text("Toggle Sidebar")');
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/theme_after_sidebar_toggle.png`, fullPage: false });

  // Try clicking on the FIRST font-name item (e.g. "Editorial")
  const fontClick = await p.evaluateHandle(() => {
    const t = [...document.querySelectorAll('div,button,span,li,a')].find(el => (el.textContent||'').trim().slice(0, 10) === 'Editorial');
    return t;
  });
  const editorialExists = await fontClick.evaluate(el => !!el);
  if (editorialExists) {
    const initialAccent = await p.evaluate(() => document.documentElement.getAttribute('data-accent'));
    await (await fontClick.asElement()).click();
    await p.waitForTimeout(800);
    const newAccent = await p.evaluate(() => document.documentElement.getAttribute('data-accent'));
    const newSys = await p.evaluate(() => document.documentElement.getAttribute('data-system'));
    console.log('Editorial click — data-system before:', initialAccent, 'after:', newSys, 'data-accent after:', newAccent);
  }

  // Click all theme swatch cards (assume they're divs with role/swatch class)
  const swatchDivs = await p.$$('[class*="theme-card"], [class*="swatch"], [class*="theme-preset"]');
  console.log('--- swatchDivs:', swatchDivs.length);

  await b.close();
})();
