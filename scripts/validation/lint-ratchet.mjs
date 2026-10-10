#!/usr/bin/env node
// Lint ratchet gate (audit item J05).
//
// The repository-wide ESLint run has thousands of type-safety/style findings
// (no-unsafe-*, no-explicit-any, prefer-nullish-coalescing, ...). They are
// real debt, but fixing them all at once would mean rewriting large parts of
// the server for style. This gate makes the debt only shrink:
//
//   1. CORRECTNESS rules must be at ZERO across the application
//      (client/, server/, shared/, artifacts/awesome-video-design-system/).
//      These are the rules that hide real bugs: hook ordering and stale hook
//      dependencies, floating/misused promises, thrown non-Errors, unused
//      expressions, comment text rendered as JSX, unused eslint-disable
//      directives, every core ESLint rule in the "problem" category, and
//      fatal parse errors. A justified exception needs a per-line
//      `eslint-disable-next-line <rule> -- <reason>` at the site.
//
//   2. Every OTHER finding is counted per file and per rule and compared with
//      lint-ratchet-baseline.json. Any count above its baseline fails. Files
//      outside the application (scripts/, tests/, deploy/) are fully covered
//      by the baseline, correctness rules included, so they cannot regress
//      either.
//
// Usage:
//   node scripts/validation/lint-ratchet.mjs            # check (exit 1 on regression)
//   node scripts/validation/lint-ratchet.mjs --update   # rewrite the baseline;
//        refuses while any count is above baseline, so it can only shrink
//   node scripts/validation/lint-ratchet.mjs --update --allow-moves
//        # as --update, but accepts per-file increases when every rule's
//        # repository total did not rise (a file rename/split moves findings)
//   node scripts/validation/lint-ratchet.mjs --from-json <eslint-json>
//        # evaluate a saved `eslint -f json` report instead of linting
//        # (used to mutation-test the gate without a 90 s lint run)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASELINE_PATH = path.join(ROOT, "scripts/validation/lint-ratchet-baseline.json");

const APP_PREFIXES = ["client/", "server/", "shared/", "artifacts/awesome-video-design-system/"];

/** Plugin rules that indicate real defects rather than style. Core ESLint
 * rules are classified by their own meta.type === "problem". */
const CORRECTNESS_RULES = new Set([
  "react-hooks/rules-of-hooks",
  "react-hooks/exhaustive-deps",
  "@typescript-eslint/no-floating-promises",
  "@typescript-eslint/no-misused-promises",
  "@typescript-eslint/only-throw-error",
  "@typescript-eslint/prefer-promise-reject-errors",
  "@typescript-eslint/unbound-method",
  "@typescript-eslint/no-unused-expressions",
  "@typescript-eslint/no-array-delete",
  "@typescript-eslint/no-implied-eval",
  "@typescript-eslint/await-thenable",
  "@typescript-eslint/no-for-in-array",
  "react/jsx-key",
  "react/jsx-no-comment-textnodes",
  "react/jsx-no-duplicate-props",
  "react/jsx-no-undef",
  "react/jsx-no-target-blank",
  "react/no-children-prop",
  "react/no-danger-with-children",
  "react/no-direct-mutation-state",
  "react/no-string-refs",
  "react/no-unknown-property",
  "react/require-render-return",
]);

const DIRECTIVE = "(eslint-directive)";
const FATAL = "(fatal-parse-error)";

const args = process.argv.slice(2);
const UPDATE = args.includes("--update");
const ALLOW_MOVES = args.includes("--allow-moves");
const fromJsonIdx = args.indexOf("--from-json");
const FROM_JSON = fromJsonIdx >= 0 ? args[fromJsonIdx + 1] : null;

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const isApp = (file) => APP_PREFIXES.some((p) => file.startsWith(p));

async function lint() {
  if (FROM_JSON) {
    return { results: JSON.parse(fs.readFileSync(FROM_JSON, "utf8")), meta: null };
  }
  // typescript-eslint only uses its one-shot Program when it recognises the
  // ESLint CLI; through the Node API it falls back to an editor-style watch
  // program that resolves some imports (e.g. untyped .mjs) differently and
  // reports different counts. Pin single-run mode so this gate always counts
  // exactly what `npm run lint` reports. Must be set before the parser loads.
  process.env.TSESTREE_SINGLE_RUN = "true";
  const { ESLint } = await import("eslint");
  const eslint = new ESLint({ cwd: ROOT });
  const results = await eslint.lintFiles(["."]);
  return { results, meta: eslint.getRulesMetaForResults(results) };
}

function coreProblemRule(ruleId, meta) {
  if (ruleId.includes("/")) return false;
  if (meta) return meta[ruleId]?.type === "problem";
  // --from-json has no metadata; fall back to the built-in rule table.
  return builtinProblemRules.has(ruleId);
}

let builtinProblemRules = new Set();
async function loadBuiltinProblemRules() {
  const { builtinRules } = await import("eslint/use-at-your-own-risk");
  builtinProblemRules = new Set(
    [...builtinRules].filter(([, r]) => r.meta?.type === "problem").map(([id]) => id),
  );
}

