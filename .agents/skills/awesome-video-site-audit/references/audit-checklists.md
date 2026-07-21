# Per-Domain Audit Checklists

Walk the relevant checklist per surface. Every check needs live evidence (probe JSON, screenshot, or curl body). Screenshot verdicts go through `visual-inspection`; per-screen depth uses the `ui-experience-audit` 5-phase protocol.

## 1. Content quality (the data corpus)

Sweep the resource corpus via API/DB queries, not by eyeballing pages:

- [ ] **GitHub suffix artifacts** — titles ending `" - owner/repo"` (bulk-import residue). Target: 0.
- [ ] **Placeholder descriptions** — auto-template text ("A curated resource…", empty-ish boilerplate). Target: 0.
- [ ] **Filename titles** — titles that are literal filenames (`foo_bar.md`, `index.html`).
- [ ] **Bio-salad descriptions** — speaker-bio text used as a talk's description.
- [ ] **Brand casing** — "Ffmpeg"→"FFmpeg", "Github"→"GitHub", "Hls"→"HLS", smart-TV casing, stray `:emoji:` codes.
- [ ] **Duplicate titles** — case-insensitive dup groups. Target: 0 (server enforces 409 on create; sweep legacy).
- [ ] **Near-duplicate resources** — same URL or same-title different-URL clusters (esp. FFmpeg docs).
- [ ] **Truncated descriptions** — cut mid-sentence/mid-word.

Fix shape: ONE idempotent sweep script per class, run against dev DB directly, against prod via live admin API. Validate: run twice — second run must be all no-ops.

## 2. Link health (outbound URLs)

- [ ] Sample or sweep outbound resource URLs. Classify **dead** ONLY on: DNS failure, connection refused, HTTP 404/410, SSL cert errors.
- [ ] **Connect timeouts from datacenter IPs are bot-blocks, NOT dead links.** Verify suspected timeouts via web search before repointing. (sportsvideo.org 403s curl but is alive.)
- [ ] Repoint truly dead links to official successor pages or Wayback snapshots; keep the resource unless content is gone everywhere.
- [ ] Admin Link Health tab: does a scan run, complete, and report honestly?

## 3. Metadata / SEO / sitemap

- [ ] Every indexable page: unique title, meta description, OG tags, single canonical, single robots meta. Titles must match between server-injected HTML (curl with no JS) and client-rendered DOM (two-pass parity).
- [ ] JSON-LD present in raw HTML (server-injected), valid JSON, correct @type per route, no duplicate/conflicting graphs after hydration.
- [ ] **Sitemap ↔ DB exact parity**: every sitemap URL returns 200 and is indexable; every indexable page is in the sitemap; no tombstoned/dup taxonomy slugs.
- [ ] Soft-404 check: `curl -s -o /dev/null -w '%{http_code}' https://awesome.video/bogus-path-xyz` must be 404, same for malformed/dot-path URLs (`/foo.bar`, `%`-junk — these have crashed dev before).
- [ ] Noindex pages (admin, profile, settings) carry noindex in BOTH server HTML and client head, and omit canonicals.
- [ ] Exactly ONE HSTS header; ETag/304 behavior on `/api/awesome-list`.

## 4. Exports (admin)

- [ ] JSON/CSV/HTML/YAML/PDF all download non-empty. HTML entities escaped; YAML parses; CSV quoting correct; tags option honored in every format; PDF path gives user feedback (never silent).
- [ ] Users CSV email masking is **by design** (PII policy) — not a bug.
- [ ] GitHub export: completes, writes `github_sync_history` row, failures surfaced with error text (no green-washing).

## 5. Auth & session UX

- [ ] Register/login forms: native validation attrs, server-side password policy (whitespace-only rejected), field-level errors.
- [ ] Auth-check failure handling: real 401 → single request + login gate; server 500 → bounded backoff (~3 req/20s) + error banner. NO retry storms.
- [ ] Resend-verification cooldown; login rate limiting (per-instance in-memory — known autoscale caveat).
- [ ] `?next=` redirect validation rejects `//evil` AND `/\evil` forms.
- [ ] Admin API: 401 anon, 403 non-admin on every `/api/admin/*` route.

## 6. Accessibility & UI/UX

Run `ui-experience-audit` phases per screen; specifics that have bitten this site:

- [ ] Mobile drawer: focus trap while open, Escape closes AND returns focus to hamburger.
- [ ] Search palette fits 812×375 landscape with visible keyboard selection.
- [ ] Radix Tabs: tablist reachable by Tab, roving tabindex (all-but-active tabindex=-1 is CORRECT), ArrowLeft/Right moves.
- [ ] Toggle buttons (bookmark/favorite): keep focus after click, use aria-disabled not hard `disabled` (hard disabled drops focus).
- [ ] Progressbars: role + aria-valuenow/min/max.
- [ ] Radiogroups: arrow-key selection.
- [ ] Dialogs/popovers: Escape closes; opening must NOT jump page scroll (see body-height gotcha).
- [ ] Touch targets ≥44×44 at 375px; action buttons keep labels at 375px.
- [ ] Print stylesheet exists; hover/cursor affordances global.
- [ ] Every state gives feedback: loading, error (honest + retry), empty, offline.

## 7. Design system

READ `replit.md` "Design-System scope (MR-DS-13)" first. Three intentional divergences — do NOT file as violations:

1. shadcn/ui primitives replace raw `.btn/.card/.chip/.input` (bridge via `@theme inline` in `client/src/index.css`). Raw `<button>` outside `.btn` is shadcn working as designed.
2. Atmosphere gradient on `body`; `.page contents` wrapper is intentionally box-inert.
3. 5-system × 10-accent runtime switcher at `/settings/theme`; tokens via `:root[data-system]`/`[data-accent]` attributes, persisted `ds-system`/`ds-accent` in localStorage, pre-paint boot script (FOUC-free).

Audit instead: token usage (no hardcoded colors outside `/* DS-OK */`-tagged recharts literals — palette source: `client/src/lib/charts/palette.ts`), system/accent switching persists across reload, focus rings visible in all 5 systems.

## 8. Admin surfaces

- [ ] Approvals table: actions reachable at 375/768/1440 (historic clip bug), approval dialog only linkifies well-formed http(s) URLs.
- [ ] Resources table: sorting, page-size, first/last; rows-per-page dropdown opens in-viewport without scroll jump.
- [ ] Researcher: job history has no overflow, costs 4-decimal `$X.XXXX`, turns capped display (`7/100`), failed jobs show honest crash explanations.
- [ ] Metrics tab numbers reconcile with resource counts elsewhere.
- [ ] Audit logs: real pagination, actor names resolve.
- [ ] Stats badge polls (~30s) + refetches on focus.
- [ ] Journey steps editor groups 3-rows-per-step into logical step cards.

## 9. Performance & caching probes

- [ ] `/api/awesome-list`: warm cache + 304 path works (cold ~150ms, warm ~15ms, 304 ~3ms baseline).
- [ ] Recommendations endpoint anon cold-start must be fast/O(1) DB — a hang here has previously wedged the whole pg pool.
- [ ] HTML must never 304 (rotating CSP nonce vs static ETag).
- [ ] Taxonomy nav is SPA (soft) navigation, not full reloads.
