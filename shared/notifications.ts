import { z } from "zod";

export const DIGEST_CADENCES = ["weekly", "biweekly", "monthly"] as const;
export type DigestCadence = (typeof DIGEST_CADENCES)[number];

export const DIGEST_CHANNELS = ["email", "in_app"] as const;
export type DigestChannel = (typeof DIGEST_CHANNELS)[number];

export const DIGEST_JOB_STATUSES = [
  "queued",
  "processing",
  "sent",
  "failed",
  "skipped",
] as const;
export type DigestJobStatus = (typeof DIGEST_JOB_STATUSES)[number];

export const DIGEST_ATTEMPT_OUTCOMES = [
  "started",
  "sent",
  "failed",
  "skipped",
  "delivery_unknown",
] as const;
export type DigestAttemptOutcome = (typeof DIGEST_ATTEMPT_OUTCOMES)[number];

export const NOTIFICATION_KINDS = [
  "new_resource",
  "watch_next",
  "journey_step",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const notificationPreferencesUpdateSchema = z
  .object({
    emailDigestEnabled: z.boolean(),
    inAppEnabled: z.boolean(),
    includeNewResources: z.boolean(),
    includeWatchNext: z.boolean(),
    includeJourneyStep: z.boolean(),
    cadence: z.enum(DIGEST_CADENCES),
    timezone: z.string().trim().min(1).max(64),
    pausedUntil: z.string().datetime({ offset: true }).nullable(),
  })
  .superRefine((value, context) => {
    if (
      (value.emailDigestEnabled || value.inAppEnabled) &&
      !value.includeNewResources &&
      !value.includeWatchNext &&
      !value.includeJourneyStep
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["includeNewResources"],
        message: "Choose at least one digest section.",
      });
    }
  });

export type NotificationPreferencesUpdate = z.infer<
  typeof notificationPreferencesUpdateSchema
>;

export interface NotificationPreferencesResponse {
  emailDigestEnabled: boolean;
  inAppEnabled: boolean;
  includeNewResources: boolean;
  includeWatchNext: boolean;
  includeJourneyStep: boolean;
  cadence: DigestCadence;
  timezone: string;
  pausedUntil: string | null;
  emailOptedInAt: string | null;
  emailUnsubscribedAt: string | null;
  inAppOptedInAt: string | null;
  updatedAt: string;
}

export interface DigestPreviewItem {
  kind: NotificationKind;
  title: string;
  description: string;
  href: string;
  resourceId?: number;
  collectionId?: number;
  journeyId?: number;
  stepNumber?: number;
}

export interface DigestPreviewSection {
  key: "new_resources" | "watch_next" | "journey_step";
  title: string;
  items: DigestPreviewItem[];
}

export interface DigestPreview {
  generatedAt: string;
  cadence: DigestCadence;
  timezone: string;
  sections: DigestPreviewSection[];
  itemCount: number;
}