// WP-6 AC-6.1 / G4.6-a — reduced-motion sweep.
// Emulates prefers-reduced-motion: reduce and dumps computed animation-duration
// for EVERY element (+ ::before/::after) on each route/overlay state.
// Pass condition: every duration ≤ 0.01ms (0.011ms parse tolerance).
// Usage: node _validation/phase-5/wp-6/motion-sweep.mjs <anon|admin>
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "fs";

const BASE = "http://localhost:5000";
const OUT = "_validation/phase-5/motion";
const EXEC = ".cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell";
mkdirSync(OUT, { recursive: true });

const mode = process.argv[2] || "anon";
const QA_EMAIL = readFileSync("/tmp/qa_wp6_email.txt", "utf8").trim();
const QA_PASS = readFileSync("/tmp/qa_wp6_pass.txt", "utf8").trim();

function parseMs(v) {
  // "0.01ms, 2s" -> [0.01, 2000]
  return v.split(",").map((p) => {
    p = p.trim();
    if (p.endsWith("ms")) return parseFloat(p);
    if (p.endsWith("s")) return parseFloat(p) * 1000;
    return 0;
  });
}

async function dumpMotion(page, state) {
  const raw = await page.evaluate(() => {
    const rows = [];
    const els = document.querySelectorAll("*");
    const sel = (el) => {
      let s = el.tagName.toLowerCase();
      if (el.id) s += "#" + el.id;
      const c = (el.className && typeof el.className === "string") ? el.className.split(/\s+/).filter(Boolean).slice(0, 3).join(".") : "";
      if (c) s += "." + c;
      return s.slice(0, 120);
    };
    for (const el of els) {
      for (const pseudo of [null, "::before", "::after"]) {
        const cs = getComputedStyle(el, pseudo);
        const name = cs.animationName;
        const dur = cs.animationDuration;
        if (!dur) continue;
        rows.push({ sel: sel(el) + (pseudo || ""), dur, name });
      }
    }
    return rows;
  });
  const offenders = [];
  for (const r of raw) {
    const parts = parseMs(r.dur);
    // only count as offender if an actual animation is assigned with a real duration
    const names = r.name.split(",").map((n) => n.trim());
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] > 0.011 && names[Math.min(i, names.length - 1)] !== "none") {
        offenders.push(r);
        break;
      }
    }
  }
  // also record any >0.011 duration regardless of name (strict per AC letter)
  const strictOffenders = raw.filter((r) => parseMs(r.dur).some((d) => d > 0.011));
  const rec = {
    state,
    reducedMotion: true,
    elementsProbed: raw.length,
    offendersActive: offenders.length,
    offendersStrict: strictOffenders.length,
    offenders: offenders.slice(0, 50),
    strictSample: strictOffenders.slice(0, 25),
    pass: offenders.length === 0 && strictOffenders.length === 0,
  };
  writeFileSync(`${OUT}/${state}.json`, JSON.stringify(rec, null, 2));
  console.log(`${rec.pass ? "PASS" : "FAIL"} ${state} probed=${rec.elementsProbed} active=${rec.offendersActive} strict=${rec.offendersStrict}`);
  return rec.pass;
}

async function settle(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForFunction(() => document.body && document.body.innerText.length > 20, null, { timeout: 10000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
}

const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });
let allPass = true;

