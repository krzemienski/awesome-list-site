import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  // Base JavaScript rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Prettier integration (disable conflicting rules)
  prettierConfig,

  // Global configuration
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Executable JS tooling is deliberately untyped (not part of a TS program).
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: {
        process: "readonly", console: "readonly", Buffer: "readonly",
        setTimeout: "readonly", clearTimeout: "readonly", setInterval: "readonly",
        clearInterval: "readonly", URL: "readonly", URLSearchParams: "readonly",
        fetch: "readonly", AbortController: "readonly", structuredClone: "readonly",
        document: "readonly", window: "readonly", localStorage: "readonly",
        navigator: "readonly", requestAnimationFrame: "readonly",
        performance: "readonly", Event: "readonly", PopStateEvent: "readonly",
        getComputedStyle: "readonly", HTMLElement: "readonly",
        HTMLInputElement: "readonly", ResizeObserver: "readonly",
        MutationObserver: "readonly", Node: "readonly",
        __dirname: "readonly", module: "readonly", require: "readonly",
      },
    },
  },

  // React configuration for client-side code
  {
    files: ["client/**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "react-refresh": reactRefreshPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs["jsx-runtime"].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },

  // Server-side TypeScript configuration
  {
    files: ["server/**/*.ts"],
    rules: {
      // Server-specific rules can be added here
    },
  },

  // Shared code configuration
  {
    files: ["shared/**/*.ts"],
    rules: {
      // Shared code rules can be added here
    },
  },

  // Configuration files
  {
    files: ["*.config.{js,ts}", "*.config.*.{js,ts}"],
    rules: {
      // Allow require() in config files
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // The task 566 browser harness is a checked-in ESM JavaScript validator,
  // rather than an application module included by tsconfig.json. Keep the
  // normal JavaScript checks while opting this file out of TypeScript-only
  // rules that require a typed program.
  {
    files: ["scripts/validation/contact-variants-566.mjs"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: {
        document: "readonly",
        Event: "readonly",
        fetch: "readonly",
        getComputedStyle: "readonly",
        HTMLInputElement: "readonly",
        process: "readonly",
        URL: "readonly",
      },
    },
  },

  // Ignore patterns
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".auto-claude/**",
      ".cache/**",
      ".agents/**",
      ".local/**",
      "attached_assets/**",
      "scripts/archive/**",
      "docs/**",
      "reports/**",
      "awesome-list-site-ds/**",
      "awesome-list-site-ds-20260929/**",
      "client/public/ds/**",
      "artifacts/r6/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/*.generated.*",
    ],
  },
);
