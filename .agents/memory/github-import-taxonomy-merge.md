---
name: GitHub import taxonomy collisions merge
description: How GitHub import resolves headings whose slug/case collides with an existing (or earlier) taxonomy node, and why it merges instead of suffixing slugs
---
Imported headings resolve per level (same parent) by exact name → same slug → case-insensitive name; a match MERGES into that node and resources get the node's canonical name (never the imported spelling). Each merge is surfaced as an import warning.

**Why:** the parser's normalizeCategory keeps only letters/digits/space/&/"/"/-, so two imported names with one slug differ only in case/punctuation = same concept. A suffixed slug ("-2") would create a phantom duplicate node and move existing resources into it on round-trip re-imports (export writes names the parser then strips). Until 2026-10-26 it also stripped "/", so `iOS/tvOS` became `iOStvOS` (slug `iostvos`), matched neither name nor slug `ios-tvos`, and a re-import planned a duplicate node (PR #39).

**How to apply:** any new taxonomy-creating import path should reuse this rule; never write category text that names no taxonomy row (orphans desync counts). Before widening or narrowing normalizeCategory, check every upstream heading's slug still matches its existing node: the production dry run's `wouldCreateTaxonomy` should be empty. Dry run writes nothing (PR #34) and reads the catalog once (PR #37); on production it answers in about 10 s.
