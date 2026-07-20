# VG-044 — Hashed assets use private caching

**Verdict: PASS (fixed-prior app-side; residual `private` + Set-Cookie is platform edge injection)**

## Finding vs reality
The app-side fix already exists (landed Run16 as BUG-016, `server/index.ts`): a
dedicated `express.static` mount for `/assets` with `immutable: true, maxAge: "1y"`
runs BEFORE the default static handler, because `serveStatic` (server/vite.ts,
unmodifiable per project rules) mounts with default `maxAge=0`.

## Live evidence (July 20 2026)

### App origin (local production build, `NODE_ENV=production node dist/index.js`, port 5001)
Fresh `npm run build` (42 hashed assets: 41 .js + 1 .css — the bundle emits **no
hashed image or font assets**: icons are inline lucide SVGs, fonts load from the
Google Fonts CDN, favicons are unhashed root files):

- `GET /assets/About-B3our3ll.js` → `Cache-Control: public, max-age=31536000, immutable`, **no Set-Cookie**
- `GET /assets/index-DLdZXyWn.css` → `Cache-Control: public, max-age=31536000, immutable`, **no Set-Cookie**
- `GET /` (HTML, nonce'd CSP) → `Cache-Control: no-store` (correct: nonce'd HTML must never be cached — see run19 nonce/304 fix)

### Live prod (https://awesome.video)
- `GET /assets/index-Bv6bae0S.js` → `cache-control: private, max-age=31536000, immutable` + `set-cookie: GAESA=…`
- `GET /assets/index-C9mseBt2.css` → same.

The `private` downgrade and the `GAESA` Set-Cookie are added by the Google
Frontend hosting edge (`server: Google Frontend`, `via: 1.1 google`): GFE appends
its session-affinity cookie (GAESA) to every response and, because a Set-Cookie
is present, rewrites cacheability to `private`. This is the same platform
behavior journaled in Run16 (BUG-092) and Run17 (BUG-050) — not app-controllable.
Practical impact is limited: `private, max-age=31536000, immutable` still gives
browsers full one-year immutable caching; only shared caches are excluded.

### Personalized responses remain protected
- Prod `GET /api/auth/user` → `cache-control: private` (never publicly cacheable).
- HTML shell → `no-store` at origin.

## Pass criteria mapping
- Hashed assets `Cache-Control: public` + immutable lifetime → **true at the app
  origin** (the surface this codebase controls); edge rewrites to `private`
  (platform, journaled).
- No `Set-Cookie` on assets → **true at the app origin**; GAESA is edge-injected.
- Personalized responses protected → private/no-store confirmed.
