import {open} from '/tmp/af/lib.mjs';
import {go,cap,system} from '../N-12/common.mjs';
const s=await open(),p=s.page;
await go(p,'/');
await p.getByRole('button',{name:'Decline',exact:true}).click({timeout:10000}).catch(()=>{});
async function capture(name,width){
 const selector=width===375?'.av-sidebar-drawer':'.av-sidebar-shell';
 if(width===375 && !await p.locator(selector).count()){
  await p.getByRole('button',{name:'Toggle sidebar',exact:true}).click();
  await p.waitForTimeout(650);
 }
 const sidebar=await p.locator(selector).evaluate(e=>{
  const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
  return {rect:rect(e),scrollTop:e.scrollTop,current:[...e.querySelectorAll('[aria-current="page"]')].map(n=>({text:n.innerText,href:n.getAttribute('href'),rect:rect(n)})),text:e.innerText,counts:[...e.querySelectorAll('[data-testid="accordion-cat-players-clients"],[data-testid="sub-mobile-web-players"],[data-testid^="subsub-mobile-web-players-"]')].map(n=>({text:n.innerText,id:n.getAttribute('data-testid'),href:n.getAttribute('href')}))};
 });
 await cap(s,'N-14-r2',width+'-'+name,'guest',{sidebar});
}
for(const width of [1440,375]){
 await p.setViewportSize({width,height:width===375?812:900});s.width=width;
 const paths=[
 ['/subcategory/mobile-web-players?filter=general','nested-filtered'],
 ['/subcategory/mobile-web-players','subcategory'],
 ['/sub-subcategory/android','android'],
 ['/sub-subcategory/ios-tvos','ios-tvos'],
 ['/category/players-clients?filter=general','category-filtered'],
 ['/category/players-clients','category']
 ];
 for(const [path,name] of paths){
  await go(p,path);await system(p,'editorial');await capture(name,width);
  if(name==='nested-filtered'){
   await p.reload();await p.waitForTimeout(1500);await capture('nested-filtered-reload',width);
  }
 }
 await go(p,'/category/players-clients');await capture('before-nested-click',width);
 const root=p.locator(width===375?'.av-sidebar-drawer':'.av-sidebar-shell');
 const exp=root.getByTestId('expand-sub-mobile-web-players');
 if(await exp.getAttribute('aria-expanded')!=='true')await exp.click();
 await p.waitForTimeout(250);
 await capture('expanded-counts',width);
 await root.getByTestId('subsub-mobile-web-players-uncategorized').click();
 await p.waitForTimeout(700);await capture('nested-click',width);
 await p.reload();await p.waitForTimeout(1500);await capture('nested-click-reload',width);
 await p.goBack();await p.waitForTimeout(750);await capture('back',width);
 await p.goForward();await p.waitForTimeout(750);await capture('forward',width);
}
await s.browser.close();
