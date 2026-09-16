import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// BUG-055 (run25): transliterate instead of deleting — "Vídeo Töols" must
// become "video-tools", not "vdeo-tls". NFKD splits accented letters into
// base + combining marks (stripped), and a small map covers letters that
// don't decompose (ß, æ, ø, đ, ł, þ, ...).
const SLUG_CHAR_MAP: Record<string, string> = {
  ß: "ss", æ: "ae", œ: "oe", ø: "o", đ: "d", ð: "d", þ: "th", ł: "l",
  ħ: "h", ŧ: "t", ĸ: "k", ı: "i",
};

export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ßæœøđðþłħŧĸı]/g, (ch) => SLUG_CHAR_MAP[ch] ?? "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export function deslugify(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getCategorySlug(category: string): string {
  return slugify(category);
}

/**
 * "12s ago" / "2m ago" / "3h ago" / "4d ago" — the relative-time buckets the
 * admin operations panels share (and the parity reference applies).
 */
export function formatRelativeAgo(value: string | Date | null | undefined, now = Date.now()): string {
  if (!value) return "—";
  const at = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(at)) return "—";
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// Run15 BUG-030: one explicit date format for the whole admin surface —
// locale-pinned so every admin table reads the same regardless of viewer locale.
export function formatAdminDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatAdminDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
