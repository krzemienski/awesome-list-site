const artsP = Array.from(document.querySelectorAll('article')).slice(0, 3);
const outP = artsP.map(a => ({
  text: a.innerText.slice(0, 100),
  attrs: Array.from(a.attributes).map(x => `${x.name}=${x.value.slice(0,40)}`)
}));
JSON.stringify(outP, null, 2);