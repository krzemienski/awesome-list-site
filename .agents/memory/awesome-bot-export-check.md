---
name: Export link check vs Link Health dashboard
description: Two separate link-check scopes — pre-push export gate/awesome_bot vs the production Link Health dashboard
---

Link checking has TWO deliberately separate scopes; never conflate them:

1. **Export/repository scope** — the generated Awesome-list Markdown is checked before it reaches the repository list: a gate in the GitHub export path blocks the push on confirmed-broken links, and the `awesome_bot` script/CI checks the exported README. Findings are logged/artifacts only, never written to the DB.
2. **Production scope** — the Link Health dashboard scans approved resources in the live DB and records results in the admin panel.

**Why:** conflating them makes the admin dashboard look like it covers export artifacts (it doesn't), and vice versa.

**How to apply:** both scopes share the same strict dead-link policy (only DNS failure / connection refused / browser-confirmed 404-410 / SSL failure count as dead; timeouts and 4xx/teapot bot-blocks never do) and the same documented allowlist of known false positives. Some hosts hold non-browser connections open until read-timeout, which some checkers report as an error rather than a timeout — those belong in the allowlist, not in "broken".
