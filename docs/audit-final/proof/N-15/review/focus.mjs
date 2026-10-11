import {open} from '/tmp/af/lib.mjs';
import {go,cap,system} from '../N-12/common.mjs';
const s=await open(),p=s.page;
for(const width of [1440,375]){
 await p.setViewportSize({width,height:width===375?812:900});s.width=width;
 for(const theme of ['editorial','brutalist']){
  for(const path of ['/subcategory/mobile-web-players','/category/players-clients']){
   await go(p,path+'?filter=general');await system(p,theme);
   await p.locator('.taxonomy-active-filters button').focus();
   await p.locator('.taxonomy-active-filters button').scrollIntoViewIfNeeded();
   await cap(s,'N-15',`${width}-${theme}-${path.split('/').pop()}-visible-chip`);
   await p.keyboard.press('Enter');await p.waitForTimeout(500);
   await cap(s,'N-15',`${width}-${theme}-${path.split('/').pop()}-focus-after-enter`,'guest',{focus:await p.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.innerText.slice(0,100),aria:document.activeElement.getAttribute('aria-label')}))});
  }
 }
}
await s.browser.close();
