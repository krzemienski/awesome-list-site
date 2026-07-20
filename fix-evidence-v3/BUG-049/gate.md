# BUG-049 — Admin edit enforces shared validators server-side

**Claim: fixed (code).** (MEDIUM)

Admin create/edit bodies are validated server-side with the shared visible-text + URL + bounds
schemas (resourceTitleSchema, resourceDescriptionSchema, webUrlSchema/httpsUrlSchema). Rejections
return 400 with field-naming messages the client modal (Run24F) can surface.
Repro (http1.out): admin PUT bidi title -> 400 with validation message; valid audit read still 200.
