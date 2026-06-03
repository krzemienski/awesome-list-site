import { logout } from './.lib-login.mjs';

export default async function (page, _ctx, h) {
  const R = {};
  await logout(page, h);

  // K1: login form renders
  await h.goto('/login');
  R.K1_email = await page.locator('[data-testid="input-email"]').count();
  R.K1_password = await page.locator('[data-testid="input-password"]').count();
  R.K1_submit = await page.locator('[data-testid="button-login"]').count();
  await h.shot('K-01-login-form.png');

  // K2: submit empty -> validation
  await page.locator('[data-testid="button-login"]').click();
  await page.waitForTimeout(1200);
  R.K2_validation = await page.evaluate(() => {
    const errs = [...document.querySelectorAll('[role="alert"],.text-destructive,[class*="error"],[aria-invalid="true"]')].map(e => e.textContent.trim().slice(0, 40)).filter(Boolean);
    const stillOnLogin = location.pathname.includes('login');
    return { errs, stillOnLogin };
  });
  await h.shot('K-02-empty-validation.png');

  // K3: wrong creds -> error toast, no nav
  await page.fill('[data-testid="input-email"]', 'admin@example.com');
  await page.fill('[data-testid="input-password"]', 'wrongpassword123');
  await page.locator('[data-testid="button-login"]').click();
  await page.waitForTimeout(2000);
  R.K3_afterWrong = await page.evaluate(() => ({
    path: location.pathname,
    toast: [...document.querySelectorAll('[data-sonner-toast],[role="status"],.toast,[role="alert"]')].map(t => t.textContent.trim().slice(0, 50)).filter(Boolean),
    bodyHasError: /invalid|incorrect|failed|wrong|credential/i.test(document.body.innerText),
  }));
  await h.shot('K-03-wrong-creds.png');

  // K4: valid login -> redirect
  await page.fill('[data-testid="input-email"]', 'admin@example.com');
  await page.fill('[data-testid="input-password"]', 'admin123');
  await page.locator('[data-testid="button-login"]').click();
  await page.waitForTimeout(2500);
  R.K4_path = page.url();
  const me = await h.api('/api/auth/user');
  R.K4_authed = me.json?.email || me.json?.user?.email || 'not-authed';
  await h.shot('K-04-logged-in.png');
  await logout(page, h);

  // K5: login -> register link
  await h.goto('/login');
  const regLink = page.locator('a[href="/register"],a', { hasText: /register|sign up|create account/i }).first();
  R.K5_regLinkCount = await regLink.count();
  if (await regLink.count()) {
    await regLink.click();
    await page.waitForTimeout(1500);
    R.K5_url = page.url();
  }

  // K6: register form renders
  await h.goto('/register');
  R.K6_fields = await page.evaluate(() => [...document.querySelectorAll('input')].map(i => i.name || i.type || i.getAttribute('data-testid')));
  R.K6_url = page.url();
  await h.shot('K-06-register-form.png');

  // K7: short password validation
  const emailF = page.locator('input[type="email"],[data-testid="input-email"]').first();
  const pwF = page.locator('input[type="password"]').first();
  if (await emailF.count() && await pwF.count()) {
    await emailF.fill('newuser@example.com');
    await pwF.fill('short');
    const submitBtn = page.locator('button[type="submit"],button', { hasText: /register|sign up|create/i }).first();
    await submitBtn.click();
    await page.waitForTimeout(1500);
    R.K7_validation = await page.evaluate(() => {
      const errs = [...document.querySelectorAll('[role="alert"],.text-destructive,[class*="error"]')].map(e => e.textContent.trim().slice(0, 60)).filter(Boolean);
      const pwError = /8|charact|short|least/i.test(document.body.innerText);
      return { errs, pwError, stillOnRegister: location.pathname.includes('register') };
    });
    await h.shot('K-07-short-pw.png');
  }

  // K8: register -> login link
  await h.goto('/register');
  const loginLink = page.locator('a[href="/login"],a', { hasText: /login|sign in|already/i }).first();
  R.K8_loginLinkCount = await loginLink.count();
  if (await loginLink.count()) {
    await loginLink.click();
    await page.waitForTimeout(1500);
    R.K8_url = page.url();
  }

  h.log('RESULTS:', JSON.stringify(R, null, 1));
}
