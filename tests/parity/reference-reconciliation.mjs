import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Clock, Grid2X2, Info, MoreHorizontal, Plus, Search } from "lucide-react";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const brandMarkSource = path.join(repoRoot, "client", "src", "lib", "brand-mark.ts");
const brandMarkComponent = path.join(repoRoot, "client", "src", "components", "BrandMark.tsx");
let officialBrandMarkProjection;

/**
 * Expected-side reconciliations that are driven by approved live application
 * responses.  This module deliberately contains no application imports: the
 * reference remains a frozen snapshot and the only browser mutation here is
 * the small, provenance-recorded footer handoff.
 */

const KIND_IDS = ["tools", "libraries", "standards", "events", "protocols", "other"];
const APPROVED_FOOTER_TARGET = Object.freeze({
  selector: ".site-footer .footer-link",
  minHeightPx: 44,
  display: "inline-flex",
  alignItems: "center",
});

/*
 * New retained-control projections. These declarations mirror the current
 * static application contracts without replacing the older catalog/footer
 * reconciliation below.
 */
const APPROVED_PALETTE_PAGES = Object.freeze([
  Object.freeze({ label: "Browse categories", detail: "Explore the full catalog", href: "/categories", icon: "Grid2X2", kind: "page" }),
  Object.freeze({ label: "Advanced discovery", detail: "Filter resources in detail", href: "/advanced", icon: "Search", kind: "page" }),
  Object.freeze({ label: "Submit a resource", detail: "Suggest something useful", href: "/submit", icon: "Plus", kind: "page" }),
  Object.freeze({ label: "About", detail: "Learn about this collection", href: "/about", icon: "Info", kind: "page" }),
]);

const APPROVED_DRAWER_MORE_LINKS = Object.freeze([
  Object.freeze({ label: "Learning Journeys", href: "/journeys" }),
  Object.freeze({ label: "Advanced", href: "/advanced" }),
  Object.freeze({ label: "Theme", href: "/settings/theme" }),
  Object.freeze({ label: "Home dashboard", href: "/?context=account" }),
]);

const APPROVED_PALETTE_SCOPE = Object.freeze({
  root: '.modal-backdrop > .modal:has(> div:first-child > input[placeholder="Find resources, categories, or tags…"])',
  pages: '[data-parity-palette="approved"] .parity-palette-pages',
  rows: '[data-parity-palette="approved"] [data-parity-palette-control="row"]',
  focus: [
    '[data-parity-palette="approved"] [data-parity-palette-control="input"]:focus',
    '[data-parity-palette="approved"] [data-parity-palette-control="row"]:focus-visible',
    '[data-parity-palette="approved"] [data-parity-palette-control="page"]:focus-visible',
    '[data-parity-palette="approved"] [data-parity-palette-control="history"]:focus-visible',
    '[data-parity-palette="approved"] [data-parity-palette-control="clear"]:focus-visible',
  ].join(","),
  history: '[data-parity-palette="approved"] .parity-palette-recent',
});

const APPROVED_DRAWER_SCOPE = Object.freeze({
  root: ".mobile-drawer.open",
  more: '[data-parity-drawer="approved"] .parity-drawer-more-navigation',
  links: '[data-parity-drawer="approved"] .parity-drawer-more-menu a',
  search: '[data-parity-drawer="approved"] > div:nth-child(2) input.search-input',
  targets: [
    '[data-parity-drawer="approved"] > nav .sub-item',
    '[data-parity-drawer="approved"] .accordion-header',
    '[data-parity-drawer="approved"] > div:last-child a',
    '[data-parity-drawer="approved"] .parity-drawer-more-navigation > summary',
  ],
});

const APPROVED_44PX_TARGETS = Object.freeze({
  minHeightPx: 44,
  drawer: APPROVED_DRAWER_SCOPE.targets,
  drawerSearch: APPROVED_DRAWER_SCOPE.search,
  paletteFocus: APPROVED_PALETTE_SCOPE.focus,
});

const approvedControlsStyle = [
  `${APPROVED_PALETTE_SCOPE.focus}{outline:2px solid var(--accent);outline-offset:2px}`,
  `${APPROVED_PALETTE_SCOPE.pages},${APPROVED_PALETTE_SCOPE.history}{padding:4px 0 2px;position:relative}`,
  `${APPROVED_PALETTE_SCOPE.pages} .parity-palette-group-heading,${APPROVED_PALETTE_SCOPE.history} .parity-palette-group-heading{color:var(--text-3);font-family:var(--font-mono);font-size:9.5px;font-weight:700;letter-spacing:.18em;padding:10px 12px 4px}`,
  `${APPROVED_PALETTE_SCOPE.history} .parity-palette-clear{background:transparent;border:0;color:var(--text-3);cursor:pointer;font:inherit;font-size:11px;padding:4px 12px;position:absolute;right:0;top:7px}`,
  `${APPROVED_DRAWER_SCOPE.root} > div:first-child > button{align-items:center;box-sizing:border-box;display:flex;height:44px;justify-content:center;margin-block:-4px;min-height:44px;min-width:44px;padding:0}`,
  `${APPROVED_DRAWER_SCOPE.root} > div:nth-child(2) input.search-input{box-sizing:border-box;min-height:44px}`,
  `${APPROVED_DRAWER_SCOPE.root} > nav .sub-item,${APPROVED_DRAWER_SCOPE.root} .accordion-header{min-height:44px}`,
  `${APPROVED_DRAWER_SCOPE.root} > div:last-child a{align-items:center;display:inline-flex;min-height:44px}`,
  `${APPROVED_DRAWER_SCOPE.more}{flex:0 0 44px;margin-left:0;position:relative}`,
  `${APPROVED_DRAWER_SCOPE.more} > summary{align-items:center;display:flex;height:44px;justify-content:center;list-style:none;min-height:44px;padding:0;width:44px}`,
  `${APPROVED_DRAWER_SCOPE.more} > summary::-webkit-details-marker{display:none}`,
  `${APPROVED_DRAWER_SCOPE.more} > .parity-drawer-more-menu{background:var(--bg-2);border:var(--hairline-w) solid var(--border);bottom:calc(100% + 6px);box-shadow:var(--shadow);min-width:220px;padding:8px;position:absolute;right:-18px;z-index:6}`,
  `${APPROVED_DRAWER_SCOPE.more} > .parity-drawer-more-menu a{align-items:center;color:var(--text-2);display:flex;min-height:44px;padding:0 10px;text-decoration:none}`,
].join("");

