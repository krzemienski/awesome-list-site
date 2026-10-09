import fs from "node:fs";
import crypto from "node:crypto";
import esbuild from "esbuild";

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
const hash = (text) => crypto.createHash("sha256").update(text).digest("hex");

/**
 * The 09-29 PageFooter is a fixed inline four-column grid with no breakpoints,
 * so below ~1100px its columns overlap. The app's approved responsive collapse
 * is projected from footer.css's max-width blocks onto the reference footer's
 * structural hooks; the declarations are copied verbatim, never invented.
 */
const FOOTER_HOOKS = [
  [".app-footer-identity", "[data-parity-footer=identity]"],
  [".app-footer-grid", "[data-parity-footer=grid]"],
  [".app-footer-meta", "[data-parity-footer=meta]"],
  [".app-footer", "[data-parity-footer=root]"],
];
function projectResponsiveFooterCss(css) {
  const blocks = [...css.matchAll(/@media \(max-width: (\d+)px\) \{([\s\S]*?)\n\}/g)];
  const widths = blocks.map(([, width]) => width).join(",");
  if (widths !== "1100,640") throw new Error(`0929 footer responsive declaration drift (found max-width blocks ${widths || "none"})`);
  return blocks.map(([, width, body]) => {
    const rules = body.trim().split("\n").map((line) => {
      const match = line.trim().match(/^(.+?)\s*\{\s*(.+?)\s*\}$/);
      if (!match) throw new Error(`0929 footer responsive rule drift: ${line.trim()}`);
      let selector = match[1];
      for (const [from, to] of FOOTER_HOOKS) selector = selector.split(from).join(to);
      if (selector.includes(".app-footer")) throw new Error(`0929 footer responsive selector has no reference hook: ${match[1]}`);
      const declarations = match[2].split(";").map((d) => d.trim()).filter(Boolean).map((d) => `${d} !important`).join(";");
      return `${selector}{${declarations}}`;
    });
    return `@media (max-width: ${width}px){${rules.join("")}}`;
  }).join("");
}

/** Read declarations, not actual-page DOM; no application stylesheet is served. */
export function buildFooter0929(nav, site) {
  const files = [
    "client/src/components/layout/new/AppFooter.tsx",
    "client/src/lib/static-data.ts",
    "client/src/components/layout/new/category-glyphs.ts",
    "client/src/styles/shell/footer.css",
    "client/src/lib/analytics.ts",
  ];
  const [footer, taxonomy, glyphs, footerCss, analytics] = files.map(read);
  const responsiveCss = projectResponsiveFooterCss(footerCss);
  const taxonomyDeclaration = taxonomy.match(/const EXCLUDED_CATEGORY_NAMES[\s\S]*?(?=\n\/\*\*\n \* Routes)/)?.[0];
  if (!taxonomyDeclaration) throw new Error("0929 footer taxonomy declaration drift");
  const compile = (text, result) => new Function(esbuild.transformSync(text.replace(/\bexport /g, ""), { loader: "ts", format: "cjs" }).code + `\nreturn ${result};`)();
  const visible = compile(taxonomyDeclaration, "visibleNavCategories");
  const glyph = compile(glyphs, "getCategoryGlyph");
  const displayDeclaration = footer.match(/function footerDisplayName[\s\S]*?\n}/)?.[0];
  if (!displayDeclaration) throw new Error("0929 footer display-name declaration drift");
  const displayName = compile(displayDeclaration, "footerDisplayName")(site.name);
  const policies = [...footer.matchAll(/<Link href="([^"]+)" data-testid="footer-[^"]+"[^>]*>([^<]+)<\/Link>/g)].map(([, href, label]) => ({ href, label }));
  if (policies.length !== 4 || !footer.includes("PRs welcome")) throw new Error("0929 footer retained policy declaration drift");
  const cookie = [...analytics.matchAll(/configured: Boolean\(import\.meta\.env\.([A-Z_]+)\)/g)].some(([, key]) => Boolean(process.env[key]));
  return {
    responsiveCss,
    displayName,
    categories: visible(nav.categories).map((category) => ({ name: category.name, slug: category.slug, glyph: glyph(category.name), short: category.name.split(/\s+&\s+|\s+/)[0], subcategories: category.subcategories.length })),
    policies: [...policies, ...(cookie ? [{ label: "Cookie settings", href: "#" }] : []), { label: "Issues ↗", href: site.issuesUrl || `${site.repoUrl}/issues` }, { label: "Sitemap", href: "/sitemap.xml" }],
    sourceProof: files.map((file) => ({ file, sha256: hash(read(file)) })),
  };
}

