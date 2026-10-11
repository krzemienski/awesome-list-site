import fs from 'node:fs';
import {shot,revision,BASE} from '/tmp/af/lib.mjs';
export async function go(p,path){await p.goto(BASE+path,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1400);await p.getByRole('button',{name:'Decline',exact:true}).click({timeout:800}).catch(()=>{});}
export async function cap(s,id,name,persona='guest',extra={}){
 const p=s.page, rev=await revision(p);
 const clean=`/tmp/af/review/${id}/review-${name}-clean.png`;
 await p.screenshot({path:clean});
 const data=await p.evaluate(()=>({url:location.href,text:document.body.innerText,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,current:[...document.querySelectorAll('[aria-current]')].map(e=>({text:e.innerText,href:e.getAttribute('href'),current:e.getAttribute('aria-current')}))}));
 const result=await shot(p,s,id,'review-'+name,persona,{extra:'revision='+rev});
 fs.appendFileSync(`/tmp/af/review/${id}/review-measurements.jsonl`,JSON.stringify({revision:rev,file:result.file,clean,...data,...extra,console:s.consoleLog})+'\n');
 console.log(JSON.stringify({id,name,rev,...extra}));
}
export async function system(p,x){await p.evaluate(s=>window.applyDesignSystem(s,window.SYSTEM_DEFAULT_ACCENT[s]),x);await p.waitForTimeout(200);}
