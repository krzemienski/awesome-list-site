// V03 — collections: create/rename/reorder/assign/publish/copy via real UI, anonymous
// share view at 1440 + 390 (no private fields), unpublish → 404 recovery, republish, delete keeps bookmarks.
import { BASE, q, mintUser, call, token, ensureLocal, teardownAll, residue, writeJson, sleep, PREFIX } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, VPS } from "./browser-lib.mjs";

const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log(name, JSON.stringify(data).slice(0, 1500)); };
const R = (await q(`SELECT id, title FROM resources WHERE status='approved' ORDER BY id LIMIT 2`));
const browser = await launch();
try {
  const A = await mintUser("v03a");
  const local = await ensureLocal(A);
  const jA = await token(A);
  for (const r of R) {
    await call("POST", `/api/bookmarks/${r.id}`, { jwt: jA, body: { notes: `${PREFIX}secret note ${r.id}` } });
    await call("PATCH", `/api/bookmarks/${r.id}/state`, { jwt: jA, body: { personalTags: ["qa592private"] } });
  }
  const { context, page } = await newPage(browser, VPS.desktop);
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  await signIn(page, A, "/bookmarks");
  await page.goto(`${BASE}/bookmarks`, { waitUntil: "domcontentloaded" });
  const create = async (name) => {
    await page.getByRole("button", { name: "New collection" }).click();
    await page.locator("#collection-name").fill(name);
    await page.getByRole("button", { name: "Create collection" }).click();
    await page.getByText("Collection created").first().waitFor({ timeout: 15_000 });
    await sleep(600);
  };
  const n1 = `${PREFIX}v03 alpha`, n2 = `${PREFIX}v03 beta`, n1r = `${PREFIX}v03 alpha renamed`;
  await create(n1); await create(n2);
  // Rename the selected collection (beta is selected after create) → select alpha first.
  await page.getByRole("button", { name: new RegExp(`^${n1}`) }).first().click();
  await page.getByRole("button", { name: "Rename" }).click();
  await page.locator("#collection-name").fill(n1r);
  await page.getByRole("button", { name: "Save name" }).click();
  await page.getByText("Collection renamed").first().waitFor({ timeout: 15_000 });
  // Reorder: move beta up.
  await page.getByRole("button", { name: `Move ${n2} up` }).click();
  await page.getByText("Collection order updated").first().waitFor({ timeout: 15_000 });
  const order = await q(`SELECT name, position FROM bookmark_collections WHERE user_id=$1 ORDER BY position`, [local.id]).catch(async () => q(`SELECT name FROM bookmark_collections WHERE user_id=$1 ORDER BY id`, [local.id]));
  step("create-rename-reorder", { order });
  // Assign both saved resources to alpha-renamed via the bulk Move control (from "All saved").
  await page.goto(`${BASE}/bookmarks`, { waitUntil: "domcontentloaded" });
  for (const r of R) await page.getByLabel(`Select ${r.title}`).first().check();
  await page.getByLabel("Move to collection").click();
  await page.getByRole("option", { name: n1r }).click();
  await page.getByRole("button", { name: "Move", exact: true }).click();
  await page.getByText("Bookmarks moved").first().waitFor({ timeout: 15_000 });
  const [col] = await q(`SELECT id FROM bookmark_collections WHERE user_id=$1 AND name=$2`, [local.id, n1r]);
  step("assign", { items: await q(`SELECT resource_id FROM bookmark_collection_items WHERE collection_id=$1 ORDER BY resource_id`, [col.id]) });
  // Publish + copy.
  await page.getByRole("button", { name: new RegExp(`^${n1r}`) }).first().click();
  await page.getByRole("button", { name: "Publish link" }).click();
  await page.getByText("Read-only sharing enabled").first().waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Copy link" }).click();
  await page.getByText("Public collection link copied").first().waitFor({ timeout: 10_000 });
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  await shot(page, "V03-published-owner-desktop");
  const shareId = copied.split("/collection/")[1];
  step("publish-copy", { copied, shareId, toast: await toasts(page) });

  // Anonymous views.
  const api = await call("GET", `/api/public/collections/${shareId}`);
  const body = JSON.stringify(api.json);
  step("anon-api", { status: api.status, keys: Object.keys(api.json ?? {}), resourceKeys: Object.keys(api.json?.resources?.[0] ?? {}), leaks: { userId: body.includes(local.id), email: body.includes(A.email), notes: body.includes("secret note"), personalTags: body.includes("qa592private") } });
  const guests = {};
  for (const vpName of ["desktop", "390"]) {
    const g = await newPage(browser, VPS[vpName]);
    await g.page.goto(`${BASE}/collection/${shareId}`, { waitUntil: "domcontentloaded" });
    await g.page.getByText(n1r).first().waitFor({ timeout: 30_000 });
    await sleep(1200);
    const html = await g.page.content();
    guests[vpName] = g;
    step(`anon-render-${vpName}`, { titles: await Promise.all(R.map((r) => g.page.getByText(r.title).first().isVisible())), leaks: { userId: html.includes(local.id), email: html.includes(A.email), notes: html.includes("secret note"), personalTags: html.includes("qa592private") }, hOverflow: await g.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth) });
    await shot(g.page, `V03-anon-${vpName}`);
  }
  // Unpublish while the guest tab stays open, then reload it.
  await page.getByRole("button", { name: "Unpublish" }).click();
  await page.getByText("Public access revoked").first().waitFor({ timeout: 15_000 });
  await guests.desktop.page.reload({ waitUntil: "domcontentloaded" });
  await guests.desktop.page.getByText("Collection not found").first().waitFor({ timeout: 30_000 });
  await shot(guests.desktop.page, "V03-anon-after-unpublish-desktop");
  step("unpublish", { api: (await call("GET", `/api/public/collections/${shareId}`)).status, rendered: "Collection not found" });
  // Republish: link behaviour.
  await page.getByRole("button", { name: "Publish link" }).click();
  await page.getByText("Read-only sharing enabled").first().waitFor({ timeout: 15_000 });
  const [after] = await q(`SELECT share_id FROM bookmark_collections WHERE id=$1`, [col.id]);
  const oldLink = (await call("GET", `/api/public/collections/${shareId}`)).status;
  const newLink = (await call("GET", `/api/public/collections/${after.share_id}`)).status;
  step("republish", { oldShareId: shareId, newShareId: after.share_id, oldLinkStatus: oldLink, newLinkStatus: newLink });
  // Delete collection via the confirmation dialog; bookmarks + notes survive.
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete collection" }).click();
  await page.getByText(/Collection deleted/i).first().waitFor({ timeout: 15_000 }).catch(() => {});
  await sleep(1000);
  step("delete", { toast: await toasts(page), collectionRows: (await q(`SELECT count(*)::int c FROM bookmark_collections WHERE id=$1`, [col.id]))[0].c, bookmarks: await q(`SELECT resource_id, notes FROM user_bookmarks WHERE user_id=$1 ORDER BY resource_id`, [local.id]), shareAfterDelete: (await call("GET", `/api/public/collections/${after.share_id}`)).status });
  out.pageErrors = [page.__errors, guests.desktop.page.__errors, guests["390"].page.__errors].flat();
  // Cleanup remaining beta collection.
  for (const c of await q(`SELECT id FROM bookmark_collections WHERE user_id=$1`, [local.id])) await call("DELETE", `/api/collections/${c.id}`, { jwt: await token(A) });
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close(); await teardownAll();
  out.residue = await residue(); console.log("residue", JSON.stringify(out.residue));
  writeJson("/tmp/v592out/V03.json", out); process.exit(0);
}
