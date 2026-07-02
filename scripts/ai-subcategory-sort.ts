/**
 * ai-subcategory-sort.ts
 *
 * One-time (user-approved) helper that classifies every APPROVED resource whose
 * subcategory is NULL/'' into the best-fitting EXISTING subcategory of its
 * category, using Claude Haiku.
 *
 * SAFETY / DESIGN (per architect review):
 * - Classify-only. This script NEVER writes to the resources table. It writes a
 *   backup snapshot + a url-keyed results file that a separate apply step reads.
 * - Constrained to EXISTING subcategory names only. The model's returned name is
 *   validated against the category's real subcategory list (case/space-insensitive
 *   match -> canonical DB name). No match -> null (item stays unfiled -> handled
 *   by the "General" sidebar fallback).
 * - Resumable: results keyed by resources.url (unique + stable across dev/prod).
 *   Re-run until it prints "ALL DONE". Internal wall-clock budget so a single
 *   bash invocation never hits the 120s kill.
 *
 * Files (under .local/ai-subsort/):
 * - backup.jsonl   {id,url,category} for every touched (unfiled) row, written once.
 * - results.jsonl  {url,id,category,assigned,raw} appended as classified.
 */
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { and, or, eq, isNull, sql } from "drizzle-orm";
import { db } from "../server/db";
import { resources, subcategories, categories } from "../shared/schema";

const MODEL = "claude-haiku-4-5";
const BATCH = 20;
const BUDGET_MS = Number(process.env.BUDGET_MS || 100000);
const OUT_DIR = path.resolve(".local/ai-subsort");
const BACKUP = path.join(OUT_DIR, "backup.jsonl");
const RESULTS = path.join(OUT_DIR, "results.jsonl");

type Row = { id: number; url: string; title: string; description: string | null; category: string };
type ResultLine = { url: string; id: number; category: string; assigned: string | null; raw: string | null };

const started = Date.now();
const overBudget = () => Date.now() - started >= BUDGET_MS;

function readProcessedUrls(): Set<string> {
  const set = new Set<string>();
  if (!fs.existsSync(RESULTS)) return set;
  for (const line of fs.readFileSync(RESULTS, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { set.add((JSON.parse(line) as ResultLine).url); } catch {}
  }
  return set;
}

function extractJsonArray(text: string): any[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return []; }
}

async function classifyBatch(
  categoryName: string,
  allowed: string[],
  batch: Row[]
): Promise<Map<number, string | null>> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const list = batch
    .map(
      (r, i) =>
        `${i}. title: ${r.title}\n   description: ${(r.description || "").slice(0, 200)}\n   url: ${r.url}`
    )
    .join("\n");

  const prompt = `You are organizing a curated list of video-development resources. All resources below belong to the category "${categoryName}". Assign each resource to the SINGLE best-fitting subcategory from this exact list:

${allowed.map((s) => `- ${s}`).join("\n")}

Rules:
- Return ONLY the subcategory name copied EXACTLY from the list above.
- If none of the subcategories is a reasonable fit, return null for that item (do not force a bad fit).
- Base the decision on the title, description, and URL.

Resources:
${list}

Respond with ONLY a JSON array, one object per resource, in the same order:
[{"i": 0, "subcategory": "<exact name or null>"}, ...]`;

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });
  const text = resp.content.filter((b) => b.type === "text").map((b: any) => b.text).join("\n");
  const parsed = extractJsonArray(text);

  const lowerToCanonical = new Map(allowed.map((n) => [n.trim().toLowerCase(), n]));
  const out = new Map<number, string | null>();
  for (const item of parsed) {
    const i = Number(item?.i);
    if (!Number.isInteger(i) || i < 0 || i >= batch.length) continue;
    const raw = item?.subcategory;
    const canonical =
      typeof raw === "string" ? lowerToCanonical.get(raw.trim().toLowerCase()) ?? null : null;
    out.set(batch[i].id, canonical);
  }
  return out;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Allowed subcategory names per category
  const subRows = await db
    .select({ category: categories.name, sub: subcategories.name })
    .from(subcategories)
    .innerJoin(categories, eq(categories.id, subcategories.categoryId));
  const allowedByCat = new Map<string, string[]>();
  for (const r of subRows) {
    if (!allowedByCat.has(r.category)) allowedByCat.set(r.category, []);
    allowedByCat.get(r.category)!.push(r.sub);
  }

  // Unfiled approved resources
  const unfiled: Row[] = await db
    .select({
      id: resources.id,
      url: resources.url,
      title: resources.title,
      description: resources.description,
      category: resources.category,
    })
    .from(resources)
    .where(
      and(
        eq(resources.status, "approved"),
        or(isNull(resources.subcategory), eq(resources.subcategory, ""))
      )
    );

  // One-time backup snapshot
  if (!fs.existsSync(BACKUP)) {
    fs.writeFileSync(
      BACKUP,
      unfiled.map((r) => JSON.stringify({ id: r.id, url: r.url, category: r.category })).join("\n") + "\n"
    );
    console.log(`Backup written: ${unfiled.length} rows -> ${BACKUP}`);
  }

  const processed = readProcessedUrls();
  const remaining = unfiled.filter((r) => !processed.has(r.url));
  console.log(`Total unfiled: ${unfiled.length} | already processed: ${processed.size} | remaining: ${remaining.length}`);

  // Group remaining by category for a constant allowed-list per Claude call
  const byCat = new Map<string, Row[]>();
  for (const r of remaining) {
    if (!byCat.has(r.category)) byCat.set(r.category, []);
    byCat.get(r.category)!.push(r);
  }

  const stream = fs.createWriteStream(RESULTS, { flags: "a" });
  let done = 0;
  for (const [cat, rows] of byCat) {
    const allowed = allowedByCat.get(cat) || [];
    if (allowed.length === 0) {
      // No subcategories exist for this category -> everything stays null.
      for (const r of rows) {
        stream.write(JSON.stringify({ url: r.url, id: r.id, category: cat, assigned: null, raw: "no-subcategories" } as ResultLine) + "\n");
        done++;
      }
      continue;
    }
    for (let i = 0; i < rows.length; i += BATCH) {
      if (overBudget()) {
        stream.end();
        console.log(`Budget reached. Classified ${done} this run. Re-run to continue.`);
        return;
      }
      const batch = rows.slice(i, i + BATCH);
      let assignments: Map<number, string | null>;
      try {
        assignments = await classifyBatch(cat, allowed, batch);
      } catch (e: any) {
        console.error(`Batch error (${cat} @${i}): ${e?.message || e}. Skipping this run.`);
        continue;
      }
      for (const r of batch) {
        const assigned = assignments.has(r.id) ? assignments.get(r.id)! : null;
        stream.write(JSON.stringify({ url: r.url, id: r.id, category: cat, assigned, raw: null } as ResultLine) + "\n");
        done++;
      }
      console.log(`[${cat}] ${Math.min(i + BATCH, rows.length)}/${rows.length} (run total ${done})`);
    }
  }
  stream.end();
  console.log(`ALL DONE. Classified ${done} this run. Total processed now: ${processed.size + done}/${unfiled.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
