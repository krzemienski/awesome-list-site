/**
 * Row actions: navigate each side to the configured state.
 *
 * The app is driven through its real URL routes and accessible controls; the
 * reference is driven through its own router hook (`window.__avGo`) with the
 * entities the catalog adapter bound. An action that the app does not expose
 * yet throws ActionUnavailableError, which the runner records as BLOCKED with
 * the reason — never silently captured as a different state.
 */
export class ActionUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "ActionUnavailableError";
  }
}

export const DESIGN_ADMIN_TAB_LABELS = {
  overview: "Overview",
  approvals: "Approvals",
  edits: "Edits",
  enrichment: "Enrichment",
  researcher: "Researcher",
  export: "Export",
  database: "Database",
  resources: "Resources",
  categories: "Categories",
  subcategories: "Subcategories",
  users: "Users",
  github: "GitHub",
  linkhealth: "Link Health",
  audit: "Audit",
  research: "Research",
};

const referenceGo = async (page, kind, tokens) => {
  await page.waitForFunction(() => typeof window.__avGo === "function", null, { timeout: 60_000 });
  await page.evaluate(({ kind, ids }) => {
    // Every lookup must resolve against the adapter-bound globals; a missing
    // entity is a harness/adapter defect and must fail loudly here rather than
    // crash the design's React tree with an undefined prop.
    const must = (value, label) => {
      if (value === undefined || value === null) throw new Error(`reference action "${kind}": ${label} is not present in the adapter-bound catalog`);
      return value;
    };
    const category = (id) => must(window.AV_CATEGORIES.find((item) => item.id === id), `category ${JSON.stringify(id)}`);
    const subcategory = (categoryId, id) => must(window.AV_SUBCATEGORIES[categoryId]?.find((item) => item.id === id), `subcategory ${JSON.stringify(id)} of ${JSON.stringify(categoryId)}`);
    const leaf = (subcategoryId, id) => must(window.AV_SUBSUBCATEGORIES?.[subcategoryId]?.find((item) => item.id === id), `leaf ${JSON.stringify(id)} of ${JSON.stringify(subcategoryId)}`);
    if (kind === "home") window.__avGo("home");
    if (kind === "category") window.__avGo("category", { cat: category(ids.categorySlug) });
    if (kind === "subcategory") {
      const cat = category(ids.subcategoryCategorySlug);
      window.__avGo("subcategory", { cat, sub: subcategory(cat.id, ids.subcategorySlug) });
    }
    if (kind === "subsubcategory") {
      const cat = category(ids.leafCategorySlug);
      const sub = subcategory(cat.id, ids.leafSubcategorySlug);
      window.__avGo("subcategory", { cat, sub, subSub: leaf(sub.id, ids.subSubcategorySlug) });
    }
    if (kind === "resource") window.__avGo("resource", { resource: must(window.AV_RESOURCES.find((item) => String(item.id) === String(ids.resourceId)), `resource ${JSON.stringify(ids.resourceId)}`) });
    if (["about", "submit", "admin"].includes(kind)) window.__avGo(kind);
  }, {
    kind,
    ids: {
      categorySlug: tokens.category?.id,
      subcategoryCategorySlug: tokens.subcategoryCategory?.id,
      subcategorySlug: tokens.subcategory?.id,
      leafCategorySlug: tokens.leafCategory?.id,
      leafSubcategorySlug: tokens.leafSubcategory?.id,
      subSubcategorySlug: tokens.leaf?.id,
      resourceId: tokens.resource?.id,
    },
  });
};

const setReferenceTweak = async (page, buttonLabel, expectedEyebrow) => {
  await page.waitForFunction(() => typeof window.__avGo === "function", null, { timeout: 60_000 });
  await page.evaluate(() => window.postMessage({ type: "__activate_edit_mode" }, "*"));
  const control = page.getByRole("button", { name: buttonLabel, exact: true });
  await control.waitFor({ state: "visible", timeout: 15_000 });
  await control.click();
  await page.evaluate(() => window.postMessage({ type: "__deactivate_edit_mode" }, "*"));
  await page.waitForFunction((pattern) => new RegExp(pattern).test(document.body.innerText), expectedEyebrow, { timeout: 15_000 });
  await page.locator(".twk-panel").first().waitFor({ state: "hidden", timeout: 10_000 });
};