const APPROVED_PALETTE_ICON_COMPONENTS = Object.freeze({
  Grid2X2,
  Search,
  Plus,
  Info,
  Clock,
});

const APPROVED_PALETTE_ICON_SVG = Object.freeze(Object.fromEntries(
  Object.entries(APPROVED_PALETTE_ICON_COMPONENTS).map(([name, Component]) => [
    name,
    renderToStaticMarkup(React.createElement(Component, { "aria-hidden": true })),
  ]),
));

const APPROVED_DRAWER_MORE_ICON_SVG = renderToStaticMarkup(
  React.createElement(MoreHorizontal, {
    "aria-hidden": true,
    className: "size-4",
    width: 16,
    height: 16,
  }),
);

const paletteSourcePath = path.join(repoRoot, "client", "src", "components", "ui", "search-dialog.tsx");
const paletteStyleSourcePath = path.join(repoRoot, "client", "src", "styles", "shell", "palette.css");
const sidebarSourcePath = path.join(repoRoot, "client", "src", "components", "layout", "new", "AppSidebar.tsx");
const drawerStyleSourcePath = path.join(repoRoot, "client", "src", "styles", "shell", "sidebar.css");
const focusSourcePath = path.join(repoRoot, "client", "src", "styles", "design-system.css");

/*
 * The expected projection is source-owned, not an unchecked hand copy. Read
 * the live declarations at adapter construction and again before projection;
 * drift fails closed before any expected DOM is touched.
 */
const assertCurrentControlDeclarations = () => {
  const paletteSource = fsSync.readFileSync(paletteSourcePath, "utf8");
  const paletteStyleSource = fsSync.readFileSync(paletteStyleSourcePath, "utf8");
  const sidebarSource = fsSync.readFileSync(sidebarSourcePath, "utf8");
  const drawerStyleSource = fsSync.readFileSync(drawerStyleSourcePath, "utf8");
  const focusSource = fsSync.readFileSync(focusSourcePath, "utf8");
  const missingPalette = APPROVED_PALETTE_PAGES.filter((item) =>
    !paletteSource.includes(`{ label: "${item.label}", detail: "${item.detail}", href: "${item.href}", icon: ${item.icon} }`),
  );
  const missingMore = APPROVED_DRAWER_MORE_LINKS.filter((item) =>
    !sidebarSource.includes(`label: "${item.label}"`) || !sidebarSource.includes(`href: "${item.href}"`),
  );
  const requiredDrawerContract = "const drawerMoreItems = [...navItems.slice(2), accountDashboardItem];";
  const requiredDrawerHeaderTarget = ".av-sidebar-drawer .av-sidebar-drawer-header > a";
  const requiredDrawerHeaderCompensation = "margin-block: -4px;";
  const requiredDrawerSearchTarget = ".av-sidebar-drawer .av-sidebar-drawer-search-control input";
  const requiredDrawerSearchTargetHeight = "height: 44px;";
  const requiredDrawerSearchTargetMinHeight = "min-height: 44px;";
  const requiredPaletteBadgeSelector = ".search-palette-kind {";
  const requiredPaletteBadgeColor = "color: var(--text-3);";
  const requiredPaletteDetailSelector = ".search-palette-copy small {";
  const requiredPaletteDetailFont = "font-family: var(--font-mono);";
  const requiredPaletteDetailSize = "font-size: 11px;";
  const requiredFocusContract = 'input, select, textarea, summary, [contenteditable="true"], [tabindex]';
  const requiredFocusIndicator = "outline: 2px solid var(--accent) !important;";
  if (missingPalette.length || missingMore.length || !sidebarSource.includes(requiredDrawerContract)
    || !paletteStyleSource.includes(requiredPaletteBadgeSelector) || !paletteStyleSource.includes(requiredPaletteBadgeColor)
    || !paletteStyleSource.includes(requiredPaletteDetailSelector) || !paletteStyleSource.includes(requiredPaletteDetailFont)
    || !paletteStyleSource.includes(requiredPaletteDetailSize)
    || !drawerStyleSource.includes(requiredDrawerHeaderTarget) || !drawerStyleSource.includes(requiredDrawerHeaderCompensation)
    || !drawerStyleSource.includes(requiredDrawerSearchTarget) || !drawerStyleSource.includes(requiredDrawerSearchTargetHeight)
    || !drawerStyleSource.includes(requiredDrawerSearchTargetMinHeight)
    || !focusSource.includes(requiredFocusContract) || !focusSource.includes(requiredFocusIndicator)) {
    const details = [
      missingPalette.length ? `palette: ${missingPalette.map(({ label }) => label).join(", ")}` : "",
      missingMore.length ? `drawer: ${missingMore.map(({ label }) => label).join(", ")}` : "",
      !sidebarSource.includes(requiredDrawerContract) ? "drawerMoreItems declaration" : "",
      !paletteStyleSource.includes(requiredPaletteBadgeSelector) || !paletteStyleSource.includes(requiredPaletteBadgeColor)
        ? "palette default badge color" : "",
      !paletteStyleSource.includes(requiredPaletteDetailSelector) || !paletteStyleSource.includes(requiredPaletteDetailFont)
        || !paletteStyleSource.includes(requiredPaletteDetailSize) ? "palette detail font declaration" : "",
      !drawerStyleSource.includes(requiredDrawerHeaderTarget) || !drawerStyleSource.includes(requiredDrawerHeaderCompensation)
        ? "drawer 64px header compensation" : "",
      !drawerStyleSource.includes(requiredDrawerSearchTarget) || !drawerStyleSource.includes(requiredDrawerSearchTargetHeight)
        || !drawerStyleSource.includes(requiredDrawerSearchTargetMinHeight) ? "drawer 44px search target" : "",
      !focusSource.includes(requiredFocusContract) || !focusSource.includes(requiredFocusIndicator) ? "global focus indicator declaration" : "",
    ].filter(Boolean).join("; ");
    throw new Error(`Approved control declaration drifted; refusing expected projection (${details})`);
  }
  return {
    palette: {
      file: "client/src/components/ui/search-dialog.tsx",
      sha256: sha256(paletteSource),
      declarations: APPROVED_PALETTE_PAGES.map(({ label, detail, href, icon }) => ({ label, detail, href, icon })),
      iconProjection: {
        renderer: "react-dom/server renderToStaticMarkup",
        package: "lucide-react",
        components: APPROVED_PALETTE_PAGES.map(({ icon }) => icon),
        svgSha256: Object.fromEntries(APPROVED_PALETTE_PAGES.map(({ icon }) => [icon, sha256(APPROVED_PALETTE_ICON_SVG[icon])])),
      },
      focusSource: {
        file: "client/src/styles/design-system.css",
        sha256: sha256(focusSource),
        declaration: `${requiredFocusContract} + ${requiredFocusIndicator}`,
      },
      styleSource: {
        file: "client/src/styles/shell/palette.css",
        sha256: sha256(paletteStyleSource),
        badge: `${requiredPaletteBadgeSelector} + ${requiredPaletteBadgeColor}`,
        detail: `${requiredPaletteDetailSelector} + ${requiredPaletteDetailFont} + ${requiredPaletteDetailSize}`,
      },
    },
    drawer: {
      file: "client/src/components/layout/new/AppSidebar.tsx",
      sha256: sha256(sidebarSource),
      declarations: APPROVED_DRAWER_MORE_LINKS,
      contract: requiredDrawerContract,
      layoutSource: {
        file: "client/src/styles/shell/sidebar.css",
        sha256: sha256(drawerStyleSource),
        header: `${requiredDrawerHeaderTarget} + ${requiredDrawerHeaderCompensation}`,
        search: `${requiredDrawerSearchTarget} + ${requiredDrawerSearchTargetHeight} + ${requiredDrawerSearchTargetMinHeight}`,
      },
      iconProjection: {
        renderer: "react-dom/server renderToStaticMarkup",
        package: "lucide-react",
        component: "MoreHorizontal",
        svgSha256: sha256(APPROVED_DRAWER_MORE_ICON_SVG),
      },
    },
  };
};

