---
name: pg_trgm indexable recovery
description: How to keep typo-recovery predicates on GIN trigram indexes while retaining useful ranking.
---

Use pg_trgm operators (`%`, `<%`, `<<%`) to select fuzzy candidates from columns indexed with `gin_trgm_ops`. Keep `similarity()` and `word_similarity()` functions for `ORDER BY` after candidate narrowing; a predicate such as `word_similarity(query, column) >= threshold` does not use that GIN index.

**Why:** A fuzzy search met recall and latency on the current small catalog while silently scanning indexed columns. `EXPLAIN (ANALYZE, BUFFERS)` only showed the expected `BitmapOr`/`Bitmap Index Scan` plan after switching candidate predicates to operators.

**How to apply:** For any trigram-backed recovery path, verify the real combined predicate with `EXPLAIN`; the plan must name the intended trigram indexes. Do not infer index use merely because an indexed column appears inside a pg_trgm function.

For transposition-heavy product names, keep the common path on GIN operators/FTS variants. If that path returns a true zero, a compact-title GiST `<->` nearest-neighbor query with a minimum similarity floor can recover useful candidates without turning every fuzzy search into the slower KNN plan or eliminating genuine zero states.