const activateAppAdminTab = async (page, slug) => {
  const tab = page.locator(`[data-testid="tab-${slug}"]`).first();
  try {
    await tab.waitFor({ state: "visible", timeout: 20_000 });
  } catch {
    throw new ActionUnavailableError(`app admin tab control [data-testid="tab-${slug}"] is not rendered for this session (not an admin, or the tab does not exist)`);
  }
  await tab.click();
  await page.waitForFunction((slug) => {
    const control = document.querySelector(`[data-testid="tab-${slug}"]`);
    if (!control) return false;
    const selected = control.getAttribute("aria-selected") === "true" || control.getAttribute("data-state") === "active";
    const panel = document.querySelector('[role="tabpanel"][data-state="active"]');
    return selected && Boolean(panel);
  }, slug, { timeout: 20_000 });
};

const activateReferenceAdminTab = async (page, slug) => {
  const label = DESIGN_ADMIN_TAB_LABELS[slug];
  if (!label) throw new Error(`unknown design admin tab ${slug}`);
  await referenceGo(page, "admin", {});
  const tab = page.locator("main .tabs .tab", { hasText: new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`) }).first();
  await tab.waitFor({ state: "visible", timeout: 20_000 });
  await tab.click();
  await page.waitForFunction((label) => {
    const active = document.querySelector("main .tabs .tab.active");
    return Boolean(active) && active.textContent.trim() === label;
  }, label, { timeout: 20_000 });
};

/**
 * @param {import('playwright').Page} page
 * @param {string|undefined} action
 * @param {"actual"|"reference"} side
 * @param {{ tokens: object }} context
 */
export async function applyAction(page, action, side, { tokens }) {
  if (!action) return;
  if (side !== "actual" && side !== "reference") throw new Error(`applyAction: side must be "actual" or "reference", got ${JSON.stringify(side)}`);
  if (action === "home-index") {
    if (side === "reference") {
      await referenceGo(page, "home", tokens);
      await page.waitForFunction(() => /INDEX ·/.test(document.body.innerText), null, { timeout: 15_000 });
    }
    return;
  }
  if (action === "home-curated") {
    if (side === "reference") {
      await referenceGo(page, "home", tokens);
      await setReferenceTweak(page, "Curated · featured-first", "CURATED ·");
      return;
    }
    const control = page.locator('[data-testid="home-layout-curated"]').or(page.getByRole("button", { name: /curated/i })).or(page.getByRole("tab", { name: /curated/i })).first();
    try {
      await control.waitFor({ state: "visible", timeout: 5_000 });
    } catch {
      throw new ActionUnavailableError("app exposes no curated home layout control ([data-testid=home-layout-curated] or a control named /curated/i)");
    }
    await control.click();
    return;
  }
  if (action === "palette") {
    await page.locator(side === "actual" ? "[data-testid=list-categories]" : "header").first().waitFor({ state: "visible", timeout: 60_000 });
    await page.keyboard.press("Control+K");
    await page.locator(side === "actual" ? '[role="dialog"]' : ".modal-backdrop").first().waitFor({ state: "visible", timeout: 10_000 });
    return;
  }
  if (action === "mobile-drawer") {
    await page.getByRole("button", { name: side === "actual" ? "Toggle sidebar" : "Open menu", exact: true }).click();
    return;
  }
  if (action.startsWith("admin-tab:")) {
    const slug = action.slice("admin-tab:".length);
    if (side === "reference") await activateReferenceAdminTab(page, slug);
    else await activateAppAdminTab(page, slug);
    return;
  }
  if (["category", "subcategory", "subsubcategory", "resource", "about", "submit", "admin"].includes(action)) {
    if (side === "reference") await referenceGo(page, action, tokens);
    return;
  }
  throw new Error(`Unknown action ${action}`);
}
