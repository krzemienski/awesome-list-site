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

function blockAfter(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const selectorMatch = new RegExp(
    `^\\s*${escapedSelector}\\s*\\{`,
    "m",
  ).exec(source);
  if (!selectorMatch) throw new Error(`Missing selector block: ${selector}`);
  const openIndex =
    selectorMatch.index + selectorMatch[0].lastIndexOf("{");
  let depth = 1;
  for (let index = openIndex + 1; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, index);
    }
  }
  throw new Error(`Unclosed selector: ${selector}`);
}

function customProperties(block) {
  return Object.fromEntries(
    [...block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)].map((match) => [
      `--${match[1]}`,
      match[2].replace(/\s+/g, " ").trim(),
    ]),
  );
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