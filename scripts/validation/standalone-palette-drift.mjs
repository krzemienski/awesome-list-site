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

import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { inflateRawSync } from 'zlib';
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
  roots: ['artifacts/*/.replit-artifact/artifact.toml'],
  sourceExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.scss', '.html', '.svg', '.md'],
  ignoredDirectories: ['.git', 'dist', 'node_modules', 'uploads', 'docs'],
  tokenSourceExclusions: ['**/design-system.css', 'artifacts/*/src/index.css'],
  unmanifestedArtifactExclusions: [
    {
      path: 'artifacts/r6',
      reason: 'release-audit evidence bundle containing claims Markdown and screenshots, not a runnable UI artifact',
    },
  ],
  // Reference material that is contractually kept byte-identical to an
  // external upload. It is never served, cannot take tokens or DS-OK tags,
  // and its UI is validated through the registered artifact that ports it.
  frozenReferenceRoots: [
    {
      path: 'awesome-list-site-ds',
      reason: 'canonical design archive kept byte-identical to the upload; validated through its registered artifact port',
    },
  ],
};
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

  runFrozenReferenceCanaries();
}

/**
 * Build a minimal stored-method zip in memory (local headers, central
 * directory, EOCD) so the frozen-reference checker can be exercised without
 * touching the real archive. `patch` lets a canary corrupt specific fields.
 */
