import { stripInvisible } from "@shared/validation";

/**
 * R5-038: display-time defense for admin surfaces that render strings which
 * never passed the resource/taxonomy input schemas — chiefly AI-researched /
 * web-scraped discovery fields (title, url, description, reasoning). Those
 * pipelines can carry bidirectional override controls (U+202A–202E / isolates)
 * and other invisible format characters that visually reorder text (e.g. a
 * filename that reads as "evilfdp.txt"), which would let a hostile page spoof
 * what an admin sees before approving it. `stripInvisible` removes every Cf/Cs
 * format char (bidi controls included; ZWJ preserved for emoji) so the admin
 * sees the true, un-reordered string. Use for rendering only — stored values
 * are left untouched.
 */
export function sanitizeDisplay(value: string | null | undefined): string {
  if (!value) return "";
  return stripInvisible(value);
}
