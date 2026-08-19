---
name: Reserved characters in SPA routes
description: Canonical routing rules for dynamic SPA segments that may contain dots or URL-reserved characters.
---

Use one shared path builder that normalizes the domain identity and then applies `encodeURIComponent` exactly once. Decode safely only at route boundaries. Route-specific canonicalization must own letter-case handling for encoded dynamic segments.

**Why:** Dotted tag values were mistaken for static assets and bypassed crawler metadata injection, while generic lowercase redirects altered uppercase percent-escape bytes and could fight the canonical redirect. Symbol-heavy values such as C++ then redirected away from their sitemap URL.

**How to apply:** When adding a dynamic route whose identities are not constrained to simple slugs, exempt its prefix from extension-based asset detection, exclude it from generic path lowercasing, and test dots, plus signs, percent signs, and encoded slashes across sitemap, redirect, canonical, and hydrated-client behavior.