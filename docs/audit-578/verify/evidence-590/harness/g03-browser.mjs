// G03 browser proof: approve a QA discovery in /admin/researcher (single
// Approve button, then Approve All), then find the researcher-approval event in
// /admin/audit filtered to the created resource. Real Chromium.
//
//   PROOF_DATABASE_URL=<scratch db> BASE_URL=http://127.0.0.1:5190 node g03-browser.mjs <out.json> <shotsDir>
//
// Admin identity: the documented X-Admin-Audit-Key header, added ONLY to
// same-origin requests via route interception. Screenshots go to a /tmp dir
// (repo writes during a run make Vite reload the page) and are copied after.
//
// The UI's "Approve All" is unscoped (approves every pending discovery), so on
// the SCRATCH DB the non-QA pending discoveries are parked (status rejected +
// marker reason) for the duration of the run and restored in teardown.
import path from "node:path";
import { mkdirSync } from "node:fs";
import { check, finish, note, sql, sqlOne, sqlJson, BASE_URL } from "./lib.mjs";

const ROOT = "/home/runner/workspace";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(ROOT, ".cache/ms-playwright");
const { chromium } = await import(path.join(ROOT, "node_modules/@playwright/test/index.mjs"));

const out = process.argv[2];
const shots = process.argv[3] ?? "/tmp/g03-shots";
mkdirSync(shots, { recursive: true });
if (!/awesome_scratch_590/.test(process.env.PROOF_DATABASE_URL)) throw new Error("g03-browser parks pending discoveries: scratch DB only");

const P = "__qa_test_plan_590_g03_";
const PARK = "__qa_test_plan_590_parked";
const stamp = Date.now();
const url = (n) => `https://example.com/${P}${stamp}-${n}`;
const ADMIN = sqlOne(`select id, email from users where email = 'admin@example.com'`);

const parked = sqlJson(`update research_discoveries set status = 'rejected', rejection_reason = '${PARK}' where status = 'pending_review' returning id`).map((r) => r.id);
note("parked non-QA pending discoveries (scratch only)", { count: parked.length });

const jobA = sqlOne(`insert into research_jobs (status, prompt, approved_discoveries) values ('completed', '${P}${stamp} single', 0) returning id`).id;
const jobB = sqlOne(`insert into research_jobs (status, prompt, approved_discoveries) values ('completed', '${P}${stamp} bulk', 0) returning id`).id;
const mk = (job, n) => sqlOne(`insert into research_discoveries (job_id, title, url, description, suggested_category, suggested_subcategory, confidence, status)
  values (${job}, '${P}${stamp} ${n}', '${url(n)}', 'QA discovery for the task 590 researcher provenance browser proof.', 'Intro & Learning', 'Learning Resources', 90, 'pending_review') returning id`).id;
const dA = mk(jobA, "single");
const dB1 = mk(jobB, "bulk1");
const dB2 = mk(jobB, "bulk2");
note("fixtures", { jobA, jobB, dA, dB1, dB2 });

const prov = (n) => sqlOne(`select r.id, r.status, r.approved_at, r.approved_by, r.status_changed_at,
    (select json_agg(json_build_object('id', a.id, 'action', a.action, 'performed_by', a.performed_by, 'notes', a.notes)) from resource_audit_log a where a.original_resource_id = r.id) as audit
  from resources r where r.url = '${url(n)}'`);

