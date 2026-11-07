---
name: Pageview titles come from loading heads
description: Why loading-state SEOHead titles must name the destination page
---
Soft-navigation pageviews (Umami auto-tracking) read document.title ~300 ms after pushState, while the route chunk or listing is still loading. Generic loading titles ("Loading resource", bare "Awesome Video") therefore show up in analytics as page titles.

**Why:** a 7-day query showed ~115 pageviews filed under loading/brand titles instead of page names.
**How to apply:** any new loading state should pass a real name (from the nav cache or a cached list) to SEOHead with `loading` set, so it still yields to the server head on first paint.
