// V11 (b) — real digest scheduler/service cycle on the scratch DB (awesome_scratch_592), served by a
// separate instance on :5161. Run with:  DATABASE_URL=<scratch> BASE_URL=http://127.0.0.1:5161 npx tsx v11-digest-scratch.mjs
// One real Gmail send to the QA user's @example.com address; malformed-recipient retries; dead-worker lease
// recovery; in-app read / read-all in the real Notifications UI. No mocks.
import { BASE, q, mintUser, ensureLocal, token, call, teardownAll, writeJson, sleep, PREFIX } from "./lib.mjs";
import { launch, newPage, signIn, shot, VPS } from "./browser-lib.mjs";

if (!/awesome_scratch_592/.test(process.env.DATABASE_URL ?? "") || !/:5161/.test(BASE)) {
  console.error("refusing: must target the scratch DB and the :5161 scratch instance"); process.exit(2);
}
const svc = await import("../../../../server/services/digestService.ts");
const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log(name, JSON.stringify(data).slice(0, 1600)); };
const browser = await launch();
let U;
const jobs = async () => q(`SELECT id, channel, status, attempt_count, max_attempts, policy_version, last_error_code, worker_id, (next_attempt_at > now()) AS backoff_pending FROM digest_jobs WHERE user_id=$1 ORDER BY id`, [U.bridgeId]);
const attempts = async () => q(`SELECT a.job_id, a.attempt_number, a.outcome, a.error_code, a.provider_message_id FROM digest_attempts a JOIN digest_jobs j ON j.id=a.job_id WHERE j.user_id=$1 ORDER BY a.id`, [U.bridgeId]);
try {
  const eligibleOthers = (await q(`SELECT count(*)::int c FROM notification_preferences WHERE email_digest_enabled OR in_app_enabled`))[0].c;
  U = await mintUser("v11digest"); await ensureLocal(U);
  const jwt = await token(U);
  // Owned inputs: one Watch-next bookmark and an active journey with an unfinished step.
  const [res] = await q(`SELECT id, title FROM resources WHERE status='approved' ORDER BY id LIMIT 1`);
  await q(`INSERT INTO user_bookmarks (user_id, resource_id, queue_status) VALUES ($1,$2,'watch-next')`, [U.bridgeId, res.id]);
  const [jr] = await q(`SELECT j.id FROM learning_journeys j WHERE j.status='published' AND EXISTS (SELECT 1 FROM journey_steps s WHERE s.journey_id=j.id) ORDER BY j.id LIMIT 1`);
  await q(`INSERT INTO user_journey_progress (user_id, journey_id, completed_steps) VALUES ($1,$2,'[]'::jsonb)`, [U.bridgeId, jr.id]);
  const put = await call("PUT", "/api/notification-preferences", { jwt, body: {
    emailDigestEnabled: true, inAppEnabled: true, includeNewResources: true, includeWatchNext: true,
    includeJourneyStep: true, cadence: "weekly", timezone: "UTC", pausedUntil: null } });
  const preview = await call("GET", "/api/digests/preview", { jwt });
  step("setup", { eligibleOtherUsersOnScratch: eligibleOthers, putStatus: put.status, previewStatus: preview.status,
    preview: preview.json && { itemCount: preview.json.itemCount, sections: preview.json.sections?.map((s) => [s.title, s.items.map((i) => i.title)]) } });

  // 1. Real due cycle: enqueue + dispatch both channels; the email goes through the Gmail connector.
  const c1 = await svc.runDigestCycle({ workerId: "v11-scratch-cycle1" });
  const tokens1 = await q(`SELECT count(*)::int c, min(expires_at - now()) AS ttl, bool_and(length(token_hash)=64) AS hashed FROM digest_unsubscribe_tokens WHERE user_id=$1`, [U.bridgeId]);
  step("cycle1", { result: c1, jobs: await jobs(), attempts: await attempts(), unsubscribeTokens: tokens1[0],
    prefs: (await q(`SELECT last_email_digest_at IS NOT NULL email_stamped, last_in_app_digest_at IS NOT NULL inapp_stamped FROM notification_preferences WHERE user_id=$1`, [U.bridgeId]))[0] });
  const providerId = (await attempts()).find((a) => a.provider_message_id)?.provider_message_id;
  // Can the connector read the delivered message back? (gmail.send scope is send-only.)
  if (providerId) {
    try {
      const { ReplitConnectors } = await import("@replit/connectors-sdk");
      const r = await new ReplitConnectors().proxy("google-mail", `/gmail/v1/users/me/messages/${providerId}?format=metadata&metadataHeaders=List-Unsubscribe&metadataHeaders=List-Unsubscribe-Post&metadataHeaders=Subject&metadataHeaders=To&metadataHeaders=Message-ID`, { method: "GET" });
      const body = await r.text();
      step("gmail-readback", { status: r.status, body: body.slice(0, 900) });
    } catch (e) { step("gmail-readback", { error: String(e).slice(0, 300) }); }
  }

  // 2. Same period again: nothing new is queued or sent.
  const c2 = await svc.runDigestCycle({ workerId: "v11-scratch-cycle2" });
  step("cycle2-same-period", { result: c2, jobCount: (await jobs()).length, sentAttempts: (await attempts()).filter((a) => a.outcome === "sent").length });

  // 3. In-app notifications in the real UI: mark one read, then mark all read.
  const { page } = await newPage(browser, VPS.desktop);
  await signIn(page, U, "/notifications");
  await page.goto(`${BASE}/notifications`, { waitUntil: "domcontentloaded" });
  await page.getByText(/unread/).first().waitFor({ timeout: 60_000 });
  const listBefore = await call("GET", "/api/notifications", { jwt: await token(U) });
  await shot(page, "V11b-notifications-unread-desktop");
  const markOne = page.waitForResponse((r) => /\/api\/notifications\/\d+\/read$/.test(r.url()));
  await page.getByRole("button", { name: "Mark read" }).first().click();
  const m1 = await markOne; await sleep(800);
  const afterOne = await call("GET", "/api/notifications", { jwt: await token(U) });
  const header1 = await page.locator(".account-notification-header").innerText().catch(() => null);
  const markAll = page.waitForResponse((r) => r.url().endsWith("/api/notifications/read-all"));
  await page.getByRole("button", { name: "Mark all read" }).click();
  const ma = await markAll; await sleep(800);
  const afterAll = await call("GET", "/api/notifications", { jwt: await token(U) });
  await shot(page, "V11b-notifications-all-read-desktop");
  step("in-app", { before: { unread: listBefore.json?.unreadCount, total: listBefore.json?.notifications?.length, titles: listBefore.json?.notifications?.map((n) => n.title) },
    markOne: m1.status(), headerAfterOne: header1, afterOne: afterOne.json?.unreadCount, markAll: [ma.status(), await ma.json().catch(() => null)],
    afterAll: afterAll.json?.unreadCount, headerAfterAll: await page.locator(".account-notification-header").innerText().catch(() => null),
    markAllButtonGone: !(await page.getByRole("button", { name: "Mark all read" }).isVisible().catch(() => false)), pageErrors: page.__errors });
  await page.close();

  // 4. Provider rejection: malformed recipient, new policy version (new idempotency key) → bounded retries.
  await q(`UPDATE users SET email='not an address@@' WHERE id=$1`, [U.bridgeId]);
  await q(`UPDATE notification_preferences SET policy_version=policy_version+1, last_email_digest_at=NULL WHERE user_id=$1`, [U.bridgeId]);
  const rejection = [];
  for (let i = 1; i <= 5; i++) {
    const c = await svc.runDigestCycle({ workerId: `v11-scratch-reject${i}` });
    const j = (await jobs()).filter((x) => x.channel === "email").at(-1);
    rejection.push({ cycle: i, queued: c.queued, processed: c.processed, job: j });
    if (j.status === "failed" || j.status === "sent") break;
    await q(`UPDATE digest_jobs SET next_attempt_at=now() WHERE id=$1 AND status='queued'`, [j.id]); // fast-forward the real backoff
  }
  const rejectedJob = rejection.at(-1).job;
  step("provider-rejection", { rejection, attempts: (await attempts()).filter((a) => a.job_id === rejectedJob.id) });
  const c3 = await svc.runDigestCycle({ workerId: "v11-scratch-after-exhaust" });
  step("after-exhaustion", { result: c3, jobsForPolicy: (await jobs()).filter((x) => x.policy_version === rejectedJob.policy_version && x.channel === "email").length });

  // 5. Dead worker: the state a crashed worker leaves mid-send (processing, expired lease, started attempt).
  await q(`UPDATE users SET email=$2 WHERE id=$1`, [U.bridgeId, U.email]);
  await q(`UPDATE notification_preferences SET policy_version=policy_version+1, last_email_digest_at=NULL WHERE user_id=$1`, [U.bridgeId]);
  const [pv] = await q(`SELECT policy_version FROM notification_preferences WHERE user_id=$1`, [U.bridgeId]);
  const key = `${U.bridgeId}:email:v${pv.policy_version}:dead-worker`;
  const [dj] = await q(`INSERT INTO digest_jobs (user_id, channel, period_key, policy_version, idempotency_key, status, scheduled_for, next_attempt_at, attempt_count, claimed_at, lease_expires_at, worker_id)
    VALUES ($1,'email','dead-worker',$2,$3,'processing', now()-interval '20 minutes', now()-interval '20 minutes', 1, now()-interval '20 minutes', now()-interval '5 minutes', 'v11-dead-worker') RETURNING id`, [U.bridgeId, pv.policy_version, key]);
  await q(`INSERT INTO digest_attempts (job_id, attempt_number, outcome, started_at) VALUES ($1,1,'started', now()-interval '20 minutes')`, [dj.id]);
  const sentBefore = (await attempts()).filter((a) => a.provider_message_id).length;
  const c4 = await svc.runDigestCycle({ workerId: "v11-scratch-recover" });
  step("lease-recovery", { result: c4, job: (await jobs()).find((x) => x.id === dj.id), attempt: (await attempts()).filter((a) => a.job_id === dj.id),
    newEmailJobsQueued: (await jobs()).filter((x) => x.channel === "email" && x.policy_version === pv.policy_version && x.id !== dj.id).length,
    providerSendsBefore: sentBefore, providerSendsAfter: (await attempts()).filter((a) => a.provider_message_id).length,
    emailStamped: (await q(`SELECT last_email_digest_at IS NOT NULL s FROM notification_preferences WHERE user_id=$1`, [U.bridgeId]))[0].s });
  const health = await call("GET", "/api/admin/digests/health", { admin: true });
  step("admin-health", { status: health.status, body: health.json });
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close();
  await teardownAll();
  const like = PREFIX.replace(/_/g, "\\_") + "%";
  out.residue = (await q(`SELECT (SELECT count(*) FROM users WHERE id LIKE $1)::int users,
    (SELECT count(*) FROM digest_jobs WHERE user_id LIKE $1)::int jobs,
    (SELECT count(*) FROM in_app_notifications WHERE user_id LIKE $1)::int notifications,
    (SELECT count(*) FROM digest_unsubscribe_tokens WHERE user_id LIKE $1)::int tokens,
    (SELECT count(*) FROM user_bookmarks WHERE user_id LIKE $1)::int bookmarks`, [like]))[0];
  console.log("residue", JSON.stringify(out.residue));
  writeJson("/tmp/v592out/v11-digest-scratch.json", out); process.exit(0);
}
