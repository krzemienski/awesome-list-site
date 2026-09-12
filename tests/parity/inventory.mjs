#!/usr/bin/env node
/**
 * Parity inventory: fragments → validated, merged view.
 *
 * Source of truth is `tests/parity/inventory/*.json`, one fragment per screen
 * family plus `config.json`. `tests/parity/inventory.json` is a GENERATED
 * merged view (kept in git so diffs stay reviewable) and
 * `tests/parity/inventory.schema.json` is the JSON Schema rendered from the
 * zod schema below. The runner refuses to start when either generated file
 * is out of date; regenerate both with:
 *
 *   node tests/parity/inventory.mjs --write
 *
 * Check-only (used by the runner and by CI-style gates):
 *
 *   node tests/parity/inventory.mjs --check
 *
 * Eligibility classes (what `test:parity --list` prints):
 *   pixel          both sides routeable; counted in the 0.5% gate denominator
 *   token-only     no pixel counterpart; verified by token/computed-style evidence
 *   artifact-docs  design-system docs chapter; captured for evidence only
 *   blocked:<why>  cannot be measured yet; the reason is part of the class
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
export const inventoryDir = path.join(here, "inventory");
export const mergedInventoryPath = path.join(here, "inventory.json");
export const inventorySchemaPath = path.join(here, "inventory.schema.json");

export const ALLOWED_WIDTHS = [375, 768, 1024, 1440];
export const ELIGIBILITY = ["pixel", "token-only", "artifact-docs", "blocked"];
export const IDENTITY_CHECKS = ["home", "category", "subcategory", "subsubcategory", "resource", "admin-tab"];
export const REQUIREMENTS = ["admin-session"];

const idPattern = /^(app|artifact)(\.[a-z0-9-]+)+$/;
const pathPattern = /^\/[^\s]*$/;
const actionPattern = /^[a-z][a-z0-9-]*(:[a-z0-9-]+)?$/;

const screenSchema = z
  .object({
    id: z.string().regex(idPattern).describe("Stable row id: <kind>.<family>[.<state>]"),
    kind: z.enum(["app", "artifact"]).describe("Which local target serves actualPath: the app (5000) or the design-system artifact"),
    eligibility: z.enum(ELIGIBILITY).describe("pixel | token-only | artifact-docs | blocked"),
    widths: z
      .array(z.union([z.literal(375), z.literal(768), z.literal(1024), z.literal(1440)]))
      .min(1)
      .optional()
      .describe("Subset of the configured widths; omit for all four"),
    actualPath: z.string().regex(pathPattern).optional().describe("Path on the actual target; {categorySlug} {subcategorySlug} {subSubcategorySlug} {resourceId} are resolved from the live catalog"),
    referencePath: z.string().regex(pathPattern).optional().describe("Path inside awesome-list-site-ds served from the in-memory snapshot"),
    actualAction: z.string().regex(actionPattern).optional().describe("Action id applied on the actual page before settling (see runner ACTIONS)"),
    referenceAction: z.string().regex(actionPattern).optional().describe("Action id applied on the reference page before settling"),
    actualReadySelector: z.string().min(1).optional(),
    referenceReadySelector: z.string().min(1).optional(),
    readySelector: z.string().min(1).optional().describe("Shared ready selector when both sides use the same one"),
    identityCheck: z.enum(IDENTITY_CHECKS).optional().describe("Structural check that both pages show the same catalog entity before pixels are compared"),
    requires: z.array(z.enum(REQUIREMENTS)).min(1).optional().describe("Run preconditions; admin-session rows are BLOCKED (never PASS) when no disposable admin is available"),
    aliasOf: z.string().regex(idPattern).optional().describe("This row is the same capture as another pixel row"),
    reason: z.string().min(12).optional().describe("Required for token-only, artifact-docs and blocked rows: why no pixel gate applies"),
    notes: z.string().optional(),
  })
  .strict();

const familySchema = z
  .object({
    schemaVersion: z.literal(2),
    kind: z.literal("family"),
    family: z.string().regex(/^[a-z][a-z0-9-]*$/),
    summary: z.string().min(8),
    screens: z.array(screenSchema).min(1),
  })
  .strict();

const configSchema = z
  .object({
    schemaVersion: z.literal(2),
    kind: z.literal("config"),
    widths: z.array(z.union([z.literal(375), z.literal(768), z.literal(1024), z.literal(1440)])).min(1),
    viewportHeights: z.record(z.string().regex(/^(375|768|1024|1440)$/), z.number().int().min(600).max(1200)),
    sourceInventoryProvenance: z.record(z.string(), z.unknown()),
    sourceInventoryAliases: z.record(z.string(), z.string().regex(idPattern)),
  })
  .strict();

export const fragmentSchema = z.discriminatedUnion("kind", [configSchema, familySchema]);

/** Cross-field rules that JSON Schema cannot express; applied after parsing. */
function validateScreen(screen, fragmentName, problems) {
  const where = `${fragmentName}#${screen.id}`;
  const requireField = (name) => {
    if (screen[name] === undefined) problems.push(`${where}: ${screen.eligibility} rows need "${name}"`);
  };
  const forbidField = (name) => {
    if (screen[name] !== undefined) problems.push(`${where}: ${screen.eligibility} rows must not set "${name}"`);
  };
  if (!screen.id.startsWith(`${screen.kind}.`)) problems.push(`${where}: id must start with "${screen.kind}."`);
  if (screen.aliasOf) {
    if (screen.eligibility !== "pixel") problems.push(`${where}: aliasOf rows must be eligibility "pixel"`);
    for (const name of ["actualPath", "referencePath", "actualAction", "referenceAction", "readySelector"]) forbidField(name);
    return;
  }
  switch (screen.eligibility) {
    case "pixel":
      requireField("actualPath");
      requireField("referencePath");
      forbidField("reason");
      if (!screen.readySelector && !(screen.actualReadySelector && screen.referenceReadySelector)) {
        problems.push(`${where}: pixel rows need readySelector or both actualReadySelector and referenceReadySelector`);
      }
      break;
    case "artifact-docs":
      requireField("actualPath");
      requireField("referencePath");
      requireField("reason");
      if (screen.kind !== "artifact") problems.push(`${where}: artifact-docs rows must be kind "artifact"`);
      break;
    case "token-only":
    case "blocked":
      requireField("reason");
      forbidField("identityCheck");
      break;
    default:
      problems.push(`${where}: unknown eligibility ${screen.eligibility}`);
  }
}

