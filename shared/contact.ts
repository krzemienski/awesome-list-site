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
  website: z.string().max(0).optional(),
}).strict();

export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;