export async function applyFooter0929(page, reconciliation) {
  const projection = reconciliation.footer0929;
  if (!projection) throw new Error("0929 footer requires source-backed live projection");
  await page.evaluate(({ projection, site, total }) => {
    const footer = document.querySelector("main > footer");
    const grid = footer?.children[0];
    const meta = footer?.children[1];
    if (!grid || grid.children.length !== 4 || !meta || meta.children.length < 2) throw new Error("0929 PageFooter four-column structure drift");
    const [identity, stats, explore, source] = grid.children;
    footer.dataset.parityFooter = "root";
    grid.dataset.parityFooter = "grid";
    identity.dataset.parityFooter = "identity";
    meta.dataset.parityFooter = "meta";
    identity.children[1].textContent = projection.displayName;
    let tagline = identity.querySelector("p");
    if (!tagline && site.tagline) {
      tagline = document.createElement("p");
      Object.assign(tagline.style, { fontSize: "14px", color: "var(--text-2)", lineHeight: "1.55", maxWidth: "380px" });
      identity.insertBefore(tagline, identity.lastElementChild);
    }
    if (tagline) tagline.textContent = site.tagline;
    stats.children[1].textContent = total.toLocaleString("en-US");
    const live = stats.children[2].lastElementChild.cloneNode(true);
    stats.children[2].replaceChildren(`${projection.categories.length} categories`, document.createElement("br"), `${projection.categories.reduce((n, c) => n + c.subcategories, 0)} subcategories`, document.createElement("br"), live);
    const links = explore.children[1];
    const template = links.firstElementChild;
    if (!template) throw new Error("0929 PageFooter EXPLORE template missing");
    const rows = projection.categories.filter((c) => c.slug).map((category) => {
      const link = template.cloneNode(true);
      link.href = `/category/${encodeURIComponent(category.slug)}`;
      link.children[0].textContent = category.glyph;
      link.children[1].textContent = category.short;
      // Approved overhanging accessible targets preserve the reference rhythm.
      link.style.minHeight = "44px";
      link.style.marginBlock = "-7.6px";
      return link;
    });
    links.replaceChildren(...rows);
    links.style.gap = "0";
    if (rows[0]) rows[0].style.marginTop = "-11.6px";
    const repo = source.querySelector("a");
    if (!repo) throw new Error("0929 PageFooter SOURCE link missing");
    repo.href = site.repoUrl;
    repo.children[1].textContent = site.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "");
    const note = repo.nextElementSibling;
    const text = note?.firstChild;
    if (text?.nodeType !== Node.TEXT_NODE || !text.textContent.includes("PRs welcome")) throw new Error("0929 PageFooter source note drift");
    const prs = document.createElement("a");
    prs.href = `${site.repoUrl}/blob/${encodeURIComponent(site.repoBranch)}/CONTRIBUTING.md`;
    prs.textContent = "PRs welcome";
    Object.assign(prs.style, { color: "inherit", textDecoration: "underline", textUnderlineOffset: "2px" });
    text.replaceWith("Open-source. ", prs, ".");
    meta.children[0].textContent = `© ${site.copyrightYear} ${projection.displayName} · content CC0, code MIT`;
    const policies = document.createElement("nav");
    policies.setAttribute("aria-label", "Site policies");
    Object.assign(policies.style, { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0 14px" });
    for (const { label, href } of projection.policies) {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = label;
      Object.assign(link.style, { display: "inline-flex", alignItems: "center", minHeight: "44px", color: "inherit", textDecoration: "none" });
      policies.append(link);
    }
    meta.insertBefore(policies, meta.lastElementChild);
    meta.style.paddingTop = "4px";
    meta.style.gap = "0 16px";
    for (const span of meta.querySelectorAll(":scope > span")) Object.assign(span.style, { display: "inline-flex", alignItems: "center", minHeight: "44px" });
  }, { projection, site: reconciliation.site, total: reconciliation.nav.totalResources });
  await page.addStyleTag({ content: projection.responsiveCss });
  return { modified: ["live PageFooter identity, taxonomy and repository", "source-owned policy links and PRs welcome link", "approved 44px footer targets", "approved responsive footer collapse (footer.css max-width blocks)"], sourceProof: projection.sourceProof };
}
