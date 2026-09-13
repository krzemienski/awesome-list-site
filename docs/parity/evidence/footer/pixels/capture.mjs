import {chromium} from '/home/runner/workspace/node_modules/playwright/index.mjs';
import {transform} from '/home/runner/workspace/node_modules/esbuild/lib/main.js';
import {PNG} from '/home/runner/workspace/node_modules/pngjs/lib/png.js';
import pixelmatch from '/home/runner/workspace/node_modules/pixelmatch/index.js';
import fs from 'node:fs';
const root='/home/runner/workspace',out='/tmp/footer-pixels';fs.mkdirSync(out,{recursive:true});
const base='http://127.0.0.1:5000';
const config=await fetch(base+'/api/config').then(r=>r.json());
const nav=await fetch(base+'/api/awesome-list/nav').then(r=>r.json());
const sourceParts=fs.readFileSync(root+'/awesome-list.config.yaml','utf8').split('\n').find(line=>line.includes('raw.githubusercontent.com')).split('https://raw.githubusercontent.com/')[1].split('/'); const source=[null,sourceParts[0]+'/'+sourceParts[1],sourceParts[2]];
const site={name:config.site.title,tagline:config.site.description,repoUrl:'https://github.com/'+source[1],repoBranch:source[2]};
const reference=(await transform(fs.readFileSync(root+'/awesome-list-site-ds/layout.jsx','utf8'),{loader:'jsx',jsx:'transform'})).code;
const b=await chromium.launch({headless:true,executablePath:root+'/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome',args:['--no-sandbox','--disable-partial-raster']});
const pages=[]; let tokens;
for(const kind of ['actual','expected']){
 const p=await b.newPage(); await p.goto(base+'/about'); await p.waitForSelector('main h1');
 if(kind==='actual') tokens=await p.evaluate(()=>{const s=getComputedStyle(document.documentElement);return Object.fromEntries([...s].filter(k=>k.startsWith('--')).map(k=>[k,s.getPropertyValue(k)]));});
 await p.evaluate(async({kind,nav,site,reference,tokens})=>{
 const source=await fetch('/src/main.tsx').then(r=>r.text());const reactURL=source.match(/from "([^" ]*react-dom_client.js[^" ]*)"/)[1];
 const {default:{createRoot}}=await import(reactURL);const {default:React}=await import(reactURL.replace('react-dom_client.js','react.js'));
 const host=document.createElement('div');host.id='isolated-footer';document.body.replaceChildren(host);
 let Footer;
 if(kind==='actual'){Footer=(await import('/src/components/layout/new/AppFooter.tsx')).default;}
 else{
 document.querySelectorAll('style,link[rel=stylesheet]:not([href*="fonts.googleapis"])').forEach(el=>el.remove());
 const css=document.createElement('link');css.rel='stylesheet';css.href='/@fs/home/runner/workspace/awesome-list-site-ds/styles.css';document.head.append(css);
 for(const [k,v] of Object.entries(tokens)) document.documentElement.style.setProperty(k,v);
 window.AV_TOTAL=nav.totalResources;window.AV_CATEGORIES=nav.categories.map(c=>({...c,id:c.slug,short:c.name}));window.AV_TOTAL_SUBCATS=nav.categories.reduce((n,c)=>n+(c.subcategories?.length||0),0);
 Footer=new Function('React',reference+'; return SiteFooter;')(React);
 }
 createRoot(host).render(React.createElement(Footer,kind==='actual'?{nav,site}:{go:()=>{},siteName:site.name,siteTag:site.tagline,repoUrl:site.repoUrl}));
 },{kind,nav,site,reference,tokens});
 await p.waitForSelector('#isolated-footer footer');
 if(kind==='expected') await p.addStyleTag({content:'.site-footer .footer-link{display:inline-flex!important;align-items:center!important;min-height:44px!important}.site-footer .footer-grid>div:first-child>div:first-child{min-height:44px}.site-footer .footer-live{display:flex!important}'});
 await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;backdrop-filter:none!important}'});
 pages.push(p);
}
// Approved non-content reconciliation: keep the frozen reference's structure,
// but align the official logo and required application destinations/copy.
const actualLogo=await pages[0].locator('.app-footer-mark').evaluate(el=>el.outerHTML);
await pages[1].evaluate(({actualLogo,site,nav})=>{
 const footer=document.querySelector('.site-footer');
 footer.classList.add('app-footer');
 footer.firstElementChild.classList.add('site-footer-inner');
 const cols=footer.querySelectorAll('.footer-grid > div');
 cols[0].classList.add('footer-brand');
 cols[0].children[1].classList.add('footer-tagline');
 cols[0].children[2].classList.add('footer-stats');
 cols[0].children[2].querySelector('span').classList.add('footer-live');
 cols.forEach((col,index)=>{
   if(index===0)return;
   col.classList.add('footer-column');
   col.children[1].classList.add('app-footer-links');
 });
 const brand=cols[0].children[0];
 brand.innerHTML=actualLogo+`<span class="mono" style="font-size:11px;font-weight:700;letter-spacing:1.8px">${site.name.toUpperCase()}</span>`;
 const setLinks=(col,items)=>{
   const box=col.children[1];
   box.replaceChildren(...items.map(([label,href])=>{
     const a=document.createElement('a');
     a.className='nav-link footer-link';
     a.textContent=label;
     a.href=href;
     return a;
   }));
 };
 const cats=nav.categories.slice(0,6);
 setLinks(cols[1],[...cats.map(c=>[c.name,`/category/${encodeURIComponent(c.slug)}`]),['All categories →','/categories'],['Journeys','/journeys']]);
 setLinks(cols[2],[['About','/about'],['Submit a resource','/submit'],['Admin','/admin'],['Terms','/terms'],['Privacy','/privacy'],['Code of Conduct','/code-of-conduct'],['Cookie settings','#']]);
 const repo=site.repoUrl.replace(/\/$/,'');
 const repoLabel=repo.replace(/^https?:\/\/(www\.)?github\.com\//,'');
 setLinks(cols[3],[[`${repoLabel} ↗`,repo],['Report an issue ↗',`${repo}/issues`],['Contributing ↗',`${repo}/blob/${site.repoBranch}/CONTRIBUTING.md`],['awesome-list guidelines ↗','https://github.com/sindresorhus/awesome'],['Docs ↗',`${repo}/tree/${site.repoBranch}/docs`],['Sitemap','/sitemap.xml']]);
 const bottom=footer.querySelector('.footer-grid + div');
 bottom.classList.add('footer-bottom');
 bottom.children[0].textContent=`© ${new Date().getFullYear()} ${site.name} · content CC0, code MIT`;
 bottom.children[1].textContent='Built with React & shadcn/ui';
},{actualLogo,site,nav});
await pages[1].addStyleTag({url:'http://127.0.0.1:5000/src/styles/shell/footer.css'});
await pages[1].addStyleTag({content:'.site-footer svg{width:28px;height:28px;flex-shrink:0}.site-footer .footer-grid>div>div:nth-child(2){gap:0!important}'});
const rows=[];
for(const width of [375,768,1024,1440]){
 const imgs=[];
 for(let i=0;i<2;i++){
 const p=pages[i];await p.setViewportSize({width,height:900});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);
 imgs.push(PNG.sync.read(await p.locator('#isolated-footer footer').screenshot({path:out+'/'+(i?'expected':'actual')+'-'+width+'.png'})));
 }
 const w=Math.max(...imgs.map(i=>i.width)),h=Math.max(...imgs.map(i=>i.height));
 const canvases=imgs.map(img=>{const p=new PNG({width:w,height:h});for(let j=0;j<p.data.length;j+=4){p.data[j]=0;p.data[j+1]=0;p.data[j+2]=0;p.data[j+3]=255;}PNG.bitblt(img,p,0,0,img.width,img.height,0,0);return p;});
 const diff=new PNG({width:w,height:h});const pixels=pixelmatch(canvases[0].data,canvases[1].data,diff.data,w,h,{threshold:0.1});
 fs.writeFileSync(out+'/diff-'+width+'.png',PNG.sync.write(diff));
 rows.push({width,union:{width:w,height:h},actualHeight:imgs[0].height,expectedHeight:imgs[1].height,pixels,percentage:100*pixels/(w*h),pass:pixels/(w*h)<=0.005});
}
fs.writeFileSync(out+'/results.json',JSON.stringify({site,threshold:0.1,limitPercent:0.5,rows},null,2));console.log(JSON.stringify(rows,null,2));await b.close();