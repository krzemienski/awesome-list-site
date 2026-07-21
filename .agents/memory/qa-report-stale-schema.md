---
name: QA bug reports reference stale schema
description: External QA/audit reports for this repo assume a different (Next.js/Remix SSR) app with stale counts/routes; verify against live DB+code before fixing.
---

# QA bug reports reference a stale, wrong-architecture schema

Production QA/audit bug reports handed to this project are frequently written against
a **different app shape** (Next.js- or Remix-SSR-style) with different routes, schema
shapes, and resource counts than the real stack (React + Vite + Express + Drizzle +
wouter **SPA** with an og-middleware crawler-prerender — NOT React/Remix SSR).

**Why:** in one 25-bug sweep ~9/25 did not reproduce; in a later ~29-bug sweep only
**3** were genuine (dev banner shipped, one inflated count claim, a search render cap)
— the other ~23 were false positives + 1 external-paywall BLOCKED. The report author
had curled the site (no JS) and assumed Remix SSR.

**Recurring false-positive patterns (check these before writing any fix):**
- **curl-without-JS on a SPA** → "pagination identical / tag filter no-op / sort no-op /
  form fields missing / profile blank / header count ≠ rendered" are ALL artifacts of
  seeing pre-hydration or crawler-prerendered HTML. Verify in a REAL browser
  (screenshot); these behaviors work once JS runs.
- **wrong HTTP method** → report GETs a POST-only endpoint (e.g. `/api/interactions`)
  and calls the 404 a bug. Check the route's method + what the client actually calls.
- **wrong endpoint name** → report tests an endpoint that was never the design
  (e.g. `/api/suggest-edit` when the real one is `/api/resources/:id/edits`).
- **wrong URL shape** → report tests `/subcategory/{cat}/{sub}` when the app uses
  single-slug `/subcategory/:slug`; the 404 is correct.
- **ids below the real min** → `/resource/<id>` 404 for ids under `min(id)` is CORRECT
  (they never existed); don't treat "valid-range" claims as fact — query min/max.
- **stale counts** → report numbers predate a cleanup. Counts here derive from ONE
  complete server tree; header-vs-sum "mismatch" is stale unless real dup rows exist.
- **`&amp;` in HTML attributes is correct escaping**, not a malformed-URL bug.
- **routes that 301-redirect** (e.g. `/auth/register`, `/subsubcategory/...`) are often
  reported as 404 by tools that don't follow redirects.
- **audit crawled prod BEFORE the latest republish** → a whole round of already-fixed
  findings re-appears as "unfixed" (Rounds 2 and 3 both did this). Diff the new round
  against the previous `evidence/runN/findings-table.md` FIRST; repeats of dev-fixed
  items are PENDING-REPUBLISH, not new work. Only a handful per round are genuinely new.
- **guessed endpoint/cookie provenance** → e.g. flagging the `GAESA` cookie (Google App
  Engine affinity, injected by Replit hosting, zero repo hits) as "our session cookie";
  the app's real session cookie is `connect.sid` with proper flags. grep the repo for
  the artifact name before accepting ownership of it.

**How to apply:** reproduce every reported bug against the live DB + running app
(curl the API with correct method, query the DB for ids/counts, screenshot the page in
a real browser) BEFORE touching code. Categorize: Fixed / Not-reproduced /
Feature-request (needs sign-off) / Third-party-BLOCKED. Fix the honesty/count class
*completely* (grep for every hardcoded count copy), not just the one instance reported.
