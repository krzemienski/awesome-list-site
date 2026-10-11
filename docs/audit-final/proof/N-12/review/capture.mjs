import {open,BASE} from '/tmp/af/lib.mjs';
import {go,cap} from './common.mjs';
const s=await open(),p=s.page;
await go(p,'/category/players-clients');
const cats=await p.evaluate(()=>fetch('/api/categories').then(r=>r.json()));
for(const c of [...cats,...['libraries','tools','events'].map(kind=>({slug:'players-clients?kind='+kind}))]){
 await go(p,'/category/'+c.slug);
 const data={summary:await p.locator('.taxonomy-summary').innerText(),cards:await p.locator('.taxonomy-child').allInnerTexts(),heading:await p.getByTestId('text-results-count').innerText()};
 await cap(s,'N-12',c.slug.replaceAll('?','-').replaceAll('=','-'),'guest',data);
}
await go(p,'/category/players-clients');
await p.getByTestId('taxonomy-child-uncategorized').click();await p.waitForTimeout(800);await cap(s,'N-12','uncategorized-click');
await p.reload();await p.waitForTimeout(1200);await cap(s,'N-12','uncategorized-reload');
await p.goBack();await p.waitForTimeout(800);await cap(s,'N-12','back');
await p.goForward();await p.waitForTimeout(800);await cap(s,'N-12','forward');
await p.goBack();await p.waitForTimeout(800);await p.getByTestId('taxonomy-child-uncategorized').focus();await p.keyboard.press('Enter');await p.waitForTimeout(800);await cap(s,'N-12','uncategorized-enter');
await s.browser.close();
