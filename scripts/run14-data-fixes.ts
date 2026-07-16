// Run14 data fixes — BUG-021/039/040/041/043/045/046/047.
// Idempotent: every step checks current state before writing and re-running
// is a no-op. Journals every change to evidence/run14/data-fixes.json.
//
// Usage: npx tsx scripts/run14-data-fixes.ts
import { Pool } from "pg";
import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const journal: any = { startedAt: new Date().toISOString(), steps: {} };

function log(step: string, entry: any) {
  journal.steps[step] = journal.steps[step] || [];
  journal.steps[step].push(entry);
  console.log(`[${step}]`, JSON.stringify(entry).slice(0, 300));
}

// ---------------------------------------------------------------------------
// BUG-039: duplicate resources inside learning journeys.
// (a) exact dups: same (journey_id, resource_id) appears twice → keep min(id).
// (b) near-dup: journey 8 step 1 lists the same VCT tool twice under two
//     resource rows (185310 approved canonical + 185466 twin) → drop the step
//     row pointing at 185466.
async function fixJourneyDups() {
  const exact = await pool.query(`
    DELETE FROM journey_steps js
    USING journey_steps keep
    WHERE js.journey_id = keep.journey_id
      AND js.resource_id = keep.resource_id
      AND js.id > keep.id
    RETURNING js.id, js.journey_id, js.step_number, js.resource_id`);
  for (const r of exact.rows) log("BUG-039", { deletedExactDup: r });
  if (exact.rowCount === 0) log("BUG-039", { exactDups: "none (already clean)" });

  const vct = await pool.query(
    `DELETE FROM journey_steps WHERE journey_id = 8 AND step_number = 1 AND resource_id = 185466
     RETURNING id, journey_id, step_number, resource_id`,
  );
  if (vct.rowCount) log("BUG-039", { deletedVctNearDup: vct.rows[0] });
  else log("BUG-039", { vctNearDup: "none (already clean)" });
}

// ---------------------------------------------------------------------------
// BUG-021: resource 186449 mislabels the DASHSchema XSD repo as a Python lib.
async function fixDashSchema() {
  const id = 186449;
  const cur = (await pool.query(`SELECT title, description, metadata FROM resources WHERE id=$1`, [id])).rows[0];
  if (!cur) return log("BUG-021", { skip: "row missing" });
  const title = "MPEG-DASH MPD XML Schema (DASHSchema)";
  const description =
    "Official XML Schema (XSD) definitions and example MPD files for the MPEG-DASH Media Presentation Description, maintained by MPEG's DASH working group for validating standards-compliant manifests.";
  if (cur.title === title && cur.description === description) {
    return log("BUG-021", { skip: "already fixed" });
  }
  const meta = cur.metadata || {};
  meta.tags = ["mpd", "xml", "xsd", "schema", "validation", "manifest", "mpeg-dash"];
  await pool.query(
    `UPDATE resources SET title=$2, description=$3, metadata=$4, updated_at=NOW() WHERE id=$1`,
    [id, title, description, JSON.stringify(meta)],
  );
  log("BUG-021", { id, before: { title: cur.title, description: cur.description }, after: { title, description, tags: meta.tags } });
}

// ---------------------------------------------------------------------------
// BUG-045: 186299 titled "IETF RFC8216" actually links the rfc8216bis draft.
async function fixRfc8216bis() {
  const id = 186299;
  const cur = (await pool.query(`SELECT title FROM resources WHERE id=$1`, [id])).rows[0];
  if (!cur) return log("BUG-045", { skip: "row missing" });
  const title = "Apple HLS - IETF rfc8216bis (HTTP Live Streaming 2nd Edition draft)";
  if (cur.title === title) return log("BUG-045", { skip: "already fixed" });
  await pool.query(`UPDATE resources SET title=$2, updated_at=NOW() WHERE id=$1`, [id, title]);
  log("BUG-045", { id, before: cur.title, after: title });
}

// ---------------------------------------------------------------------------
// BUG-046: 185706 description embeds raw " - rokudev/videoplayer-channel".
async function fixRokuSlug() {
  const id = 185706;
  const cur = (await pool.query(`SELECT description FROM resources WHERE id=$1`, [id])).rows[0];
  if (!cur) return log("BUG-046", { skip: "row missing" });
  const cleaned = cur.description.replace(/\s*-\s*rokudev\/videoplayer-channel\s*$/, "").trim();
  if (cleaned === cur.description) return log("BUG-046", { skip: "already clean" });
  await pool.query(`UPDATE resources SET description=$2, updated_at=NOW() WHERE id=$1`, [id, cleaned]);
  log("BUG-046", { id, before: cur.description, after: cleaned });
}

