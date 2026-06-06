// Shared login helper. Drives the real /login UI so the session cookie lands
// in the CDP Chrome profile (persists across driver invocations until logout).
export async function login(page, h, { email = 'admin@example.com', password = 'admin123' } = {}) {
  await h.goto('/login');
  // already logged in? (login page redirects or shows avatar)
  const already = await page.evaluate(() => !!document.querySelector('[data-testid="button-user-menu"],[data-testid*="avatar"]'));
  if (already) return 'already';
  await page.fill('[data-testid="input-email"]', email);
  await page.fill('[data-testid="input-password"]', password);
  await page.click('[data-testid="button-login"]');
  await page.waitForTimeout(2500);
  // verify via API
  const me = await h.api('/api/auth/user');
  return me.json?.email || me.json?.user?.email || JSON.stringify(me).slice(0, 80);
}

export async function logout(page, h) {
  const r = await page.evaluate(async () => {
    const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    return res.status;
  });
  await page.waitForTimeout(800);
  return r;
}
