/**
 * Run19 BUG-003 — consolidate duplicate sub-subcategory groups via the live
 * admin HTTP API (prod DB is not directly writable from the agent
 * environment; mirrors scripts/run18-data-fixes-prod.ts).
 *
 * The bulk-import pipeline created per-source copies of the same logical
 * sub-subcategory under different parent subcategories, with slugs suffixed
 * `-sc<subcategoryId>` (HLS x11, FFmpeg x10, Quality & Testing x8, …), each
 * holding a fragment of the topic's resources. This script:
 *
 *  1. Groups all sub-subcategory rows by normalized name (lowercase, strip
 *     non-alphanumerics — catches "FFMPEG" vs "FFmpeg" and "iOS/tvOS" twins).
 *  2. Picks a canonical row per group: prefer a bare (non `-scNNNN`) slug,
 *     then the row holding the most resources (per-node, from the live tree),
 *     then lowest id. Display name = most frequent exact name in the group.
 *  3. Renames the canonical row if its display name should change (FFMPEG →
 *     FFmpeg), then re-points every resource in the group's nodes to the
 *     canonical (category, subcategory, name) triplet via PUT
 *     /api/admin/resources/:id — SEQUENTIALLY, never Promise.all (pg pool).
 *  4. Renames each duplicate row to a unique temp name (the delete guard
 *     counts resources by name GLOBALLY) and deletes it.
 *  5. Re-fetches the tree and asserts 0 duplicate groups and an unchanged
 *     total resource count.
 *
 * Idempotent: groups are recomputed from live data; a re-run finds no groups
 * of size >= 2 and no-ops. Journaled to
 * artifacts/remediation-2026-07/BUG-003/dedupe-<env>.json.
 *
 * Run:  ADMIN_PASSWORD=... npx tsx scripts/run19-dedupe-subsubcats.ts
 * Dev:  PROD_BASE=http://localhost:5000 ADMIN_PASSWORD=... npx tsx scripts/run19-dedupe-subsubcats.ts
 */
import fs from "fs";

const BASE = process.env.PROD_BASE || "https://awesome.video";
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;
const ENV_TAG = BASE.includes("localhost") ? "dev" : "prod";

if (!PASSWORD) {
  console.error("ADMIN_PASSWORD not set in env — aborting.");
  process.exit(1);
}

const journal: any = { startedAt: new Date().toISOString(), base: BASE, groups: [], errors: [] };
function log(tag: string, entry: any) {
  console.log(`[${tag}]`, JSON.stringify(entry).slice(0, 400));
}

let cookie = "";
async function api(path: string, init: RequestInit = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      ...(init.headers || {}),
    },
  });
  let body: any = null;
  try {
    body = await r.json();
  } catch {
    /* non-JSON */
  }
  return { status: r.status, body };
}