const xmlAttribute = (value, label) => {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`Official BrandMark projection requires ${label}`);
  }
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;",
  }[character]));
};

/**
 * Project the official mark from the source-owned geometry module.  The
 * geometry is transpiled rather than copied into this harness, so changes to
 * BrandMark's exported constants cannot silently drift from the expected
 * capture.  The component contract is checked as well because it defines the
 * official SVG structure and accessibility attributes.
 */
export async function projectOfficialBrandMark() {
  if (!officialBrandMarkProjection) {
    officialBrandMarkProjection = (async () => {
      const [geometrySource, componentSource] = await Promise.all([
        fs.readFile(brandMarkSource, "utf8"),
        fs.readFile(brandMarkComponent, "utf8"),
      ]);
      const componentContract = [
        "BRAND_MARK_GLYPHS",
        "BRAND_MARK_TILE",
        "BRAND_MARK_TILE_FILL",
        "BRAND_MARK_VIEWBOX",
        "<svg",
        "className={className}",
        "aria-hidden=\"true\"",
        "focusable=\"false\"",
        "data-testid=\"brand-mark\"",
      ];
      if (componentContract.some((literal) => !componentSource.includes(literal))) {
        throw new Error("Official BrandMark projection rejected: BrandMark.tsx structure changed");
      }
      const compiled = await esbuild.transform(geometrySource, {
        loader: "ts",
        format: "esm",
        platform: "node",
        target: "es2022",
        sourcemap: false,
      });
      const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.code).toString("base64")}`;
      const geometry = await import(moduleUrl);
      const viewBox = xmlAttribute(geometry.BRAND_MARK_VIEWBOX, "viewBox");
      const tile = geometry.BRAND_MARK_TILE;
      const glyphs = geometry.BRAND_MARK_GLYPHS;
      if (!tile || !Array.isArray(glyphs) || glyphs.length === 0) {
        throw new Error("Official BrandMark projection rejected: exported geometry is incomplete");
      }
      const requiredTile = ["x", "y", "width", "height", "rx", "strokeWidth"];
      if (requiredTile.some((key) => !Number.isFinite(Number(tile[key])))) {
        throw new Error("Official BrandMark projection rejected: tile geometry is invalid");
      }
      if (typeof geometry.BRAND_MARK_TILE_FILL !== "string" || !geometry.BRAND_MARK_TILE_FILL.trim()) {
        throw new Error("Official BrandMark projection rejected: tile fill is invalid");
      }
      const projectedGlyphs = glyphs.map((glyph) => {
        if (!glyph || typeof glyph.transform !== "string" || typeof glyph.d !== "string") {
          throw new Error("Official BrandMark projection rejected: glyph geometry is invalid");
        }
        return `<path transform="${xmlAttribute(glyph.transform, "glyph transform")}" d="${xmlAttribute(glyph.d, "glyph path")}"></path>`;
      }).join("");
      const svg = [
        `<svg viewBox="${viewBox}" class="app-footer-mark" aria-hidden="true" focusable="false" data-testid="brand-mark">`,
        `<rect fill="${xmlAttribute(geometry.BRAND_MARK_TILE_FILL, "tile fill")}" x="${xmlAttribute(tile.x, "tile x")}" y="${xmlAttribute(tile.y, "tile y")}" width="${xmlAttribute(tile.width, "tile width")}" height="${xmlAttribute(tile.height, "tile height")}" rx="${xmlAttribute(tile.rx, "tile rx")}" stroke="var(--accent)" stroke-width="${xmlAttribute(tile.strokeWidth, "tile stroke width")}"></rect>`,
        `<g fill="var(--accent)">${projectedGlyphs}</g>`,
        "</svg>",
      ].join("");
      return {
        svg,
        source: "client/src/components/BrandMark.tsx + client/src/lib/brand-mark.ts (esbuild TS projection)",
        sha256: sha256(svg),
        sourceSha256: sha256(`${componentSource}\n${geometrySource}`),
      };
    })().catch((error) => {
      officialBrandMarkProjection = null;
      throw error;
    });
  }
  return officialBrandMarkProjection;
}

const requireString = (value, label) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Reference reconciliation requires ${label}`);
  }
  return value;
};

