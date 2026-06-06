export default async function (page, _ctx, h) {
  await h.goto('/login');
  const f = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input')].map(i => ({ name: i.name, type: i.type, ph: i.placeholder, testid: i.getAttribute('data-testid'), id: i.id }));
    const btns = [...document.querySelectorAll('button')].map(b => ({ txt: b.textContent.trim().slice(0, 20), type: b.type, testid: b.getAttribute('data-testid') })).filter(b => b.txt);
    const links = [...document.querySelectorAll('a[href]')].map(a => ({ href: a.getAttribute('href'), txt: a.textContent.trim().slice(0, 20) })).filter(a => /register|login|sign/i.test(a.href + a.txt));
    return { inputs, btns, links, url: location.href };
  });
  h.log('LOGIN FORM:', JSON.stringify(f, null, 1));
  await h.shot('.probe-login.png');
}
