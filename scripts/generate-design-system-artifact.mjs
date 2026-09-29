import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import {
  checkArtifactDocs,
  generateArtifactDocs,
} from "./validation/design-system-artifact-docs.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
// The canonical design system is the verbatim /ds pair served to the SPA:
// foundations are its top-level :root, and the per-system and per-accent
// token sets are the registry tables design-system.js hands to
// applyDesignSystem(). App-only foundation tokens (status, motion, shell
// geometry) live in the bridge stylesheet the Vite bundle links after the
// canonical sheet. The runtime wrapper owns only the app default.
const cssPath = "client/public/ds/design-system.css";
const bridgePath = "client/src/styles/app-bridge.css";
const registryPath = "client/public/ds/design-system.js";
const runtimePath = "client/src/lib/design-system.ts";
const profilePath = "shared/styles/product-profiles.css";
const outputPath = "artifacts/awesome-video-design-system/tokens.json";

const fromRoot = (relativePath) => path.join(projectRoot, relativePath);

export const CANONICAL_CSS_PATH = cssPath;
export const CANONICAL_REGISTRY_PATH = registryPath;
export const APP_BRIDGE_PATH = bridgePath;
export const RUNTIME_WRAPPER_PATH = runtimePath;

// design-system.js only assigns window.* tables and defines the applier at
// load; evaluating it in an isolated context reads the exact values the
// browser gets, with no hand-maintained copy to drift. Validators import this
// instead of re-parsing the file.
export function evaluateCanonicalRegistry(source, filename = registryPath) {
  const registryWindow = {};
  vm.runInNewContext(source, { window: registryWindow }, { filename });
  return {
    systems: registryWindow.DESIGN_SYSTEMS,
    accents: registryWindow.ACCENTS,
    systemDefaultAccents: registryWindow.SYSTEM_DEFAULT_ACCENT,
    typeScale: registryWindow.TYPE_SCALE,
    spaceScale: registryWindow.SPACE_SCALE,
    applyDesignSystem: registryWindow.applyDesignSystem,
  };
}

export function readCanonicalRegistry(rootDir = projectRoot, relativePath = registryPath) {
  const source = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  return { source, ...evaluateCanonicalRegistry(source, relativePath) };
}

