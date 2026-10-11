import {open} from '/tmp/af/lib.mjs';
import {go,cap} from '../N-12/common.mjs';
const s=await open('chromium',{storageState:'/tmp/af/state-review_final_r07.json'}),p=s.page;
await go(p,'/settings');
await p.getByTestId('preferences-section-time').scrollIntoViewIfNeeded().catch(async()=>await p.getByText('Available time',{exact:true}).scrollIntoViewIfNeeded());
await cap(s,'R-06','available-time','review_final_r07',{time:await p.locator('fieldset').filter({hasText:'Available time'}).evaluateAll(es=>es.map(e=>({text:e.innerText,radios:[...e.querySelectorAll('[role=radio]')].map(r=>({id:r.id,checked:r.getAttribute('aria-checked')}))})))});
await s.browser.close();
