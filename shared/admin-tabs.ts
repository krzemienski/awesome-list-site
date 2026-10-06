// Valid /admin/:section ids, shared by the admin SPA (which opens the tab) and
// the SSR meta middleware (which must serve every such URL as the admin page,
// never a 404).
export const ADMIN_TAB_IDS = [
  "overview", "approvals", "edits", "enrichment", "researcher", "export", "database",
  "resources", "categories", "subcategories", "subsubcategories", "journeys",
  "users", "github", "linkhealth", "digests", "audit", "research",
] as const;

export type AdminTabId = (typeof ADMIN_TAB_IDS)[number];

// Run16 BUG-085: human-guessable slug aliases → canonical tab ids.
export const ADMIN_TAB_ALIASES: Readonly<Record<string, AdminTabId>> = {
  "link-health": "linkhealth",
  "sub-subcategories": "subsubcategories",
  "sub-subcats": "subsubcategories",
  "github-sync": "github",
};

// Normalize an inbound tab slug (hash, ?tab= param, or /admin/:section) to a
// valid tab id, or null if unknown.
export function normalizeAdminTab(raw: string | null | undefined): AdminTabId | null {
  if (!raw) return null;
  const slug = raw.replace(/^#/, "").toLowerCase();
  const mapped = ADMIN_TAB_ALIASES[slug] ?? slug;
  return (ADMIN_TAB_IDS as readonly string[]).includes(mapped) ? (mapped as AdminTabId) : null;
}