const requireCount = (value, label) => {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Reference reconciliation requires a non-negative integer ${label}`);
  }
  return value;
};

const normaliseKindCounts = (value) => {
  if (!value || typeof value !== "object") {
    throw new Error("Reference reconciliation requires /api/resources/kinds/counts");
  }
  const counts = Object.fromEntries(KIND_IDS.map((id) => [id, requireCount(Number(value[id]), `kind count ${id}`)]));
  counts.total = requireCount(Number(value.total), "kind count total");
  if (counts.total !== KIND_IDS.slice(0, -1).reduce((sum, id) => sum + counts[id], 0) + counts.other) {
    throw new Error("Reference reconciliation kind counts do not reconcile to total");
  }
  return counts;
};

const normaliseResource = (item) => ({
  id: item.id,
  title: item.title || item.name || "",
  cat: item.cat || null,
  sub: item.sub || null,
  subsub: item.subsub || null,
  desc: item.desc || "",
  tags: Array.isArray(item.tags) ? item.tags : [],
  featured: Boolean(item.featured),
  url: item.url || "",
});

/**
 * Build the live values shared by the byte substitutions and the expected-page
 * footer hook. `featuredResources` is already mapped to the AV resource shape
 * by reference-adapter; this keeps taxonomy identity in one place.
 */
export function buildReferenceReconciliation({
  config,
  nav,
  home,
  kindCounts,
  featuredResources,
  frozenAt,
  officialBrandMark,
}) {
  const approvedControlSource = assertCurrentControlDeclarations();
  const siteConfig = config?.site;
  const siteTitle = requireString(siteConfig?.title, "config.site.title");
  const repoUrl = requireString(siteConfig?.repoUrl, "config.site.repoUrl").replace(/\/$/, "");
  const repoBranch = requireString(siteConfig?.repoBranch, "config.site.repoBranch");
  const categories = Array.isArray(nav?.categories) ? nav.categories : [];
  if (!categories.length) throw new Error("Reference reconciliation requires a non-empty navigation tree");
  if (!Array.isArray(home?.recent) || !Array.isArray(home?.featured)) {
    throw new Error("Reference reconciliation requires /api/home recent and featured arrays");
  }
  const featuredCount = requireCount(Number(home.featuredCount), "home featuredCount");
  const approvedThisWeek = requireCount(Number(home.approvedThisWeek), "home approvedThisWeek");
  const total = requireCount(Number(home.total), "home total");
  const kindCountValues = normaliseKindCounts(kindCounts);
  const navTotal = requireCount(Number(nav.totalResources), "navigation totalResources");
  if (navTotal !== total || kindCountValues.total !== total) {
    throw new Error("Reference reconciliation catalog totals disagree across approved live feeds");
  }
  const mappedFeatured = (featuredResources || []).map(normaliseResource);
  if (!officialBrandMark?.svg || !officialBrandMark?.sha256 || !officialBrandMark?.source || !officialBrandMark?.sourceSha256) {
    throw new Error("Reference reconciliation requires the source-projected official BrandMark");
  }
  const title = siteTitle.replace(/\s+Dashboard\s*$/i, "");
  if (!title) throw new Error("Reference reconciliation produced an empty effective site title");

  const sourceSubstitutions = [
    {
      file: "home-layouts.jsx",
      from: '<button className="btn primary" onClick={() => go(\'submit\')} style={{ width: \'100%\' }}>',
      to: '<button className="btn primary" onClick={() => go(\'submit\')} style={{ width: \'100%\', minHeight: 44 }}>',
      source: "User-approved Home Submit 44px minimum target reconciliation (2026-09-13)",
      available: true,
    },
    {
      file: "home-layouts.jsx",
      from: '<button className="btn ghost" onClick={() => go(\'category\', { cat: AV_CATEGORIES[1] })}>Browse all →</button>',
      to: '<button className="btn ghost" style={{ minHeight: 44 }} onClick={() => go(\'category\', { cat: AV_CATEGORIES[1] })}>Browse all →</button>',
      source: "User-approved Home Browse 44px minimum target reconciliation (2026-09-13)",
      available: true,
    },
    {
      file: "home-layouts.jsx",
      from: "const kindCount = k => AV_RESOURCES.filter(k.match).length;",
      to: "const kindCount = k => Number(window.AV_KIND_COUNTS?.[k.id] ?? AV_RESOURCES.filter(k.match).length);",
      source: "/api/resources/kinds/counts",
      available: true,
    },
    {
      file: "home-layouts.jsx",
      from: "const featured = AV_RESOURCES.filter(r => r.featured).slice(0, 6);",
      to: "const featured = (window.AV_HOME_FEATURED || AV_RESOURCES.filter(r => r.featured)).slice(0, 6);",
      source: "/api/home featured resource identities",
      available: true,
    },
    {
      file: "home-layouts.jsx",
      from: "['FEATURED', AV_RESOURCES.filter(r => r.featured).length, 'hand-picked']",
      to: "['FEATURED', Number(window.AV_HOME_FEATURED_COUNT ?? AV_RESOURCES.filter(r => r.featured).length), 'hand-picked']",
      source: "/api/home featuredCount",
      available: true,
    },
    {
      file: "home-layouts.jsx",
      from: "['FEATURED', featured.length, 'this week']",
      to: "['FEATURED', Number(window.AV_HOME_FEATURED_COUNT ?? featured.length), 'hand-picked']",
      source: "/api/home featuredCount and live curated stat label",
      available: true,
    },
  ];

  // The live feed is currently empty. Make the expected curated branch expose
  // the same explicit state instead of an empty, unlabeled grid. Do not alter
  // the branch when a real featured list exists.
  if (mappedFeatured.length === 0) {
    sourceSubstitutions.push({
      file: "home-layouts.jsx",
      from: `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {featured.map((r, i) => <ResCard key={r.id} r={r} go={go} delay={i * 40} />)}
        </div>`,
      to: `{featured.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {featured.map((r, i) => <ResCard key={r.id} r={r} go={go} delay={i * 40} />)}
          </div>
        ) : (
          <p className="home-empty-section">No featured resources have been selected yet.</p>
        )}`,
      source: "/api/home featured[] empty state",
      available: true,
    });
  }

  return {
    version: 1,
    site: {
      name: title,
      tagline: requireString(siteConfig.description, "config.site.description"),
      repoUrl,
      repoBranch,
      copyrightYear: frozenAt ? new Date(frozenAt).getUTCFullYear() : new Date().getUTCFullYear(),
    },
    nav: {
      categories: categories.map((category) => ({
        slug: requireString(category.slug, "navigation category slug"),
        name: requireString(category.name, "navigation category name"),
      })),
      totalResources: navTotal,
    },
    home: {
      total,
      approvedThisWeek,
      featuredCount,
      recentCount: home.recent.length,
      featuredCountReturned: mappedFeatured.length,
    },
    palette: {
      pages: APPROVED_PALETTE_PAGES,
      // Capture state does not seed recent-searches. Preserve that genuine
      // empty state instead of manufacturing a query for the reference.
      recentSearches: [],
      recentSearchesSource: "parity capture fixture: no recent-searches localStorage entry is seeded",
      scope: APPROVED_PALETTE_SCOPE,
      sourceProof: approvedControlSource.palette,
    },
    drawer: {
      moreLinks: APPROVED_DRAWER_MORE_LINKS,
      scope: APPROVED_DRAWER_SCOPE,
      source: "client/src/components/layout/new/AppSidebar.tsx drawerMoreItems (navItems.slice(2) + accountDashboardItem; role-independent)",
      sourceProof: approvedControlSource.drawer,
    },
    kindCounts: kindCountValues,
    featuredResources: mappedFeatured,
    officialBrandMark,
    approved44px: APPROVED_FOOTER_TARGET,
    approved44pxControls: APPROVED_44PX_TARGETS,
    sourceSubstitutions,
    source: ["/api/config", "/api/awesome-list/nav", "/api/home", "/api/resources/kinds/counts"],
  };
}

const projectionValues = (reconciliation) => {
  const sourceProof = assertCurrentControlDeclarations();
  const pages = Array.isArray(reconciliation?.palette?.pages) && reconciliation.palette.pages.length
    ? reconciliation.palette.pages
    : APPROVED_PALETTE_PAGES;
  const moreLinks = Array.isArray(reconciliation?.drawer?.moreLinks) && reconciliation.drawer.moreLinks.length
    ? reconciliation.drawer.moreLinks
    : APPROVED_DRAWER_MORE_LINKS;
  const pageShape = pages.map(({ label, detail, href, icon }) => ({ label, detail, href, icon }));
  const expectedPageShape = APPROVED_PALETTE_PAGES.map(({ label, detail, href, icon }) => ({ label, detail, href, icon }));
  const moreShape = moreLinks.map(({ label, href }) => ({ label, href }));
  const expectedMoreShape = APPROVED_DRAWER_MORE_LINKS.map(({ label, href }) => ({ label, href }));
  if (JSON.stringify(pageShape) !== JSON.stringify(expectedPageShape)) {
    throw new Error("Approved palette Pages declaration drifted; refusing expected projection");
  }
  if (JSON.stringify(moreShape) !== JSON.stringify(expectedMoreShape)) {
    throw new Error("Approved drawer More declaration drifted; refusing expected projection");
  }
  return {
    pages: pages.map((item) => ({ ...item, iconSvg: APPROVED_PALETTE_ICON_SVG[item.icon] })),
    // This is explicit fixture data, never actualPage-only state.
    recentSearches: Array.isArray(reconciliation?.palette?.recentSearches)
      ? reconciliation.palette.recentSearches.filter((value) => typeof value === "string" && value.trim())
      : [],
    moreLinks,
    sourceProof,
  };
};

const applyApprovedControlsStyle = async (page) => {
  await page.evaluate((css) => {
    if (document.querySelector("style[data-parity-reference-controls]")) return;
    const style = document.createElement("style");
    style.dataset.parityReferenceControls = "approved";
    style.textContent = css;
    document.head.append(style);
  }, approvedControlsStyle);
};

export async function applyExpectedPaletteControls(page, reconciliation) {
  const rootSelector = APPROVED_PALETTE_SCOPE.root;
  const rootCount = await page.locator(rootSelector).count();
  if (rootCount === 0) {
    return { status: "not-applicable", modified: [], scope: { root: rootSelector, pages: 0, history: 0, rows: 0, focus: 0 }, source: [] };
  }
  if (rootCount !== 1) throw new Error(`Palette reconciliation expected one reference modal, found ${rootCount}`);

  const { pages, recentSearches, sourceProof } = projectionValues(reconciliation);
  const result = await page.evaluate(({ pages, recentSearches, clockIconSvg }) => {
    const modal = document.querySelector('.modal-backdrop > .modal:has(> div:first-child > input[placeholder="Find resources, categories, or tags…"])');
    const header = modal?.children[0];
    const list = modal?.children[1];
    const footer = modal?.children[2];
    const input = header?.querySelector('input[placeholder="Find resources, categories, or tags…"]');
    const frozenStructure = modal?.children.length >= 3
      && header instanceof HTMLElement
      && list instanceof HTMLElement
      && footer instanceof HTMLElement
      && input instanceof HTMLInputElement
      && input.parentElement === header
      && list.style.overflowY === "auto"
      && footer.querySelectorAll(".kbd").length >= 3;
    if (!(modal instanceof HTMLElement) || !frozenStructure) {
      throw new Error("Palette reconciliation could not find the frozen modal input/list structure");
    }
    modal.dataset.parityPalette = "approved";
    input.dataset.parityPaletteControl = "input";
    input.focus({ preventScroll: true });
    const existingRows = [...list.querySelectorAll(":scope > button")];
    existingRows.forEach((row) => {
      row.dataset.parityPaletteControl = "row";
      row.classList.add("parity-palette-row");
    });

    const rowStyle = (row) => Object.assign(row.style, {
      width: "100%",
      textAlign: "left",
      padding: "10px 12px",
      border: "none",
      borderRadius: "6px",
      background: "transparent",
      color: "var(--text-2)",
      cursor: "pointer",
      display: "grid",
      gridTemplateColumns: "54px 1fr auto",
      gap: "12px",
      alignItems: "center",
      fontFamily: "inherit",
      transition: "background 100ms",
    });
    const createGroup = (className, heading) => {
      const group = document.createElement("div");
      group.className = className;
      const headingNode = document.createElement("div");
      headingNode.className = "mono parity-palette-group-heading";
      headingNode.textContent = heading;
      group.append(headingNode);
      return group;
    };
    const createRow = ({ label, detail, href, iconSvg, kind }) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "parity-palette-row";
      row.dataset.parityPaletteControl = kind === "recent" ? "history" : "page";
      rowStyle(row);
      const badge = document.createElement("span");
      badge.className = "mono search-palette-kind";
      badge.textContent = kind;
      Object.assign(badge.style, {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        minWidth: "0",
        fontSize: "9px",
        padding: "2px 6px",
        borderRadius: "3px",
        border: "1px solid var(--border)",
        color: "var(--text-3)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        lineHeight: "1.2",
      });
      if (iconSvg) {
        const iconTemplate = document.createElement("template");
        iconTemplate.innerHTML = iconSvg;
        const svg = iconTemplate.content.firstElementChild;
        if (!(svg instanceof SVGElement)) throw new Error("Approved Lucide icon projection was not an SVG");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("width", "11");
        svg.setAttribute("height", "11");
        badge.prepend(svg);
      }
      const copy = document.createElement("div");
      copy.style.minWidth = "0";
      const title = document.createElement("div");
      title.textContent = label;
      Object.assign(title.style, { fontSize: "13.5px", fontWeight: "500", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
      copy.append(title);
      if (detail) {
        const sub = document.createElement("div");
        sub.textContent = detail;
        Object.assign(sub.style, { fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-3)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
        copy.append(sub);
      }
      const arrow = document.createElement("span");
      arrow.textContent = "→";
      Object.assign(arrow.style, { color: "var(--accent)", visibility: "hidden", display: "flex" });
      row.append(badge, copy, arrow);
      row.addEventListener("click", () => {
        if (kind === "recent") {
          input.value = label;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        } else if (href === "/about" || href === "/submit") {
          window.__avGo?.(href.slice(1));
        } else {
          window.location.href = href;
        }
      });
      return row;
    };

    let pagesGroup = list.querySelector(".parity-palette-pages");
    if (!pagesGroup) {
      pagesGroup = createGroup("parity-palette-pages", "PAGES");
      pages.forEach((item) => pagesGroup.append(createRow({ ...item })));
      list.append(pagesGroup);
    }
    let historyGroup = list.querySelector(".parity-palette-recent");
    if (recentSearches.length > 0 && !historyGroup) {
      historyGroup = createGroup("parity-palette-recent", "RECENT SEARCHES");
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "parity-palette-clear";
      clear.dataset.parityPaletteControl = "clear";
      clear.textContent = "Clear";
      clear.addEventListener("click", () => {
        try { localStorage.removeItem("recent-searches"); } catch {}
        historyGroup?.remove();
      });
      historyGroup.append(clear);
      recentSearches.forEach((query) => historyGroup.append(createRow({
        label: query,
        detail: "",
        href: "",
        iconSvg: clockIconSvg,
        kind: "recent",
      })));
      list.append(historyGroup);
    }
    const pageCount = pagesGroup.querySelectorAll('[data-parity-palette-control="page"]').length;
    const historyCount = historyGroup ? historyGroup.querySelectorAll('[data-parity-palette-control="history"]').length : 0;
    const focusCount = modal.querySelectorAll('[data-parity-palette-control="input"],[data-parity-palette-control="row"],[data-parity-palette-control="page"],[data-parity-palette-control="history"],[data-parity-palette-control="clear"]').length;
    return { pages: pageCount, history: historyCount, rows: existingRows.length + pageCount + historyCount, focus: focusCount };
  }, { pages, recentSearches, clockIconSvg: APPROVED_PALETTE_ICON_SVG.Clock });

  return {
    status: "applied",
    modified: ["palette Pages controls", "palette focused-input treatment", ...(result.history ? ["palette Recent searches controls"] : [])],
    scope: { root: rootSelector, pages: result.pages, history: result.history, rows: result.rows, focus: result.focus },
    source: [
      "client/src/components/ui/search-dialog.tsx PAGES declaration",
      "client/src/styles/shell/palette.css focus-visible selectors",
      "client/src/styles/design-system.css global :where(... input ...):focus-visible indicator",
      reconciliation?.palette?.recentSearchesSource || "parity capture fixture: no recent-searches localStorage entry is seeded",
    ],
    declarationProof: sourceProof,
  };
}

export async function applyExpectedDrawerControls(page, reconciliation) {
  const rootSelector = APPROVED_DRAWER_SCOPE.root;
  const rootCount = await page.locator(rootSelector).count();
  if (rootCount === 0) {
    return { status: "not-applicable", modified: [], scope: { root: rootSelector, more: 0, links: 0, search: 0, targets: 0 }, source: [] };
  }
  if (rootCount !== 1) throw new Error(`Drawer reconciliation expected one open reference drawer, found ${rootCount}`);
  const { moreLinks, sourceProof } = projectionValues(reconciliation);
  const result = await page.evaluate(({ moreLinks, moreIconSvg }) => {
    const drawer = document.querySelector(".mobile-drawer.open");
    if (!(drawer instanceof HTMLElement)) throw new Error("Drawer reconciliation could not find the frozen open drawer");
    drawer.dataset.parityDrawer = "approved";
    const footer = drawer.lastElementChild;
    if (!(footer instanceof HTMLElement)) throw new Error("Drawer reconciliation could not find the frozen drawer footer");
    const footerLinks = footer.querySelector(":scope > div");
    if (!(footerLinks instanceof HTMLElement)) throw new Error("Drawer reconciliation could not find the frozen footer link group");
    const searchInput = drawer.querySelector(":scope > div:nth-child(2) input.search-input");
    if (!(searchInput instanceof HTMLInputElement)) throw new Error("Drawer reconciliation could not find the frozen drawer search input");
    let more = footerLinks.querySelector(".parity-drawer-more-navigation");
    if (!more) {
      more = document.createElement("details");
      more.className = "parity-drawer-more-navigation";
      more.dataset.parityDrawerControl = "more";
      const summary = document.createElement("summary");
      summary.setAttribute("aria-label", "More navigation");
      summary.title = "More navigation";
      summary.innerHTML = moreIconSvg;
      const menu = document.createElement("div");
      menu.className = "parity-drawer-more-menu";
      more.append(summary, menu);
      footerLinks.append(more);
    }
    const menu = more.querySelector(".parity-drawer-more-menu");
    if (!(menu instanceof HTMLElement)) throw new Error("Drawer reconciliation More menu structure is missing");
    if (!menu.children.length) {
      moreLinks.forEach(({ label, href }) => {
        const link = document.createElement("a");
        link.href = href;
        link.textContent = label;
        link.dataset.parityDrawerControl = "more-link";
        menu.append(link);
      });
    }
    return {
      more: 1,
      links: menu.querySelectorAll("a").length,
      search: searchInput ? 1 : 0,
      targets: [
        ...drawer.querySelectorAll(":scope > nav .sub-item"),
        ...drawer.querySelectorAll(":scope .accordion-header"),
        ...footer.querySelectorAll(":scope a"),
        ...more.querySelectorAll(":scope > summary"),
      ].length,
    };
  }, { moreLinks, moreIconSvg: APPROVED_DRAWER_MORE_ICON_SVG });
  return {
    status: "applied",
    modified: ["drawer More navigation", "drawer 44px target minimums"],
    scope: { root: rootSelector, more: result.more, links: result.links, search: result.search, targets: result.targets },
    source: [
      "client/src/components/layout/new/AppSidebar.tsx drawerMoreItems",
      "client/src/components/layout/new/AppSidebar.tsx renderMoreNavigation",
      "client/src/styles/shell/sidebar.css and client/src/styles/shell/drawer.css 44px target declarations",
    ],
    declarationProof: sourceProof,
  };
}

const footerStyle = [
  ".site-footer .footer-link{display:inline-flex!important;align-items:center!important;min-height:44px!important}",
  ".site-footer .footer-grid>div:first-child>div:first-child{min-height:44px}",
  ".site-footer .app-footer-mark{width:28px;height:28px;flex-shrink:0}",
].join("");

/**
 * Apply the source-projected footer handoff to the expected page only. The
 * reference keeps its frozen canonical geometry; only live content, the
 * explicit 44px target, and the official source-owned mark are reconciled.
 */
export async function applyExpectedReferenceReconciliation(page, {
  actualPage,
  reconciliation,
}) {
  const paletteControls = await applyExpectedPaletteControls(page, reconciliation);
  const drawerControls = await applyExpectedDrawerControls(page, reconciliation);
  if (paletteControls.status === "applied" || drawerControls.status === "applied") {
    await applyApprovedControlsStyle(page);
  }
  const expectedFooterCount = await page.locator("footer.site-footer").count();
  const actualFooterCount = actualPage ? await actualPage.locator("footer.app-footer").count() : null;
  const provenance = {
    version: reconciliation.version,
    source: reconciliation.source,
    status: "not-applicable",
    adjustments: [],
    expectedFooterCount,
    actualFooterCount,
    // Existing footer/BrandMark provenance remains intact; these are appended
    // as a separate retained-control record for the new projections.
    retainedControls: {
      palette: paletteControls,
      drawer: drawerControls,
    },
  };

  if (actualFooterCount === null && expectedFooterCount === 0) {
    provenance.reason = "determinism reference has no footer; actual footer count is intentionally unavailable";
    return provenance;
  }
  if (expectedFooterCount === 0 && actualFooterCount === 0) {
    provenance.reason = "both sides have no footer on this route";
    return provenance;
  }
  if (actualFooterCount !== null && (expectedFooterCount !== 1 || actualFooterCount !== 1)) {
    provenance.status = "count-mismatch";
    provenance.reason = "paired footer counts differ from the required one-or-zero structure";
    const error = new Error(`Footer reconciliation expected one footer on each side (expected=${expectedFooterCount}, actual=${actualFooterCount})`);
    error.referenceReconciliation = provenance;
    throw error;
  }
  if (expectedFooterCount !== 1) {
    provenance.status = "count-mismatch";
    provenance.reason = "expected reference footer count is not one during determinism";
    const error = new Error(`Expected reference footer count must be one for deterministic reconciliation (expected=${expectedFooterCount})`);
    error.referenceReconciliation = provenance;
    throw error;
  }

  await page.evaluate(({ reconciliation }) => {
    const footer = document.querySelector("footer.site-footer");
    if (!footer?.firstElementChild) throw new Error("reference footer structure is missing its inner wrapper");
    const cols = footer.querySelectorAll(".footer-grid > div");
    if (cols.length !== 4 || !cols[0].children[0] || !cols[0].children[1] || !cols[0].children[2]) {
      throw new Error("reference footer structure is not the approved four-column shape");
    }
    footer.classList.add("app-footer");
    footer.firstElementChild.classList.add("site-footer-inner");
    cols[0].classList.add("footer-brand");
    cols[0].children[1].classList.add("footer-tagline");
    cols[0].children[2].classList.add("footer-stats");
    cols[0].children[1].textContent = reconciliation.site.tagline;
    cols.forEach((col, index) => {
      if (index === 0) return;
      col.classList.add("footer-column");
      if (!col.children[1]) throw new Error(`reference footer column ${index} is missing its link container`);
      col.children[1].classList.add("app-footer-links");
    });

    const brand = cols[0].children[0];
    brand.innerHTML = `${reconciliation.officialBrandMark.svg}<span class="mono" style="font-size:11px;font-weight:700;letter-spacing:1.8px">${reconciliation.site.name.toUpperCase()}</span>`;
    const setLinks = (col, items) => {
      const box = col.children[1];
      box.replaceChildren(...items.map(([label, href]) => {
        const anchor = document.createElement("a");
        anchor.className = "nav-link footer-link";
        anchor.textContent = label;
        anchor.href = href;
        return anchor;
      }));
    };
    const categories = reconciliation.nav.categories.slice(0, 6);
    setLinks(cols[1], [
      ...categories.map((category) => [category.name, `/category/${encodeURIComponent(category.slug)}`]),
      ["All categories →", "/categories"],
      ["Journeys", "/journeys"],
    ]);
    setLinks(cols[2], [
      ["About", "/about"],
      ["Submit a resource", "/submit"],
      ["Admin", "/admin"],
      ["Terms", "/terms"],
      ["Privacy", "/privacy"],
      ["Code of Conduct", "/code-of-conduct"],
      ["Cookie settings", "#"],
    ]);
    const repo = reconciliation.site.repoUrl;
    const branch = encodeURIComponent(reconciliation.site.repoBranch);
    const repoLabel = repo.replace(/^https?:\/\/(www\.)?github\.com\//, "");
    setLinks(cols[3], [
      [`${repoLabel} ↗`, repo],
      ["Report an issue ↗", `${repo}/issues`],
      ["Contributing ↗", `${repo}/blob/${branch}/CONTRIBUTING.md`],
      ["awesome-list guidelines ↗", "https://github.com/sindresorhus/awesome"],
      ["Docs ↗", `${repo}/tree/${branch}/docs`],
      ["Sitemap", "/sitemap.xml"],
    ]);
    const bottom = footer.querySelector(".footer-grid + div");
    if (!bottom?.children[0] || !bottom.children[1]) throw new Error("reference footer is missing its bottom row");
    bottom.classList.add("footer-bottom");
    bottom.children[0].textContent = `© ${reconciliation.site.copyrightYear} ${reconciliation.site.name} · content CC0, code MIT`;
    bottom.children[1].textContent = "Built with React & shadcn/ui";
  }, { reconciliation });

  // Only the frozen reference CSS plus the explicit approved accessibility
  // target and official-mark presentation are allowed here. Never load app
  // CSS into the reference page.
  await page.addStyleTag({ content: footerStyle });
  provenance.status = actualFooterCount === null ? "source-projected" : "applied";
  if (actualFooterCount === null) provenance.reason = "determinism uses source-projected official BrandMark; actual footer count intentionally unavailable";
  provenance.adjustments = [
    "live site/tagline/stats",
    "live footer destinations",
    "official source-projected BrandMark SVG",
    "approved 44px footer link/button target",
    "official BrandMark 28px presentation",
    ...paletteControls.modified,
    ...drawerControls.modified,
  ];
  provenance.officialBrandMark = {
    source: reconciliation.officialBrandMark.source,
    sha256: reconciliation.officialBrandMark.sha256,
    sourceSha256: reconciliation.officialBrandMark.sourceSha256,
  };
  provenance.approved44px = reconciliation.approved44px;
  provenance.approved44pxControls = reconciliation.approved44pxControls;
  provenance.styles = {
    inline: footerStyle,
    inlineSha256: sha256(footerStyle),
    canonical: "awesome-list-site-ds/styles.css and frozen reference inline styles only",
  };
  return provenance;
}

export {
  KIND_IDS,
  APPROVED_44PX_TARGETS,
  APPROVED_DRAWER_MORE_LINKS,
  APPROVED_PALETTE_PAGES,
};