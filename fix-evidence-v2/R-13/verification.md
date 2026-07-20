# R-13 — http→https redirect includes :443 (LOW, relates BUG-047)

**Date:** July 20, 2026 · **Status:** PLATFORM (documented, not app-fixable) · **Re-verified live**

## Repro (fresh transcript, `transcript.txt`)

```
$ curl -sI http://awesome.video/
HTTP/1.1 301 Moved Permanently
Location: https://awesome.video:443/
```

## Why this is platform-layer

Port-80 traffic never reaches the application. The Express app listens on one
internal port behind the Replit deployment edge; the http→https 301 is minted
by the hosting edge (Google Frontend — same layer identified in R-11 via
`server: Google Frontend` / `via: 1.1 google`). There is no app code path that
emits this Location header — no `:443` string exists anywhere in the server
codebase — so no application change can alter it. The audit acceptance itself
concedes: "Requires platform config, not app code."

Note `:443` in an https URL is semantically harmless (default port); browsers
normalize it. The app's own canonicalization (og-middleware 301 class, Run21
R4-009/028/062) never emits a port.

## Action available to the user

None in-app. If Replit exposes redirect customization for custom domains in
the future, this is where it would be configured. Documented for future audits:
do not re-triage as an app bug.
