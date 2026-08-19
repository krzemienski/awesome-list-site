#!/usr/bin/env node
/**
 * Browser-level regression guard: default taxonomy browsing may request nav
 * plus one paged listing, never the complete /api/awesome-list corpus.
 */
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://127.0.0.1:5000";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
  "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium";

const nav = await (await fetch(`${base}/api/awesome-list/nav`)).json();
const slug = nav.categories?.find((category) => category.resourceCount > 0)?.slug;
if (!slug) throw new Error("Nav response has no non-empty category");

const browser = await chromium.launch({ headless: true, executablePath });
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
} finally {
  await browser.close();
}