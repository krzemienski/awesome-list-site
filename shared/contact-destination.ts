export interface PreferredContactDestination {
  href: string;
  kind: "issues" | "discussions" | "email";
  label: string;
}

interface PublicDestinations {
  site: { repoUrl: string };
  contact: Record<PreferredContactDestination["kind"], { available: boolean; href?: string }>;
}

/** Only use destinations explicitly enabled by the deployment's public config. */
export function preferredContactDestination(
  config: PublicDestinations | undefined,
): PreferredContactDestination | null {
  if (!config) return null;
  for (const kind of ["issues", "discussions", "email"] as const) {
    const destination = config.contact[kind];
    if (!destination.available || !destination.href) continue;
    let repositoryIsGitHub = false;
    try {
      repositoryIsGitHub = new URL(config.site.repoUrl).hostname === "github.com";
    } catch {
      // An invalid repository URL must not invent a GitHub destination.
    }
    return {
      href: destination.href,
      kind,
      label: kind === "issues"
        ? repositoryIsGitHub
          ? "open an issue on the project's GitHub repository"
          : "open an issue on the project's repository"
        : kind === "discussions"
          ? "join the project's discussions"
          : "email the project maintainers",
    };
  }
  return null;
}
