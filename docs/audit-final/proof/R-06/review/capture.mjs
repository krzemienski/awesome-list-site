import {open} from '/tmp/af/lib.mjs';
import {go,cap} from '../N-12/common.mjs';
const label='review_final_r07';
const s=await open('chromium',{storageState:'/tmp/af/state-'+label+'.json'}),p=s.page;
await go(p,'/settings');console.log(await p.locator('main').innerText());
console.log(await p.locator('main [role=tab],main button').allInnerTexts());
await cap(s,'R-06','settings',label);
const tab=p.getByRole('tab',{name:/Learning/});
if(await tab.count())await tab.click();
await cap(s,'R-06','settings-learning',label);
console.log('LEARNING',await p.locator('main').innerText());
console.log(await p.locator('main [role=radio]').evaluateAll(es=>es.map(e=>({id:e.id,value:e.value,checked:e.getAttribute('aria-checked'),label:e.closest('label')?.innerText}))));
for(const width of [1440,375]){
 await p.setViewportSize({width,height:width===375?812:900});s.width=width;
 await go(p,'/recommendations');await cap(s,'R-06',`${width}-profile`,label);
 console.log('RECOMMENDATIONS',await p.locator('main').innerText());
}
await s.browser.close();
