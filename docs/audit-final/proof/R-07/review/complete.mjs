import {open} from '/tmp/af/lib.mjs';
import {go,cap,system} from '../N-12/common.mjs';
const label='review_final_r07';
const s=await open('chromium',{storageState:'/tmp/af/state-'+label+'.json',width:375,height:812}),p=s.page;
await go(p,'/onboarding?step=1');
await p.getByText('Beginner',{exact:true}).click();
for(let i=1;i<=4;i++){
 await p.getByTestId('button-onboarding-next').click();await p.waitForTimeout(400);
 console.log('STEP',i+1,await p.locator('main').innerText());
 const choice=p.locator('main [role=checkbox],main [role=radio]').first();if(await choice.count())await choice.click();
}
console.log('buttons',await p.locator('main button').allInnerTexts());
await p.getByRole('button',{name:/save/i}).filter({hasText:/save/i}).last().click();
await p.waitForTimeout(1500);
console.log('SAVED',await p.locator('main').innerText());
for(const width of [375,768]){
 await p.setViewportSize({width,height:width===375?812:1024});s.width=width;
 for(const theme of ['editorial','terminal','geist','brutalist','swiss']){
  await system(p,theme);
  await p.getByText('Your learning profile is ready',{exact:true}).scrollIntoViewIfNeeded();
  const measurements=await p.locator('main button,main a.btn').evaluateAll(es=>es.map(e=>({text:e.innerText,x:e.getBoundingClientRect().x,width:e.getBoundingClientRect().width,client:e.clientWidth,scroll:e.scrollWidth,height:e.getBoundingClientRect().height})));
  await cap(s,'R-07',`${width}-${theme}`,label,{measurements});
 }
}
await s.browser.close();