// applyDesignSystem() paints an accent as exactly these two inline
// properties; whitespace and quote style are the source's business.
const ACCENT_PAINT_RE = {
  "--accent": /\.style\.setProperty\(\s*(['"`])--accent\1\s*,\s*[A-Za-z_$][\w$]*\.primary\s*\)/,
  "--accent-2": /\.style\.setProperty\(\s*(['"`])--accent-2\1\s*,\s*[A-Za-z_$][\w$]*\.secondary\s*\)/,
};

export function applierPaintsAccentPair(source) {
  return Object.values(ACCENT_PAINT_RE).every((re) => re.test(source));
}

// The fallbacks applyDesignSystem() uses for an unknown id: the system it
// reads through `window.DESIGN_SYSTEMS.<id>` and the accent at ACCENTS[<n>].
export function applierFallbacks(source, registry) {
  const body = source.slice(source.indexOf("window.applyDesignSystem"));
  const system = body.match(/\|\|\s*window\.DESIGN_SYSTEMS\.([A-Za-z_$][\w$]*)/)?.[1] ?? null;
  const index = body.match(/\|\|\s*window\.ACCENTS\[(\d+)\]/)?.[1];
  const accent = index == null ? null : registry.accents?.[Number(index)]?.id ?? null;
  return { system, accent };
}

// Structural contract of the canonical registry — no counts: every system
// carries a non-empty vars table, accents are unique and complete, and
// SYSTEM_DEFAULT_ACCENT names exactly the systems, each with a real accent.
export function registryStructureIssues(registry) {
  const issues = [];
  const systems = registry.systems;
  const accents = registry.accents;
  const defaults = registry.systemDefaultAccents;
  if (!systems || typeof systems !== "object" || !Object.keys(systems).length) {
    issues.push("DESIGN_SYSTEMS is missing or empty");
  }
  if (!Array.isArray(accents) || !accents.length) issues.push("ACCENTS is missing or empty");
  if (!defaults || typeof defaults !== "object") issues.push("SYSTEM_DEFAULT_ACCENT is missing");
  if (issues.length) return issues;

  const accentIds = new Set();
  for (const [index, accent] of accents.entries()) {
    const label = accent?.id ?? `#${index}`;
    if (typeof accent?.id !== "string" || !accent.id) issues.push(`ACCENTS[${index}] has no id`);
    else if (accentIds.has(accent.id)) issues.push(`ACCENTS lists "${accent.id}" twice`);
    else accentIds.add(accent.id);
    for (const field of ["name", "primary", "secondary"]) {
      if (typeof accent?.[field] !== "string" || !accent[field].trim()) issues.push(`accent "${label}" has no ${field}`);
    }
  }
  for (const [id, system] of Object.entries(systems)) {
    const vars = system?.vars;
    if (!vars || typeof vars !== "object" || !Object.keys(vars).length) issues.push(`system "${id}" has no vars`);
    else if (Object.keys(vars).some((name) => !/^--[A-Za-z0-9_-]+$/.test(name))) issues.push(`system "${id}" vars include a non-custom-property key`);
    const accent = defaults[id];
    if (accent == null) issues.push(`SYSTEM_DEFAULT_ACCENT has no entry for system "${id}"`);
    else if (!accentIds.has(accent)) issues.push(`SYSTEM_DEFAULT_ACCENT maps "${id}" to "${accent}", which is not in ACCENTS`);
  }
  for (const id of Object.keys(defaults)) {
    if (!Object.prototype.hasOwnProperty.call(systems, id)) issues.push(`SYSTEM_DEFAULT_ACCENT names "${id}", which is not in DESIGN_SYSTEMS`);
  }
  return issues;
}

const isMain = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();

function main() {
  const checkOnly = process.argv.includes("--check");
  const docsOnly = process.argv.includes("--docs");

  // Docs are a source-preserving projection and intentionally have an isolated
  // mode so generation never needs to parse the token registry first.
  if (docsOnly) {
    if (checkOnly) {
      const result = checkArtifactDocs({ rootDir: projectRoot });
      console.log(
        `Design-system artifact docs: up to date (${result.chapters} chapters, ${result.checked} files)`,
      );
    } else {
      const result = generateArtifactDocs({ rootDir: projectRoot });
      console.log(
        `Generated ${result.outputRoot} (${result.chapters} chapters, ${result.generated} files)`,
      );
    }
    process.exit(0);
  }

  const css = fs.readFileSync(fromRoot(cssPath), "utf8");
  const bridgeCss = fs.readFileSync(fromRoot(bridgePath), "utf8");
  const registrySource = fs.readFileSync(fromRoot(registryPath), "utf8");
  const runtime = fs.readFileSync(fromRoot(runtimePath), "utf8");
  const profilesCss = fs.readFileSync(fromRoot(profilePath), "utf8");

  // ---------------------------------------------------------------------------
  // Stylesheet reading. The projection must see exactly the blocks the browser
  // cascades onto <html> at top level: a depth-aware scan over the comment-
  // stripped source, keeping only rules that open at brace depth 0. A `:root`
  // nested in `@media`, `@layer` or `@supports` — however it is indented or
  // line-broken — is a scoped override the runtime applies conditionally, never a
  // foundation value, so it must not merge into the artifact. (An earlier
  // line-anchored regex matched an indented `:root {` inside a multi-line media
  // rule; the canaries below keep that from coming back.)
  // ---------------------------------------------------------------------------
  const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "");

  // Split `source[start, end)` into top-level pieces: `declaration` text and
  // `block` {prelude, bodyStart, bodyEnd}, honouring strings, escapes and
  // parentheses so a `;` inside url()/a string or a `{` in a string never splits.
  function splitBody(source, start, end) {
    const pieces = [];
    let index = start;
    while (index < end) {
      let cursor = index;
      let depth = 0;
      let quote = null;
      let stop = null;
      for (; cursor < end; cursor += 1) {
        const ch = source[cursor];
        if (quote) {
          if (ch === "\\") cursor += 1;
          else if (ch === quote) quote = null;
          continue;
        }
        if (ch === '"' || ch === "'") quote = ch;
        else if (ch === "(" || ch === "[") depth += 1;
        else if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
        else if (!depth && (ch === ";" || ch === "{" || ch === "}")) {
          stop = ch;
          break;
        }
      }
      const chunk = source.slice(index, cursor);
      if (stop === "{") {
        let close = cursor + 1;
        let nesting = 1;
        quote = null;
        for (; close < end && nesting; close += 1) {
          const ch = source[close];
          if (quote) {
            if (ch === "\\") close += 1;
            else if (ch === quote) quote = null;
            continue;
          }
          if (ch === '"' || ch === "'") quote = ch;
          else if (ch === "{") nesting += 1;
          else if (ch === "}") nesting -= 1;
        }
        if (nesting) throw new Error(`Unclosed block: ${chunk.trim().slice(0, 60)}`);
        pieces.push({
          kind: "block",
          prelude: chunk.trim().replace(/\s+/g, " "),
          bodyStart: cursor + 1,
          bodyEnd: close - 1,
        });
        index = close;
        continue;
      }
      if (chunk.trim()) pieces.push({ kind: "declaration", text: chunk });
      index = cursor + 1;
    }
    return pieces;
  }

  // Top-level comma list of a prelude (`:root, :host` → two selectors).
  function splitSelectorList(prelude) {
    const out = [];
    let depth = 0;
    let quote = null;
    let current = "";
    for (let index = 0; index < prelude.length; index += 1) {
      const ch = prelude[index];
      if (quote) {
        current += ch;
        if (ch === "\\") current += prelude[++index] ?? "";
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") quote = ch;
      else if (ch === "(" || ch === "[") depth += 1;
      else if (ch === ")" || ch === "]") depth -= 1;
      if (ch === "," && !depth) {
        out.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    if (current.trim()) out.push(current.trim());
    return out;
  }

  // Every rule that opens at brace depth 0 (at-rules excluded), in source order.
  function topLevelRules(source) {
    const text = stripComments(source);
    return splitBody(text, 0, text.length)
      .filter((piece) => piece.kind === "block" && !piece.prelude.startsWith("@"))
      .map((piece) => ({
        selectors: splitSelectorList(piece.prelude),
        body: text.slice(piece.bodyStart, piece.bodyEnd),
      }));
  }

  // The bodies of every top-level `selector { … }`, in source order, joined
  // into one. A stylesheet may open the same selector more than once (the
  // runtime keeps a footer alias in a second `:root` next to its consumer); the
  // browser cascades them last-wins, so the projection must read all of them or
  // a later block silently drops out of the artifact.
  function blockAfter(source, selector) {
    const wanted = selector.replace(/\s+/g, " ").trim();
    const bodies = topLevelRules(source)
      .filter((rule) => rule.selectors.includes(wanted))
      .map((rule) => rule.body);
    if (!bodies.length) throw new Error(`Missing top-level selector block: ${selector}`);
    return bodies.join("\n");
  }

  // Custom properties declared directly in a block (a nested rule or nested
  // conditional inside the block is skipped — its declarations are scoped), in
  // cascade order: a later `--name` overrides an earlier one.
  function customProperties(block) {
    const out = {};
    for (const piece of splitBody(block, 0, block.length)) {
      if (piece.kind !== "declaration") continue;
      const colon = piece.text.indexOf(":");
      if (colon < 0) continue;
      const name = piece.text.slice(0, colon).trim();
      if (!/^--[A-Za-z0-9_-]+$/.test(name)) continue;
      out[name] = piece.text.slice(colon + 1).replace(/\s+/g, " ").trim();
    }
    return out;
  }

  // Reader canaries — run on every invocation so a parser regression can never
  // re-bless a wrong projection through `--check`.
  {
    const sample = `
/* :root { --comment: bogus; } */
:root {
  --a: 1;
  --url: url("data:image/svg+xml;base64,AA;BB");
  --b: "semi;colon";
  @media (max-width: 767px) { --a: nested; }
  & .child { --a: nested-rule; }
}
@media (min-width: 768px) and (max-width: 1023px) {
  :root {
    --a: tablet;
    --only-in-media: 1;
  }
}
@layer theme { :root { --layered: 1; } }
@supports (display: grid) {
  :root { --supported: 1; }
}
:root, :host { --c: list; }
:root { --a: 2; }
  `;
    const expected = {
      "--a": "2",
      "--url": 'url("data:image/svg+xml;base64,AA;BB")',
      "--b": '"semi;colon"',
      "--c": "list",
    };
    const actual = customProperties(blockAfter(sample, ":root"));
    const failures = [];
    for (const [name, value] of Object.entries(expected)) {
      if (actual[name] !== value) failures.push(`${name}: expected ${value}, read ${actual[name]}`);
    }
    for (const name of Object.keys(actual)) {
      if (!(name in expected)) failures.push(`${name}: read ${actual[name]} from a nested, media-scoped, layered or supports-scoped block`);
    }
    let missingThrew = false;
    try { blockAfter(sample, ":root[data-system=\"none\"]"); } catch { missingThrew = true; }
    if (!missingThrew) failures.push("a selector with no top-level block must throw");
    if (failures.length) {
      console.error(`generate-design-system-artifact: stylesheet reader canaries failed:\n  ${failures.join("\n  ")}`);
      process.exit(1);
    }
  }

  const registry = evaluateCanonicalRegistry(registrySource);
  const structureIssues = registryStructureIssues(registry);
  if (structureIssues.length) {
    throw new Error(`${registryPath}: canonical theme registry is incomplete:\n  ${structureIssues.join("\n  ")}`);
  }

  const systems = Object.entries(registry.systems).map(([id, system]) => ({
    id,
    name: system.name,
    tag: system.tag,
    description: system.desc,
    defaultAccent: registry.systemDefaultAccents[id],
    tokens: { ...system.vars },
  }));
  const accents = registry.accents.map((accent) => ({
    id: accent.id,
    name: accent.name,
    primary: accent.primary,
    secondary: accent.secondary,
  }));

  const defaultSystem = runtime.match(/export const DEFAULT_SYSTEM\b[^=]*=\s*"([^"]+)"/)?.[1];
  const defaultAccent = runtime.match(/export const DEFAULT_ACCENT\b[^=]*=\s*"([^"]+)"/)?.[1];
  if (!Object.prototype.hasOwnProperty.call(registry.systems, defaultSystem ?? "")) {
    throw new Error(`${runtimePath}: DEFAULT_SYSTEM ${defaultSystem ?? "(missing)"} is not a canonical system`);
  }
  if (!accents.some((accent) => accent.id === defaultAccent)) {
    throw new Error(`${runtimePath}: DEFAULT_ACCENT ${defaultAccent ?? "(missing)"} is not a canonical accent`);
  }
  // applyDesignSystem() paints an accent as exactly these two properties; if the
  // canonical applier ever changes that contract the projection must change too.
  if (!applierPaintsAccentPair(registrySource)) {
    throw new Error(`${registryPath}: applyDesignSystem no longer sets --accent/--accent-2 from primary/secondary`);
  }

  // Canonical sheet first, bridge second: the same top-level :root cascade the
  // browser applies to <html>, last declaration wins.
  const rootTokens = customProperties(blockAfter(`${css}\n${bridgeCss}`, ":root"));
  const themes = Object.fromEntries(
    systems.map((system) => [
      system.id,
      {
        name: system.name,
        tag: system.tag,
        description: system.description,
        defaultAccent: system.defaultAccent,
        tokens: system.tokens,
      },
    ]),
  );

  const accentTokens = Object.fromEntries(
    accents.map((accent) => [
      accent.id,
      {
        name: accent.name,
        primary: accent.primary,
        secondary: accent.secondary,
        tokens: { "--accent": accent.primary, "--accent-2": accent.secondary },
      },
    ]),
  );

  const profileIds = [
    "public-discovery",
    "learning-workspace",
    "admin-operations",
    "standalone-exports",
    "embedded-integrations",
  ];
  const productProfiles = Object.fromEntries(
    profileIds.map((id) => [
      id,
      customProperties(blockAfter(profilesCss, `[data-product-profile="${id}"]`)),
    ]),
  );

  const document = {
    $schema: "https://design-tokens.github.io/community-group/format/",
    $description:
      "Generated Replit projection of the canonical Awesome.Video runtime design system.",
    _meta: {
      generated: true,
      edit: [cssPath, registryPath, bridgePath, runtimePath, profilePath],
      contract: "artifacts/awesome-video-design-system/DESIGN.md",
    },
    defaults: {
      system: defaultSystem,
      accent: defaultAccent,
      colorScheme: "dark",
    },
    foundations: rootTokens,
    themes,
    accents: accentTokens,
    productProfiles,
  };

  const next = `${JSON.stringify(document, null, 2)}\n`;
  const current = fs.existsSync(fromRoot(outputPath))
    ? fs.readFileSync(fromRoot(outputPath), "utf8")
    : "";

  // Keep docs drift checks on the ordinary generator path too. This must run
  // before the token-current early exit or an up-to-date token projection would
  // silently skip docs generation/checking.
  if (checkOnly) {
    const result = checkArtifactDocs({ rootDir: projectRoot });
    console.log(
      `Design-system artifact docs: up to date (${result.chapters} chapters, ${result.checked} files)`,
    );
  } else {
    const result = generateArtifactDocs({ rootDir: projectRoot });
    console.log(
      `Generated ${result.outputRoot} (${result.chapters} chapters, ${result.generated} files)`,
    );
  }

  if (current === next) {
    console.log("Design-system artifact tokens: up to date");
    process.exit(0);
  }

  if (checkOnly) {
    console.error(
      "Design-system artifact tokens are stale. Run: npm run generate:design-system-artifact",
    );
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(fromRoot(outputPath)), {
    recursive: true,
  });
  fs.writeFileSync(fromRoot(outputPath), next);
  console.log(
    `Generated ${outputPath} (${systems.length} systems, ${accents.length} accents, ${profileIds.length} profiles)`,
  );
}
