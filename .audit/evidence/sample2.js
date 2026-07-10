const artsP2 = Array.from(document.querySelectorAll('article')).slice(0, 3);
const outP2 = artsP2.map(a => ({
  text: a.innerText.slice(0, 80),
}));
JSON.stringify(outP2, null, 2);