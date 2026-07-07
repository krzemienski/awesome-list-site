const cards = Array.from(document.querySelectorAll('a[href^="/category/"]'));
const out = [];
for (const a of cards) {
  const href = a.getAttribute('href');
  const slug = href.replace('/category/', '');
  // Look for a sibling or child with count
  const parent = a.closest('[class]') || a.parentElement;
  const text = parent ? parent.innerText : a.innerText;
  const m = text.match(/(\d[\d,]*)/);
  out.push({href, count: m ? m[1] : '?', text: text.slice(0, 80)});
}
JSON.stringify(out.slice(0, 30), null, 2);