let browser;
const errors = [];
try {
  browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const origin = new URL(BASE_URL).origin;
  await context.route((u) => u.origin === origin, (route) =>
    route.continue({ headers: { ...route.request().headers(), "x-admin-audit-key": process.env.ADMIN_PASSWORD } }));
  await context.addInitScript(() => { try { localStorage.setItem("analytics-consent", "denied"); } catch {} });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  const shot = async (name) => { const f = path.join(shots, `G03-${name}.png`); await page.screenshot({ path: f }); note("screenshot", f); };

  // 1. Single approve.
  await page.goto(`${BASE_URL}/admin/researcher`, { waitUntil: "domcontentloaded" });
  // Discoveries live inside the folded "Advanced research controls & discoveries" <details>.
  const disclosure = page.locator("summary", { hasText: "Advanced research controls" });
  await disclosure.waitFor({ timeout: 90000 });
  await disclosure.click();
  const reviewTab = page.getByRole("tab", { name: /Review Discoveries/ });
  await reviewTab.click();
  for (let i = 0; i < 20 && (await reviewTab.getAttribute("aria-selected")) !== "true"; i++) await page.waitForTimeout(250);
  check("Review Discoveries tab actually activated", (await reviewTab.getAttribute("aria-selected")) === "true");
  const rowA = page.getByTestId(`row-research-discovery-${dA}`);
  await rowA.waitFor({ timeout: 90000 });
  await rowA.scrollIntoViewIfNeeded();
  await shot("1-researcher-pending");
  const respA = page.waitForResponse((r) => r.url().endsWith(`/api/researcher/discoveries/${dA}/approve`) && r.request().method() === "POST");
  await rowA.getByRole("button", { name: /^Approve$/ }).click();
  const rA = await respA;
  await rowA.waitFor({ state: "detached", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  await shot("2-researcher-after-single-approve");
  const pA = prov("single");
  note("single approve SQL provenance", pA);
  check("UI Approve: POST 200", rA.status() === 200, rA.status());
  check("UI Approve: resource approved with approvedAt/statusChangedAt and approvedBy = acting admin",
    pA?.status === "approved" && !!pA.approved_at && !!pA.status_changed_at && pA.approved_by === ADMIN.id, pA);
  check("UI Approve: one researcher-approval audit row by the admin",
    pA?.audit?.length === 1 && pA.audit[0].action === "approved" && pA.audit[0].performed_by === ADMIN.id &&
    pA.audit[0].notes === `AI researcher approval: discovery #${dA} (research job #${jobA})`, pA?.audit);

  // 2. Approve All (the only pending discoveries are the two QA bulk ones).
  const allBtn = page.getByTestId("button-approve-all");
  await allBtn.scrollIntoViewIfNeeded();
  const label = ((await allBtn.textContent()) ?? "").trim();
  check("Approve All button counts only the 2 QA bulk discoveries", /\(2\)/.test(label), label);
  await allBtn.click();
  await page.getByTestId("button-confirm-approve-all").waitFor({ timeout: 10000 });
  await shot("3-approve-all-confirm");
  const respB = page.waitForResponse((r) => r.url().endsWith("/api/researcher/discoveries/approve-all") && r.request().method() === "POST");
  await page.getByTestId("button-confirm-approve-all").click();
  const rB = await respB;
  const bodyB = await rB.json().catch(() => ({}));
  await page.waitForTimeout(1200);
  await shot("4-researcher-after-approve-all");
  note("approve-all response", bodyB);
  check("UI Approve All: 200 with 2 approved", rB.status() === 200 && bodyB.approved === 2, { status: rB.status(), approved: bodyB.approved });
  for (const [n, d] of [["bulk1", dB1], ["bulk2", dB2]]) {
    const p = prov(n);
    note(`bulk ${n} SQL provenance`, p);
    check(`UI Approve All ${n}: approvedAt/approvedBy = admin + one researcher audit row`,
      p?.status === "approved" && !!p.approved_at && p.approved_by === ADMIN.id && p.audit?.length === 1 &&
      p.audit[0].performed_by === ADMIN.id && p.audit[0].notes === `AI researcher approval: discovery #${d} (research job #${jobB})`, p);
  }

  // 3. /admin/audit filtered to the single-approve resource.
  await page.goto(`${BASE_URL}/admin/audit`, { waitUntil: "domcontentloaded" });
  const tools = page.getByTestId("button-audit-tools");
  await tools.waitFor({ timeout: 60000 });
  await tools.click();
  await page.getByTestId("input-audit-resource-id").fill(String(pA.id));
  const respAudit = page.waitForResponse((r) => r.url().includes(`/api/admin/audit-logs`) && r.url().includes(`resourceId=${pA.id}`));
  await page.getByTestId("input-audit-resource-id").press("Enter");
  const ra = await respAudit;
  const auditBody = await ra.json().catch(() => ({}));
  const logId = pA.audit[0].id;
  const row = page.getByTestId(`row-audit-log-${logId}`);
  await row.waitFor({ timeout: 20000 });
  await page.waitForTimeout(500);
  await shot("5-audit-filtered");
  const rowText = (await row.innerText()).replace(/\s+/g, " ");
  // The audit UI masks actor emails by design (PII masking): a•••@example.com.
  const maskedAdmin = `${ADMIN.email[0]}•••@${ADMIN.email.split("@")[1]}`;
  const rowCount = await page.locator('[data-testid^="row-audit-log-"]').count();
  note("audit row text", { rowText, rowCount, apiLogs: auditBody?.logs?.length });
  check("/admin/audit filtered to the resource shows exactly one event: approved, by the admin (masked email)",
    rowCount === 1 && /approved/i.test(rowText) && rowText.includes(maskedAdmin), { rowText, rowCount, maskedAdmin });
  await page.getByTestId(`button-audit-detail-${logId}`).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ timeout: 10000 });
  await page.waitForTimeout(400);
  await shot("6-audit-detail");
  const dialogText = (await dialog.innerText()).replace(/\s+/g, " ");
  check("audit detail identifies the researcher approval (discovery + job)",
    dialogText.includes(`AI researcher approval: discovery #${dA} (research job #${jobA})`), dialogText.slice(0, 400));
  check("no page errors", errors.length === 0, errors);
} catch (e) {
  check("browser flow completed without exception", false, String(e?.stack ?? e).slice(0, 600));
} finally {
  await browser?.close();
  const rids = sqlOne(`select coalesce(json_agg(id), '[]'::json) as ids from resources where url like '%${P}${stamp}%'`).ids;
  sql(`delete from research_discoveries where id in (${dA}, ${dB1}, ${dB2})`);
  if (rids.length) {
    sql(`delete from resource_audit_log where original_resource_id in (${rids.join(",")})`);
    sql(`delete from resources where id in (${rids.join(",")})`);
  }
  sql(`delete from research_jobs where id in (${jobA}, ${jobB})`);
  if (parked.length) sql(`update research_discoveries set status = 'pending_review', rejection_reason = null where rejection_reason = '${PARK}'`);
  const residue = sqlOne(`select
    (select count(*) from resources where title like '${P}%' or url like '%${P}%')::int as resources,
    (select count(*) from research_discoveries where title like '${P}%')::int as discoveries,
    (select count(*) from research_jobs where prompt like '${P}%')::int as jobs,
    (select count(*) from research_discoveries where rejection_reason = '${PARK}')::int as still_parked,
    (select count(*) from research_discoveries where status = 'pending_review')::int as pending_restored`);
  note("residue", residue);
  check("residue is zero and parked discoveries restored",
    residue.resources === 0 && residue.discoveries === 0 && residue.jobs === 0 && residue.still_parked === 0 && residue.pending_restored === parked.length, residue);
  finish(out);
}
