/**
 * Shared, non-React identity normalization for the public-config boundary.
 * Current Awesome Video values remain safe defaults for existing callers.
 */
export interface SiteIdentity {
  name: string;
  description?: string;
  url?: string;
  author?: string;
  repoUrl?: string;
  repoBranch?: string;
}

const DEFAULT_SITE_IDENTITY: SiteIdentity = {
  name: "Awesome Video",
  description: "A curated directory of awesome-list resources for developers.",
  url: "https://awesome.video",
  author: "Awesome List Community",
  repoUrl: "https://github.com/krzemienski/awesome-video",
  repoBranch: "main",
};

function normalizeSiteName(value?: string | null): string {
  const name = value?.trim().replace(/\s+Dashboard$/i, "").trim();
  return name || DEFAULT_SITE_IDENTITY.name;
}

export function resolveSiteIdentity(
  value?: Partial<SiteIdentity> | null,
): SiteIdentity {
  return {
    ...DEFAULT_SITE_IDENTITY,
    ...value,
    name: normalizeSiteName(value?.name),
  };
}

export function repositoryDisplayName(repoUrl?: string | null): string {
  const fallback = "source repository";
  if (!repoUrl?.trim()) return fallback;
  try {
    const parsed = new URL(repoUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.length >= 2
      ? `${parts[parts.length - 2]}/${parts[parts.length - 1]}`
      : fallback;
  } catch {
    const parts = repoUrl.split("/").filter(Boolean);
    return parts.length >= 2
      ? `${parts[parts.length - 2]}/${parts[parts.length - 1].replace(/\.git$/i, "")}`
      : fallback;
  }
}

export function siteHost(siteUrl?: string | null): string {
  if (!siteUrl?.trim()) return "";
  try {
    return new URL(siteUrl).host;
  } catch {
    return siteUrl.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  }
}