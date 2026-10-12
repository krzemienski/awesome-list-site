import { config } from "./config";

interface ContactLinkEntry {
  available: boolean;
  href?: string;
  unavailableReason?: string;
}

function destination(value: string, protocol: "https:" | "mailto:", reason: string): ContactLinkEntry {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === protocol) return { available: true, href: parsed.toString() };
  } catch {
    // Empty or malformed configuration is explicitly unavailable.
  }
  return { available: false, unavailableReason: reason };
}

/** Same public, validated destinations for /api/config and crawler policy copy. */
export function configuredContactDestinations() {
  return {
    email: destination(config.contact.email, "mailto:", "No contact email is configured"),
    issues: destination(config.contact.issues_url, "https:", "No issue tracker is configured"),
    discussions: destination(
      config.contact.discussions_verified ? config.contact.discussions_url : "",
      "https:",
      "No verified discussions destination is configured",
    ),
  };
}

export function configuredSourceRepository(): { repoUrl: string; repoBranch: string } {
  const parsed = new URL(config.source.url);
  if (parsed.hostname !== "raw.githubusercontent.com") {
    throw new Error("The configured source URL is not a raw GitHub repository URL");
  }
  const [owner, repo, branch] = parsed.pathname.split("/").filter(Boolean);
  if (!owner || !repo || !branch) {
    throw new Error("The configured source URL is missing its GitHub owner, repository, or branch");
  }
  return { repoUrl: `https://github.com/${owner}/${repo}`, repoBranch: branch };
}
