import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { retryOptionalChunks } from "@/lib/lazy-optional";
export { preferredContactDestination } from "@shared/contact-destination";

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
    // Contact configuration is client-only. It is intentionally not part of
    // the bounded anonymous Home SSR payload.
    enabled: enabled && typeof window !== "undefined",
    staleTime: 5 * 60 * 1000,
  });
}

const PENDING_OPEN_TTL_MS = 10_000;
let contactOpenRequestedAt = 0;

/** True once, when a recent open request found no dialog host listening. */
export function takePendingContactOpen() {
  const pending = Date.now() - contactOpenRequestedAt < PENDING_OPEN_TTL_MS;
  contactOpenRequestedAt = 0;
  return pending;
}

export function openContactForm() {
  contactOpenRequestedAt = Date.now();
  retryOptionalChunks();
  window.dispatchEvent(new CustomEvent("awesome:open-contact-form"));
}