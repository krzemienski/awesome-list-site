import {open} from '/tmp/af/lib.mjs';
import {go,cap} from '../N-12/common.mjs';
const s=await open(),p=s.page;
for(const slug of ['players-clients','encoding-codecs','standards-industry']){
 await go(p,'/category/'+slug);
 await cap(s,'N-14',slug,'guest',{sidebar:await p.locator('[data-sidebar=sidebar]').innerText()});
 if(slug==='players-clients'){
  await p.getByTestId('expand-sub-mobile-web-players').click();
  await cap(s,'N-14','mobile-nested','guest',{sidebar:await p.locator('[data-sidebar=sidebar]').innerText()});
  console.log(await p.locator('[data-sidebar=sidebar] a').evaluateAll(es=>es.filter(e=>e.innerText.includes('Uncategorized')).map(e=>({text:e.innerText,href:e.getAttribute('href'),testid:e.getAttribute('data-testid')}))));
 }
}
await go(p,'/category/players-clients');
await p.getByTestId('sub-players-clients-uncategorized').click();await p.waitForTimeout(700);await cap(s,'N-14','uncategorized-click');
await p.reload();await p.waitForTimeout(1200);await cap(s,'N-14','uncategorized-reload');
await p.goBack();await p.waitForTimeout(700);await cap(s,'N-14','back');
await p.goForward();await p.waitForTimeout(700);await cap(s,'N-14','forward');
if(await p.getByTestId('expand-sub-mobile-web-players').getAttribute('aria-expanded')!=='true')await p.getByTestId('expand-sub-mobile-web-players').click();
await p.waitForTimeout(350);
await p.locator('[data-sidebar=sidebar] a[href="/subcategory/mobile-web-players?filter=general"]').click();
await p.waitForTimeout(700);await cap(s,'N-14','nested-uncategorized');
await p.setViewportSize({width:375,height:812});s.width=375;
await go(p,'/category/players-clients');
await p.getByRole('button',{name:'Toggle sidebar',exact:true}).click();
await p.getByTestId('sub-players-clients-uncategorized').scrollIntoViewIfNeeded();
await cap(s,'N-14','375-uncategorized');
await s.browser.close();