// ---------------------------------------------------------------------------
// BUG-047: 186101 description hard-truncated mid-word ("...management tas").
async function fixTruncatedDesc() {
  const id = 186101;
  const cur = (await pool.query(`SELECT description FROM resources WHERE id=$1`, [id])).rows[0];
  if (!cur) return log("BUG-047", { skip: "row missing" });
  if (!/tas(\.{3})?$/.test(cur.description.trim())) return log("BUG-047", { skip: "already fixed", current: cur.description.slice(-60) });
  const fixed = cur.description.trim().replace(/tas(\.{3})?$/, "tasks.");
  await pool.query(`UPDATE resources SET description=$2, updated_at=NOW() WHERE id=$1`, [id, fixed]);
  log("BUG-047", { id, beforeTail: cur.description.slice(-60), afterTail: fixed.slice(-60) });
}

// ---------------------------------------------------------------------------
// BUG-041: raw emoji shortcodes / markdown artifacts in stored descriptions.
// Deterministic cleanup: strip :shortcode: tokens, leading "** ", trailing
// " - owner/repo" import suffixes. 187905 (MediaMolder) gets an authored
// replacement for its 946-char raw bullet list.
const SHORTCODE_IDS = [185789, 185599, 185612, 185850, 186204, 186118, 185845, 185663, 185719];
async function fixShortcodes() {
  for (const id of SHORTCODE_IDS) {
    const cur = (await pool.query(`SELECT description FROM resources WHERE id=$1`, [id])).rows[0];
    if (!cur) { log("BUG-041", { id, skip: "row missing" }); continue; }
    let d = cur.description as string;
    d = d.replace(/^\*\*\s*/, "");                       // leading "** "
    d = d.replace(/:[a-z0-9_+]+:\s*/gi, "");             // :zap: etc.
    d = d.replace(/\s*-\s*[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\s*$/, ""); // " - owner/repo"
    d = d.trim();
    if (d.length > 0 && !/[.!?]$/.test(d)) d += ".";
    if (d === cur.description) { log("BUG-041", { id, skip: "already clean" }); continue; }
    await pool.query(`UPDATE resources SET description=$2, updated_at=NOW() WHERE id=$1`, [id, d]);
    log("BUG-041", { id, before: cur.description, after: d });
  }
  // MediaMolder 187905: raw 15-item bullet dump → authored summary.
  const mm = 187905;
  const cur = (await pool.query(`SELECT description FROM resources WHERE id=$1`, [mm])).rows[0];
  if (cur && cur.description.includes("* ")) {
    const authored =
      "A modern re-imagining of FFmpeg's interface and orchestration layers for the AI era, pairing the proven FFmpeg engine with a cleaner command surface, job orchestration, and automation-friendly workflows for transcoding at scale.";
    await pool.query(`UPDATE resources SET description=$2, updated_at=NOW() WHERE id=$1`, [mm, authored]);
    log("BUG-041", { id: mm, before: `${cur.description.slice(0, 120)}… (${cur.description.length} chars)`, after: authored });
  } else {
    log("BUG-041", { id: mm, skip: cur ? "already authored" : "row missing" });
  }
}

// ---------------------------------------------------------------------------
// BUG-043: 185391 "Ad Insertion Sample" Intel article soft-404s to a generic
// Intel overview page. The same project has a live approved GitHub twin
// (186121, OpenVisualCloud/Ad-Insertion-Sample), so reject the dead article
// rather than keeping a soft-404 outbound link. 0 journey refs (verified).
async function rejectDeadIntelLink() {
  const id = 185391;
  const cur = (await pool.query(`SELECT status, url, title FROM resources WHERE id=$1`, [id])).rows[0];
  if (!cur) return log("BUG-043", { skip: "row missing" });
  if (cur.status === "rejected") return log("BUG-043", { skip: "already rejected" });
  await pool.query(`UPDATE resources SET status='rejected', updated_at=NOW() WHERE id=$1`, [id]);
  log("BUG-043", { id, title: cur.title, url: cur.url, before: cur.status, after: "rejected", keptTwin: 186121 });
}

// ---------------------------------------------------------------------------
// BUG-040: 65 rows carry the import fallback "A tool or resource for <slug>."
// Generate authored 1–2 sentence descriptions with Claude from title/url/
// taxonomy. Validates output (non-empty, no slug-template text, length cap)
// and only overwrites rows still carrying the placeholder (idempotent).
async function fixPlaceholderDescriptions() {
  const { rows } = await pool.query(
    `SELECT id, title, url, category, subcategory, sub_subcategory
     FROM resources
     WHERE description ~ '^A tool or resource for [a-z0-9-]+\\.$'
     ORDER BY id`,
  );
  if (rows.length === 0) return log("BUG-040", { skip: "no placeholder rows left" });
  log("BUG-040", { placeholderRows: rows.length });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const BATCH = 12;
  let fixed = 0;
  const failures: number[] = [];

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const listing = batch
      .map(
        (r: any) =>
          `- id ${r.id}: title="${r.title}" url=${r.url} taxonomy=${[r.category, r.subcategory, r.sub_subcategory].filter(Boolean).join(" > ")}`,
      )
      .join("\n");
    const prompt = `You are writing catalog descriptions for a curated video-development resource directory.
For each resource below, write ONE factual description of 1-2 sentences (max 240 characters) describing what the resource is and what it is used for, inferred from its title, URL, and taxonomy. Plain text only — no markdown, no emoji, no marketing superlatives, no "awesome". Never mention that information was inferred.

Resources:
${listing}

Reply with ONLY a JSON array: [{"id": <number>, "description": "<text>"}, ...] — one entry per resource, same ids.`;

    try {
      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      });
      const text = msg.content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("");
      // LLM JSON hygiene: slice the outermost brackets before parsing.
      const start = text.indexOf("[");
      const end = text.lastIndexOf("]");
      const parsed = JSON.parse(text.slice(start, end + 1));
      for (const item of parsed) {
        const row = batch.find((r: any) => r.id === item.id);
        const desc = String(item.description || "").trim();
        if (
          !row ||
          desc.length < 20 ||
          desc.length > 400 ||
          /a tool or resource for/i.test(desc) ||
          /[*_#`]|:[a-z_]+:/.test(desc)
        ) {
          failures.push(item.id);
          log("BUG-040", { id: item.id, rejected: desc.slice(0, 80) });
          continue;
        }
        const upd = await pool.query(
          `UPDATE resources SET description=$2, updated_at=NOW()
           WHERE id=$1 AND description ~ '^A tool or resource for [a-z0-9-]+\\.$'`,
          [item.id, desc],
        );
        if (upd.rowCount) {
          fixed++;
          log("BUG-040", { id: item.id, title: row.title, after: desc });
        }
      }
    } catch (e: any) {
      for (const r of batch) failures.push(r.id);
      log("BUG-040", { batchStart: batch[0].id, error: e?.message?.slice(0, 200) });
    }
  }
  log("BUG-040", { fixed, failed: failures });
}

async function main() {
  await fixJourneyDups();
  await fixDashSchema();
  await fixRfc8216bis();
  await fixRokuSlug();
  await fixTruncatedDesc();
  await fixShortcodes();
  await rejectDeadIntelLink();
  await fixPlaceholderDescriptions();

  // Post-state assertions for the journal.
  const post = await pool.query(`SELECT
    (SELECT count(*) FROM (SELECT journey_id, resource_id FROM journey_steps GROUP BY journey_id, resource_id HAVING count(*) > 1) d) AS journey_dups,
    (SELECT count(*) FROM resources WHERE description ~ '^A tool or resource for [a-z0-9-]+\\.$') AS placeholders_left,
    (SELECT count(*) FROM resources WHERE status='approved' AND description ~ ':[a-z_]+:') AS shortcodes_left,
    (SELECT status FROM resources WHERE id=185391) AS intel_status`);
  journal.postState = post.rows[0];
  journal.finishedAt = new Date().toISOString();
  fs.mkdirSync("evidence/run14", { recursive: true });
  fs.writeFileSync("evidence/run14/data-fixes.json", JSON.stringify(journal, null, 2));
  console.log("POST-STATE:", JSON.stringify(post.rows[0]));
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
