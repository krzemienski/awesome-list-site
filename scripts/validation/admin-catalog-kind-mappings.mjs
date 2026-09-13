#!/usr/bin/env node

/**
 * The admin catalog intentionally resolves kinds in the browser with the
 * shared resolver. Keep the YAML mappings empty until the admin surface has an
 * authoritative server-resolved field; otherwise the browser and server can
 * disagree without an obvious API error.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";

const root = process.cwd();
const configPath = resolve(root, "awesome-list.config.yaml");
const resourceManagerPath = resolve(root, "client/src/components/admin/ResourceManager.tsx");

const config = yaml.load(readFileSync(configPath, "utf8"));
const resourceKinds =
  config && typeof config === "object" && !Array.isArray(config)
    ? config.resource_kinds
    : undefined;
const mappings =
  resourceKinds && typeof resourceKinds === "object" && !Array.isArray(resourceKinds)
    ? resourceKinds
    : {};

const clientSource = readFileSync(resourceManagerPath, "utf8");
const hasClientNormalization =
  clientSource.includes("normalizeAdminResource") &&
  clientSource.includes("resolveResourceKindFrom");

if (!hasClientNormalization) {
  console.error(
    "FAIL admin-catalog-kind-mappings :: ResourceManager client normalization is missing; do not permit custom resource kind maps without an authoritative replacement.",
  );
  process.exit(1);
}

const nonEmptyMappings = [];
for (const [name, value] of Object.entries(mappings)) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    if (value !== undefined && value !== null) nonEmptyMappings.push(`${name}: ${String(value)}`);
    continue;
  }
  for (const [kind, words] of Object.entries(value)) {
    if (Array.isArray(words) && words.length > 0) {
      nonEmptyMappings.push(
        `${name}.${kind} (${words.length} word${words.length === 1 ? "" : "s"})`,
      );
    } else if (words && typeof words === "object" && Object.keys(words).length > 0) {
      nonEmptyMappings.push(`${name}.${kind}`);
    }
  }
}

if (nonEmptyMappings.length > 0) {
  console.error(
    [
      "FAIL admin-catalog-kind-mappings :: custom resource kind maps are not safe while ResourceManager resolves rows client-side.",
      `Non-empty mappings: ${nonEmptyMappings.join(", ")}`,
      "Keep resource_kinds.tag_mappings and category_mappings empty until the backend exposes authoritative admin resolvedKind.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log(
  "PASS admin-catalog-kind-mappings :: ResourceManager normalizes admin rows with shared resolver and YAML custom maps are empty.",
);
