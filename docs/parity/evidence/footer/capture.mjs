import { chromium } from '/home/runner/workspace/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out='/tmp/footer-evidence'; fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome',args:['--no-sandbox','--disable-partial-raster']});
const page=await browser.newPage();
await page.goto('http://127.0.0.1:5000/about');
await page.waitForSelector('main h1');
await page.evaluate(async()=>{
 const {default:React}=await import('/@fs/home/runner/workspace/node_modules/.vite/deps/react.js?v=be5c9ae3');
 const {default:{createRoot}}=await import('/@fs/home/runner/workspace/node_modules/.vite/deps/react-dom_client.js?v=be5c9ae3');
 const {default:Footer}=await import('/src/components/layout/new/AppFooter.tsx');
 const nav=await fetch('/api/awesome-list/nav').then(r=>r.json());
 const host=document.createElement('div'); host.id='footer-check'; document.body.append(host);
 createRoot(host).render(React.createElement(Footer,{nav}));
});
await page.waitForSelector('#footer-check footer');
await page.addScriptTag({path:'/home/runner/workspace/node_modules/axe-core/axe.min.js'});
const results=[];
for(const width of [375,768,1024,1440]){
 await page.setViewportSize({width,height:900}); await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(400);
 const footer=page.locator('#footer-check footer'); await footer.screenshot({path:out+'/footer-'+width+'.png'});
 const geometry=await footer.evaluate(el=>({overflow:el.scrollWidth>el.clientWidth,columns:getComputedStyle(el.querySelector('.footer-grid')).gridTemplateColumns,padding:getComputedStyle(el.firstElementChild).padding}));
 const axe=await page.evaluate(async()=>{const r=await axe.run('#footer-check');return r.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,impact:v.impact}));});
 results.push({width,geometry,axe});
}
const links=await page.locator('#footer-check a').evaluateAll(els=>els.map(el=>el.getAttribute('href')));
const statuses=[];
for(const href of [...new Set(links)].filter(s=>s.startsWith('/'))){const r=await page.request.get('http://127.0.0.1:5000'+href);statuses.push({href,status:r.status()});}
await page.emulateMedia({media:'print'}); const printHidden=await page.locator('#footer-check footer').evaluate(el=>getComputedStyle(el).display==='none');
await page.emulateMedia({media:'screen'});
await page.evaluate(()=>{history.pushState({},'', '/admin');dispatchEvent(new PopStateEvent('popstate'));}); await page.waitForTimeout(300);
const adminHidden=await page.locator('#footer-check footer').count()===0;
fs.writeFileSync(out+'/results.json',JSON.stringify({results,statuses,printHidden,adminHidden},null,2)); console.log(fs.readFileSync(out+'/results.json','utf8')); await browser.close();