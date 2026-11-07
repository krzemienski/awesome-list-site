// Generated-input check of the catalog count contract, run on the real
// repository queries against a throwaway local Postgres (check.sh creates it).
//
// For every generated catalog and every category row:
//   counts  = CategoryRepository.getResourceCountsByCategory()  (GET /api/categories resourceCount)
//   total   = ResourceRepository.listResources({ status: "approved", category }).total
//             (GET /api/resources?category=<name> total)
//   oracle  = rows we inserted with status exactly "approved" and that exact category
// Parity:        (counts[name] ?? 0) === total
// ApprovedOnly:  (counts[name] ?? 0) === oracle
const dbUrl = process.env.DATABASE_URL ?? "";
if (!/^postgresql:\/\/localhost(:\d+)?\/awesome_formal_counts$/.test(dbUrl)) {
  console.error("Refusing to run: DATABASE_URL must be the throwaway local awesome_formal_counts DB. Use check.sh.");
  process.exit(2);
}

const { db } = await import("../../../server/db");
const { resources, categories } = await import("../../../shared/schema");
const { CategoryRepository } = await import("../../../server/repositories/CategoryRepository");
const { ResourceRepository } = await import("../../../server/repositories/ResourceRepository");
const { sql } = await import("drizzle-orm");

const categoryRepo = new CategoryRepository();
const resourceRepo = new ResourceRepository();

const TRIALS = Number(process.env.TRIALS ?? 200);
const SEED = Number(process.env.SEED ?? 1);

// Names that differ only by case, whitespace, punctuation or accents, plus
// slug-shaped and LIKE-metacharacter names.
const CATEGORY_NAMES = [
  "Encoding & Codecs", "encoding & codecs", "Players & Clients", "av1", "AV1",
  "Streaming", "Streaming ", " Streaming", "Café", "Cafe", "100%_Video", "a'b",
];
const ORPHAN_NAMES = ["Orphan Category", ""];
const STATUSES = ["approved", "pending", "rejected", "withdrawn", "archived", null] as const;

type Row = { category: string; status: (typeof STATUSES)[number] };
type Catalog = { categoryNames: string[]; rows: Row[] };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generate(seed: number): Catalog {
  const r = rng(seed);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const categoryNames = Array.from(new Set(Array.from({ length: 1 + Math.floor(r() * 5) }, () => pick(CATEGORY_NAMES))));
  const rowPool = [...categoryNames, ...CATEGORY_NAMES, ...ORPHAN_NAMES];
  const rows = Array.from({ length: Math.floor(r() * 14) }, () => ({
    category: r() < 0.7 ? pick(categoryNames) : pick(rowPool),
    status: pick(STATUSES),
  }));
  return { categoryNames, rows };
}

async function load({ categoryNames, rows }: Catalog) {
  await db.execute(sql`TRUNCATE resources, categories RESTART IDENTITY CASCADE`);
  if (categoryNames.length) {
    await db.insert(categories).values(categoryNames.map((name, i) => ({ name, slug: `formal-${i}` })));
  }
  if (rows.length) {
    await db.insert(resources).values(rows.map((row, i) => ({
      title: `Resource ${i}`,
      url: `https://formal.invalid/${i}`,
      category: row.category,
      status: row.status,
    })));
  }
}

type Violation = { property: "Parity" | "ApprovedOnly"; category: string; counts: number; total: number; oracle: number };

async function check(catalog: Catalog): Promise<Violation | null> {
  await load(catalog);
  const counts = await categoryRepo.getResourceCountsByCategory();
  for (const cat of await categoryRepo.listCategories()) {
    const shown = counts[cat.name] ?? 0;
    const { total } = await resourceRepo.listResources({ status: "approved", category: cat.name, limit: 1 });
    const oracle = catalog.rows.filter((row) => row.status === "approved" && row.category === cat.name).length;
    if (shown !== total) return { property: "Parity", category: cat.name, counts: shown, total, oracle };
    if (shown !== oracle) return { property: "ApprovedOnly", category: cat.name, counts: shown, total, oracle };
  }
  return null;
}

// Drop rows, then categories, one at a time while the failure persists.
async function shrink(catalog: Catalog): Promise<{ catalog: Catalog; violation: Violation }> {
  let current = catalog;
  let violation = (await check(current))!;
  for (const key of ["rows", "categoryNames"] as const) {
    for (let i = current[key].length - 1; i >= 0; i--) {
      const candidate = { ...current, [key]: current[key].filter((_, j) => j !== i) } as Catalog;
      const v = await check(candidate);
      if (v) { current = candidate; violation = v; }
    }
  }
  return { catalog: current, violation };
}

let failure: { seed: number; catalog: Catalog; violation: Violation } | null = null;
for (let t = 0; t < TRIALS && !failure; t++) {
  const seed = SEED + t;
  const catalog = generate(seed);
  if (await check(catalog)) failure = { seed, ...(await shrink(catalog)) };
}

if (failure) {
  const { seed, catalog, violation: v } = failure;
  console.log(`FAIL  ${v.property} for category ${JSON.stringify(v.category)} (seed ${seed}, shrunk)`);
  console.log(`      /api/categories resourceCount = ${v.counts}`);
  console.log(`      /api/resources?category total = ${v.total}`);
  console.log(`      approved rows in that category = ${v.oracle}`);
  console.log(`      categories: ${JSON.stringify(catalog.categoryNames)}`);
  console.log(`      resources:  ${JSON.stringify(catalog.rows)}`);
  console.log(`      rerun: SEED=${seed} TRIALS=1 scripts/formal/catalog-counts/check.sh`);
} else {
  console.log(`PASS  Parity and ApprovedOnly held on ${TRIALS} generated catalogs (seeds ${SEED}..${SEED + TRIALS - 1})`);
}
await db.$client.end();
process.exit(failure ? 1 : 0);
