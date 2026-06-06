import { logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  await logout(page, h);
  await h.goto('/login');
  // fill valid-format email + wrong password (so K2 inline validation passes, only auth fails)
  await page.fill('[data-testid="input-email"]', 'admin@example.com');
  await page.fill('[data-testid="input-password"]', 'definitelywrong123');
  // capture network response of the login POST
  let loginResp = null;
  page.on('requestfinished', async (req) => {
    if (/\/api\/auth\/local\/login/.test(req.url())) {
      const r = await req.response();
      loginResp = { status: r?.status(), body: (await r?.text())?.slice(0, 100) };
    }
  });
  await page.locator('[data-testid="button-login"]').click();
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => {
    // sonner toasts mount in a portal; search broadly
    const toastEls = [...document.querySelectorAll('[data-sonner-toast],[data-sonner-toaster] *,li[role="status"],[role="alert"]')].map(t => t.textContent.trim()).filter(t => t.length > 3);
    return {
      path: location.pathname,
      toasts: [...new Set(toastEls)].slice(0, 6),
      anyErrorText: (document.body.innerText.match(/invalid (email|credential|password)|incorrect|login failed|authentication failed|wrong/i) || [null])[0],
    };
  });
  h.log('LOGIN RESP:', JSON.stringify(loginResp));
  h.log('AFTER WRONG:', JSON.stringify(after, null, 1));
  await h.shot('K-03-wrong-creds.png');
}
