# BUG-020 — REFUSED
See REFUSAL.md. The 23 duplicate "groups" across sub-subcategories are legitimate cross-parent duplicates. Schema already enforces UNIQUE(slug, subcategoryId). Merging 13 "ffmpeg" sub-subcategories under different parents would collapse curator-distinct identity (irreversible, data loss). Manual follow-up: change URL routing to disambiguate via parent path.
