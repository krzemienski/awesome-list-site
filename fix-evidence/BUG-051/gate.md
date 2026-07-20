# VG-051 — GAESA cookie is undocumented

**Verdict: PASS**

## Prior state
GAESA already had a row in the /privacy cookie table (NB-035, Run18), but its
lifetime was vague ("Set by the hosting platform") and it carried no retention
or user-control/opt-out information — short of the gate's "purpose, scope,
retention, and control" bar.

## Live cookie behavior (prod, July 20 2026)
```
$ curl -sD - https://awesome.video/ | grep -i set-cookie
set-cookie: GAESA=Cp4B…; expires=Wed, 19-Aug-2026 02:42:24 GMT; path=/
```
- Set by the Google App Engine hosting edge on the very first response
  (before any consent interaction — the app never emits it; journaled as a
  platform edge cookie since Run16 BUG-092).
- Retention: expires exactly 30 days from the request (Jul 20 → Aug 19).
- Scope: `path=/` (site-wide), host-only.

## Documentation fix (client/src/pages/Privacy.tsx, section 3 cookie table)
The GAESA row now states, matching the live attributes above:
- **Name**: documented by name (`GAESA`, monospace cell).
- **Purpose**: infrastructure/request-routing cookie set by the hosting edge
  (Google App Engine), not the application; no tracking, no analytics, never
  read by the app.
- **Scope**: site-wide (path "/"); appears on first visit regardless of the
  analytics consent choice, because it originates at the edge.
- **Retention**: "About 30 days from your last visit" (matches the live
  30-day `expires`).
- **Control/opt-out**: can be blocked or deleted in browser settings at any
  time; the site keeps working; the edge may set a fresh one later. (The
  consent banner cannot control it because it is not an application or
  analytics cookie — stated implicitly via the consent-independence sentence.)

## Live verification (real browser, dev)
Rendered /privacy in Chromium, extracted the GAESA table row — full text
matches the above; screenshot `privacy-cookie-table.png`. Header evidence and
row text captured July 20 2026.
