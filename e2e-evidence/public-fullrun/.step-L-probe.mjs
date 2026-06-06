import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const R = {};
  // logged-out
  await logout(page, h);
  await h.goto('/submit');
  R.loggedOut = await page.evaluate(() => ({
    path: location.pathname,
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200),
    hasForm: !!document.querySelector('form,input[name="title"],[data-testid*="title"]'),
    loginCta: /login|sign in/i.test(document.body.innerText),
  }));
  await h.shot('L-01-loggedout.png');

  // logged-in
  await login(page, h);
  await h.goto('/submit');
  await page.waitForTimeout(1500);
  R.loggedIn = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input,textarea')].map(i => ({ name: i.name, ph: i.placeholder, testid: i.getAttribute('data-testid'), type: i.tagName }));
    const selects = [...document.querySelectorAll('button[role="combobox"],select')].map(s => ({ txt: s.textContent.trim().slice(0, 30), testid: s.getAttribute('data-testid') }));
    const submitBtn = [...document.querySelectorAll('button')].filter(b => /submit|create|add resource/i.test(b.textContent)).map(b => ({ txt: b.textContent.trim().slice(0, 25), testid: b.getAttribute('data-testid') }));
    return { inputs, selects, submitBtn, path: location.pathname };
  });
  await h.shot('L-02-form.png');
  await logout(page, h);
  h.log('RESULTS:', JSON.stringify(R, null, 1));
}
