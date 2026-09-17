import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(here, "comparison-reference-adjustments.json");
export const COMPARISON_REFERENCE_ADJUSTMENTS = Object.freeze(
  JSON.parse(fs.readFileSync(manifestPath, "utf8")),
);

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const count = (text, literal) => text.split(literal).length - 1;
const fontLink = (request) => `<link href="${request}" rel="stylesheet">`;
const GOOGLE_FONT_LINK = /<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+" rel="stylesheet">/g;

// Diagnostic geometry is recorded alongside pixels, never used to mask them
// or to tune the expected renderer from the actual page.
export async function collectReferenceAdjustmentGeometry(page) {
  return page.evaluate(() => {
    const bounds = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none",
      };
    };
    const selectors = [
      "button", "input:not([type=hidden])", "select", "textarea",
      "a.btn", "a.chip", ".accordion-header", ".sub-item", ".tab",
      ".header-search-trigger", ".user-pill", ".icon-rail .icon-btn",
      ".docs-nav>div:first-child>a", ".parity-contract-switcher>a", ".ds-shell footer a",
    ];
    const controls = [...document.querySelectorAll(selectors.join(","))].map((element) => {
      const target = element.matches("input[type=checkbox],input[type=radio]")
        ? element.closest("label") || element
        : element;
      return { tag: element.tagName.toLowerCase(), className: element.className, ...bounds(target) };
    }).filter((control) => control.visible);
    return {
      viewportWidth: innerWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      noPageOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      sidebars: [...document.querySelectorAll(".sidebar")].map(bounds),
      controls,
      undersizedControls: controls.filter(({ width, height }) => width < 43.99 || height < 43.99),
    };
  });
}

const assertSourceHashes = (rawSnapshot, manifest) => {
  for (const [file, expected] of Object.entries(manifest.sourceFiles)) {
    const bytes = rawSnapshot.get(file);
    if (!bytes) throw new Error(`Comparison adjustment source is missing: ${file}`);
    const actual = sha256(bytes);
    if (actual !== expected) {
      throw new Error(`Comparison adjustment source drifted: ${file} expected ${expected}, found ${actual}`);
    }
  }
};

const applyRule = (served, rule, canonicalFontRequest) => {
  const file = rule.file;
  const original = served.get(file);
  if (!original) throw new Error(`Comparison adjustment ${rule.id} target is missing: ${file}`);
  const text = original.toString("utf8");
  let output;
  let occurrences;
  if (rule.operation === "replace") {
    occurrences = count(text, rule.from);
    output = text.split(rule.from).join(rule.to);
  } else if (rule.operation === "append") {
    occurrences = count(text, rule.anchor);
    output = text.replace(rule.anchor, `${rule.anchor}${rule.content}`);
  } else if (rule.operation === "replaceFontRequest") {
    occurrences = [...text.matchAll(GOOGLE_FONT_LINK)].length;
    output = text.replace(GOOGLE_FONT_LINK, fontLink(canonicalFontRequest));
  } else {
    throw new Error(`Comparison adjustment ${rule.id} has unsupported operation ${rule.operation}`);
  }
  if (occurrences !== rule.occurrences) {
    throw new Error(`Comparison adjustment ${rule.id} expected ${rule.occurrences} source anchor occurrence(s), found ${occurrences}`);
  }
  const bytes = Buffer.from(output);
  served.set(file, bytes);
  return {
    id: rule.id,
    file,
    operation: rule.operation,
    occurrences,
    rationale: rule.rationale,
    sourceAnchors: rule.sourceAnchors,
    inputSha256: sha256(original),
    outputSha256: sha256(bytes),
  };
};

export function applyComparisonReferenceAdjustments(rawSnapshot, adaptedSnapshot, manifest = COMPARISON_REFERENCE_ADJUSTMENTS) {
  if (!(rawSnapshot instanceof Map) || !(adaptedSnapshot instanceof Map)) {
    throw new TypeError("Comparison reference adjustments require raw and adapted snapshot Maps");
  }
  assertSourceHashes(rawSnapshot, manifest);
  const served = new Map(adaptedSnapshot);
  const applied = [];
  for (const rule of manifest.rules) {
    if (rule.operation === "assertFontRequest") continue;
    applied.push(applyRule(served, rule, manifest.canonicalFontRequest));
  }
  for (const rule of manifest.rules.filter(({ operation }) => operation === "assertFontRequest")) {
    for (const file of rule.files) {
      const text = served.get(file)?.toString("utf8");
      if (!text) throw new Error(`Comparison adjustment ${rule.id} assertion target is missing: ${file}`);
      const matches = [...text.matchAll(GOOGLE_FONT_LINK)].map(([link]) => link);
      if (matches.length !== rule.occurrences || matches[0] !== fontLink(manifest.canonicalFontRequest)) {
        throw new Error(`Comparison adjustment ${rule.id} rejected non-canonical font request in ${file}`);
      }
      applied.push({
        id: rule.id,
        file,
        operation: rule.operation,
        occurrences: matches.length,
        rationale: rule.rationale,
        sourceAnchors: rule.sourceAnchors,
        inputSha256: sha256(served.get(file)),
        outputSha256: sha256(served.get(file)),
      });
    }
  }
  return {
    served,
    provenance: {
      schemaVersion: manifest.schemaVersion,
      manifest: "tests/parity/comparison-reference-adjustments.json",
      manifestSha256: sha256(fs.readFileSync(manifestPath)),
      decision: manifest.decision,
      application: "Exact, fail-closed transformation of in-memory served bytes before the reference server starts; frozen source files are not written.",
      applied,
      rawHashes: Object.fromEntries(Object.keys(manifest.sourceFiles).map((file) => [file, sha256(rawSnapshot.get(file))])),
      servedHashes: Object.fromEntries(Object.keys(manifest.sourceFiles).map((file) => [file, sha256(served.get(file))])),
    },
  };
}