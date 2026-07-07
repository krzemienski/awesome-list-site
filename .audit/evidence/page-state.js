const cards = Array.from(document.querySelectorAll('a[href^="/resource/"]'));
const o = [];
for (const a of cards.slice(0, 5)) {
  o.push({href: a.getAttribute('href'), text: a.innerText.trim().slice(0, 60)});
}
const pagination = Array.from(document.querySelectorAll('button, span')).filter(el => /page|next|prev/i.test(el.innerText || '')).slice(0, 10).map(el => ({tag: el.tagName, text: el.innerText.slice(0, 40), disabled: el.disabled}));
JSON.stringify({cardsOnPage: o, pagination}, null, 2);