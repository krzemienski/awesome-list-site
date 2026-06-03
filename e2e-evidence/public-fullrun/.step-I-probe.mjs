export default async function (page, _ctx, h) {
  await h.goto('/advanced');
  const info = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')].map(t => ({ txt: t.textContent.trim().slice(0, 30), state: t.getAttribute('data-state'), testid: t.getAttribute('data-testid') }));
    // stats numbers visible
    const stats = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /^\d[\d,]*$/.test(e.textContent.trim())).map(e => e.textContent.trim()).slice(0, 20);
    const bodyHead = document.body.innerText.slice(0, 400).replace(/\s+/g, ' ');
    return { tabs, stats, bodyHead };
  });
  h.log('ADVANCED:', JSON.stringify(info, null, 1));
  await h.shot('.probe-I-advanced.png');
}