async function login(): Promise<void> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(`${BASE}/api/auth/local/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (r.ok) {
      const setCookies: string[] =
        (r.headers as any).getSetCookie?.() ??
        [r.headers.get("set-cookie")].filter(Boolean);
      const sid = setCookies.find((c: string) => c.startsWith("connect.sid="));
      if (!sid) throw new Error("login OK but no connect.sid in response");
      cookie = sid.split(";")[0];
      log("login", { attempt, ok: true });
      return;
    }
    log("login", { attempt, status: r.status });
    await new Promise((res) => setTimeout(res, 5000 * attempt));
  }
  throw new Error("login failed after retries");
}

// ---------------------------------------------------------------------------

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const isSuffixed = (slug: string) => /-sc\d+$/.test(slug);

type Row = { id: number; name: string; slug: string; subcategoryId: number };
type Node = {
  row: Row;
  categoryName: string;
  subcategoryName: string;
  resourceIds: number[];
};

async function fetchTree() {
  const { status, body } = await api("/api/awesome-list");
  if (status !== 200) throw new Error(`/api/awesome-list -> ${status}`);
  return body;
}

function treeStats(tree: any) {
  const subsubs: { name: string; slug: string; category: string; subcategory: string; count: number }[] = [];
  for (const cat of tree.categories ?? []) {
    for (const sub of cat.subcategories ?? []) {
      for (const ss of sub.subSubcategories ?? []) {
        subsubs.push({
          name: ss.name,
          slug: ss.slug,
          category: cat.name,
          subcategory: sub.name,
          count: (ss.resources ?? []).length,
        });
      }
    }
  }
  const byNorm = new Map<string, typeof subsubs>();
  for (const s of subsubs) {
    const k = normalize(s.name);
    if (!byNorm.has(k)) byNorm.set(k, []);
    byNorm.get(k)!.push(s);
  }
  const dupGroups = [...byNorm.entries()].filter(([, v]) => v.length >= 2);
  const suffixedSlugs = subsubs.filter((s) => isSuffixed(s.slug)).map((s) => s.slug);
  return { total: subsubs.length, dupGroups, suffixedSlugs, totalResources: (tree.resources ?? []).length };
}

async function main() {
  await login();

  // --- live state ----------------------------------------------------------
  const rowsResp = await api("/api/admin/sub-subcategories");
  if (rowsResp.status !== 200) throw new Error(`admin sub-subcategories -> ${rowsResp.status}`);
  const rows: Row[] = rowsResp.body.map((r: any) => ({
    id: r.id, name: r.name, slug: r.slug, subcategoryId: r.subcategoryId,
  }));

  const subsResp = await api("/api/admin/subcategories");
  if (subsResp.status !== 200) throw new Error(`admin subcategories -> ${subsResp.status}`);
  const subById = new Map<number, { name: string; categoryId: number }>();
  for (const s of subsResp.body) subById.set(s.id, { name: s.name, categoryId: s.categoryId });

  const tree = await fetchTree();
  const before = treeStats(tree);
  journal.before = { totalSubSubcats: before.total, dupGroupCount: before.dupGroups.length, totalResources: before.totalResources };
  log("before", journal.before);

  // Per-node resource ids + category names, from the tree (resources attach
  // by exact text triplet, so match tree nodes to admin rows by
  // (subcategory name, sub-subcategory name)).
  const nodeKey = (subcatName: string, name: string) => `${subcatName}\u0000${name}`;
  const treeNodes = new Map<string, { category: string; resourceIds: number[] }>();
  for (const cat of tree.categories ?? []) {
    for (const sub of cat.subcategories ?? []) {
      for (const ss of sub.subSubcategories ?? []) {
        treeNodes.set(nodeKey(sub.name, ss.name), {
          category: cat.name,
          resourceIds: (ss.resources ?? []).map((r: any) => r.id),
        });
      }
    }
  }

  const nodes: Node[] = [];
  for (const row of rows) {
    const sub = subById.get(row.subcategoryId);
    if (!sub) {
      journal.errors.push({ where: "orphan-row", row });
      continue;
    }
    const tn = treeNodes.get(nodeKey(sub.name, row.name));
    nodes.push({
      row,
      categoryName: tn?.category ?? "", // filled below if empty
      subcategoryName: sub.name,
      resourceIds: tn?.resourceIds ?? [],
    });
  }
  // Category names for nodes missing from the tree (0-resource rows can be
  // absent only if the subcategory itself is empty — resolve via categoryId).
  const catsResp = await api("/api/categories");
  const catNameById = new Map<number, string>();
  if (catsResp.status === 200 && Array.isArray(catsResp.body)) {
    for (const c of catsResp.body) catNameById.set(c.id, c.name);
  }
  for (const n of nodes) {
    if (!n.categoryName) {
      const sub = subById.get(n.row.subcategoryId)!;
      n.categoryName = catNameById.get(sub.categoryId) ?? "";
    }
  }

  // --- group + consolidate ---------------------------------------------------
  const groups = new Map<string, Node[]>();
  for (const n of nodes) {
    const k = normalize(n.row.name);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(n);
  }

  for (const [key, group] of [...groups.entries()].sort()) {
    if (group.length < 2) continue;

    // canonical: bare slug first, then most resources, then lowest id
    const sorted = [...group].sort((a, b) => {
      const bareA = isSuffixed(a.row.slug) ? 1 : 0;
      const bareB = isSuffixed(b.row.slug) ? 1 : 0;
      if (bareA !== bareB) return bareA - bareB;
      if (b.resourceIds.length !== a.resourceIds.length) return b.resourceIds.length - a.resourceIds.length;
      return a.row.id - b.row.id;
    });
    const canonical = sorted[0];
    const dups = sorted.slice(1);

    // display name: most frequent exact name; tie -> canonical's own name
    const freq = new Map<string, number>();
    for (const n of group) freq.set(n.row.name, (freq.get(n.row.name) ?? 0) + 1);
    let displayName = canonical.row.name;
    let best = freq.get(displayName) ?? 0;
    for (const [name, f] of freq) {
      if (f > best) { displayName = name; best = f; }
    }

    const gj: any = {
      key,
      canonical: { ...canonical.row, category: canonical.categoryName, subcategory: canonical.subcategoryName, resources: canonical.resourceIds.length },
      displayName,
      dups: [] as any[],
      movedResources: 0,
    };

    // 1) rename canonical if display name differs
    if (displayName !== canonical.row.name) {
      const r = await api(`/api/admin/sub-subcategories/${canonical.row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: displayName }),
      });
      gj.canonicalRenamed = { from: canonical.row.name, to: displayName, status: r.status };
      if (r.status !== 200) { journal.errors.push({ where: "canonical-rename", group: key, status: r.status, body: r.body }); journal.groups.push(gj); continue; }
    }

    // 2) re-point resources — canonical's own (if renamed) first, then dups'
    const moves: { id: number; from: string }[] = [];
    if (displayName !== canonical.row.name) {
      for (const id of canonical.resourceIds) moves.push({ id, from: `${canonical.row.name}@${canonical.subcategoryName}` });
    }
    for (const d of dups) {
      for (const id of d.resourceIds) moves.push({ id, from: `${d.row.name}@${d.subcategoryName}` });
    }
    let moveFailures = 0;
    for (const mv of moves) {
      const r = await api(`/api/admin/resources/${mv.id}`, {
        method: "PUT",
        body: JSON.stringify({
          category: canonical.categoryName,
          subcategory: canonical.subcategoryName,
          subSubcategory: displayName,
        }),
      });
      if (r.status !== 200) {
        moveFailures++;
        journal.errors.push({ where: "resource-move", group: key, resource: mv, status: r.status, body: r.body });
      } else {
        gj.movedResources++;
      }
    }
    if (moveFailures > 0) {
      log("group-abort", { key, moveFailures });
      journal.groups.push(gj);
      continue; // leave dup rows in place; re-run resumes after fixing cause
    }

    // 3) temp-rename + delete each dup row
    for (const d of dups) {
      const temp = `__dup_run19_${d.row.id}`;
      const ren = await api(`/api/admin/sub-subcategories/${d.row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: temp }),
      });
      if (ren.status !== 200) {
        journal.errors.push({ where: "dup-rename", group: key, row: d.row, status: ren.status, body: ren.body });
        gj.dups.push({ ...d.row, deleted: false });
        continue;
      }
      const del = await api(`/api/admin/sub-subcategories/${d.row.id}`, { method: "DELETE" });
      gj.dups.push({ ...d.row, subcategory: d.subcategoryName, resources: d.resourceIds.length, deleted: del.status === 200 || del.status === 204, deleteStatus: del.status });
      if (del.status !== 200 && del.status !== 204) {
        journal.errors.push({ where: "dup-delete", group: key, row: d.row, status: del.status, body: del.body });
      }
    }

    log("group-done", { key, displayName, moved: gj.movedResources, dupsDeleted: gj.dups.filter((d: any) => d.deleted).length });
    journal.groups.push(gj);
  }

  // --- slug normalization ------------------------------------------------------
  // Survivor/singleton rows can still carry a legacy `-scNNNN` slug with no
  // bare twin (the whole group was suffixed, or the row was never duplicated).
  // The sitemap must reference only canonical slugs, so rename each suffixed
  // slug to its bare form when the bare slug is globally free — the
  // og-middleware BUG-003 redirect then 301s the old suffixed URL.
  journal.slugRenames = [];
  {
    const freshResp = await api("/api/admin/sub-subcategories");
    if (freshResp.status !== 200) throw new Error(`admin sub-subcategories (slug pass) -> ${freshResp.status}`);
    const fresh: Row[] = freshResp.body.map((r: any) => ({
      id: r.id, name: r.name, slug: r.slug, subcategoryId: r.subcategoryId,
    }));
    const taken = new Set(fresh.map((r) => r.slug));
    for (const row of fresh) {
      if (!isSuffixed(row.slug)) continue;
      const bare = row.slug.replace(/-sc\d+$/, "");
      if (taken.has(bare)) {
        journal.slugRenames.push({ ...row, skipped: "bare slug taken", bare });
        continue;
      }
      const r = await api(`/api/admin/sub-subcategories/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ slug: bare }),
      });
      const ok = r.status === 200;
      taken.add(bare);
      journal.slugRenames.push({ id: row.id, name: row.name, from: row.slug, to: bare, status: r.status });
      if (!ok) journal.errors.push({ where: "slug-rename", row, status: r.status, body: r.body });
      log("slug-rename", { id: row.id, from: row.slug, to: bare, status: r.status });
    }
  }

  // --- case-variant resource strings -----------------------------------------
  // Resources whose (category, subcategory) parent never hosted a dup-group
  // node store a case-variant string (e.g. "FFMPEG" under a subcategory with
  // no FFmpeg row) — the tree folds them up to the subcategory, so the
  // consolidation pass above never re-pointed them. Normalize any resource
  // subSubcategory string that matches a canonical row name case-variantly
  // (normalized equality) but not exactly. Strings with NO canonical match at
  // all (e.g. "Vendor Docs") are legitimately folded labels — left alone.
  journal.caseVariantFixes = [];
  {
    const freshResp = await api("/api/admin/sub-subcategories");
    if (freshResp.status !== 200) throw new Error(`admin sub-subcategories (case pass) -> ${freshResp.status}`);
    const canonicalByNorm = new Map<string, string>();
    const exactNames = new Set<string>();
    for (const r of freshResp.body) {
      canonicalByNorm.set(normalize(r.name), r.name);
      exactNames.add(r.name);
    }
    // Scan via the UNCACHED admin listing (all statuses) — the public tree
    // has a 60s TTL cache (stale re-runs would re-apply fixes and journal
    // dishonestly) and omits pending/rejected resources entirely.
    const variants: { id: number; category: string; subcategory: string; from: string; to: string; resourceStatus: string }[] = [];
    let page = 1;
    for (;;) {
      const resp = await api(`/api/admin/resources?page=${page}&limit=100`);
      if (resp.status !== 200) throw new Error(`admin resources page ${page} -> ${resp.status}`);
      for (const r of resp.body.resources ?? []) {
        const s = r.subSubcategory;
        if (!s || exactNames.has(s)) continue;
        const canon = canonicalByNorm.get(normalize(s));
        if (canon && canon !== s) {
          variants.push({ id: r.id, category: r.category, subcategory: r.subcategory, from: s, to: canon, resourceStatus: r.status });
        }
      }
      if (page >= (resp.body.totalPages ?? 1)) break;
      page++;
    }
    for (const v of variants) {
      const r = await api(`/api/admin/resources/${v.id}`, {
        method: "PUT",
        body: JSON.stringify({ category: v.category, subcategory: v.subcategory, subSubcategory: v.to }),
      });
      journal.caseVariantFixes.push({ ...v, status: r.status });
      if (r.status !== 200) journal.errors.push({ where: "case-variant-fix", ...v, status: r.status, body: r.body });
    }
    log("case-variant-fixes", { count: variants.length, failures: journal.caseVariantFixes.filter((f: any) => f.status !== 200).length });
  }

  // --- verify ----------------------------------------------------------------
  // /api/awesome-list serves a 60s TTL server cache (run16 BUG-002), so the
  // first post-mutation fetch can be stale. Poll until the dup count drops to
  // 0 or the TTL has safely elapsed (~75s), then take the final reading.
  const skippedRenames = journal.slugRenames.filter((r: any) => r.skipped).length;
  let after = treeStats(await fetchTree());
  const deadline = Date.now() + 75_000;
  while (
    (after.dupGroups.length > 0 || after.suffixedSlugs.length > skippedRenames) &&
    Date.now() < deadline
  ) {
    await new Promise((r) => setTimeout(r, 5_000));
    after = treeStats(await fetchTree());
  }
  journal.after = {
    totalSubSubcats: after.total,
    dupGroupCount: after.dupGroups.length,
    dupGroups: after.dupGroups.map(([k, v]) => ({ key: k, nodes: v.map((n) => `${n.name}@${n.subcategory}`) })),
    totalResources: after.totalResources,
    suffixedSlugsRemaining: after.suffixedSlugs,
    slugRenamesSkipped: skippedRenames,
  };
  log("after", { totalSubSubcats: after.total, dupGroupCount: after.dupGroups.length, totalResources: after.totalResources });

  journal.finishedAt = new Date().toISOString();
  journal.pass =
    after.dupGroups.length === 0 &&
    after.suffixedSlugs.length <= skippedRenames &&
    after.totalResources === before.totalResources &&
    journal.errors.length === 0;
  const out = `artifacts/remediation-2026-07/BUG-003/dedupe-${ENV_TAG}.json`;
  fs.mkdirSync("artifacts/remediation-2026-07/BUG-003", { recursive: true });
  fs.writeFileSync(out, JSON.stringify(journal, null, 2));
  console.log(`\nPASS=${journal.pass} — journal written to ${out}`);
  if (!journal.pass) process.exit(2);
}

main().catch((e) => {
  console.error("FATAL", e);
  journal.fatal = String(e);
  try {
    fs.mkdirSync("artifacts/remediation-2026-07/BUG-003", { recursive: true });
    fs.writeFileSync(`artifacts/remediation-2026-07/BUG-003/dedupe-${ENV_TAG}.json`, JSON.stringify(journal, null, 2));
  } catch {}
  process.exit(1);
});
