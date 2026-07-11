// Phase 3d — Theme settings page interaction (this has actual theme buttons)
const { chromium } = require('playwright');
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();

  await p.goto('https://awesome.video/settings/theme', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  const initialState = await p.evaluate(() => ({
    htmlClass: document.documentElement.className,
    htmlAttr: [...document.documentElement.attributes].map(a => `${a.name}="${a.value.slice(0,40)}"`).join(' '),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyColor: getComputedStyle(document.body).color
  }));
  await p.screenshot({ path: `${OUT}/theme_settings_initial.png`, fullPage: true });

  // Try every button on the page that contains "theme"/"dark"/"light"
  const buttons = await p.$$('button');
  const labels = [];
  for (let i = 0; i < buttons.length; i++) {
    const t = (await buttons[i].evaluate(el => (el.textContent||'').trim().slice(0, 30)));
    const cls = await buttons[i].evaluate(el => el.className.slice(0, 50));
    const pressed = await buttons[i].evaluate(el => el.getAttribute('aria-pressed'));
    labels.push({ i, text: t, cls, pressed });
  }
  console.log('BUTTONS-FULL:');
  console.log(JSON.stringify(labels.filter(b => /dark|light|toggle|preset/i.test(b.text)), null, 2));

  // Try clicking Light vs Dark buttons
  for (const target of ['Light', 'Dark']) {
    const btn = await p.evaluateHandle(t => {
      return [...document.querySelectorAll('button')].find(b => (b.textContent||'').trim().slice(0, t.length + 5).toLowerCase() === t.toLowerCase() || (b.textContent||'').trim().startsWith(t));
    }, target);
    const exists = await btn.evaluate(el => !!el);
    if (exists) {
      const elt = await btn.asElement();
      await elt.click();
      await p.waitForTimeout(800);
      const after = await p.evaluate(() => ({
        htmlClass: document.documentElement.className,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        bodyColor: getComputedStyle(document.body).color
      }));
      await p.screenshot({ path: `${OUT}/theme_settings_after_${target}.png`, fullPage: false });
      console.log(`${target} after click — htmlClass: ${after.htmlClass}, bodyBg: ${after.bodyBg}, bodyColor: ${after.bodyColor}`);
    } else {
      console.log(`${target} button not found`);
    }
  }
  console.log('INITIAL', JSON.stringify(initialState));

  // Final — try navigating back to home and see if the theme persisted
  await p.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2000);
  const homeCheck = await p.evaluate(() => ({
    htmlClass: document.documentElement.className,
    bodyBg: getComputedStyle(document.body).backgroundColor,
  }));
  await p.screenshot({ path: `${OUT}/theme_persistence_check.png`, fullPage: false });
  console.log('AFTER-NAV-BACK:', JSON.stringify(homeCheck));

  await b.close();
})();
