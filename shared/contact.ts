import { z } from "zod";

const singleLine = (max: number) =>
  z.string().trim().min(1).max(max)
    // \p{Cc} = Unicode control characters (C0, DEL, C1) — newlines included.
    .refine((value) => !/\p{Cc}/u.test(value), "must be a single line");

export const contactSubmissionSchema = z.object({
  name: singleLine(100),
  replyTo: z.string().trim().email("must be a valid email address").max(320),
  subject: singleLine(200),
  message: z.string().trim()
    .min(20, "message must be at least 20 characters")
    .max(4000, "message must be at most 4000 characters")
    .refine((value) => !value.includes("\u0000"), "message contains an invalid character"),
  // Honeypot. The form renders this field hidden, so real visitors never fill
  // it. Any string is ACCEPTED here on purpose: POST /api/contact answers a
  // non-empty value with the normal receipt and persists nothing. Rejecting it
  // with a 400 would tell a bot which field gave it away.
  website: z.string().max(2048).optional(),
}).strict();

/** True when the hidden honeypot field carries anything but whitespace. */
export function isHoneypotTriggered(input: Pick<ContactSubmissionInput, "website">): boolean {
  return typeof input.website === "string" && input.website.trim().length > 0;
}

export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;
