import {open} from '/tmp/af/lib.mjs';
import {go} from '../N-12/common.mjs';
const s=await open(),p=s.page;await go(p,'/category/players-clients');
console.log(await p.locator('[class*="av-sidebar"]').evaluateAll(es=>es.map(e=>({tag:e.tagName,class:e.className,html:e.outerHTML.slice(0,1500)}))));
console.log(await p.locator('[class*="av-sidebar"] a,[class*="av-sidebar"] button').evaluateAll(es=>es.map(e=>({text:e.innerText,href:e.getAttribute('href'),aria:e.getAttribute('aria-label'),class:e.className,testid:e.getAttribute('data-testid')}))));
await s.browser.close();
