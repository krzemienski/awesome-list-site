// B02 (desktop + 390px) and H08 browser proofs — anonymous visitor.
import fs from "node:fs";
import { BASE, PREFIX, q, pool } from "./lib.mjs";
import { launch, newPage } from "./browser-lib.mjs";

const shots = "docs/audit-578/verify/screenshots";
fs.mkdirSync(shots, { recursive: true });
const out = {};
const browser = await launch();
const created = [];
try {
  const rejected = await q(`SELECT r.id, r.title, r.url FROM journey_steps js JOIN resources r ON r.id=js.resource_id WHERE r.status<>'approved'`);
  for (const vp of [{ name: "desktop", width: 1366, height: 900 }, { name: "390", width: 390, height: 844, mobile: true }]) {
    for (const [jid, step] of [[9, 4], [6, 6]]) {
      const { page, context } = await newPage(browser, vp);
      await page.goto(`${BASE}/journey/${jid}`, { waitUntil: "networkidle" });
      const card = page.locator(`[data-testid="card-step-${step}"]`);
      await card.waitFor({ timeout: 30_000 });
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const file = `${shots}/B02-journey${jid}-step${step}-${vp.name}.png`;
      await card.screenshot({ path: file });
      const html = await page.content();
      const cardText = await card.innerText();
      const links = await card.locator('a[data-testid^="link-resource-"]').evaluateAll((as) => as.map((a) => a.getAttribute("href")));
      out[`journey${jid}-${vp.name}`] = {
        screenshot: file,
        rejectedLeakInDom: rejected.filter((r) => html.includes(r.title) || html.includes(r.url)).map((r) => r.id),
        cardText: cardText.replace(/\s+/g, " ").slice(0, 600),
        links,
        stepCards: await page.locator('[data-testid^="card-step-"]').count(),
      };
      if (vp.name === "desktop" && links[0]?.startsWith("/resource/")) {
        await page.locator(`a[href="${links[0]}"]`).first().click();
        await page.waitForURL(`**${links[0]}`, { timeout: 15_000 });
        await page.waitForLoadState("networkidle");
        out[`journey${jid}-${vp.name}`].internalLinkFollowed = { url: page.url(), h1: await page.locator("h1").first().innerText().catch(() => null) };
      }
      await context.close();
    }
  }

  // H08: missing / draft journey pages report dead-link telemetry.
  const [d] = await q(`INSERT INTO learning_journeys (title, description, category, status) VALUES ($1,'PRIVATE','Encoding & Codecs','draft') RETURNING id`, [`${PREFIX}h08_draft`]);
  created.push(d.id);
  for (const vp of [{ name: "desktop", width: 1366, height: 900 }, { name: "390", width: 390, height: 844, mobile: true }]) {
    for (const path of ["/journey/2147483000", `/journey/${d.id}`, "/journey/not-a-number", "/journey/7"]) {
      const { page, context } = await newPage(browser, vp);
      const logs = [];
      page.on("console", (m) => { if (m.text().includes("route-monitor")) logs.push(m.text()); });
      const resp = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      const slug = path.replace(/[^a-z0-9]+/gi, "_");
      const file = `${shots}/H08${slug}-${vp.name}.png`;
      await page.screenshot({ path: file });
      out[`H08 ${path} ${vp.name}`] = {
        httpStatus: resp?.status(),
        telemetry: logs,
        h1: await page.locator("h1").first().innerText().catch(() => null),
        privateLeak: (await page.content()).includes("PRIVATE") || (await page.content()).includes(`${PREFIX}h08`),
        screenshot: file,
      };
      await context.close();
    }
  }
} catch (e) {
  out.error = String(e?.stack ?? e);
  console.error(e);
} finally {
  if (created.length) await q(`DELETE FROM learning_journeys WHERE id = ANY($1)`, [created]);
  await browser.close();
  fs.writeFileSync(".cache/b581/out/browser-public.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await pool.end();
}
