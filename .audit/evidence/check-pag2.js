const yc = Array.from(document.querySelectorAll('a[href^="/resource/"]'));
const oY = yc.slice(0, 3).map(a => ({href: a.getAttribute('href'), text: a.innerText.trim().slice(0, 60)}));
const pageIndY = Array.from(document.querySelectorAll('span')).filter(el => /Page \\d/.test(el.innerText || '')).map(el => el.innerText.trim());
const artCountY = Array.from(document.querySelectorAll('article, [role="article"]')).length;
const allCards = Array.from(document.querySelectorAll('h3, [class*="title"]')).slice(0, 5).map(el => el.innerText.trim().slice(0, 50));
JSON.stringify({first3: oY, pageIndicator: pageIndY, articleCount: artCountY, sampleH3: allCards, url: location.href}, null, 2);