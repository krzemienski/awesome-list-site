# Run18 triage rationales (non-"fixed" dispositions)

## NB findings

- **NB-030 (platform-partial)** — App-side headers are correct: `/api/awesome-list` → `Cache-Control: public, max-age=0, must-revalidate` + ETag, no Set-Cookie; built assets → `max-age=31536000, immutable`; HTML → intentionally `no-store` (nonce'd HTML must never be cached — run17 lesson). The audit's `private` observation on prod is the hosting edge coupling cacheability to the GAESA cookie — same class as run16 BUG-092 / run17 BUG-050. Probes: `nb030-cache-control.md`.
- **NB-039 (partial)** — Detail view landed: pending submission rows now expose the submitted URL + expandable description (`Profile.tsx:839`). **Withdraw** requires a new authenticated server endpoint (delete-own-pending-submission) with audit logging; out of run18 scope, journaled as the one intentional remainder.
- **NB-008/014/015/016/027/043/046/049/052 (data-fix)** — Corpus fixes, not code. Applied to dev via the exact HTTP-admin-API code path prod will use (`scripts/run18-data-fixes-prod.ts`, `PROD_BASE=http://localhost:5000`); all sweeps now return 0 in dev; idempotency proven by a full second run (all no-ops). Prod is not agent-writable — run the script after republish.

## Regression debt (run-1 BUG rows)

- **BUG-009 (by-design)** — The user-export CSV masks emails (`q•••@…`) deliberately: exporting raw PII to a downloadable file is the risk the run17 PII policy exists to prevent. Admins see full emails in the UI; the export artifact stays masked.
- **BUG-035 (by-design)** — `-scNNNN` suffixed slugs are the slug-stability policy (run17): renaming slugs breaks inbound links and sitemap continuity. Admin (99) vs public (96) count difference = non-approved items visible to admin only.
- **BUG-025 (by-design)** — Category cards and subcategory chips intentionally differ: category level carries description/stats/expansion affordances; subcategory level is a compact chip row inside the parent card. Unifying them would flatten a deliberate information hierarchy. If a redesign is wanted, it is a design decision for the maintainer, not a defect fix.
- **BUG-006 / BUG-021 / BUG-050 / BUG-038 (platform)** —
  - BUG-006: Replit OIDC hop 403s at Cloudflare for automated agents; app-side failure toast (`/login?error=oauth`) landed run17.
  - BUG-021: the WAF serves 403 for the app's own JS/CSS to bot user-agents → unstyled shell for crawlers; edge config, not app code.
  - BUG-050: GAESA cookie attributes are set by the Google App Engine edge, not the app.
  - BUG-038: browsers log failed network requests (401) to the console natively; suppressing DevTools resource errors is not possible from application code. The app no longer *retries* into a storm (NB-028 fix), which removes the log spam multiplier.
- **BUG-056 (invalid)** — sportsvideo.org 403 is a Cloudflare bot-block of datacenter IPs (link-scan false-positive class); loads fine in real browsers. Not link rot; no repoint.
- **BUG-023 (partial carry-over)** — run17 made middle crumbs collapse into a "⋯" below lg; making that ellipsis an interactive dropdown menu is a small feature not scheduled this run. Middle levels remain reachable via each page's parent links.
- **BUG-024 (partial carry-over)** — smart-tv-players ~2s blank on *cold* load is a code-split/waterfall perf item; SPA navigations are fast (run17: 364/281ms). Journaled for a perf-focused pass.
- **BUG-027 (cannot-verify carry-over)** — "Check again" only renders on an empty review queue; emptying the real queue requires approving/rejecting genuine pending submissions, which is a destructive content action the audit itself forbids. Re-check when the queue is naturally empty.
