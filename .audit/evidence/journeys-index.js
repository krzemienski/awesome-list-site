const journeyLinks = Array.from(document.querySelectorAll('a[href*="/journey"]')).map(a => ({href: a.getAttribute('href'), text: a.innerText.slice(0, 60)}));
const h1 = document.querySelector('h1');
JSON.stringify({h1: h1 ? h1.innerText : null, journeyLinks: journeyLinks.slice(0, 10), count: journeyLinks.length}, null, 2);