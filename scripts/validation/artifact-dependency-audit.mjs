#!/usr/bin/env node
// Advisory audit for the design-system preview artifact's dependency tree.
//
// The artifact (artifacts/awesome-video-design-system) declares its own
// dependencies (vite, @vitejs/plugin-react, react, typescript, …) but has no
// lockfile of its own: npm resolves them from the root package-lock.json. The
// root CI job only installs and tests the app, so nothing looked at advisories
// for the packages the PREVIEW actually runs. This gate does:
//
//   1. every dependency the artifact declares must resolve to a root lock entry
//      whose version satisfies the artifact's range (otherwise the "artifact
//      tree" is not the tree that is locked, and the audit would be fiction);
//   2. the transitive closure of those entries is computed from the lock;
//   3. `npm audit --package-lock-only --json` advisories are intersected with
//      that closure by lock path;
//   4. any advisory at or above POLICY_MIN_SEVERITY fails unless it is listed in
//      artifact-dependency-audit-exceptions.json with a reason and an unexpired
//      review date.
//
// Exit codes: 0 pass · 1 policy violation · 2 inconclusive (the advisory
// service could not be reached — an outage, not a verdict) · 64 usage.
//
// Usage:
//   node scripts/validation/artifact-dependency-audit.mjs [--evidence=<file.json>]
//   (AUDIT_JSON=<file> reuses a saved `npm audit --json` report instead of the
//    network; used by the mutation probe, never by CI.)

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARTIFACT_DIR = 'artifacts/awesome-video-design-system';
const LOCK_PATH = path.join(ROOT, 'package-lock.json');
const EXCEPTIONS_PATH = path.join(ROOT, 'scripts/validation/artifact-dependency-audit-exceptions.json');
const SEVERITY_RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };
const POLICY_MIN_SEVERITY = 'moderate';
const MAX_EXCEPTION_DAYS = 120;

const argv = process.argv.slice(2);
const unknown = argv.filter((arg) => !/^--evidence=.+/.test(arg));
if (unknown.length) {
  console.error(`FAIL usage :: unknown argument(s): ${unknown.join(' ')}`);
  console.error('       usage: node scripts/validation/artifact-dependency-audit.mjs [--evidence=<file.json>]');
  process.exit(64);
}
const evidenceArg = argv.find((arg) => arg.startsWith('--evidence='));

