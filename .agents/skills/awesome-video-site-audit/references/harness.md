# Verification Harness — Exact Commands

The Iron Rule applies (`functional-validation`): drive the real system, capture evidence, read it, then verdict.

## Playwright executor

Scripts go in `/tmp/pw/*.js` (NOT the repo — repo writes during runs cause Vite-reload flakes). Run via:

```bash
cd .local/custom_skills/playwright-skill && node run.js /tmp/pw/my-probe.js
```

Launch with the pinned executable (the installed Chromium doesn't match the package's expected revision — never reinstall):

```js
const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome',
});
```

If the chromium-NNNN directory changed, `ls /home/runner/workspace/.cache/ms-playwright/` and use what's there.

Quirks:
- Occasional silent `-1` exits with no error — just rerun.
- Full `page.goto` sweeps die at the ~120s bash budget: **≤8 gotos per invocation**. For broad route sweeps, use SPA navigation instead (pushState + popstate) — ~0.75s/route, ~100 routes/call.
- Long jobs: nohup dies with the bash session. Use a resumable cursor + JSONL output, ~88s per invocation budget.

## Auth

**Prod admin login** (single attempt — lockout is 15 min):

```bash
curl -s -X POST https://awesome.video/api/auth/local/login \
  -H "Content-Type: application/json" -H "Origin: https://awesome.video" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"$ADMIN_PASSWORD\"}" -D /tmp/hdr.txt -o /tmp/body.txt
grep -i "^set-cookie: connect.sid" /tmp/hdr.txt | sed 's/[Ss]et-[Cc]ookie: //' | cut -d';' -f1 > /tmp/adm_cookie.txt
```

Dev is the same against `http://localhost:5000` (Origin header optional in dev). In Playwright, inject the cookie:

```js
const [name, value] = require('fs').readFileSync('/tmp/adm_cookie.txt','utf8').trim().split('=');
await ctx.addCookies([{ name, value, domain: 'awesome.video', path: '/', httpOnly: true, secure: true }]);
// dev: domain 'localhost', secure: false
```

All prod mutations need `Origin: https://awesome.video` or they 403.

## Standard viewports

Desktop 1440×900 · Mobile 375×667 (`isMobile: true, hasTouch: true`) · Landscape-mobile 812×375 · Tablet 768×1024. P0 smoke = key routes at desktop AND mobile with zero page errors (listen for `page.on('pageerror')`).

## Probe script conventions

- One JSON output per script: `{ script, when, checks: { 'NB-NNN_label': { ...observations, pass } } }` written to `/tmp/…json`, then **immediately** `cp` into `evidence/runNN/` (`/tmp` is wiped on restart/republish).
- Assert on observable content (counts, text, rects, aria attrs), not just HTTP 200s.
- Tab/panel sweeps: assert the target panel activated (`aria-selected`, `data-state=active`) before scanning.
- Screenshots for visual verdicts → walk `visual-inspection` checklist before PASS.

## Data checks

Dev DB: use the SQL tool / drizzle scripts freely. **Prod DB: read-only SQL via the database skill (`environment: "production"`); writes ONLY via live admin API scripts** (`scripts/runNN-*-prod.ts` pattern, idempotent, pinned `connect.sid`).

## QA account lifecycle

Create throwaway users as `__qa_test_<run>@example.com` ONLY. Teardown to net-zero at the end of every session:

1. Delete their resource_edits, NULL non-cascade FKs, then delete the user (admin API user-delete handles detachment — check `resourcesDetached` in the response).
2. Delete any probe resources/journeys you created (record ids as you go).
3. Verify: `__qa_test%` users = 0, probe resources = 0. Prior-run residue counts too — purge ALL `__qa_test*`, even below a recorded baseline.
4. Do NOT delete `qa-*`/`r3verify*` accounts — external auditor residue, not ours.

## Done gate (fixer)

```bash
npx tsc --noEmit            # clean
# restart 'migration-drift' workflow — must pass
# P0 smoke probe (desktop+mobile), evidence filed
# QA teardown net-zero verified
```
