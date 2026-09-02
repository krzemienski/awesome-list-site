#!/usr/bin/env node
// Check DS-OK exception markers on standalone UI surfaces.
//
// The full stage-5 value scan has an app-specific ratchet in
// palette-drift.mjs. Standalone exports and mockups do not share that
// baseline, but their DS-OK exceptions still need the same written reason.
// Keep the reason classifier in design-system-stage5.mjs so these checks
// cannot drift apart.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DS_OK_LOOKBACK,
  hasDsOkTag,
  lineHasBareDsOkTag,
  lineHasReasonedDsOkTag,
} from './design-system-stage5.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARTIFACTS_ROOT = path.join(ROOT, 'artifacts');
const SOURCE_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.scss',
  '.html',
  '.svg',
  '.md',
]);
const IGNORED_DIRS = new Set(['.git', 'dist', 'node_modules', 'uploads', 'docs']);

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`canary: ${label} → ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
}

function runCanaries() {
  assertEqual(lineHasBareDsOkTag('/* DS-OK */'), true, 'bare block marker');
  assertEqual(lineHasBareDsOkTag('// DS-OK: !!!'), true, 'punctuation-only line marker');
  assertEqual(lineHasBareDsOkTag('/* DS-OK: fixed brand paint */'), false, 'reasoned block marker');
  assertEqual(lineHasReasonedDsOkTag('// DS-OK: fixed brand paint'), true, 'reasoned line marker');
  assertEqual(hasDsOkTag(['/* DS-OK: fixed brand paint */', 'a', 'b', 'c', 'd', 'value'], 5), true, 'five-line lookback');
  assertEqual(hasDsOkTag(['/* DS-OK */', 'a', 'b', 'c', 'd', 'value'], 5), false, 'bare marker is not an exemption');
  assertEqual(DS_OK_LOOKBACK, 5, 'shared lookback limit');
}

function hasArtifactManifest(dir) {
  return fs.existsSync(path.join(dir, '.replit-artifact', 'artifact.toml'));
}

function discoverRoots() {
  const roots = [];
  const legacyStandalone = path.join(ROOT, 'awesome-list-site-ds');
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

function isDesignSystemSource(file, root) {
  const basename = path.basename(file).toLowerCase();
  // These files are the standalone token sources themselves, not consumers.
  // Keep the exclusion narrow so a bare tag in an exported page or component
  // cannot hide behind a whole directory/file allowlist.
  return basename === 'design-system.css' ||
    (root.endsWith('awesome-list-site-ds') && basename === 'styles.css');
}

function collectBareMarkers(roots) {
  const findings = [];
  let fileCount = 0;

  for (const root of roots) {
    for (const file of walk(root)) {
      if (isDesignSystemSource(file, root)) continue;
      fileCount++;
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!lineHasBareDsOkTag(lines[i])) continue;
        findings.push({
          file: path.relative(ROOT, file),
          line: i + 1,
          text: lines[i].trim().slice(0, 160),
        });
      }
    }
  }

  return { findings, fileCount };
}

runCanaries();
console.log('PASS canaries :: standalone DS-OK marker classifier verified for bare, punctuation-only, reasoned, and lookback cases');

const roots = discoverRoots();
if (!roots.length) {
  console.error('FAIL standalone-palette-drift :: no standalone artifact roots discovered');
  console.error('       Expected awesome-list-site-ds or an artifacts/*/.replit-artifact/artifact.toml root.');
  process.exit(1);
}

const { findings, fileCount } = collectBareMarkers(roots);
for (const finding of findings) {
  console.error(`FAIL standalone-ds-ok :: ${finding.file}:${finding.line}: ${finding.text}`);
  console.error('       DS-OK tag is missing a written reason; add text after DS-OK or remove the tag.');
}

if (findings.length) {
  console.error(`\n${findings.length} standalone DS-OK marker(s) are missing written reasons.`);
  console.error('       A valid exception must use /* DS-OK: written reason */ at the definition site.');
  process.exit(1);
}

console.log(`PASS standalone-palette-drift :: ${roots.length} root(s), ${fileCount} source file(s); all DS-OK markers have written reasons`);
for (const root of roots) {
  console.log(`  scanned ${path.relative(ROOT, root)}`);
}