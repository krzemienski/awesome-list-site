// V11 (a) — owned single-use digest unsubscribe token on DEV, rendered and clicked in a real browser.
// GET must not write; the HTML confirmation form disables email only; queued email jobs are skipped while
// in-app stays queued; reuse and an expired token answer 410 with a Settings recovery link.
import crypto from "node:crypto";
import { BASE, q, mintUser, ensureLocal, token, call, teardownAll, writeJson, sleep, PREFIX } from "./lib.mjs";
import { launch, newPage, shot, VPS } from "./browser-lib.mjs";

const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log(name, JSON.stringify(data).slice(0, 1200)); };
const browser = await launch();
let U;
try {
  U = await mintUser("v11unsub"); await ensureLocal(U);
  const jwt = await token(U);
  const put = await call("PUT", "/api/notification-preferences", { jwt, body: {
    emailDigestEnabled: true, inAppEnabled: true, includeNewResources: true, includeWatchNext: true,
    includeJourneyStep: true, cadence: "weekly", timezone: "UTC", pausedUntil: null } });
  // Keep the hourly DEV scheduler from treating this QA user as due while the test runs.
  await q(`UPDATE notification_preferences SET last_email_digest_at=now(), last_in_app_digest_at=now() WHERE user_id=$1`, [U.bridgeId]);
  const mkToken = async (expiresSql) => {
    const raw = crypto.randomBytes(32).toString("base64url");
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    const [r] = await q(`INSERT INTO digest_unsubscribe_tokens (user_id, token_hash, expires_at) VALUES ($1,$2, now() + ${expiresSql}) RETURNING id`, [U.bridgeId, hash]);
    return { raw, id: r.id };
  };
  const live = await mkToken("interval '30 days'");
  const expired = await mkToken("interval '-1 minute'");
  const period = `${PREFIX}v11-${Date.now()}`;
  const jobs = {};
  for (const channel of ["email", "in_app"]) {
    const [j] = await q(`INSERT INTO digest_jobs (user_id, channel, period_key, idempotency_key, scheduled_for, next_attempt_at, policy_version)
      VALUES ($1,$2,$3,$4, now() + interval '1 day', now() + interval '1 day', 1) RETURNING id`, [U.bridgeId, channel, period, `${period}-${channel}`]);
    jobs[channel] = j.id;
  }
  const snap = async () => (await q(`SELECT p.email_digest_enabled email, p.in_app_enabled in_app, p.policy_version, p.email_unsubscribed_at, p.updated_at,
      (SELECT used_at FROM digest_unsubscribe_tokens WHERE id=$2) token_used_at,
      (SELECT status||'/'||coalesce(last_error_code,'-') FROM digest_jobs WHERE id=$3) email_job,
      (SELECT status||'/'||coalesce(last_error_code,'-') FROM digest_jobs WHERE id=$4) in_app_job
      FROM notification_preferences p WHERE p.user_id=$1`, [U.bridgeId, live.id, jobs.email, jobs.in_app]))[0];
  step("setup", { putStatus: put.status, put: put.json && { email: put.json.emailDigestEnabled, inApp: put.json.inAppEnabled }, tokenLen: live.raw.length, jobs, before: await snap() });

  // Signed-out browser, as when a reader clicks an email link.
  for (const vp of ["desktop", "390"]) {
    const { page } = await newPage(browser, VPS[vp]);
    const cspViolations = [];
    page.on("console", (m) => { if (/Content Security Policy|Refused to/.test(m.text())) cspViolations.push(m.text().slice(0, 200)); });
    const g1 = await page.goto(`${BASE}/unsubscribe/digest/${live.raw}`, { waitUntil: "load" });
    const g2 = await page.goto(`${BASE}/unsubscribe/digest/${live.raw}`, { waitUntil: "load" });
    const look = await page.evaluate(() => ({ h1: document.querySelector("h1")?.textContent, p: document.querySelector("main p:not(.eyebrow)")?.textContent, bg: getComputedStyle(document.body).backgroundColor, btnH: document.querySelector("button")?.getBoundingClientRect().height, robots: document.querySelector('meta[name=robots]')?.content }));
    await shot(page, `V11-confirm-${vp}`);
    step(`get-${vp}`, { status: [g1.status(), g2.status()], cacheControl: g1.headers()["cache-control"], look, cspViolations, afterTwoGets: await snap() });
    await page.close();
  }

  // Desktop: click the real form button.
  const { page } = await newPage(browser, VPS.desktop);
  await page.goto(`${BASE}/unsubscribe/digest/${live.raw}`, { waitUntil: "load" });
  const [resp] = await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.getByRole("button", { name: "Unsubscribe from email digests" }).click()]);
  const doneText = await page.locator("main").innerText();
  await shot(page, "V11-done-desktop");
  const after = await snap();
  const api = await call("GET", "/api/notification-preferences", { jwt: await token(U) });
  step("post-confirm", { status: resp.status(), method: resp.request().method(), text: doneText.replace(/\s+/g, " "), after, apiAfter: { email: api.json?.emailDigestEnabled, inApp: api.json?.inAppEnabled } });

  // Reuse the same link (back + resubmit).
  await page.goto(`${BASE}/unsubscribe/digest/${live.raw}`, { waitUntil: "load" });
  const [reuse] = await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.getByRole("button", { name: "Unsubscribe from email digests" }).click()]);
  const reuseText = await page.locator("main").innerText();
  await shot(page, "V11-reuse-410-desktop");
  const afterReuse = await snap();
  step("reuse", { status: reuse.status(), text: reuseText.replace(/\s+/g, " "), policyUnchanged: afterReuse.policy_version === after.policy_version });
  // Settings recovery link.
  await page.getByRole("link", { name: "Open Settings" }).click();
  await page.waitForLoadState("domcontentloaded"); await sleep(2500);
  step("recovery-link", { url: page.url(), heading: await page.locator("h1, h2").first().innerText().catch(() => null) });
  await shot(page, "V11-recovery-settings-desktop");

  // Expired token at 390.
  const { page: m } = await newPage(browser, VPS["390"]);
  await m.goto(`${BASE}/unsubscribe/digest/${expired.raw}`, { waitUntil: "load" });
  const [exp] = await Promise.all([m.waitForNavigation({ waitUntil: "load" }), m.getByRole("button", { name: "Unsubscribe from email digests" }).click()]);
  await shot(m, "V11-expired-410-390");
  step("expired", { status: exp.status(), text: (await m.locator("main").innerText()).replace(/\s+/g, " "), expiredTokenUsedAt: (await q(`SELECT used_at FROM digest_unsubscribe_tokens WHERE id=$1`, [expired.id]))[0].used_at });
  // Malformed token on GET.
  const bad = await call("GET", "/unsubscribe/digest/not-a-token");
  step("malformed", { status: bad.status, title: bad.text.match(/<h1>(.*?)<\/h1>/)?.[1] });
  // RFC 8058 one-click POST shape (what a mail client sends) on a fresh token.
  const oneClick = await mkToken("interval '30 days'");
  await q(`UPDATE notification_preferences SET email_digest_enabled=true WHERE user_id=$1`, [U.bridgeId]);
  const oc = await fetch(`${BASE}/unsubscribe/digest/${oneClick.raw}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "List-Unsubscribe=One-Click" });
  step("one-click-post", { status: oc.status, prefs: (await q(`SELECT email_digest_enabled email, in_app_enabled in_app FROM notification_preferences WHERE user_id=$1`, [U.bridgeId]))[0] });
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close();
  await teardownAll();
  const like = PREFIX.replace(/_/g, "\\_") + "%";
  out.residue = (await q(`SELECT (SELECT count(*) FROM users WHERE id LIKE $1)::int users,
    (SELECT count(*) FROM digest_jobs WHERE user_id LIKE $1 OR period_key LIKE $1)::int jobs,
    (SELECT count(*) FROM digest_unsubscribe_tokens WHERE user_id LIKE $1)::int tokens,
    (SELECT count(*) FROM notification_preferences WHERE user_id LIKE $1)::int prefs`, [like]))[0];
  console.log("residue", JSON.stringify(out.residue));
  writeJson("/tmp/v592out/v11-unsubscribe.json", out); process.exit(0);
}