export async function loadFragments(dir = inventoryDir) {
  const names = (await fsp.readdir(dir)).filter((name) => name.endsWith(".json")).sort();
  const fragments = [];
  for (const name of names) {
    const raw = await fsp.readFile(path.join(dir, name), "utf8");
    let json;
    try {
      json = JSON.parse(raw);
    } catch (error) {
      throw new Error(`inventory fragment ${name} is not valid JSON: ${error.message}`);
    }
    const parsed = fragmentSchema.safeParse(json);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `  - ${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("\n");
      throw new Error(`inventory fragment ${name} failed schema validation:\n${issues}`);
    }
    fragments.push({ name, data: parsed.data });
  }
  return fragments;
}

/** Merge validated fragments into the single view the runner consumes. */
export function mergeFragments(fragments) {
  const configs = fragments.filter((fragment) => fragment.data.kind === "config");
  if (configs.length !== 1) throw new Error(`inventory needs exactly one config fragment, found ${configs.length}`);
  const config = configs[0].data;
  const problems = [];
  const screens = [];
  const seen = new Map();
  for (const fragment of fragments) {
    if (fragment.data.kind !== "family") continue;
    if (fragment.name !== `${fragment.data.family}.json`) {
      problems.push(`${fragment.name}: file name must match family "${fragment.data.family}"`);
    }
    for (const screen of fragment.data.screens) {
      if (seen.has(screen.id)) problems.push(`${fragment.name}#${screen.id}: duplicate id (also in ${seen.get(screen.id)})`);
      seen.set(screen.id, fragment.name);
      validateScreen(screen, fragment.name, problems);
      if (screen.widths) {
        for (const width of screen.widths) {
          if (!config.widths.includes(width)) problems.push(`${fragment.name}#${screen.id}: width ${width} is not configured`);
        }
      }
      screens.push({ family: fragment.data.family, ...screen });
    }
  }
  for (const screen of screens) {
    if (!screen.aliasOf) continue;
    const target = screens.find((candidate) => candidate.id === screen.aliasOf);
    if (!target) problems.push(`${screen.id}: aliasOf target ${screen.aliasOf} does not exist`);
    else if (target.eligibility !== "pixel" || target.aliasOf) problems.push(`${screen.id}: aliasOf target ${screen.aliasOf} must be a direct pixel row`);
  }
  for (const [sourceId, targetId] of Object.entries(config.sourceInventoryAliases)) {
    if (!seen.has(targetId)) problems.push(`config.sourceInventoryAliases.${sourceId}: target ${targetId} does not exist`);
  }
  for (const width of config.widths) {
    if (!(String(width) in config.viewportHeights)) problems.push(`config.viewportHeights is missing width ${width}`);
  }
  if (problems.length > 0) {
    throw new Error(`inventory validation failed:\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
  }
  return {
    schemaVersion: 2,
    generatedBy: "tests/parity/inventory.mjs --write",
    generatedFrom: fragments.map((fragment) => `tests/parity/inventory/${fragment.name}`),
    widths: config.widths,
    viewportHeights: config.viewportHeights,
    families: fragments
      .filter((fragment) => fragment.data.kind === "family")
      .map((fragment) => ({ family: fragment.data.family, summary: fragment.data.summary, screens: fragment.data.screens.length })),
    screens: screens.sort((a, b) => a.id.localeCompare(b.id)),
    sourceInventoryProvenance: config.sourceInventoryProvenance,
    sourceInventoryAliases: config.sourceInventoryAliases,
  };
}

/** `pixel` | `token-only` | `artifact-docs` | `blocked:<reason>` for one screen. */
export function eligibilityClass(screen) {
  if (screen.eligibility === "blocked") return `blocked:${screen.reason}`;
  return screen.eligibility;
}

export function widthsFor(screen, inventory) {
  return screen.widths ?? inventory.widths;
}

export function renderJsonSchema() {
  const schema = z.toJSONSchema(fragmentSchema, { target: "draft-7", io: "input" });
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://awesome.video/parity/inventory.schema.json",
    title: "Parity inventory fragment",
    description:
      "Structural contract for tests/parity/inventory/*.json. Cross-field rules (required fields per eligibility, alias targets, duplicate ids) live in tests/parity/inventory.mjs and run on every load.",
    ...schema,
  };
}

const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;

export async function loadInventory({ verifyGenerated = true } = {}) {
  const fragments = await loadFragments();
  const merged = mergeFragments(fragments);
  if (verifyGenerated) {
    const drift = [];
    const expectedMerged = stable(merged);
    const expectedSchema = stable(renderJsonSchema());
    const currentMerged = fs.existsSync(mergedInventoryPath) ? await fsp.readFile(mergedInventoryPath, "utf8") : "";
    const currentSchema = fs.existsSync(inventorySchemaPath) ? await fsp.readFile(inventorySchemaPath, "utf8") : "";
    if (currentMerged !== expectedMerged) drift.push("tests/parity/inventory.json");
    if (currentSchema !== expectedSchema) drift.push("tests/parity/inventory.schema.json");
    if (drift.length > 0) {
      throw new Error(
        `generated inventory files are stale: ${drift.join(", ")} — run \`node tests/parity/inventory.mjs --write\` and commit the result`,
      );
    }
  }
  return merged;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const fragments = await loadFragments();
  const merged = mergeFragments(fragments);
  if (args.has("--write")) {
    await fsp.writeFile(mergedInventoryPath, stable(merged));
    await fsp.writeFile(inventorySchemaPath, stable(renderJsonSchema()));
    console.log(`wrote ${path.relative(process.cwd(), mergedInventoryPath)} (${merged.screens.length} screens from ${fragments.length} fragments)`);
    console.log(`wrote ${path.relative(process.cwd(), inventorySchemaPath)}`);
    return;
  }
  await loadInventory({ verifyGenerated: true });
  const counts = {};
  for (const screen of merged.screens) counts[screen.eligibility] = (counts[screen.eligibility] ?? 0) + 1;
  console.log(`inventory OK: ${merged.screens.length} screens ${JSON.stringify(counts)}; generated files in sync`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(2);
  });
}
