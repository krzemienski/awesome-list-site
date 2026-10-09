import fs from "node:fs";
import crypto from "node:crypto";
import postcss from "postcss";
import esbuild from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookOpen, ExternalLink } from "lucide-react";

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
const compile = (source, bindings, result) => new Function(...Object.keys(bindings),
  esbuild.transformSync(source, { loader: "tsx", jsx: "transform", format: "cjs" }).code + `\nreturn ${result};`,
)(...Object.values(bindings));
const assert = (condition, message) => { if (!condition) throw new Error(`0929 pages source drift: ${message}`); };
const declarations = (css, selector, properties) => {
  const matches = [];
  postcss.parse(css).walkRules((rule) => {
    if (rule.selector.split(",").map((part) => part.trim()).includes(selector) && rule.parent.type === "root") matches.push(rule);
  });
  assert(matches.length > 0, `expected unconditional ${selector} declarations`);
  return Object.fromEntries(properties.map((prop) => {
    const values = matches.flatMap((rule) => rule.nodes).filter((node) => node.type === "decl" && node.prop === prop);
    assert(values.length === 1, `${selector} requires exactly one ${prop}`);
    return [prop, values[0].value];
  }));
};

// Compile the actual conditional paragraph and destination selector. Public
// /api/config is already the adapter's input; no repository-derived URL or
// hand-maintained contact wording is substituted for that live configuration.
export function buildAboutContactMarkup(config) {
  const about = read("client/src/pages/About.tsx");
  const contact = read("client/src/lib/contact.ts");
  assert(about.includes("const contactDestination = preferredContactDestination(contactConfig);"),
    "About contactDestination binding");
  const helper = contact.match(/export function preferredContactDestination\([\s\S]*?\n}/)?.[0];
  const paragraph = about.match(/<p className="about-body-copy">\s*Questions or corrections\?[\s\S]*?<\/p>/)?.[0];
  assert(helper && paragraph && paragraph.includes("{contactDestination.label}") &&
    paragraph.includes("href={contactDestination.href}") && paragraph.includes("about-external-icon"),
  "About contact paragraph / preferredContactDestination shape");
  if (config) assert(config.site && config.contact &&
    ["issues", "discussions", "email"].every((key) => typeof config.contact[key]?.available === "boolean"),
  "public contact configuration");
  const preferred = compile(helper.replace("export ", ""), { URL }, "preferredContactDestination");
  const render = compile(`const paragraph = ${paragraph};`,
    { React, ExternalLink, contactDestination: preferred(config) }, "paragraph");
  return renderToStaticMarkup(render);
}

