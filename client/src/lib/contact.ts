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
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function openContactForm() {
  window.dispatchEvent(new CustomEvent("awesome:open-contact-form"));
}