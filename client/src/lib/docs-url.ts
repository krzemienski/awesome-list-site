import { resolveSiteIdentity } from "@shared/site-identity";

/** Project docs folder on the configured repo; null until a repo URL is configured. */
export function docsUrl(repoUrl?: string, repoBranch = "main"): string | null {
  if (!repoUrl) return null;
  return `${repoUrl.replace(/\/$/, "")}/tree/${encodeURIComponent(repoBranch)}/docs`;
}

/**
 * /api/config is client-only, so the server-rendered shell has no repo URL yet.
 * Use the site default until it arrives so the Docs and Source links exist from
 * the first paint; "HEAD" resolves to whichever branch the repo defaults to.
 */
export function shellRepo(repoUrl?: string, repoBranch?: string): { repoUrl: string; repoBranch: string } {
  const configured = repoUrl?.trim();
  if (configured) return { repoUrl: configured, repoBranch: repoBranch ?? "main" };
  return { repoUrl: resolveSiteIdentity().repoUrl ?? "", repoBranch: "HEAD" };
}
