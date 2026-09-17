import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Only these development artifacts are expendable in the publishing copy.
// Keep runtime dependencies (node_modules), dist, migrations, and source
// intact. Everything listed here is consumed BEFORE this step runs (the gate
// builds first, and `npm run build` bakes BUILD_REVISION from git at that
// point) and is never read by `node dist/index.js`:
//   - .git: history/packs (~2.4 GiB); the runtime only sees the baked revision
//   - parity baselines / docs/parity*: frozen capture evidence (~5.6 GiB)
//   - .cache/ms-playwright: Playwright browser binaries. NEVER widen this to
//     all of .cache: .cache/replit/ holds the module environment (nodejs-20,
//     env/latest.json with the runtime PATH); deleting it made the 4th
//     2026-09-17 publish fail at startup with `exec: "npm": not found`.
//   - audit-evidence, test-results, playwright-report: test run output
//   - attached_assets: Vite build input already copied into dist/public
// The 2026-09-17 publish with only the first two entries still exceeded the
// 8 GiB image limit because the Nix layer (Chromium/GTK/GStreamer for browser
// tests) plus the remaining repo bulk left no headroom.
const targets = [
  "tests/parity/baseline",
  ".cache/ms-playwright",
  ".git",
  "docs/parity",
  "docs/parity-taxonomy",
  "docs/parity-545",
  "docs/parity-547",
  "audit-evidence",
  "test-results",
  "playwright-report",
  "attached_assets",
];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mode = process.argv[2] ?? "--dry-run";
if (!["--dry-run", "--apply"].includes(mode) || process.argv.length > 3) {
  throw new Error("Usage: node scripts/deployment/trim-publish-image.mjs [--dry-run|--apply]");
}
// Publishing markers. REPLIT_DEPLOYMENT=1 is set by Replit only at runtime
// (never during the build command), so the publish build relies on
// REPLIT_PUBLISH_IMAGE_TRIM=1, an env var that exists only in Replit's
// production environment and is never set in the workspace.
const publishMarker =
  process.env.REPLIT_DEPLOYMENT === "1" ||
  process.env.REPLIT_PUBLISH_IMAGE_TRIM === "1";
if (mode === "--apply" && !publishMarker) {
  throw new Error(
    "Refusing cleanup outside publishing: REPLIT_PUBLISH_IMAGE_TRIM (or REPLIT_DEPLOYMENT) must be 1. Use --dry-run in the workspace.",
  );
}
// Do NOT gate on REPLIT_DEV_DOMAIN: the publish build container inherits it
// (confirmed by the 2026-09-17 publish log, where this step aborted with
// "REPLIT_DEV_DOMAIN is set" even though REPLIT_PUBLISH_IMAGE_TRIM=1 came
// from the production environment). The marker above is the only reliable
// discriminator — it is a production-only env var that the interactive
// workspace never defines — so the workspace can only ever run --dry-run.

// Platform-owned directories the runtime container depends on. Refuse any
// target that is one of these or would remove one (see the .cache note above).
const platformDirs = [".cache/replit", ".config", ".local", ".replit", "replit.nix", "node_modules", "dist", "migrations"];
for (const target of targets) {
  const hit = platformDirs.find((p) => p === target || p.startsWith(`${target}/`) || target.startsWith(`${p}/`));
  if (hit) throw new Error(`Refusing to trim ${target}: it contains or lives inside runtime-required ${hit}`);
}

// Check every path before deleting anything. Never follow symlinked parents
// into directories outside the build copy.
for (const target of targets) {
  let current = root;
  for (const segment of target.split("/")) {
    current = path.join(current, segment);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`Refusing cleanup through symlink: ${target}`);
    }
  }
}
// Frozen parity baselines are stored with write permission removed
// (directories 0555). unlink() needs write permission on the parent
// directory, so rmSync alone fails with EACCES (2026-09-17 publish log).
// Re-grant owner write on every directory beneath the target first. This
// only ever runs in the publishing copy (see the marker check above); it
// never follows symlinks.
function makeDirectoriesWritable(dir) {
  const stat = fs.lstatSync(dir);
  if (!stat.isDirectory()) return;
  if ((stat.mode & 0o700) !== 0o700) fs.chmodSync(dir, stat.mode | 0o700);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      makeDirectoriesWritable(path.join(dir, entry.name));
    }
  }
}

for (const target of targets) {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) {
    console.log(`[publish-image] Already absent: ${target}`);
    continue;
  }
  console.log(`[publish-image] ${mode === "--apply" ? "Removing" : "Would remove"} ${target}`);
  if (mode === "--apply") {
    makeDirectoriesWritable(absolute);
    fs.rmSync(absolute, { recursive: true, force: true });
  }
}