import fs from "node:fs";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import esbuild from "esbuild";
import postcss from "postcss";
import { compile as compileUtilities } from "tailwindcss";
import { Scanner } from "@tailwindcss/oxide";
import React, { Fragment, Suspense } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Slot } from "@radix-ui/react-slot";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as icons from "lucide-react";

const require = createRequire(import.meta.url);
const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
const stripImports = (source) => source.replace(/^import[\s\S]*?from ["'][^"']+["'];?\s*$/gm, "");
const compile = (source, bindings, result) => new Function(...Object.keys(bindings),
  esbuild.transformSync(source.replace(/\bexport /g, "").replace(/^export \{.*$/gm, ""),
    { loader: "tsx", jsx: "transform", format: "cjs" }).code + `\nreturn ${result};`,
)(...Object.values(bindings));
const exactSlice = (source, start, end, label) => {
  if (source.split(start).length !== 2 || source.split(end).length !== 2) {
    throw new Error(`0929 retained resource ${label}: source boundary missing or ambiguous`);
  }
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  if (to < from) throw new Error(`0929 retained resource ${label}: boundary order drift`);
  return source.slice(from, to);
};
const files = [
  "client/src/pages/ResourceDetail.tsx", "client/src/styles/pages/resource.css",
  "client/src/components/ui/button.tsx", "client/src/components/ui/card.tsx",
  "client/src/components/ui/badge.tsx", "client/src/components/ui/separator.tsx",
  "shared/resourceFacets-core.ts", "shared/seo-content-templates.ts",
  "shared/tagNormalize.ts", "client/src/lib/utils.ts", "client/src/lib/category-glyph.ts", "client/src/index.css",
  "shared/styles/product-profiles.css", "client/src/styles/app-bridge.css",
  "server/services/relatedResources.ts",
  "server/routes/domains/catalog-contributions.ts",
];
const scope = ":where(.parity-resource-0929)";

/**
 * Compile only utility candidates declared by the retained page/primitives.
 * This is not an application stylesheet transplant: no shell, palette, base
 * reset, or unrelated page rule is installed. All emitted utilities are scoped
 * to the resource projection; CSS values come from the source compiler.
 */
export async function prepareResource0929Utilities() {
  const index = postcss.parse(read("client/src/index.css"));
  const themes = [];
  index.walkAtRules("theme", (rule) => themes.push(rule.toString()));
  if (themes.length !== 1) throw new Error("0929 retained resource: inline utility theme declaration drift");
  const themePath = require.resolve("tailwindcss/theme.css");
  const theme = fs.readFileSync(themePath, "utf8");
  const compiler = await compileUtilities(`${theme}\n${themes[0]}\n@tailwind utilities;`);
  const candidates = new Scanner({ sources: [] }).scanFiles(files.filter((file) => file.endsWith(".tsx")).map((file) => ({
    content: read(file), extension: "tsx",
  })));
  const root = postcss.parse(compiler.build(candidates));
  root.walkDecls((declaration) => {
    // Self-aliases live in the app's layered theme, below the unlayered DS.
    // Do not shadow the frozen DS's font/radius tokens in this scoped sheet.
    if (declaration.prop.startsWith("--") && declaration.value === `var(${declaration.prop})`) declaration.remove();
  });
  root.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && rule.parent.name === "keyframes") return;
    // Nested child selectors are already inside their scoped utility.
    if (rule.selector.includes("&")) return;
    rule.selector = postcss.list.comma(rule.selector).map((selector) => {
      const trimmed = selector.trim();
      return trimmed === ":root" || trimmed === ":host" ? scope : `${scope} ${trimmed}`;
    }).join(", ");
  });
  // The frozen prototype has no link reset. Project exactly Tailwind's
  // opt-in anchor paint, without installing the rest of its global preflight.
  const preflight = fs.readFileSync(require.resolve("tailwindcss/preflight.css"), "utf8");
  const anchorRules = postcss.parse(preflight).nodes.filter((node) => node.type === "rule" && node.selector === "a");
  if (anchorRules.length !== 1) throw new Error("0929 retained resource: preflight anchor rule drift");
  const anchorDeclarations = Object.fromEntries(anchorRules[0].nodes.filter((node) => node.type === "decl")
    .map((node) => [node.prop, node.value]));
  if (JSON.stringify(anchorDeclarations) !== JSON.stringify({
    color: "inherit", "-webkit-text-decoration": "inherit", "text-decoration": "inherit",
  })) throw new Error("0929 retained resource: preflight anchor inheritance declaration drift");
  const anchorCss = anchorRules[0].clone({ selector: `${scope} a` }).toString();
  return { css: `${anchorCss}\n${root.toString()}`, preflightProof: {
    file: "node_modules/tailwindcss/preflight.css",
    sha256: crypto.createHash("sha256").update(preflight).digest("hex"),
  }, themeProof: {
    file: "node_modules/tailwindcss/theme.css",
    sha256: crypto.createHash("sha256").update(theme).digest("hex"),
  } };
}

