async () => {
  await new Promise(r => setTimeout(r, 2500));
  const touch = matchMedia('(pointer:coarse)').matches;
  const sel = 'a[href],button,[role=button],[role=tab],[role=radio],[role=combobox],[role=menuitem],input:not([type=hidden]),select,textarea,summary,[role=checkbox],[role=switch]';
  const bad = [];
  let n = 0;
  for (const e of document.querySelectorAll(sel)) {
    if (e.closest('.sr-only,[aria-hidden=true],[inert]')) continue;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (cs.position === 'absolute' && /sr-only|skip/.test(e.className) ) continue;
    if (e.tagName === 'A' && e.closest('p,li>span,.prose') && cs.display === 'inline') continue;
    if (e.tagName==='A' && e.closest('h2,h3') && e.getAttribute('href').startsWith('/resource/')) continue;
    n++;
    const min = touch && (e.tagName === 'BUTTON' || /button|tab|radio|menuitem|combobox/.test(e.getAttribute('role') || '') || e.tagName === 'SELECT') ? 44 : 24;
    if (r.width < min - 0.5 || r.height < min - 0.5) {
      bad.push(`${e.tagName}|${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 28)}|${Math.round(r.width)}x${Math.round(r.height)}|op=${cs.opacity}|min${min}`);
    }
  }
  const unlabeled = [...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea')].filter(e => !e.closest('[aria-hidden=true]') && e.getBoundingClientRect().width && !(e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.textContent.trim() || e.labels?.length || e.title || e.querySelector('img[alt]:not([alt=""])')) ).map(e => e.outerHTML.slice(0, 80));
  const noalt = [...document.querySelectorAll('img:not([alt])')].map(i => i.src.slice(-40));
  const lm = { main: document.querySelectorAll('main,[role=main]').length, banner: document.querySelectorAll('header[role=banner],body>header,[role=banner]').length, contentinfo: document.querySelectorAll('footer,[role=contentinfo]').length, h1: document.querySelectorAll('h1').length };
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => +h.tagName[1]);
  const skips = hs.filter((h, i) => i > 0 && h - hs[i - 1] > 1).length;
  const hscroll = document.documentElement.scrollWidth > innerWidth;
  return { url: location.pathname, w: innerWidth, touch, n, bad: bad.slice(0, 12), nbad: bad.length, unlabeled, noalt, lm, skips, hscroll };
}
