// B01 follow-up: publish → enroll → unpublish → re-edit description.
// Every non-admin user-facing read must stop exposing the journey's metadata.
import { BASE, PREFIX, q, pool, call, mintUser, token, deleteUser, log } from "./lib.mjs";

const out = [];
const rec = (label, data) => { out.push({ label, ...data }); log(label, JSON.stringify(data)); };
const approved = (await q(`SELECT id FROM resources WHERE status='approved' ORDER BY id LIMIT 1`))[0].id;
const [{ id: jid }] = await q(
  `INSERT INTO learning_journeys (title, description, category, status) VALUES ($1,$2,'Encoding & Codecs','published') RETURNING id`,
  [`${PREFIX}unpub_published_title`, `${PREFIX}unpub published description`],
);
await q(`INSERT INTO journey_steps (journey_id, step_number, resource_id, title, is_optional) VALUES ($1,1,$2,$3,false)`,
  [jid, approved, `${PREFIX}unpub_step`]);
const user = await mintUser("unpub");
try {
  const jwt = await token(user);
  await call("GET", "/api/auth/user", { jwt });
  const start = await call("POST", `/api/journeys/${jid}/start`, { jwt });
  const cl0 = await call("GET", "/api/user/continue-learning", { jwt });
  const uj0 = await call("GET", "/api/user/journeys", { jwt });
  const pr0 = await call("GET", "/api/user/progress", { jwt });
  rec("while published", {
    start: start.status,
    continueLearningHasTitle: cl0.text.includes(`${PREFIX}unpub_published_title`),
    userJourneysHasTitle: uj0.text.includes(`${PREFIX}unpub_published_title`),
    currentPath: pr0.json?.currentPath,
  });

  for (const status of ["draft", "archived"]) {
    const secret = `${PREFIX}unpub SECRET ${status} description`;
    const secretTitle = `${PREFIX}unpub_SECRET_${status}_title`;
    const put = await call("PUT", `/api/admin/journeys/${jid}`, { admin: true, body: { status, title: secretTitle, description: secret } });
    const reads = {
      detail: await call("GET", `/api/journeys/${jid}`, { jwt }),
      html: await call("GET", `/journey/${jid}`),
      continueLearning: await call("GET", "/api/user/continue-learning", { jwt }),
      userJourneys: await call("GET", "/api/user/journeys", { jwt }),
      progress: await call("GET", "/api/user/progress", { jwt }),
    };
    const leaks = Object.fromEntries(Object.entries(reads).map(([k, r]) => [k, {
      status: r.status, leaks: r.text.includes("SECRET"),
    }]));
    const cl = (reads.continueLearning.json?.activeJourneys ?? reads.continueLearning.json?.journeys ?? [])
      .concat(reads.continueLearning.json?.completedMilestones ?? [])
      .find((j) => j.journeyId === jid);
    const uj = (reads.userJourneys.json ?? []).find((p) => p.journeyId === jid);
    rec(`after unpublish → ${status}`, {
      adminPut: put.status, leaks,
      continueLearningItem: cl && { title: cl.title, isAvailable: cl.isAvailable, href: cl.href },
      userJourneysItem: uj && { journey: uj.journey, isAvailable: uj.isAvailable },
      currentPath: reads.progress.json?.currentPath ?? null,
    });
  }
} finally {
  await q(`DELETE FROM user_journey_progress WHERE journey_id=$1`, [jid]);
  await q(`DELETE FROM journey_steps WHERE journey_id=$1`, [jid]);
  await q(`DELETE FROM learning_journeys WHERE id=$1`, [jid]);
  await deleteUser(user);
  await new Promise((r) => setTimeout(r, 1500));
  await q(`DELETE FROM users WHERE email LIKE $1`, [`${PREFIX}unpub%`]);
  const residue = await q(`SELECT
    (SELECT count(*)::int FROM users WHERE email LIKE $1) users,
    (SELECT count(*)::int FROM learning_journeys WHERE title LIKE $1) journeys,
    (SELECT count(*)::int FROM journey_steps WHERE title LIKE $1) steps`, [`${PREFIX}%`]);
  rec("residue", residue[0]);
  await pool.end();
}