function eq(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`FAIL canary :: ${label} → ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    process.exit(1);
  }
}

// Minimal semver range check for the shapes package.json uses here: exact,
// ^, ~, >=, and `a || b`. Anything else is reported rather than guessed.
function parseVersion(v) {
  // Partial ranges (">=18", "^5.4") mean the missing parts are zero.
  const m = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(String(v).trim());
  return m ? m.slice(1, 4).map((part) => Number(part ?? 0)) : null;
}
function cmp(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}
function satisfies(version, range) {
  const v = parseVersion(version);
  if (!v) return null;
  return range.split('||').some((part) => {
    const r = part.trim();
    if (r === '*' || r === '') return true;
    const op = /^(\^|~|>=)?\s*(.+)$/.exec(r);
    const base = parseVersion(op[2]);
    if (!base) return false;
    if (op[1] === '>=') return cmp(v, base) >= 0;
    if (op[1] === '^') {
      if (cmp(v, base) < 0) return false;
      if (base[0] > 0) return v[0] === base[0];
      if (base[1] > 0) return v[0] === 0 && v[1] === base[1];
      return v[0] === 0 && v[1] === 0 && v[2] === base[2];
    }
    if (op[1] === '~') return cmp(v, base) >= 0 && v[0] === base[0] && v[1] === base[1];
    return cmp(v, base) === 0;
  });
}

// Resolve `name` as required from lock path `from`, the way node does: the
// nearest node_modules walking up from the requiring package.
function resolveLockPath(packages, from, name) {
  let dir = from;
  for (;;) {
    const candidate = `${dir ? `${dir}/` : ''}node_modules/${name}`;
    if (packages[candidate]) return candidate;
    if (!dir) return null;
    const idx = dir.lastIndexOf('/node_modules/');
    dir = idx === -1 ? '' : dir.slice(0, idx);
  }
}

function closureOf(packages, roots) {
  const seen = new Set();
  const missing = [];
  const queue = [...roots];
  while (queue.length) {
    const lockPath = queue.shift();
    if (seen.has(lockPath)) continue;
    seen.add(lockPath);
    const entry = packages[lockPath];
    const deps = { ...(entry.dependencies ?? {}), ...(entry.optionalDependencies ?? {}), ...(entry.peerDependencies ?? {}) };
    for (const name of Object.keys(deps)) {
      const resolved = resolveLockPath(packages, lockPath, name);
      if (resolved) queue.push(resolved);
      else if (!(entry.optionalDependencies ?? {})[name] && !(entry.peerDependenciesMeta ?? {})[name]?.optional && !(entry.peerDependencies ?? {})[name]) {
        missing.push(`${lockPath} → ${name}`);
      }
    }
  }
  return { paths: seen, missing };
}

// advisories: npm audit v2 `vulnerabilities` map. Returns one finding per
// (package, advisory) whose affected lock nodes intersect the closure.
function findingsInClosure(vulnerabilities, closure) {
  const findings = [];
  for (const [name, vuln] of Object.entries(vulnerabilities ?? {})) {
    const nodes = (vuln.nodes ?? []).filter((node) => closure.has(node));
    if (!nodes.length) continue;
    for (const via of vuln.via ?? []) {
      if (typeof via === 'string') continue; // transitive pointer; the source package carries the advisory
      findings.push({
        package: name,
        advisory: via.source,
        severity: via.severity,
        title: via.title,
        url: via.url,
        range: via.range,
        nodes,
        fixAvailable: vuln.fixAvailable ?? null,
      });
    }
  }
  return findings.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.package.localeCompare(b.package));
}

function exceptionStatus(finding, exceptions, today) {
  const ex = exceptions.find((e) => e.advisory === finding.advisory && e.package === finding.package);
  if (!ex) return { ok: false, why: 'no reviewed exception' };
  if (typeof ex.reason !== 'string' || ex.reason.trim().length < 20) return { ok: false, why: 'exception has no substantive reason' };
  const reviewed = new Date(`${ex.reviewed}T00:00:00Z`);
  if (Number.isNaN(reviewed.getTime())) return { ok: false, why: 'exception has no valid reviewed date' };
  const age = Math.floor((today.getTime() - reviewed.getTime()) / 86_400_000);
  if (age > MAX_EXCEPTION_DAYS) return { ok: false, why: `exception reviewed ${ex.reviewed} (${age} days ago, limit ${MAX_EXCEPTION_DAYS}) — re-review` };
  return { ok: true, why: ex.reason.trim(), reviewed: ex.reviewed };
}

function runCanaries() {
  eq(satisfies('5.4.21', '^5.4.21'), true, '^ accepts a patch-equal version');
  eq(satisfies('6.0.0', '^5.4.21'), false, '^ rejects the next major');
  eq(satisfies('5.6.3', '5.6.3'), true, 'exact range');
  eq(satisfies('5.6.4', '5.6.3'), false, 'exact range rejects a different patch');
  eq(satisfies('18.3.1', '>=18'), true, '>= range');
  const packages = {
    '': {},
    'node_modules/a': { version: '1.0.0', dependencies: { b: '^1.0.0' } },
    'node_modules/a/node_modules/b': { version: '1.2.0' },
    'node_modules/b': { version: '2.0.0' },
    'node_modules/c': { version: '1.0.0', dependencies: { b: '^2.0.0' } },
  };
  eq(resolveLockPath(packages, 'node_modules/a', 'b'), 'node_modules/a/node_modules/b', 'nested node_modules wins');
  eq(resolveLockPath(packages, 'node_modules/c', 'b'), 'node_modules/b', 'falls back to the hoisted copy');
  const closure = closureOf(packages, ['node_modules/a']).paths;
  eq([...closure].sort(), ['node_modules/a', 'node_modules/a/node_modules/b'], 'closure follows the nested copy only');
  const vulns = {
    b: { nodes: ['node_modules/b'], via: [{ source: 1, severity: 'high', title: 't', url: 'u', range: '<3' }] },
  };
  eq(findingsInClosure(vulns, closure).length, 0, 'an advisory on a copy outside the closure is ignored');
  vulns.b.nodes.push('node_modules/a/node_modules/b');
  eq(findingsInClosure(vulns, closure).map((f) => f.package), ['b'], 'an advisory on an in-closure copy is reported');
  const today = new Date('2026-10-09T00:00:00Z');
  const finding = { package: 'b', advisory: 1 };
  eq(exceptionStatus(finding, [], today).ok, false, 'no exception fails');
  eq(exceptionStatus(finding, [{ package: 'b', advisory: 1, reason: 'dev-only server path never exposed to visitors', reviewed: '2026-10-01' }], today).ok, true, 'a reviewed exception passes');
  eq(exceptionStatus(finding, [{ package: 'b', advisory: 1, reason: 'dev-only server path never exposed to visitors', reviewed: '2026-01-01' }], today).ok, false, 'a stale exception fails');
  eq(exceptionStatus(finding, [{ package: 'b', advisory: 1, reason: 'ok', reviewed: '2026-10-01' }], today).ok, false, 'a reason-less exception fails');
}

runCanaries();
console.log('PASS canaries :: range matching, lock resolution, closure, advisory intersection and exception expiry');

const artifactPkg = JSON.parse(fs.readFileSync(path.join(ROOT, ARTIFACT_DIR, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
const packages = lock.packages ?? {};
const declared = {
  ...(artifactPkg.peerDependencies ?? {}),
  ...(artifactPkg.dependencies ?? {}),
  ...(artifactPkg.devDependencies ?? {}),
};
const failures = [];
const roots = [];
for (const [name, range] of Object.entries(declared)) {
  const lockPath = `node_modules/${name}`;
  const entry = packages[lockPath];
  if (!entry) {
    failures.push({ kind: 'artifact-unlocked', message: `${ARTIFACT_DIR} declares ${name}@${range} but package-lock.json has no ${lockPath} — the preview's tree is not locked` });
    continue;
  }
  const ok = satisfies(entry.version, range);
  if (ok !== true) {
    failures.push({ kind: 'artifact-lock-mismatch', message: `${ARTIFACT_DIR} declares ${name}@${range} but the lock resolves ${entry.version}` });
    continue;
  }
  roots.push(lockPath);
}
const { paths: closure, missing } = closureOf(packages, roots);
for (const m of missing) failures.push({ kind: 'artifact-lock-incomplete', message: `required dependency not in the lock: ${m}` });
console.log(`PASS artifact-lock :: ${roots.length}/${Object.keys(declared).length} declared dependencies resolve in package-lock.json; transitive closure ${closure.size} package(s)`);

