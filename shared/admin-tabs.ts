// Valid /admin/:section ids, shared by the admin SPA (which opens the tab) and
// the SSR meta middleware (which must serve every such URL as the admin page,
// never a 404).
const ADMIN_TAB_IDS = [
  "overview", "approvals", "edits", "enrichment", "researcher", "export", "database",
  "resources", "categories", "subcategories", "subsubcategories", "journeys",
  "users", "github", "linkhealth", "digests", "audit", "research", "contact",
] as const;

export type AdminTabId = (typeof ADMIN_TAB_IDS)[number];

// Each section's visible name: the strip tab and Settings-menu labels, and the
// "<section> · Admin" page title the SPA and the SSR meta both serve.
export const ADMIN_TAB_LABELS: Readonly<Record<AdminTabId, string>> = {
  overview: "Overview", approvals: "Approvals", edits: "Edits", enrichment: "Enrichment",
  researcher: "Researcher", export: "Export", database: "Database", resources: "Resources",
  categories: "Categories", subcategories: "Subcategories", subsubcategories: "Sub-Subcats",
  journeys: "Journeys", users: "Users", github: "GitHub", linkhealth: "Link Health",
  digests: "Digests", audit: "Audit", research: "Research", contact: "Contact inbox",
};

export function adminPageTitle(tab: AdminTabId): string {
  return `${ADMIN_TAB_LABELS[tab]} · Admin`;
}

// Run16 BUG-085: human-guessable slug aliases → canonical tab ids.
const ADMIN_TAB_ALIASES: Readonly<Record<string, AdminTabId>> = {
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
