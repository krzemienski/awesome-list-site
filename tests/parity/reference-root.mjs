/**
 * Which frozen design prototype the parity harness renders as the reference.
 *
 * 20260929 — the Claude Design handoff the application was rebuilt to
 *            (default). Verified against docs/parity/source-sync-20260929.json.
 * 20260910 — the earlier prototype under awesome-list-site-ds/, kept frozen
 *            and selectable with PARITY_REFERENCE=20260910 for comparison.
 *            Its integrity gate is standalone-palette-drift's frozen check.
 *
 * Neither root is ever written; expected-side changes live in the adapter,
 * reconciliation and comparison-adjustment layers, applied to served bytes.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

export const REFERENCES = Object.freeze({
  20260929: Object.freeze({
    id: "20260929",
    dir: "awesome-list-site-ds-20260929",
    adjustments: "comparison-reference-adjustments-20260929.json",
    syncRecord: "docs/parity/source-sync-20260929.json",
    // The home tweak names the 09-29 Home Layout options; "featured" is the
    // design default and is the app's curated presentation.
    homeLayouts: Object.freeze({
      index: Object.freeze({ tweak: "Index", eyebrow: "INDEX ·" }),
      curated: Object.freeze({ tweak: "Featured Grid", eyebrow: "FEATURED RESOURCES" }),
    }),
  }),
  20260910: Object.freeze({
    id: "20260910",
    dir: "awesome-list-site-ds",
    adjustments: "comparison-reference-adjustments.json",
    syncRecord: null,
    homeLayouts: Object.freeze({
      index: Object.freeze({ tweak: null, eyebrow: "INDEX ·" }),
      curated: Object.freeze({ tweak: "Curated · featured-first", eyebrow: "CURATED ·" }),
    }),
  }),
});

const requested = process.env.PARITY_REFERENCE || "20260929";
if (!REFERENCES[requested]) {
  throw new Error(`PARITY_REFERENCE=${requested} is not a known reference (${Object.keys(REFERENCES).join(", ")})`);
}
export const ACTIVE_REFERENCE = REFERENCES[requested];
export const referenceRootPath = (reference = ACTIVE_REFERENCE) => path.join(repoRoot, reference.dir);
export const referenceFilePath = (file, reference = ACTIVE_REFERENCE) => path.join(repoRoot, reference.dir, file);

const listFiles = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isSymbolicLink()) return [{ rel: path.relative(base, full).split(path.sep).join("/"), irregular: "symbolic link" }];
  if (entry.isDirectory()) return listFiles(full, base);
  if (!entry.isFile()) return [{ rel: path.relative(base, full).split(path.sep).join("/"), irregular: "not a regular file" }];
  return [{ rel: path.relative(base, full).split(path.sep).join("/") }];
});

/**
 * Fail closed unless the working tree is byte-identical to the recorded
 * archive members (and the archive itself still matches, when present).
 * Returns a provenance summary for results.json.
 */
export function verifyReferenceIntegrity(reference = ACTIVE_REFERENCE) {
  if (!reference.syncRecord) {
    return { reference: reference.id, root: reference.dir, verifiedBy: "scripts/validation/standalone-palette-drift.mjs frozen-reference check" };
  }
  const record = JSON.parse(fs.readFileSync(path.join(repoRoot, reference.syncRecord), "utf8"));
  if (record.root !== reference.dir) throw new Error(`${reference.syncRecord} records root ${record.root}, expected ${reference.dir}`);
  const expected = new Map(Object.entries(record.files || {}));
  if (expected.size !== record.archive?.originalEntries) {
    throw new Error(`${reference.syncRecord} lists ${expected.size} files but records ${record.archive?.originalEntries} archive entries`);
  }
  const root = referenceRootPath(reference);
  if (!fs.existsSync(root)) throw new Error(`frozen reference ${reference.dir}/ is missing`);
  const problems = [];
  const seen = new Set();
  for (const { rel, irregular } of listFiles(root)) {
    if (irregular) { problems.push(`${rel}: ${irregular}`); continue; }
    seen.add(rel);
    if (!expected.has(rel)) problems.push(`${rel}: not in the archive (extra file)`);
    else if (sha256(fs.readFileSync(path.join(root, rel))) !== expected.get(rel)) problems.push(`${rel}: content differs from the archive`);
  }
  for (const rel of expected.keys()) if (!seen.has(rel)) problems.push(`${rel}: missing (present in the archive)`);
  const archivePath = path.join(repoRoot, record.archive.path);
  const archivePresent = fs.existsSync(archivePath);
  if (archivePresent && sha256(fs.readFileSync(archivePath)) !== record.archive.sha256) {
    problems.push(`${record.archive.path}: archive sha256 no longer matches ${reference.syncRecord}`);
  }
  if (problems.length) {
    throw new Error(`frozen reference ${reference.dir}/ drifted from ${reference.syncRecord}:\n  ${problems.join("\n  ")}`);
  }
  return {
    reference: reference.id,
    root: reference.dir,
    files: expected.size,
    archive: record.archive.path,
    archiveSha256: record.archive.sha256,
    archiveChecked: archivePresent,
    verifiedBy: reference.syncRecord,
  };
}
