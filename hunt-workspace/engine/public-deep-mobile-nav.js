// Verify: no hamburger/menu button visible on mobile (375)
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'https://awesome.video';
const SCREEN_DIR = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';

(async () => {
  const b = await chromium.launch({ headless: true });

  // Mobile
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);

  // Check whether sidebar is visible and how to open it
  const sidebarInfo = await p.evaluate(() => {
    // Look for sidebar
    const sidebars = [...document.querySelectorAll('aside, [class*="sidebar"], nav, [data-state]')];
    const visible = sidebars.filter(s => {
      const cs = getComputedStyle(s);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0;
    }).map(s => ({
      tag: s.tagName,
      cls: (s.className || '').toString().slice(0, 80),
      text: (s.textContent || '').trim().slice(0, 100),
      rect: { w: s.getBoundingClientRect().width, h: s.getBoundingClientRect().height, x: s.getBoundingClientRect().x },
    }));

    // Look for any element with "menu", "toggle", "hamburger", or aria-label containing them
    const toggles = [...document.querySelectorAll('button, [role="button"], [aria-label]')].filter(el => {
      const label = (el.getAttribute('aria-label') || '').toLowerCase();
      const text = (el.textContent || '').toLowerCase();
      const cls = (el.className || '').toString().toLowerCase();
      return /menu|hamburger|sidebar|nav|drawer|burger/.test(label + ' ' + text + ' ' + cls);
    }).map(el => ({
      tag: el.tagName,
      cls: (el.className || '').toString().slice(0, 100),
      aria: el.getAttribute('aria-label'),
      text: (el.textContent || '').trim().slice(0, 60),
      visible: el.getBoundingClientRect().width > 0,
      rect: { w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height, x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y },
    }));

    return { sidebars: visible, toggles };
  });

  console.log('SIDEBARS:', JSON.stringify(sidebarInfo.sidebars, null, 2));
  console.log('TOGGLES:', JSON.stringify(sidebarInfo.toggles, null, 2));

  await p.screenshot({ path: `${SCREEN_DIR}/public2_mobile_375_full.png`, fullPage: false });
  await p.close();

  // Also check at 768
  const ctx2 = await b.newContext({ viewport: { width: 768, height: 1024 }, isMobile: false, hasTouch: true });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(2500);
  const sidebarInfo768 = await p2.evaluate(() => {
    const sidebars = [...document.querySelectorAll('aside, [class*="sidebar"], nav')];
    const visible = sidebars.filter(s => {
      const cs = getComputedStyle(s);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0 && s.getBoundingClientRect().width > 0;
    }).map(s => ({
      tag: s.tagName,
      cls: (s.className || '').toString().slice(0, 80),
      rect: { w: s.getBoundingClientRect().width, x: s.getBoundingClientRect().x },
    }));
    return visible;
  });
  console.log('SIDEBARS @768:', JSON.stringify(sidebarInfo768, null, 2));

  await b.close();
})();