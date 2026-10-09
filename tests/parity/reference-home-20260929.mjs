import fs from "node:fs";
import crypto from "node:crypto";
import esbuild from "esbuild";
import postcss from "postcss";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
const compile = (source, bindings, result) => new Function(...Object.keys(bindings),
  esbuild.transformSync(source.replace(/\bexport /g, ""), { loader: "tsx", jsx: "transform", format: "cjs" }).code + `\nreturn ${result};`,
)(...Object.values(bindings));
const withoutImports = (source) => source.replace(/^import .*$/gm, "");

/**
 * Render only retained atoms from declarations, never from the actual page.
 * The 09-29 category/resource cards and index heading remain reference-owned.
 * CSS is parsed on the server into individual declaration records; only rules
 * matching inserted atoms (and their two layout wrappers) are projected inline.
 * No application stylesheet is installed in the reference.
 */
export function buildHome0929(nav, home, kindCounts, frozenAt) {
  const files = [
    "client/src/components/home/HomePresentation.tsx",
    "client/src/styles/pages/home.css",
    "client/src/components/ui/button.tsx",
    "client/src/components/ui/chip-button.tsx",
    "client/src/lib/static-data.ts",
    "client/src/pages/Home.tsx",
    "awesome-list-site-ds/home-layouts.jsx",
    "shared/styles/product-profiles.css",
  ];
  const [presentation, css, button, chip, taxonomy, homePage, oldHome, profiles] = files.map(read);
  // Button's min-height utility reads the product-profile control token, which
  // the reference does not install. Resolve it from its one source declaration.
  const controlHeights = new Set([...profiles.matchAll(/--profile-control-height:\s*([^;]+);/g)].map((m) => m[1].trim()));
  if (controlHeights.size !== 1) throw new Error("0929 retained home: product-profile control height is missing or not uniform");
  const [controlHeight] = controlHeights;
  for (const token of ["function StatStrip(", "function KindStrip(", "function RecentRail(", "function CuratedLayout("]) {
    if (!presentation.includes(token)) throw new Error(`0929 retained home declaration drift: ${token}`);
  }
  if (!oldHome.includes("function StatStrip(") || !oldHome.includes("── CONTRIBUTE")) {
    throw new Error("0910 retained home ancestry drift");
  }
  const visibleDeclaration = taxonomy.match(/const EXCLUDED_CATEGORY_NAMES[\s\S]*?(?=\n\/\*\*\n \* Routes)/)?.[0];
  const kindsDeclaration = taxonomy.match(/export const STRIP_KINDS = [^\n]+/)?.[0];
  const counters = ["countSubcategories", "countNestedGroups"].map((name) => {
    const declaration = homePage.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n}`, "m"))?.[0];
    if (!declaration) throw new Error(`0929 home counter declaration drift: ${name}`);
    return declaration;
  }).join("\n");
  if (!visibleDeclaration || !kindsDeclaration) throw new Error("0929 home taxonomy declaration drift");
  const { visibleNavCategories, STRIP_KINDS } = compile(
    `${visibleDeclaration}\n${kindsDeclaration.replace("export ", "")}`, {}, "{ visibleNavCategories, STRIP_KINDS }");
  const categories = visibleNavCategories(nav.categories);
  const counts = compile(counters, {}, "{ countSubcategories, countNestedGroups }");
  const stats = {
    total: home.total, categories: categories.length,
    subcategories: counts.countSubcategories(categories),
    nestedGroups: counts.countNestedGroups(categories),
    featured: home.featuredCount, approvedThisWeek: home.approvedThisWeek,
  };
  if (Object.values(stats).some((value) => !Number.isFinite(value) || value < 0) || !Array.isArray(home.recent)) {
    throw new Error("0929 retained home requires complete live statistics and recent resources");
  }
  const cn = (...values) => values.filter(Boolean).join(" ");
  const Button = compile(withoutImports(button).replace(/^export \{.*$/gm, ""),
    { React, Slot, cva, cn }, "Button");
  const ChipButton = compile(withoutImports(chip).replace("export const ChipButton", "const ChipButton"),
    { React, cn }, "ChipButton");
  const Link = ({ children, ...props }) => React.createElement("a", props, children);
  const time = frozenAt ? new Date(frozenAt) : new Date();
  if (!Number.isFinite(time.getTime())) throw new Error("0929 retained home invalid capture time");
  class CaptureDate extends Date { constructor(...args) { super(...(args.length ? args : [time.getTime()])); } }
  const atoms = compile(withoutImports(presentation.split("export default function HomePresentation")[0]),
    { React, Link, Button, ChipButton, STRIP_KINDS, Date: CaptureDate },
    "{ PageMeta, StatStrip, RecentRail, CuratedLayout }");
  const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
  const markup = Object.fromEntries(["index", "curated"].map((layout) => [layout, {
    meta: render(atoms.PageMeta, { layout, stats, kindCounts }),
    stats: render(atoms.StatStrip, { layout, stats }),
  }]));
  markup.index.rail = render(atoms.RecentRail, { recent: home.recent });
  // Discard the empty category/featured sections below; keep their canonical
  // 09-29 counterparts. Rendering the source ensures copy and markup drift
  // are not silently replaced with hand-maintained lookalikes.
  markup.curated.parts = render(atoms.CuratedLayout, {
    categories: [], featured: [], recent: home.recent, stats, selectedTags: [],
  });
  const rules = [];
  postcss.parse(css).walkRules((rule) => {
    if (!rule.selector.includes(".home-")) return;
    const media = [];
    for (let parent = rule.parent; parent?.type !== "root"; parent = parent.parent) {
      if (parent.type !== "atrule" || parent.name !== "media") return;
      media.push(parent.params);
    }
    rules.push({ selector: rule.selector, media,
      declarations: rule.nodes.filter((node) => node.type === "decl").map(({ prop, value, important }) => ({ prop, value, important })) });
  });
  if (!rules.some((rule) => rule.selector === ".home-index-grid") || !rules.some((rule) => rule.selector === ".home-stat-strip")) {
    throw new Error("0929 retained home geometry declarations missing");
  }
  return { markup, rules, controlHeight, featuredCount: home.featured.length,
    sourceProof: files.map((file) => ({ file, sha256: crypto.createHash("sha256").update(read(file)).digest("hex") })) };
}

export async function applyHome0929(page, reconciliation) {
  const projection = reconciliation.home0929;
  if (!projection) throw new Error("0929 retained home requires source-backed projection");
  const result = await page.evaluate(({ markup, rules, controlHeight, featuredCount }) => {
    const main = document.querySelector("main");
    const indexTitle = [...(main?.querySelectorAll("h1") || [])].find((node) => node.textContent.trim() === "~/awesome.video");
    const featuredEyebrow = [...(main?.querySelectorAll("div") || [])].find((node) => node.children.length === 0 && node.textContent.trim() === "── FEATURED RESOURCES");
    if (!indexTitle && !featuredEyebrow) return { status: "not-applicable", modified: [] };
    const layout = indexTitle ? "index" : "curated";
    const root = indexTitle ? indexTitle.parentElement : featuredEyebrow.parentElement.parentElement;
    if (!root || root.dataset.parityHome) throw new Error("0929 retained home root missing or already projected");
    const inserted = new Set();
    const parse = (html) => {
      const template = document.createElement("template");
      template.innerHTML = html;
      return template.content;
    };
    const retain = (node) => {
      inserted.add(node);
      node.querySelectorAll("*").forEach((child) => inserted.add(child));
      return node;
    };
    const atom = (html) => retain(parse(html).firstElementChild);
    const meta = atom(markup[layout].meta);
    const stats = atom(markup[layout].stats);
    if (layout === "index") {
      const eyebrow = root.children[0];
      const categories = indexTitle.nextElementSibling;
      if (root.children.length !== 3 || !eyebrow.classList.contains("eyebrow") ||
        !categories || categories.style.display !== "grid" || !categories.querySelector("h3")) {
        throw new Error("0929 HomeIndex three-child structure drift");
      }
      eyebrow.replaceWith(meta);
      indexTitle.after(stats);
      const grid = document.createElement("div");
      grid.className = "home-index-grid";
      inserted.add(grid);
      categories.before(grid);
      // Only this wrapper's min-column size belongs to the retained rail
      // layout. Keep the 09-29 category content and styles untouched.
      categories.classList.add("home-category-grid");
      inserted.add(categories);
      grid.append(categories, atom(markup.index.rail));
      // Retained 09-10 nested-group badge (awesome-list-site-ds/home-layouts.jsx
      // HomeIndex row: grid minmax(0,1fr) auto auto, gap 10, "+n3" badge) and
      // the DS stage-7 accent budget, which keeps the nine category glyphs on
      // text-2 ink. Rows are matched to the adapter taxonomy by name; any
      // ordering drift fails closed.
      const sections = [...categories.children];
      if (sections.length !== window.AV_CATEGORIES.length) throw new Error("0929 HomeIndex category count drift");
      sections.forEach((section, i) => {
        const cat = window.AV_CATEGORIES[i];
        const [heading, list] = section.children;
        const glyph = heading?.firstElementChild;
        if (!glyph || heading.querySelector("h3")?.textContent !== cat.name || !list) {
          throw new Error(`0929 HomeIndex category structure drift: ${cat.name}`);
        }
        glyph.style.color = "var(--text-2)";
        const subs = (window.AV_SUBCATEGORIES[cat.id] || []).slice(0, 6);
        const rows = [...list.children].slice(0, subs.length);
        rows.forEach((row, j) => {
          const [name, count] = row.children;
          if (row.children.length !== 2 || name.textContent !== `– ${subs[j].name}`) {
            throw new Error(`0929 HomeIndex subcategory row drift: ${subs[j].name}`);
          }
          const n3 = (window.AV_SUBSUBCATEGORIES[subs[j].id] || []).length;
          Object.assign(row.style, { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: "10px", alignItems: "center" });
          const badge = document.createElement("span");
          if (n3 > 0) {
            badge.className = "mono";
            badge.title = `${n3} nested groups`;
            badge.textContent = `+${n3}`;
            Object.assign(badge.style, { fontSize: "9px", color: "var(--text-3)", border: "1px solid var(--border)", borderRadius: "3px", padding: "0 4px" });
          }
          count.before(badge);
        });
      });
    } else {
      const [featuredHeader, resources, categoryHeader, categories] = root.children;
      if (root.children.length !== 4 || !featuredHeader.contains(featuredEyebrow) ||
          resources.style.display !== "grid" || categories.style.display !== "grid" || !categoryHeader.querySelector("h2")) {
        throw new Error("0929 HomeFeaturedGrid four-child structure drift");
      }
      const parts = parse(markup.curated.parts);
      const hero = parts.querySelector(".home-hero");
      const recent = parts.querySelector(".home-curated-recent");
      if (!hero || !recent) throw new Error("0929 retained curated source structure drift");
      root.prepend(meta, retain(hero), stats);
      const featured = document.createElement("div");
      featured.className = "home-curated-section home-curated-featured";
      inserted.add(featured);
      featuredHeader.before(featured);
      featured.append(featuredHeader, resources);
      resources.style.marginBottom = "0";
      if (featuredCount === 0) {
        featuredHeader.querySelector("p")?.remove();
        const empty = parts.querySelector(".home-empty-section");
        if (!empty) throw new Error("0929 retained featured empty-state declaration missing");
        resources.replaceWith(retain(empty));
      }
      const categorySection = document.createElement("div");
      categorySection.className = "home-curated-section home-curated-categories";
      inserted.add(categorySection);
      categoryHeader.before(categorySection);
      categorySection.append(categoryHeader, categories);
      root.append(retain(recent));
    }
    root.dataset.parityHome = layout;
    for (const rule of rules) {
      if (!rule.media.every((query) => matchMedia(query).matches)) continue;
      for (const node of inserted) {
        if (!node.matches(rule.selector)) continue;
        for (const { prop, value, important } of rule.declarations) {
          node.style.setProperty(prop, value.replaceAll("var(--profile-control-height)", controlHeight), important ? "important" : "");
        }
      }
    }
    // Button's source sizing utilities are not a stylesheet dependency.
    for (const node of inserted) {
      if (node.classList.contains("min-h-[max(44px,var(--profile-control-height))]")) node.style.minHeight = `max(44px,${controlHeight})`;
      if (node.classList.contains("min-w-[44px]")) node.style.minWidth = "44px";
      if (node.classList.contains("w-full")) node.style.width = "100%";
      if (node.classList.contains("sr-only")) node.remove();
    }
    return { status: "applied", layout, modified: [
      "source-rendered retained home kind and statistics strips",
      ...(layout === "index" ? ["retained recent rail and contribution card; rail layout wrapper",
        "retained 09-10 nested-group badges on index rows", "stage-7 accent budget: index category glyphs on text-2 ink"] :
        ["retained curated hero, featured empty state and recently updated list"]),
    ] };
  }, projection);
  return { ...result, sourceProof: projection.sourceProof };
}
