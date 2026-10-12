---
name: Robots parser precedence
description: Avoid false permission failures when verifying robots.txt with both root Allow and specific Disallow rules.
---
Use a robots parser implementing longest-path-match precedence when checking crawler permissions.

**Why:** Python 3.11 urllib.robotparser returns the first matching rule. With `Allow: /` before private-path exclusions it incorrectly reports private URLs as allowed, unlike search-engine matching semantics.

**How to apply:** Verify the real served document with a longest-match parser (such as robots-parser), checking both private exclusions and public allowances for explicitly named agents and an unknown crawler.