function renderRetainedResource(data, nav, viewer) {
  const source = read("client/src/pages/ResourceDetail.tsx");
  for (const token of [
    '<h1 className="display-h" data-testid="text-resource-title">',
    'data-testid="resource-actions"', 'data-seo-section="resource-details"',
    'data-seo-section="resource-tags"', 'className="resource-detail-related"',
    'user?.role === \'admin\'', 'relatedResources?.similar ?? []',
    'resource.resolvedKind === "other" && !resource.kind',
  ]) {
    if (!source.includes(token)) throw new Error(`0929 retained resource JSX shape drift: ${token}`);
  }
  const { resource, related } = data;
  if (!resource?.id || !resource.title || !resource.url || !Array.isArray(related?.similar)) {
    throw new Error("0929 retained resource requires the live detail and related endpoint response shapes");
  }
  for (const item of related.similar) {
    if (!item.resource?.id || !item.resource.title || !Number.isFinite(item.score) ||
        !Array.isArray(item.reasons) || item.reasons.some((reason) => typeof reason !== "string")) {
      throw new Error("0929 retained resource: malformed live related item");
    }
  }
  // Class conflict resolution is part of the primitive's source contract:
  // text-sm removes CardTitle's inherited leading-none, not just text-2xl.
  const cnDeclaration = read("client/src/lib/utils.ts").match(/export function cn\([\s\S]*?\n}/)?.[0];
  if (!cnDeclaration?.includes("return twMerge(clsx(inputs));")) {
    throw new Error("0929 retained resource: cn merge declaration drift");
  }
  const cn = compile(cnDeclaration, { clsx, twMerge }, "cn");
  const primitiveBindings = { React, Slot, SeparatorPrimitive, cva, cn };
  const primitives = Object.assign({}, ...[
    ["button", "{ Button }"], ["card", "{ Card, CardContent, CardDescription, CardHeader, CardTitle }"],
    ["badge", "{ Badge }"], ["separator", "{ Separator }"],
  ].map(([name, result]) => compile(stripImports(read(`client/src/components/ui/${name}.tsx`)), primitiveBindings, result)));
  const facets = compile(read("shared/resourceFacets-core.ts"), {},
    "{ RESOURCE_FORMAT_LABELS, RESOURCE_PROVIDER_LABELS, RESOURCE_SKILL_LEVEL_LABELS }");
  const facts = compile(stripImports(read("shared/seo-content-templates.ts")), facets, "resourceFactsSummary");
  const tagLandingPath = compile(read("shared/tagNormalize.ts"), {}, "tagLandingPath");
  const dateSource = read("client/src/lib/utils.ts").match(/export function formatAdminDate\([\s\S]*?\n}/)?.[0];
  if (!dateSource) throw new Error("0929 retained resource: formatAdminDate declaration drift");
  const formatAdminDate = compile(dateSource, {}, "formatAdminDate");
  const categoryGlyph = compile(read("client/src/lib/category-glyph.ts"), {}, "categoryGlyph");
  const kindLabels = exactSlice(source, "const RESOURCE_KIND_LABELS:", "\nfunction ContactResourceAction(", "kind labels");
  const taxonomy = exactSlice(source, "    const out: { category?: string;", "\n  }, [awesomeListTree, resource]);", "taxonomy resolver");
  const derived = exactSlice(source, "  const metadata = resource?.metadata", "\n  if (isLoading) {", "visible derivations");
  const visible = exactSlice(source, '  return (\n    <div className="resource-detail">', "\n  );\n}", "loaded JSX");
  const noop = () => {};
  const iconDeclaration = source.match(/import \{([^}]+)\} from "lucide-react";/)?.[1];
  if (!iconDeclaration) throw new Error("0929 retained resource: glyph import declaration drift");
  const glyphs = Object.fromEntries(iconDeclaration.split(",").map((name) => {
    const [imported, alias] = name.trim().split(/\s+as\s+/);
    if (!icons[imported]) throw new Error(`0929 retained resource: missing source glyph ${imported}`);
    return [alias || imported, icons[imported]];
  }));
  const bindings = {
    React, Fragment, Suspense, ...primitives, ...glyphs, ...facets, resourceFactsSummary: facts,
    Link: React.forwardRef(({ children, ...props }, ref) => React.createElement("a", { ...props, ref }, children)),
    formatAdminDate, tagLandingPath, categoryGlyph,
    // These non-visual components never produce content in a closed initial
    // capture. Effects and handlers are not executed in the reference renderer.
    SEOHead: () => null, BookmarkNotesDialog: () => null, SuggestEditDialog: () => null,
    ContactResourceAction: ({ fallback }) => fallback,
    Blurhash: () => null,
    resource, relatedResources: related, awesomeListTree: nav,
    // Settled related query (the capture waits for it): no loading/error UI.
    relatedQuery: { data: related, isLoading: false, isError: false, refetch: noop },
    user: viewer?.user || null,
    isFavorite: viewer?.favorites?.some((item) => String(item.id) === String(resource.id)) ?? false,
    isBookmarked: viewer?.bookmarks?.some((item) => String(item.id) === String(resource.id)) ?? false,
    bookmarkNotes: viewer?.bookmarks?.find((item) => String(item.id) === String(resource.id))?.notes || "",
    imageLoaded: true, suggestEditOpen: false, notesDialogOpen: false, notesDialogMode: "add",
    tempNotes: "", collections: [], selectedCollectionIds: [], collectionsLoading: false,
    favorite: { isPending: false }, bookmark: { isPending: false },
    resourceSeoDescription: () => "",
    hasInAppHistory: () => false,
    id: String(resource.id),
    ...Object.fromEntries([
      "setLocation", "handleVisitResource", "handleFavoriteClick", "handleBookmarkClick",
      "handleShare", "handleSuggestEditClick", "handleEditNotesClick", "setNotesDialogOpen",
      "setTempNotes", "handleSaveWithNotes", "handleSaveWithoutNotes", "setSelectedCollectionIds",
      "setImageLoaded", "handleRelatedResourceClick", "setSuggestEditOpen",
    ].map((name) => [name, noop])),
  };
  const Render = compile(`${kindLabels}\nfunction Render() {\nconst taxonomySlugs = (() => {\n${taxonomy}\n})();\n${derived}\n${visible}\n);\n}`,
    bindings, "Render");
  return renderToStaticMarkup(React.createElement(Render));
}

