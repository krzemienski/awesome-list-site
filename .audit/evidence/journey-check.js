const h = document.querySelector('h1');
const journeyLinks = Array.from(document.querySelectorAll('a[href^="/journey/"]')).map(a => a.getAttribute('href'));
JSON.stringify({h1: h ? h.innerText : null, journeyLinks, count: journeyLinks.length}, null, 2);