// Public surface deep audit — pass 1: capture screenshots at all 3 viewports
// for the specified pages, with metrics for overflow, broken images, console errors.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://awesome.video';
const SCREEN_DIR = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';
const FINDINGS = [];

// Pages to hit
const PAGES = [
  { slug: 'home',                    url: '/' },
  { slug: 'about',                   url: '/about' },
  { slug: 'submit',                  url: '/submit' },
  { slug: 'recommendations',         url: '/recommendations' },
  { slug: 'journeys',                url: '/journeys' },
  { slug: 'advanced',                url: '/advanced' },
  { slug: 'categories',              url: '/categories' },
  { slug: 'category-encoding-codecs',url: '/category/encoding-codecs' },
  { slug: 'subcategory-ffmpeg',      url: '/subcategory/ffmpeg' },
  { slug: 'subsubcategory-av1',      url: '/sub-subcategory/av1' },
  { slug: 'login',                   url: '/login' },
  { slug: 'register',                url: '/register' },
  { slug: 'forgot-password',         url: '/forgot-password' },
  { slug: 'reset-password',          url: '/reset-password' },
];

// 10 random resource slugs from all-urls.txt
const RESOURCE_SLUGS = [
  '185020','184751','186231','186145','186477',
  '185570','185971','185970','185983','185860',
].map(id => ({ slug: `resource-${id}`, url: `/resource/${id}` }));

const ALL_PAGES = [...PAGES, ...RESOURCE_SLUGS];

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900,  isMobile: false, hasTouch: false },
  { name: '768',  width: 768,  height: 1024, isMobile: false, hasTouch: true  },
  { name: '375',  width: 375,  height: 812,  isMobile: true,  hasTouch: true  },
];

(async () => {
  const b = await chromium.launch({ headless: true });
  for (const page of ALL_PAGES) {
    for (const vp of VIEWPORTS) {
      const ctx = await b.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
      });
      const p = await ctx.newPage();
      const consoleErrs = [];
      const netErrs = [];
      p.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0,300)); });
      p.on('pageerror', e => consoleErrs.push('[pageerror] ' + e.message.slice(0,300)));
      p.on('response', r => {
        if (r.status() >= 400 && r.status() !== 304 && !r.url().endsWith('.map')) {
          netErrs.push(r.status() + ' ' + r.url());
        }
      });

      const url = BASE + page.url;
      const safeSlug = page.slug.replace(/[^a-z0-9-]/gi, '_');
      const fname = `public2_${safeSlug}_${vp.name}.png`;

      try {
        await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await p.waitForTimeout(2500);

        // Full-page screenshot
        await p.screenshot({
          path: path.join(SCREEN_DIR, fname),
          fullPage: true,
        });

        // Metrics
        const metrics = await p.evaluate(() => {
          const overflowH = (sel) => {
            const els = [...document.querySelectorAll(sel)];
            const offenders = [];
            for (const e of els) {
              if (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1) {
                offenders.push({
                  tag: e.tagName,
                  cls: (e.className || '').toString().slice(0, 60),
                  text: (e.textContent || '').trim().slice(0, 50),
                  scrollW: e.scrollWidth, clientW: e.clientWidth,
                  scrollH: e.scrollHeight, clientH: e.clientHeight,
                });
              }
            }
            return offenders.slice(0, 8);
          };
          const imgs = [...document.querySelectorAll('img')];
          const brokenImgs = imgs.filter(i => i.complete && i.naturalWidth === 0 && i.src).map(i => ({
            src: i.src.slice(0, 200),
            alt: i.alt,
          }));
          const bodyW = document.body.scrollWidth;
          const viewW = window.innerWidth;
          return {
            overflowDivs: overflowH('div'),
            overflowSections: overflowH('section'),
            overflowArticles: overflowH('article'),
            overflowNav: overflowH('nav'),
            overflowMain: overflowH('main'),
            overflowHeader: overflowH('header'),
            brokenImgs,
            horizontalOverflow: bodyW > viewW + 1,
            bodyWidth: bodyW,
            viewWidth: viewW,
            bodyBgColor: getComputedStyle(document.body).backgroundColor,
            bodyColor: getComputedStyle(document.body).color,
            docTitle: document.title,
            docLang: document.documentElement.lang,
            buttonsCount: document.querySelectorAll('button').length,
            linksCount: document.querySelectorAll('a').length,
            inputsCount: document.querySelectorAll('input').length,
            formCount: document.querySelectorAll('form').length,
            headingCount: document.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
            h1Texts: [...document.querySelectorAll('h1')].map(h => (h.textContent || '').trim().slice(0, 80)),
            emptyH1: [...document.querySelectorAll('h1')].map(h => (h.textContent || '').trim()).filter(t => t === '').length,
            svgCount: document.querySelectorAll('svg').length,
            totalElements: document.querySelectorAll('*').length,
          };
        });

        FINDINGS.push({
          url,
          slug: page.slug,
          vp: vp.name,
          screenshot: fname,
          consoleErrs: consoleErrs.slice(0, 12),
          netErrs: netErrs.slice(0, 12),
          metrics,
        });

        console.log(`OK  ${page.slug} @ ${vp.name}  errs=${consoleErrs.length} net=${netErrs.length}`);
      } catch (e) {
        FINDINGS.push({
          url,
          slug: page.slug,
          vp: vp.name,
          screenshot: fname,
          fatalError: e.message.slice(0, 300),
        });
        console.log(`FAIL ${page.slug} @ ${vp.name}  ${e.message.slice(0, 100)}`);
      } finally {
        await p.close();
        await ctx.close();
      }
    }
  }
  await b.close();
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/public-deep-pass1.json', JSON.stringify(FINDINGS, null, 1));
  console.log('PASS1 DONE', FINDINGS.length);
})().catch(e => { console.error('FATAL', e); process.exit(1); });