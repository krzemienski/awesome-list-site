#!/usr/bin/env node
/**
 * Proves that crawler prerender pages and the paged taxonomy API expose the
 * same ordered resource slice. Both surfaces intentionally share the cached
 * tree and flatten order, but this catches accidental future divergence.
 */
const base = process.env.BASE_URL ?? "http://127.0.0.1:5000";

const getJson = async (path) => {
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
};

const idsFromHtml = (html) => [...html.matchAll(/href="\/resource\/(\d+)"/g)].map((match) => Number(match[1]));

const nav = await getJson("/api/awesome-list/nav");
const samples = nav.categories.filter((category) => category.resourceCount > 0).slice(0, 3);
if (!samples.length) throw new Error("Nav response has no non-empty categories to sample");

for (const category of samples) {
  const first = await getJson(`/api/awesome-list/listing?level=category&slug=${encodeURIComponent(category.slug)}&page=1`);
  const pages = first.totalPages > 1 ? [1, 2] : [1];
  for (const page of pages) {
    const [listing, htmlResponse] = await Promise.all([
      getJson(`/api/awesome-list/listing?level=category&slug=${encodeURIComponent(category.slug)}&page=${page}`),
      fetch(`${base}/category/${encodeURIComponent(category.slug)}${page > 1 ? `?page=${page}` : ""}`, {
        headers: { "User-Agent": "Googlebot" },
      }),
    ]);
    if (!htmlResponse.ok) throw new Error(`SSR ${category.slug} page ${page}: HTTP ${htmlResponse.status}`);
    const ssrIds = idsFromHtml(await htmlResponse.text());
    const apiIds = listing.resources.map((resource) => Number(resource.id));
    if (JSON.stringify(ssrIds) !== JSON.stringify(apiIds)) {
      throw new Error(
        `${category.slug} page ${page}: SSR/API IDs differ\nSSR: ${ssrIds.join(",")}\nAPI: ${apiIds.join(",")}`,
      );
    }
    if (listing.total !== first.total || listing.resources.length > 24) {
      throw new Error(`${category.slug} page ${page}: invalid total or page size`);
    }
    console.log(`ok ${category.slug} page ${page}: ${apiIds.length}/${listing.total}`);
  }
}

// A category dropdown can target a nested “Parent › Child” node. This must
// retain both identities in the request; sending only the child name would
// silently make the API ignore the filter and return the full category.
const nestedCategory = nav.categories.find((category) =>
  category.subcategories?.some((subcategory) => subcategory.subSubcategories?.some((subSubcategory) => subSubcategory.resourceCount > 0)),
);
if (nestedCategory) {
  const subcategory = nestedCategory.subcategories.find((item) =>
    item.subSubcategories?.some((subSubcategory) => subSubcategory.resourceCount > 0),
  );
  const subSubcategory = subcategory.subSubcategories.find((item) => item.resourceCount > 0);
  const filtered = await getJson(
    `/api/awesome-list/listing?level=category&slug=${encodeURIComponent(nestedCategory.slug)}&page=1&subcategory=${encodeURIComponent(subcategory.name)}&subSubcategory=${encodeURIComponent(subSubcategory.name)}`,
  );
  if (
    filtered.scope.ignoredSubcategory ||
    filtered.scope.ignoredSubSubcategory ||
    !filtered.resources.every((resource) =>
      resource.subcategory === subcategory.name && resource.subSubcategory === subSubcategory.name,
    )
  ) {
    throw new Error(`Nested child filter was not scoped to ${subcategory.name} › ${subSubcategory.name}`);
  }
  console.log(`ok nested filter ${subcategory.name} › ${subSubcategory.name}: ${filtered.resources.length}/${filtered.total}`);
}

console.log("Taxonomy listing SSR/API parity PASS");