import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Only these development artifacts are expendable in the publishing copy.
// Keep runtime dependencies, dist, migrations, source, and Git history intact.
const targets = [
  "tests/parity/baseline",
  ".cache/ms-playwright",
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
for (const target of targets) {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) {
    console.log(`[publish-image] Already absent: ${target}`);
    continue;
  }
  console.log(`[publish-image] ${mode === "--apply" ? "Removing" : "Would remove"} ${target}`);
  if (mode === "--apply") fs.rmSync(absolute, { recursive: true, force: true });
}