function buildStoredZip(files, patch = () => {}) {
  const locals = [];
  const centrals = [];
  let cursor = 0;
  for (const [name, body] of files) {
    const nameBuffer = Buffer.from(name, 'utf8');
    const content = Buffer.from(body);
    const local = Buffer.alloc(30 + nameBuffer.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    nameBuffer.copy(local, 30);
    const central = Buffer.alloc(46 + nameBuffer.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(cursor, 42);
    nameBuffer.copy(central, 46);
    locals.push(local, content);
    centrals.push(central);
    cursor += local.length + content.length;
  }
  const centralStart = cursor;
  const centralBuffer = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuffer.length, 12);
  eocd.writeUInt32LE(centralStart, 16);
  const zip = Buffer.concat([...locals, centralBuffer, eocd]);
  patch(zip, { centralStart, eocd: zip.length - 22 });
  return zip;
}

function assertThrows(fn, pattern, label) {
  let caught;
  try { fn(); } catch (error) { caught = error; }
  if (!caught || !pattern.test(String(caught.message))) {
    console.error(`FAIL canary :: ${label} — expected an error matching ${pattern}, got ${caught ? JSON.stringify(caught.message) : 'no error'}`);
    process.exit(1);
  }
}

function runFrozenReferenceCanaries() {
  const sample = [['a.txt', 'alpha\n'], ['nested/b.css', 'b { color: red }\n'], ['nested/', '']];
  const parsed = readZipEntries(buildStoredZip(sample));
  assertEqual([...parsed.keys()], ['a.txt', 'nested/b.css'], 'zip parser skips directory entries and keeps files');
  assertEqual(parsed.get('a.txt'), sha256(Buffer.from('alpha\n')), 'zip parser hashes stored content');
  assertThrows(() => readZipEntries(buildStoredZip([['dup.txt', '1'], ['dup.txt', '1']])), /duplicate entry/, 'duplicate archive members are rejected');
  assertThrows(() => readZipEntries(buildStoredZip([])), /no entries/, 'an empty archive is rejected');
  assertThrows(() => readZipEntries(buildStoredZip([['../escape.txt', 'x']])), /unsafe entry name/, 'path traversal names are rejected');
  assertThrows(
    () => readZipEntries(buildStoredZip([['a.txt', 'alpha']], (zip, { eocd }) => zip.writeUInt16LE(0xffff, eocd + 10))),
    /zip64/,
    'zip64 EOCD sentinel is rejected',
  );
  assertThrows(
    () => readZipEntries(buildStoredZip([['a.txt', 'alpha']], (zip, { centralStart }) => zip.writeUInt32LE(0xffffffff, centralStart + 20))),
    /zip64 sentinel/,
    'zip64 per-entry size sentinel is rejected',
  );
  assertThrows(
    () => readZipEntries(buildStoredZip([['a.txt', 'alpha']], (zip, { centralStart }) => zip.writeUInt32LE(3, centralStart + 24))),
    /header says 3/,
    'size mismatch between header and content is rejected',
  );

  const canaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'standalone-palette-frozen-canary-'));
  try {
    fs.mkdirSync(path.join(canaryRoot, 'nested'));
    fs.writeFileSync(path.join(canaryRoot, 'a.txt'), 'alpha\n');
    fs.symlinkSync(path.join(canaryRoot, 'a.txt'), path.join(canaryRoot, 'nested', 'b.css'));
    const listing = listFilesRecursively(canaryRoot);
    assertEqual(listing.files, ['a.txt'], 'directory walk lists regular files only');
    assertEqual(listing.irregular, ['nested/b.css: symbolic link'], 'directory walk reports symlinks instead of following them');
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
  for (const [, key, rawValue] of section.matchAll(/^\s*>?\s*(roots|sourceExtensions|ignoredDirectories|tokenSourceExclusions|unmanifestedArtifactExclusions|frozenReferenceRoots)\s*=\s*(\[[^\n]+\])\s*$/gm)) {
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

// ─── Frozen reference roots ────────────────────────────────────────────────
// A root may only be excluded from the scan while it is provably still the
// external upload it mirrors. The archive path and digest come from the
// sync record; entries are hashed straight out of the zip (stored or
// deflated members; the archive is far below zip64 sizes) and compared with
// the working tree, so an edited, missing or extra file fails the gate and
// the directory has to be either restored or treated as a scanned surface.
const SYNC_RECORD_PATH = path.join(ROOT, 'docs/parity/source-sync.json');

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function readZipEntries(zipBuffer) {
  const EOCD_SIG = 0x06054b50;
  const CENTRAL_SIG = 0x02014b50;
  const LOCAL_SIG = 0x04034b50;
  const ZIP64_EXTRA_ID = 0x0001;
  const SENTINEL16 = 0xffff;
  const SENTINEL32 = 0xffffffff;
  let eocd = -1;
  for (let i = zipBuffer.length - 22; i >= Math.max(0, zipBuffer.length - 22 - 0xffff); i--) {
    if (zipBuffer.readUInt32LE(i) === EOCD_SIG) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error('zip: end-of-central-directory record not found');
  const diskNumber = zipBuffer.readUInt16LE(eocd + 4);
  const entryCount = zipBuffer.readUInt16LE(eocd + 10);
  const centralSize = zipBuffer.readUInt32LE(eocd + 12);
  let offset = zipBuffer.readUInt32LE(eocd + 16);
  if (diskNumber === SENTINEL16 || entryCount === SENTINEL16 || centralSize === SENTINEL32 || offset === SENTINEL32) {
    throw new Error('zip: zip64 archives are not supported');
  }
  if (entryCount === 0) throw new Error('zip: archive has no entries');
  const entries = new Map();
  for (let index = 0; index < entryCount; index++) {
    if (zipBuffer.readUInt32LE(offset) !== CENTRAL_SIG) throw new Error(`zip: bad central directory entry at ${offset}`);
    const method = zipBuffer.readUInt16LE(offset + 10);
    const compressedSize = zipBuffer.readUInt32LE(offset + 20);
    const uncompressedSize = zipBuffer.readUInt32LE(offset + 24);
    const nameLength = zipBuffer.readUInt16LE(offset + 28);
    const extraLength = zipBuffer.readUInt16LE(offset + 30);
    const commentLength = zipBuffer.readUInt16LE(offset + 32);
    const entryDisk = zipBuffer.readUInt16LE(offset + 34);
    const localOffset = zipBuffer.readUInt32LE(offset + 42);
    const name = zipBuffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    const extra = zipBuffer.subarray(offset + 46 + nameLength, offset + 46 + nameLength + extraLength);
    for (let cursor = 0; cursor + 4 <= extra.length; cursor += 4 + extra.readUInt16LE(cursor + 2)) {
      if (extra.readUInt16LE(cursor) === ZIP64_EXTRA_ID) throw new Error(`zip: zip64 extra field on ${name} is not supported`);
    }
    if (compressedSize === SENTINEL32 || uncompressedSize === SENTINEL32 || localOffset === SENTINEL32 || entryDisk === SENTINEL16) {
      throw new Error(`zip: zip64 sentinel on ${name} is not supported`);
    }
    offset += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith('/')) continue;
    if (name.startsWith('/') || name.split('/').some((segment) => segment === '..' || segment === '')) {
      throw new Error(`zip: unsafe entry name ${JSON.stringify(name)}`);
    }
    if (entries.has(name)) throw new Error(`zip: duplicate entry ${name}`);
    if (zipBuffer.readUInt32LE(localOffset) !== LOCAL_SIG) throw new Error(`zip: bad local header for ${name}`);
    const dataStart = localOffset + 30 + zipBuffer.readUInt16LE(localOffset + 26) + zipBuffer.readUInt16LE(localOffset + 28);
    if (dataStart + compressedSize > zipBuffer.length) throw new Error(`zip: entry ${name} runs past the end of the archive`);
    const raw = zipBuffer.subarray(dataStart, dataStart + compressedSize);
    let content;
    if (method === 0) content = raw;
    else if (method === 8) content = inflateRawSync(raw);
    else throw new Error(`zip: unsupported compression method ${method} for ${name}`);
    if (content.length !== uncompressedSize) throw new Error(`zip: entry ${name} inflated to ${content.length} bytes, header says ${uncompressedSize}`);
    entries.set(name, sha256(content));
  }
  return entries;
}

/**
 * Every non-directory entry under `dir`, as archive-style relative paths.
 * Symlinks and other special files are reported separately: `readFileSync`
 * would follow a symlink to identical bytes, so a link is NOT byte-identical
 * to a regular file even when the hashes agree.
 */
function listFilesRecursively(dir, base = dir) {
  const files = [];
  const irregular = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full).split(path.sep).join('/');
    if (entry.isSymbolicLink()) irregular.push(`${rel}: symbolic link`);
    else if (entry.isDirectory()) {
      const nested = listFilesRecursively(full, base);
      files.push(...nested.files);
      irregular.push(...nested.irregular);
    } else if (entry.isFile()) files.push(rel);
    else irregular.push(`${rel}: not a regular file`);
  }
  return { files, irregular };
}

