// WP-6 AC-6.4 / G4.6-c — ARIA tablist keyboard pattern audit.
// 1) /admin shell tabs (Radix Tabs): role=tablist/tab, aria-selected,
//    aria-controls, roving tabindex, ArrowRight/ArrowLeft, Home, End.
// 2) view-mode-toggle on /category/encoding-codecs: ToT-F LOCKED as Radix
//    ToggleGroup (role=group + roving focus, NOT a tablist) — audited for
//    arrow/Home/End roving + single-selected state, recorded as the
//    documented substitution.
// Usage: node _validation/phase-5/wp-6/tablist-keyboard.mjs
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "fs";

const BASE = "http://localhost:5000";
const OUT = "_validation/phase-5/tablist";
const EXEC = ".cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell";
mkdirSync(OUT, { recursive: true });

const asserts = [];
function chk(name, ok, detail) {
  asserts.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
}

async function keyboardFocus(page, handle) {
  await handle.evaluate((el) => el.focus());
  await page.keyboard.press("Shift+Tab");
  await page.waitForTimeout(60);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(150);
}

const active = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    return {
      role: el?.getAttribute("role"),
      text: (el?.textContent || "").trim().slice(0, 40),
      tabindex: el?.getAttribute("tabindex"),
      selected: el?.getAttribute("aria-selected"),
      state: el?.getAttribute("data-state"),
      testid: el?.getAttribute("data-testid"),
    };
  });

const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1536, height: 900 } });
const login = await ctx.request.post(BASE + "/api/auth/local/login", {
  data: {
    email: readFileSync("/tmp/qa_wp6_email.txt", "utf8").trim(),
    password: readFileSync("/tmp/qa_wp6_pass.txt", "utf8").trim(),
  },
  headers: { "Content-Type": "application/json" },
});
if (!login.ok()) throw new Error("login failed " + login.status());
const page = await ctx.newPage();