export function buildResource0929(data, nav) {
  if (!data?.utilities?.css || !data.utilities.preflightProof?.sha256) {
    throw new Error("0929 retained resource requires source-compiled utility and anchor declarations");
  }
  const css = read("client/src/styles/pages/resource.css");
  for (const declaration of [
    "font-family: var(--font-display);", "font-weight: var(--display-weight);",
    "letter-spacing: var(--display-tracking);", "line-height: var(--display-leading);",
    "min-height: 44px;", "color: var(--text);", "text-decoration-color: var(--text-3);",
    "overflow-wrap: anywhere;",
  ]) {
    if (!css.includes(declaration)) throw new Error(`0929 retained resource CSS declaration drift: ${declaration}`);
  }
  const root = postcss.parse(css);
  // The app fixes the non-retained centered shell gutter back to the frozen
  // left-anchored layout. The reference already owns that shell geometry.
  const shellRule = root.nodes.find((node) => node.type === "rule" &&
    node.selector === ".app-shell-main > .page-content-wrap:has(> .resource-detail)");
  if (!shellRule || shellRule.nodes.filter((node) => node.type === "decl").length !== 1 ||
      shellRule.nodes.find((node) => node.type === "decl")?.prop !== "margin-inline" ||
      shellRule.nodes.find((node) => node.type === "decl")?.value !== "0") {
    throw new Error("0929 retained resource: source left-anchored shell handoff drift");
  }
  shellRule.remove();
  const descriptionLabel = root.nodes.find((node) => node.type === "rule" &&
    node.selector === ".resource-detail-description h2");
  if (!descriptionLabel?.nodes.some((node) => node.type === "decl" && node.prop === "display" && node.value === "block")) {
    throw new Error("0929 retained resource: frozen block description label source drift");
  }
  const glyphRules = postcss.parse(read("client/src/styles/app-bridge.css")).nodes.filter((node) =>
    node.type === "rule" && JSON.stringify(postcss.list.comma(node.selector)) ===
      JSON.stringify([".lucide", "svg.lucide", '[class*="lucide-"]']));
  const glyphDeclarations = glyphRules[0]?.nodes.filter((node) => node.type === "decl");
  if (glyphRules.length !== 1 || glyphDeclarations.length !== 1 ||
      glyphDeclarations[0].prop !== "stroke-width" || glyphDeclarations[0].value !== "1.5") {
    throw new Error("0929 retained resource: source lucide stroke discipline drift");
  }
  const glyphCss = glyphRules[0].clone({ selector: postcss.list.comma(glyphRules[0].selector)
    .map((selector) => `${scope} ${selector}`).join(", ") }).toString();
  const headingRule = root.nodes.find((node) => node.type === "rule" && node.selector === ".resource-detail-heading h1");
  const urlRule = root.nodes.find((node) => node.type === "rule" &&
    node.selector === '.resource-detail-sections [data-testid="link-url"]');
  for (const [rule, label, expected] of [
    [headingRule, "display h1", {
      "font-family": "var(--font-display)", "font-weight": "var(--display-weight)",
      "letter-spacing": "var(--display-tracking)", "line-height": "var(--display-leading)",
    }],
    [urlRule, "stage-7 neutral URL", {
      color: "var(--text)", "text-decoration-color": "var(--text-3)", "overflow-wrap": "anywhere",
    }],
  ]) {
    const declarations = Object.fromEntries((rule?.nodes || []).filter((node) => node.type === "decl")
      .map((node) => [node.prop, node.value]));
    for (const [property, value] of Object.entries(expected)) {
      if (declarations[property] !== value) throw new Error(`0929 retained resource ${label}: ${property} source declaration drift`);
    }
  }
  root.walkRules((rule) => {
    if (!rule.selector.includes("resource-detail")) throw new Error(`0929 resource CSS scope drift: ${rule.selector}`);
    rule.selector = postcss.list.comma(rule.selector).map((selector) => {
      const trimmed = selector.trim();
      const system = trimmed.match(/^(\[data-system="[^"]+"\])\s+(.*)$/);
      return system ? `${system[1]} ${scope} ${system[2]}` : `${scope} ${trimmed}`;
    }).join(", ");
  });
  // Product density is resolved from the public-discovery source declaration,
  // not from a capture or a globally installed application stylesheet.
  const profiles = postcss.parse(read("shared/styles/product-profiles.css"));
  const publicProfile = profiles.nodes.find((node) => node.type === "rule" &&
    node.selector === '[data-product-profile="public-discovery"]');
  if (!publicProfile) throw new Error("0929 retained resource: public discovery profile drift");
  const profileCss = publicProfile.clone({ selector: scope }).toString();
  return {
    data, nav, resourceId: String(data.resource.id), title: data.resource.title,
    markup: renderRetainedResource(data, nav, null),
    css: `${data.utilities.css}\n${profileCss}\n${glyphCss}\n${root.toString()}`,
    sourceProof: [...files.map((file) => ({
      file, sha256: crypto.createHash("sha256").update(read(file)).digest("hex"),
    })), data.utilities.themeProof, data.utilities.preflightProof],
  };
}

/** Bind the same authenticated viewer reads used by ResourceDetail. */
export function bindResource0929Viewer(projection, viewer) {
  if (!projection) return;
  if (viewer && (!viewer.user?.role || !Array.isArray(viewer.favorites) || !Array.isArray(viewer.bookmarks))) {
    throw new Error("0929 retained resource: authenticated viewer binding is malformed");
  }
  projection.markup = renderRetainedResource(projection.data, projection.nav, viewer);
}

export async function applyResource0929(page, reconciliation) {
  const projection = reconciliation.resource0929;
  if (!projection) throw new Error("0929 retained resource requires a source-backed projection");
  const result = await page.evaluate(async ({ markup, css, resourceId, title }) => {
    const main = document.querySelector("main");
    const eyebrow = [...(main?.querySelectorAll(".eyebrow") || [])].find((node) =>
      node.textContent.trim() === "RESOURCE · DETAIL");
    if (!eyebrow) return { status: "not-applicable", modified: [] };
    const heading = eyebrow.parentElement;
    const root = heading?.parentElement;
    const h1 = heading?.querySelector("h1");
    if (!root?.classList.contains("page-content") || root.dataset.parityResource ||
        root.children.length !== 5 || root.firstElementChild?.textContent.trim() !== "Back" ||
        h1?.textContent.trim() !== title ||
        !root.querySelector(`a[href="${CSS.escape(window.AV_RESOURCES.find((item) => String(item.id) === resourceId)?.url || "")}"]`)) {
      throw new Error("0929 retained resource: frozen ResourcePage structure or bound identity drift");
    }
    const template = document.createElement("template");
    template.innerHTML = markup;
    const detail = template.content.querySelector(".resource-detail");
    if (!detail || !detail.querySelector(".display-h") || !detail.querySelector('[data-testid="link-url"]') ||
        !detail.querySelector(".resource-detail-related")) {
      throw new Error("0929 retained resource: compiled retained section structure drift");
    }
    // Keep the frozen description's text/typography authority. The source-
    // rendered loaded tree supplies the retained sections around it.
    const description = [...root.children].find((node) =>
      node.classList.contains("card") && node.firstElementChild?.textContent.trim() === "DESCRIPTION");
    const sourceDescription = detail.querySelector('[data-testid="text-description"]');
    if (!description?.querySelector("p") || description.querySelector("p").textContent.trim() !== sourceDescription?.textContent.trim()) {
      throw new Error("0929 retained resource: description live-data identity drift");
    }
    const descriptionSection = sourceDescription.parentElement;
    descriptionSection.replaceChildren(...[...description.children].map((node) => node.cloneNode(true)));
    const wrapper = document.createElement("div");
    wrapper.className = "parity-resource-0929";
    wrapper.dataset.parityResource = resourceId;
    wrapper.append(detail);
    const style = document.createElement("style");
    style.dataset.parityResourceSource = resourceId;
    style.textContent = css;
    document.head.append(style);
    root.replaceWith(wrapper);
    // The app-side ready capture has already settled its OG image. Decode the
    // same source URL after insertion rather than letting two early reference
    // frames falsely stabilize on an empty image box.
    await Promise.all([...detail.querySelectorAll("img")].map(async (image) => {
      try {
        await image.decode();
      } catch {
        throw new Error(`0929 retained resource: live OG image failed to decode (${image.getAttribute("src")})`);
      }
    }));
    return { status: "applied", modified: [
      "source-rendered retained resource toolbar, OG image, details, scraped description, dates and admin controls",
      "live deterministic related resources and Page Metadata",
      "source-declared display h1, taxonomy badges, 44px controls and neutral canonical URL ink",
    ] };
  }, projection);
  return { ...result, sourceProof: projection.sourceProof };
}
