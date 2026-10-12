---
name: Secret leak scan must cover git history by value
description: How the owner password leak was found despite a clean tree; the recipe for proving a secret is (not) in public history.
---

**Rule:** "No secrets in committed config" is only proven by comparing each real secret VALUE against every blob in history (`git cat-file --batch-all-objects --batch` + `grep -aoF -f valuesfile`, print counts/names only), not by pattern regex on the current tree.

**Why:** In Oct 2026 the tree and `.replit` were clean and pattern scans found only placeholders, but the OWNER_PASSWORD/ADMIN_PASSWORD value (same string, no recognizable prefix) sat in July audit scripts deleted by a deep-clean — still anonymously readable on the PUBLIC GitHub repo and still a working prod admin login.

**How to apply:**
- Locate with `git log --all -S"$VALUE" --name-only`; check exposure with `git branch -r --contains` + anonymous raw.githubusercontent.com fetch (status + grep -c, never echo).
- Remediation is rotation (admin cookies are HMAC-keyed on the password, so rotation revokes sessions too); a history rewrite is pointless once a fork exists.
- Never hardcode ADMIN_PASSWORD/OWNER_PASSWORD in scripts or evidence — read from process.env.
