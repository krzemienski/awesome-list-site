// PA-N Theme Settings N1-N8.
export default async function (page, _ctx, h) {
  const R = {};
  await h.goto('/settings/theme');
  await page.waitForTimeout(1200);

  // N1: page renders with theme controls
  R.N1 = await page.evaluate(() => ({
    path: location.pathname,
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200),
    controls: [...document.querySelectorAll('button,[role="radio"],[role="tab"]')].map(b => b.textContent.trim().slice(0, 18)).filter(t => /light|dark|system|color|font|accent|crimson|blue|theme/i.test(t)).slice(0, 20),
  }));
  await h.shot('N-01-theme-page.png');

  // capture current root theme attrs
  const rootAttrs = () => page.evaluate(() => {
    const html = document.documentElement;
    return { class: html.className, accent: html.getAttribute('data-accent'), system: html.getAttribute('data-system'), bg: getComputedStyle(document.body).backgroundColor };
  });
  R.N_initialRoot = await rootAttrs();

  // N2: pick Light mode
  const lightBtn = page.locator('button,[role="radio"]', { hasText: /^Light$/i }).first();
  R.N2_lightBtnFound = await lightBtn.count();
  if (await lightBtn.count()) {
    await lightBtn.click();
    await page.waitForTimeout(1000);
    R.N2_afterLight = await rootAttrs();
  }
  await h.shot('N-08-light-mode.png');

  // N2b: pick Dark mode
  const darkBtn = page.locator('button,[role="radio"]', { hasText: /^Dark$/i }).first();
  if (await darkBtn.count()) {
    await darkBtn.click();
    await page.waitForTimeout(1000);
    R.N2_afterDark = await rootAttrs();
  }
  await h.shot('N-07-dark-mode.png');

  // N3: accent color — find accent swatches
  R.N3_accentControls = await page.evaluate(() => {
    const swatches = [...document.querySelectorAll('[data-accent],button[aria-label*="accent" i],button[title*="accent" i],[class*="accent-swatch"]')].length;
    const namedColors = [...document.querySelectorAll('button')].map(b => b.getAttribute('aria-label') || b.textContent.trim()).filter(t => /crimson|blue|emerald|violet|amber|rose|teal|indigo|green|purple|orange/i.test(t)).slice(0, 10);
    return { swatches, namedColors };
  });
  // try clicking a different accent
  const accentBtn = page.locator('button', { hasText: /blue|emerald|violet|teal|indigo/i }).first();
  if (await accentBtn.count()) {
    const before = (await rootAttrs()).accent;
    await accentBtn.click();
    await page.waitForTimeout(900);
    R.N3_accentChanged = { before, after: (await rootAttrs()).accent };
  }

  // N4: font picker
  R.N4_fontControls = await page.evaluate(() => [...document.querySelectorAll('button,[role="radio"]')].map(b => b.textContent.trim()).filter(t => /font|sans|serif|mono|inter|system font|editorial/i.test(t)).slice(0, 10));

  // N5: preview buttons variants
  R.N5_previewVariants = await page.evaluate(() => {
    const text = document.body.innerText;
    return ['default', 'secondary', 'outline', 'ghost', 'destructive'].filter(v => new RegExp(v, 'i').test(text));
  });

  // N6: persist — reload, check theme attrs survive
  const beforeReload = await rootAttrs();
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  R.N6_beforeReload = beforeReload;
  R.N6_afterReload = await rootAttrs();
  R.N6_persisted = beforeReload.accent === (await rootAttrs()).accent && beforeReload.class === (await rootAttrs()).class;

  // restore to dark + crimson baseline (ds defaults)
  const dk = page.locator('button,[role="radio"]', { hasText: /^Dark$/i }).first();
  if (await dk.count()) { await dk.click(); await page.waitForTimeout(600); }
  await page.evaluate(() => { try { localStorage.setItem('ds-accent', 'crimson'); localStorage.setItem('ds-system', 'editorial'); } catch {} });

  h.log('RESULTS:', JSON.stringify(R, null, 1));
}
