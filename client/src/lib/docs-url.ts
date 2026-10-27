/** Project docs folder on the configured repo; null until a repo URL is configured. */
export function docsUrl(repoUrl?: string, repoBranch = "main"): string | null {
  if (!repoUrl) return null;
  return `${repoUrl.replace(/\/$/, "")}/tree/${encodeURIComponent(repoBranch)}/docs`;
}
