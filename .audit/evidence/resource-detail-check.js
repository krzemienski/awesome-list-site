const h = document.querySelector('h1');
const links = Array.from(document.querySelectorAll('a[target="_blank"]')).map(a => ({href: a.getAttribute('href'), rel: a.getAttribute('rel'), text: a.innerText.slice(0, 40)}));
const ogImage = document.querySelector('meta[property="og:image"]');
const desc = document.querySelector('meta[name="description"]');
JSON.stringify({h1: h ? h.innerText : null, links, ogImage: ogImage ? ogImage.getAttribute('content') : null, desc: desc ? desc.getAttribute('content') : null, url: location.href}, null, 2);