// ---------- 1) /admin shell tabs ----------
await page.goto(BASE + "/admin", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[role="tablist"] [role="tab"]', { timeout: 15000 });
await page.waitForTimeout(800);

const struct = await page.evaluate(() => {
  const tl = document.querySelector('[role="tablist"]');
  const tabs = [...tl.querySelectorAll('[role="tab"]')];
  return {
    tablist: !!tl,
    tabCount: tabs.length,
    allHaveSelected: tabs.every((t) => t.hasAttribute("aria-selected")),
    allHaveControls: tabs.every((t) => t.hasAttribute("aria-controls")),
    controlsResolve: tabs.every((t) => {
      const id = t.getAttribute("aria-controls");
      const p = id && document.getElementById(id);
      return !!p && p.getAttribute("role") === "tabpanel";
    }),
    rovingZero: tabs.filter((t) => t.getAttribute("tabindex") === "0").length,
    tablistTabindex: tl.getAttribute("tabindex"),
    selectedCount: tabs.filter((t) => t.getAttribute("aria-selected") === "true").length,
    firstText: (tabs[0]?.textContent || "").trim(),
    lastText: (tabs[tabs.length - 1]?.textContent || "").trim(),
  };
});
chk("admin.tablist-present", struct.tablist);
chk("admin.tab-count>=14", struct.tabCount >= 14, `count=${struct.tabCount}`);
chk("admin.all-aria-selected", struct.allHaveSelected);
chk("admin.all-aria-controls", struct.allHaveControls);
chk("admin.aria-controls-resolve-to-tabpanel", struct.controlsResolve);
chk("admin.single-selected", struct.selectedCount === 1, `selected=${struct.selectedCount}`);

// Roving tabindex: Radix RovingFocusGroup rests with container tabindex=0 and
// ALL items -1, then forwards focus to the selected tab on keyboard entry.
// Both (single item tabindex=0) and (container=0 + proven forwarding) satisfy
// the ARIA tablist pattern. Prove forwarding with a real Tab press from the
// last focusable element before the tablist.
await page.evaluate(() => {
  const tl = document.querySelector('[role="tablist"]');
  const all = [...document.querySelectorAll("a[href],button:not([disabled]),input,select,textarea,[tabindex]")].filter((e) => e.offsetParent !== null || e === tl);
  const idx = all.findIndex((e) => e === tl || tl.contains(e) || tl.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING);
  all[idx - 1]?.focus();
});
await page.keyboard.press("Tab");
await page.waitForTimeout(200);
const fwd = await page.evaluate(() => {
  const el = document.activeElement;
  return { role: el.getAttribute("role"), selected: el.getAttribute("aria-selected"), text: (el.textContent || "").trim().slice(0, 20) };
});
chk(
  "admin.roving-keyboard-reachable",
  struct.rovingZero === 1 || (struct.tablistTabindex === "0" && fwd.role === "tab" && fwd.selected === "true"),
  `restZeros=${struct.rovingZero} tlTabindex=${struct.tablistTabindex} tabEntry=${JSON.stringify(fwd)} (Radix container-forwarding pattern)`
);

const firstTab = await page.$('[role="tablist"] [role="tab"]');
await keyboardFocus(page, firstTab);
let a = await active(page);
chk("admin.focus-lands-on-tab", a.role === "tab", JSON.stringify(a));
const startText = a.text;

await page.keyboard.press("ArrowRight");
await page.waitForTimeout(300);
a = await active(page);
chk("admin.arrowright-moves-focus", a.role === "tab" && a.text !== startText, `now="${a.text}"`);
chk("admin.arrowright-roving-tabindex0", a.tabindex === "0", `tabindex=${a.tabindex}`);
const afterRight = a.text;

await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(300);
a = await active(page);
chk("admin.arrowleft-returns", a.role === "tab" && a.text === startText, `now="${a.text}"`);

await page.keyboard.press("End");
await page.waitForTimeout(300);
a = await active(page);
chk("admin.end-goes-last", a.role === "tab" && a.text === struct.lastText, `now="${a.text}" want="${struct.lastText}"`);

await page.keyboard.press("Home");
await page.waitForTimeout(300);
a = await active(page);
chk("admin.home-goes-first", a.role === "tab" && a.text === struct.firstText, `now="${a.text}"`);

// selection follows focus (Radix automatic activation) — ArrowRight then check aria-selected
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(400);
a = await active(page);
chk("admin.selection-follows-focus", a.selected === "true", `selected=${a.selected} on "${a.text}"`);
await page.keyboard.press("Home");
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/admin-tablist.png`, clip: { x: 0, y: 0, width: 1536, height: 320 } });

// ---------- 2) view-mode-toggle (ToT-F: ToggleGroup, role=group roving) ----------
await page.goto(BASE + "/category/encoding-codecs", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[role="group"] button', { timeout: 15000 });
await page.waitForTimeout(800);

const vmt = await page.evaluate(() => {
  const grp = document.querySelector('[role="group"]');
  const items = [...grp.querySelectorAll("button")];
  return {
    role: grp.getAttribute("role"),
    count: items.length,
    onCount: items.filter((b) => b.getAttribute("data-state") === "on").length,
    rovingZero: items.filter((b) => b.getAttribute("tabindex") === "0").length,
    grpTabindex: grp.getAttribute("tabindex"),
    labels: items.map((b) => b.getAttribute("aria-label") || (b.textContent || "").trim()),
    firstLabel: items[0]?.getAttribute("aria-label") || "",
    lastLabel: items[items.length - 1]?.getAttribute("aria-label") || "",
  };
});
chk("vmt.role-group-not-tablist", vmt.role === "group", "ToT-F locked substitution: ToggleGroup roving, not tablist");
chk("vmt.item-count>=2", vmt.count >= 2, `count=${vmt.count} labels=${vmt.labels.join("|")}`);
chk("vmt.single-on-state", vmt.onCount === 1, `on=${vmt.onCount}`);
chk("vmt.items-labelled", vmt.labels.every((l) => l.length > 0), vmt.labels.join("|"));

// Same Radix RovingFocusGroup rest-state pattern as the admin tablist:
// prove keyboard reachability by tabbing in from the previous focusable.
await page.evaluate(() => {
  const grp = document.querySelector('[role="group"]');
  const all = [...document.querySelectorAll("a[href],button:not([disabled]),input,select,textarea,[tabindex]")].filter((e) => e.offsetParent !== null || e === grp);
  const idx = all.findIndex((e) => e === grp || grp.contains(e) || grp.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING);
  all[idx - 1]?.focus();
});
await page.keyboard.press("Tab");
await page.waitForTimeout(200);
const vmtFwd = await page.evaluate(() => {
  const el = document.activeElement;
  return { inGroup: !!el.closest('[role="group"]'), state: el.getAttribute("data-state"), label: el.getAttribute("aria-label") };
});
chk(
  "vmt.roving-keyboard-reachable",
  vmt.rovingZero === 1 || vmtFwd.inGroup,
  `restZeros=${vmt.rovingZero} grpTabindex=${vmt.grpTabindex} tabEntry=${JSON.stringify(vmtFwd)} (Radix container-forwarding pattern)`
);

const firstItem = await page.$('[role="group"] button');
await keyboardFocus(page, firstItem);
a = await active(page);
const vmtStart = a.testid || a.text;
chk("vmt.focus-lands", !!a && (await page.evaluate(() => document.activeElement.closest('[role="group"]') !== null)), JSON.stringify(a));

await page.keyboard.press("ArrowRight");
await page.waitForTimeout(250);
a = await active(page);
chk("vmt.arrowright-roves", (a.testid || a.text) !== vmtStart && a.tabindex === "0", JSON.stringify(a));

await page.keyboard.press("End");
await page.waitForTimeout(250);
const endId = await page.evaluate(() => document.activeElement.getAttribute("aria-label") || document.activeElement.getAttribute("data-testid"));
await page.keyboard.press("Home");
await page.waitForTimeout(250);
const homeId = await page.evaluate(() => document.activeElement.getAttribute("aria-label") || document.activeElement.getAttribute("data-testid"));
chk("vmt.end-home-rove", endId !== homeId, `end="${endId}" home="${homeId}"`);
await page.screenshot({ path: `${OUT}/view-mode-toggle.png` });

await browser.close();
const fails = asserts.filter((x) => !x.ok);
writeFileSync(`${OUT}/tablist-keyboard.json`, JSON.stringify({ asserts, adminStruct: struct, vmtStruct: vmt }, null, 2));
console.log(fails.length === 0 ? `ALL PASS (${asserts.length} asserts)` : `FAILURES: ${fails.map((f) => f.name).join(", ")}`);
process.exit(fails.length === 0 ? 0 : 1);
