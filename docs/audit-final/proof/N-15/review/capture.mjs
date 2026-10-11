import {open} from '/tmp/af/lib.mjs';
import {go,cap,system} from '../N-12/common.mjs';
const s=await open(),p=s.page;
for(const width of [1440,375]){
 await p.setViewportSize({width,height:width===375?812:900});s.width=width;
 for(const theme of ['editorial','brutalist']){
  for(const path of ['/subcategory/mobile-web-players','/category/players-clients']){
   await go(p,path+'?filter=general');await system(p,theme);
   const name=`${width}-${theme}-${path.split('/').pop()}`;
   const data={summary:await p.locator('.taxonomy-summary').innerText(),active:await p.locator('.taxonomy-active-filters').innerText(),heading:await p.getByTestId('text-results-count').innerText(),cards:await p.locator('[data-testid^="card-resource-"]').count()};
   await cap(s,'N-15',name+'-filtered','guest',data);
   console.log('FILTER BUTTONS',await p.locator('.taxonomy-active-filters').innerHTML());
   const remove=p.locator('.taxonomy-active-filters button').first();
   await remove.click();await p.waitForTimeout(650);await cap(s,'N-15',name+'-removed');
   await p.goBack();await p.waitForTimeout(650);await cap(s,'N-15',name+'-back');
   await p.goForward();await p.waitForTimeout(650);await cap(s,'N-15',name+'-forward');
   await p.goBack();await p.waitForTimeout(650);await p.locator('.taxonomy-active-filters button').first().focus();await p.keyboard.press('Enter');await p.waitForTimeout(650);await cap(s,'N-15',name+'-enter');
  }
 }
}
await s.browser.close();
