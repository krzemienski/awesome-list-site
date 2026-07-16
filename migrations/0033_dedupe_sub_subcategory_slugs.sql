-- Run13 BUG-002: sub-subcategory slugs collide globally (prod: ffmpeg ×4,
-- roku ×3, av1/audio/hevc ×2, …) while the public route resolves by slug
-- alone (/sub-subcategory/:slug), so sibling categories shadow each other and
-- become unreachable by browsing.
--
-- Data-only + idempotent (publish pre-applies the dev diff and the boot
-- migrator re-runs DDL, so nothing here may fail on a second pass):
--  * keep the lowest-id row of each duplicate group on the original slug
--  * suffix the rest with '-sc<subcategory_id>' (the same convention dev's
--    import dedup already produces), falling back to '-<id>' when needed
--  * a second pass catches any residual collision with pre-existing slugs
-- After both passes every slug is globally unique, so re-running is a no-op.
-- No new UNIQUE index on slug: publish applies schema diffs BEFORE this data
-- fix runs on prod, so a schema-level index would 23505 the publish itself.

UPDATE sub_subcategories s
SET slug = s.slug || '-sc' || COALESCE(s.subcategory_id::text, s.id::text)
WHERE s.id <> (SELECT min(t.id) FROM sub_subcategories t WHERE t.slug = s.slug);

UPDATE sub_subcategories s
SET slug = s.slug || '-' || s.id
WHERE s.id <> (SELECT min(t.id) FROM sub_subcategories t WHERE t.slug = s.slug);
