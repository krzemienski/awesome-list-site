# R5-031 — NFKC-fold + strip Cf before common-password denylist

**Claim: fixed (code).** (LOW)

passwordVisibleCheck NFKC-normalizes and strips format chars before the common-password denylist,
so confusable/fullwidth homographs of "password" are caught.
Unit (units.out): `passworｄ`, `𝐩assword`, `ｐａｓｓｗｏｒｄ` all -> "too common".
