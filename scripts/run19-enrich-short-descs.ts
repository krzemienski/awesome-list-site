/**
 * Run19 BUG-037: enrich approved resources whose descriptions are shorter
 * than 30 characters with a real 1–2 sentence description via Claude.
 *
 * - Resumable: each run re-queries rows still under 30 chars, so re-running
 *   after a timeout simply continues where it left off.
 * - Every generated description is appended to
 *   artifacts/remediation-2026-07/BUG-037/descriptions.json so the prod
 *   journal (scripts/run19-data-fixes-prod.ts) can replay the SAME text via
 *   the live admin API without re-calling Claude.
 */
import Anthropic from "@anthropic-ai/sdk";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

const ARTIFACT_DIR = "artifacts/remediation-2026-07/BUG-037";
const ARTIFACT = path.join(ARTIFACT_DIR, "descriptions.json");
const BATCH = 15;
const MAX_BATCHES_PER_RUN = Number(process.env.MAX_BATCHES ?? 3);

function makeClient(): Anthropic {
  const managedKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  const managedBase = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  if (managedKey && managedBase) {
    return new Anthropic({ apiKey: managedKey, baseURL: managedBase });
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const anthropic = makeClient();
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const journal: Record<string, string> = fs.existsSync(ARTIFACT)
    ? JSON.parse(fs.readFileSync(ARTIFACT, "utf8"))
    : {};

  const { rows } = await pool.query(
    `SELECT id, title, url, coalesce(description,'') AS description
       FROM resources
      WHERE status='approved' AND length(coalesce(description,'')) < 30
      ORDER BY id`,
  );
  console.log(`Remaining short-description resources: ${rows.length}`);
  if (!rows.length) {
    await pool.end();
    return;
  }

  let processed = 0;
  for (let b = 0; b < MAX_BATCHES_PER_RUN && b * BATCH < rows.length; b++) {
    const slice = rows.slice(b * BATCH, (b + 1) * BATCH);
    const listing = slice
      .map(
        (r: any) =>
          `id=${r.id} | title="${r.title}" | url=${r.url} | current="${r.description}"`,
      )
      .join("\n");

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `You are curating a video-engineering resource catalog (awesome.video). For each resource below, write a factual 1–2 sentence description (60–200 characters) of what it is and why a video developer would care. Base it on the title, URL (owner/repo names are informative), and current stub text. Do NOT invent specific version numbers, dates, or statistics. Plain text only, no markdown.

Resources:
${listing}

Reply with ONLY a JSON array: [{"id": <number>, "description": "<text>"}, ...] covering every id above.`,
        },
      ],
    });

    const text = msg.content
      .filter((c) => c.type === "text")
      .map((c: any) => c.text)
      .join("");
    // Slice to outermost JSON brackets (LLM JSON hygiene).
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1) throw new Error(`No JSON array in reply: ${text.slice(0, 200)}`);
    const items: { id: number; description: string }[] = JSON.parse(
      text.slice(start, end + 1),
    );

    for (const item of items) {
      const desc = (item.description || "").trim();
      if (desc.length < 40 || desc.length > 300) {
        console.warn(`SKIP id=${item.id}: bad length ${desc.length}`);
        continue;
      }
      const known = slice.find((r: any) => r.id === item.id);
      if (!known) {
        console.warn(`SKIP id=${item.id}: not in batch`);
        continue;
      }
      await pool.query(
        `UPDATE resources SET description=$1 WHERE id=$2 AND status='approved' AND length(coalesce(description,'')) < 30`,
        [desc, item.id],
      );
      journal[String(item.id)] = desc;
      processed++;
    }
    fs.writeFileSync(ARTIFACT, JSON.stringify(journal, null, 2));
    console.log(`Batch ${b + 1} done (${processed} updated so far)`);
  }

  const { rows: left } = await pool.query(
    `SELECT count(*)::int AS n FROM resources WHERE status='approved' AND length(coalesce(description,'')) < 30`,
  );
  console.log(`Updated this run: ${processed}. Still remaining: ${left[0].n}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
