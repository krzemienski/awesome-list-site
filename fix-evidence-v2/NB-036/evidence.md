# NB-036 (LOW) — Unstyled app-chrome flash above the SSR preview
**Verdict: VERIFIED CLEAN (no unstyled chrome during hold).** Throttled cold load (CDP 120ms RTT / 180KB/s down) of /category/intro-learning with 250ms DOM sampling + frame captures:
- t≈0.9s–10.8s (hold phase): only the styled SSR preview exists in #root (nav.ssr-crumbs / nav.ssr-pagination, scoped inline styles). NO header/sidebar/app-chrome nodes present at all. Frames hold-frame-t1500.png / hold-frame-t5200.png show the fully styled SSR preview, nothing unstyled above it.
- t≈11.4s (JS boots): the hold overlay is created (z-index 2147483000) BEFORE React chrome mounts; sampled React header/sidebar nodes exist only underneath the overlay.
- t≈12.0s: overlay removed only after React content committed; no intermediate frame exposes unstyled fragments.
DOM sample log + probe: /tmp/nbev/probe36.mjs. Acceptance ("no unstyled header fragments visible during the hold phase") met.
