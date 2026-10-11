import {open,BASE,revision} from '/tmp/af/lib.mjs';
const s=await open(); const p=s.page;
await p.goto(BASE+'/category/players-clients'); await p.waitForTimeout(1800);
await p.getByRole('button',{name:'Decline',exact:true}).click().catch(()=>{});
console.log(await revision(p));
console.log(await p.locator('body').innerText());
console.log(await p.locator('main').innerHTML());
await s.browser.close();
