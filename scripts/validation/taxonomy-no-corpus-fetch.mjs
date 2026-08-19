#!/usr/bin/env node
/**
 * Browser-level regression guard: default taxonomy browsing may request nav
 * plus one paged listing, never the complete /api/awesome-list corpus.
 */
import { chromium } from "playwright";
import { launchBrowserWithLease } from "./playwright-launch-lease.mjs";

const base = process.env.BASE_URL ?? "http://127.0.0.1:5000";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
  "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium";

const nav = await (await fetch(`${base}/api/awesome-list/nav`)).json();
const slug = nav.categories?.find((category) => category.resourceCount > 0)?.slug;
if (!slug) throw new Error("Nav response has no non-empty category");

const browser = await launchBrowserWithLease(
  chromium,
  { headless: true, executablePath },
  "taxonomy-no-corpus-fetch",
);
try {
  const page = await browser.newPage();
  const requests = [];
  const resourceRequests = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/awesome-list")) requests.push(url.pathname + url.search);
    if (url.pathname === "/api/resources") resourceRequests.push(url.pathname + url.search);
  });
  await page.goto(`${base}/category/${encodeURIComponent(slug)}`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid^="card-resource-"], [data-testid="empty-resources"]');

  const corpus = requests.filter((request) => request === "/api/awesome-list");
  const listing = requests.filter((request) => request.startsWith("/api/awesome-list/listing?"));
  if (corpus.length || !listing.length) {
    throw new Error(`Unexpected catalog requests: ${requests.join(", ")}`);
  }
  console.log(`ok default category requested ${listing.length} listing slice(s), zero full corpora`);

  const parentMatch = nav.categories
    ?.flatMap((category) => (category.subcategories ?? []).map((subcategory) => ({ category, subcategory })))
    .find(({ subcategory }) => subcategory.subSubcategories?.some((child) => child.resourceCount > 0));
  const parent = parentMatch?.subcategory;
  const child = parent?.subSubcategories?.find((item) => item.resourceCount > 0);
  if (!parent || !child) throw new Error("Nav response has no selectable sub-subcategory");
  const childListing = await (await fetch(
    `${base}/api/awesome-list/listing?level=subcategory&slug=${encodeURIComponent(parent.slug)}&page=1&subcategory=${encodeURIComponent(child.name)}`,
  )).json();
  const title = childListing.resources?.[0]?.title;
  if (!title) throw new Error(`Child ${child.name} has no searchable resource`);
  await page.goto(
    `${base}/subcategory/${encodeURIComponent(parent.slug)}?subcategory=${encodeURIComponent(child.name)}&search=${encodeURIComponent(title)}`,
    { waitUntil: "networkidle" },
  );
  const titles = await page.locator('[data-testid^="link-resource-title-"]').allTextContents();
  if (!titles.some((text) => text.includes(title))) {
    throw new Error(`Corpus-mode child filter lost ${child.name}; rendered titles: ${titles.join(", ")}`);
  }
  const scopedSearchRequest = resourceRequests.find((request) => request.includes("search="));
  if (!scopedSearchRequest || !parentMatch) throw new Error("Subcategory search did not request /api/resources");
  const scopedSearchUrl = new URL(scopedSearchRequest, base);
  if (
    scopedSearchUrl.searchParams.get("category") !== parentMatch.category.slug ||
    scopedSearchUrl.searchParams.get("subcategory") !== parent.slug
  ) {
    throw new Error(`Subcategory search lost parent scope: ${scopedSearchRequest}`);
  }
  console.log(`ok subcategory child + search retains ${parentMatch.category.slug} / ${parent.slug} scope`);

  const category = nav.categories.find((item) => item.resourceCount > 0);
  const categoryListing = await (await fetch(
    `${base}/api/awesome-list/listing?level=category&slug=${encodeURIComponent(category.slug)}&page=1`,
  )).json();
  const searchable = categoryListing.resources?.[0]?.title;
  if (!searchable) throw new Error(`Category ${category.name} has no searchable resource`);
  await page.goto(
    `${base}/category/${encodeURIComponent(category.slug)}?subcategory=does-not-exist&search=${encodeURIComponent(searchable)}`,
    { waitUntil: "networkidle" },
  );
  const recoveredCategoryTitles = await page.locator('[data-testid^="link-resource-title-"]').allTextContents();
  const categoryNotice = await page.locator('[data-testid="notice-unknown-subcategory"]').textContent();
  if (
    !recoveredCategoryTitles.some((text) => text.includes(searchable)) ||
    !categoryNotice?.includes("does-not-exist")
  ) {
    throw new Error(
      `Unknown category child did not recover full-scope search: titles=${recoveredCategoryTitles.join(", ")} notice=${categoryNotice}`,
    );
  }
  console.log("ok unknown category child + search recovers full scope with notice");

  const parentListing = await (await fetch(
    `${base}/api/awesome-list/listing?level=subcategory&slug=${encodeURIComponent(parent.slug)}&page=1`,
  )).json();
  const tagged = parentListing.resources?.find(
    (resource) => (resource.metadata?.tags ?? resource.tags ?? []).length > 0,
  );
  const tag = tagged && (tagged.metadata?.tags ?? tagged.tags)[0];
  if (!tag) throw new Error(`Subcategory ${parent.name} has no tagged resource`);
  await page.goto(
    `${base}/subcategory/${encodeURIComponent(parent.slug)}?subcategory=does-not-exist&tags=${encodeURIComponent(tag)}`,
    { waitUntil: "networkidle" },
  );
  const taggedResults = await page.locator('[data-testid^="link-resource-title-"]').count();
  const subcategoryNotice = await page.locator('[data-testid="notice-unknown-subcategory"]').textContent();
  if (taggedResults === 0 || !subcategoryNotice?.includes("does-not-exist")) {
    throw new Error(
      `Unknown subcategory child did not recover tagged results: count=${taggedResults} notice=${subcategoryNotice}`,
    );
  }
  console.log("ok unknown subcategory child + tags recovers full scope with notice");

  await page.goto(
    `${base}/category/${encodeURIComponent(category.slug)}?subcategory=does-not-exist&sort=desc`,
    { waitUntil: "networkidle" },
  );
  await page.waitForFunction(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("sortBy") === "name-desc" && !params.has("sort");
  });
  const sortedTitles = await page.locator('[data-testid^="link-resource-title-"]').allTextContents();
  const sortNotice = await page.locator('[data-testid="notice-unknown-subcategory"]').textContent();
  const expected = [...sortedTitles].sort((a, b) => b.localeCompare(a));
  if (
    sortedTitles.length === 0 ||
    JSON.stringify(sortedTitles) !== JSON.stringify(expected) ||
    !sortNotice?.includes("does-not-exist")
  ) {
    throw new Error(
      `Unknown child + legacy sort did not recover: titles=${sortedTitles.join(" | ")} notice=${sortNotice}`,
    );
  }
  console.log("ok unknown category child + legacy sort recovers, canonicalizes, and preserves order");

  const parentCategory = nav.categories.find((candidate) =>
    candidate.subcategories?.some((subcategory) => subcategory.slug === parent.slug),
  );
  if (!parentCategory) throw new Error(`No parent category found for ${parent.name}`);
  const invalidNestedListing = await (await fetch(
    `${base}/api/awesome-list/listing?level=category&slug=${encodeURIComponent(parentCategory.slug)}&page=1&subcategory=${encodeURIComponent(parent.name)}&subSubcategory=does-not-exist`,
  )).json();
  if (
    invalidNestedListing.scope?.ignoredSubcategory ||
    !invalidNestedListing.scope?.ignoredSubSubcategory
  ) {
    throw new Error("Listing API did not retain the valid parent while ignoring the invalid nested child");
  }
  const parentPages = await Promise.all(
    Array.from({ length: invalidNestedListing.totalPages }, (_, index) =>
      fetch(
        `${base}/api/awesome-list/listing?level=category&slug=${encodeURIComponent(parentCategory.slug)}&page=${index + 1}&subcategory=${encodeURIComponent(parent.name)}`,
      ).then((response) => response.json()),
    ),
  );
  const parentTitles = new Set(
    parentPages.flatMap((listing) => listing.resources.map((resource) => resource.title)),
  );
  await page.goto(
    `${base}/category/${encodeURIComponent(parentCategory.slug)}?subcategory=${encodeURIComponent(`${parent.name} › does-not-exist`)}&sort=asc`,
    { waitUntil: "networkidle" },
  );
  await page.waitForFunction(() => {
    const query = new URLSearchParams(window.location.search);
    return query.get("sortBy") === "name-asc" && !query.has("sort");
  });
  const partialTitles = await page.locator('[data-testid^="link-resource-title-"]').allTextContents();
  const partialCount = Number(await page.locator('[data-testid="badge-count"]').textContent());
  const partialNotice = await page.locator('[data-testid="notice-unknown-subcategory"]').textContent();
  if (
    partialCount !== invalidNestedListing.total ||
    partialTitles.length === 0 ||
    partialTitles.some((title) => !parentTitles.has(title)) ||
    !partialNotice?.includes("does-not-exist")
  ) {
    throw new Error(
      `Partially valid nested child diverged from API: count=${partialCount}/${invalidNestedListing.total} titles=${partialTitles.join(" | ")} notice=${partialNotice}`,
    );
  }
  console.log("ok valid parent + invalid nested child retains parent scope with API parity");

  const facetResponse = await (await fetch(
    `${base}/api/resources?category=${encodeURIComponent(category.slug)}&facets=true&limit=1`,
  )).json();
  const pagedProvider = facetResponse.facets?.providers?.find((item) => item.count > 24);
  if (!pagedProvider) throw new Error(`Category ${category.name} has no provider facet with a second page`);
  await page.goto(
    `${base}/category/${encodeURIComponent(category.slug)}?provider=${encodeURIComponent(pagedProvider.value)}&page=2`,
    { waitUntil: "networkidle" },
  );
  await page.waitForSelector('[data-testid^="card-resource-"]');
  const filteredPage = new URL(page.url()).searchParams.get("page");
  const pageIndicator = await page.locator('[data-testid="text-page-indicator"]').textContent();
  if (filteredPage !== "2" || !pageIndicator?.includes("Page 2 of")) {
    throw new Error(
      `Filtered deep link was clamped before facets settled: page=${filteredPage} indicator=${pageIndicator}`,
    );
  }
  console.log("ok filtered taxonomy deep link retains page 2 while facets load");
} finally {
  await browser.close();
}