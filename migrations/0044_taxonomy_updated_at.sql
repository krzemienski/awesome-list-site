ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

ALTER TABLE "subcategories"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

ALTER TABLE "sub_subcategories"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();