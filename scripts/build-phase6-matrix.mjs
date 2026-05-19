#!/usr/bin/env node
// Build the per-cell matrix report from _validation/phase-6 artifacts.
// Reads _results.jsonl and the on-disk artifact files; emits FINAL_VALIDATION_REPORT.md
// with one row per cell (Route | Path | Viewport | Theme | Auth | State | screenshot | dom |
// console | network | axe | tokens-conformance | applier | Result).

import { promises as fs } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_ROOT = join(ROOT, '_validation', 'phase-6');

function cellSlug(c) {
  return `${c.slug}__${c.vp}__${c.auth}__${c.state}`;
}
function fileBase(c) {
  return join(OUT_ROOT, c.slug, `${c.vp}-dark-${c.auth}-${c.state}`);
}

async function exists(p) { try { await fs.stat(p); return true; } catch { return false; } }

async function main() {
  const results = (await fs.readFile(join(OUT_ROOT, '_results.jsonl'), 'utf8'))
    .trim().split('\n').filter(Boolean).map(JSON.parse);

  // dedup: keep last entry per cell-key
  const byKey = new Map();
  for (const r of results) byKey.set(cellSlug(r), r);
  const cells = Array.from(byKey.values());

  let totalPass = 0, totalFail = 0;
  const rows = [];
  for (const c of cells.sort((a, b) =>
    (a.slug + a.auth + a.state + a.vp).localeCompare(b.slug + b.auth + b.state + b.vp))) {
    const base = fileBase(c);
    const arts = {
      png:     await exists(`${base}.png`),
      dom:     await exists(`${base}.dom.html`),
      console: await exists(`${base}.console.json`),
      network: await exists(`${base}.network.json`),
      axe:     await exists(`${base}.axe.json`),
      tokens:  await exists(`${base}.tokens.json`),
    };
    const artCount = Object.values(arts).filter(Boolean).length;
    let tokConf = '—', applier = '—';
    try {
      const tj = JSON.parse(await fs.readFile(`${base}.tokens.json`, 'utf8'));
      tokConf = `${tj.conformance?.pass ?? '?'}/${(tj.conformance?.pass ?? 0) + (tj.conformance?.fail ?? 0)}`;
      applier = tj.applierReady === true ? '✅' : (tj.applierReady === false ? '❌' : '?');
    } catch {}
    const dsOk = c.applierReady === true && c.tokenFail === 0 && c.tokenPass > 0;
    const noBlockingErr = !c.navError && !c.fatal && artCount === 6;
    const cellPass = dsOk && noBlockingErr;
    if (cellPass) totalPass++; else totalFail++;
    rows.push({
      slug: c.slug, vp: c.vp, auth: c.auth, state: c.state, path: c.path,
      arts: artCount,
      tokConf,
      applier,
      console: c.consoleErrors ?? '?',
      pageErr: c.pageErrors ?? '?',
      net: c.networkFailures ?? '?',
      axe: c.axeViolations ?? '?',
      nav: c.navError ? 'NAV-ERR' : (c.fatal ? 'FATAL' : ''),
      result: cellPass ? '✅ PASS' : '❌ FAIL',
    });
  }

  const expected = 133;
  const verdict = (cells.length === expected && totalFail === 0) ? '✅ GATE 6 PASS' : '❌ GATE 6 FAIL';

  let md = '';
  md += `# Phase 6 — Final Validation Report\n\n`;
  md += `**Task**: DS Migration Phase 6 — Final Evidence Sweep\n`;
  md += `**Date**: ${new Date().toISOString().slice(0, 10)}\n`;
  md += `**Cells expected**: ${expected}\n`;
  md += `**Cells captured**: ${cells.length}\n`;
  md += `**Cells PASS**: ${totalPass}\n`;
  md += `**Cells FAIL**: ${totalFail}\n`;
  md += `**Verdict**: ${verdict}\n\n`;
  md += `Each cell writes six artifacts under \`_validation/phase-6/<slug>/<viewport>-dark-<auth>-<state>.<ext>\`:\n`;
  md += `\`.png\` \`.dom.html\` \`.console.json\` \`.network.json\` \`.axe.json\` \`.tokens.json\`\n\n`;
  md += `Token conformance = DS_SPEC §1 Terminal-column values read off \`<html>\` computed style after the DS applier runs.\n\n`;
  md += `## Per-cell matrix\n\n`;
  md += `| Route | Path | VP | Auth | State | Artifacts | Tokens | Applier | Cons-err | PageErr | Net | Axe | NavErr | Result |\n`;
  md += `|---|---|---|---|---|---:|---:|:---:|---:|---:|---:|---:|---|---|\n`;
  for (const r of rows) {
    md += `| ${r.slug} | \`${r.path}\` | ${r.vp} | ${r.auth} | ${r.state} | ${r.arts}/6 | ${r.tokConf} | ${r.applier} | ${r.console} | ${r.pageErr} | ${r.net} | ${r.axe} | ${r.nav} | ${r.result} |\n`;
  }
  md += `\n## Summary by route\n\n`;
  const byRoute = new Map();
  for (const r of rows) {
    const k = r.slug;
    if (!byRoute.has(k)) byRoute.set(k, { pass: 0, fail: 0, total: 0 });
    const e = byRoute.get(k);
    e.total++;
    if (r.result.startsWith('✅')) e.pass++; else e.fail++;
  }
  md += `| Route | Pass | Fail | Total |\n|---|---:|---:|---:|\n`;
  for (const [k, v] of Array.from(byRoute.entries()).sort()) {
    md += `| ${k} | ${v.pass} | ${v.fail} | ${v.total} |\n`;
  }
  md += `\n## Verifier notes\n\n`;
  md += `- Applier readiness is enforced as a **hard precondition**: each cell waits up to 10 s for \`document.documentElement.__appliedKeys.length >= 30\` and records \`applierReady: false\` (counted as failure) if the wait times out.\n`;
  md += `- Token comparison uses normalized color equality (hex ↔ rgb conversion + whitespace strip).\n`;
  md += `- \`--bg-atmosphere\` and \`--bg-atmosphere-size\` are explicitly checked, not skipped.\n`;
  md += `- Substring matching is retained for rgba tokens where alpha may vary across browsers, scoped to the rgb channel triplet (e.g. \`232, 232, 224\`) so it cannot accept an arbitrary string.\n\n`;
  md += `Capture script: \`scripts/capture-phase6.mjs\` — resumable (skips cells whose tokens.json already shows \`applierReady=true\` and zero token-fail).\n`;
  md += `Report generator: \`scripts/build-phase6-matrix.mjs\`.\n`;

  await fs.writeFile(join(OUT_ROOT, 'FINAL_VALIDATION_REPORT.md'), md);
  console.log(`Wrote FINAL_VALIDATION_REPORT.md — ${verdict} (${totalPass}/${cells.length} cells passing, ${expected - cells.length} cells missing)`);
}

main().catch(e => { console.error(e); process.exit(1); });
