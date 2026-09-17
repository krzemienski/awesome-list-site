import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const CONTACT_VARIANTS = ["a", "b", "c", "d", "e"] as const;
export type ContactVariant = (typeof CONTACT_VARIANTS)[number];

export interface ContactDestination {
  available: boolean;
  href?: string;
  unavailableReason?: string;
}

export interface ContactFormConfig {
  available: boolean;
  persistence?: "database";
  unavailableReason?: string;
}

export interface ContactPublicConfig {
  site: {
    title: string;
    description: string;
    url: string;
    author: string;
    repoUrl: string;
    repoBranch: string;
  };
  contact: {
    email: ContactDestination;
    issues: ContactDestination;
    discussions: ContactDestination;
    form: ContactFormConfig;
  };
}

export type PreferredContactDestination = {
  href: string;
  kind: "issues" | "discussions" | "email";
  label: string;
};

/**
 * Pick the first configured public destination for prose pages that need to
 * tell a visitor how to reach the maintainers. In particular, never derive an
 * issues URL from the repository URL: the server intentionally reports an
 * unavailable destination when the deployment has not opted into one.
 */
export function preferredContactDestination(
  config: ContactPublicConfig | undefined,
): PreferredContactDestination | null {
  if (!config) return null;

  if (config.contact.issues.available && config.contact.issues.href) {
    const repositoryIsGitHub = (() => {
      try {
        return new URL(config.site.repoUrl).hostname === "github.com";
      } catch {
        return false;
      }
    })();
    return {
      href: config.contact.issues.href,
      kind: "issues",
      label: repositoryIsGitHub
        ? "open an issue on the project's GitHub repository"
        : "open an issue on the project's repository",
    };
  }
  if (config.contact.discussions.available && config.contact.discussions.href) {
    return {
      href: config.contact.discussions.href,
      kind: "discussions",
      label: "join the project's discussions",
    };
  }
  if (config.contact.email.available && config.contact.email.href) {
    return {
      href: config.contact.email.href,
      kind: "email",
      label: "email the project maintainers",
    };
  }
  return null;
}

export interface ContactSubmission {
  name: string;
  replyTo: string;
  subject: string;
  message: string;
  website?: string;
}

export interface ContactSubmissionReceipt {
  id: string | number;
  status: "received";
}

const configuredVariant: unknown = import.meta.env.VITE_CONTACT_VARIANT;

export const contactVariant: ContactVariant | null = CONTACT_VARIANTS.includes(
  configuredVariant as ContactVariant,
)
  ? (configuredVariant as ContactVariant)
  : null;

export function useContactConfig(enabled = contactVariant !== null) {
  return useQuery<ContactPublicConfig>({
    queryKey: ["/api/config"],
    queryFn: () => apiRequest("/api/config", { method: "GET" }),
    // Contact configuration is client-only. It is intentionally not part of
    // the bounded anonymous Home SSR payload.
    enabled: enabled && typeof window !== "undefined",
    staleTime: 5 * 60 * 1000,
  });
}

export function openContactForm() {
  window.dispatchEvent(new CustomEvent("awesome:open-contact-form"));
}