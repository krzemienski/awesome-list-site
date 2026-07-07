const allLinks = Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href')).filter(h => h && h.includes('journey'));
const allLinks2 = Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href')).filter(h => h && /journey/.test(h));
JSON.stringify({allJourneyRelated: [...new Set(allLinks2)].slice(0, 20)}, null, 2);