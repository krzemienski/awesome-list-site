import {open} from '/tmp/af/lib.mjs';
import {go,cap,system} from '../N-12/common.mjs';
const s=await open('chromium',{width:375,height:812}),p=s.page;
const measures=()=>p.evaluate(()=>{
 const d=document.querySelector('.av-sidebar-drawer'),close=d.querySelector('[aria-label="Close sidebar"]'),header=d.querySelector('[data-sidebar=header]');
 const rect=e=>{const r=e?.getBoundingClientRect();return r&&{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
 return {drawer:rect(d),scrollTop:d.scrollTop,scrollHeight:d.scrollHeight,clientHeight:d.clientHeight,overflow:getComputedStyle(d).overflowY,close:rect(close),header:rect(header),current:[...d.querySelectorAll('[aria-current]')].map(e=>({text:e.innerText,rect:rect(e)})),rows:[...d.querySelectorAll('[data-testid^="accordion-cat"]')].map(e=>({text:e.innerText,rect:rect(e)})),footer:rect(d.querySelector('[data-sidebar=footer]'))};
});
for(const width of [375,768]){
 const height=width===375?812:1024;await p.setViewportSize({width,height});s.width=width;
 for(const theme of ['editorial','brutalist']){
  await go(p,'/category/players-clients');await system(p,theme);
  await p.getByRole('button',{name:'Toggle sidebar',exact:true}).click();await p.waitForTimeout(450);
  await p.evaluate(()=>{const d=document.querySelector('.av-sidebar-drawer'),r=d.querySelector('[data-testid="accordion-cat-players-clients"]');d.scrollTop+=r.getBoundingClientRect().top-d.getBoundingClientRect().top-65;});
  await p.waitForTimeout(250);await cap(s,'D-12',`${width}-${theme}-scrolled`,'guest',await measures());
  await p.evaluate(()=>{const d=document.querySelector('.av-sidebar-drawer');d.scrollTop=d.scrollHeight;});
  await p.waitForTimeout(250);await cap(s,'D-12',`${width}-${theme}-footer`,'guest',await measures());
  await p.getByRole('button',{name:'Close sidebar',exact:true}).click();await p.waitForTimeout(200);
  await cap(s,'D-12',`${width}-${theme}-closed`,'guest',{focus:await p.evaluate(()=>({tag:document.activeElement.tagName,aria:document.activeElement.getAttribute('aria-label')}))});
  await go(p,'/subcategory/video-codec-specifications');await system(p,theme);
  await p.getByRole('button',{name:'Toggle sidebar',exact:true}).click();await p.waitForTimeout(600);
  await cap(s,'D-12',`${width}-${theme}-active-on-open`,'guest',await measures());
  await p.getByRole('button',{name:'Close sidebar',exact:true}).click();
 }
}
await s.browser.close();
