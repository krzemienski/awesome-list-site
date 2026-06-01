-- Align research_discoveries with shared/schema.ts: the suggested_sub_subcategory
-- column existed in the Drizzle schema but had never been pushed to the live
-- database, so every researchService query selecting it failed at runtime.
-- Additive nullable column; idempotent.
ALTER TABLE research_discoveries ADD COLUMN IF NOT EXISTS suggested_sub_subcategory text;