export function buildPages0929(config, aboutExtension) {
  const files = [
    "client/src/styles/pages/about.css", "client/src/styles/pages/taxonomy.css",
    "client/public/ds/design-system.css", "client/src/styles/components/resource-card.css",
    "client/src/styles/shell/sidebar-shell.css", "client/src/styles/shell/sidebar.css",
    "client/src/styles/shell/drawer.css", "client/src/styles/shell/sidebar-categories.css",
    "client/src/components/layout/new/AppSidebar.tsx", "client/src/pages/About.tsx",
    "client/src/lib/contact.ts", "client/src/pages/TaxonomyListing.tsx",
    "awesome-list-site-ds-20260929/home-layouts.jsx",
  ];
  const sources = files.map(read);
  const [about, taxonomy, ds, cards, sidebar, mobile, drawer, categories, sidebarTsx, aboutTsx, , taxonomyTsx, referenceHome] = sources;
  // ResCard and CatCard intentionally share the same three DS classes.
  // Derive the default CatCard marker size from its declaration, not pixels.
  const catCard = referenceHome.match(/function CatCard\(\{ cat, go, delay = 0, big = false \}\)[\s\S]*?\n}/)?.[0];
  const categoryWidth = catCard?.match(/width: big \? (\d+) : (\d+)/);
  const categoryHeight = catCard?.match(/height: big \? (\d+) : (\d+)/);
  assert(catCard?.includes('className="card hoverable glow"') &&
    catCard.includes("{cat.name}</h3>") && catCard.includes("{cat.icon}") &&
    categoryWidth && categoryHeight &&
    categoryWidth[2] === categoryHeight[2],
  "curated CatCard class/title/glyph/default marker declarations");
  const categoryMarkSize = `${categoryWidth[2]}px`;
  assert(aboutTsx.includes('<h1 className="display-h about-title">'), "About h1 display-h");
  assert(taxonomyTsx.includes("taxonomy-title display-h"), "taxonomy h1 display-h");
  const typography = ["font-family", "font-weight", "letter-spacing", "line-height"];
  const aboutTitle = declarations(about, ".about-title", typography);
  const taxonomyTitle = declarations(ds, ".display-h", typography);
  const titleSkins = [];
  postcss.parse(ds).walkRules((rule) => {
    if (!/^\[data-system="[^"]+"\] \.display-h$/.test(rule.selector)) return;
    assert(rule.parent.type === "root" && rule.nodes.every((node) =>
      node.type === "decl" && typography.includes(node.prop)), "display-h system skin shape");
    titleSkins.push({ selector: rule.selector.replace(" .display-h", ""),
      declarations: Object.fromEntries(rule.nodes.map(({ prop, value }) => [prop, value])) });
  });
  assert(titleSkins.length === 2, "display-h Geist/Swiss skin declarations");
  const taxonomySizing = declarations(taxonomy, ".taxonomy-page .taxonomy-title", ["font-size", "margin"]);
  assert(taxonomySizing["font-size"].startsWith("clamp("), "taxonomy title clamp");
  const mark = declarations(cards, ".resource-card__mark", ["color"]);
  assert(mark.color === "var(--text-2)", "retained resource mark neutral ink");
  const home = declarations(sidebar, ".av-sidebar-shell .av-sidebar-home-navigation > .sub-item", ["background", "border"]);
  assert(home.background === "transparent" && home.border === "0", "sidebar Home reset");
  const noShrink = declarations(drawer, '.av-sidebar-drawer > [data-sidebar="drawer-navigation"] > *', ["flex-shrink"]);
  const tree = declarations(mobile,
    '.av-sidebar-drawer[data-sidebar="sidebar"] > [data-sidebar="drawer-navigation"] > .av-sidebar-tree-scroll',
    ["flex", "flex-shrink", "min-height", "overflow"]);
  assert(noShrink["flex-shrink"] === "0" && tree["flex-shrink"] === "0" && tree.overflow === "visible",
    "drawer navigation and taxonomy must retain natural height");
  const header = declarations(categories, ".av-sidebar-drawer .accordion-header",
    ["align-items", "background", "border", "box-sizing", "color", "display", "gap",
      "justify-content", "min-height", "padding", "position", "text-align", "width"]);
  const search = sidebarTsx.match(/placeholder="(Search resources\.\.\.)"/)?.[1];
  assert(search && /label: "About",\s*icon: BookOpen,\s*href: "\/about"/.test(sidebarTsx),
    "drawer search placeholder and About BookOpen icon");
  const aboutRules = [
    [".parity-about-icon", ".about-section-icon", ["color"]],
    [".parity-about-copy a", ".about-inline-link", ["display", "align-items", "align-self", "gap", "min-height", "color", "font-size", "font-weight", "text-decoration", "text-decoration-color", "text-underline-offset"]],
    [".parity-about-copy p a", ".about-inline-link-text", ["display", "min-height", "vertical-align"]],
    [".parity-about-copy > a svg", ".about-inline-icon", ["display"]],
    [".parity-about-copy .about-external-icon", ".about-external-icon", ["width", "height", "display", "vertical-align", "margin-left"]],
    [".parity-about-feature__mark", ".about-feature-card::before", ["border", "color"]],
    [".parity-about-tech__dot", ".about-tech-dot", ["border", "background"]],
    [".parity-about-tech:nth-child(odd) .parity-about-tech__dot", ".about-tech-column .about-tech-item:nth-child(odd) .about-tech-dot", ["background"]],
    [".parity-about-accessibility__dot", ".about-accessibility-dot", ["background"]],
    [".parity-about-credit__mark", ".about-icon-ink", ["color"]],
    [".parity-about-source__heading svg", ".about-source-icon", ["color"]],
  ].map(([selector, source, props]) => ({ selector, declarations: declarations(about, source, props) }));
  assert(aboutExtension, "retained About extension bindings");
  aboutExtension.contactMarkup = buildAboutContactMarkup(config);
  return { aboutTitle, taxonomyTitle, titleSkins, mark, home, noShrink, header, search, aboutRules, categoryMarkSize,
    aboutIcon: renderToStaticMarkup(React.createElement(BookOpen, { size: 14, strokeWidth: 1.5 })),
    sourceProof: files.map((file, i) => ({ file, sha256: crypto.createHash("sha256").update(sources[i]).digest("hex") })) };
}

