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
let total = 0;
let emptyLeaves = 0;
for (const cat of al.categories) {
  const directCount = (cat.resources || []).length;
  total += directCount;
  if (cat.subcategories?.length) {
    for (const sub of cat.subcategories) {
      const directSubCount = (sub.resources || []).length;
      total += directSubCount;
      if (sub.subSubcategories?.length) {
        for (const subsub of sub.subSubcategories) {
          const c = (subsub.resources || []).length;
          total += c;
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

const summary = {
  baseUrl: BASE,
  generatedAt: new Date().toISOString(),
  totalResourcesInHierarchy: total,
  totalResourcesInList: list.length,
  rows,
  emptyLeafCount: emptyLeaves,
  emptyLeaves: rows.filter(r => r.level === 3 && r.resourceCount === 0),
  contractFailures,
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
fs.writeFileSync(path.join(OUT_DIR, 'depth-verify.md'), md.join('\n'));

console.log(`✅ wrote ${path.join(OUT_DIR, 'depth-verify.json')} + .md`);
console.log(`   hierarchy=${total} list=${list.length} emptyLeaves=${emptyLeaves} contractFails=${contractFailures.length}`);
