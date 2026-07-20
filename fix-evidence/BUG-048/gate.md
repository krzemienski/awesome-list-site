# VG-048 — `www` NXDOMAIN conflicts with HSTS includeSubDomains

**Verdict: PASS (platform/registrar — HSTS header is edge-owned; app emits none; www DNS is a registrar action journaled since Run21)**

## Evidence (live, July 20 2026)

### DNS
```
awesome.video     -> 34.111.179.208   (resolves)
www.awesome.video -> FAIL: Name or service not known (NXDOMAIN)
```

### HSTS ownership
- Prod sends `strict-transport-security: max-age=63072000; includeSubDomains` —
  emitted by the Replit/Google Frontend edge, not the app.
- The app deliberately sends **no** HSTS header (server/index.ts): Run16
  BUG-094 added an app-level HSTS, which arrived as a duplicate with
  conflicting directives next to the edge copy (Run17 BUG-051) — the app copy
  was dropped because the edge owns TLS termination and therefore owns HSTS.
  Re-adding an app HSTS header to strip `includeSubDomains` would recreate the
  duplicate-header defect and would NOT remove the edge's `includeSubDomains`
  copy — browsers would still see the stricter directive.

### Apex behavior
- Apex canonicalization works: `http://awesome.video/` → 301 → HTTPS apex → 200.
- No user-facing TLS dead end on any advertised link: the site never links to
  `www.` anywhere (the host simply doesn't resolve; HSTS on an unresolvable
  name cannot strand a user who was never sent there).

## Resolution path (user action, journaled since Run21 R4-029)
The real fix is at the registrar: add a `www` DNS record (CNAME → apex /
Replit-provided target) so `www.awesome.video` resolves and redirects to apex.
This was raised to the user in Run21 ("Remaining user action for R4-029: add
`www` DNS record at the registrar (or decline)") and remains outside agent and
app-code control. The HSTS policy itself is not modifiable app-side.