export async function applyPages0929(page, reconciliation) {
  const projection = reconciliation.pages0929;
  assert(projection, "missing projection");
  const result = await page.evaluate((p) => {
    const modified = [];
    const set = (node, values) => {
      for (const [prop, value] of Object.entries(values)) node.style.setProperty(prop, value);
    };
    const main = document.querySelector("main");
    const title = main?.querySelector("h1");
    const retained = main?.querySelector('[data-parity-reference-extension="about-retained"]');
    if (retained) {
      if (!title || !title.textContent.includes("A field journal for") || !title.querySelector(".serif-italic")) {
        throw new Error("0929 About h1 structure drift");
      }
      set(title, p.aboutTitle);
      p.titleSkins.filter((rule) => title.closest(rule.selector)).forEach((rule) => set(title, rule.declarations));
      for (const rule of p.aboutRules) {
        const nodes = retained.querySelectorAll(rule.selector);
        if (!nodes.length && rule.selector.endsWith(".about-external-icon") &&
          retained.querySelector('[data-testid="text-about-contact-unavailable"]')) continue;
        if (!nodes.length) throw new Error(`0929 About retained atom missing: ${rule.selector}`);
        nodes.forEach((node) => set(node, rule.declarations));
      }
      modified.push("source-declared About display heading and retained neutral ink/link atoms; source-rendered contact paragraph");
    } else if (main?.querySelector('[data-parity-reference-extension="taxonomy-pager"]') ||
      (title && [
        ...(window.AV_CATEGORIES || []),
        ...Object.values(window.AV_SUBCATEGORIES || {}).flat(),
      ].some((node) => node.name === title.textContent.trim()))) {
      if (!title || !title.style.fontSize.startsWith("clamp(")) throw new Error("0929 taxonomy h1 structure drift");
      set(title, p.taxonomyTitle);
      p.titleSkins.filter((rule) => title.closest(rule.selector)).forEach((rule) => set(title, rule.declarations));
      modified.push("source-declared taxonomy display heading (serif span preserved)");
    }
    // Only the canonical resource listing card shape, never detail cards.
    // applyHome0929 keeps canonical CatCards in this source-projected wrapper.
    // They are category navigation, not ResCards: leave their ink untouched.
    const categorySection = main?.querySelector('[data-parity-home="curated"] .home-curated-categories');
    const categoryCards = new Set(categorySection?.querySelectorAll(".card.hoverable.glow") || []);
    if (categorySection) {
      const taxonomy = window.AV_CATEGORIES;
      if (!Array.isArray(taxonomy) || categoryCards.size !== taxonomy.length) {
        throw new Error("0929 curated category card count drift");
      }
      [...categoryCards].forEach((card, i) => {
        const title = card.querySelector(":scope > h3");
        const mark = card.firstElementChild?.firstElementChild;
        if (card.parentElement !== categorySection.lastElementChild ||
          title?.textContent.trim() !== taxonomy[i].name ||
          !mark || mark.style.width !== p.categoryMarkSize || mark.style.height !== p.categoryMarkSize) {
          throw new Error("0929 curated category card identity/structure drift");
        }
      });
    }
    const cards = [...(main?.querySelectorAll(".card.hoverable.glow") || [])].filter((card) => !categoryCards.has(card));
    cards.forEach((card) => {
      const mark = card.firstElementChild?.firstElementChild;
      if (!card.querySelector(":scope > h3") || !mark || mark.style.width !== "36px" || mark.style.height !== "36px") {
        throw new Error("0929 resource listing mark structure drift");
      }
      set(mark, p.mark);
    });
    if (cards.length) modified.push("source-declared text-2 resource listing marks");
    const sidebar = document.querySelector("aside.sidebar.hide-mobile");
    if (sidebar) {
      const homes = [...sidebar.querySelectorAll("button.sub-item")].filter((node) => node.textContent.trim() === "Home");
      if (homes.length !== 1) throw new Error("0929 sidebar Home control structure drift");
      // Frozen Home has no active class: its inline accent ink is its active
      // discriminator. Keep its canonical border/row geometry and active fill.
      if (homes[0].style.color !== "var(--accent)") set(homes[0], { background: p.home.background });
      modified.push("source-declared inactive sidebar Home native-button reset");
    }
    const drawer = document.querySelector(".mobile-drawer.open");
    if (drawer) {
      const search = drawer.querySelector(":scope > div:nth-child(2) input.search-input");
      const nav = drawer.querySelector(":scope > nav");
      const about = [...(nav?.querySelectorAll(".sub-item") || [])].find((node) => node.textContent.trim() === "About");
      const items = drawer.querySelectorAll(":scope > .accordion-item");
      if (!search || !about?.querySelector("svg") || !items.length ||
        items.length !== window.AV_CATEGORIES.length) throw new Error("0929 open mobile drawer structure drift");
      [...drawer.children].forEach((node) => set(node, p.noShrink));
      items.forEach((item, i) => {
        const header = item.querySelector(":scope > .accordion-header");
        if (!header || !header.textContent.includes(window.AV_CATEGORIES[i].name)) {
          throw new Error("0929 drawer category order/structure drift");
        }
        set(header, p.header);
      });
      search.placeholder = p.search;
      const template = document.createElement("template");
      template.innerHTML = p.aboutIcon;
      about.querySelector("svg").replaceWith(template.content.firstElementChild);
      modified.push("source-declared nonshrinking mobile drawer navigation/category rhythm, header box sizing, search copy and About icon");
    }
    return { status: modified.length ? "applied" : "not-applicable", modified };
  }, projection);
  return { ...result, sourceProof: projection.sourceProof };
}
