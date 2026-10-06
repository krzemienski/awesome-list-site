import type { Express } from "express";

const buildRevision =
  process.env.BUILD_REVISION ||
  process.env.REPLIT_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  "unknown";

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
    res.set("Cache-Control", "no-store").json({ revision: buildRevision });
  });
}
