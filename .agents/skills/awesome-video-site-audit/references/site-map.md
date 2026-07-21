# awesome.video — Site Surface Map

Prod: `https://awesome.video` · Dev: `http://localhost:5000` (single Express port serves API + Vite SPA).
Stack: React 18 + Vite + wouter + shadcn/ui + Tailwind (SPA), Express + Drizzle + PostgreSQL. Session auth via `connect.sid` cookie (7-day, HttpOnly). Dual auth: Replit OIDC + local email/password.

## Scale (verify live — counts drift)

~2,300+ approved resources in a 3-level taxonomy: 9 categories → ~100 subcategories → ~96 sub-subcategories. ~10 published journeys. Sitemap ~2,500+ URLs.

## The 7 core journeys (where severity lives)

| # | Journey | Path | Audit focus |
|---|---------|------|-------------|
| J1 | Discover | `/` → `/category/:slug` → `/subcategory/:slug` → `/resource/:id` → outbound link | Dead outbound links, soft-404s, count parity between sidebar/tree/pages |
| J2 | Search | `/` key or ⌘K palette → `/search?q=` → resource | Ranking (exact-match boost), match-count label, whitespace/empty-query handling, pagination |
| J3 | Join & return | `/register` → `/login` → `/profile` | Password policy (server-side), session persistence, streak truthfulness, resend cooldown |
| J4 | Contribute | `/submit` → pending → admin approval → live | Auth gate states, URL validation (https-only), 10-tag cap, dup-title 409, edit suggestions + withdraw |
| J5 | Learn | `/journeys` → `/journey/:id` → step toggles | Progress persistence, group-aware steps (see gotchas), offline honesty, progressbar ARIA |
| J6 | Personalize | `/advanced` + `/settings/*` → recommendations → thumbs | Preferences actually honored (skill/goals/types), honest copy when zero preferences, anon thumbs gating |
| J7 | Administer | `/admin` (15 tabs) | Approvals, resources table, taxonomy, users, metrics coherence, researcher jobs, audit logs, exports, link health, GitHub sync |

## Public routes

`/` · `/category/:slug` · `/subcategory/:slug` (also sub-subcategory pages) · `/resource/:id` · `/search` · `/journeys` · `/journey/:id` · `/advanced` · `/submit` · `/login` · `/register` · `/profile` · `/settings` (public links-only hub) · `/settings/theme` (5-system × 10-accent DS switcher) · `/privacy` · `/about` · `/code-of-conduct`

## Admin (`/admin?tab=…`)

15 tabs incl.: overview/stats, pending approvals, resources table (sort/page-size/first-last), taxonomy manager, users, metrics, researcher (job queue: turns/costs/found/approved), audit logs, exports (JSON/CSV/HTML/YAML/PDF), link health, GitHub sync (import/export), suggested edits, journeys editor, enrichment.

## API surface (REST, `/api/*`)

- Public: `/api/awesome-list` (full cached tree + ETag/304), `/api/resources`, `/api/search`, `/api/journeys`, `/api/recommendations`, `/api/auth/user`
- Auth: `/api/auth/local/login|register`, `/api/login` (OIDC), `/api/auth/logout`
- User: bookmarks, favorites, journey progress, feedback/thumbs, resource edits, `/api/user/submissions` (+ `DELETE /api/user/submissions/:id` to withdraw own pending submission)
- Admin: `/api/admin/*` — 401 anon / 403 non-admin enforced server-side
- Mutations require an Origin header matching the host (CSRF check)

## SEO/crawler architecture (critical to understand before auditing SEO)

- **No SSR.** Crawler visibility comes from server og-middleware injecting title/meta/JSON-LD/prerendered content into `<!--app-html-->` in the HTML shell. Client `SEOHead` must mirror server titles exactly (two-pass parity) and must NOT emit JSON-LD (server-authoritative).
- **Soft-404s:** the SPA returns 200 for everything by default; og-middleware sets real 404 status in its buffered `res.end` for unknown routes. Indexable set must equal sitemap exactly.
- Server canonical uses `SITE_URL`/`PUBLIC_SITE_URL`; client uses `VITE_SITE_URL` — they can diverge; noindex pages omit canonicals.

## Data model facts auditors need

- Public resources have status **"approved"** (not "published"). Journeys use "published". Counting resources by "published" returns 0.
- Journey steps are stored as up to 3 rows per logical stepNumber — UI groups them; completion must mark ALL row ids.
- The `/api/awesome-list` tree carries real numeric DB ids usable for `/resource/:id` navigation.
