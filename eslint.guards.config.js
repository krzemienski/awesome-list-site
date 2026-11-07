// Repo guard rules: patterns that shipped real bugs more than once. Each message
// names what to use instead.
//
// - Guards: the codebase is already clean, so `npm run build` runs them (this
//   file's default export: syntax only, no type info, about 3 s).
// - Ratchets: the pattern is still common in old code, so only eslint.config.js
//   runs them (via `editorRules`). scripts/merge-gate.sh fails (exit 13) when a
//   change adds one to a file.
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

const BUTTON = "/^(Button|button)$/";
const RETRY_LABEL = "/^\\s*(Retry|Try again)\\s*$/";
// A min-h below 44px (min-h-11) on a control, with no touch-width floor beside it.
const SUB_44 = "/^(?!.*max-lg:min-h-(1[1-9]|[2-9][0-9])).*(^|\\s)!?min-h-([0-9]|10)(\\s|$)/";
const retryMessage =
  "Use <RetryButton> from @/components/layout/StatePanel for Retry/Try again: it hands focus on when the " +
  "error state unmounts (focusTarget, else the page heading). Hand-rolled retries kept dropping focus to <body>.";

const ratchetSelectors = [
  { selector: `JSXElement[openingElement.name.name=${BUTTON}]:has(> JSXText[value=${RETRY_LABEL}])`, message: retryMessage },
  {
    // A plain child chain: esquery's :has(> a > b) never matches multi-level paths.
    selector: `JSXElement[openingElement.name.name=${BUTTON}] > JSXExpressionContainer > ConditionalExpression > Literal[value=${RETRY_LABEL}]`,
    message: retryMessage,
  },
  {
    selector: `JSXOpeningElement[name.name=/^(Button|button|a|Link)$/] > JSXAttribute[name.name='className'] Literal[value=${SUB_44}]`,
    message:
      "Controls are 44px tall at touch widths: a min-h below min-h-11 needs max-lg:min-h-11 beside it. " +
      "<Button> already sizes itself; don't shrink it.",
  },
];

const GUARDED = ["client/src/**/*.{ts,tsx}", "server/**/*.ts", "shared/**/*.ts"];
const RETRY_OWNERS = ["client/src/components/layout/StatePanel.tsx", "client/src/components/admin/AdminLoadError.tsx"];
const rule = (selectors) => ({ "no-restricted-syntax": ["error", ...selectors] });

/** What `npm run build` enforces. */
export const guardRules = [{ files: GUARDED, ignores: [COUNTS_OWNER], rules: rule(guardSelectors) }];

/** What eslint.config.js (editors and the merge gate) enforces: guards plus ratchets. */
export const editorRules = [
  ...guardRules,
  {
    files: ["client/src/**/*.tsx"],
    ignores: [COUNTS_OWNER, ...RETRY_OWNERS],
    rules: rule([...guardSelectors, ...ratchetSelectors]),
  },
];

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
