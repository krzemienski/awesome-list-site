---
name: Link-scan false positives from datacenter IPs
description: How to classify dead links safely when scanning from Replit's cloud egress
---

**Rule:** a connect timeout (`UND_ERR_CONNECT_TIMEOUT`) or generic connection failure observed from a datacenter/cloud IP must NEVER be classified as a dead link. It is the classic IP-range bot-block signature.

**Why:** a July 2026 prod dead-link sweep initially rejected live resources (trac.ffmpeg.org, cta.tech, jplayer.org, forum.kaltura.org) because undici's `UND_ERR_CONNECT_TIMEOUT` fell through a case-sensitive `"Timeout"` check into the hard-dead bucket. External crawlers (Firecrawl) hit the same block — a second datacenter vantage proves nothing.

**How to apply:**
- Only classify as dead: DNS `ENOTFOUND`, `ECONNREFUSED`, browser-UA-confirmed HTTP 404/410, and SSL cert failures (browsers block those for humans too).
- Timeout/reset-only failures: verify via `webSearch` liveness queries (external human-vantage evidence) before any status change.
- Known cloud-IP blockers seen in this catalog: trac.ffmpeg.org (Trac), cta.tech, jplayer.org, forum.kaltura.org, medium.com, nabshow.com. openelec.tv is genuinely dead (project discontinued).
- Match error strings case-insensitively (`/TIMEOUT|ABORT|EAI_AGAIN/i`).
