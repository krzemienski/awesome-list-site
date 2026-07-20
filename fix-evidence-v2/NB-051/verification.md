# NB-051 — TRACE/TRACK handling
Fixed prior (run12 BUG-v3-L02): server/index.ts registers an unsupported-method guard BEFORE all routes — any method outside GET/HEAD/POST/PUT/PATCH/DELETE/OPTIONS → 405 + Allow + {message}.
Live probes: TRACE /api/resources → 405, Allow: GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS, {"message":"Method not allowed"}. TRACK / → 400 from Node's HTTP parser itself (TRACK is not a method Node accepts — never reaches Express; equally safe).
Prod note (platform): the hosting edge intercepts TRACE with a Google-branded 405 before the app — not app-controllable; app-layer behavior above is what we own. A redundant routes-level guard added earlier this run was removed as dead code. VERIFIED.
