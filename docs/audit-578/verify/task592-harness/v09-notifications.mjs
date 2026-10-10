// V09 — notification preference UI (toggles, sections, cadence, timezone validation, save/reload,
// pause/resume, unsubscribe all, quick actions preserve unsaved draft, preview empty/populated) and
// learning-preferences reset (layout/theme untouched, stale revision 409, defaults after reload).
import { BASE, q, mintUser, call, token, ensureLocal, teardownAll, residue, writeJson, sleep } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, VPS, pageFetch } from "./browser-lib.mjs";

const vpName = process.argv[2] ?? "desktop";
const out = { started: new Date().toISOString(), vp: vpName, steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log(name, JSON.stringify(data).slice(0, 1000)); };
const browser = await launch();
try {
  const A = await mintUser("v09a");
  await ensureLocal(A);
  const jwt = await token(A);
  const { page } = await newPage(browser, VPS[vpName]);
  const card = page.locator('[data-testid="card-notification-preferences"]');
  const np = async () => { const j = (await pageFetch(page, "/api/notification-preferences")).json; return { email: j.emailDigestEnabled, inApp: j.inAppEnabled, newRes: j.includeNewResources, watch: j.includeWatchNext, journey: j.includeJourneyStep, cadence: j.cadence, tz: j.timezone, pausedUntil: j.pausedUntil }; };
  const status = () => card.locator('[role="status"]').innerText().catch(() => null);
  const alert = () => card.locator('[role="alert"]').allInnerTexts().catch(() => []);
  const ready = async () => { await card.getByRole("button", { name: "Save choices" }).waitFor({ timeout: 30_000 }); await sleep(500); };
  const puts = []; page.on("request", (r) => { if (r.method() === "PUT" && r.url().includes("/api/notification-preferences")) puts.push(JSON.parse(r.postData() ?? "{}")); });

  await signIn(page, A, "/settings");
  await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
  await ready();
  const initial = await np();
  const previewEmpty = (await card.locator('section[aria-labelledby="digest-preview"]').innerText()).replace(/\s+/g, " ");
  step("initial", { initial, previewEmpty });

  // Edit: opt in both channels, drop "Watch next", daily cadence, invalid timezone → no PUT.
  await card.locator("label", { hasText: "Email digest" }).click();
  await card.locator("label", { hasText: "In-app updates" }).click();
  await card.locator("label", { hasText: "Journey steps" }).click();
  await card.locator("#digest-cadence").selectOption("biweekly");
  await card.locator("#digest-timezone").fill("Mars/Olympus_Mons");
  const putsBefore = puts.length;
  await card.getByRole("button", { name: "Save choices" }).click(); await sleep(800);
  step("invalid-timezone", { alerts: await alert(), ariaInvalid: await card.locator("#digest-timezone").getAttribute("aria-invalid"), putsSent: puts.length - putsBefore, server: await np() });
  await shot(page, `V09-tz-invalid-${vpName}`, card);
  await card.locator("#digest-timezone").fill("Europe/Warsaw");
  await card.getByRole("button", { name: "Save choices" }).click(); await sleep(1500);
  const saved = await np(); const saveMsg = await status();
  await page.reload({ waitUntil: "domcontentloaded" }); await ready();
  const afterReload = { email: await card.locator("label", { hasText: "Email digest" }).locator("input,button[role=switch],[role=checkbox]").first().evaluate((e) => e.checked ?? e.getAttribute("aria-checked")), cadence: await card.locator("#digest-cadence").inputValue(), tz: await card.locator("#digest-timezone").inputValue(), journey: await card.locator("label", { hasText: "Journey steps" }).locator("input").isChecked() };
  step("save-reload", { status: saveMsg, saved, formAfterReload: afterReload });

  // Quick actions with an unsaved draft (cadence → monthly).
  await card.locator("#digest-cadence").selectOption("monthly");
  await card.getByRole("button", { name: /Pause for 7 days/ }).click(); await sleep(1500);
  const pausedServer = await np();
  const pauseMsg = await status();
  const formCadence1 = await card.locator("#digest-cadence").inputValue();
  await page.reload({ waitUntil: "domcontentloaded" }); await ready();
  const pausedAfterReload = { button: await card.getByRole("button", { name: /Resume now/ }).count(), text: await card.getByText(/Paused until/).innerText().catch(() => null), cadence: await card.locator("#digest-cadence").inputValue() };
  step("pause-with-draft", { pauseMsg, server: pausedServer, formCadenceKeptDraft: formCadence1, pausedAfterReload, lastPutBody: puts.at(-1) });
  await card.locator("#digest-cadence").selectOption("monthly");
  await card.getByRole("button", { name: /Resume now/ }).click(); await sleep(1500);
  step("resume-with-draft", { msg: await status(), server: await np(), formCadence: await card.locator("#digest-cadence").inputValue() });
  await card.getByRole("button", { name: "Unsubscribe all" }).click(); await sleep(1500);
  const unsub = { msg: await status(), server: await np(), formCadence: await card.locator("#digest-cadence").inputValue(), unsubAriaDisabled: await card.getByRole("button", { name: "Unsubscribe all" }).getAttribute("aria-disabled") };
  await shot(page, `V09-unsubscribed-${vpName}`, card);
  step("unsubscribe-all", unsub);

  // Populated preview: an owned watch-next bookmark (no email is dispatched).
  const [r] = await q(`SELECT id, title FROM resources WHERE status='approved' ORDER BY id LIMIT 1`);
  await call("POST", `/api/bookmarks/${r.id}`, { jwt, body: {} });
  await q(`UPDATE user_bookmarks SET queue_status='watch-next' WHERE user_id=$1 AND resource_id=$2`, [A.bridgeId, r.id]);
  const prev = (await pageFetch(page, "/api/digests/preview")).json;
  await page.reload({ waitUntil: "domcontentloaded" }); await ready();
  await card.locator('section[aria-labelledby="digest-preview"] a').first().waitFor({ timeout: 15_000 }).catch(() => {});
  step("preview-populated", { apiItemCount: prev.itemCount, sections: prev.sections.map((s) => [s.title, s.items.length]), watchTitleShown: (await card.locator('section[aria-labelledby="digest-preview"]').innerText()).includes(r.title), emailJobsForUser: (await q(`SELECT count(*)::int n FROM digest_jobs WHERE user_id=$1`, [A.bridgeId]))[0].n });
  await shot(page, `V09-preview-populated-${vpName}`, card);

  // Learning-preferences reset.
  const cats = (await call("GET", "/api/categories")).json;
  const catName = (Array.isArray(cats) ? cats : cats.categories).find((c) => c.resourceCount > 0).name;
  let cur = (await pageFetch(page, "/api/user/preferences")).json;
  const put1 = await call("PUT", "/api/user/preferences", { jwt, body: { preferredCategories: [catName], skillLevel: "intermediate", learningGoals: ["learn-fundamentals"], preferredResourceTypes: ["video"], timeCommitment: "flexible", onboardingStatus: "completed", onboardingStep: 5, homeLayout: "curated", themeSystem: "swiss", themeAccent: "violet", expectedRevision: cur.revision } });
  if (put1.status !== 200) throw new Error("setup PUT " + put1.status + " " + put1.text.slice(0, 300));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="button-reset-learning-preferences"]').waitFor({ timeout: 30_000 });
  const staleRevision = put1.json.revision;
  await page.locator('[data-testid="button-reset-learning-preferences"]').click();
  await page.locator('[data-testid="button-confirm-reset-learning-preferences"]').click();
  await page.locator('[data-testid="learning-preferences-empty"]').waitFor({ timeout: 15_000 });
  const afterReset = (await pageFetch(page, "/api/user/preferences")).json; const resetToast = await toasts(page);
  const stale = await call("PUT", "/api/user/preferences", { jwt, body: { preferredCategories: [catName], skillLevel: "advanced", learningGoals: ["learn-fundamentals"], preferredResourceTypes: ["video"], timeCommitment: "flexible", onboardingStatus: "completed", onboardingStep: 5, expectedRevision: staleRevision } });
  const staleDel = await call("DELETE", "/api/user/preferences", { jwt, body: { expectedRevision: staleRevision } });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="learning-preferences-empty"]').waitFor({ timeout: 20_000 });
  await shot(page, `V09-reset-empty-${vpName}`, page.locator('[data-testid="card-learning-preferences"]'));
  await page.goto(`${BASE}/onboarding`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="button-onboarding-next"]').waitFor({ timeout: 30_000 });
  step("reset", { toast: resetToast, afterReset: { preferences: afterReset.preferences, homeLayout: afterReset.homeLayout, theme: afterReset.theme, revision: afterReset.revision }, stalePut: [stale.status, stale.json?.message], staleDelete: [staleDel.status, staleDel.json?.message], finalServer: (await pageFetch(page, "/api/user/preferences")).json?.preferences, onboardingStep: await page.getByText(/^Step \d of 5$/).first().innerText(), skillChecked: await page.locator('[data-testid="preferences-section-skill"] [role="radio"][data-state="checked"]').count(), paintedSystem: await page.evaluate(() => document.documentElement.dataset.ds || document.documentElement.getAttribute("data-system")) });
  out.pageErrors = page.__errors;
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close();
  await teardownAll();
  out.residue = await residue(); console.log("residue", JSON.stringify(out.residue));
  writeJson(`/tmp/v592out/V09-${vpName}.json`, out); process.exit(0);
}
