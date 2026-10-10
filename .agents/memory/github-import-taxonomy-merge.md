---
name: GitHub import taxonomy collisions merge
description: How GitHub import resolves headings whose slug/case collides with an existing (or earlier) taxonomy node, and why it merges instead of suffixing slugs
---
Imported headings resolve per level (same parent) by exact name → same slug → case-insensitive name; a match MERGES into that node and resources get the node's canonical name (never the imported spelling). Each merge is surfaced as an import warning.

**Why:** the parser's normalizeCategory keeps only letters/digits/space/&/-, so two imported names with one slug differ only in case/punctuation = same concept. A suffixed slug ("-2") would create a phantom duplicate node and move existing resources into it on round-trip re-imports (export writes names the parser then strips).

**How to apply:** any new taxonomy-creating import path should reuse this rule; never write category text that names no taxonomy row (orphans desync counts). Note: import dryRun still creates taxonomy nodes (STEP 3 runs regardless) — pre-existing behavior.
