// Run15 data fixes — BUG-009 / BUG-011(data) / BUG-046.
// Idempotent: every step checks current state before writing; re-running is a
// no-op. Journals every change to evidence/run15/data-fixes.json.
//
// Usage (dev):  npx tsx scripts/run15-data-fixes.ts
// Usage (prod): DATABASE_URL=<prod url> npx tsx scripts/run15-data-fixes.ts
import { Pool } from "pg";
import fs from "fs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const journal: any = { startedAt: new Date().toISOString(), steps: {} };

function log(step: string, entry: any) {
  journal.steps[step] = journal.steps[step] || [];
  journal.steps[step].push(entry);
  console.log(`[${step}]`, JSON.stringify(entry).slice(0, 300));
}

// ---------------------------------------------------------------------------
// BUG-009: descriptions/titles stored with literal HTML entities ("&lt;" shown
// to users instead of "<"). Decode exactly ONE level. `&amp;` is decoded LAST
// so "&amp;lt;" correctly becomes "&lt;" (one level), not "<" (two levels).
const ENTITY_RE = /&(lt|gt|quot|#39|#x27|amp);/;
function decodeOnce(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&");
}

async function fixDoubleEscapedEntities() {
  const rows = await pool.query(
    `SELECT id, title, description FROM resources
     WHERE description ~ '&(lt|gt|quot|#39|#x27|amp);'
        OR title ~ '&(lt|gt|quot|#39|#x27|amp);'
     ORDER BY id`,
  );
  if (rows.rowCount === 0) {
    return log("BUG-009", { skip: "no entity-escaped rows (already clean)" });
  }
  for (const r of rows.rows) {
    const newTitle = ENTITY_RE.test(r.title) ? decodeOnce(r.title) : r.title;
    const newDesc = ENTITY_RE.test(r.description)
      ? decodeOnce(r.description)
      : r.description;
    if (newTitle === r.title && newDesc === r.description) continue;
    log("BUG-009", {
      id: r.id,
      before: { title: r.title, description: r.description },
      after: { title: newTitle, description: newDesc },
    });
    await pool.query(
      `UPDATE resources SET title=$2, description=$3, updated_at=NOW() WHERE id=$1`,
      [r.id, newTitle, newDesc],
    );
  }
}

// ---------------------------------------------------------------------------
// BUG-011 (data half): github_sync_queue rows wedged in a non-terminal status
// with no worker attached. The code half (periodic watchdog sweep) ships in
// this run; this clears rows that pre-date it. Only rows older than 1 hour
// are touched so an actively-processing job is never clobbered.
async function failStuckSyncJobs() {
  const stuck = await pool.query(
    `UPDATE github_sync_queue
     SET status='failed',
         processed_at=NOW(),
         error_message=COALESCE(error_message,'') ||
           CASE WHEN COALESCE(error_message,'')='' THEN '' ELSE ' | ' END ||
           'Marked failed by run15 data fix: job exceeded 1h without completing (stuck worker)'
     WHERE status NOT IN ('completed','failed')
       AND created_at < NOW() - INTERVAL '1 hour'
     RETURNING id, status, created_at, action`,
  );
  if (stuck.rowCount === 0) return log("BUG-011", { skip: "no stuck sync jobs" });
  for (const r of stuck.rows) log("BUG-011", { failedStuckJob: r });
}

// ---------------------------------------------------------------------------
// BUG-046: two sub_subcategories both named "Podcasts & Webinars".
//   id 3651 under "Events & Conferences" (Community & Events) — KEEP name.
//   id 3702 under "Webinars & Conference Talks" (Intro & Learning) — the
//   parent already says "Webinars", so this one becomes "Podcasts".
// resources.sub_subcategory stores the NAME, so the one resource living under
// the renamed node is repointed in the same transaction.
async function renameDupPodcastNode() {
  const dupes = await pool.query(
    `SELECT ss.id, ss.name, ss.slug, sc.name AS parent_sub, c.name AS parent_cat
     FROM sub_subcategories ss
     JOIN subcategories sc ON sc.id = ss.subcategory_id
     JOIN categories c ON c.id = sc.category_id
     WHERE ss.name = 'Podcasts & Webinars'`,
  );
  const target = dupes.rows.find(
    (r) => r.parent_sub === "Webinars & Conference Talks",
  );
  if (!target) {
    return log("BUG-046", {
      skip: "no 'Podcasts & Webinars' under 'Webinars & Conference Talks' (already renamed?)",
      currentDupes: dupes.rows,
    });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const slugTaken = await client.query(
      `SELECT 1 FROM sub_subcategories WHERE slug='podcasts' AND id <> $1`,
      [target.id],
    );
    const newSlug = slugTaken.rowCount ? `podcasts-sc-${target.id}` : "podcasts";
    await client.query(
      `UPDATE sub_subcategories SET name='Podcasts', slug=$2 WHERE id=$1`,
      [target.id, newSlug],
    );
    const moved = await client.query(
      `UPDATE resources SET sub_subcategory='Podcasts', updated_at=NOW()
       WHERE sub_subcategory='Podcasts & Webinars'
         AND subcategory=$1 AND category=$2
       RETURNING id, title`,
      [target.parent_sub, target.parent_cat],
    );
    await client.query("COMMIT");
    log("BUG-046", {
      renamedNode: { id: target.id, from: target.name, to: "Podcasts", slug: newSlug },
      repointedResources: moved.rows,
    });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function main() {
  await fixDoubleEscapedEntities();
  await failStuckSyncJobs();
  await renameDupPodcastNode();
  journal.finishedAt = new Date().toISOString();
  fs.mkdirSync("evidence/run15", { recursive: true });
  const out = `evidence/run15/data-fixes${process.env.JOURNAL_SUFFIX || ""}.json`;
  fs.writeFileSync(out, JSON.stringify(journal, null, 2));
  console.log(`\nJournal written to ${out}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
