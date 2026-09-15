---
name: Lighthouse Lantern on a loopback origin
description: Why simulated Lighthouse scores measured against 127.0.0.1 sit structurally below production for the same code, and what is/isn't a real regression.
---
Lantern (Lighthouse's default "simulate" throttling) builds its FCP/LCP dependency graph from an UNTHROTTLED observation. On a loopback origin the module bundle and every above-the-fold font finish and execute before the first paint, so they land in the simulated FCP critical path (×4 CPU, 1.6Mbps); on the real origin the same bundle arrives after first paint. Expect Home-style SSR routes to simulate ~1s worse locally with identical code.

The bundle-in-FCP-graph part is NOT pure topology: a `<head>` module entry evaluates (and fetches route chunks) before the complete SSR markup is presented when the document arrives in one chunk (paint-before-hydrate fixed that, Home 79→83). What remains is the font race — three VeryHigh design faces landing 15–30ms before the observed paint on loopback (same build scores 88 when they land after).

**Why:** three quiet runs after fixing real regressions still read 79/62 vs same-day production 84/78; a CDP-throttled Playwright load showed FCP at 1.1s with nothing blocking. An HTTP/2 self-signed terminator in front of the local server did NOT close the gap (TLS+proxy hop made Home worse).

**How to apply:** compare production with the SAME tool on the SAME day, never a stored number; treat unthrottled `observed*` deltas and real-throttling probes as the regression signal; on HTTP/1.1 local origins a 40-chunk route fan-out costs ~1.5s under throttling (6 connections × 150ms RTT) — that is topology unless the chunk count itself grew. `--preset=perf` switches to devtools throttling (obsFCP === fcp) and is not comparable to simulate numbers.
