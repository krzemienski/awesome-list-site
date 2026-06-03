import { login } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  await login(page, h);
  await h.goto('/');
  const info = await page.evaluate(() => {
    const hdr = document.querySelector('header') || document.body;
    return {
      headerButtons: [...hdr.querySelectorAll('button')].map(b => ({ testid: b.getAttribute('data-testid'), label: (b.getAttribute('aria-label') || b.textContent).replace(/\s+/g, ' ').trim().slice(0, 24), hasImg: !!b.querySelector('img,svg'), hasAvatar: !!b.querySelector('[class*="avatar" i]') })),
    };
  });
  h.log('AVATAR_BTNS:', JSON.stringify(info, null, 1));
  // try clicking the last header button and dump menu
  const btns = page.locator('header button');
  const n = await btns.count();
  await btns.nth(n - 1).click();
  await page.waitForTimeout(800);
  const menu = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].map(i => ({ txt: i.textContent.replace(/\s+/g,' ').trim(), testid: i.getAttribute('data-testid') })));
  h.log('MENU_AFTER_LAST_BTN:', JSON.stringify(menu, null, 1));
}
