#!/usr/bin/env node
// Task #53 step 2 — content depth verification harness.
// Walks /api/awesome-list and reports:
//   - resource count per (cat, subcat, subsub)
//   - empty leaves
//   - any resource failing the field-completeness contract
// Writes JSON + markdown summary under _validation/full-audit/.
import fs from 'fs';
import path from 'path';

const BASE = process.env.AUDIT_BASE_URL || 'http://localhost:5000';
const OUT_DIR = path.resolve('_validation/full-audit');
fs.mkdirSync(OUT_DIR, { recursive: true });

const al = await fetch(`${BASE}/api/awesome-list`).then(r => r.json());

const rows = [];
const inHierarchy = new Set();
let total = 0;
let emptyLeaves = 0;
for (const cat of al.categories) {
  const directCount = (cat.resources || []).length;
  total += directCount;
  for (const p of cat.resources || []) inHierarchy.add(p.id);
  if (cat.subcategories?.length) {
    for (const sub of cat.subcategories) {
      const directSubCount = (sub.resources || []).length;
      total += directSubCount;
      for (const p of sub.resources || []) inHierarchy.add(p.id);
      if (sub.subSubcategories?.length) {
        for (const subsub of sub.subSubcategories) {
          const c = (subsub.resources || []).length;
          total += c;
          for (const p of subsub.resources || []) inHierarchy.add(p.id);
          rows.push({ level: 3, category: cat.name, subcategory: sub.name, subSubcategory: subsub.name, resourceCount: c });
          if (c === 0) emptyLeaves++;
        }
      }
      rows.push({ level: 2, category: cat.name, subcategory: sub.name, subSubcategory: null, resourceCount: directSubCount });
    }
  }
  rows.push({ level: 1, category: cat.name, subcategory: null, subSubcategory: null, resourceCount: directCount });
}

// Field-completeness contract against /api/resources (paginated, request full set)
const resources = await fetch(`${BASE}/api/resources?limit=10000`).then(r => r.json());
const list = Array.isArray(resources) ? resources : (resources.resources || []);
const contractFailures = [];
for (const r of list) {
  const missing = [];
  if (!r.title || !String(r.title).trim()) missing.push('title');
  if (!r.url || !String(r.url).trim()) missing.push('url');
  if (!r.description || !String(r.description).trim()) missing.push('description');
  if (!r.category || !String(r.category).trim()) missing.push('category');
  if (missing.length) contractFailures.push({ id: r.id, url: r.url, missing });
}

// Identify resources reachable via /api/resources but missing from every
// (category → subcategory → sub-subcategory) bucket of /api/awesome-list.
// Each such row is invisible in category browsing — the Task #55 failure mode.
const missingFromHierarchy = list
  .filter(r => !inHierarchy.has(r.id))
  .map(r => ({
    id: r.id,
    url: r.url,
    title: r.title,
    category: r.category ?? null,
    subcategory: r.subcategory ?? null,
    sub_subcategory: r.sub_subcategory ?? r.subSubcategory ?? null,
  }));

const summary = {
  baseUrl: BASE,
  generatedAt: new Date().toISOString(),
  totalResourcesInHierarchy: total,
  totalResourcesInList: list.length,
  rows,
  emptyLeafCount: emptyLeaves,
  emptyLeaves: rows.filter(r => r.level === 3 && r.resourceCount === 0),
  contractFailures,
  missingFromHierarchyCount: missingFromHierarchy.length,
  missingFromHierarchy,
};

fs.writeFileSync(path.join(OUT_DIR, 'depth-verify.json'), JSON.stringify(summary, null, 2));

const md = [];
md.push(`# Content Depth Verification — ${summary.generatedAt}`);
md.push('');
md.push(`- Resources in hierarchy: **${summary.totalResourcesInHierarchy}**`);
md.push(`- Resources in /api/resources list: **${summary.totalResourcesInList}**`);
md.push(`- Empty leaf (sub-subcategory) nodes: **${summary.emptyLeafCount}**`);
md.push(`- Field-completeness failures: **${contractFailures.length}**`);
md.push('');
md.push('## Per-category resource counts');
md.push('');
md.push('| Level | Category | Subcategory | Sub-subcategory | Resources |');
md.push('|---|---|---|---|---:|');
for (const r of rows) {
  md.push(`| L${r.level} | ${r.category} | ${r.subcategory ?? '—'} | ${r.subSubcategory ?? '—'} | ${r.resourceCount} |`);
}
if (summary.emptyLeafCount) {
  md.push('');
  md.push('## Empty leaves');
  md.push('');
  for (const e of summary.emptyLeaves) md.push(`- ${e.category} → ${e.subcategory} → ${e.subSubcategory}`);
}
if (contractFailures.length) {
  md.push('');
  md.push('## Field-completeness failures');
  md.push('');
  for (const f of contractFailures.slice(0, 50)) md.push(`- id=${f.id} url=${f.url} missing=${f.missing.join(',')}`);
}
if (missingFromHierarchy.length) {
  md.push('');
  md.push('## Resources missing from the category hierarchy');
  md.push('');
  md.push('These resources are reachable via `/api/resources` and `/resource/:id` but never appear under any `/category/:slug` / `/subcategory/:slug` / `/sub-subcategory/:slug` page.');
  md.push('');
  const tupleCounts = new Map();
  for (const r of missingFromHierarchy) {
    const k = `${r.category ?? '∅'} || ${r.subcategory ?? '∅'} || ${r.sub_subcategory ?? '∅'}`;
    tupleCounts.set(k, (tupleCounts.get(k) || 0) + 1);
  }
  md.push('| Count | Category | Subcategory | Sub-subcategory |');
  md.push('|---:|---|---|---|');
  for (const [k, n] of [...tupleCounts.entries()].sort((a, b) => b[1] - a[1])) {
    const [c, s, ss] = k.split(' || ');
    md.push(`| ${n} | ${c} | ${s} | ${ss} |`);
  }
}
fs.writeFileSync(path.join(OUT_DIR, 'depth-verify.md'), md.join('\n'));

console.log(`wrote ${path.join(OUT_DIR, 'depth-verify.json')} + .md`);
console.log(`   hierarchy=${total} list=${list.length} emptyLeaves=${emptyLeaves} contractFails=${contractFailures.length} missingFromHierarchy=${missingFromHierarchy.length}`);

// CI gate (Task #58): non-zero exit when hierarchy and list totals diverge.
// Print every offending (category, subcategory, sub_subcategory) tuple so the
// failing GitHub Actions log shows the exact rows to fix.
if (total !== list.length) {
  console.error('');
  console.error(`FAIL: totalResourcesInHierarchy (${total}) !== totalResourcesInList (${list.length}).`);
  console.error(`${missingFromHierarchy.length} resource(s) are reachable via /api/resources but absent from every category bucket of /api/awesome-list.`);
  console.error('Offending (category, subcategory, sub_subcategory) tuples:');
  const tupleCounts = new Map();
  for (const r of missingFromHierarchy) {
    const k = `${r.category ?? '∅'} || ${r.subcategory ?? '∅'} || ${r.sub_subcategory ?? '∅'}`;
    tupleCounts.set(k, (tupleCounts.get(k) || 0) + 1);
  }
  for (const [k, n] of [...tupleCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.error(`  ${String(n).padStart(4)} → ${k}`);
  }
  console.error('');
  console.error(`See ${path.join(OUT_DIR, 'depth-verify.json')} (missingFromHierarchy) for full per-row detail.`);
  process.exit(1);
}

console.log('PASS: every resource in /api/resources is reachable through the category hierarchy.');