let report;
let auditSource;
if (process.env.AUDIT_JSON) {
  report = JSON.parse(fs.readFileSync(process.env.AUDIT_JSON, 'utf8'));
  auditSource = `saved report ${process.env.AUDIT_JSON}`;
} else {
  const res = spawnSync('npm', ['audit', '--json', '--package-lock-only'], { cwd: ROOT, encoding: 'utf8', timeout: 180_000, maxBuffer: 64 * 1024 * 1024 });
  try {
    report = JSON.parse(res.stdout);
  } catch {
    report = null;
  }
  if (!report || report.error || !report.vulnerabilities) {
    const why = report?.error?.summary ?? res.error?.message ?? (res.stderr || '').trim().split('\n').slice(-2).join(' ');
    console.error(`INCONCLUSIVE artifact-dependency-audit :: the npm advisory service gave no usable report (${why || `exit ${res.status}`}).`);
    console.error('       An outage is not a verdict: exit 2 lets CI warn and rerun instead of blaming a dependency.');
    if (evidenceArg) writeEvidence({ verdict: 'inconclusive', error: why, stderr: String(res.stderr ?? '').slice(0, 2000) });
    process.exit(2);
  }
  auditSource = 'npm audit --package-lock-only (live advisory database)';
}

let exceptions = [];
if (fs.existsSync(EXCEPTIONS_PATH)) exceptions = JSON.parse(fs.readFileSync(EXCEPTIONS_PATH, 'utf8')).exceptions ?? [];
const today = new Date();
const findings = findingsInClosure(report.vulnerabilities, closure);
const relevant = findings.filter((f) => SEVERITY_RANK[f.severity] >= SEVERITY_RANK[POLICY_MIN_SEVERITY]);
const reviewed = [];
for (const finding of relevant) {
  const status = exceptionStatus(finding, exceptions, today);
  if (status.ok) reviewed.push({ ...finding, exception: status });
  else failures.push({ kind: 'artifact-advisory', finding, message: `${finding.severity.toUpperCase()} ${finding.package} (${finding.range}) — ${finding.title} ${finding.url} — at ${finding.nodes.join(', ')}; ${status.why}` });
}
const usedKeys = new Set(relevant.map((f) => `${f.package}#${f.advisory}`));
for (const ex of exceptions) {
  if (!usedKeys.has(`${ex.package}#${ex.advisory}`)) {
    failures.push({ kind: 'artifact-exception-unused', message: `exception for ${ex.package} advisory ${ex.advisory} matches nothing in the artifact tree any more — delete it` });
  }
}

function writeEvidence(extra = {}) {
  const evidencePath = path.resolve(evidenceArg.slice('--evidence='.length));
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(
    evidencePath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), artifact: ARTIFACT_DIR, policyMinSeverity: POLICY_MIN_SEVERITY, closureSize: closure.size, ...extra }, null, 2)}\n`,
  );
  console.log(`       evidence written to ${evidencePath}`);
}

console.log(`PROBE advisories :: ${auditSource}: ${Object.keys(report.vulnerabilities).length} vulnerable package(s) repo-wide, ${findings.length} advisory hit(s) inside the artifact closure`);
for (const f of findings) console.log(`       ${f.severity.padEnd(8)} ${f.package.padEnd(28)} ${f.advisory} ${f.title}`);
for (const r of reviewed) console.log(`NOTE reviewed-exception :: ${r.package} ${r.advisory} (${r.severity}) — ${r.exception.why} [reviewed ${r.exception.reviewed}]`);
if (evidenceArg) writeEvidence({ verdict: failures.length ? 'fail' : 'pass', findings, reviewed, failures });

if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f.kind} :: ${f.message}`);
  console.error(`\n${failures.length} artifact dependency failure(s). Patch within the declared range (npm update <pkg>),`);
  console.error(`or record a reviewed exception in ${path.relative(ROOT, EXCEPTIONS_PATH)} with a concrete reason.`);
  process.exit(1);
}
console.log(`PASS artifact-dependency-audit :: no ${POLICY_MIN_SEVERITY}+ advisory in the preview's ${closure.size}-package tree without a reviewed exception`);
