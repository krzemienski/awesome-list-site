// Repo guard rules: patterns that shipped real bugs more than once. Each message
// names what to use instead. `npm run build` runs exactly this config (syntax
// only, no type info, so it is fast), and eslint.config.js includes it so
// editors and `npx eslint <file>` report the same errors.
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

const SUBTREE = "/^sub(Sub)?[cC]ategories$/";
const COUNTS_OWNER = "shared/catalog-counts.ts";

const subtreeCount =
  "Don't re-sum the catalog tree: nav nodes carry totalResourceCount (shared/catalog-nav.ts); " +
  `for resources arrays use corpusTotalCount or countNestedGroups from ${COUNTS_OWNER}. Hand-written copies drifted and under-counted.`;

export const guardRules = [
  {
    files: ["client/src/**/*.{ts,tsx}", "server/**/*.ts", "shared/**/*.ts"],
    ignores: [COUNTS_OWNER],
    rules: {
      "no-restricted-syntax": [
        "error",
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
      ],
    },
  },
];

// Plugins are registered (no rules enabled) only so inline eslint-disable
// comments for their rules resolve when this config runs on its own.
export default [
  {
    languageOptions: { parser: tseslint.parser },
    plugins: { "@typescript-eslint": tseslint.plugin, react: reactPlugin, "react-hooks": reactHooksPlugin },
    linterOptions: { reportUnusedDisableDirectives: "off" },
  },
  ...guardRules,
  { ignores: ["**/node_modules/**", "**/dist/**", "**/*.generated.*"] },
];
