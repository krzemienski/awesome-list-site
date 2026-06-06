export default async function (page, ctx, h) {
  await h.goto('/category/encoding-codecs');
  // server count for this category
  const api = await h.api('/api/resources?category=Encoding%20%26%20Codecs&limit=1');
  h.log('API total (display-name param):', api.json?.total ?? api.text);
  const apiSlug = await h.api('/api/resources?category=encoding-codecs&limit=1');
  h.log('API total (slug param):', apiSlug.json?.total ?? apiSlug.text);
  // count rendered resource cards + visible "showing N of M" text
  const counts = await page.evaluate(() => {
    const txt = document.body.innerText;
    const showMatch = txt.match(/Showing\s+([\d,]+)\s+of\s+([\d,]+)/i);
    // find candidate card containers
    const guesses = {};
    for (const sel of ['[data-testid*="resource"]','article','[class*="resource-card"]','[class*="ResourceCard"]','a[href^="/resource/"]']) {
      guesses[sel] = document.querySelectorAll(sel).length;
    }
    // selects / dropdowns
    const selects = [...document.querySelectorAll('button[role="combobox"],select,[data-testid*="select"]')].map(e=>e.textContent.trim().slice(0,40));
    // view-mode toggles
    const viewBtns = [...document.querySelectorAll('button[aria-label],button[title]')].map(b=>b.getAttribute('aria-label')||b.getAttribute('title')).filter(Boolean).filter(t=>/grid|list|compact|view/i.test(t));
    return { showMatch: showMatch?showMatch[0]:null, guesses, selects, viewBtns, url: location.href };
  });
  h.log('RENDER:', JSON.stringify(counts, null, 1));
  await h.shot('.probe-E-category.png');
}
