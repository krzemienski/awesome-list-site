# VG-005 — UT Video outbound link dead (BUG-005) — PASS

**Finding**: Resource 186676 ("UT Video Codec Suite") pointed to
`http://umezawa.dyndns.info/wordpress/?page_id=67`. Live probe July 19, 2026:
`HTTP/1.1 404 Not Found` (Apache/2.4.58) — the WordPress page is gone.

**Root-cause candidates considered**:
1. Transient DNS/reset (dyndns host) → rejected: host resolves and answers;
   the specific page 404s deterministically.
2. Page moved within the same site → rejected: no redirect emitted; site's
   WordPress install no longer serves the codec page.
3. Content relocated to the author's GitHub → selected:
   `https://github.com/umezawatakeshi/utvideo` is the author's official
   UT Video repo (releases current through 2025; GPL-2.0; matches the spec's
   "verified live GitHub mirror" directive).

**Fix**: `scripts/run22-link-fixes-prod.ts` (idempotent, URL-matched, via the
live admin API). Dev applied: 1 repoint, 0 failures
(`evidence/run22/link-fixes-dev.json`). Exactly one umezawa.dyndns.info row
exists. Prod journaled: run the same script against prod after republish.

**Gate evidence** (live dev):
- `curl-transcript.txt` — `curl -sIL -m 15 https://github.com/umezawatakeshi/utvideo`
  → `HTTP/2 200` direct.
- `bug-005-resource-page.png` — /resource/186676 displays the corrected URL
  on both the "Visit Resource" button and the URL field; page renders
  correctly, no unrelated resource-link behavior changed (BUG-004's page and
  all other outbound links untouched by the URL-matched rules).
- `bug-005-destination.png` — destination loaded in a real Chromium browser:
  umezawatakeshi/utvideo repo, status 200.

**Verdict: PASS**
