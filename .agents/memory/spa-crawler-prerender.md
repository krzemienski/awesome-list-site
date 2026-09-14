---
name: SPA crawler prerender and exact Home SSR
description: Keep crawler prerendering separate from the narrow exact-tree Home SSR exception.
---

# Crawler prerendering and exact-tree SSR have different contracts

Crawler-visible routes normally use injected semantic HTML as a progressive
enhancement. That markup is not necessarily React-identical and must retain the
client's replacement path rather than being hydrated as though it were the app.

An exact-tree SSR exception is safe only when all of these are true:

- It is limited to one explicitly authorized public route and a bounded request
  shape. Unsupported query-bearing and signed-in requests keep the established
  SPA path.
- The server renders the same provider and route tree that the client hydrates,
  with every server-visible query explicitly preloaded. Missing data is a server
  rendering failure, not a reason to fetch/retry during SSR.
- The serialized bootstrap contains public data only. It must never contain a
  session, identity, claims, token, or a client-cacheable assertion inferred
  from an anonymous request.
- A guessed anonymous auth query must not be dehydrated. Otherwise the fresh
  client cache can suppress the real post-hydration auth check and hide a
  session established between rendering and hydration.
- Request-time guest hints exist only to make the initial hydration tree exact.
  Retire them after the first hydrate so later SPA authentication, preferences,
  and navigation use live browser/API state.
- Rendering failures must fail open to the existing SPA rather than turn a
  healthy public route into an error document.

For Home, the exception remains public-only: preserve prepaint theme/layout and
consent behavior through hydration, then reconcile it through their normal live
sources. Validate the exact allowed CSP origin rather than a wildcard, and
verify that legacy consent controls can reopen after reconciliation.