function ruleKey(m) {
  if (m.fatal) return FATAL;
  return m.ruleId ?? DIRECTIVE;
}

function isCorrectness(key, meta) {
  return key === FATAL || key === DIRECTIVE || CORRECTNESS_RULES.has(key) || coreProblemRule(key, meta);
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return null;
  return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
}

function sortedObject(obj) {
  return Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));
}

async function main() {
  await loadBuiltinProblemRules();
  const started = Date.now();
  const { results, meta } = await lint();

  /** counts[file][rule] for everything the baseline tracks */
  const counts = {};
  const correctnessHits = [];
  for (const r of results) {
    const file = rel(r.filePath);
    for (const m of r.messages) {
      const key = ruleKey(m);
      if (isApp(file) && isCorrectness(key, meta)) {
        correctnessHits.push({ file, line: m.line ?? 0, rule: key, message: m.message });
        continue;
      }
      (counts[file] ??= {})[key] = (counts[file][key] ?? 0) + 1;
    }
  }

  const baseline = readBaseline();
  const baseFiles = baseline?.files ?? {};
  const rises = [];
  let shrinks = 0;
  for (const [file, rules] of Object.entries(counts)) {
    for (const [rule, n] of Object.entries(rules)) {
      const b = baseFiles[file]?.[rule] ?? 0;
      if (n > b) rises.push({ file, rule, baseline: b, now: n });
    }
  }
  for (const [file, rules] of Object.entries(baseFiles)) {
    for (const [rule, b] of Object.entries(rules)) {
      if ((counts[file]?.[rule] ?? 0) < b) shrinks++;
    }
  }

  const total = (src) => {
    const t = {};
    for (const rules of Object.values(src)) for (const [k, n] of Object.entries(rules)) t[k] = (t[k] ?? 0) + n;
    return t;
  };
  const nowTotals = total(counts);
  const baseTotals = total(baseFiles);
  const findings = Object.values(nowTotals).reduce((a, b) => a + b, 0);
  const baseFindings = Object.values(baseTotals).reduce((a, b) => a + b, 0);

  console.log(`lint-ratchet: linted ${results.length} files in ${((Date.now() - started) / 1000).toFixed(0)}s`);
  console.log(`  application correctness findings: ${correctnessHits.length} (must be 0)`);
  console.log(`  ratcheted findings: ${findings} (baseline ${baseline ? baseFindings : "none"})`);

  if (correctnessHits.length) {
    console.error(`\nFAIL: ${correctnessHits.length} correctness finding(s) in application code:`);
    for (const h of correctnessHits.slice(0, 200)) {
      console.error(`  ${h.file}:${h.line}  ${h.rule}  ${h.message}`);
    }
    console.error("Fix the code, or add `eslint-disable-next-line <rule> -- <reason>` where the pattern is deliberate.");
  }

  if (UPDATE) {
    if (correctnessHits.length) {
      console.error("\n--update refused: application correctness findings can never enter the baseline.");
      process.exit(1);
    }
    if (baseline && rises.length) {
      const totalRises = Object.entries(nowTotals).filter(([k, n]) => n > (baseTotals[k] ?? 0));
      if (!ALLOW_MOVES || totalRises.length) {
        console.error(`\n--update refused: ${rises.length} per-file count(s) rose above baseline.`);
        for (const x of rises.slice(0, 50)) console.error(`  ${x.file}  ${x.rule}  ${x.baseline} -> ${x.now}`);
        if (ALLOW_MOVES) {
          for (const [k, n] of totalRises) console.error(`  repository total ${k}: ${baseTotals[k] ?? 0} -> ${n}`);
        } else {
          console.error("If findings only moved between files (rename/split), re-run with --allow-moves.");
        }
        process.exit(1);
      }
    }
    const files = {};
    for (const file of Object.keys(counts).sort()) files[file] = sortedObject(counts[file]);
    const out = {
      description:
        "Per-file, per-rule ESLint counts that may only shrink. Written by `npm run lint:ratchet -- --update`; see scripts/validation/lint-ratchet.mjs.",
      totals: sortedObject(nowTotals),
      files,
    };
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(out, null, 2) + "\n");
    console.log(`\nBaseline written: ${rel(BASELINE_PATH)} (${findings} findings, was ${baseline ? baseFindings : "none"})`);
    process.exit(0);
  }

  if (!baseline) {
    console.error(`\nFAIL: no baseline at ${rel(BASELINE_PATH)}. Create it with --update.`);
    process.exit(1);
  }

  if (rises.length) {
    console.error(`\nFAIL: ${rises.length} per-file count(s) rose above the baseline:`);
    for (const x of rises.slice(0, 200)) console.error(`  ${x.file}  ${x.rule}  ${x.baseline} -> ${x.now}`);
    console.error("Fix the new findings. The baseline only shrinks (see --update / --allow-moves).");
  }

  if (correctnessHits.length || rises.length) process.exit(1);

  if (shrinks) {
    console.log(`\nPASS — ${shrinks} count(s) are below baseline; run with --update to lock in the improvement.`);
  } else {
    console.log("\nPASS");
  }
}

main().catch((err) => {
  console.error("lint-ratchet crashed:", err);
  process.exit(2);
});