function checkFrozenReferenceRoots() {
  const syncRecord = JSON.parse(fs.readFileSync(SYNC_RECORD_PATH, 'utf8'));
  const archivePath = path.join(ROOT, syncRecord.archive.path);
  const zipBuffer = fs.readFileSync(archivePath);
  const zipDigest = sha256(zipBuffer);
  if (!/^[0-9a-f]{64}$/.test(syncRecord.archive?.sha256 ?? '')) {
    console.error(`FAIL frozen-reference :: ${path.relative(ROOT, SYNC_RECORD_PATH)} lacks a pinned archive.sha256`);
    process.exit(1);
  }
  if (zipDigest !== syncRecord.archive.sha256) {
    console.error(`FAIL frozen-reference :: ${syncRecord.archive.path} sha256 ${zipDigest} does not match ${path.relative(ROOT, SYNC_RECORD_PATH)} (${syncRecord.archive.sha256})`);
    process.exit(1);
  }
  const archiveEntries = readZipEntries(zipBuffer);
  const expectedEntries = syncRecord.archive.originalEntries;
  if (!Number.isInteger(expectedEntries) || expectedEntries <= 0) {
    console.error(`FAIL frozen-reference :: ${path.relative(ROOT, SYNC_RECORD_PATH)} lacks a positive archive.originalEntries count`);
    process.exit(1);
  }
  if (archiveEntries.size !== expectedEntries) {
    console.error(`FAIL frozen-reference :: ${syncRecord.archive.path} holds ${archiveEntries.size} file entries, ${path.relative(ROOT, SYNC_RECORD_PATH)} records ${expectedEntries}`);
    process.exit(1);
  }

  const problems = [];
  for (const frozen of STANDALONE_SCOPE.frozenReferenceRoots) {
    const dir = path.join(ROOT, frozen.path);
    if (!fs.existsSync(dir)) {
      problems.push(`${frozen.path}: directory missing`);
      continue;
    }
    const listing = listFilesRecursively(dir);
    for (const irregular of listing.irregular) problems.push(`${frozen.path}/${irregular}`);
    const onDisk = new Set(listing.files);
    for (const [name, digest] of archiveEntries) {
      if (!onDisk.has(name)) { problems.push(`${frozen.path}/${name}: missing (present in archive)`); continue; }
      if (sha256(fs.readFileSync(path.join(dir, name))) !== digest) problems.push(`${frozen.path}/${name}: content differs from archive`);
    }
    for (const name of onDisk) {
      if (!archiveEntries.has(name)) problems.push(`${frozen.path}/${name}: not in archive (extra file)`);
    }
  }

  for (const problem of problems) console.error(`FAIL frozen-reference :: ${problem}`);
  if (problems.length) {
    console.error(`\n${problems.length} frozen reference file(s) drifted from ${syncRecord.archive.path}.`);
    console.error('A frozen reference root is excluded from the Stage 5 scan only while it is byte-identical to its archive:');
    console.error('restore the files, or move the change into the registered artifact that ports this source.');
    process.exit(1);
  }
  console.log(
    `PASS frozen-reference :: ${STANDALONE_SCOPE.frozenReferenceRoots.map((frozen) => frozen.path).join(', ')} ` +
      `byte-identical to ${syncRecord.archive.path} (${archiveEntries.size} files)`,
  );
}

checkStandaloneScopeParity();
runCanaries();
console.log('PASS canaries :: standalone Stage 5 detectors, unmanifested-artifact discovery, DS-OK parser, and shrink-only ratchet verified');
checkFrozenReferenceRoots();

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
  console.error('       Expected at least one artifacts/*/.replit-artifact/artifact.toml root.');
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