import { z } from "zod";

const singleLine = (max: number) =>
  z.string().trim().min(1).max(max)
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "must be a single line");

export const contactSubmissionSchema = z.object({
  name: singleLine(100),
  replyTo: z.string().trim().email("must be a valid email address").max(320),
  subject: singleLine(200),
  message: z.string().trim()
    .min(20, "message must be at least 20 characters")
    .max(4000, "message must be at most 4000 characters")
    .refine((value) => !value.includes("\u0000"), "message contains an invalid character"),
  website: z.string().max(0).optional(),
}).strict();

export const contactSubmissionResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.literal("received"),
});

export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;
export type ContactSubmissionResponse = z.infer<typeof contactSubmissionResponseSchema>;

export const contactLinkEntrySchema = z.object({
  available: z.boolean(),
  href: z.string().optional(),
  unavailableReason: z.string().optional(),
});

export const publicContactConfigSchema = z.object({
  email: contactLinkEntrySchema,
  issues: contactLinkEntrySchema,
  discussions: contactLinkEntrySchema,
  form: z.object({
    available: z.boolean(),
    persistence: z.literal("database").optional(),
    unavailableReason: z.string().optional(),
  }),
});