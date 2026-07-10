# E2E Validation Plan

Generated: 2026-07-10
Platform: fullstack
Scope: Full application (dev workspace, http://localhost:5000)

## Prerequisites

| Prerequisite | Check Command | Status |
|-------------|--------------|--------|
| PostgreSQL reachable | `psql "$DATABASE_URL" -c "SELECT 1"` | [ ] |
| App running (single port) | `curl -sf http://localhost:5000/api/health` | [ ] |
| Pinned Chromium present | `ls .cache/ms-playwright/chromium-1208/chrome-linux64/chrome` | [ ] |

## Startup Sequence

```bash
# App already managed by the "Start application" workflow (npm run dev, port 5000).
# If server files change mid-run: restart workflow (tsx has no --watch).
```

Baseline (captured pre-run, re-verified post-run for net-zero):
users=6 · resources_total=1994 · approved=1838 · categories=9 · published journeys=5 · 0 `__qa_test` residue.

---

## Journey 1: Database Integrity (Layer 1)

**PASS Criteria:**
- [ ] All 27 expected tables exist
- [ ] approved=1838, total=1994, categories=9, published journeys=5
- [ ] 0 category-orphans (every approved resource's `category` text matches a `categories.name`)
- [ ] 0 `__qa_test` residue rows

**Steps:**

| Step | Action | Command | Evidence Path |
|------|--------|---------|--------------|
| 1 | Schema dump | `psql "$DATABASE_URL" -c "\dt"` | `e2e-evidence/fullstack/j1/01-schema.txt` |
| 2 | Invariant counts | `psql` count query (users/resources/categories/journeys) | `e2e-evidence/fullstack/j1/02-invariants.txt` |
| 3 | Orphan check | `SELECT COUNT(*) FROM resources r WHERE status='approved' AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.name=r.category)` | `e2e-evidence/fullstack/j1/03-orphans.txt` |

**Verification:** read each file; orphans must be 0; counts must equal baseline.

---

## Journey 2: Backend API Core (Layer 2)

**PASS Criteria:**
- [ ] `GET /api/health` → 200
- [ ] `GET /api/health/ai` → 200 with `available` field
- [ ] `GET /api/awesome-list` → 9 categories, tree resource total = 1838
- [ ] `GET /api/categories` → 9 rows, counts sum = 1838, per-category counts match baseline
- [ ] `GET /api/resources?limit=24` → 24 items, `total`=1838
- [ ] `GET /api/resources?limit=-5` → 200 (clamped), NOT 500
- [ ] `GET /api/search?q=ffmpeg` → 200 with honest `total` > 0; `q=x` (1 char) → empty result
- [ ] `GET /api/resources/185811`-style detail (valid id from list) → 200 with title + url
- [ ] `GET /sitemap.xml` → 200, contains category URLs

**Steps:** curl each endpoint with `-w '%{http_code}'` piped to `e2e-evidence/fullstack/j2/NN-*.json`, verify with `jq`.

**Verification:**
```bash
jq '.categories | length' j2/03-awesome-list.json   # expected: 9
jq '[.[].resourceCount] | add' j2/04-categories.json # expected: 1838
jq '.total' j2/05-resources.json                     # expected: 1838
jq '.total' j2/07-search-ffmpeg.json                 # expected: > 0
```

---

## Journey 3: Authentication (Layer 2/4)

**PASS Criteria:**
- [ ] POST `/api/auth/register` with `__qa_test_e2e_<ts>@example.com` → 200/201, user created
- [ ] POST `/api/auth/local/login` with those creds → 200 + session cookie
- [ ] GET `/api/auth/user` with cookie → 200 returning ONLY {id,email,role,...} — **no passwordHash/hash fields anywhere in response**
- [ ] POST `/api/auth/logout` → session cleared; `/api/auth/user` then 401
- [ ] Wrong password login → 401, no 500
- [ ] GET `/api/login` → 302 Location contains `replit.com/oidc`
- [ ] Browser: `/login` shows "Continue with Replit" button; `/login?error=oauth` shows destructive toast and strips param
- [ ] Teardown: QA user fully removed (resource_edits swept / non-cascade FKs nulled before DELETE); users back to 6

**Steps:** curl with cookie jar → `e2e-evidence/fullstack/j3/`; Playwright screenshot for login page + toast.

---

## Journey 4: Frontend Browse (Layer 3)

**PASS Criteria:**
- [ ] Home renders: sidebar shows 9 categories, hero/count visible, 0 console errors
- [ ] Category page (Encoding & Codecs): badge "Showing 325 of 325" == API count; pagination "Page 1 of 14" @24/page; page-2 titles differ from page-1
- [ ] Resource detail: real h1 + working external link href
- [ ] `/search?q=ffmpeg`: result count matches API total for same query
- [ ] `/journeys` renders 5 journey cards
- [ ] `/settings/theme` renders system/accent picker

**Steps:** Playwright (pinned Chromium, SPA pushState nav where possible), screenshots per page state → `e2e-evidence/fullstack/j4/NN-*.png` + console log capture.

**Verification:** READ each screenshot; compare badge numbers to Journey 2 API values (not to hardcoded expectations alone).

---

## Journey 5: CRUD Integration — bookmark/favorite (Layer 4)

**PASS Criteria:**
- [ ] Logged-in QA user bookmarks a resource via UI click → button state flips
- [ ] `GET /api/bookmarks` (cookie) shows that resource id
- [ ] DB: `user_bookmarks` row exists for (qaUser, resource)
- [ ] Un-bookmark via UI → API returns empty, DB row gone
- [ ] Same pattern for favorite
- [ ] Net-zero: 0 rows left for QA user before teardown

**Steps:** Playwright UI actions + curl + psql, evidence → `e2e-evidence/fullstack/j5/`.

---

## Journey 6: Learning Journeys (Layer 3)

**PASS Criteria:**
- [ ] `GET /api/journeys` (or equivalent) → 5 published
- [ ] Journey detail page groups steps by stepNumber (no duplicate step cards for multi-row steps)

**Steps:** curl + Playwright screenshot of one journey detail → `e2e-evidence/fullstack/j6/`.

---

## Journey 7: Responsive (Layer 3)

| Viewport | Size | Pages to Test |
|----------|------|--------------|
| Mobile | 375×812 | `/`, category page, resource detail |
| Tablet | 768×1024 | `/`, category page |
| Desktop | 1440×900 | `/`, category page |

**PASS Criteria:**
- [ ] Mobile: `document.documentElement.scrollWidth <= 375` (no horizontal overflow) on all 3 pages
- [ ] Sidebar collapses to sheet/drawer on mobile; screenshots legible

Evidence → `e2e-evidence/fullstack/j7/`.

---

## Journey 8: Error Propagation (Layer 4)

**PASS Criteria:**
- [ ] `/resource/9999999` → in-app not-found state (no blank page/crash)
- [ ] `GET /api/resources/9999999` → 404 JSON (not 500)
- [ ] Bad login via UI form → visible error toast, no console crash
- [ ] Malformed query params (`/api/search?q=ffmpeg&limit=abc`) → 200/400, never 500

Evidence → `e2e-evidence/fullstack/j8/`.

---

## Cleanup

```bash
# Delete QA user(s): sweep email LIKE '__qa_test_%' — delete their resource_edits,
# NULL non-cascade FKs, then DELETE user rows.
# Re-verify baseline: users=6, total=1994, approved=1838, 0 __qa_test residue.
# Kill any stray Playwright chromium processes.
```

Final report → `e2e-evidence/report.md` with per-journey verdicts.
