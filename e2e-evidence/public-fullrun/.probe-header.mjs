// Probe header + search-dialog testids and structure.
export default async function (page, _ctx, h) {
  await h.goto('/category/encoding-codecs');
  const head = await page.evaluate(() => {
    const header = document.querySelector('header') || document.body;
    const testids = [...header.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid')).slice(0, 40);
    const breadcrumb = [...document.querySelectorAll('[data-testid*="breadcrumb" i],nav[aria-label*="readcrumb" i] a, nav[aria-label*="readcrumb" i] li')].map(e => e.textContent.replace(/\s+/g,' ').trim()).slice(0, 10);
    const buttons = [...header.querySelectorAll('button')].map(b => ({ testid: b.getAttribute('data-testid'), label: (b.getAttribute('aria-label')||b.textContent).replace(/\s+/g,' ').trim().slice(0,24) })).slice(0, 20);
    return { headerTestids: testids, breadcrumb, buttons };
  });
  h.log('HEADER:', JSON.stringify(head, null, 1));
}