if (mode === "anon") {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  await settle(page, BASE + "/");
  allPass &= await dumpMotion(page, "home.1280");

  // search palette (CommandDialog = Radix Dialog with animate-in classes)
  await page.keyboard.press("Control+k");
  await page.waitForSelector("[role=dialog]", { timeout: 5000 }).catch(async () => {
    await page.keyboard.press("Meta+k");
    await page.waitForSelector("[role=dialog]", { timeout: 5000 }).catch(() => {});
  });
  if (await page.$("[role=dialog]")) {
    allPass &= await dumpMotion(page, "overlay-search-palette.1280");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  } else {
    console.log("FAIL overlay-search-palette.1280 (palette did not open)");
    allPass = false;
  }

  await settle(page, BASE + "/category/encoding-codecs");
  allPass &= await dumpMotion(page, "category-encoding-codecs.1280");

  // dropdown overlay: subcategory filter Select
  const st = await page.$('[data-testid="select-subcategory-filter"]');
  if (st) {
    await st.click();
    await page.waitForSelector("[role=listbox]", { timeout: 5000 }).catch(() => {});
    if (await page.$("[role=listbox]")) {
      allPass &= await dumpMotion(page, "overlay-select-dropdown.1280");
      await page.keyboard.press("Escape");
    } else { console.log("FAIL overlay-select-dropdown (listbox not open)"); allPass = false; }
  } else { console.log("FAIL overlay-select-dropdown (trigger missing)"); allPass = false; }

  // toast overlay: anon /profile triggers AuthGuard deny toast + redirect
  await page.goto(BASE + "/profile", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForSelector('[role="status"], li[data-state="open"], [data-radix-toast-announce-exclude]', { timeout: 8000 }).catch(() => {});
  const hasToast = await page.$('li[data-state="open"], [role="status"]');
  if (hasToast) {
    allPass &= await dumpMotion(page, "overlay-toast.1280");
  } else { console.log("FAIL overlay-toast (toast not visible)"); allPass = false; }
  await ctx.close();

  // drawer @375 (mobile sheet)
  const mctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 375, height: 720 } });
  const mpage = await mctx.newPage();
  await settle(mpage, BASE + "/");
  const trig = await mpage.$('[data-sidebar="trigger"]');
  if (trig) {
    await trig.click();
    await mpage.waitForSelector('[data-sidebar="sidebar"][data-mobile="true"], [role=dialog]', { timeout: 5000 }).catch(() => {});
    allPass &= await dumpMotion(mpage, "overlay-drawer.375");
  } else { console.log("FAIL overlay-drawer (trigger missing)"); allPass = false; }
  await mctx.close();
} else {
  // admin mode — login via API, enrichment tab + approve dialog (temp pending resource)
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
  const login = await ctx.request.post(BASE + "/api/auth/local/login", {
    data: { email: QA_EMAIL, password: QA_PASS }, headers: { "Content-Type": "application/json" },
  });
  if (!login.ok()) throw new Error("qa admin login failed " + login.status());
  const page = await ctx.newPage();

  await settle(page, BASE + "/admin");
  const enrichTab = await page.$('[data-testid="tab-enrichment"]');
  if (enrichTab) { await enrichTab.click(); await page.waitForTimeout(800); }
  allPass &= await dumpMotion(page, "admin-enrichment.1280");

  // temp pending resource for the approve dialog
  const sub = await ctx.request.post(BASE + "/api/resources", {
    data: {
      title: "__qa_test_wp6 motion probe",
      url: "https://example.com/__qa_test_wp6_motion",
      description: "throwaway WP-6 reduced-motion dialog probe",
      category: "Community & Events",
    },
    headers: { "Content-Type": "application/json" },
  });
  const subBody = await sub.json().catch(() => ({}));
  console.log("pending-submit", sub.status(), subBody.id ?? "");
  await settle(page, BASE + "/admin");
  await page.waitForSelector('[data-testid^="card-resource-"], [data-testid^="button-approve"]', { timeout: 10000 }).catch(() => {});
  const approveBtn = await page.$('[data-testid^="button-approve"]');
  if (approveBtn) {
    await approveBtn.click();
    await page.waitForSelector("[role=dialog], [role=alertdialog]", { timeout: 5000 }).catch(() => {});
    if (await page.$("[role=dialog], [role=alertdialog]")) {
      allPass &= await dumpMotion(page, "overlay-approve-dialog.1280");
      await page.keyboard.press("Escape");
    } else { console.log("FAIL overlay-approve-dialog (no dialog)"); allPass = false; }
  } else { console.log("FAIL overlay-approve-dialog (no approve button)"); allPass = false; }
  // clean the temp pending immediately (reject leaves a rejected row; delete handled at teardown)
  if (subBody.id) {
    const rej = await ctx.request.post(`${BASE}/api/admin/resources/${subBody.id}/reject`, { data: {}, headers: { "Content-Type": "application/json" } });
    console.log("pending-reject", rej.status());
  }
  await ctx.close();
}

await browser.close();
console.log(allPass ? "SWEEP PASS" : "SWEEP FAIL");
process.exit(allPass ? 0 : 1);
