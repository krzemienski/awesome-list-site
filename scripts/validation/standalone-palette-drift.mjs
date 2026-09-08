#!/usr/bin/env node
// Automated Stage 5 hardcoded-value gate for standalone UI surfaces.
//
// Standalone exports have their own legacy inventory, so they use a separate
// shrink-only baseline. The detector definitions and DS-OK parser are shared
// with palette-drift.mjs; only the roots and token-source exclusions differ.
//
// Usage:
//   node scripts/validation/standalone-palette-drift.mjs
//   node scripts/validation/standalone-palette-drift.mjs --update-baseline
//   node scripts/validation/standalone-palette-drift.mjs --update-baseline --init

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DS_OK_LOOKBACK,
  STAGE5_SCANS,
  hasBareDsOkTag,
  hasDsOkTag,
  lineHasBareDsOkTag,
  lineHasReasonedDsOkTag,
} from './design-system-stage5.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILL_PATH = path.join(ROOT, '.agents/skills/verify-design-system/SKILL.md');
const STANDALONE_SCOPE = {
  roots: ['awesome-list-site-ds', 'artifacts/*/.replit-artifact/artifact.toml'],
  sourceExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.scss', '.html', '.svg', '.md'],
  ignoredDirectories: ['.git', 'dist', 'node_modules', 'uploads', 'docs'],
  tokenSourceExclusions: ['**/design-system.css', 'awesome-list-site-ds/styles.css', 'artifacts/*/src/index.css'],
  unmanifestedArtifactExclusions: [
    {
      path: 'artifacts/r6',
      reason: 'release-audit evidence bundle containing claims Markdown and screenshots, not a runnable UI artifact',
    },
  ],
};
const LEGACY_ROOT_REL = STANDALONE_SCOPE.roots.find((root) => !root.includes('*'));
const MANIFEST_ROOT_PATTERN = STANDALONE_SCOPE.roots.find((root) => root.includes('*'));
const ARTIFACTS_ROOT = path.join(ROOT, MANIFEST_ROOT_PATTERN.split('/*/')[0]);
const BASELINE_PATH = path.join(ROOT, 'scripts/validation/standalone-palette-drift-baseline.json');
const SOURCE_EXTS = new Set(STANDALONE_SCOPE.sourceExtensions);
const IGNORED_DIRS = new Set(STANDALONE_SCOPE.ignoredDirectories);
const UPDATE = process.argv.includes('--update-baseline');

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`canary: ${label} → ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
}

function emptyCounts() {
  const counts = {};
  for (const scan of STAGE5_SCANS) counts[scan.id] = {};
  return counts;
}

// Detector and ratchet canaries run on every invocation. In particular, the
// two ratchet cases prove that a new hardcoded value fails even beside a
// legacy value, and that a cleanup fails until the baseline is reduced.
function runCanaries() {
  const scan = (id) => STAGE5_SCANS.find((candidate) => candidate.id === id);
  const tokens = (id, source, line = 0) => scan(id).lineTokens(source.split('\n'), line);

  assertEqual(tokens('palette-classes', 'className="bg-red-500 text-blue-300"'), ['bg-red-500', 'text-blue-300'], 'palette detector');
  assertEqual(tokens('hex-colors', 'color: #34d08c'), ['#34d08c'], 'hex detector');
  assertEqual(tokens('rgb-colors', 'background: rgba(20, 20, 26, 0.8)'), ['rgba(20,20,26,0.8)'], 'rgb detector');
  assertEqual(tokens('rgb-colors', 'background: rgba(var(--surface-rgb), 0.8)'), [], 'token-derived rgb detector');
  assertEqual(tokens('raw-radii', 'border: 2px solid #fff'), ['border: 2px'], 'border-width detector');
  assertEqual(tokens('font-family', "font-family: 'Georgia', serif"), ["font-family: 'georgia', serif"], 'font detector');
  assertEqual(
    tokens('font-family', "font-family: 'Georgia', serif; font-family: 'Inter', sans-serif"),
    ["font-family: 'georgia', serif", "font-family: 'inter', sans-serif"],
    'font detector identities include the family stack',
  );

  assertEqual(lineHasBareDsOkTag('/* DS-OK */'), true, 'bare block marker');
  assertEqual(lineHasBareDsOkTag('// DS-OK: !!!'), true, 'punctuation-only line marker');
  assertEqual(lineHasReasonedDsOkTag('/* DS-OK: fixed export brand paint */'), true, 'reasoned block marker');
  assertEqual(hasDsOkTag(['/* DS-OK: fixed export brand paint */', 'a', 'b', 'c', 'd', 'value'], 5), true, 'five-line lookback');
  assertEqual(hasDsOkTag(['/* DS-OK */', 'a', 'b', 'c', 'd', 'value'], 5), false, 'bare marker is not an exemption');
  assertEqual(
    isBareMarkerFinding(path.join(ROOT, 'artifacts/example/my-design-system.css'), '/* DS-OK */'),
    true,
    'similarly suffixed consumer stylesheet remains scanned and reports a bare marker',
  );
  assertEqual(DS_OK_LOOKBACK, 5, 'shared lookback limit');
  assertEqual(
    collectBareMarkersFromLines(path.join(ROOT, 'surface.tsx'), ['/* DS-OK */', 'const value = true;']).map((finding) => finding.line),
    [1],
    'bare marker fails without an attached hardcoded value',
  );
  assertEqual(
    collectBareMarkersFromLines(path.join(ROOT, 'surface.tsx'), ['/* DS-OK: fixed export brand paint */']).length,
    0,
    'reasoned marker is accepted by standalone-wide pass',
  );
  assertEqual(isDesignSystemSource(path.join(ROOT, 'artifacts/example/design-system.css')), true, 'design-system token source exclusion');
  assertEqual(isDesignSystemSource(path.join(ROOT, 'artifacts/example/src/index.css')), true, 'artifact token source exclusion');
  assertEqual(isDesignSystemSource(path.join(ROOT, 'artifacts/example/src/my-design-system.css')), false, 'suffixed consumer stylesheet stays scanned');

  const baseline = emptyCounts();
  baseline['hex-colors']['surface.tsx'] = { '#34d08c': 1 };
  const added = structuredClone(baseline);
  added['hex-colors']['surface.tsx']['#ff3d52'] = 1;
  let diff = diffAgainstBaseline(baseline, added);
  assertEqual(diff.increases.map(formatDiff), ['hex-colors|surface.tsx|#ff3d52|0->1'], 'new hardcoded value fails');
  assertEqual(diff.decreases, [], 'new hardcoded value has no cleanup');

  const removed = emptyCounts();
  diff = diffAgainstBaseline(baseline, removed);
  assertEqual(diff.increases, [], 'removed legacy value has no regression');
  assertEqual(diff.decreases.map(formatDiff), ['hex-colors|surface.tsx|#34d08c|1->0'], 'removed legacy value requires ratchet');
  assertEqual(classifyUpdate(baseline, added, false).shouldWrite, false, 'new value refuses baseline update');
  assertEqual(classifyUpdate(baseline, removed, false).shouldWrite, true, 'cleanup allows baseline ratchet');

  const canaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'standalone-palette-unmanifested-canary-'));
  try {
    fs.mkdirSync(path.join(canaryRoot, 'new-mockup', 'src'), { recursive: true });
    fs.writeFileSync(path.join(canaryRoot, 'new-mockup', 'src', 'App.tsx'), 'export default function App() { return null; }\n');
    fs.mkdirSync(path.join(canaryRoot, 'manifested', '.replit-artifact'), { recursive: true });
    fs.writeFileSync(path.join(canaryRoot, 'manifested', '.replit-artifact', 'artifact.toml'), 'kind = "design"\n');
    fs.writeFileSync(path.join(canaryRoot, 'manifested', 'index.html'), '<main></main>\n');
    assertEqual(
      findUnmanifestedSourceDirectories(canaryRoot, []),
      [path.join(canaryRoot, 'new-mockup')],
      'unmanifested source-bearing mockup detector',
    );
  } finally {
    fs.rmSync(canaryRoot, { recursive: true, force: true });
  }
}

function formatDiff(value) {
  return `${value.scanId}|${value.rel}|${value.token}|${value.base}->${value.cur}`;
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

function extractDocumentedScope(skillText) {
  const marker = '<!-- standalone-palette-drift-scope';
  const markerIndex = skillText.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`could not find the standalone scan scope contract in ${path.relative(ROOT, SKILL_PATH)}`);
  }

  const endIndex = skillText.indexOf('-->', markerIndex);
  if (endIndex === -1) {
    throw new Error(`could not find the end of the standalone scan scope contract in ${path.relative(ROOT, SKILL_PATH)}`);
  }

  const section = skillText.slice(markerIndex + marker.length, endIndex);
  const documented = {};
  for (const [, key, rawValue] of section.matchAll(/^\s*>?\s*(roots|sourceExtensions|ignoredDirectories|tokenSourceExclusions|unmanifestedArtifactExclusions)\s*=\s*(\[[^\n]+\])\s*$/gm)) {
    documented[key] = JSON.parse(rawValue);
  }

  const missing = Object.keys(STANDALONE_SCOPE).filter((key) => !Object.hasOwn(documented, key));
  if (missing.length) {
    throw new Error(`standalone scan scope contract is missing ${missing.join(', ')} in ${path.relative(ROOT, SKILL_PATH)}`);
  }

  return {
    values: documented,
    line: lineNumberAt(skillText, markerIndex),
  };
}

function checkStandaloneScopeParity() {
  const skillText = fs.readFileSync(SKILL_PATH, 'utf8');
  const documented = extractDocumentedScope(skillText);
  const mismatches = Object.keys(STANDALONE_SCOPE).filter((key) =>
    JSON.stringify(documented.values[key]) !== JSON.stringify(STANDALONE_SCOPE[key]),
  );

  if (!skillText.includes('npm run validate:standalone-palette-drift')) {
    mismatches.push('validator command');
  }

  if (mismatches.length) {
    console.error('FAIL standalone-scope-parity :: documented and executable artifact scan contracts differ');
    console.error(`  documented ${path.relative(ROOT, SKILL_PATH)}:${documented.line}`);
    for (const key of mismatches) {
      if (key === 'validator command') {
        console.error('    validator command: missing `npm run validate:standalone-palette-drift`');
      } else {
        console.error(`    ${key}: documented ${JSON.stringify(documented.values[key])}, executable ${JSON.stringify(STANDALONE_SCOPE[key])}`);
      }
    }
    console.error('  Update the guidance and executable scope together so standalone audits cannot drift.');
    process.exit(1);
  }

  console.log(
    `PASS standalone-scope-parity :: ${path.relative(ROOT, SKILL_PATH)}:${documented.line} matches ` +
      'the executable artifact discovery and exclusion contract',
  );
}

function hasArtifactManifest(dir) {
  return fs.existsSync(path.join(dir, '.replit-artifact', 'artifact.toml'));
}

function hasSourceFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && hasSourceFiles(full)) return true;
    if (entry.isFile() && SOURCE_EXTS.has(path.extname(entry.name).toLowerCase())) return true;
  }
  return false;
}

function findUnmanifestedSourceDirectories(artifactsRoot, exclusions = STANDALONE_SCOPE.unmanifestedArtifactExclusions) {
  if (!fs.existsSync(artifactsRoot)) return [];
  const excludedPaths = new Set(exclusions.map((exclusion) => path.resolve(ROOT, exclusion.path)));
  return fs.readdirSync(artifactsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(artifactsRoot, entry.name))
    .filter((artifactRoot) =>
      !hasArtifactManifest(artifactRoot) &&
      !excludedPaths.has(path.resolve(artifactRoot)) &&
      hasSourceFiles(artifactRoot),
    )
    .sort();
}

function discoverRoots() {
  const roots = [];
  const legacyStandalone = path.join(ROOT, LEGACY_ROOT_REL);
  if (fs.existsSync(legacyStandalone)) roots.push(legacyStandalone);

  if (fs.existsSync(ARTIFACTS_ROOT)) {
    for (const entry of fs.readdirSync(ARTIFACTS_ROOT, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const artifactRoot = path.join(ARTIFACTS_ROOT, entry.name);
      if (hasArtifactManifest(artifactRoot)) roots.push(artifactRoot);
    }
  }

  return [...new Set(roots)].sort();
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (SOURCE_EXTS.has(path.extname(entry.name).toLowerCase())) yield full;
  }
}

function isDesignSystemSource(file) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/').toLowerCase();
  // These files are the standalone token sources themselves, not consumers.
  // Keep the exclusion narrow so a bare tag in an exported page or component
  // cannot hide behind a whole directory/file allowlist.
  return STANDALONE_SCOPE.tokenSourceExclusions.some((exclusion) => {
    const normalized = exclusion.toLowerCase();
    if (normalized.startsWith('**/')) {
      return path.posix.basename(relative) === normalized.slice(3);
    }
    if (!normalized.includes('*')) return relative === normalized;
    const pattern = normalized
      .split('/')
      .map((segment) => segment === '*' ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('/');
    return new RegExp(`^${pattern}$`).test(relative);
  });
}

function isBareMarkerFinding(file, line) {
  return !isDesignSystemSource(file) && lineHasBareDsOkTag(line);
}

function collectBareMarkersFromLines(file, lines) {
  const findings = [];
  const relative = path.relative(ROOT, file);
  for (let i = 0; i < lines.length; i++) {
    if (!isBareMarkerFinding(file, lines[i])) continue;
    findings.push({
      file: relative,
      line: i + 1,
      text: lines[i].trim().slice(0, 160),
    });
  }
  return findings;
}

function collect(roots) {
  const hits = {};
  const counts = emptyCounts();
  const bareMarkers = [];
  let fileCount = 0;
  for (const scan of STAGE5_SCANS) hits[scan.id] = {};

  for (const root of roots) {
    for (const file of walk(root)) {
      if (isDesignSystemSource(file)) continue;
      fileCount++;
      const relative = path.relative(ROOT, file);
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      bareMarkers.push(...collectBareMarkersFromLines(file, lines));
      for (const scan of STAGE5_SCANS) {
        for (let i = 0; i < lines.length; i++) {
          for (const token of scan.lineTokens(lines, i)) {
            (hits[scan.id][relative] ??= []).push({
              line: i + 1,
              token,
              text: lines[i].trim().slice(0, 160),
              missingDsOkReason: hasBareDsOkTag(lines, i),
            });
            const perFile = (counts[scan.id][relative] ??= {});
            perFile[token] = (perFile[token] ?? 0) + 1;
          }
        }
      }
    }
  }

  for (const scanId of Object.keys(counts)) {
    const sortedFiles = {};
    for (const relative of Object.keys(counts[scanId]).sort()) {
      const sortedTokens = {};
      for (const token of Object.keys(counts[scanId][relative]).sort()) {
        sortedTokens[token] = counts[scanId][relative][token];
      }
      sortedFiles[relative] = sortedTokens;
    }
    counts[scanId] = sortedFiles;
  }
  return { hits, counts, bareMarkers, fileCount };
}

function diffAgainstBaseline(baseline, counts) {
  const increases = [];
  const decreases = [];
  for (const scan of STAGE5_SCANS) {
    const current = counts[scan.id] ?? {};
    const pinned = baseline[scan.id] ?? {};
    for (const relative of [...new Set([...Object.keys(current), ...Object.keys(pinned)])].sort()) {
      const currentTokens = current[relative] ?? {};
      const pinnedTokens = pinned[relative] ?? {};
      for (const token of [...new Set([...Object.keys(currentTokens), ...Object.keys(pinnedTokens)])].sort()) {
        const currentCount = currentTokens[token] ?? 0;
        const pinnedCount = pinnedTokens[token] ?? 0;
        if (currentCount > pinnedCount) {
          increases.push({ scanId: scan.id, rel: relative, token, cur: currentCount, base: pinnedCount });
        } else if (currentCount < pinnedCount) {
          decreases.push({ scanId: scan.id, rel: relative, token, cur: currentCount, base: pinnedCount });
        }
      }
    }
  }
  return { increases, decreases };
}

function classifyUpdate(prior, counts, init) {
  const missing = STAGE5_SCANS
    .map((scan) => scan.id)
    .filter((id) => !Object.prototype.hasOwnProperty.call(prior, id));
  let { increases, decreases } = diffAgainstBaseline(prior, counts);
  if (init) increases = increases.filter((value) => !missing.includes(value.scanId));
  const initSections = init ? missing : [];
  return {
    increases,
    decreases,
    initSections,
    shouldWrite: !increases.length && (decreases.length > 0 || initSections.length > 0),
  };
}

function totalOf(counts) {
  return Object.values(counts).reduce(
    (total, files) => total + Object.values(files).reduce(
      (fileTotal, tokens) => fileTotal + Object.values(tokens).reduce((sum, count) => sum + count, 0),
      0,
    ),
    0,
  );
}

checkStandaloneScopeParity();
runCanaries();
console.log('PASS canaries :: standalone Stage 5 detectors, unmanifested-artifact discovery, DS-OK parser, and shrink-only ratchet verified');

const unmanifestedSourceDirectories = findUnmanifestedSourceDirectories(ARTIFACTS_ROOT);
for (const directory of unmanifestedSourceDirectories) {
  console.error(`FAIL unmanifested-artifact :: ${path.relative(ROOT, directory)} contains source files but has no .replit-artifact/artifact.toml`);
}
if (unmanifestedSourceDirectories.length) {
  console.error(`\n${unmanifestedSourceDirectories.length} source-bearing top-level artifact director${unmanifestedSourceDirectories.length === 1 ? 'y is' : 'ies are'} outside standalone design-system validation.`);
  console.error('Add an artifact manifest, or add an exact-path exclusion with a written reason to the executable and documented scope contracts.');
  process.exit(1);
}
console.log(
  `PASS artifact-manifest-coverage :: every source-bearing top-level artifacts/ directory is manifested or one of ` +
  `${STANDALONE_SCOPE.unmanifestedArtifactExclusions.length} narrow documented exclusion(s)`,
);

const roots = discoverRoots();
if (!roots.length) {
  console.error('FAIL standalone-palette-drift :: no standalone artifact roots discovered');
  console.error('       Expected awesome-list-site-ds or an artifacts/*/.replit-artifact/artifact.toml root.');
  process.exit(1);
}

const { hits, counts, bareMarkers, fileCount } = collect(roots);

for (const finding of bareMarkers) {
  console.error(`FAIL standalone-ds-ok :: ${finding.file}:${finding.line}: ${finding.text}`);
  console.error('       DS-OK tag is missing a written reason; add text after DS-OK or remove the tag.');
}
if (bareMarkers.length) {
  console.error(`\n${bareMarkers.length} standalone DS-OK marker(s) are missing written reasons.`);
  console.error('A valid exception must use /* DS-OK: written reason */ at the definition site.');
  process.exit(1);
}

if (UPDATE) {
  const init = process.argv.includes('--init');
  const exists = fs.existsSync(BASELINE_PATH);
  if (!exists && !init) {
    console.error('FAIL update-baseline :: no existing baseline to ratchet. First-time initialization');
    console.error('     must be explicit: node scripts/validation/standalone-palette-drift.mjs --update-baseline --init');
    process.exit(1);
  }
  if (exists) {
    const prior = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    const { increases, decreases, initSections, shouldWrite } = classifyUpdate(prior, counts, init);
    if (increases.length) {
      console.error('FAIL update-baseline :: REFUSING to write — the standalone allowlist only ever shrinks.');
      console.error('     Fix new values first, then retry the ratchet:');
      for (const value of increases) {
        console.error(`       ${value.scanId} :: ${value.rel} — "${value.token}" ×${value.cur}, baseline allows ×${value.base}`);
      }
      if (increases.some((value) => !Object.prototype.hasOwnProperty.call(prior, value.scanId))) {
        console.error('     A newly added detector section requires --init for its first explicit baseline.');
      }
      process.exit(1);
    }
    if (!shouldWrite) {
      console.log('update-baseline :: nothing to ratchet — counts already equal the baseline.');
      if (!init) console.log('     (initializing a newly added detector section additionally requires --init)');
      process.exit(0);
    }
    if (initSections.length) console.log(`update-baseline :: initializing new detector section(s): ${initSections.join(', ')}`);
  }
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(counts, null, 2) + '\n');
  console.log(`baseline ${exists ? 'ratcheted down' : 'initialized'} at ${path.relative(ROOT, BASELINE_PATH)} (${totalOf(counts)} legacy matches pinned)`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE_PATH)) {
  console.error('FAIL :: baseline missing — run: node scripts/validation/standalone-palette-drift.mjs --update-baseline --init');
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
const { increases, decreases } = diffAgainstBaseline(baseline, counts);

for (const value of increases) {
  console.error(`FAIL ${value.scanId} :: ${value.rel} — "${value.token}" ×${value.cur}, baseline allows ×${value.base} (${STAGE5_SCANS.find((scan) => scan.id === value.scanId).label})`);
  for (const hit of (hits[value.scanId]?.[value.rel] ?? []).filter((candidate) => candidate.token === value.token)) {
    console.error(`       ${value.rel}:${hit.line}: ${hit.text}`);
    if (hit.missingDsOkReason) {
      console.error('       DS-OK tag is missing a written reason; add text after DS-OK or remove the tag.');
    }
  }
}
for (const value of decreases) {
  console.error(`FAIL ${value.scanId} :: ${value.rel} — "${value.token}" down to ×${value.cur} from baseline ×${value.base}. Good news, but`);
  console.error('       the standalone allowlist must ratchet DOWN so the cleaned value cannot return:');
  console.error('       run: node scripts/validation/standalone-palette-drift.mjs --update-baseline (then commit the baseline)');
}

if (increases.length || decreases.length) {
  console.error(`\n${increases.length + decreases.length} standalone Stage 5 failure(s) (${increases.length} regression(s), ${decreases.length} unratcheted cleanup(s)).`);
  console.error('The standalone Stage 5 allowlist only ever shrinks.');
  process.exit(1);
}

for (const scan of STAGE5_SCANS) {
  const files = Object.keys(counts[scan.id]).length;
  const total = Object.values(counts[scan.id]).reduce(
    (sum, tokens) => sum + Object.values(tokens).reduce((fileTotal, count) => fileTotal + count, 0),
    0,
  );
  console.log(`PASS ${scan.id} :: ${total} legacy match(es) across ${files} file(s), all pinned at baseline`);
}
console.log(`\nPASS standalone-palette-drift :: ${roots.length} root(s), ${fileCount} source file(s); no new hardcoded design values`);
for (const root of roots) console.log(`  scanned ${path.relative(ROOT, root)}`);