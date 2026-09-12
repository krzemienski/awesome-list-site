import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const checkOnly = process.argv.includes("--check");
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const cssPath = "client/src/styles/design-system.css";
const runtimePath = "client/src/lib/design-system.ts";
const profilePath = "shared/styles/product-profiles.css";
const outputPath = "artifacts/awesome-video-design-system/tokens.json";

const fromRoot = (relativePath) => path.join(projectRoot, relativePath);
const css = fs.readFileSync(fromRoot(cssPath), "utf8");
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

const systemsSegment = runtime.slice(
  runtime.indexOf("systems: ["),
  runtime.indexOf("accents: ["),
);
const systems = [...systemsSegment.matchAll(
  /id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'[\s\S]*?tag:\s*'([^']+)'[\s\S]*?desc:\s*'([^']+)'[\s\S]*?defaultAccent:\s*'([^']+)'/g,
)].map((match) => ({
  id: match[1],
  name: match[2],
  tag: match[3],
  description: match[4],
  defaultAccent: match[5],
}));

const accentsSegment = runtime.slice(
  runtime.indexOf("accents: ["),
  runtime.indexOf("});", runtime.indexOf("accents: [")),
);
const accents = [...accentsSegment.matchAll(
  /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*primary:\s*'([^']+)',\s*secondary:\s*'([^']+)'\s*\}/g,
)].map((match) => ({
  id: match[1],
  name: match[2],
  primary: match[3],
  secondary: match[4],
}));

const defaultsMatch = runtime.match(
  /defaultSystem:\s*'([^']+)'[\s\S]*?defaultAccent:\s*'([^']+)'/,
);
if (!defaultsMatch || systems.length !== 5 || accents.length !== 10) {
  throw new Error("Could not parse the complete runtime theme registry");
}

const rootTokens = customProperties(blockAfter(css, ":root"));
const themes = Object.fromEntries(
  systems.map((system) => [
    system.id,
    {
      name: system.name,
      tag: system.tag,
      description: system.description,
      defaultAccent: system.defaultAccent,
      tokens:
        system.id === defaultsMatch[1]
          ? rootTokens
          : customProperties(blockAfter(css, `:root[data-system="${system.id}"]`)),
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
      tokens: customProperties(blockAfter(css, `:root[data-accent="${accent.id}"]`)),
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
    edit: [cssPath, runtimePath, profilePath],
    contract: "artifacts/awesome-video-design-system/DESIGN.md",
  },
  defaults: {
    system: defaultsMatch[1],
    accent: defaultsMatch[2],
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