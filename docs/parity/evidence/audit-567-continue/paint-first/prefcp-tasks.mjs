import { chromium } from "playwright";
import fs from "node:fs";
const url = process.argv[2] || "http://127.0.0.1:5101/";
const b = await chromium.launch({ executablePath: '/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome' });
const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true });
const p = await ctx.newPage();
await b.startTracing(p, { path: '/tmp/prefcp.json', categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink.user_timing', 'loading', 'blink', 'blink.resource'] });
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(300);
await b.stopTracing(); await b.close();
const ev = JSON.parse(fs.readFileSync('/tmp/prefcp.json', 'utf8')).traceEvents;
const nav = ev.find(e => e.name === 'navigationStart' && e.args?.data?.documentLoaderURL === url) || ev.find(e=>e.name==='navigationStart');
const t0 = nav.ts, pid = nav.pid, tid = nav.tid;
const fcp = ev.find(e => e.name === 'firstContentfulPaint' && e.ts >= t0);
const fp = ev.find(e => e.name === 'firstPaint' && e.ts >= t0);
console.log('FP', fp ? (fp.ts - t0) / 1000 : null, 'FCP', (fcp.ts - t0) / 1000);
// resource finish times
for (const e of ev.filter(e => e.name === 'ResourceFinish' && e.ts >= t0 && e.ts < fcp.ts + 100000)) { const send = ev.find(x => x.name === 'ResourceSendRequest' && x.args.data.requestId === e.args.data.requestId); console.log('  res', ((e.ts - t0) / 1000).toFixed(0).padStart(4), (send?.args.data.url || '?').replace(/^https?:\/\/[^/]+/, '').slice(0, 70)); }
// main thread top-level tasks before FCP with children breakdown
const main = ev.filter(e => e.pid === pid && e.tid === tid && e.ph === 'X' && e.ts >= t0 && e.ts < fcp.ts + 5000).sort((a, b) => a.ts - b.ts);
const top = main.filter(e => e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask');
const agg = {};
for (const e of main) { if (['RunTask','ThreadControllerImpl::RunTask','ThreadControllerImpl::DoWork'].includes(e.name)) continue; if (!e.dur || e.dur < 2000) continue; if (/^(Layout|UpdateLayoutTree|Paint|PrePaint|EvaluateScript|ParseHTML|FunctionCall|v8\.compile|ParseAuthorStyleSheet|CommitLoad|HitTest|ScheduleStyleRecalculation|EventDispatch|TimerFire|XHRReadyStateChange|ResourceReceivedData|StyleRecalcInvalidationTracking|Blink\.Style|Document::updateStyle|LocalFrameView::|RunMicrotasks|v8\.run|V8\.|FontFace|CSSFontSelector|Resource)/.test(e.name) || true) { const d = e.args?.data || e.args?.beginData || {}; console.log(((e.ts - t0) / 1000).toFixed(1).padStart(7), (e.dur / 1000).toFixed(1).padStart(6), e.name.padEnd(34), JSON.stringify(d).slice(0, 100)); } }
