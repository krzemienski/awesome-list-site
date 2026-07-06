/**
 * One-off, idempotent, REVERSIBLE de-duplication script (BUG-001 / BUG-002).
 *
 * The awesome.video bug report flagged visible duplicate cards on several
 * subcategory pages. resources.url is UNIQUE (there are no duplicate URLs), so
 * these are same-project rows whose URLs differ only trivially (trailing slash,
 * a /en/ locale path, a tracking param, a mirror link, or homepage-vs-repo for
 * the SAME project listed once per subcategory).
 *
 * This script sets status='rejected' on the redundant twin of each pair (the
 * canonical/primary row is kept). Rejection is fully reversible from the admin
 * panel (or by re-running with the ids removed). Cross-subcategory cross-listings
 * are intentionally preserved.
 *
 * One row (186146, a Medium mirror of a Twitch blog post) is referenced by a
 * journey step; that reference is repointed to the surviving canonical twin
 * (185759) BEFORE rejection so the journey step never points at a rejected row.
 *
 * Run:  npx tsx scripts/dedup-reject.ts
 */
import { db } from "../server/db";
import { journeySteps } from "../shared/schema";
import { eq } from "drizzle-orm";
import { ResourceRepository } from "../server/repositories/ResourceRepository";

const resourceRepo = new ResourceRepository();

// Redundant twin id -> the canonical/kept id (for documentation + repointing).
const REJECT: Array<{ id: number; keep: number; note: string }> = [
  { id: 186330, keep: 186602, note: "Shutter Encoder — reject /en/ locale dup, keep root" },
  { id: 185749, keep: 185988, note: "matmoi/create-DASH-HLS — reject trailing-slash dup" },
  { id: 185750, keep: 185993, note: "realeyes-media/demo-encoder — reject trailing-slash dup" },
  { id: 185849, keep: 185793, note: "Server-less JIT Packaging — reject tracking-param dup" },
  { id: 186146, keep: 185759, note: "Live Video Transmuxing — reject Medium mirror, keep Twitch blog" },
  { id: 186617, keep: 186511, note: "CasparCG (Streaming Servers) — reject GitHub dup, keep project site" },
  { id: 186562, keep: 186351, note: "Janus WebRTC Server (Streaming Servers) — reject conf/demo dup, keep GitHub" },
];

async function main() {
  console.log(`[dedup] processing ${REJECT.length} candidate rows\n`);

  for (const { id, keep, note } of REJECT) {
    const resource = await resourceRepo.getResource(id);
    if (!resource) {
      console.log(`[dedup] SKIP ${id} — not found (already removed?) — ${note}`);
      continue;
    }
    if (resource.status === "rejected") {
      console.log(`[dedup] SKIP ${id} — already rejected — ${note}`);
      continue;
    }

    // Repoint any journey step that references the row we are about to reject to
    // its surviving canonical twin, so no journey step dangles on a rejected row.
    const repointed = await db
      .update(journeySteps)
      .set({ resourceId: keep })
      .where(eq(journeySteps.resourceId, id))
      .returning({ stepId: journeySteps.id });
    if (repointed.length > 0) {
      console.log(`[dedup] repointed ${repointed.length} journey step(s) ${id} -> ${keep}`);
    }

    await resourceRepo.updateResourceStatus(id, "rejected");
    console.log(`[dedup] REJECTED ${id} (kept ${keep}) — ${note}`);
  }

  console.log(`\n[dedup] done.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[dedup] failed:", err);
  process.exit(1);
});
