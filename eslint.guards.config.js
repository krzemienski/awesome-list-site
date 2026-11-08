// Repo guard rules: patterns that shipped real bugs more than once. Each message
// names what to use instead. The codebase is already clean, so `npm run build`
// runs them (this file's default export: syntax only, no type info, about 3 s)
// and eslint.config.js spreads them for editors.
//
// ESLint flat config keeps only the LAST `no-restricted-syntax` setting that
// matches a file, so every glob below gets one merged selector list. Never add
// a second config object that sets this rule for overlapping files.
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

const SUBTREE = "/^sub(Sub)?[cC]ategories$/";
const COUNTS_OWNER = "shared/catalog-counts.ts";
const subtreeCount =
  "Don't re-sum the catalog tree: nav nodes carry totalResourceCount (shared/catalog-nav.ts); " +
  `for resources arrays use corpusTotalCount or countNestedGroups from ${COUNTS_OWNER}. Hand-written copies drifted and under-counted.`;

const guardSelectors = [
  {
    // The array may be written `x.subcategories`, `(x.subcategories ?? [])`,
    // `(x.subcategories as any[])` or with `?.` (a ChainExpression).
    selector: ["object", "object.left", "object.expression", "object.left.expression"]
      .map((path) => `CallExpression[callee.property.name='reduce'][callee.${path}.property.name=${SUBTREE}]`)
      .join(", "),
    message: subtreeCount,
  },
  {
    selector: ["right", "right.left", "right.expression", "right.left.expression"]
      .map((path) => `ForOfStatement[${path}.property.name=${SUBTREE}] AssignmentExpression[operator='+=']`)
      .join(", "),
    message: subtreeCount,
  },
  {
    selector: "Literal[value=/^(Table of contents|Anti-features|External Links)$/]",
    message: `Non-category README sections are listed once in ${COUNTS_OWNER}: use isRealCategory() or visibleNavCategories().`,
  },
];

const GUARDED = ["client/src/**/*.{ts,tsx}", "server/**/*.ts", "shared/**/*.ts"];
const rule = (selectors) => ({ "no-restricted-syntax": ["error", ...selectors] });

/** What `npm run build` and eslint.config.js enforce. */
export const guardRules = [{ files: GUARDED, ignores: [COUNTS_OWNER], rules: rule(guardSelectors) }];

// Plugins are registered (no rules enabled) only so inline eslint-disable
// comments for their rules resolve when this config runs on its own.
export const standalone = (rules) => [
  {
    languageOptions: { parser: tseslint.parser },
    plugins: { "@typescript-eslint": tseslint.plugin, react: reactPlugin, "react-hooks": reactHooksPlugin },
    linterOptions: { reportUnusedDisableDirectives: "off" },
  },
  ...rules,
  { ignores: ["**/node_modules/**", "**/dist/**", "**/*.generated.*"] },
];

export default standalone(guardRules);
