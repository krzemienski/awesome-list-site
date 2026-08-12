import { z } from "zod";
import {
  BIDI_CONTROL_RE,
  MULTILINE_CONTROL_RE,
  NO_HTML_RE,
  hasVisibleChars,
} from "./validation";

export const BOOKMARK_QUEUE_STATUSES = [
  "saved",
  "watch-next",
  "in-progress",
  "done",
] as const;

export const bookmarkQueueStatusSchema = z.enum(BOOKMARK_QUEUE_STATUSES);
export type BookmarkQueueStatus = z.infer<typeof bookmarkQueueStatusSchema>;

export const COLLECTION_NAME_MAX = 80;
export const PERSONAL_TAG_MAX = 40;
export const PERSONAL_TAG_LIMIT = 20;

const safeVisibleText = (value: string) =>
  hasVisibleChars(value) &&
  !NO_HTML_RE.test(value) &&
  !MULTILINE_CONTROL_RE.test(value) &&
  !BIDI_CONTROL_RE.test(value);

export const collectionNameSchema = z
  .string()
  .trim()
  .min(1, "Collection name is required")
  .max(COLLECTION_NAME_MAX, `Collection name must be ${COLLECTION_NAME_MAX} characters or fewer`)
  .refine(safeVisibleText, "Collection name contains unsupported characters");

export const personalTagSchema = z
  .string()
  .trim()
  .min(1, "Tag cannot be empty")
  .max(PERSONAL_TAG_MAX, `Tag must be ${PERSONAL_TAG_MAX} characters or fewer`)
  .refine(safeVisibleText, "Tag contains unsupported characters")
  .transform((value) => value.replace(/\s+/g, " "));

export const personalTagsSchema = z
  .array(personalTagSchema)
  .max(PERSONAL_TAG_LIMIT, `A bookmark can have at most ${PERSONAL_TAG_LIMIT} personal tags`)
  .transform((tags) => {
    const seen = new Set<string>();
    return tags.filter((tag) => {
      const key = tag.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

export const collectionShareIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{24}$/, "Invalid collection link");

export const collectionPositionSchema = z.number().int().min(0).max(1_000_000);

export const BOOKMARK_QUEUE_LABELS: Record<BookmarkQueueStatus, string> = {
  saved: "Saved",
  "watch-next": "Watch next",
  "in-progress": "In progress",
  done: "Done",
};
