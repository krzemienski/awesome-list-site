import type { Express } from "express";
import { readFileSync } from "node:fs";
import path from "node:path";

const envRevision =
  process.env.BUILD_REVISION ||
  process.env.REPLIT_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA;

// The dev workspace has no build-time revision, but browser proof captured
// against it must still name a commit. Read the checked-out HEAD per request
// so platform auto-commits show up without a restart. Never used in
// production, where the publish image has no .git directory.
function workspaceHeadRevision(): string | undefined {
  try {
    const gitDir = path.resolve(process.cwd(), ".git");
    const head = readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
    if (!head.startsWith("ref: ")) return head || undefined;
    const ref = head.slice(5);
    try {
      return readFileSync(path.join(gitDir, ref), "utf8").trim() || undefined;
    } catch {
      const packed = readFileSync(path.join(gitDir, "packed-refs"), "utf8");
      const line = packed.split("\n").find((l) => l.endsWith(` ${ref}`));
      return line?.split(" ")[0];
    }
  } catch {
    return undefined;
  }
}

function currentRevision(): string {
  if (envRevision) return envRevision;
  if (process.env.NODE_ENV !== "production") {
    const head = workspaceHeadRevision();
    if (head) return `${head}+workspace`;
  }
  return "unknown";
}

// Public release correlation endpoint. BUILD_REVISION is the explicit
// deployment contract; the platform/CI variables support environments that
// already expose their checked-out commit without extra configuration.
// Never cache this response: post-release checks must observe the active
// backend process rather than a stale edge response.
//
// Mounted by server/index.ts ahead of Clerk and the contract installer so it
// answers even when auth is degraded; the OpenAPI drift gate mounts it the
// same way before registerRoutes, and server/routes.ts declares its contract.
export function mountVersionRoute(app: Express): void {
  app.get("/api/version", (_req, res) => {
    res.set("Cache-Control", "no-store").json({ revision: currentRevision() });
  });
}
