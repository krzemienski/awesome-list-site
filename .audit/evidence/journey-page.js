const h = document.querySelector('h1');
const steps = Array.from(document.querySelectorAll('[class*="step"], button')).slice(0, 5).map(el => ({tag: el.tagName, text: el.innerText.slice(0, 60)}));
const startBtn = Array.from(document.querySelectorAll('button')).find(b => /start|begin|continue|resume/i.test(b.innerText));
JSON.stringify({h1: h ? h.innerText : null, steps: steps.length, startBtn: startBtn ? startBtn.innerText : null, url: location.href}, null, 2);