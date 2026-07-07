const xc = Array.from(document.querySelectorAll('a[href^="/resource/"]'));
const oX = xc.slice(0, 3).map(a => ({href: a.getAttribute('href'), text: a.innerText.trim().slice(0, 60)}));
const pageInd = Array.from(document.querySelectorAll('span')).filter(el => /Page \\d/.test(el.innerText || '')).map(el => el.innerText.trim());
const artCount = Array.from(document.querySelectorAll('article, [role="article"]')).length;
JSON.stringify({first3: oX, pageIndicator: pageInd, articleCount: artCount, url: location.href}, null, 2);