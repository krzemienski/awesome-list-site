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
if (mode === "--apply" && process.env.REPLIT_DEPLOYMENT !== "1") {
  throw new Error("Refusing cleanup outside publishing: REPLIT_DEPLOYMENT must be 1. Use --dry-run in the workspace.");
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
for (const target of targets) {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) {
    console.log(`[publish-image] Already absent: ${target}`);
    continue;
  }
  console.log(`[publish-image] ${mode === "--apply" ? "Removing" : "Would remove"} ${target}`);
  if (mode === "--apply") fs.rmSync(absolute, { recursive: true, force: true });
}