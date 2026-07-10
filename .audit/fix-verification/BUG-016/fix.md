# BUG-016 — REFUSED
See REFUSAL.md. The GAESA cookie is set by the Google Frontend CDN layer in front of the Replit deployment, NOT by the application. `grep -rn "GAESA|setCookie|res.cookie" server/` returns no application matches. The application cannot add HttpOnly/Secure to a cookie it does not set. Manual follow-up: ask hosting operator to harden GAESA on the CDN.
