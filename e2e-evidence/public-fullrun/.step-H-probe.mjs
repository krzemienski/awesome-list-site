export default async function (page, _ctx, h) {
  await h.goto('/resource/186677');
  const info = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].map(b => ({
      txt: b.textContent.trim().slice(0, 22),
      aria: b.getAttribute('aria-label'),
      testid: b.getAttribute('data-testid'),
    })).filter(b => b.txt || b.aria || b.testid);
    const links = [...document.querySelectorAll('a[href]')].map(a => ({ href: a.getAttribute('href'), txt: a.textContent.trim().slice(0, 20), target: a.target })).filter(a => /resource|http|visit/i.test(a.href + a.txt)).slice(0, 12);
    const related = document.body.innerText.includes('Related') ;
    const h1 = document.querySelector('h1')?.textContent.trim();
    return { h1, btns, links, related };
  });
  h.log('DETAIL:', JSON.stringify(info, null, 1));

  // H10 invalid id
  await h.goto('/resource/999999');
  const invalid = await page.evaluate(() => ({
    text: document.body.innerText.slice(0, 200).replace(/\s+/g, ' '),
    h1: document.querySelector('h1')?.textContent.trim(),
  }));
  h.log('INVALID-ID:', JSON.stringify(invalid));
}
